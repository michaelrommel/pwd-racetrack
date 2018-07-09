#include "PWDSkinnyData.h"
#include <Arduino.h>

#define LED_PIN 13
#define FAST true
#define SLOW false

namespace Util
{

	void blink( bool fast );
	void printToHex(char* result, uint8_t* data, int len);

}
