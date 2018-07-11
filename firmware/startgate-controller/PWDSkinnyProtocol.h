#ifndef _PWDPROTOCOL_H
#define _PWDPROTOCOL_H

#include "PWDSkinnyData.h"
#include <Arduino.h>

#define PWDPROTOCOL_VERSION "0.1.0"

class PWDProtocol {

  public:
    explicit PWDProtocol( HardwareSerial& serial, uint32_t baudRate );
    void begin( uint8_t whitelist[4][8]);
    int freeRam();
    bool available();
    void sendAck( const uint16_t id, const uint8_t status );
    void sendCarDetection( const uint8_t laneNumber, const char* rfid );
    void sendCarDetection( const uint8_t heatno, const uint8_t laneNumber, const PWDLane* lane, const bool wrongLane );
    void sendCompleteOrProgress( const uint8_t messageType, const PWDHeat* heat );
    void sendLaserLevel( const PWDHeat* heat );
    bool receiveSkinnyCommand( PWDHeat* heat );

    // constants to be used also from outside
    // definition of message types
    static const uint8_t CODE_ACK = 'a';
    static const uint8_t CODE_INIT = 'i';
    static const uint8_t CODE_GO = 'g';
    static const uint8_t CODE_PROGRESS = 'p';
    static const uint8_t CODE_DETECT = 'd';
    static const uint8_t CODE_COMPLETE = 'c';
    static const uint8_t CODE_SETUP = 's';
    static const uint8_t CODE_LASER = 'l';
    // definition of status codes
    static const uint8_t STATUS_OK = 0;
    static const uint8_t STATUS_SETUPCOMPLETE = 1;
    static const uint8_t STATUS_HEATINPROGRESS = 2;
    static const uint8_t STATUS_HEATFINISHED = 3;
    static const uint8_t STATUS_HEATUNKNOWN = 5;
    static const uint8_t STATUS_CORRECTLANE = 6;
    static const uint8_t STATUS_WRONGLANE = 7;
    static const uint8_t STATUS_GATEOPENED = 8;
    static const uint8_t STATUS_TRACKSETUPSTART = 10;
    static const uint8_t STATUS_TRACKSETUPREPORT = 11;
    static const uint8_t STATUS_TRACKSETUPSTOP = 12;
    static const uint8_t STATUS_CORRUPTEDJSON = 101;
    static const uint8_t STATUS_INVALIDSTATETRANSITION = 102;
    static const uint8_t STATUS_INVALIDCOMMAND = 103;
    static const uint8_t STATUS_UNSUPPORTEDCOMMAND = 104;
    // definitions of states of the program
    // this state codes must be consecutive, starting at 0
    // because they are used as array indices
    static const uint8_t STATE_IDLE = 0;
    static const uint8_t STATE_HEATSETUP = 1;
    static const uint8_t STATE_RACING = 2;
    static const uint8_t STATE_TRACKSETUP = 3;

  private:
    bool checkWhitelist( uint8_t state, uint8_t code );

    HardwareSerial& _hwser;
    // the message identifier counter for this comm
    uint16_t _id;
    // whitelist of command codes accepted from this comm partner in which state
    uint8_t _codeWhitelist[4][8];
    // remember the state before track setup, so we can return to it
    uint8_t _stateBeforeSetup = STATE_IDLE;
    // baudRate
    uint32_t _baudRate;
    
};

#endif
// vim:si:sw=2
