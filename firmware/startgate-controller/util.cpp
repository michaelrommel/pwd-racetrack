#include "util.h"

#include <stdlib.h>
#include <stdio.h>

namespace Util
{

  constexpr char hexmap[] = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};

	// small indicator without messing up the serial comm
	void blink( bool fast )
	{
		for( int i=0; i<3; i++ ) {
			digitalWrite( LED_PIN, HIGH );
			delay( fast ? 250 : 750 );
			digitalWrite( LED_PIN, LOW );
			delay( fast ? 250 : 750 );
		}
	}

	void printToHex(char* result, uint8_t* data, int len)
	{
		for (int i=0; i<len; i++) {
			result[2 * i]     = hexmap[(data[i] & 0xF0) >> 4];
			result[2 * i + 1] = hexmap[data[i] & 0x0F];
		}
	}

}

// vim:ci:si:sw=2
