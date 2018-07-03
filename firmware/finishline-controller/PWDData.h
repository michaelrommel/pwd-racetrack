#ifndef _PWDDATA_H
#define _PWDDATA_H

#include <stdint.h>

#define PWDDATA_VERSION "0.0.1"

static constexpr uint8_t MSG_ACK = 'a';
static constexpr uint8_t MSG_INIT = 'i';
static constexpr uint8_t MSG_GO = 'g';
static constexpr uint8_t MSG_PROGRESS = 'p';
static constexpr uint8_t MSG_DETECT = 'd';
static constexpr uint8_t MSG_COMPLETE = 'c';
static constexpr uint8_t MSG_SETUP = 's';
static constexpr uint8_t MSG_LASER = 'l';

static constexpr uint8_t STAT_OK = 0;
static constexpr uint8_t STAT_SETUPCOMPLETE = 1;
static constexpr uint8_t STAT_HEATINPROGRESS = 2;
static constexpr uint8_t STAT_HEATFINISHED = 3;
static constexpr uint8_t STAT_HEATUNKNOWN = 4;
static constexpr uint8_t STAT_CORRECTLANE = 6;
static constexpr uint8_t STAT_WRONGLANE = 7;
static constexpr uint8_t STAT_TRACKSETUPSTART = 10;
static constexpr uint8_t STAT_TRACKSETUPREPORT = 11;
static constexpr uint8_t STAT_TRACKSETUPSTOP = 12;
static constexpr uint8_t STAT_MALFORMEDJSON = 101;

typedef struct {
  const char* rfid;
  const char* owner;
  uint32_t matno;
  uint32_t serno;
  uint32_t time;
  uint8_t laser;
} PWDLane;

typedef struct {
  uint8_t status;
  uint8_t heatno;
  PWDLane* lanes[4];
} PWDHeat;

#endif
// vim:si:sw=2
