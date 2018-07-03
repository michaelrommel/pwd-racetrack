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

typedef struct {
  const char* rfid;
  const char* owner;
  uint32_t matno;
  uint32_t serno;
  uint32_t time;
} PWDLane;

typedef struct {
  uint8_t status;
  uint8_t heatno;
  PWDLane* lanes[4];
} PWDHeat;

#endif
// vim:si:sw=2
