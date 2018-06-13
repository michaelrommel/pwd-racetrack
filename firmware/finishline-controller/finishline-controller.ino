#include "FastLED.h"
#include "PCF8574.h"
#include "TM1637.h"

PCF8574 PCF_L1(0);
TM1637 LED_small;
CRGB leds[7];
int c = 0;
int d = 0;
int elapsed;
int start;
bool LED_on;
int ldr;

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
  PCF_L1.begin();
  LED_on = false;
  start = millis();
  elapsed = 0;
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

  if( Serial.available() ) {
    switch( Serial.read() ) {
      case '1':
        Serial.println( "Got 1" );
        PCF_L1.write8(7);
        LED_on = true;
        break;
      case '0':
        Serial.println( "Got 0" );
        PCF_L1.write8(0);
        LED_on = false;
        break;
    }
  }

  //if( LED_on ) {
    //elapsed = (millis() - start);
    elapsed++;
    if(elapsed>9999) elapsed= elapsed % 10000;
    Serial.print( "elapsed: " );
    Serial.println( elapsed );
    LED_small.DigitDisplayWrite( 26, 24, elapsed );
  //}

  ldr = analogRead( A7 );
  Serial.print( "LDR: " );
  Serial.println( ldr );

  delay(200);              // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // set the LED off
  c++;
  Serial.print( "Counter: " );
  Serial.println( c );


  delay(20);              // wait for a second
}
