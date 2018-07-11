#include "PWDStatistics.h"
#include <Arduino.h>

static const uint16_t reportInterval = 8000;

PWDStatistics::PWDStatistics( Stream& serialUSB ) :
  _serialUSB( serialUSB )
{
  _lastMillis = millis();
  _loopCounter = 1;
}

void PWDStatistics::show( void )
{
  // every now and then print statistics
  if( (millis() - _lastMillis) > reportInterval ) {
    // get counter diff divided by elapsed millis
    unsigned long millisPerLoop = ( millis() - _lastMillis ) / _loopCounter ;
    _serialUSB.print( "Number of loop iterations: " );
    _serialUSB.println( _loopCounter );
    _serialUSB.print( "Milliseconds per loop iteration: " );
    _serialUSB.println( millisPerLoop );
    _lastMillis = millis();
    _loopCounter = 1;
  }
  _loopCounter++;
}

void PWDStatistics::reset( void )
{
  _lastMillis = millis();
  _loopCounter = 1;
}

// vim:ci:si:sw=2
