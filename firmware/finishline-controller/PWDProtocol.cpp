#include "PWDProtocol.h"
#include "PWDData.h"

#include <Arduino.h>
#include <ArduinoJson.h>

PWDProtocol::PWDProtocol( HardwareSerial& serial ) :
  _hwser( serial )
{
  _id = 0;
}

void PWDProtocol::begin()
{
  _hwser.begin( 57600 );
  while ( ! _hwser );
}

void PWDProtocol::sendAck( const int id, const byte status )
{
  const int capacity = JSON_OBJECT_SIZE(4);
  StaticJsonBuffer<capacity> jsonBuffer;

  JsonObject& root = jsonBuffer.createObject();
  root["id"] = id;
  root["c"] = "a";
  root["s"] = status;
  root.printTo( _hwser );
  _hwser.println();
}


// this function sends the car detection for a heat, that has not yet been set up
void PWDProtocol::sendCarDetection( const byte laneNumber, const char* rfid )
{
  const int capacity = JSON_ARRAY_SIZE(4) + 3*JSON_OBJECT_SIZE(0) + JSON_OBJECT_SIZE(1) + JSON_OBJECT_SIZE(5);
  StaticJsonBuffer<capacity> jsonBuffer;

  _hwser.print( F("JSON Size: ") );
  _hwser.println( capacity );
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = ++_id;
  root["c"] = "d";
  root["h"] = 0;
  root["s"] = 5;
  JsonArray& l = root.createNestedArray( "l" );
  for ( byte i=0; i<=3; i++ ) {
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


// this function sends the car detection for a heat, that has been set up (argument if the lane was wrong)
void PWDProtocol::sendCarDetection( const byte laneNumber, const PWDLane* lane, const bool wrongLane )
{
  const int capacity = JSON_ARRAY_SIZE(4) + 3*JSON_OBJECT_SIZE(0) + JSON_OBJECT_SIZE(4) + JSON_OBJECT_SIZE(5);
  StaticJsonBuffer<capacity> jsonBuffer;

  _hwser.print( F("JSON Size: ") );
  _hwser.println( capacity );
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = ++_id;
  root["c"] = "d";
  root["h"] = 0;
  root["s"] = wrongLane ? 7 : 6;
  JsonArray& l = root.createNestedArray( "l" );
  for ( byte i=0; i<=3; i++ ) {
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

// this function sends the heat setup complete message or race progress message
void PWDProtocol::sendCompleteOrProgress( const uint8_t messageType, const PWDHeat* heat )
{
  const int capacity = JSON_ARRAY_SIZE(4) + 4*JSON_OBJECT_SIZE(5) + JSON_OBJECT_SIZE(5);
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
  for ( byte i=0; i<=3; i++ ) {
    JsonObject& carobj = l.createNestedObject();
    carobj["rf"] = heat->lanes[i]->rfid;
    carobj["ow"] = heat->lanes[i]->owner;
    carobj["mn"] = heat->lanes[i]->matno;
    carobj["sn"] = heat->lanes[i]->serno;
    if( messageType == MSG_PROGRESS && heat->lanes[i]->time > 0 ) {
      carobj["t"] = heat->lanes[i]->time;
    }
  }
  root.printTo( _hwser );
  _hwser.println();
}

// vim:si:sw=2
