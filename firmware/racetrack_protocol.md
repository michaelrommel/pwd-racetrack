Pinewood Derby Racetrack Communication Protocol
===============================================

| Key     | Value      |
|---------|------------|
| Version | 0.5        |
| Date    | 2018-06-18 |

## Overview ##

- strings may be at most 254 bytes long
- strings can be sent with a terminating linefeed \n, it will be ignored
  while parsing the JSON
- strings are sent repeatedly every second until acknowledged without error
- strings are re-sent when acknowledged with error
- error messages are not acknowledged and not re-sent
- message ids are simple integer numbers and should be unique only from the
  perspective of the message creator
- Race track acknowledges commands as well
- RFIDs are normally between 4 bytes and 8 bytes long (Example UID: 04 57 57 A2 2D 4D 81 or UID: 7A 23 08 85)
- headlines indicate communication direction
  - C: Android / Raspberry / Operator PC as a Controller
  - R: Racetrack electronics
  - -> or <- denotes the direction of the communication

## JSON structure definition ##

### Global Message Structure ###

| Property   | Shortname | Type   | Required | Title                                                                         |
|------------|-----------|--------|----------|-------------------------------------------------------------------------------|
| identifier | id        | number | x        | Message identifier, sequentially increasing                                   |
| command    | c         | string | x        | Command identifier, single character, unique across all defined message types |
| heat       | h         | number | x        | Heat identifier, can be 0 if the message is not related to a running heat     |
| status     | s         | number |          | Status information, value depends on command                                  |
| lanes      | l         | array  |          | Array of objects related to information about all lanes                       |

### Table of Lane Object Properties ###

| Property   | Shortname | Type   | Required | Title                                                                         |
|------------|-----------|--------|----------|-------------------------------------------------------------------------------|
| time       | t         | number |          | Elapsed time of the car in this lane                                          |
| rfid       | rf        | string |          | RFID of the car in this lane                                                  |
| owner      | ow        | string |          | Full name of the car owner                                                    |
| model      | mn        | string |          | Model identifier of the car                                                   |
| serial     | sn        | number |          | Serial number of the car within the model line                                |
| laser      | ll        | number |          | Laser light level as detected by the LDR sensor, helps setting up the track   |

### Table of Status Codes ###

| Code       | Description                                        |
|------------|----------------------------------------------------|
| 0          | Status OK                                          |
| 1          | Heat setup completed                               |
| 2          | Heat in progress                                   |
| 3          | Heat finished                                      |
| 5          | Heat unknown                                       |
| 6          | Correct lane                                       |
| 7          | Wrong lane                                         |
| 10         | Track Setup Start                                  |
| 11         | Track Setup Report                                 |
| 12         | Track Setup Stop                                   |
| 1xx        | Error Codes                                        |
| 101        | Malformed JSON string                              |

### Table of Command Codes ###

| Code | Direction | Description                                        | Optional / Required Properties               |
|------|-----------|----------------------------------------------------|----------------------------------------------|
| a    | both      | Acknowledge a message                              | required: s                                  |
| i    | C -> R    | Initialize a heat                                  | required: l.rf, l.ow, l.mn, l.sn             |
| g    | C -> R    | Go! Start a heat                                   | -                                            |
| p    | R -> C    | Progress report of a heat                          | required: s, l.t; optional: l.rf, l.mn, l.sn |
| d    | R -> C    | Detected the RFID of a new car in one of the lanes | required: s, l.rf; optional: l.mn, l.sn      |
| c    | R -> C    | Completed the setup of a heat, all cars in place   | required: s; optional: l.id, l.mn, l.sn      |
| s    | C -> R    | Set up the racetrack to adjust the lasers          | required: s                                  |
| l    | R -> C    | Laser measurement report for setup                 | required: s, l.ll                            |

## Examples of messages ##

### Normal JSON message acknowledgments ###

A correctly received message shall be indicated to the other end.
The limited amount of Arduino memory can only store 2-3 unacknowledged
messages. A message that has not been acknowledged within 2 seconds shall
be retransmitted.


```
{
  "id" : 11,      // This is the id of the received message
  "c" : "a",
  "s" : 0         // OK
}
```


### Error JSON message acknowledgments ###

Transmission of the message with the mentioned `id` should initiated immediately,
the sending side shall not wait for a timeout.


```
{
  "id" : 11,      // This is the id of the received message
  "c" : "a",
  "s" : 101       // Maybe a character was dropped during transmission
}
```


### Start the setup the racetrack ###

```
{
  "id" : 11,
  "c" : "s",
  "s" : 10
}
```

### Stop the setup the racetrack ###

```
{
  "id" : 12,
  "c" : "s",
  "s" : 12
}
```

### Initialize a heat ###

