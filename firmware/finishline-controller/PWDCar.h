#ifndef _PWDCAR_H
#define _PWDCAR_H

#include <stdint.h>

#define PWDCAR_VERSION "0.0.1"

typedef struct {
  const char* rfid;
  const char* owner;
  uint32_t matno;
  uint32_t serno;
} PWDCar;

#endif
// vim:si:sw=2
