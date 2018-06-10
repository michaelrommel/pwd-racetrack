#include "FastLED.h"

CRGB leds[7];
int c = 0;
int d = 0;

const byte digit[10][7] = {
	{1, 1, 1, 1, 1, 1, 0}, //0
	{0, 1, 1, 0, 0, 0, 0}, //1
	{1, 1, 0, 1, 1, 0, 1}, //2
	{1, 1, 1, 1, 0, 0, 1}, //3
	{0, 1, 1, 0, 0, 1, 1}, //4
	{1, 0, 1, 1, 0, 1, 1}, //5
	{1, 0, 1, 1, 1, 1, 1}, //6
	{1, 1, 1, 0, 0, 0, 0}, //7
	{1, 1, 1, 1, 1, 1, 1}, //8
	{1, 1, 1, 1, 0, 1, 1}  //9
};


void setup() {
  // initialize the digital pin as an output.
  // Pin 13 has an LED connected on most Arduino boards:
  Serial.begin( 57600 );
  //while ( ! Serial );
  Serial.println( "Racetrack starting." );
  pinMode(LED_BUILTIN, OUTPUT);
  FastLED.addLeds<NEOPIXEL, 28>(leds, 7);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH); // set the LED on
  d = c % 10; 
  Serial.print( "Digit: " );
  Serial.println( d );
  for( int i=0; i<8; i++ ) {
    leds[i] = ( digit[d][i] ? CRGB( 20, 20, 20) : CRGB::Black );
  }
  FastLED.show();
  delay(1000);              // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // set the LED off
  c++;
  Serial.print( "Counter: " );
  Serial.println( c );
  delay(1000);              // wait for a second
}
