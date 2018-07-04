//
// Racetrack Firmware
//

#include "FastLED.h"
#include "PWDLaneDisplay.h"
#include "PWDData.h"
#include "PWDProtocol.h"

#include <malloc.h>
#include <stdlib.h>
#include <stdio.h>

#define LED_PIN 13
#define FAST true
#define SLOW false

#define TM1637_DATA 24
#define TM1637_CLOCK 26
#define NEOPIXEL_PIN 28
#define DEMO_PIN 30
#define LASER_PIN 32

#define LDR_PIN A7
#define LDR_THRESHOLD 400

#define LANES 4

// needs to be global here, as it is shared across all lane objects
CRGB leds[LANES*7];

// instantiate the <n> lanes
PWDLaneDisplay laneDisplay[LANES] = {
  PWDLaneDisplay( 0, TM1637_CLOCK, TM1637_DATA, leds, CRGB( 255,   0,   0) ),  
  PWDLaneDisplay( 1, TM1637_CLOCK, TM1637_DATA, leds, CRGB( 255,   0,   0) ),  
  PWDLaneDisplay( 2, TM1637_CLOCK, TM1637_DATA, leds, CRGB( 255,   0,   0) ),  
  PWDLaneDisplay( 3, TM1637_CLOCK, TM1637_DATA, leds, CRGB( 255,   0,   0) ),  
};

// instantiate three serial communication channels
// channel to bridge
PWDProtocol combr( Serial );
// define acceptable commands for use in begin()
uint8_t combr_whitelist[8] = {
  PWDProtocol::CODE_ACK,
  PWDProtocol::CODE_INIT,
  PWDProtocol::CODE_GO,
  PWDProtocol::CODE_SETUP
};
// channel to Raspberry Pi
PWDProtocol compi( Serial2 );
// define acceptable commands for use in begin()
uint8_t compi_whitelist[8] = {
  PWDProtocol::CODE_ACK,
  PWDProtocol::CODE_GO
};
// channel to Startgate
PWDProtocol comsg( Serial1 );
// define acceptable commands for use in begin()
uint8_t comsg_whitelist[8] = {
  PWDProtocol::CODE_ACK,
};

// global data structures
PWDHeat heat;
// 4 lanes
PWDLane lane[LANES];
// 4 character arrays, 14 characters plus \0
char rfid[LANES][15];
// 4 owners, 15 characters plus \0
char owner[LANES][16];

// counter for loop stats
unsigned long c;
unsigned long last_elapsed;
unsigned long last_millis;

unsigned long elapsed;
unsigned long start;

int ldr;
int lane_status;
int finishers;
bool race_on;
bool update_rank;
// rank contains the lane numbers in the order they finish
int rank[LANES] = {0, 0, 0, 0};
// place contains the finishing place in lane order
int place[LANES] = {0, 0, 0, 0};

// variables needed to display free memory
extern char _end;
extern "C" char *sbrk(int i);
char *ramstart=(char *)0x20070000;
char *ramend=(char *)0x20088000;

void ShowMemory(void)
{
  struct mallinfo mi=mallinfo();
  char *heapend=sbrk(0);
  register char * stack_ptr asm("sp");

  Serial.print("\n\nHeap RAM Used: ");
  Serial.println(mi.uordblks);
  Serial.print("Program RAM Used ");
  Serial.println(&_end - ramstart);
  Serial.print("Stack RAM Used ");
  Serial.println(ramend - stack_ptr);
  Serial.print("Estimated Free RAM: ");
  Serial.println(stack_ptr - heapend + mi.fordblks);
}

// helper function for the lane displays
// we have to unselect all lanes first, otherwise two lanes might 
// temporarily end up both selected. Shouldn't be a big deal, but still...
// n == l equals false for all lanes other than the desired one
void select_laneDisplay( int l ) {
  for( int n=0; n<LANES; n++ ) {
    laneDisplay[n].select( n == l );
  }
  laneDisplay[l].select( true );
}

// small indicator without messing up the serial comm
void blink( bool fast )
{
  for( int i=0; i<3; i++ ) {
    digitalWrite( LED_PIN, HIGH );
    delay( fast ? 250 : 750 );
    digitalWrite( LED_PIN, LOW );
    delay( fast ? 250 : 750 );
  }
}

void dumpHeat() {
  combr.sendCompleteOrProgress( PWDProtocol::CODE_COMPLETE, &heat );
}

