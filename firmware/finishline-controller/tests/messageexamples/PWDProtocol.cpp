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
void PWDProtocol::begin( uint8_t whitelist[8])
{
  _hwser.begin( 57600 );
  // should return immediately except for the Leonardo
  while ( ! _hwser );
  // the max time we wait for incoming data in millis
  _hwser.setTimeout( 400 );
  for( int i=0; i<8; i++ ) {
    _codeWhitelist[i] = whitelist[i];
  }
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
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 3*JSON_OBJECT_SIZE(0) + JSON_OBJECT_SIZE(1) + JSON_OBJECT_SIZE(5);
  StaticJsonBuffer<capacity> jsonBuffer;

  _hwser.print( F("JSON Size: ") );
  _hwser.println( capacity );
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = ++_id;
  root["c"] = "d";
  root["h"] = 0;
  root["s"] = 5;
  JsonArray& l = root.createNestedArray( "l" );
  for ( int i=0; i<=3; i++ ) {
    if( i==laneNumber ) {
      JsonObject& carobj = l.createNestedObject();
      carobj["rf"] = rfid;
    } else {
      l.createNestedObject();
    }
  }
  root.printTo( _hwser );
  _hwser.println();
}


// send the car detection for a heat, that has been set up (argument if the lane was wrong)
void PWDProtocol::sendCarDetection( const uint8_t heatno, const uint8_t laneNumber, const PWDLane* lane, const bool wrongLane )
{
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 3*JSON_OBJECT_SIZE(0) + JSON_OBJECT_SIZE(4) + JSON_OBJECT_SIZE(5);
  StaticJsonBuffer<capacity> jsonBuffer;

  _hwser.print( F("JSON Size: ") );
  _hwser.println( capacity );
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = ++_id;
  root["c"] = "d";
  root["h"] = heatno;
  root["s"] = wrongLane ? (uint8_t) STATUS_WRONGLANE : (uint8_t) STATUS_CORRECTLANE;
  JsonArray& l = root.createNestedArray( "l" );
  for ( int i=0; i<=3; i++ ) {
    if( i==laneNumber ) {
      JsonObject& carobj = l.createNestedObject();
      carobj["rf"] = lane->rfid;
      carobj["ow"] = lane->owner;
      carobj["mn"] = lane->matno;
      carobj["sn"] = lane->serno;
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
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 4*JSON_OBJECT_SIZE(5) + JSON_OBJECT_SIZE(5);
  StaticJsonBuffer<capacity> jsonBuffer;

  // debug display the size of the allocated JSON buffer
  _hwser.print( F("JSON Size: ") );
  _hwser.println( capacity );

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
  for ( int i=0; i<=3; i++ ) {
    JsonObject& carobj = l.createNestedObject();
    if( messageType == CODE_COMPLETE ||
        (messageType == CODE_PROGRESS && heat->lanes[i]->time > 0) ) {
      carobj["rf"] = heat->lanes[i]->rfid;
      carobj["ow"] = heat->lanes[i]->owner;
      carobj["mn"] = heat->lanes[i]->matno;
      carobj["sn"] = heat->lanes[i]->serno;
    }
    if( messageType == CODE_PROGRESS && heat->lanes[i]->time > 0 ) {
      carobj["t"] = heat->lanes[i]->time;
    }
  }
  root.printTo( _hwser );
  _hwser.println();
}

// report the laser levels during race track setup (also displayed on the 7-segments)
void PWDProtocol::sendLaserLevel( const uint8_t messageType, const PWDHeat* heat )
{
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 4*JSON_OBJECT_SIZE(2) + JSON_OBJECT_SIZE(5);
  StaticJsonBuffer<capacity> jsonBuffer;

  // debug display the size of the allocated JSON buffer
  _hwser.print( F("JSON Size: ") );
  _hwser.println( capacity );

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
  for ( int i=0; i<=3; i++ ) {
    JsonObject& carobj = l.createNestedObject();
    carobj["ll"] = heat->lanes[i]->laser;
  }
  root.printTo( _hwser );
  _hwser.println();
}


// checks, whether a given command is valid for this comm
bool PWDProtocol::checkWhitelist( uint8_t code) {
  bool ok = false;
  for( int i=0; i<8; i++ ) {
    if( _codeWhitelist[i] == code ) {
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
  uint8_t countRead;
  
  const uint16_t capacity = JSON_ARRAY_SIZE(4) + 4*JSON_OBJECT_SIZE(5) + JSON_OBJECT_SIZE(5);
  StaticJsonBuffer<capacity> jsonBuffer;

  countRead = _hwser.readBytesUntil('\n', incomingBytes, len);
  if( countRead == 0 ) {
    // error, we did not find any usable data
    return 0;
  } else {
    // decode data
    JsonObject& root = jsonBuffer.parse(incomingBytes);
    if( root.success() ) {
      // check valid commands
      const char code = root["c"][0];
      if( checkWhitelist( code ) ) {
        // process command 
        switch( code ) {
          case CODE_ACK:
            // remove the potentially saved message from outgoing buffer
            //removeMessage( root["id"] );
            break;
          case CODE_INIT:
            // take the information from the command and save it to the heat
            heat->state = STATE_HEATSETUP;
            heat->status = STATUS_OK;
            heat->heatno = root["h"];
            for( int i=0; i<4; i++ ) {
              JsonObject& l = root["l"][i];
              strncpy(heat->lanes[i]->rfid, l["rf"], 14);
            }
            // ....
            break;
        }
        return STATE_IDLE;
      } else {
        // send invalid command message
        sendAck( 0, STATUS_INVALIDCOMMAND );
        return 0;
      }
    } else {
      // parsing JSON failed
      sendAck( 0, STATUS_CORRUPTEDJSON );
      return 0;
    }
  }
}





// vim:ci:si:sw=2
