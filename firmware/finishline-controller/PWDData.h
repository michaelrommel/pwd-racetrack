#ifndef _PWDDATA_H
#define _PWDDATA_H

#include <stdint.h>

#define PWDDATA_VERSION "0.1.0"

typedef struct {
  char* rfid;
  char* owner;
  uint32_t modelno;
  uint32_t serno;
  uint32_t time;
  uint8_t laser;
} PWDLane;

typedef struct {
  uint8_t state;
  uint8_t status;
  uint8_t heatno;
  PWDLane* lane[4];
} PWDHeat;

#endif
// vim:si:sw=2
