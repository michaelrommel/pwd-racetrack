#include "PWDLane.h"
#include <wire.h>

PWDLane::PWDLane( const uint8_t deviceAddress)
{
  _address = deviceAddress;
  _avgScanInterval = 0;
  _triggerActive = false;
  _triggered = false;
}

void PWDLane::begin( )
{
}

// vim:si:sw=2
