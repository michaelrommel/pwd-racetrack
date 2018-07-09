#ifndef _PWDSKINNYDATA_H
#define _PWDSKINNYDATA_H

#include <stdint.h>

#define PWDSKINNYDATA_VERSION "0.0.1"

typedef struct {
  char* rfid;
  char* owner;
} PWDLane;

typedef struct {
  uint8_t state;
  uint8_t status;
  uint8_t heatno;
  PWDLane* lane[4];
} PWDHeat;

#endif
// vim:si:sw=2
