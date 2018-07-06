/* jslint node: true */
'use strict';

const logger = require('../utils/logger')
const level = require('level')
const SerialPort = require('serialport')

const RACE_ID = '2018-Race'

const MSG_ACK = 'a'
const MSG_INIT_HEAT = 'i'
const MSG_START_HEAT = 'g'
const MSG_PROG_HEAT = 'p'
const MSG_DET_CAR = 'd'
const MSG_CPL_HEAT = 'c'
const MSG_SET_TRACK = 's'
const MSG_REP_LASER = 'l'

const ST_OK = 0
const ST_HEAT_SETUP = 1
const ST_HEAT_UNKWN = 5
const ST_COR_LANE = 6
const ST_WRO_LANE = 7
const ST_TR_SET_START = 10
const ST_TR_SET_STOP = 12
const ST_ERROR = 101

const MSG_STATE_PENDING = 0
const MSG_STATE_ACK = 1

const MSG_QUEUE_STOPPED = false
const MSG_QUEUE_RUNNING = true
const TIMER_DELAY = 2000

var inputMsgBuffer = ""

var msgIdCounter = 0
var msgQueueStatus = MSG_QUEUE_STOPPED
var msgQueueTimer = null
var msgQueueOpen = []
var msgQueueComplete = []


var laneDb = level('../db/lanedb', ({valueEncoding: 'json'}))

var port = new SerialPort('COM6',
  { 'baudRate': 57600,
    'dataBits': 8,
    'parity': 'none',
    'stopBits': 1
  },
  function (err) {
    if (err) {
      logger.info('Error opening: %s', err.message)
    }
  }
)

// function for sending message objects over the line
// -----------------
// params
//
var sendMsg = function (msg, msgId) {
  msgId = msgId || -1

  if (msgId === -1) { // new message that is not yet in queue
    logger.debug('Received new message to send on line')

    msgId = ++msgIdCounter // generating new unique msg id

    logger.debug('Constructing message object')
    var msgQueueItem = {}
    msgQueueItem.id = msgId
    msgQueueItem.msg = msg
    msgQueueItem.msg.id = msgId
    msgQueueItem.state = MSG_STATE_PENDING

    if (msg.c !== MSG_ACK) { 
      logger.debug('Pushing message object to message queue')
      msgQueueOpen.push(msgQueueItem)
      
      if (msgQueueStatus === MSG_QUEUE_STOPPED) { // timer not running, start it
        logger.debug('Message queue timer not running')
        msgQueueTimer = setInterval(checkMsgQueue, TIMER_DELAY)
        msgQueueStatus = MSG_QUEUE_RUNNING
        logger.debug('Message queue timer started')
      }
    }

   
  }

  port.write(JSON.stringify(msg), function(err) {
    if (err) {
      return logger.error('Error on writing on line: ', err.message);
    }
    logger.info('Message written successfully on line');
});

}

// function for checking message queue periodically and triggering resend
// -----------------
// params
//
var checkMsgQueue = function () {
  logger.debug('Checking open message queue for unacknowledged messages')
  for (var i = 0; i < msgQueueOpen.length; i++) { // looping through open msg queue
    if (msgQueueOpen[i].state === MSG_STATE_PENDING) { // msg still unacknowledged, resend
      logger.debug('Message still unacknowledged, resending it: %s', JSON.stringify(msgQueueOpen[i]))
      sendMsg(msgQueueOpen[i].msg, msgQueueOpen[i].id)
    } else { // msg already acknowledged, pop from open msg queue
      logger.debug('Message already acknowledged, pushing it to complete queue')
      msgQueueComplete.push(msgQueueOpen[i])
      msgQueueOpen.splice(i, 1)
      logger.debug('Message removed from open queue')
    }
  }

  if (msgQueueOpen === 0) { // msg queue is empty, we can stop timer
    logger.debug('Message queue empty, stopping timer')
    clearInterval(msgQueueTimer)
    msgQueueTimer = null
    msgQueueStatus = MSG_QUEUE_STOPPED
    logger.debug('Message queue timer stopped')
  }
}

