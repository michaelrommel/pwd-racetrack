#ifndef _PWDLANE_H
#define _PWDLANE_H

#include "Arduino.h"

#include "FastLED.h"
#include "PCF8574.h"
#include "TM1637.h"

#define PWDLANE_VERSION "0.0.1"

class PWDLane {

  public:
    explicit PWDLane( const uint8_t deviceAddress, const uint8_t clockpin, const uint8_t datapin, CRGB *leds );
    void begin();
    void select( bool on );
    uint8_t getAddress();
    bool hasTriggered();
    void showNumber( uint32_t number );
    void setBigDigit( uint8_t rank );
    static constexpr uint8_t DIGIT_OFF = 0xA;

  private:
    uint8_t _address;
    uint8_t _clockpin;
    uint8_t _datapin;

    CRGB * _leds;
    PCF8574 _pcf;
    TM1637  _tm;

    uint8_t _avgScanInterval;
    bool _triggerActive;
    bool _triggered;

};

#endif
// vim:si:sw=2
