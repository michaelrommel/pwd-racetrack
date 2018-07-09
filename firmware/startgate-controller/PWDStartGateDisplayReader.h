#ifndef _PWDSTARTGATEDISPLAYREADER_H
#define _PWDSTARTGATEDISPLAYREADER_H

#include "PWDSkinnyData.h"

#include <Arduino.h>

#include <Wire.h>
#include <SPI.h>

#include <U8g2lib.h>
#include <MFRC522.h>

#define PWDSTARTGATEDISPLAYREADER_VERSION "0.1.0"

class PWDStartGateDisplayReader {

  public:
    explicit PWDStartGateDisplayReader( uint8_t laneNumber, bool rotated, const uint8_t* allPins, uint8_t index );
    void begin( void );
    void blank( void );
    void display( char* name );
    void showDetails( const char* name, const char* details );
    bool checkRFID( PWDHeat* setupHeat );

  private:
    void tcaselect( void );
    void readerselect( void );
    uint8_t _portNumber;
    bool _rotated;
    const uint8_t* _allPins;
    uint8_t _index;
    // Adafruit_SSD1306 _oled; 
    // U8G2_SSD1305_128X32_NONAME_F_HW_I2C _oled;
    U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C _oled;
    //U8G2_SSD1306_128X32_UNIVISION_F_SW_I2C _oled;
    MFRC522 _rfidreader;

};

#endif
// vim:si:sw=2
