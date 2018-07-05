//
// Racetrack Firmware
//

#include "FastLED.h"
#include "PWDLaneDisplay.h"
#include "PWDData.h"
#include "PWDProtocol.h"
#include "PWDStatistics.h"
#include "util.h"

#include <malloc.h>
#include <stdlib.h>
#include <stdio.h>

#define TM1637_DATA 24
#define TM1637_CLOCK 26
#define NEOPIXEL_PIN 28
#define DEMO_PIN 30
#define LASER_PIN 32

#define LDR_PIN A7
#define LDR_THRESHOLD 400

#define LANES 4

// variables needed to display free memory
extern char _end;
extern "C" char *sbrk(int i);

// the array of all RGB LEDs needs to be global here, as it is shared across
// all lane displays
CRGB leds[LANES*7];

// instantiate the <n> lanes
PWDLaneDisplay laneDisplay[LANES] = {
  PWDLaneDisplay( 0, TM1637_CLOCK, TM1637_DATA, leds, CRGB( 255, 255,   0) ),  
  PWDLaneDisplay( 1, TM1637_CLOCK, TM1637_DATA, leds, CRGB( 255, 255,   0) ),  
  PWDLaneDisplay( 2, TM1637_CLOCK, TM1637_DATA, leds, CRGB( 255, 255,   0) ),  
  PWDLaneDisplay( 3, TM1637_CLOCK, TM1637_DATA, leds, CRGB( 255, 255,   0) ),  
};

// instantiate three serial communication channels
// channel to bridge
PWDProtocol combr( Serial );
// define acceptable commands for use in begin()
uint8_t combr_whitelist[4][8] = {
  { // IDLE
    PWDProtocol::CODE_ACK, PWDProtocol::CODE_INIT,
    PWDProtocol::CODE_SETUP
  },
  { // HEATSETUP
    PWDProtocol::CODE_ACK, PWDProtocol::CODE_INIT,
    PWDProtocol::CODE_GO, PWDProtocol::CODE_SETUP
  },
  { // RACING
    PWDProtocol::CODE_ACK
  },
  { // TRACKSETUP
    PWDProtocol::CODE_ACK, PWDProtocol::CODE_SETUP
  }
};
// channel to Raspberry Pi
PWDProtocol compi( Serial2 );
// define acceptable commands for use in begin()
uint8_t compi_whitelist[4][8] = {
  { // IDLE
    PWDProtocol::CODE_ACK
  },
  { // HEATSETUP
    PWDProtocol::CODE_ACK, PWDProtocol::CODE_GO
  },
  { // RACING
  },
  { // TRACKSETUP
  }
};
// channel to Startgate
PWDProtocol comsg( Serial1 );
// define acceptable commands for use in begin()
uint8_t comsg_whitelist[4][8] = {
  { // IDLE
    PWDProtocol::CODE_ACK
  },
  { // HEATSETUP
    PWDProtocol::CODE_ACK, PWDProtocol::CODE_GO
  },
  { // RACING
    PWDProtocol::CODE_ACK
  },
  { // TRACKSETUP
  }
};

// global main data structure for a heat
// this is populated by the bridge
PWDHeat heat;
// 4 lanes
PWDLane lane[LANES];
// 4 character arrays, 14 characters plus \0
char rfid[LANES][15];
// 4 owners, 15 characters plus \0
char owner[LANES][16];

// data structure for the heat setup phase
// this is populated when the startgate detects cars
PWDHeat setupHeat;
// 4 lanes
PWDLane setupLane[LANES];
// 4 character arrays, 14 characters plus \0
char setupRfid[LANES][15];
// 4 owners, 15 characters plus \0
char setupOwner[LANES][16];

// instance for loop stats
PWDStatistics loopStats( SerialUSB );

// variables for race timings
unsigned long elapsed;
unsigned long start;

// bit array indicating if the car in this lane has finished  
// LSB = lane 0, MSB = lane 4 (or more...)
int lane_status;
// counter, how many cars have finished thiÂs heat
int finishers;