// function for sorting lanes by time
// -----------------
// params
//
var sortByTime = function (a, b) {
  if (a.t < b.t) {
    return -1
  } else if (a.t > b.t) {
    return 1
  }

  return 0
}

// function for updating the race leaderboard
// -----------------
// params
//
var updateLeaderboard = function (heatId, lanes) {
  let leaderboardDb = level('../db/leaderboard', ({valueEncoding: 'json'}))

  logger.debug('Sorting current heat by time')
  let lanesSorted = lanes.sort(sortByTime)

  logger.debug('Calculating points for current heat')
  for (var i = 0; i < lanesSorted.length; i++) {
    lanesSorted[i].points = Math.pow(2, i)
    logger.debug('Racer: %s, Points: %i', lanesSorted[i].name, lanesSorted[i].points)
  }

  leaderboardDb.get(RACE_ID, function (err, value) {
    if (err) {
      // error handling
      logger.error('Could not retrieve leaderboard information from database')
      throw err
    }

    let leadership = value

    for (var i = 0; i < lanes.length; i++) {
      let laneRfid = lanes[i].rf
      
      if (laneRfid === undefined) {
          continue
      }
      
      if (heatId <= 40) {
        logger.debug('Still in qualifying, writing information to qualifying data')
        leadership[laneRfid].score_quali += lanes[i].points
        leadership[laneRfid].time_quali += lanes[i].t
      } else {
	logger.debug('Already in finals, writing information to finals data')
        leadership[laneRfid].score_finals += lanes[i].points
        leadership[laneRfid].time_finals += lanes[i].t
      }
    }
    
    if (logger.level === 'debug') {
        for (var i = 0; i < leadership.length; i++) {
            logger.debug(JSON.stringify(leadership[i]))
        }
    }

    logger.debug('Saving leaderboard information to database')
    leaderboardDb.put(RACE_ID, leadership)
    logger.debug('Successfully saved leaderboard information to database')
    logger.debug('Closing database')
    leaderboardDb.close(function (err) {
        if (err) {
            logger.error('Could not close database: %s', err.message)
        }
    })
  })
}

// function for updating the race highscore
// -----------------
// params
//
var updateHighscore = function (heatId, lanes) {
  let highscoreDb = level('../db/highscore', ({valueEncoding: 'json'}))

  logger.debug('Getting current highscore from database')
  highscoreDb.get(RACE_ID, function (err, value) {
    if (err) {
      // error handling
      logger.error('Could not retrieve highscore information from database')
      throw err
    }

    let highscore = value

    logger.debug('Iterating through current highscore to see if there is a new one')
    for (var i = 0; i < lanes.length; i++) {
      for (var k = 0; k < highscore.length; k++) {
        if (lanes[i].t < highscore[k].t) {
          logger.info('Found new highscore: Heat - %i, Racer - %s, Time - %ims, Rank - %i', heatId, lanes[i].name, k + 1, lanes[i].t)
          lanes[i].heat = heatId
          lanes[i].rank = k + 1
          highscore.splice(k, 0, lanes[i])
          highscore.splice(-1)
          break
        }
      }
    }

    logger.debug('Reapplying ranking to highscore')
    highscore = highscore.sort(sortByTime)
    for (var i = 0; i < highscore.length; i++) {

	    highscore[i].rank = i + 1
        
        logger.debug(JSON.stringify(highscore[i]))
    }

    logger.debug('Saving highscore information to database')
    highscoreDb.put(RACE_ID, highscore)
    logger.debug('Successfully saved highscore information to database')
    logger.debug('Closing database')
    highscoreDb.close(function (err) {
        if (err) {
            logger.error('Could not close database: %s', err.message)
        }
    })
  })
}

// function for acknowledging messages from race track
// -----------------
// params
//
var ack = function (id, state) {
  logger.debug('Building acknowledge message')
  let msg = {}
  msg.id = id
  msg.c = MSG_ACK
  if (state === true) {
    logger.debug('Message status is okay')
    msg.s = ST_OK
  } else if (state === false) {
    logger.debug('Message status is error')
    msg.s = ST_ERROR
  }

  logger.debug('Sending acknowledge message over the line')
  sendMsg(msg)
}

