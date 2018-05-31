Pinewood Derby Racetrack Communication Protocol
===============================================

| Key     | Value      |
|---------|------------|
| Version | 0.4        |
| Date    | 2018-05-29 |

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

### Global Message Structure ###

| Property   | Shortname | Type   | Required | Title                                                                         |
|------------|-----------|--------|----------|-------------------------------------------------------------------------------|
| identifier | id        | number | x        | Message identifier, sequentially increasing                                   |
| command    | c         | string | x        | Command identifier, single character, unique across all defined message types |
| heat       | h         | number | x        | Heat identifier, can be 0 if the message is not related to a running heat     |
| status     | s         | number |          | Status information, value depends on command                                  |
| lanes      | l         | array  |          | Array of objects related to information about all lanes                       |

### Table of possible Lane Object Properties ###

| Property   | Shortname | Type   | Required | Title                                                                         |
|------------|-----------|--------|----------|-------------------------------------------------------------------------------|
| time       | t         | number |          | Elapsed time of the car in this lane                                          |
| rfid       | id        | string |          | RFID of the car in this lane                                                  |
| model      | mn        | string |          | Model identifier of the car                                                   |
| serial     | sn        | number |          | Serial number of the car within the model line                                |
| laser      | ll        | number |          | Laser light level as detected by the LDR sensor, helps setting up the track   |

### Table of possible status codes ###

| Code       | Description                                        |
|------------|----------------------------------------------------|
| 0          | Status OK                                          |
| 1          | Heat initialized                                   |
| 2          | Heat setup completed                               |
| 3          | Heat in progress                                   |
| 4          | Heat finished                                      |
| 10         | Track Setup Start                                  |
| 11         | Track Setup Report                                 |
| 12         | Track Setup Stop                                   |
| 1xx        | Error Codes                                        |
| 101        | Malformed JSON string                              |

### Table of possible command codes ###

| Code | Direction | Description                                        | Optional / Required Properties               |
|------|-----------|----------------------------------------------------|----------------------------------------------|
| a    | both      | Acknowledge a message                              | required: s                                  |
| i    | C -> R    | Initialize a heat                                  | required: l.id, l.mn, l.sn                   |
| g    | C -> R    | Go! Start a heat                                   | -                                            |
| p    | R -> C    | Progress report of a heat                          | required: s, l.t; optional: l.id, l.mn, l.sn |
| d    | R -> C    | Detected the RFID of a new car in one of the lanes | required: s, l.id; optional: l.mn, l.sn      |
| c    | R -> C    | Completed the setup of a heat, all cars in place   | required: s; optional: l.id, l.mn, l.sn      |
| s    | C -> R    | Set up the racetrack to adjust the lasers          | required: s                                  |
| l    | R -> C    | Laser measurement report for setup                 | required: s, l.ll                            |