```
{
  "id" : 13,
  "c" : "i",
  "h" : 7,
  "l" : [
    { "rf" : "045F57A22D4D81",
      "ow" : "Kara Thrace",
      "mn" : 1234567,
      "sn" : 42 },
    { "rf" : "03857FAD2D4D74",
      "ow" : "Lee Adama",
      "mn" : 1234567,
      "sn" : 35 },
    { "rf" : "156F78DA2D6582",
      "ow" : "Sharon Valerii",
      "mn" : 1234567,
      "sn" : 24 },
    { "rf" : "669EBCC390DA03",
      "ow" : "Karl Agathon",
      "mn" : 1234567,
      "sn" : 45 }
  ]
}
```

### Start a Heat ###

```
{
  "id" : 14,
  "c" : "g",
  "h" : 7
}
```

### Detection of a car (no heat was set up) ###

The startgate can sense an RFID and report it at any time. This is then sent
with the status code for `Heat unknown` and a heat number of `0`. The lanes
array contains emtpy objects for lanes where there was no car detected. 
Naturally, no name or other car information can be determined.


```
{
  "id" : 20,
  "c" : "d",
  "h" : 0,
  "s" : 5,
  "l" : [
    {}, 
    { "rf" : "156F78DA2D6582" },
    {},
    {}
  ]
}
```


### Detection of a car (heat was initialized, correct lane) ###

The startgate sensed a car in the correct lane.

```
{
  "id" : 21,
  "c" : "d",
  "h" : 21,
  "s" : 6,
  "l" : [
    {}, 
    {},
    { "rf" : "156F78DA2D6582",
      "ow" : "Sharon Valerii",
      "mn" : 1234567,
      "sn" : 24 },
    {}
  ]
}
```


### Detection of a car (heat was initialized, wrong lane) ###

The startgate sensed a car in the wrong lane.

```
{
  "id" : 22,
  "c" : "d",
  "h" : 21,
  "s" : 7,
  "l" : [
    {}, 
    {},
    {},
    { "rf" : "156F78DA2D6582",
      "ow" : "Sharon Valerii",
      "mn" : 1234567,
      "sn" : 24 }
  ]
}
```


### Detection of all cars of a heat in the correct lanes ###

The startgate marks this heat as correctly set up. An empty object in a lane
is not necessarily an error, this lane may be left empty for this heat.


```
{
  "id" : 23,
  "c" : "c",
  "h" : 24,
  "s" : 1,
  "l" : [
    { "rf" : "045F57A22D4D81",
      "ow" : "Kara Thrace",
      "mn" : 1234567,
      "sn" : 42 },
    { "rf" : "03857FAD2D4D74",
      "ow" : "Lee Adama",
      "mn" : 1234567,
      "sn" : 35 },
    {},
    { "rf" : "669EBCC390DA03",
      "ow" : "Karl Agathon",
      "mn" : 1234567,
      "sn" : 45 }
  ]
}
```


### Progress report of a heat (still running) ###

One or more cars have finished the heat, but not all. The heat is still
in progress.


```
{
  "id" : 30,
  "c"  : "p",
  "h"  : 24,
  "s"  : 2,
  "l"  : [
    { "t"  : 2345,
      "rf" : "045F57A22D4D81",
      "ow" : "Kara Thrace",
      "mn" : 1234567,
      "sn" : 42 },
    {},
    {},
    { "t"  : 3456,
      "rf" : "669EBCC390DA03",
      "ow" : "Karl Agathon",
      "mn" : 1234567,
      "sn" : 45 }
  ]
}
```


### Progress report of a finished heat ###

All cars have finished or the maximum time has been reached.
For all initialized cars, at least the `time` field has to be reported.
For cars that fail to reach the finish line, the timeout time is 
reported. 


```
{
  "id" : 32,
  "c" : "p",
  "h" : 24,
  "s" : 3,
  "l" : [
    { "t"  : 1234,
      "rf" : "045F57A22D4D81",
      "ow" : "Kara Thrace",
      "mn" : 1234567,
      "sn" : 42 },
    { "t"  : 7777,
      "rf" : "03857FAD2D4D74",
      "ow" : "Lee Adama",
      "mn" : 1234567,
      "sn" : 35 },
    {},
    { "t"  : 3456,
      "rf" : "669EBCC390DA03",
      "ow" : "Karl Agathon",
      "mn" : 1234567,
      "sn" : 45 }
  ]
}
```


### Laser setup measurements ###

During construction of the racetrack on race day, the lasers of the 
finishing line might need adjustment. So once the `setup` mode is
initialized, the track reports the analogRead value of the LDR pin
for each lane. This helps adjusting the optimal beam of light.

```
{
  "id" : 40,
  "c" : "l",
  "h" : 0,
  "s" : 11,
  "l" : [
    { "ll"  : 852 },
    { "ll"  : 749 },
    { "ll"  : 822 },
    { "ll"  : 878 }
  ]
}
```