bool race_on;
bool update_rank;
// rank contains the lane numbers in the order they finish
int rank[LANES] = {0, 0, 0, 0};
// place contains the finishing place in lane order
int place[LANES] = {0, 0, 0, 0};

// variables for demo mode
unsigned long emitterWatchdog;


//
// Helper functions that are necessary for the main loop
//

// lane display selection
// we have to unselect all lanes first, otherwise two lanes might 
// temporarily end up both selected. Shouldn't be a big deal, but still...
// n == l equals false for all lanes other than the desired one
void select_laneDisplay( int l ) {
  for( int n=0; n<LANES; n++ ) {
    laneDisplay[n].select( n == l );
  }
  laneDisplay[l].select( true );
}

void clearDisplays() {
  // clear displays
  for( int n=0; n<LANES; n++ ) {
    select_laneDisplay( n );
    laneDisplay[n].showNumber( 0 );
    laneDisplay[n].setBigDigit( PWDLaneDisplay::DIGIT_OFF );
  }
  // unselect last lane to achieve a stable state for the LDR line
  laneDisplay[3].select( false );
  FastLED.show();
}

// for debugging echo the current heat structure to the Serial port
void dumpHeat() {
  combr.sendCompleteOrProgress( PWDProtocol::CODE_COMPLETE, &heat );
  combr.sendCompleteOrProgress( PWDProtocol::CODE_COMPLETE, &setupHeat );
}


//
// Setup all needed peripherals
//
void setup() {

  pinMode( LED_PIN, OUTPUT );

  // initialize all communication channels
  combr.begin( combr_whitelist );
  compi.begin( compi_whitelist );
  comsg.begin( comsg_whitelist );

  SerialUSB.begin( 57600 );

  // initialize the lane and heat structure for race heat
  // this should be now a fixed data structure in globals
  for( int i=0; i<4; i++ ) {
    lane[i].rfid = &rfid[i][0];
    lane[i].owner = &owner[i][0];
    heat.lane[i] = &lane[i];
  }
  heat.state = PWDProtocol::STATE_IDLE;
  heat.status = PWDProtocol::STATUS_OK;
  heat.heatno = 0;

  // initialize the lane and heat structure while setting up
  // this should be now a fixed data structure in globals
  for( int i=0; i<4; i++ ) {
    setupLane[i].rfid = &setupRfid[i][0];
    setupLane[i].owner = &setupOwner[i][0];
    setupHeat.lane[i] = &setupLane[i];
  }
  setupHeat.state = PWDProtocol::STATE_IDLE;
  setupHeat.status = PWDProtocol::STATUS_OK;
  setupHeat.heatno = 0;

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

  // reset statistics
  loopStats.reset();

  // for demo mode, we need a random timer when to fire new
  // messages 
  emitterWatchdog = 0;
  randomSeed( analogRead(A9) );

  // visually signal that SerialUSB should be ready now
  Util::blink( FAST );
  delay( 2000 );
  Util::ShowMemory( SerialUSB, &_end, sbrk(0) );
  SerialUSB.println( "Finished setup()" );

}

