#include "PWDProtocol.h"
#include "PWDCar.h"

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
void PWDProtocol::sendCarDetection( const byte lane, const char* rfid )
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
    if( i==lane ) {
      JsonObject& carobj = l.createNestedObject();
      carobj["rf"] = rfid;
    } else {
      l.createNestedObject();
    }
  }
  root.printTo( _hwser );
  _hwser.println();
}


// this function sends the car detection for a heat, that has been set up
void PWDProtocol::sendCarDetection( const byte lane, const PWDCar* car, const bool wrongLane )
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
    if( i==lane ) {
      JsonObject& carobj = l.createNestedObject();
      carobj["rf"] = car->rfid;
      carobj["ow"] = car->owner;
      carobj["mn"] = car->matno;
      carobj["sn"] = car->serno;
    } else {
      l.createNestedObject();
    }
  }
  root.printTo( _hwser );
  _hwser.println();
}

// vim:si:sw=2
