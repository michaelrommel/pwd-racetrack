#include <Arduino.h>

void setup() {
  Serial.begin(57600);
  while ( ! Serial );
  pinMode(LED_BUILTIN, OUTPUT);
         Serial.println("Racetrack starting.");
}

void loop() {
  // put your main code here, to run repeatedly:
  // turn the LED on (HIGH is the voltage level)
  digitalWrite(LED_BUILTIN, HIGH);

  // wait for a second
  delay(1000);

  // turn the LED off by making the voltage LOW
  digitalWrite(LED_BUILTIN, LOW);

   // wait for a second
  delay(1000);
}
