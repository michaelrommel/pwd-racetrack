/* jslint node: true */
'use strict'

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

var msgIdCounter = 0
var msgQueueStatus = MSG_QUEUE_STOPPED
var msgQueueTimer = null
var msgQueueOpen = []
var msgQueueComplete = []

var port = new SerialPort('COM5',
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
    msgId = ++msgIdCounter // generating new unique msg id
    var msgQueueItem = {}
    msgQueueItem.id = msgId
    msgQueueItem.msg = msg
    msgQueueItem.msg.id = msgId
    msgQueueItem.state = MSG_STATE_PENDING
    msgQueueOpen.push(msgQueueItem)

    if (msgQueueStatus === MSG_QUEUE_STOPPED) { // timer not running, start it
      msgQueueTimer = setInterval(checkMsgQueue, TIMER_DELAY)
      msgQueueStatus = MSG_QUEUE_RUNNING
    }
  }

  port.send(JSON.stringify(msg))
}

// function for checking message queue periodically and triggering resend
// -----------------
// params
//
var checkMsgQueue = function () {
  for (var i = 0; i < msgQueueOpen.length; i++) { // looping through open msg queue
    if (msgQueueOpen[i].state === MSG_STATE_PENDING) { // msg still unacknowledged, resend
      sendMsg(msgQueueOpen[i].msg, msgQueueOpen[i].id)
    } else { // msg already acknowledged, pop from open msg queue
      msgQueueComplete.push(msgQueueOpen[i])
      msgQueueOpen.splice(i, 1)
    }
  }

  if (msgQueueOpen === 0) { // msg queue is empty, we can stop timer
    clearInterval(msgQueueTimer)
    msgQueueTimer = null
    msgQueueStatus = MSG_QUEUE_STOPPED
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
  let leaderboardDb = level('../db/leaderboard')

  let lanesSorted = lanes.sort(sortByTime)

  for (var i = 0; i < lanesSorted.length; i++) {
    lanesSorted[i].points = Math.pow(2, i)
  }

  leaderboardDb.get(RACE_ID, function (err, value) {
    if (err) {
      // error handling
    }

    let leadership = JSON.parse(value)

    for (var i = 0; i < lanes.length; i++) {
      let laneRfid = lanes[i].rf
      if (heatId <= 40) {
        leadership[laneRfid].score_quali += lanes[i].points
        leadership[laneRfid].time_quali += lanes[i].t
      } else {
        leadership[laneRfid].score_finals += lanes[i].points
        leadership[laneRfid].time_finals += lanes[i].t
      }
    }

    leaderboardDb.put(RACE_ID, JSON.stringify(leadership))
  })
}

// function for updating the race highscore
// -----------------
// params
//
var updateHighscore = function (heatId, lanes) {
  let highscoreDb = level('../db/highscore')

  highscoreDb.get(RACE_ID, function (err, value) {
    if (err) {
      // error handling
    }

    let highscore = JSON.parse(value)

    for (var i = 0; i < lanes.length; i++) {
      for (var k = 0; k < highscore.length; k++) {
        if (lanes[i].t < highscore[k].t) {
          lanes[i].heat = heatId
          lanes[i].rank = k + 1
          highscore.splice(k, 0, lanes[i])
          highscore.splice(-1)
          break
        }
      }
    }

    highscoreDb.put(RACE_ID, JSON.stringify(highscore))
  })
}

// function for acknowledging messages from race track
// -----------------
// params
//
var ack = function (id, state) {
  let msg = {}
  msg.id = id
  msg.c = MSG_ACK
  if (state === true) {
    msg.s = ST_OK
  } else if (state === false) {
    msg.s = ST_ERROR
  }

  sendMsg(msg)
}

// Start the setup of the racetrack
var setupRT = function () {
  let msg = {}
  msg.c = MSG_SET_TRACK
  msg.s = ST_TR_SET_START

  sendMsg(msg)
}

// Start the setup of the racetrack
var stopSetupRT = function () {
  let msg = {}
  msg.c = MSG_SET_TRACK
  msg.s = ST_TR_SET_STOP

  sendMsg(msg)
}

// function for initializing a heat
// ----------------
// params
//
var initHeat = function (heatId) {
  let msg = {}
  msg.c = MSG_INIT_HEAT
  msg.h = heatId
  msg.l = []

  // either receive car information via function call
  // from outside or retrieve information directly from db
  let heatdb = level('../db/heatdb')

  let heatKey = '2018-Race-' + ('0' + heatId).splice(-2)
  heatdb.get(heatKey, function (err, value) {
    if (err) {
      throw err
    }

    let heatConfig = JSON.parse(value)
    msg.l = heatConfig

    sendMsg(msg)
  })
}

// function for starting a heat
// ----------------
// params
//
var startHeat = function (heatId) {
  let msg = {}
  msg.c = MSG_START_HEAT
  msg.h = heatId

  sendMsg(msg)
}

// function for updating heat progress information
// ----------------
// params
//
var updateHeat = function (heatId, heatStatus, lanes) {
  let dto = {}
  dto.heat = heatId
  dto.lanes = lanes

  if (heatStatus === 2) { // we have received the progess for an ongoing heat
    // simply update heat status
    dto.state = 'running'
  } else if (heatStatus === 3) { // we have received the progess for a finished heat
    dto.state = 'finished'
    updateLeaderboard(heatId, lanes)
    updateHighscore(heatId, lanes)
  }

  let heatdb = level('../db/heatdb')

  let heatKey = RACE_ID + ('0' + heatId).splice(-2)
  heatdb.put(heatKey, JSON.stringify(dto))
}

// function for car detection
// ---------------
// params
//
var carDetected = function (heatId, msgState, lanes) {
  let dto = {}
  dto.status = 'nok'
  dto.heat = heatId
  dto.lanes = []

  let laneStatusDb = level('../db/lanedb')

  let lanesKey = RACE_ID
  laneStatusDb.get(lanesKey, function (err, value) {
    let lanesDb = JSON.parse(value)

    if (err) {
      throw err
    }

    for (var i = 0; i < lanes.length; i++) {
      let lane = lanes[i]
      lane.lane = i

      if (lane.rf) {
        if (msgState === ST_HEAT_UNKWN) {
          lane.state = 'nok'
        } else if (msgState === ST_COR_LANE) {
          lane.state = 'ok'
        } else if (msgState === ST_WRO_LANE) {
          lane.state = 'nok'
        }
        dto.lanes[i] = lane
      } else {
        dto.lanes[i] = lanesDb[i]
      }
    }

    saveLaneStatus(dto)
  })
}

// function for detection of heat setup complete
// -----------
// params
//
var heatSetupComplete = function (heatId, lanes) {
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

  saveLaneStatus(dto)
}

// function for pushin lane status to database
// -----------
// params
//
var saveLaneStatus = function (laneDto) {
  let laneDB = level('../db/lanedb')

  var laneKey = RACE_ID
  laneDB.put(laneKey, JSON.stringify(laneDto))
}

// function for laser setup measurement
// -----------
// params
//
var laserSetup = function (laserData) {
  // message laser setup measurements do db or somewhere else ??

}

// event listener for incomming data from race track
port.on('readable', function () {
  let newdata = port.read().toString('utf8')
  logger.info('got serial data: %s', newdata)
  let data
  try {
    data = JSON.parse(newdata)
  } catch (err) {
    logger.error('Error parsing input data to JSON obj: %s', err.message)
    // error acknowledgement
    ack(0, false)
  }

  let messageId = data.id
  logger.debug('JSON data (message ID): %i', messageId)

  // message received completely, acknowledge
  ack(messageId, true)

  let messageCc = data.c

  if (messageCc === MSG_ACK) { // we have received a message acknowledge
    for (var i = 0; i < msgQueueOpen.length; i++) {
      if (msgQueueOpen[i].id === messageId) {
        if (data.s === ST_OK) {
          msgQueueOpen[i].state = MSG_STATE_ACK
        } else if (data.s === ST_ERROR) {
          sendMsg(msgQueueOpen[i].msg, messageId)
        }
      }
      break
    }
  } else if (messageCc === MSG_PROG_HEAT) { // we have received a progess update
    let messageHeat = data.h
    let messageState = data.s
    let messageLanes = data.l

    updateHeat(messageHeat, messageState, messageLanes)
  } else if (messageCc === MSG_DET_CAR) {
    let messageHeat = data.h
    let messateState = data.s
    let messageLanes = data.l

    carDetected(messageHeat, messateState, messageLanes)
  } else if (messageCc === MSG_CPL_HEAT) {
    if (data.s === ST_HEAT_SETUP) { // everything is okay
      let messageHeat = data.h
      let messageLines = data.l

      heatSetupComplete(messageHeat, messageLines)
    }
  } else if (messageCc === MSG_REP_LASER) {
    if (data.s === 11) {
      laserSetup(data.l)
    }
  }
})

var serialCommer
serialCommer.setupRT = setupRT
serialCommer.stopSetupRT = stopSetupRT
serialCommer.initHeat = initHeat
serialCommer.startHeat = startHeat

module.export = serialCommer
