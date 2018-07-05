#include "PWDProtocol.h"
#include "PWDData.h"

#include <Arduino.h>
#include <ArduinoJson.h>

#include <string.h>

// class constructor
PWDProtocol::PWDProtocol( HardwareSerial& serial ) :
  _hwser( serial )
{
  // reset the message id for this communication stream
  _id = 0;
}

// initialise the port
void PWDProtocol::begin( uint8_t whitelist[4][8])
{
  _hwser.begin( 57600 );
  // should return immediately except for the Leonardo
  while ( ! _hwser );
  // the max time we wait for incoming data in millis
  _hwser.setTimeout( 400 );
  for( int j=0; j<4; j++ ) {
    for( int i=0; i<8; i++ ) {
      _codeWhitelist[j][i] = whitelist[j][i];
    }
  }
}

// checks for availablity of data on the serial line
bool PWDProtocol::available() {
  return _hwser.available();
}

// send acknowledge packets for the provided id
void PWDProtocol::sendAck( const uint16_t id, const uint8_t status )
{
  const uint16_t capacity = JSON_OBJECT_SIZE(4);
  StaticJsonBuffer<capacity> jsonBuffer;

  JsonObject& root = jsonBuffer.createObject();
  root["id"] = id;
  root["c"] = "a";
  root["s"] = status;
  root.printTo( _hwser );
  _hwser.println();
}

// send the car detection for a heat, that has not yet been set up
void PWDProtocol::sendCarDetection( const uint8_t laneNumber, const char* rfid )
{
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 3*JSON_OBJECT_SIZE(0) + JSON_OBJECT_SIZE(1) + JSON_OBJECT_SIZE(5) + 100;
  StaticJsonBuffer<capacity> jsonBuffer;

  //SerialUSB.print( F("JSON Size: ") );
  //SerialUSB.println( capacity );
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = ++_id;
  root["c"] = "d";
  root["h"] = 0;
  root["s"] = 5;
  JsonArray& l = root.createNestedArray( "l" );
  for ( int i=0; i<4; i++ ) {
    JsonObject& laneobj = l.createNestedObject();
    if( i==laneNumber && strlen( rfid ) != 0 ) {
      laneobj["rf"] = rfid;
    }
  }
  root.printTo( _hwser );
  _hwser.println();
}


// send the car detection for a heat, that has been set up (argument if the lane was wrong)
void PWDProtocol::sendCarDetection( const uint8_t heatno, const uint8_t laneNumber, const PWDLane* lane, const bool wrongLane )
{
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 3*JSON_OBJECT_SIZE(0) + JSON_OBJECT_SIZE(4) + JSON_OBJECT_SIZE(5) + 100;
  StaticJsonBuffer<capacity> jsonBuffer;

  //SerialUSB.print( F("JSON Size: ") );
  //SerialUSB.println( capacity );
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = ++_id;
  root["c"] = "d";
  root["h"] = heatno;
  root["s"] = wrongLane ? (uint8_t) STATUS_WRONGLANE : (uint8_t) STATUS_CORRECTLANE;
  JsonArray& l = root.createNestedArray( "l" );
  for ( int i=0; i<4; i++ ) {
    if( i==laneNumber ) {
      JsonObject& laneobj = l.createNestedObject();
      if( strlen( lane->rfid ) != 0 ) {
        laneobj["rf"] = lane->rfid;
      }
      if( strlen( lane->owner ) != 0 ) {
        laneobj["ow"] = lane->owner;
      }
      if( lane->matno > 0 ) {
        laneobj["mn"] = lane->matno;
      }
      if( lane->serno > 0 ) {
        laneobj["sn"] = lane->serno;
      }
    } else {
      l.createNestedObject();
    }
  }
  root.printTo( _hwser );
  _hwser.println();
}

//
// send the heat setup complete message or race progress message
void PWDProtocol::sendCompleteOrProgress( const uint8_t messageType, const PWDHeat* heat )
{
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 4*JSON_OBJECT_SIZE(5) + JSON_OBJECT_SIZE(5) + 100;
  StaticJsonBuffer<capacity> jsonBuffer;

  // debug display the size of the allocated JSON buffer
  //SerialUSB.print( F("JSON Size: ") );
  //SerialUSB.println( capacity );

  // allocate a single character as string 
  char messageString[2];
  messageString[0]=messageType;
  messageString[1]=0;

  // create the JSON object
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = ++_id;
  root["c"] = messageString;
  root["h"] = heat->heatno;
  root["s"] = heat->status;
  JsonArray& l = root.createNestedArray( "l" );
  for ( int i=0; i<4; i++ ) {
    JsonObject& laneobj = l.createNestedObject();
    if( messageType == CODE_COMPLETE ||
        (messageType == CODE_PROGRESS && heat->lane[i]->time > 0) ) {
      if( strlen( heat->lane[i]->rfid ) != 0 ) {
        laneobj["rf"] = heat->lane[i]->rfid;
      }
      if( strlen( heat->lane[i]->owner ) != 0 ) {
        laneobj["ow"] = heat->lane[i]->owner;
      }
      if( heat->lane[i]->matno > 0 ) {
        laneobj["mn"] = heat->lane[i]->matno;
      }
      if( heat->lane[i]->serno > 0 ) {
        laneobj["sn"] = heat->lane[i]->serno;
      }
    }
    if( messageType == CODE_PROGRESS && heat->lane[i]->time > 0 ) {
      laneobj["t"] = heat->lane[i]->time;
    }
  }
  root.printTo( _hwser );
  _hwser.println();
}