// Start the setup of the racetrack
var setupRT = function () {
  logger.debug('Building setup race track message')
  let msg = {}
  msg.c = MSG_SET_TRACK
  msg.s = ST_TR_SET_START

  logger.debug('Sending setup race track message over the line')
  sendMsg(msg)
}

// Start the setup of the racetrack
var stopSetupRT = function () {
  logger.debug('Building stop setup race track message')
  let msg = {}
  msg.c = MSG_SET_TRACK
  msg.s = ST_TR_SET_STOP

  logger.debug('Sending stop setup race track message over the line')
  sendMsg(msg)
}

// function for initializing a heat
// ----------------
// params
//
var initHeat = function (heatId) {
  logger.debug('Building init heat message')
  let msg = {}
  msg.c = MSG_INIT_HEAT
  msg.h = heatId
  msg.l = []

  let heatdb = level('../db/heatdb', ({valueEncoding: 'json'}))

  logger.debug('Retrieving heat information from the database')
  let heatKey = RACE_KEY + '-' + ('0' + heatId).splice(-2)
  heatdb.get(heatKey, function (err, value) {
    if (err) {
      logger.error('Unable to retrieve heat information from database')
      throw err
    }

    let heatConfig = value
    msg.l = heatConfig.result

    logger.debug('Sending init heat message over the line')
    sendMsg(msg)

    initLaneStatus(heatId)
    
    logger.debug('Closing database')
    heatdb.close(function (err) {
        if (err) {
            logger.error('Could not close database: %s', err.message)
        }
    })
  })
}


// function for initializing lane status information in database
// ----------------
// params
//
var initLaneStatus = function(heatId) {

  logger.debug('Building initial lane status data')
  let dto = {}
  dto.status = 'nok'
  dto.heat = heatId
  dto.lanes = []
  for (var i = 0; i < 4; i++) {
      dto.lanes[i] = {}
  }
  dto.lanes[0].status = "nok"
  dto.lanes[1].status = "nok"
  dto.lanes[2].status = "nok"
  dto.lanes[3].status = "nok"

  
  logger.debug('Saving lane status information to database')
  saveLaneStatus(dto)
  logger.debug('Successfully saved lane status information to database')
}

// function for starting a heat
// ----------------
// params
//
var startHeat = function (heatId) {
  logger.debug('Building start heat message')
  let msg = {}
  msg.c = MSG_START_HEAT
  msg.h = heatId

  logger.debug('Sending start heat message over the line')
  sendMsg(msg)
}

// function for updating heat progress information
// ----------------
// params
//
var updateHeat = function (heatId, heatStatus, lanes) {
  logger.info('Processing update heat message')
  let dto = {}
  dto.heat = heatId
  dto.result = lanes

  if (heatStatus === 2) { // we have received the progess for an ongoing heat
    // simply update heat status
    logger.info('Received progress of unfinished heat')
    dto.status = 'running'
  } else if (heatStatus === 3) { // we have received the progess for a finished heat
    logger.info('Received progress of finished heat')
    dto.status = 'finished'
    logger.debug('Update leaderboard with new data')
    updateLeaderboard(heatId, lanes)
    logger.debug('Update highscore with new data')
    updateHighscore(heatId, lanes)
  }

  let heatdb = level('../db/heatdb', ({valueEncoding: 'json'}))

  logger.debug('Saving updated heat information to database')
  let heatKey = RACE_ID + "-" + ("0" + heatId).slice(-2)
  heatdb.put(heatKey, dto)
  logger.debug('Successfully saved updated heat information to database')
  logger.debug('Closing database')
  heatdb.close(function (err) {
    if (err) {
      logger.error('Could not close database: %s', err.message)
    }
  })
}

