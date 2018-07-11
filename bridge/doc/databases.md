Pinewood Derby Bridge Database Structures
=========================================

| Key     | Value      |
|---------|------------|
| Version | 0.1        |
| Date    | 2018-07-10 |

## Overview ##

- ...

## DB structure definition ##

### Race Database ###

The database shall hold the basic information about a race. The whole race is
contained in one key, which is typically the year, followed by a string identifying
the race or demonstration etc. 

Properties of the race are:

| Property       | Type   | Description                                |
|----------------|--------|--------------------------------------------|
| lanes          | number | number of lanes of the race track          |
| heatsQuali     | number | number of heats in the qualification round |
| heatsFinals    | number | number of heats in the final round         |
| finalCarCount  | number | how many cars are in the final round       |
| cars           | array  | array of car objecfs in this race          |

Properties of the car arrays are:

| Property       | Type   | Description                                         |
|----------------|--------|-----------------------------------------------------|
| <startnumber>  | string | uuid or other key from the Car Database             |


#### Example ####

```
Key:
  "2018-Race"
Value:
  {
    "lanes": 4,
    "heatsQuali": 33,
    "heatsFinals": 14,
    "finalCarCount": 7,
    "cars" : [
      "1": "043E57A22D4D80",
      "2": "048756A22D4D80",
      "3": "048F56A22D4D80
    ]
  }
```

### Car Database ###

The database shall hold the basic information about each car. The key should be 
a UUID identifier or a RFID, whichever is more suitable.

Properties of the car are:

| Property       | Type   | Description                                                                   |
|----------------|--------|-------------------------------------------------------------------------------|
| rf             | string | RFID of the car in this lane                                                  |
| ow             | string | Short name of the car owner (max. 14 characters)                              |
| name           | string | Full name of the car owner                                                    |
| country        | string | Country name of the car owner                                                 |
| mn             | number | Model identifier of the car (max. 8 digits, <100.000.000)                     |
| sn             | number | Serial number of the car within the model line (max. 6 digits, <1.000.000)    |

#### Example ####

```
Key:
  "048756A22D4D80"
Value:
  {
    "rf": "048756A22D4D80",
    "ow": "Kara",
    "name": "Kara Thrace",
    "country": "Caprica",
    "mn": 201807181,
    "sn": 113
  }
```


### 'Race Config Database ###

The database shall hold the lane assignments for races with a predfined number of participants.
The number of cars equals the number of heats. Currently we store only configs for 4 lanes.
The key is the number of lanes followed by a minus sign and the number of cars/heats.

The value of a raceconfig is just an array of <NoOfHeats> arrays of 4 car numbers:

#### Example ####

```
Key:
  "4-33"
Value:
	[
		[  1,  3,	 6,	10],
		[  2,	 4,	 7,	11],
		[ 12,	14,	17,	21], 
		[ 13,	15,	18,	22],
		[ 23,	25,	28,	32],
		[ 24,	26,	29,	33],
		[ 25,	27,	30,	34],
		[ 36,	 2,	 5,	 9],
		[ 11,	13,	16,	20],
		[ 26,	28,	31,	35],
		[  3,	 5,	 8,	12],
		[ 14,	16,	19,	23],
		[ 15,	17,	20,	24],
		[ 27,	29,	32,	36],
		[ 35,	 1,	 4,	 8],
		[  5,	 7,	10,	14],
		[  4,	 6,	 9,	13],
		[ 16,	18,	21,	25],
		[ 17,	19,	22,	26],
		[ 28,	30,	33,	 1],
		[ 29,	31,	34,	 2],
		[  6,	 8,	11,	15],
		[ 18,	20,	23,	27],
		[ 30,	32,	35,	 3],
		[  7,	 9,	12,	16],
		[ 19,	21,	24,	28],
		[ 31,	33,	36,	 4],
		[  8,	10,	13,	17],
		[ 20,	22,	25,	29],
		[ 32,	34,	 1,	 5],
		[  9,	11,	14,	18],
		[ 10,	12,	15,	19],
		[ 21,	23,	26,	30],
		[ 22,	24,	27,	31],
		[ 33,	35,	 2,	 6],
		[ 34,	36,	 3,	 7]
	] 
  
```


### Heat Database ###

The database shall hold information about each heat. It gets preconfigured when a race
is set up with the cars. The key is the ID from the race combined with a minus sign, 
followed by the heatnumber in this race.
 
Properties of each heat are:

| Property       | Type   | Description                                    |
|----------------|--------|------------------------------------------------|
| heat           | number | number of the heat in the race                 |
| status         | string | status field indicating the state of this heat |
| results        | array  | an array of 4 lane results                     |

Possible values for the status field are:

| Value          | Description                                         |
|----------------|-----------------------------------------------------|
| finished       | this heat has completed, results are in             |
| running        | the cars in this heat are currently racing          |
| current        | this is the current heat, but race has not started  |
| next           | this is the next heat that has been prepared        |

Properties of a lane result object:

| Property       | Type   | Description                                                                   |
|----------------|--------|-------------------------------------------------------------------------------|
| rf             | string | RFID of the car in this lane                                                  |
| ow             | string | short name of the car owner (max. 14 characters)                              |
| mn             | number | model identifier of the car (max. 8 digits, <100.000.000)                     |
| sn             | number | serial number of the car within the model line (max. 6 digits, <1.000.000)    |
| t              | number | time in milliseconds the car needed for this run                              |
| points         | number | the score, that this car got for the place in this run                        |




#### Example ####

```
Key:
  "2018-Race-07"
Value:
  {
    "heat": 7,
    "status": "finished",
    "results" : [
      {"rf":"044E57A22D4D","ow":"Kara Thrace","mn":201807181,"sn":14,"t":5455,"points":1},
      {"rf":"045657A22D4D","ow":"Lee Adama","mn":201807181,"sn":28,"t":3440,"points":8},
      {"rf":"04E556A22D4D","ow":"Sharon Valerii","mn":201807181,"sn":9,"t":3729,"points":2},
      {"rf":"047756A22D4D","ow":"Karl Agathon","mn":201807181,"sn":22,"t":3671,"points":4}
    ]
  }
```


### Leaderboard Database ###

The database shall hold information about all the participants in the race.
The value is an array of all participants as Objects.  It is not sorted in any
way, but each participant has fields for the score and cumulated time during
the qualification round and the finals. The key is the ID from the race.
 
Properties of each race entry are car objects:

| Property       | Type   | Description                                    |
|----------------|--------|------------------------------------------------|
| <car rfid>     | Object | contains a car object                          |

Properties of a car object:

| Property       | Type   | Description                                                                                       |
|----------------|--------|---------------------------------------------------------------------------------------------------|
| rf             | string | RFID of the car in this lane                                                                      |
| ow             | string | short name of the car owner (max. 14 characters)                                                  |
| mn             | number | model identifier of the car (max. 8 digits, <100.000.000)                                         |
| sn             | number | serial number of the car within the model line (max. 6 digits, <1.000.000)                        |
| cumTmeQuali    | number | cumulated time in milliseconds of all heats this car has completed up to now during qualification |
| cumScoreQuali  | number | cumulated score of this car in the qualification                                                  |
| cumTimeFinals  | number | cumulated time in milliseconds of all heats this car has completed up to now during finals        |
| cumScoreFinals | number | cumulated score of this car in the finals                                                         |


#### Example ####

```
Key:
  "2018-Race"
Value:
  [
    "04A256A22D4D": {
      "rf":"04A256A22D4D",
      "ow":"Louanne Katraine",
      "mn":"201807181",
      "sn":"1200",
      "cumTimeQuali":0,
      "cumScoreQuali":0,
      "cumTimeFinals":0,
      "cumScoreFinals":0},
    "047756A22D4D": {
      "rf":"047756A22D4D",
      "ow":"Margaret Edmondson",
      "mn":"201807181",
      "sn":"1209",
      "cumTimeQuali":3671,
      "cumScoreQuali":8,
      "cumTimeFinals":0,
      "cumScoreFinals":0},
    "045B56A22D4D": {
      "rf":"045B56A22D4D",
      ... }
  ]      
  
```



### Highscore Database ###

The database shall hold information about the 20 track records, the fastest
times that these cars have achieved. A car can be in the higscore table multiple
times. The value is an array of rank objects. The The key is the ID from the race.
 
Properties of each race entry are car objects:

| Property       | Type   | Description                                    |
|----------------|--------|------------------------------------------------|
| <rank no>      | Object | contains a rank object                         |

Properties of a rank object:

| Property       | Type   | Description                                                                                       |
|----------------|--------|---------------------------------------------------------------------------------------------------|
| rf             | string | RFID of the car in this lane                                                                      |
| ow             | string | short name of the car owner (max. 14 characters)                                                  |
| mn             | number | model identifier of the car (max. 8 digits, <100.000.000)                                         |
| sn             | number | serial number of the car within the model line (max. 6 digits, <1.000.000)                        |
| t              | number | time in milliseconds this car has had in the heat, that made it into the highscore                |
| score          | number | the score that the car got in this heat                                                           |
| heat           | string | the identifier of the heat, where the car achieved the highscore                                  |
| rank           | number | the rank of this entry (not needed, if this is already the property of this entry)                |


#### Example ####

```
Key:
  "2018-Race"
Value:
  [
    "1": {
      "rf":"04A256A22D4D",
      "ow":"Louanne Katraine",
      "mn":"201807181",
      "sn":"1200",
      "t": 3671,
      "score":8,
      "heat":"2018-Race-00",
      "rank":1},
    "2": {
      "rf":"047756A22D4D",
      "ow":"Margaret Edmondson",
      "mn":"201807181",
      "sn":"1209",
      "t":3690,
      "score":8,
      "heat":"2018-Race-05",
      "rank":2},
    "3": {
      "rf":"045B56A22D4D",
      ... }
  ]      

```