// report the laser levels during race track setup (also displayed on the 7-segments)
void PWDProtocol::sendLaserLevel( const uint8_t messageType, const PWDHeat* heat )
{
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 4*JSON_OBJECT_SIZE(1) + JSON_OBJECT_SIZE(5) + 100;
  StaticJsonBuffer<capacity> jsonBuffer;

  // debug display the size of the allocated JSON buffer
  //SerialUSB.print( F("JSON Size: ") );
  //SerialUSB.println( capacity );

  // allocate a single character as string 
  char messageString[2];
  messageString[0]=messageType;
  messageString[1]=0;

  // create the JSON object
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = ++_id;
  root["c"] = messageString;
  root["h"] = heat->heatno;
  root["s"] = (uint8_t) STATUS_TRACKSETUPREPORT;
  JsonArray& l = root.createNestedArray( "l" );
  for ( int i=0; i<4; i++ ) {
    JsonObject& laneobj = l.createNestedObject();
    laneobj["ll"] = heat->lane[i]->laser;
  }
  root.printTo( _hwser );
  _hwser.println();
}


// checks, whether a given command is valid for this comm
bool PWDProtocol::checkWhitelist( uint8_t state, uint8_t code) {
  bool ok = false;
  for( int i=0; i<8; i++ ) {
    if( _codeWhitelist[state][i] == code ) {
      ok = true;
    }
  }
  return ok;
}

// this gets called after the main loop checked that there
// are bytes available on this serial comm
// returns true, if the state changed
bool PWDProtocol::receiveCommand( PWDHeat* heat )
{
  const uint16_t len = 384;
  char incomingBytes[len];
  uint16_t countRead;
  
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 4*JSON_OBJECT_SIZE(5) + JSON_OBJECT_SIZE(5) + 320;
  StaticJsonBuffer<capacity> jsonBuffer;

  countRead = _hwser.readBytesUntil('\n', incomingBytes, len);

  if( countRead == 0 ) {
    // error, we did not find any usable data
    SerialUSB.println("error!");
    return false;
  } else {
    SerialUSB.print("got bytes: ");
    SerialUSB.println( countRead );
    // decode data
    JsonObject& root = jsonBuffer.parse(incomingBytes);
    if( root.success() ) {
      // check valid commands
      const char* codePtr = root["c"];
      const char code = codePtr[0];
      SerialUSB.print("Code was: ");
      SerialUSB.println( code );
      if( checkWhitelist( heat->state, code ) ) {
        // get ID
        uint8_t theirId = root["id"];
        // try to initialize the lanes array before switch to keep
        // the compiler happy
        JsonArray& _lanes = root["l"];
        // process command 
        switch( code ) {
          case (uint8_t) CODE_ACK:
            // remove the potentially saved message from outgoing buffer
            //removeMessage( root["id"] );
            return false;
            break;
          case (uint8_t) CODE_INIT:
            // send acknowlege
            sendAck( theirId, STATUS_OK );
            // take the information from the command and save it to the heat
            heat->state = STATE_HEATSETUP;
            heat->status = STATUS_OK;
            heat->heatno = root["h"];
            //JsonArray& _lanes = root["l"];
            for( int i=0; i<4; i++ ) {
              JsonObject& l = _lanes[i];
              if( strlen( l["rf"] ) != 0 ) { 
                strncpy(heat->lane[i]->rfid, l["rf"], 14);
              } else {
                *heat->lane[i]->rfid = '\0';
              }
              if( strlen( l["ow"] ) != 0 ) { 
                strncpy(heat->lane[i]->owner, l["ow"], 15);
              } else {
                *heat->lane[i]->owner = '\0';
              }
              heat->lane[i]->matno = l["mn"];
              heat->lane[i]->serno = l["sn"];
            }
            // indicate state change
            return true;
            break;
          case (uint8_t) CODE_GO:
            // send acknowlege
            sendAck( theirId, STATUS_OK );
            // send start signal to Startgate
            // ... TODO
            heat->state = STATE_RACING;
            heat->status = STATUS_HEATINPROGRESS;
            heat->heatno = root["h"];
            // indicate state change
            return true;
            break;
          case (uint8_t) CODE_SETUP:
            // send acknowlege
            sendAck( theirId, STATUS_OK );
            // put track in/out of LDR display mode
            // ... TODO
            heat->state = STATE_TRACKSETUP;
            heat->status = STATUS_OK;
            return true;
            break;
          default:
            // send error
            sendAck( theirId, STATUS_UNSUPPORTEDCOMMAND );
            return false;
            break;
        }
      } else {
        SerialUSB.println("invalid command");
        // send invalid command message
        sendAck( 0, STATUS_INVALIDCOMMAND );
        return false;
      }
    } else {
      SerialUSB.println("error decoding json");
      // parsing JSON failed
      sendAck( 0, STATUS_CORRUPTEDJSON );
      return false;
    }
  }
}

// vim:ci:si:sw=2