// function for car detection
// ---------------
// params
//
var carDetected = function (heatId, msgState, lanes) {
  logger.info('Processing car detected message')
  let dto = {}
  dto.status = 'nok'
  dto.heat = heatId
  dto.lanes = []


  let lanesKey = RACE_ID
  logger.debug('Retrieving lane status information from database')
  laneDb.get(lanesKey, function (err, value) {
    let lanesDb = value

    if (err) {
       logger.error('Could not retrieve lane status information from database')
       throw err
    }
    
    logger.debug('Processing data')
    for (var i = 0; i < lanes.length; i++) {
      let lane = lanes[i]
      lane.lane = i

      if (lane.rf) {
        if (msgState === ST_HEAT_UNKWN) {
          logger.info('Unknown heat in lane %i', i)
          lane.state = 'nok'
        } else if (msgState === ST_COR_LANE) {
          logger.info('Car %s set in correct lane', lane.rf)
          lane.state = 'ok'
        } else if (msgState === ST_WRO_LANE) {
          logger.info('Car %s set in wrong lane', lane.rf)
          lane.state = 'nok'
        }
        dto.lanes[i] = lane
      } else {
        logger.debug('Data from race track does not contain any information for lane %i', i)
	logger.debug('Using previous data from database')
        dto.lanes[i] = lanesDb[i]
      }
    }

    logger.debug('Saving lane status information to database')
    saveLaneStatus(dto)
    logger.debug('Successfully saved lane status information to database')
    
  })
}

// function for detection of heat setup complete
// -----------
// params
//
var heatSetupComplete = function (heatId, lanes) {
  logger.info('Processing heat setup complete message')
  let dto = {}
  dto.status = 'ok'
  dto.heat = heatId
  dto.lanes = []

  for (var i = 0; i < lanes.length; i++) {
    let lane = lanes[i]
    lane.lane = i
    lane.state = 'ok'
    dto.lanes[i] = lane
  }

  logger.debug('Saving heat setup complete data to database')
  saveLaneStatus(dto)
  logger.debug('Successfully saved heat setup complete data to database')
}

// function for pushin lane status to database
// -----------
// params
//
var saveLaneStatus = function (laneDto) {

  var laneKey = RACE_ID
  logger.debug('Pushing lane status to database')
  laneDb.put(laneKey, laneDto)
}

// function for laser setup measurement
// -----------
// params
//
var laserSetup = function (laserData) {
  // message laser setup measurements do db or somewhere else ??
  logger.debug('Processing laser setup message')
  logger.error('Routine currently not implemented')

}

// event listener for incomming data from race track
port.on('readable', function () {
  let newdata = port.read().toString('utf8')
  logger.info('got serial data: %s', newdata)
  
  let data = ""
  if (newdata.indexOf('\n') === -1) {
      logger.info('Got only partial message, buffering')
      inputMsgBuffer += newdata
      return
  } else {
    data = inputMsgBuffer + newdata
    let tmp = data.split('\n')
    data = tmp[0]
    inputMsgBuffer = tmp[1]
  }
  
  logger.debug('Constructed JSON string: %s', data)
  try {
    logger.debug('Parsing data to JSON object')
    data = JSON.parse(data)
  } catch (err) {
    logger.error('Error parsing input data to JSON obj: %s', err.message)
    // error acknowledgement
    ack(0, false)
  }

  let messageId = data.id
  logger.debug('JSON data (message ID): %i', messageId)

  let messageCc = data.c
  if (messageCc !== MSG_ACK) {
    // message received completely, acknowledge
    logger.info('Message received completely, sending acknowledge')
    ack(messageId, true)
  }


  if (messageCc === MSG_ACK) { // we have received a message acknowledge
	  logger.info('Received an acknowledge message')
          logger.debug('Iterating through open message queue to find corresponding message')
          for (var i = 0; i < msgQueueOpen.length; i++) {
                  if (msgQueueOpen[i].id === messageId) {
			  logger.info('Message found in queue')
                          if (data.s === ST_OK) {
				  logger.info('Setting message state to acknowledged')
                                  msgQueueOpen[i].state = MSG_STATE_ACK
                          } else if (data.s === ST_ERROR) {
				  logger.info('Received error acknowledge, resend corresponding message')
                                  sendMsg(msgQueueOpen[i].msg, messageId)
                          }
                  }
                  break
          }
  } else if (messageCc === MSG_PROG_HEAT) { // we have received a progess update
	  logger.info('Received a progress update message for a heat')
          let messageHeat = data.h
          let messageState = data.s
          let messageLanes = data.l

          updateHeat(messageHeat, messageState, messageLanes)
  } else if (messageCc === MSG_DET_CAR) {
	  logger.info('Received a car detected message')
          let messageHeat = data.h
          let messateState = data.s
          let messageLanes = data.l

          carDetected(messageHeat, messateState, messageLanes)
  } else if (messageCc === MSG_CPL_HEAT) {
	  logger.info('Received a heat setup complete message')
          if (data.s === ST_HEAT_SETUP) { // everything is okay
                  let messageHeat = data.h
                  let messageLines = data.l

                  heatSetupComplete(messageHeat, messageLines)
          }
  } else if (messageCc === MSG_REP_LASER) {
	  logger.info('Received a laser setup message')
          if (data.s === 11) {
            laserSetup(data.l)
          }
  }
})

