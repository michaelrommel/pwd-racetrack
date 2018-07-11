#include "PWDStartGateDisplayReader.h"
#include "PWDSkinnyData.h"
#include "util.h"

#include <Arduino.h>

#include <U8g2lib.h>
#include <MFRC522.h>

#define TCAADDR 0x70

#define SS_PIN 53

PWDStartGateDisplayReader::PWDStartGateDisplayReader( uint8_t portNumber, bool rotated, const uint8_t* allPins, uint8_t index ) :
  // _oled( 4 ),
  //_oled( rotated ? U8G2_R2 : U8G2_R0, SCL, SDA, U8X8_PIN_NONE ),
  _oled( rotated ? U8G2_R2 : U8G2_R0 ),
  _rfidreader( SS_PIN, MFRC522::UNUSED_PIN )
{
  _portNumber = portNumber; 
  _rotated = rotated;
  _allPins = allPins;
  _index = index;
}

void PWDStartGateDisplayReader::begin( void )
{

  readerselect();
	_rfidreader.PCD_Init();

  //Serial.print( F("Selecting I2C port: ") );
  //Serial.println( _portNumber );

  tcaselect(); 

  _oled.begin();

  _oled.clearBuffer();
  _oled.sendBuffer();

}


void PWDStartGateDisplayReader::blank( void )
{
  tcaselect(); 
  _oled.clearBuffer();
  _oled.sendBuffer();		
}

void PWDStartGateDisplayReader::display( char* name )
{
  tcaselect(); 
  _oled.clearBuffer();
  _oled.setFont(u8g2_font_9x15_tf);
  _oled.drawStr(0,13, name);
  _oled.sendBuffer();		

}

void PWDStartGateDisplayReader::showDetails( const char* name, const char* details )
{
  tcaselect(); 

  _oled.clearBuffer();
  _oled.setFont(u8g2_font_9x15_tf);
  _oled.drawStr(0,13, name);
  _oled.drawStr(0,26, details );
  _oled.sendBuffer();		
}


void PWDStartGateDisplayReader::tcaselect( void ) {
  if (_portNumber > 7) return;
  Wire.beginTransmission( TCAADDR );
  Wire.write( 1 << _portNumber );
  Wire.endTransmission();  
}


void PWDStartGateDisplayReader::readerselect( void ) {

  for( int i=0; i<4; i++ ) {
    digitalWrite( _allPins[i], LOW );
  }  
  digitalWrite( _allPins[_index], HIGH );
     
}


bool PWDStartGateDisplayReader::checkRFID( PWDHeat* setupHeat )
{

  readerselect();

	// Look for new cards
	if ( ! _rfidreader.PICC_IsNewCardPresent()) {
		return false;
	}

	// Select one of the cards
	if ( ! _rfidreader.PICC_ReadCardSerial()) {
		return false;
	}

  Serial.print( "Lane index: " );
  Serial.println( _index );

  if( _rfidreader.uid.size > 7 ) {
    // we have only 14 characters available
    Util::printToHex( setupHeat->lane[_index]->rfid, _rfidreader.uid.uidByte, 7 );
  } else {
    Util::printToHex( setupHeat->lane[_index]->rfid, _rfidreader.uid.uidByte, _rfidreader.uid.size );
  }
  
  //for (byte i = 0; i < _rfidreader.uid.size; i++) {
  //  if(_rfidreader.uid.uidByte[i] < 0x10) Serial.print(F("0"));
  //  Serial.print(_rfidreader.uid.uidByte[i], HEX);
  //} 
  //Serial.println();

  _rfidreader.PICC_HaltA();

  return true;

}

// vim:ci:si:sw=2
