#include <Arduino.h>
#include <ArduinoJson.h>

#define ON HIGH
#define OFF LOW

// pin definitions
#define DP1 3
#define DP2 2
#define LASER 9
#define GATE 10
#define LDR A3
const byte bitaddr[4] = {4, 6, 7, 5};
const byte digit[4] = {8, A2, A1, A0};
const byte pow2[4] = {1, 2, 4, 8};

// analog value, when a car blocks the laser beam
const byte LDR_THRESHOLD = 30;
// how long the solenoid shall be opened
const int SOLENOID_HOLD = 500;
// timeout value in milliseconds for cars that do not finish
const double RACE_TIMEOUT = 15000;
// when race is off, the loop slows down
bool race_on = false;
bool setup_on = false;
// variables for timekeeping
long start, finish, elapsed;
// remember when the gate was released, to remove power from the solenoid to avoid burnout
bool gate_released = false;
// hold a certain number of measured values to avoid false triggers
const byte LDR_COUNT = 5;
byte ldr_samples[5];
byte ldr_index;
// global command identifier counter
int id = 0;
byte heat = 0;

// sets one digit of the display
void setDigit( byte d, int n ) {
  for ( byte i = 0; i <= 3; i++ ) {
    digitalWrite( bitaddr[i], ( n & pow2[i] ? HIGH : LOW ));
  }
  digitalWrite(digit[d], HIGH);
  digitalWrite(digit[d], LOW);
}

void displayNumber ( int number ) {
  if ( number > 9999 ) {
    // set decimalpoint #2
    digitalWrite(DP1, LOW);
    digitalWrite(DP2, HIGH);
    number /= 10;
  } else {
    // set decimalpoint #1
    digitalWrite(DP1, HIGH);
    digitalWrite(DP2, LOW);
  }
  for ( byte d = 4; d > 0; d-- ) {
    setDigit( d - 1, number % 10);
    number /= 10;
  }
}

// the setup function runs once when you press reset or power the board
void setup() {
  Serial.begin( 57600 );
  pinMode(DP1, OUTPUT);
  pinMode(DP2, OUTPUT);
  pinMode(LASER, OUTPUT);
  pinMode(GATE, OUTPUT);
  pinMode(LDR, OUTPUT);
  for ( byte i = 0; i <= 3; i++ ) {
    pinMode(bitaddr[i], OUTPUT);
    pinMode(digit[i], OUTPUT);
  }
  displayNumber ( 0 );
}

void send_error( const __FlashStringHelper* message ) {
  StaticJsonBuffer<254> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = id++;
  root["c"] = F("e");
  root["e"] = message;
  root.printTo( Serial );
  Serial.println();
}

void send_ack( const int id, const byte ack ) {
  StaticJsonBuffer<254> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = id;
  root["s"] = ack;
  root.printTo( Serial );
  Serial.println();
}

void send_message( const char* m ) {
  StaticJsonBuffer<254> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = id++;
  root["m"] = m;
  root.printTo( Serial );
  Serial.println();
}

void send_raceprogress(
  const int id,
  const int heat,
  const byte race,
  const int lanes[4]
) {
  StaticJsonBuffer<254> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["id"] = id;
  root["c"] = F("p");
  root["h"] = heat;
  JsonArray& l = root.createNestedArray( "l" );
  for ( byte i=0; i<=3; i++ ) {
    l.add(lanes[i]);
  }
  root.printTo( Serial );
  Serial.println();
}


void loop() {

  char p;

  if (Serial.available() > 0) {
    //Serial.println( F("Characters on Serial available") );
    p = Serial.peek();
    // read over whitespace
    if ( p == '\n' || p == ' ' || p == '\t' ) {
      Serial.read();
      return;
    }
    StaticJsonBuffer<254> jsonBuffer;
    JsonObject& root = jsonBuffer.parse(Serial);
    if (root.success()) {
      const char* cmd = root["c"];
      const char c = cmd[0];
      id = root["id"];
      //Serial.print( F("Command received: ") );
      //Serial.println( c );
      switch ( c ) {
        case 'g':
          // {"id":1,"h":13,"c":"g"}
          send_ack( id++, 0 );
          digitalWrite( GATE, HIGH );
          gate_released = true;
          start = millis();
          displayNumber( 0 );
          race_on = true;
          setup_on = false;
          digitalWrite( LASER, ON );
          heat = root["h"];
          // initialise the count down
          ldr_index = LDR_COUNT;
          break;
        case 's':
          // {"id":10,"c":"s"}
          send_ack( id, 0 );
          setup_on = !setup_on;
          digitalWrite( LASER, setup_on );
          break;
        default:
          // {"id":1,"c":"xxx"}
          send_error( F("Unknown command") );
          break;
      }
    } else {
      send_error( F("JSON parsing failed!") );
    }
  }

  if ( gate_released ) {
    // check, whether a minimum solenoid release time has expired
    if ( (millis() - start) > SOLENOID_HOLD ) {
      digitalWrite( GATE, LOW );
      gate_released = false;
    }
  }

  if ( setup_on ) {
    byte ldr = analogRead( LDR );
    char message[10];
    snprintf( message, 9, "LDR: %3d", ldr );
    send_message( message );
    delay( 500 );
  }

  if ( race_on ) {
    elapsed = millis() - start;
    displayNumber( elapsed );
    // get LDR value
    byte ldr = analogRead( LDR );
    if ( ldr < LDR_THRESHOLD ) {
      //Serial.println( "under threshold" );
      // remember the time in case we have reached a stable state
      if ( ldr_index == LDR_COUNT ) {
        finish = millis();
      }
      //Serial.print( "LDR Index: " );
      //Serial.println( ldr_index );
      if ( ldr_index-- == 0 ) {
        race_on = false;
        elapsed = finish - start;
        displayNumber( elapsed );
        digitalWrite( LASER, OFF );
        // write progress here
        int lanes[4];
        lanes[0] = elapsed;
        lanes[1] = RACE_TIMEOUT;
        lanes[2] = RACE_TIMEOUT;
        lanes[3] = RACE_TIMEOUT;
        send_raceprogress(id, heat, 0, lanes);
      }
    } else {
      if ( ldr_index > 0 ) {
        // we have not reached a consistent light block for 5 cycles, reset counter
        ldr_index = LDR_COUNT;
      }
    }
  }

  if ( ! race_on ) {
    delay( 1000 );
  }

}



// ##########################################

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
