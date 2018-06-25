//
// Speedtester
//
// Tests how fast the loop can iterate while updating all displays
//

#include "FastLED.h"
#include "PCF8574.h"
#include "TM1637.h"

#define NEOPIXEL_PIN 28
#define TM1637_CLOCK 26
#define TM1637_DATA 24
#define DEMO_PIN 30
#define LASER_PIN 32

#define LDR_PIN A7
#define LDR_THRESHOLD 600

#define LANES 4

PCF8574 PCF[LANES] = {
  PCF8574(0),  
  PCF8574(1),  
  PCF8574(2),  
  PCF8574(3),  
};

TM1637 LED_small;
CRGB leds[LANES*7];

// counter for loop stats
unsigned long c = 0;
unsigned long last_elapsed;
unsigned long last_millis;

unsigned long elapsed;
unsigned long start;

bool race_on = false;
int ldr;
int lane = 0;
int finishers = 0;
bool update_rank = false;
// rank contains the lane numbers in the order they finish
int rank[LANES] = {0, 0, 0, 0};
// place contains the finishing place in lane order
int place[LANES] = {0, 0, 0, 0};
byte pow2[8] = { 1, 2, 4, 8, 16, 32, 64, 128 };

const byte digit[10][7] = {
	{1, 1, 1, 1, 1, 1, 0}, //0
	{0, 1, 1, 0, 0, 0, 0}, //1
	{1, 1, 0, 1, 1, 0, 1}, //2
	{1, 1, 1, 1, 0, 0, 1}, //3
	{0, 1, 1, 0, 0, 1, 1}, //4
	{1, 0, 1, 1, 0, 1, 1}, //5
	{1, 0, 1, 1, 1, 1, 1}, //6
	{1, 1, 1, 0, 0, 0, 0}, //7
	{1, 1, 1, 1, 1, 1, 1}, //8
	{1, 1, 1, 1, 0, 1, 1}  //9
};


void select_lane(int l ) {
  for( int n=0; n<LANES; n++ ) {
    if( n!=l ) {
      PCF[n].write8(0);
    }
  }
  PCF[l].write8(7);
}


void setup() {
  Serial.begin( 57600 );
  //while ( ! Serial );
  Serial.println( "Racetrack starting." );
  pinMode(28, OUTPUT);
  pinMode(A7, INPUT);
  pinMode( DEMO_PIN, INPUT_PULLUP );
  pinMode( LASER_PIN, OUTPUT );
  FastLED.addLeds<NEOPIXEL, NEOPIXEL_PIN>(leds, LANES * 7);

  for( int n=0; n<LANES; n++ ) {
    PCF[n].begin(0);
  }
  
  // start stats
  last_millis = millis();
  start = millis();
  race_on = true;
  
  Serial.println( "Entering loop." );

}

void loop() {
  elapsed = (millis() - start);
  // just for testing, skip numbers >10seconds
  // TODO: need to add support for decimal points to the library
  // if ( elapsed > 9999 ) elapsed = elapsed % 10000;
  // loop counter
  c++;
  update_rank = false;


  // check serial only if the race is off, to save loop cycle time
  if( ! race_on ) {
    if( Serial.available() ) {
      switch( Serial.read() ) {
        case 'g':
          Serial.println( "Got g, starting race" );
          digitalWrite( LASER_PIN, HIGH );
          race_on = true;
          start = millis();
          elapsed = 0;
          lane = 0;
          finishers = 0;
          // blank the big displays
          for( int i=0; i<LANES*7; i++ ) {
            leds[i] = CRGB::Black;
          }
          update_rank = true;
          break;
        // for testing get the lane that finishes next from serial
        // no checks if the lane already finished...
        case '0':
          Serial.println( "Got 0" );
          lane = lane | 1;
          finishers++;
          rank[finishers-1] = 0;
          place[0] = finishers;
          update_rank = true; 
          break;
        case '1':
          Serial.println( "Got 1" );
          lane = lane | 2;
          finishers++;
          rank[finishers-1] = 1;
          place[1] = finishers;
          update_rank = true; 
          break;
        case '2':
          Serial.println( "Got 2" );
          lane = lane | 4;
          finishers++;
          rank[finishers-1] = 2;
          place[2] = finishers;
          update_rank = true; 
          break;
        case '3':
          Serial.println( "Got 3" );
          lane = lane | 8;
          finishers++;
          rank[finishers-1] = 3;
          place[3] = finishers;
          update_rank = true; 
          break;
      }
    }

    Serial.println( "Reading demo pin" );
    int demo = digitalRead( DEMO_PIN );
    Serial.print( "Pin is: " );
    Serial.println( demo );
    if( ! demo && ! race_on ) {
      Serial.println( "Starting race." );
      digitalWrite( LASER_PIN, HIGH );
      race_on = true;
      start = millis();
      elapsed = 0;
      lane = 0;
      finishers = 0;
      // blank the big displays
      for( int i=0; i<LANES*7; i++ ) {
        leds[i] = CRGB::Black;
      }
      update_rank = true;
  
    }
  }
  
  // display times on all counters, which have not finished
  for( int n=0; n<4; n++) {
    if( race_on ) {
      // if the lane has not finished or is the one that finished in this 
      // loop iteration, then update the millis display
      if( ( ! (lane & pow2[n]) ) || ( (n==rank[finishers-1]) && update_rank ) ) {
        // select lane chip
        select_lane( n );
        // normally we would do that also continuously, so simulate this here
        ldr = analogRead( A7 ) / 10;
        //Serial.print( "LDR: " );
        //Serial.println( ldr );
        LED_small.DigitDisplayWrite( TM1637_CLOCK, TM1637_DATA, elapsed );
        if( ldr > LDR_THRESHOLD / 10 ) {
          // detected laser beam break
          // TODO: add array for multiple consecutive breaks from original sketch.
          //       may actually not be needed as the loop is around 18ms
          // set bit for this lane
          lane = lane | pow2[n];
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
        Serial.print( "update milli displays for lane " );
        Serial.println( n );
        for( int i=0; i<7; i++ ) {
          leds[i+n*7] = ( digit[place[n]][i] ? CRGB( 255, 100, 0) : CRGB::Black );
        }
      }

    } else {

      // test for setup
      Serial.println( "Race is off." );
      // select lane chip
      select_lane( n );
      ldr = analogRead( A7 ) / 10;
      LED_small.DigitDisplayWrite( TM1637_CLOCK, TM1637_DATA, ldr );
      delay(50);

    } 

  }

  // unselect last lane to achieve a stable state for the LDR line
  PCF[3].write8(0);

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
    // digitalWrite( LASER_PIN, LOW );
    // no need to be so responsive now
    delay( 2500 );
  }

}
