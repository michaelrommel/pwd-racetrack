//
// Racetrack Firmware Startgate Controller
//

#include "PWDSkinnyData.h"
#include "PWDSkinnyProtocol.h"
#include "PWDStatistics.h"
#include "PWDStartGateDisplayReader.h"
#include "util.h"

#include <Arduino.h>

#include <stdlib.h>
#include <stdio.h>

#define STARTGATE_VERSION "0.1.0"

#define STARTGATE_PIN 45
#define SOLENOID_OPENTIME 750

#define LANES 4

// variables needed to display free memory
extern char _end;
extern "C" char *sbrk(int i);

// instantiate serial communication channels
// channel to finish line
PWDProtocol comfl( Serial1, 19200 );
// define acceptable commands for use in begin()
uint8_t comfl_whitelist[4][8] = {
  { // IDLE
    PWDProtocol::CODE_ACK, PWDProtocol::CODE_INIT
  },
  { // HEATSETUP
    PWDProtocol::CODE_ACK, PWDProtocol::CODE_INIT,
    PWDProtocol::CODE_GO
  },
  { // RACING
    PWDProtocol::CODE_ACK
  },
  { // TRACKSETUP
    // not needed for startgate
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
PWDStatistics loopStats( Serial );

// array of ss pins for selecting one RFID reader
const uint8_t readerSelectPin[LANES] = {
  42, 41, 44, 43
};

// instance of OLED displays
PWDStartGateDisplayReader oledreader[LANES] = {
//PWDStartGateDisplayReader oledreader[1] = {
  PWDStartGateDisplayReader( 6, true, readerSelectPin, 0 ),
  PWDStartGateDisplayReader( 7, false, readerSelectPin, 1 ),
  PWDStartGateDisplayReader( 2, true, readerSelectPin, 2 ),
  PWDStartGateDisplayReader( 3, false, readerSelectPin, 3 )
};

// flag, that a state change happened and the new
// state needs the initialisation routine
bool stateInitNeeded;
// flag, if solenoid has been opened
bool gateOpen;
// timer for some operations
unsigned long emitterWatchdog;
// index, which lane shall be checked next for new RFIDs
uint8_t nextRFIDCheck;

//
// Helper functions that are necessary for the main loop
//

// shows free ram on a pro mini or mega
int freeRam() {
    extern int __heap_start, *__brkval;
    int v;
    return (int) &v - (__brkval == 0 ?
            (int) &__heap_start :
            (int) __brkval);
}


// resets all the counters for a heat run
void initializeRace() {
  Serial.println( "initializeRace()" );
  // set correct heat status 
  heat.status =  PWDProtocol::STATUS_HEATINPROGRESS;
}

// clears any information from previous runs
void clearHeat( PWDHeat* heat ) {
  heat->state = PWDProtocol::STATE_IDLE;
  heat->status = PWDProtocol::STATUS_OK;
  heat->heatno = 0;
  for( int i=0; i<4; i++ ) {
    *heat->lane[i]->rfid = '\0';
    *heat->lane[i]->owner = '\0';
  }
}


// link the data structures together
void initStructures( void ) {
  // initialize the lane and heat structure for the race heat
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
}


// for debugging echo the current heat structure to the Serial port
void dumpHeat() {
  comfl.sendCompleteOrProgress( PWDProtocol::CODE_COMPLETE, &heat );
  comfl.sendCompleteOrProgress( PWDProtocol::CODE_COMPLETE, &setupHeat );
}


//
// Setup all needed peripherals
//
void setup() {

  // initialize all communication channels
  comfl.begin( comfl_whitelist );

  Serial.begin( 57600 );

  // set up the linked data structures for 
  // heat and setup status
  initStructures();

  // set all pin modes
  pinMode( STARTGATE_PIN, OUTPUT );
  for( int i=0; i<LANES; i++ ) {
    pinMode( readerSelectPin[i], OUTPUT );
  }

  // init the I2C and SPI busses
  Wire.begin();
	SPI.begin();

  // initialize the OLED displays
  oledreader[0].begin();
  oledreader[1].begin();
  oledreader[2].begin();
  oledreader[3].begin();

  // reset statistics
  loopStats.reset();

  // take turns in checking each lane
  nextRFIDCheck = 0;
  // for demo mode, we need a random timer when to fire new
  // messages 
  emitterWatchdog = 0;
  randomSeed( analogRead(A3) );

  // visually signal that Serial should be ready now
  Util::blink( FAST );
  Serial.print( F("\n\nPinewood Derby Startgate Version ") );
  Serial.println( STARTGATE_VERSION );
  Serial.println();
  Serial.print( F("Free RAM: ") );
  Serial.println( freeRam() );
  //Serial.println( F("Finished setup()") );

}

//
// main loop
//
void loop() {

  switch( heat.state ) {

		case PWDProtocol::STATE_IDLE:
      {
        if( stateInitNeeded ) {
          // reset flag
          stateInitNeeded = false;
          Serial.println( "entering idle" );
          // resetting everything
          gateOpen = false;
          clearHeat( &heat );
          clearHeat( &setupHeat );
          // blank the displays
          for( int i=0; i<LANES; i++ ) {
            oledreader[i].blank();
          }
        }
        // check connection to startgate
        if( comfl.available() ) {
          // read and process the serial command
          bool res = comfl.receiveSkinnyCommand( &heat );
          if( res ) {
            // cancel watchdog
            emitterWatchdog = 0;
            stateInitNeeded = true;
          }
        }
        // production code
        bool newcar = oledreader[nextRFIDCheck].checkRFID( &setupHeat );
        if( newcar ) {
          Serial.print( F("New car on lane: ") );
          Serial.println( nextRFIDCheck );
          Serial.println( setupHeat.lane[nextRFIDCheck]->rfid ); 
          // heat is not set up yet, just show the RFID
          oledreader[nextRFIDCheck].display( setupHeat.lane[nextRFIDCheck]->rfid );
          // send car detected message too
          comfl.sendCarDetection( nextRFIDCheck, setupHeat.lane[nextRFIDCheck]->rfid );
        }
        break;
      }

		case PWDProtocol::STATE_HEATSETUP:
      {
        if( stateInitNeeded ) {
          // reset flag
          stateInitNeeded = false;
          Serial.println( "entering heatsetup" );
          for( int i=0; i<LANES; i++ ) {
            // show target names on OLED displays
            oledreader[i].display( heat.lane[i]->owner );
            // reset any previously detected information
            *setupHeat.lane[i]->rfid = '\0';
            *setupHeat.lane[i]->owner = '\0';
          }
        }
        // check connection to startgate
        if( comfl.available() ) {
          // read and process the serial command
          bool res = comfl.receiveSkinnyCommand( &heat );
          if( res ) {
            stateInitNeeded = true;
          }
        }
        // production code
        // Check if we can skip this, because we already got the GO! message
        if( ! stateInitNeeded ) {
          bool newcar = oledreader[nextRFIDCheck].checkRFID( &setupHeat );
          if( newcar ) {
            Serial.print( F("New car on lane: ") );
            Serial.println( nextRFIDCheck );
            if( strncmp(heat.lane[nextRFIDCheck]->rfid, setupHeat.lane[nextRFIDCheck]->rfid, 14) != 0 ) {
              // Car on wrong lane
              oledreader[nextRFIDCheck].showDetails( heat.lane[nextRFIDCheck]->owner, "Wrong Car!" );
              comfl.sendCarDetection( heat.heatno, nextRFIDCheck, heat.lane[nextRFIDCheck], true );
            } else {
              // correct car
              oledreader[nextRFIDCheck].showDetails( heat.lane[nextRFIDCheck]->owner, setupHeat.lane[nextRFIDCheck]->rfid );
              // only in this case, we check, if all cars are actually correct and detemin the message type
              bool complete = true;
              for( int i=0; i<4; i++ ) {
                if( strncmp(heat.lane[i]->rfid, setupHeat.lane[i]->rfid, 14) != 0 ) {
                  complete = false;
                }
              }
              if( complete ) {
                heat.status = PWDProtocol::STATUS_SETUPCOMPLETE;
                comfl.sendCompleteOrProgress( PWDProtocol::CODE_COMPLETE, &heat );
              } else {
                comfl.sendCarDetection( heat.heatno, nextRFIDCheck, heat.lane[nextRFIDCheck], false );
              }
            }
          }
        }
        break;
      }

    case PWDProtocol::STATE_RACING:
      {
        if( stateInitNeeded ) {
          // reset flag
          stateInitNeeded = false;
          // open the start gate
          digitalWrite( STARTGATE_PIN, HIGH );
          // remember this
          gateOpen = true;
        }
        // check connection to startgate
        if( comfl.available() ) {
          // read and process the serial command
          bool res = comfl.receiveSkinnyCommand( &heat );
          if( res ) {
            // no commands allowed in this state
          }
        }
        // production code
        if( emitterWatchdog > 1 ) {
          // the watchdog has been set
          if ( millis() > emitterWatchdog ) {
            if( gateOpen == true ) {
              // release solenoid
              digitalWrite( STARTGATE_PIN, LOW );
              // reset flag
              gateOpen = false;
              // reset the watchdog to 1 second, after that go to IDLE state
              emitterWatchdog = millis() + 1000;
            } else {
              // it has fired a second time, move on to IDLE state automatically
              heat.state = PWDProtocol::STATE_IDLE;
              // cancel watchdog
              emitterWatchdog = 0;
              stateInitNeeded = true;
            }
          }
        } else {
          // set the watchdog to 1 second, after that go to IDLE state
          emitterWatchdog = millis() + SOLENOID_OPENTIME;
        } 
        break;
      }

    default:
      {
        break;
      }
  }

  nextRFIDCheck = (nextRFIDCheck + 1) % LANES;

  loopStats.show();
}

// vim:si:ci:sw=2