void setup() {

  pinMode( LED_PIN, OUTPUT );
  blink( FAST );

  // initialize all communication channels
  combr.begin( combr_whitelist );
  compi.begin( compi_whitelist );
  comsg.begin( comsg_whitelist );

  // initialize the lane and heat structure
  // this should be now a fixed data structure in globals
  for( int i=0; i<4; i++ ) {
    lane[i].rfid = &rfid[i][0];
    lane[i].owner = &owner[i][0];
    heat.lane[i] = &lane[i];
  }
  heat.state = PWDProtocol::STATE_IDLE;
  heat.status = PWDProtocol::STATUS_OK;
  heat.heatno = 0;

  // set all pin modes
  pinMode( DEMO_PIN, INPUT_PULLUP );
  pinMode( LASER_PIN, OUTPUT );
  pinMode( LDR_PIN, INPUT );
  pinMode( NEOPIXEL_PIN, OUTPUT );

  // initialize the LED library (strip type, pin number, variable,
  // number of LEDs
  FastLED.addLeds<NEOPIXEL, NEOPIXEL_PIN>(leds, LANES * 7);

  // clear displays
  for( int n=0; n<LANES; n++ ) {
    select_laneDisplay( n );
    laneDisplay[n].begin();
    laneDisplay[n].showNumber( n );
    laneDisplay[n].setBigDigit( PWDLaneDisplay::DIGIT_OFF );
  }
  FastLED.show();

  // start statistics
  last_millis = millis();
  
// testing
  start = millis();
  race_on = true;
  lane_status = 0;
  finishers = 0;
  digitalWrite( LASER_PIN, HIGH );

  ShowMemory();
  Serial.println( "Finished Setup." );
}

void loop() {
  elapsed = (millis() - start);
  // loop counter
  c++;
  update_rank = false;


  // check serial only if the race is off, to save loop cycle time
  if( ! race_on ) {
    if( combr.available() ) {
      bool res = combr.receiveCommand( &heat );
      if( res ) {
        // state changed
        dumpHeat();
      }
    }

    //Serial.println( "Reading demo pin" );
    int demo = digitalRead( DEMO_PIN );
    //Serial.print( "Pin is: " );
    //Serial.println( demo );
    if( ! demo && ! race_on ) {
      Serial.println( "Starting race." );
      digitalWrite( LASER_PIN, HIGH );
      race_on = true;
      start = millis();
      lane_status = 0;
      finishers = 0;
      // blank the big displays
      for( int n=0; n<LANES; n++ ) {
        laneDisplay[n].setBigDigit( PWDLaneDisplay::DIGIT_OFF );
      }
      update_rank = true;
    }
  }
  
  // display times on all counters, which have not finished
  for( int n=0; n<4; n++) {
    if( race_on ) {
      // if the lane has not finished or is the one that finished in this 
      // loop iteration, then update the millis display
      if( ( ! (lane_status & (1 << n)) ) || ( (n==rank[finishers-1]) && update_rank ) ) {
        // select lane chip
        select_laneDisplay( n );
        laneDisplay[n].showNumber( elapsed );
        // normally we would do that also continuously, so simulate this here
        ldr = analogRead( A7 );
        //Serial.print( "LDR: " );
        //Serial.println( ldr );
        if( ldr > LDR_THRESHOLD ) {
          // detected laser beam break
          // TODO: add array for multiple consecutive breaks from original sketch.
          //       may actually not be needed as the loop is around 18ms
          // set bit for this lane
          lane_status = lane_status | (1 << n);
          // increase number of finishers (1-4)
          finishers++;
          // remember the lane for the n-th finisher
          rank[finishers-1] = n;
          // remember the place for this lane
          place[n] = finishers;
          update_rank = true; 
        }
      }
      
      // if we have to update the rank display and this is the lane we have to update
      if( ( n==rank[finishers-1]) && update_rank ) {
        //Serial.print( "update milli displays for lane " );
        //Serial.println( n );
        laneDisplay[n].setBigDigit( place[n] );
      }
      
    } else {
      
      // test for setup
      //Serial.println( "Race is off." );
      // select lane chip
      select_laneDisplay( n );
      ldr = analogRead( A7 ) / 10;
      laneDisplay[n].showNumber( ldr );
      //delay(50);

    }

  }

  // unselect last lane to achieve a stable state for the LDR line
  laneDisplay[3].select( false );
  
  // only push updates to the LEDs, if necessary, as it blocks serial interrupts
  if( update_rank ) {
    FastLED.show();
    update_rank = false;
  }

  // every now and then print statistics
  if( (millis() - last_millis) > 8000 ) {
    // get counter diff divided by elapsed millis
    unsigned long millis_per_loop = ( millis() - last_millis ) / c ;
    last_millis = millis();
    c = 0;
    Serial.print( "Milliseconds per loop iteration: " );
    Serial.println( millis_per_loop );
  }

  if( finishers == LANES ) {
    // this enables reading serial again, to re-start a race
    race_on = false;
    // no need to be so responsive now
    //delay( 1000 );
  }

}

// vim:si:sw=2
