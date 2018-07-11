#ifndef _PWDLANE_H
#define _PWDLANE_H

#include "Arduino.h"

#include "FastLED.h"
#include "PCF8574.h"
#include "TM1637.h"

#define PWDLANE_VERSION "0.1.0"

class PWDLaneDisplay {

  public:
    explicit PWDLaneDisplay( const uint8_t deviceAddress, const uint8_t clockpin, const uint8_t datapin, CRGB *leds, CRGB color );
    void begin();
    void select( bool on );
    uint8_t getAddress();
    bool hasTriggered();
    void showNumber( uint32_t number );
    void setBigDigit( uint8_t rank );
    static constexpr uint8_t DIGIT_A    = 0x0a;
    static constexpr uint8_t DIGIT_b    = 0x0b;
    static constexpr uint8_t DIGIT_c    = 0x0c;
    static constexpr uint8_t DIGIT_d    = 0x0d;
    static constexpr uint8_t DIGIT_E    = 0x0e;
    static constexpr uint8_t DIGIT_F    = 0x0f;
    static constexpr uint8_t DIGIT_h    = 0x10;
    static constexpr uint8_t DIGIT_H    = 0x11;
    static constexpr uint8_t DIGIT_J    = 0x12;
    static constexpr uint8_t DIGIT_L    = 0x13;
    static constexpr uint8_t DIGIT_n    = 0x14;
    static constexpr uint8_t DIGIT_o    = 0x15;
    static constexpr uint8_t DIGIT_P    = 0x16;
    static constexpr uint8_t DIGIT_r    = 0x17;
    static constexpr uint8_t DIGIT_t    = 0x18;
    static constexpr uint8_t DIGIT_u    = 0x19;
    static constexpr uint8_t DIGIT_U    = 0x1a;
    static constexpr uint8_t DIGIT_Y    = 0x1b;
    static constexpr uint8_t DIGIT_DASH = 0x1c;
    static constexpr uint8_t DIGIT_PIPE = 0x1d;
    static constexpr uint8_t DIGIT_MENU = 0x1e;
    static constexpr uint8_t DIGIT_OFF  = 0x1f;

  private:
    uint8_t _address;
    uint8_t _clockpin;
    uint8_t _datapin;

    CRGB * _leds;
    PCF8574 _pcf;
    TM1637  _tm;
    CRGB _color;

    uint8_t _avgScanInterval;
    bool _triggerActive;
    bool _triggered;

};

#endif
// vim:si:sw=2
