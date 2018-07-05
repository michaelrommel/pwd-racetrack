#include "PWDData.h"
#include <Arduino.h>

#define LED_PIN 13
#define FAST true
#define SLOW false

namespace Util
{

  void ShowMemory( Stream& SerialUSB, char * end, char * heapend );
	void blink( bool fast );
  uint8_t createRandomCarDetection( PWDHeat* heat, PWDHeat* setupHeat );

}
