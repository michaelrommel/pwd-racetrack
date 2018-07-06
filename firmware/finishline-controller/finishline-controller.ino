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

// flag, that a state change happened and the new
// state needs the initialisation routine
bool stateInitNeeded;

// variables for race timings
unsigned long elapsed;
unsigned long start;

// bit array indicating if the car in this lane has finished  
// LSB = lane 0, MSB = lane 4 (or more...)
int lane_status;
// counter, how many cars have finished thiÂs heat
int finishers;
// number of lanes to finish (some may be empty in a heat)
int expectedFinishers;
// rank contains the lane numbers in the order they finish
int rank[LANES] = {0, 0, 0, 0};
// place contains the finishing place in lane order
int place[LANES] = {0, 0, 0, 0};
// inidcator that the big displays need updating
bool update_rank;

// variables for demo mode
unsigned long emitterWatchdog;


//
// Helper functions that are necessary for the main loop
//

// lane display selection we have to unselect all lanes first,
// otherwise two lanes might temporarily end up both selected.
void select_laneDisplay( int l ) {
  for( int n=0; n<LANES; n++ ) {
    // n == l equals false for all lanes other than the desired one
    laneDisplay[n].select( n == l );
  }
  laneDisplay[l].select( true );
}

// routine to clear all displays of a lane, small and big
void clearDisplays() {
  for( int n=0; n<LANES; n++ ) {
    select_laneDisplay( n );
    laneDisplay[n].showNumber( 0 );
    laneDisplay[n].setBigDigit( PWDLaneDisplay::DIGIT_OFF );
  }
  // unselect last lane to achieve a stable state for the LDR line
  laneDisplay[3].select( false );
  FastLED.show();
}

// get the number of participants in this heat, lanes may be empty
uint8_t getExpectedFinishers() {
  uint8_t ef = 0;
  for( int i=0; i<4; i++ ) {
    if( strlen(heat.lane[i]->rfid) > 0 ) ef++;
  }
  return ef;
}

// routine that gets called once per loop when the race is running
// returnes true, if at leat one more car finished
bool checkOrSetFinishers( uint8_t setFinishLane = 0xFF ) {
  bool bigDisplayUpdate = false;
  bool oneMore = false;
  int ldr = 0;
  for( int n=0; n<4; n++) {
    // if the lane has not finished and should have a car on it
    // loop iteration, then update the millis display
    if( ! (lane_status & (1 << n)) && (strlen(heat.lane[n]->rfid) > 0) ) {
      // select lane chip
      select_laneDisplay( n );
      laneDisplay[n].showNumber( elapsed );
      if( setFinishLane == 0xFF ) {
        // we shall check the LDR
        ldr = analogRead( A7 );
        //SerialUSB.print( "LDR " );
        //SerialUSB.print( n );
        //SerialUSB.print( " = " );
        //SerialUSB.println( ldr );
      }
      if( ( ldr > LDR_THRESHOLD ) || ( setFinishLane == n ) ){
        SerialUSB.print( "Laser break on lane " );
        if( setFinishLane != 0xFF ) SerialUSB.print( "(simulated) ");
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
        // record time
        heat.lane[n]->time = elapsed;
        // remember to update the big displays
        bigDisplayUpdate = true; 
        // set the raw data now, update the display later for all at once
        laneDisplay[n].setBigDigit( place[n] );
        // remember return code that one car finished
        oneMore = true;
      }
    }
  }
  // unselect last lane to achieve a stable state for the LDR line
  laneDisplay[3].select( false );
  // only push updates to the LEDs, if necessary, as it blocks serial interrupts
  if( bigDisplayUpdate ) {
    SerialUSB.println( "Updating big displays" );
    FastLED.show();
    bigDisplayUpdate = false;
  }
  return oneMore;
}


// displays the measured light level of the light dependend resistors  
void showLaserLevel() {
  for( int n=0; n<4; n++) {
    // select lane chip
    select_laneDisplay( n );
    // small delay to have the LDRs settle
    delay(10);
    // we shall check the LDR
    int ldr = analogRead( A7 ) / 10;
    laneDisplay[n].showNumber( ldr );
    heat.lane[n]->laser = ldr;
  }
  laneDisplay[3].select( false );
}


