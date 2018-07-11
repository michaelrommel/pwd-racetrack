#include "util.h"

#include <malloc.h>
#include <stdlib.h>
#include <stdio.h>

namespace Util
{

	// variables needed to display free memory
	char *ramstart=(char *)0x20070000;
	char *ramend=(char *)0x20088000;

	void ShowMemory( Stream& SerialUSB, char * end, char * heapend )
	{
		struct mallinfo mi=mallinfo();
		register char * stack_ptr asm("sp");

		SerialUSB.print("\n\nHeap RAM Used: ");
		SerialUSB.println(mi.uordblks);
		SerialUSB.print("Program RAM Used ");
		SerialUSB.println(end - ramstart);
		SerialUSB.print("Stack RAM Used ");
		SerialUSB.println(ramend - stack_ptr);
		SerialUSB.print("Estimated Free RAM: ");
		SerialUSB.println(stack_ptr - heapend + mi.fordblks);
	}

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

  // create a random car detection on uninitialized track
  // returns the lane number of the detected car
  uint8_t createRandomCarDetection( PWDHeat* setupHeat ) {
    // arbitratily select a lane
    uint8_t tl = random(0,4);
    const char* hex = "0123456789ABCDEF";
    for( int i=0; i<14; i++ ) {
      //take a random character and insert it into the rfid string
      setupHeat->lane[tl]->rfid[i] = hex[random(0,16)];
    }
    return tl;
  }

  // create a random car detection derived from set up heat
  // returns the lane number of the detected car
  uint8_t createRandomCarDetection( PWDHeat* heat, PWDHeat* setupHeat ) {
    uint8_t tl = random(0,4);
    uint8_t sl;
    uint8_t c = 4;
    uint8_t ret = 4;
    while( c > 0 ) {
      SerialUSB.print( "c is ");
      SerialUSB.println( c );
      // check if there is already a car in this lane.
      // if it is the right car, leave it alone
      // if it is wrong or empty choose a random car from the others
      if( strncmp( setupHeat->lane[tl]->rfid, heat->lane[tl]->rfid, 14 ) != 0 ) {
        SerialUSB.print( "Wrong car in lane ");
        SerialUSB.println( tl );
        if( random(1,11) < 6 ) {
          SerialUSB.println( "Choosing correct car");
          // with 60% certainty take the correct car
          strncpy( setupHeat->lane[tl]->rfid, heat->lane[tl]->rfid, 14 );
          strncpy( setupHeat->lane[tl]->owner, heat->lane[tl]->owner, 15 );
          setupHeat->lane[tl]->modelno = heat->lane[tl]->modelno;
          setupHeat->lane[tl]->serno = heat->lane[tl]->serno;
        } else {
          sl = random(0,4);
          SerialUSB.print( "Choosing random car ");
          SerialUSB.println( sl );
          strncpy( setupHeat->lane[tl]->rfid, heat->lane[sl]->rfid, 14 );
          strncpy( setupHeat->lane[tl]->owner, heat->lane[sl]->owner, 15 );
          setupHeat->lane[tl]->modelno = heat->lane[sl]->modelno;
          setupHeat->lane[tl]->serno = heat->lane[sl]->serno;
        }
        ret = tl;
      }
      c--;
      tl = (tl + 1) % 4;
    }
    return ret;
  }


  // create a random car progress message derived from set up heat
  // returns the lane number of the finishing car or 4 if the heat 
  // is finished
  uint8_t createRandomProgress( PWDHeat* heat, unsigned long finishtime ) {
    uint8_t tl = random(0,4);
    uint8_t c = 4;
    uint8_t ret = 4;

    // randomly select a lane to look at
    // find from there the next car, which has not finished by looking at
    // the time field of the heat
    while( c > 0 ) {
      SerialUSB.print( "c is ");
      SerialUSB.println( c );
      if( heat->lane[tl]->time == 0 && strlen( heat->lane[tl]->rfid ) > 0 ) {
        // this car has not finished
        SerialUSB.print( "Selected car in lane ");
        SerialUSB.println( tl );
        heat->lane[tl]->time = finishtime;
        // return the changed lane
        return tl;
      }
      // otherwise continue with the next lane, wrapping around
      c--;
      tl = (tl + 1) % 4;
    }
    return ret;
  }

}

// vim:ci:si:sw=2
