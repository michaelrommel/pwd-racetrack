#ifndef _PWDPROTOCOL_H
#define _PWDPROTOCOL_H

#include "PWDData.h"
#include <Arduino.h>

#define PWDPROTOCOL_VERSION "0.0.1"

class PWDProtocol {

  public:
    explicit PWDProtocol( HardwareSerial& serial );
    void begin();
    void sendAck( const int id, const byte status );
    void sendCarDetection( const byte laneNumber, const char* rfid );
    void sendCarDetection( const byte laneNumber, const PWDLane* lane, bool wrongLane );
    void sendCompleteOrProgress( const uint8_t messageType, const PWDHeat* heat );

  private:
    HardwareSerial& _hwser;
    uint16_t _id;

};

#endif
// vim:si:sw=2