//
// main loop
//
void loop() {

  // remember current time and reset the flag for updating the 
  // big displays
  elapsed = (millis() - start);
  update_rank = false;
  // read demo switch
  int demo = digitalRead( DEMO_PIN );

  switch( heat.state ) {

		case PWDProtocol::STATE_IDLE:
      // do not change the displays, audience should be able
      // to view the race results!
      // check connection to startgate
      if( comsg.available() ) {
        // read and process the serial command
        bool res = comsg.receiveCommand( &heat );
        if( res ) {
          // startgate will not change the state
          // in this state we will only receive detect
          // messages from the startgate. res will
          // tell us if we need to emit one to the 
          // bridge
          //sendCarDetection(laneNumber,rfid);
        }
      }
      // check serial connection to bridge
      if( combr.available() ) {
        // read and process the serial command
        bool res = combr.receiveCommand( &heat );
        if( res ) {
          // state changed
          SerialUSB.print("State changed to: " );
          SerialUSB.println( heat.state );
          //dumpHeat();
          // cancel watchdog
          emitterWatchdog = 0;
        }
      }
      // check if we are in demo mode, if so
      // generate random detect messages
      if( demo ) {
        if( emitterWatchdog > 1 ) {
          // the watchdog has been set
          if ( millis() > emitterWatchdog ) {
            // it has fired
            //createRandomCarDetection();
            // renew watchdog
            emitterWatchdog = millis() + random(3000, 8000);
          }
        } else {
          // shall now set the watchdog
          emitterWatchdog = millis() + random(1000, 4000);
        } 
      }
      break;

    case PWDProtocol::STATE_HEATSETUP:
      // blank the displays
      clearDisplays();
      // check connection to startgate
      if( comsg.available() ) {
        // read and process the serial command
        bool res = comsg.receiveCommand( &heat );
        if( res ) {
          // startgate will not change the state
          // in this state we will only receive detect
          // messages from the startgate. res will
          // tell us if we need to emit one to the 
          // bridge
          //sendCarDetection(heatno,laneNumber,lane, wrongLane);
        }
      }
      // check serial connection to bridge
      if( combr.available() ) {
        // read and process the serial command
        bool res = combr.receiveCommand( &heat );
        if( res ) {
          // state changed
          SerialUSB.print("State changed to: " );
          SerialUSB.println( heat.state );
          if( heat.state == PWDProtocol::STATE_RACING ) {
            // remember start time
            // TODO change to time of received ACK!!
            start = millis();
            // no lane has finished
            lane_status = 0;
            // number of cars which finised is zero
            finishers = 0;
          }
          // cancel watchdog
          emitterWatchdog = 0;
        }
      }
      // check if we are in demo mode, if so
      // generate random detect messages
      if( demo ) {
        if( emitterWatchdog > 1 ) {
          // the watchdog has been set
          if ( millis() > emitterWatchdog ) {
            // it has fired
            SerialUSB.println( "Crafting random detect message" );
            uint8_t detectlane = Util::createRandomCarDetection( &heat, &setupHeat );
            if ( detectlane == 4 ) {
              // this means, all cars are right on the track
              SerialUSB.println( "Setup correct" );
              combr.sendCompleteOrProgress( PWDProtocol::CODE_COMPLETE, &heat );
              compi.sendCompleteOrProgress( PWDProtocol::CODE_COMPLETE, &heat );
            } else {
              bool wronglane = strncmp( setupHeat.lane[detectlane]->rfid, heat.lane[detectlane]->rfid, 14 );
              SerialUSB.print( "wronglane is ");
              SerialUSB.print( wronglane );
              SerialUSB.print( " for lane ");
              SerialUSB.println( detectlane );
              combr.sendCarDetection(heat.heatno, detectlane, setupHeat.lane[detectlane], wronglane );
              SerialUSB.println( "Showing current heat structures" );
            }
            //dumpHeat();
            // renew watchdog
            emitterWatchdog = millis() + random(3000, 8000);
          }
        } else {
          // shall now set the watchdog
          emitterWatchdog = millis() + random(1000, 4000);
          SerialUSB.print( "Setting watchdog to: " );
          SerialUSB.println( emitterWatchdog );
        } 
      }
      break;

    case PWDProtocol::STATE_RACING:
      // blank the displays
      clearDisplays();
      // check connection to startgate
      if( comsg.available() ) {
        // read and process the serial command
        bool res = comsg.receiveCommand( &heat );
        if( res ) {
          // startgate will not change the state
          // in this state we will only receive the 
          // acknowledge of the open gate command
          // TODO how to sync the times and start timer
        }
      }
      // check serial connection to bridge
      if( combr.available() ) {
        // read and process the serial command
        bool res = combr.receiveCommand( &heat );
        if( res ) {
          // during the race, only acks are 
          // expected, this should not happen
          // state changed
          SerialUSB.print("State changed to: " );
          SerialUSB.println( heat.state );
          // cancel watchdog
          emitterWatchdog = 0;
        }
      }
      // check if we are in demo mode, if so
      // generate random detect messages
      if( demo ) {
        if( emitterWatchdog > 1 ) {
          // the watchdog has been set
          if ( millis() > emitterWatchdog ) {
            // it has fired
            SerialUSB.println( "Crafting random progress message" );
            uint8_t progresslane = Util::createRandomProgress( &heat, elapsed );
            // set bit for this lane
            lane_status = lane_status | (1 << progresslane);
            // increase number of finishers (1-4)
            finishers++;
            // remember the lane for the n-th finisher
            rank[finishers-1] = progresslane;
            // remember the place for this lane
            place[progresslane] = finishers;
            update_rank = true; 
            if ( finishers == LANES ) {
              // this means, all cars have finished the heat
              SerialUSB.println( "Heat ended" );
              heat.status =  PWDProtocol::STATUS_HEATFINISHED;
              // cancel watchdog
              emitterWatchdog = 0;
              // return to idle state
              heat.state = PWDProtocol::STATE_IDLE;
            } else {
              // create the car progress message
              // renew watchdog for next cars, add 200ms up to 1sec between cars
              emitterWatchdog = millis() + random(400, 1000);
            }
            combr.sendCompleteOrProgress( PWDProtocol::CODE_PROGRESS, &heat );
            compi.sendCompleteOrProgress( PWDProtocol::CODE_PROGRESS, &heat );
          }
        } else {
          // shall now set the initialwatchdog
          emitterWatchdog = millis() + random(4000, 6000);
          SerialUSB.print( "Setting initial watchdog to: " );
          SerialUSB.println( emitterWatchdog );
          SerialUSB.print( "Resetting finisher array" );
        } 
      }
      break;

    case PWDProtocol::STATE_TRACKSETUP:
      break;

    default:
      break;
  }

  loopStats.show();
}


  /*

  // setup

  // testing
  start = millis();
  race_on = true;
  lane_status = 0;
  finishers = 0;
  digitalWrite( LASER_PIN, HIGH );

  // loop

  // check serial only if the race is off, to save loop cycle time
  if( ! race_on ) {

    //Serial.println( "Reading demo pin" );
    int demo = digitalRead( DEMO_PIN );
    //Serial.print( "Pin is: " );
    //Serial.println( demo );
    if( ! demo && ! race_on ) {
      //SerialUSB.println( "Starting race." );
      digitalWrite( LASER_PIN, HIGH );
      race_on = true;
      start = millis();
      lane_status = 0;
      finishers = 0;
      // blank the big displays
      for( int n=0; n<LANES; n++ ) {
        SerialUSB.print( "clear big display for lane " );
        SerialUSB.println( n );
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
      if( ( ! (lane_status & (1 << n)) ) || ( update_rank && (finishers > 0) && (n==rank[finishers-1]) ) ) {
        // select lane chip
        select_laneDisplay( n );
        laneDisplay[n].showNumber( elapsed );
        // normally we would do that also continuously, so simulate this here
        int ldr = analogRead( A7 );
        //Serial.print( "LDR: " );
        //Serial.println( ldr );
        if( ldr > LDR_THRESHOLD ) {
          SerialUSB.print( "Laser break on lane: " );
          SerialUSB.println( n );
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
      if( update_rank && (finishers > 0 ) && ( n==rank[finishers-1]) ) {
        SerialUSB.print( "update big display for lane " );
        SerialUSB.println( n );
        laneDisplay[n].setBigDigit( place[n] );
      }
      
    } else {
      
      // test for setup
      //Serial.println( "Race is off." );
      // select lane chip
      select_laneDisplay( n );
      int ldr = analogRead( A7 ) / 10;
      laneDisplay[n].showNumber( ldr );
      //delay(50);

    }

  }

  // unselect last lane to achieve a stable state for the LDR line
  laneDisplay[3].select( false );
  
  // only push updates to the LEDs, if necessary, as it blocks serial interrupts
  if( update_rank ) {
    SerialUSB.println( "show big displays " );
    FastLED.show();
    update_rank = false;
  }


  if( finishers == LANES ) {
    // this enables reading serial again, to re-start a race
    race_on = false;
    // no need to be so responsive now
    //delay( 1000 );
  }

  */

// vim:si:ci:sw=2