// resets all the counters for a heat run
void initializeRace() {
  SerialUSB.println( "initializeRace()" );
  // switch on the lasers
  digitalWrite( LASER_PIN, HIGH );
  // blank the displays
  clearDisplays();
  // remember preliminary start time
  start = millis();
  // reset elapsed var
  elapsed = 0;
  // reset race times
  for( int i=0; i<4; i++ ) {
    heat.lane[i]->time = 0;
  }
  // no lane has finished
  lane_status = 0;
  // number of cars which finished is zero
  finishers = 0;
  // get the number of participants
  expectedFinishers = getExpectedFinishers();
  // set correct heat status 
  heat.status =  PWDProtocol::STATUS_HEATINPROGRESS;
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
    lane[i].time = 0;
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
    setupLane[i].time = 0;
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
      {
        if( stateInitNeeded ) {
          // reset flag
          stateInitNeeded = false;
          // do not change the displays, audience should be able
          // to view the race results!
        }
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
            // TODO
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
            // cancel watchdog
            emitterWatchdog = 0;
            stateInitNeeded = true;
          }
        }
        // check if we are in demo mode, if so
        // generate random detect messages
        if( demo ) {
          if( emitterWatchdog > 1 ) {
            // the watchdog has been set
            if ( millis() > emitterWatchdog ) {
              // it has fired
              uint8_t detectlane = Util::createRandomCarDetection( &setupHeat );
              combr.sendCarDetection( detectlane, setupHeat.lane[detectlane]->rfid );
              // renew watchdog
              emitterWatchdog = millis() + random(3000, 8000);
            }
          } else {
            // shall now set the watchdog
            emitterWatchdog = millis() + random(1000, 4000);
          } 
        } else {
          // production code
          // TODO - unsure if there is anything left to do here besides some fancy
          // LED animation :-)
        }
        break;
      }

    case PWDProtocol::STATE_HEATSETUP:
      {
        if( stateInitNeeded ) {
          // reset flag
          stateInitNeeded = false;
          // blank the displays
          clearDisplays();
          // set correct heat status 
          heat.status =  PWDProtocol::STATUS_OK;
        }
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
            stateInitNeeded = true;
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
        } else {
          // production code
          // TODO - unsure if there is anything left to do here besides some fancy
          // LED animation :-)
        }
        break;
      }

    case PWDProtocol::STATE_RACING:
      {
        if( stateInitNeeded ) {
          // reset flag
          stateInitNeeded = false;
          initializeRace();
          // send the command to open the gate to the startgate
          //comsg.sendSkinnyGo(); TODO
        }
        // check connection to startgate
        if( comsg.available() ) {
          // read and process the serial command
          bool res = comsg.receiveCommand( &heat );
          if( res ) {
            // in this case a returned true means, that we received the skinny
            // GO_ACK from the startgate indicating that it opened the gate
            unsigned long rtt = millis() - start;
            SerialUSB.print( "RTT to gate was: " );
            SerialUSB.println( rtt );
            // add the half of the roundtrip time
            start += (rtt >> 1);
          }
        }
        // check serial connection to bridge
        if( combr.available() ) {
          // read and process the serial command
          bool res = combr.receiveCommand( &heat );
          if( res ) {
            // during the race, only acks are expected, this should not happen
            // state changed
            SerialUSB.print("ERROR: State changed to: " );
            SerialUSB.println( heat.state );
          }
        }
        // flag to remember another finisher
        bool oneMore = false;
        // check if we are in demo mode, if so
        // generate random finishing messages
        if( demo ) {
          if( emitterWatchdog > 1 ) {
            // the watchdog has been set
            if ( millis() > emitterWatchdog ) {
              // it has fired
              SerialUSB.println( "Crafting random progress message" );
              uint8_t progressLane = Util::createRandomProgress( &heat, elapsed );
              // update displays with forced lane finish
              oneMore = checkOrSetFinishers( progressLane );
              if ( finishers != expectedFinishers ) {
                // renew watchdog for next cars, add 200ms up to 1sec between cars
                emitterWatchdog = millis() + random(400, 1000);
              }
            } else {
              // update displays checking the LDRs
              // without this the small displays get only updated in demot mode 
              // when the watchdog fires
              oneMore = checkOrSetFinishers( );
            }

          } else {
            // shall now set the initialwatchdog
            emitterWatchdog = millis() + random(4000, 6000);
            SerialUSB.print( "Setting initial watchdog to: " );
            SerialUSB.println( emitterWatchdog );
            SerialUSB.print( "Resetting finisher array" );
          } 
        } else {
          // production 
          oneMore = checkOrSetFinishers();
        }
        // for demo and production
        if( oneMore ) {
          if( finishers == expectedFinishers ) {
            // this means, all cars have finished the heat
            SerialUSB.println( "Heat ended" );
            heat.status =  PWDProtocol::STATUS_HEATFINISHED;
            // cancel watchdog
            emitterWatchdog = 0;
            // return to idle state
            heat.state = PWDProtocol::STATE_IDLE;
          }
          // create the car progress message
          combr.sendCompleteOrProgress( PWDProtocol::CODE_PROGRESS, &heat );
          compi.sendCompleteOrProgress( PWDProtocol::CODE_PROGRESS, &heat );
        }
        break;
      } // needed to create a scope for oneMore declaration

    case PWDProtocol::STATE_TRACKSETUP:
      {
        if( stateInitNeeded ) {
          stateInitNeeded = false;
          clearDisplays();
          digitalWrite( LASER_PIN, HIGH );
        }
        // check connection to startgate
        if( comsg.available() ) {
          // read and process the serial command
          bool res = comsg.receiveCommand( &heat );
          if( res ) {
            // we should not process any commands from SG here
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
            stateInitNeeded = true;
            // cancel watchdog
            emitterWatchdog = 0;
            // switch off lasers
            digitalWrite( LASER_PIN, LOW );
            clearDisplays();
          }
        }
        // for demo and production
        // skip the display when leaving this state because
        // the displayed values are invalid due to lasers being
        // already switched off
        if( ! stateInitNeeded ) showLaserLevel();
        // create a timer to avoid spamming on the serial port
        if( emitterWatchdog > 1 ) {
          // the watchdog has been set
          if ( millis() > emitterWatchdog ) {
            // it has fired
            combr.sendLaserLevel( &heat );
            emitterWatchdog = millis() + 1000;
          }
        } else {
          // shall now set the initialwatchdog
          emitterWatchdog = millis() + 1000;
        } 
        break;
      }

    default:
      {
        break;
      }
  }

  loopStats.show();
}

// vim:si:ci:sw=2