initLaneStatus()

module.exports = {
	setupRt: setupRT,
	stopSetupRt: stopSetupRT,
	initHeat: initHeat,
	startHeat: startHeat
}

// for testing only

var testTimer = setTimeout(function () {
    logger.debug('Entering test routine, sending test message for heat setup')
    sendMsg({"c":"i","h":7,"l":[{"rf":"045F57A22D4D81","ow":"Kara Thrace","mn":1234567,"sn":42 },{"rf":"03857FAD2D4D74","ow":"Lee Adama","mn":1234567,"sn":35 },{"rf":"156F78DA2D6582","ow":"Sharon Valerii","mn":1234567,"sn":24 },{"rf":"669EBCC390DA03","ow":"Karl Agathon","mn":1234567,"sn":45}]})
    
    let timer = setTimeout( function() {
      
      logger.debug('Sending test message for start heat')
      sendMsg({"c":"g","h":18})  
    }, 20000)

}, 20000)



var carArray = [
  { 'rf': '04 A2 56 A2 2D 4D', 'ow': 'Bernd Ebert', 'mn': '1234567', 'sn': '1200' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 77 56 A2 2D 4D', 'ow': 'Yvan Muelli', 'mn': '1234567', 'sn': '1209' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 5B 56 A2 2D 4D', 'ow': 'Nick Cooke', 'mn': '1234567', 'sn': '1210' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 56 57 A2 2D 4D', 'ow': 'Hartmut Janke', 'mn': '1234567', 'sn': '1211' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 4E 57 A2 2D 4D', 'ow': 'Boris Bijelic', 'mn': '1234567', 'sn': '1212' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 67 56 A2 2D 4D', 'ow': 'Geert Roose', 'mn': '1234567', 'sn': '1213' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 3B 56 A2 2D 4D', 'ow': 'Niels Christian Broberg', 'mn': '1234567', 'sn': '1214' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 43 56 A2 2D 4D', 'ow': 'Bela Megyesi', 'mn': '1234567', 'sn': '1215' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 3E 57 A2 2D 4D', 'ow': 'Michael Pueschel', 'mn': '1234567', 'sn': '1216' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 4B 56 A2 2D 4D', 'ow': 'Martin Kohlert', 'mn': '1234567', 'sn': '1217' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 46 57 A2 2D 4D', 'ow': 'Bernd Nuessel', 'mn': '1234567', 'sn': '1218' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 97 56 A2 2D 4D', 'ow': 'Christian Reh', 'mn': '1234567', 'sn': '1201' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 53 56 A2 2D 4D', 'ow': 'Sergius Polinski', 'mn': '1234567', 'sn': '1219' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 DB 55 A2 2D 4D', 'ow': 'David Drews', 'mn': '1234567', 'sn': '1220' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 E5 56 A2 2D 4D', 'ow': 'Sandner Sascha', 'mn': '1234567', 'sn': '1221' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 FB 57 A2 2D 4D', 'ow': 'Simon McGrath', 'mn': '1234567', 'sn': '1222' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 BA 56 A2 2D 4D', 'ow': 'Paul Terick / Kevin Reinhart', 'mn': '1234567', 'sn': '1223' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 05 57 A2 2D 4D', 'ow': 'Victor Bascones Munoz', 'mn': '1234567', 'sn': '1224' },
  { 'rf': '04 CA 56 A2 2D 4D', 'ow': 'Gerald Bechtold', 'mn': '1234567', 'sn': '1225' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 F1 57 A2 2D 4D', 'ow': 'Wolfgang Heimsch', 'mn': '1234567', 'sn': '1226' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 D1 54 A2 2D 4D', 'ow': 'Peter Wiener', 'mn': '1234567', 'sn': '1227' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 B2 56 A2 2D 4D', 'ow': 'Stefan Henkel', 'mn': '1234567', 'sn': '1228' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 66 57 A2 2D 4D', 'ow': 'Denis Raveau', 'mn': '1234567', 'sn': '1202' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 C2 56 A2 2D 4D', 'ow': 'Theo Twieling', 'mn': '1234567', 'sn': '1229' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 4A 56 A2 2D 4D', 'ow': 'Markus Zahnjel', 'mn': '1234567', 'sn': '1230' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 10 58 A2 2D 4D', 'ow': 'Ratnam Ramanathan', 'mn': '1234567', 'sn': '1231' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 21 58 A2 2D 4D', 'ow': 'Johan Van Opstal', 'mn': '1234567', 'sn': '1232' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 18 58 A2 2D 4D', 'ow': 'Gene Schroeder', 'mn': '1234567', 'sn': '1233' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 29 58 A2 2D 4D', 'ow': 'Sven Egil Hauan', 'mn': '1234567', 'sn': '1234' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 5A 56 A2 2D 4D', 'ow': 'Herbert Brouwers', 'mn': '1234567', 'sn': '1235' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 52 56 A2 2D 4D', 'ow': 'Christina Blumthaler', 'mn': '1234567', 'sn': '1236' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 87 56 A2 2D 4D', 'ow': 'Angelo Constantini', 'mn': '1234567', 'sn': '1203' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 8F 56 A2 2D 4D', 'ow': 'Nicolino Pizzo', 'mn': '1234567', 'sn': '1204' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 70 57 A2 2D 4D', 'ow': 'Alexander Eike', 'mn': '1234567', 'sn': '1205' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 AA 56 A2 2D 4D', 'ow': 'Ugur Timurlenk', 'mn': '1234567', 'sn': '1206' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 7F 56 A2 2D 4D', 'ow': 'Kanamma R', 'mn': '1234567', 'sn': '1207' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0},
  { 'rf': '04 5E 57 A2 2D 4D', 'ow': 'Ricardo Ramires', 'mn': '1234567', 'sn': '1208' , 'time_quali': 0, 'score_quali': 0, 'time_finals': 0, 'score_finals': 0}
]


var initLeaderboard = function () {
  let leaderboardDb = level('../db/leaderboard', ({valueEncoding: 'json'}))


    logger.debug('Saving leaderboard information to database')
    leaderboardDb.put(RACE_ID, carArray)
    logger.debug('Successfully saved leaderboard information to database')
    logger.debug('Closing database')
    leaderboardDb.close(function (err) {
        if (err) {
            logger.error('Could not close database: %s', err.message)
        }
    })
  }


initLeaderboard()



var initHighscore = function (heatId, lanes) {
  let highscoreDb = level('../db/highscore', ({valueEncoding: 'json'}))

  let highscore = []
  for (var i = 0; i < 5; i++) {
      highscore[i] = {}
      highscore[i].rank = i + 1
      highscore[i].t = 999999
      highscore[i].rf = ""
      highscore[i].heat = -1
  }
  
  logger.debug('Saving highscore information to database')
  highscoreDb.put(RACE_ID, highscore)
  logger.debug('Successfully saved highscore information to database')
  logger.debug('Closing database')
  highscoreDb.close(function (err) {
    if (err) {
      logger.error('Could not close database: %s', err.message)
    }
  })
}

initHighscore()