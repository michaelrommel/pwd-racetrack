#include "PWDLane.h"

static const byte digit[11][7] = {
	{1, 1, 1, 1, 1, 1, 0}, //0
	{0, 1, 1, 0, 0, 0, 0}, //1
	{1, 1, 0, 1, 1, 0, 1}, //2
	{1, 1, 1, 1, 0, 0, 1}, //3
	{0, 1, 1, 0, 0, 1, 1}, //4
	{1, 0, 1, 1, 0, 1, 1}, //5
	{1, 0, 1, 1, 1, 1, 1}, //6
	{1, 1, 1, 0, 0, 0, 0}, //7
	{1, 1, 1, 1, 1, 1, 1}, //8
	{1, 1, 1, 1, 0, 1, 1}, //9
	{0, 0, 0, 0, 0, 0, 0}  //OFF
};

PWDLane::PWDLane( const uint8_t deviceAddress, const uint8_t clockpin, const uint8_t datapin, CRGB * leds ) : _pcf( deviceAddress ), _tm()
{
  _address = deviceAddress;
  _avgScanInterval = 0;
  _triggerActive = false;
  _triggered = false;
  _clockpin = clockpin;
  _datapin = datapin;
  _leds = leds;
}


void PWDLane::begin()
{
  _pcf.begin();
}


void PWDLane::select( bool on )
{
  Serial.print( F("Lane ") );
  Serial.print( _address );
  Serial.println( on ? F("selected") : F("unselected") );
  _pcf.write8( on ? 7 : 0 );
}

void PWDLane::showNumber( uint32_t number )
{
  _tm.DigitDisplayWrite( _clockpin, _datapin, number );
}


void PWDLane::setBigDigit( uint8_t rank )
{
  // we can use the _address variable here, it is not entirely correct,
  // because someone could set up the lanes starting not from zero...
  // we are modifying the global array of LEDs here!
  for( int i=0; i<7; i++ ) {
    _leds[i+_address*7] = ( digit[rank][i] ? CRGB( 20, 20, 20) : CRGB::Black );
  }
}


uint8_t PWDLane::getAddress()
{
  return _address;
}


bool PWDLane::hasTriggered()
{
  return _triggered;
}


// vim:si:sw=2
