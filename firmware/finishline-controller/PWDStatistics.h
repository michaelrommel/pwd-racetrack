#ifndef _PWDSTATISTICS_H
#define _PWDSTATISTICS_H

#include "Arduino.h"

#define PWDSTATISTICS_VERSION "0.0.1"

class PWDStatistics {

  public:
    explicit PWDStatistics( Stream& serialUSB );
    void show( void );
    void reset( void );

  private:
    unsigned long _lastMillis;
    unsigned long _loopCounter;
    Stream& _serialUSB;

};

#endif
// vim:si:sw=2
