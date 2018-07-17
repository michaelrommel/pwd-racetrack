'use strict'

const MODULE_ID = 'serial'
const logger = require('../utils/logger')
const SerialPort = require('serialport')
const heatUtils = require('../network/routes/heat/heatUtils')

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
const ST_HEAT_PROGRESS = 2
const ST_HEAT_FINISHED = 3
const ST_HEAT_UNKWN = 5
const ST_COR_LANE = 6
const ST_WRO_LANE = 7
const ST_TR_SET_START = 10
const ST_TR_SET_STOP = 12
const ST_ERROR = 101
const ST_INVALID_STATETRANSITION = 102
const ST_INVALID_COMMAND = 103

const MSG_STATE_PENDING = 0
const MSG_STATE_ACK = 1

const MSG_QUEUE_STOPPED = false
const MSG_QUEUE_RUNNING = true
const TIMER_DELAY = 2000

const NUM_HIGHSCORE_ENTRIES = 20

var portName = 'COM6'
var port

var inputMsgBuffer = ''

var msgIdCounter = 0
var msgQueueStatus = MSG_QUEUE_STOPPED
var msgQueueTimer = null
var msgQueueOpen = []
var msgQueueComplete = []

var scoreTable = [8, 4, 2, 1]

var heatDb
var laneDb
var leaderboardDb
var highscoreDb

var raceId

// initializes all database objects and global variables
function init (ctx) {
  heatDb = ctx.db.heat
  laneDb = ctx.db.lane
  leaderboardDb = ctx.db.leaderboard
  highscoreDb = ctx.db.highscore

  heatUtils.setContext(ctx.db)

  raceId = ctx.raceId
  logger.debug('%s::init: initialized global raceID to %s', MODULE_ID, raceId)

  initLaneStatus(0)
}

// sets the global variable
function initRace (id) {
  raceId = id
  logger.debug('%s::initRace: initialized global raceID to %s', MODULE_ID, id)
}

function UserException (id, msg) {
  this.id = id
  this.msg = msg
}

// function for sending message objects over the line
// -----------------
// params
//
var sendMsg = function (msg, msgId) {
  msgId = msgId || -1

  if (msgId === -1) { // new message that is not yet in queue
    logger.debug('%s::sendMsg: Received new message to send over the serial line', MODULE_ID)

    msgId = ++msgIdCounter // generating new unique msg id

    logger.debug('%s::sendMsg: Constructing message object', MODULE_ID)
    var msgQueueItem = {}
    msgQueueItem.id = msgId
    msgQueueItem.msg = msg
    msgQueueItem.msg.id = msgId
    msgQueueItem.state = MSG_STATE_PENDING
    msgQueueItem.retry = 0

    if (msg.c !== MSG_ACK) {
      logger.debug('%s::sendMsg: Pushing message object to message queue', MODULE_ID)
      msgQueueOpen.push(msgQueueItem)

      if (msgQueueStatus === MSG_QUEUE_STOPPED) { // timer not running, start it
        logger.debug('%s::sendMsg: Message queue timer not running', MODULE_ID)
        msgQueueTimer = setInterval(checkMsgQueue, TIMER_DELAY)
        msgQueueStatus = MSG_QUEUE_RUNNING
        logger.debug('%s::sendMsg: Message queue timer started', MODULE_ID)
      }
    }
  }

  port.write(JSON.stringify(msg), function (err) {
    if (err) {
      return logger.error('%s::sendMsg: Error on writing over the serial line: %s', MODULE_ID, err.message)
    }
    logger.info('%s::sendMsg: Message written successfully over the serial line: %s', MODULE_ID, JSON.stringify(msg))
  })
}

// function for checking message queue periodically and triggering resend
// -----------------
// params
//
var checkMsgQueue = function () {
  logger.debug('%s::checkMsgQueue: Checking open message queue for unacknowledged messages', MODULE_ID)
  logger.debug('%s::checkMsgQueue: Number unacknowledged messages: %i', MODULE_ID, msgQueueOpen.length)
  for (var i = 0; i < msgQueueOpen.length; i++) { // looping through open msg queue
    if (msgQueueOpen[i].state === MSG_STATE_PENDING && msgQueueOpen[i].retry < 3) { // msg still unacknowledged, resend
      logger.debug('%s::checkMsgQueue: Message still unacknowledged, resending it: %s', MODULE_ID, JSON.stringify(msgQueueOpen[i]))
      msgQueueOpen[i].retry += 1
      logger.debug('%s::checkMsgQueue: Incrementing retry counter for message: %d', MODULE_ID, msgQueueOpen[i].retry)
      sendMsg(msgQueueOpen[i].msg, msgQueueOpen[i].id)
    } else { // msg already acknowledged, pop from open msg queue
      logger.debug('%s::checkMsgQueue: Message already acknowledged, pushing it to complete queue', MODULE_ID)
      msgQueueComplete.push(msgQueueOpen[i])
      msgQueueOpen.splice(i, 1)
      logger.debug('%s::checkMsgQueue: Message removed from open queue', MODULE_ID)
    }
  }

  if (msgQueueOpen.length === 0) { // msg queue is empty, we can stop timer
    logger.debug('%s::checkMsgQueue: Message queue empty, stopping timer', MODULE_ID)
    clearInterval(msgQueueTimer)
    msgQueueTimer = null
    msgQueueStatus = MSG_QUEUE_STOPPED
    logger.debug('%s::checkMsgQueue: Message queue timer stopped', MODULE_ID)
  }
}

// function for sorting lanes by time ascending
// -----------------
// params
//
var sortByTimeAsc = function (a, b) {
  if ((a.t < b.t) || (b.t === undefined)) {
    return -1
  } else if ((a.t > b.t) || (a.t === undefined)) {
    return 1
  }
  return 0
}

// function for updating the race leaderboard
// -----------------
// param: a heat with racers that need to be updated
//
var updateLeaderboard = async function (heat) {
  logger.debug('%s::updateLeaderboard: get whole leaderboard', MODULE_ID)
  let leaderboard
  try {
    leaderboard = await leaderboardDb.get(raceId)
  } catch (err) {
    logger.error('%s::updateLeaderboard: could not find leaderboard for race %s', MODULE_ID, raceId)
    leaderboard = {}
  }

  // retrieve the race configuration, to see, in which other heats
  try {
    // these cars were in to calculate the complete score
    let confAndCars = await heatUtils.getRaceConfigAndCars(raceId)
    for (let i = 0; i < heat.results.length; i++) {
      // get the car RFID
      let rfid = heat.results[i].rf
      // get the car's startnumber
      let startNumber = 0
      let index = Object.keys(confAndCars.cars).findIndex(key => confAndCars.cars[key] === rfid)
      if (index === -1) {
        // we strangely did not find this rfid in this race
        logger.error('%s::updateLeaderboard: could not find car %s in race %s', MODULE_ID, rfid, raceId)
        // we skip this car and continue with the rest
        continue
      } else {
        // we got the index, now get the key
        startNumber = parseInt(Object.keys(confAndCars.cars)[index])
      }
      let cumulatedScore = 0
      let cumulatedTime = 0
      // get all heats where this car was in, note that heatnumbers start with 1 and we are
      // using object keys here, not array indices
      for (let h = 1; h <= Object.keys(confAndCars.raceconfig.heats).length; h++) {
        for (let l = 0; l < confAndCars.raceconfig.heats[h].length; l++) {
          if (confAndCars.raceconfig.heats[h][l] === startNumber) {
            // we found a heat
            // heatNumber = h
            // laneNumber = l
            // get the score for that heat
            let otherHeatKey = raceId + '-' + ('0' + h).slice(-2)
            try {
              let otherHeat = await heatDb.get(otherHeatKey)
              let score = otherHeat.results[l].score
              let time = otherHeat.results[l].t
              logger.debug('%s::updateLeaderboard: car %s scored %d in heat %d on lane %d with time %d', MODULE_ID,
                rfid, score, h, l, time)
              cumulatedScore = cumulatedScore + score
              cumulatedTime = cumulatedTime + time
            } catch (err) {
              logger.error('%s::updateLeaderboard: could not find heat %s in db', MODULE_ID, otherHeatKey)
              continue
            }
          }
        }
      }
      // we now have iterated over all heats this car was in and can now update the leaderboard
      leaderboard[rfid] = {...heat.results[i]}
      leaderboard[rfid].cumulatedScore = cumulatedScore
      leaderboard[rfid].cumulatedTime = cumulatedTime
      delete leaderboard[rfid].score
    }
    // now we updated the whole leaderboard
    try {
      await leaderboardDb.put(raceId, leaderboard)
      return
    } catch (err) {
      logger.error('%s::updateLeaderboard: could not save leaderboard for race %s', MODULE_ID, raceId)
    }
  } catch (err) {
    logger.error('%s::updateLeaderboard: could not get race config and cars', MODULE_ID)
  }
}

// function for updating the race highscore
var updateHighscore = async function (heatId, lanes) {
  logger.debug('%s::updateHighscore: Getting current highscore from database', MODULE_ID)

  let highscore
  let heatKey = raceId + '-' + ('0' + heatId).slice(-2)

  try {
    highscore = await highscoreDb.get(raceId)
  } catch (err) {
    if (err) {
      if (!err.notFound) {
        logger.error('%s::updateHighscore: Could not retrieve highscore for race %s from database', MODULE_ID, raceId)
        return
      }
    }
  }

  if (highscore === undefined || highscore.length === 0) {
    // here is a dummy, in case we have not yet initialised the highscore for this race
    highscore = [{'rank': 1, 't': 999999, 'rf': '', 'heat': -1}]
  }

  logger.debug('%s::updateHighscore: iterating through current highscore to see if there is a new one', MODULE_ID)
  // iterate over each car
  for (let i = 0; i < lanes.length; i++) {
    // iterate over the complete highscore array, length is for each iteration of i possible bigger
    for (let k = 0; k < highscore.length; k++) {
      // if there was no car on this lane or only a progress message came in
      if (lanes[i].t === undefined ||
         ((lanes[i].t === highscore[k].t) &&
          (lanes[i].ow === highscore[k].ow) &&
          (heatKey === highscore[i].heat))) {
        // skip already known cars from this heat
        break
      }
      // we arrive here only, if there is a defined item in lanes
      if (lanes[i].t < highscore[k].t) {
        logger.info('%s::updateHighscore: found new highscore: Heat - %i, Racer - %s, Time - %ims, Rank - %i', MODULE_ID,
          heatId, lanes[i].ow, lanes[i].t, k + 1)
        lanes[i].heat = heatKey
        lanes[i].rank = k + 1
        highscore.splice(k, 0, lanes[i])
        break
      }
    }
  }

  logger.debug('%s::updateHighscore: renumbering entries in highscore', MODULE_ID)
  highscore.sort(sortByTimeAsc)
  for (var j = 0; j < highscore.length; j++) {
    highscore[j].rank = j + 1
    logger.debug('%s::updateHighscore: entry: %d - %s', MODULE_ID, j, JSON.stringify(highscore[j]))
  }
  // let cleanHighscore = highscore.filter(entry => entry.t !== 999999)
  highscore = highscore.slice(0, NUM_HIGHSCORE_ENTRIES)

  logger.debug('%s::updateHighscore: saving highscore information to database', MODULE_ID)
  try {
    await highscoreDb.put(raceId, highscore)
    logger.debug('%s::updateHighscore: successfully saved highscore information to database', MODULE_ID)
  } catch (err) {
    logger.error('%s::updateHighscore: error saving highscore, err: %s', MODULE_ID, err)
  }
}

// function for acknowledging messages from race track
// -----------------
// params
//
var ack = function (id, state) {
  logger.debug('%s::ack: Building acknowledge message', MODULE_ID)
  let msg = {}
  msg.id = id
  msg.c = MSG_ACK
  if (state === true) {
    logger.debug('%s::ack: Message status is okay', MODULE_ID)
    msg.s = ST_OK
  } else if (state === false) {
    logger.debug('%s::ack: Message status is error', MODULE_ID)
    msg.s = ST_ERROR
  }
  logger.debug('%s::ack: Sending acknowledge message over the serial line', MODULE_ID)
  sendMsg(msg, id)
}

// Start the setup of the racetrack
var startSetupRT = function () {
  logger.debug('%s::startSetupRT: Building setup race track message', MODULE_ID)
  let msg = {}
  msg.c = MSG_SET_TRACK
  msg.s = ST_TR_SET_START
  logger.debug('%s::startSetupRT: Sending setup race track message over the serial line', MODULE_ID)
  sendMsg(msg)
}

// Start the setup of the racetrack
var stopSetupRT = function () {
  logger.debug('%s::stopSetupRT: Building stop setup race track message', MODULE_ID)
  let msg = {}
  msg.c = MSG_SET_TRACK
  msg.s = ST_TR_SET_STOP
  logger.debug('%s::stopSetupRT: Sending stop setup race track message over the serial line', MODULE_ID)
  sendMsg(msg)
}

// function for initializing a heat
// ----------------
// heatId is here a single numeric value
//
var initHeat = async function (heatId) {
  logger.debug('%s::initHeat: Building init heat message', MODULE_ID)
  let msg = {}
  msg.c = MSG_INIT_HEAT
  msg.h = heatId
  msg.l = []

  let heatKey = raceId + '-' + ('0' + heatId).slice(-2)
  logger.debug('%s::initHeat: Retrieving heat information for %s', MODULE_ID, heatKey)
  let heat
  try {
    heat = await heatDb.get(heatKey)
    msg.l = heat.results
    logger.debug('%s::initHeat: Sending init heat message over the serial line: %s', MODULE_ID, JSON.stringify(msg))
    sendMsg(msg)
    // reset the lane status
    initLaneStatus(heatId)
    // reset heat status
    heat.status = 'current'
    // reset the score information of eventually previous heat runs
    for (let i = 0; i < heat.results.length; i++) {
      heat.results[i].score = 0
      heat.results[i].t = 0
    }
    try {
      await heatDb.put(heatKey, heat)
      logger.debug('%s::initHeat: resetted score and time of heat %s', MODULE_ID, heatKey)
    } catch (err) {
      logger.errorr('%s::initHeat: could not put back resetted heat %s', MODULE_ID, heatKey)
      throw new UserException('noresetheat', 'could not save resetted heat')
    }
  } catch (err) {
    if (err) {
      logger.error('%s::initHeat: Unable to retrieve heat information for %s', MODULE_ID, heatKey)
      throw new UserException('noheat', 'could not get heat from database')
    }
  }
}

// function for initializing lane status information in database
// ----------------
// heatId is here a single numeric value
//
var initLaneStatus = function (heatId) {
  logger.debug('%s::initLaneStatus: Building initial lane status data for heat %d', MODULE_ID, heatId)
  let dto = {}
  dto.status = 'nok'
  dto.heat = heatId
  dto.lanes = []
  for (var i = 0; i < 4; i++) {
    dto.lanes[i] = {}
  }
  dto.lanes[0].status = 'unknown'
  dto.lanes[1].status = 'unknown'
  dto.lanes[2].status = 'unknown'
  dto.lanes[3].status = 'unknown'

  logger.debug('%s::initLaneStatus: Initializing lane status info in database', MODULE_ID)
  saveLaneStatus(dto)
  logger.debug('%s::initLaneStatus: Successfully initialized lane status info for heat %d', MODULE_ID, heatId)
}

// function for starting a heat
// ----------------
// heatId is here a single numeric value
//
var startHeat = function (heatId) {
  logger.debug('%s::startHeat: Building start heat message for heat %d', MODULE_ID, heatId)
  let msg = {}
  msg.c = MSG_START_HEAT
  msg.h = heatId

  logger.debug('%s::startHeat: Sending start heat %s message over the serial line', MODULE_ID, heatId)
  sendMsg(msg)
}

// function for updating heat progress information
// ----------------
// params
//
var updateHeat = async function (heatId, heatStatus, lanes) {
  logger.info('%s::updateHeat: Processing update heat message', MODULE_ID)
  // get the complete heat information from the database
  let heatKey = raceId + '-' + ('0' + heatId).slice(-2)
  let heat = {}
  try {
    heat = await heatDb.get(heatKey)
  } catch (err) {
    logger.error('%s::updateHeat: could not find heat %s in db', MODULE_ID, heatId)
    // there is not much we can do...
    return
  }
  let consistent = true
  for (let h = 0; h < heat.results.length; h++) {
    // consistency check
    if ((lanes[h].rf !== undefined) && (heat.results[h].rf !== lanes[h].rf)) {
      // there is something wrong, the track has a different
      // view of the lane setup than the bridge!
      logger.error('%s::updateHeat: bridge: %s and track: %s differ', MODULE_ID, heat.results[h].rf, lanes[h].rf)
      consistent = false
    }
  }
  // rather return, than possibly calculate a wrong score
  if (!consistent) return

  // make a copy, as sort works on the original array
  let lanesSorted = [ ...lanes ]
  logger.debug('%s::updateheat: Sorting current heat by time', MODULE_ID)
  lanesSorted.sort(sortByTimeAsc)

  // go through the sorted array and calculate the score and add it
  for (let s = 0; s < lanesSorted.length; s++) {
    if (lanesSorted[s].rf !== undefined) {
      // on this lane of the results from the track, there is a car reported
      // now find in the heat from the db, the correct entry
      for (let h = 0; h < heat.results.length; h++) {
        // make sure that there is information in the lanes
        if (heat.results[h].rf !== undefined) {
          // this heat has a car in this heat on it
          if (heat.results[h].rf === lanesSorted[s].rf) {
            // set the score
            heat.results[h].score = scoreTable[s]
            // take over the time
            heat.results[h].t = lanesSorted[s].t
          }
        }
      }
    }
  }

  if (heatStatus === ST_HEAT_PROGRESS) {
    // we have received the progess for an ongoing heat
    logger.info('%s::updateHeat: Received progress of unfinished heat', MODULE_ID)
    heat.status = 'running'
  } else if (heatStatus === ST_HEAT_FINISHED) {
    // we have received the progess for a finished heat
    logger.info('%s::updateHeat: Received progress of finished heat', MODULE_ID)
    heat.status = 'finished'
  }

  logger.debug('%s::updateHeat: Saving updated heat information to database', MODULE_ID)
  try {
    await heatDb.put(heatKey, heat)
    logger.debug('%s::updateHeat: Successfully saved updated heat information to database', MODULE_ID)
    logger.debug('%s::updateHeat: Update leaderboard with new data', MODULE_ID)
    updateLeaderboard(heat)
    // logger.debug('%s::updateHeat: Update highscore with new data', MODULE_ID)
    updateHighscore(heatId, lanesSorted)
  } catch (err) {
    logger.error('%s::updateHeat: error saving heat %s', MODULE_ID, heatKey)
  }
}

// function for car detection
// ---------------
var carDetected = function (heatId, msgState, lanes) {
  logger.info('%s: processing car detected message', MODULE_ID)
  // initialze data object for current lane setup
  let dto = {}
  // set the overall status to not-okay
  dto.status = 'nok'
  dto.heat = heatId
  dto.lanes = [{}, {}, {}, {}]

  logger.debug('%s::carDetected: retrieving lane status information for %s', MODULE_ID, heatId)
  // in the database, there is only one lane entry for the current race
  laneDb.get(raceId, function (err, value) {
    let lanesInDb = value

    if (err) {
      // if databae does not contain any info for this race, initialize it by cloning empty lanes
      logger.error('%s::carDetected: could not retrieve lane status information for %s', MODULE_ID, heatId)
      lanesInDb = { ...dto.lanes }
    }

    logger.debug('%s::carDetected: processing track data', MODULE_ID)
    for (var i = 0; i < lanes.length; i++) {
      let lane = lanes[i]
      lane.lane = i

      // lans is now the information of one lane from the track
      if (lane.rf) {
        if (msgState === ST_HEAT_UNKWN) {
          logger.info('%s::carDetected: car during unititialized heat in lane %i', MODULE_ID, i)
          lane.state = 'unknown'
        } else if (msgState === ST_COR_LANE) {
          logger.info('%s::carDetected: car %s set in correct lane', MODULE_ID, lane.rf)
          lane.state = 'correct'
        } else if (msgState === ST_WRO_LANE) {
          logger.info('%s::carDetected: car %s set in wrong lane', MODULE_ID, lane.rf)
          lane.state = 'wrong'
        }
        // using a reference to one property of the lanes object is okay here
        dto.lanes[i] = lane
      } else {
        logger.debug('%s::carDetected: data from race track does not contain any information for lane %i', MODULE_ID, i)
        logger.debug('%s::carDetected: using previous data from database', MODULE_ID)
        // referencing one of the properties of the lanesInDb object
        dto.lanes[i] = lanesInDb.lanes[i]
      }
    }

    logger.debug('%s::carDetected: Saving lane status information to database', MODULE_ID)
    let success = saveLaneStatus(dto)
    if (success) {
      logger.debug('%s::carDetected: Successfully saved lane status information to database', MODULE_ID)
    }
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

// function for pushing lane status to database
// -----------
// params
//
var saveLaneStatus = async function (laneDto) {
  logger.debug('%s::saveLaneStatus: Pushing lane status to database', MODULE_ID)
  try {
    await laneDb.put(raceId, laneDto)
    return true
  } catch (err) {
    logger.error('%s::saveLaneStatus: Unable to save lane status for %s', MODULE_ID, raceId)
    return false
  }
}

// function for laser setup measurement
// -----------
// params
//
var laserSetup = function (laserData) {
  // message laser setup measurements do db or somewhere else ??
  logger.debug('%s::laserSetup: Processing laser setup message', MODULE_ID)
  logger.info('Laser Levels: %s', laserData.join(' '))
}

// this is run at module load time

// select the serial port
;(async function () {
  try {
    let ports = await SerialPort.list()
    for (let i = 0; i < ports.length; i++) {
      logger.debug('%s::moduleLoad: found port: %s from vendor: %s', MODULE_ID, ports[i].comName, ports[i].manufacturer)
      if (ports[i].manufacturer !== undefined && ports[i].manufacturer.match(/Arduino.*www/i) !== null) {
        logger.info('%s::moduleLoad: selected serial device on %s', MODULE_ID, ports[i].comName)
        portName = ports[i].comName
        break
      }
    }
    // initialize the serial port
    port = new SerialPort(portName,
      { 'baudRate': 57600,
        'dataBits': 8,
        'parity': 'none',
        'stopBits': 1
      },
      function (err) {
        if (err) {
          logger.info('%s::moduleLoadError opening: %s', MODULE_ID, err.message)
        } else {
          // if successful, start the event listener
          startSerialReader()
        }
      }
    )
  } catch (err) {
    logger.debug('%s::moduleLoad: could not find any port, reverting to default port %s', MODULE_ID, portName)
    logger.debug('%s::moduleLoad: error was %s', MODULE_ID, err)
  }
})()

function startSerialReader () {
  // event listener for incoming data from race track
  port.on('readable', function () {
    // get all data that is available from the serial port
    let allSerialData = port.read().toString('utf8')
    logger.debug('%s::eventListener: got serial data: %s', MODULE_ID,
      allSerialData.replace(/\n/g, '\\n').replace(/\r/g, '\\r'))

    // take only the first portion up to the first newline
    let jsonData = ''
    if (allSerialData.indexOf('\n') === -1) {
      logger.debug('%s::eventListener: got only partial message, buffering', MODULE_ID)
      inputMsgBuffer += allSerialData
      // break, if we got only a partial JSON string
      return
    } else {
      jsonData = inputMsgBuffer + allSerialData
      let tmp = jsonData.split('\n')
      jsonData = tmp[0]
      inputMsgBuffer = tmp[1]
    }

    // get the data as an object
    let data
    logger.info('%s::eventListener: received JSON string: %s', MODULE_ID, jsonData)
    try {
      logger.debug('%s::eventListener: parsing data to JSON object', MODULE_ID)
      data = JSON.parse(jsonData)
    } catch (err) {
      logger.error('%s::eventListener: error parsing input data to JSON obj: %s', MODULE_ID, err.message)
      // error acknowledgement
      ack(0, false)
      return
    }

    let messageId = data.id
    logger.debug('%s::eventListener: JSON data (message ID): %i', MODULE_ID, messageId)

    let messageCc = data.c
    if (messageCc !== MSG_ACK) {
      // message received completely, acknowledge
      logger.info('%s::eventListener: message received completely, sending acknowledge', MODULE_ID)
      ack(messageId, true)
    }

    if (messageCc === MSG_ACK) { // we have received a message acknowledge
      logger.info('%s::eventListener: received an acknowledge message', MODULE_ID)
      logger.debug('%s::eventListener: iterating through open message queue to find corresponding message', MODULE_ID)
      for (var i = 0; i < msgQueueOpen.length; i++) {
        if (msgQueueOpen[i].id === messageId) {
          logger.info('%s::eventListener: message found in queue', MODULE_ID)
          if (data.s === ST_OK) {
            logger.info('%s::eventListener: setting message state to acknowledged', MODULE_ID)
            msgQueueOpen[i].state = MSG_STATE_ACK
          } else if (data.s === ST_ERROR) {
            logger.info('%s::eventListener: received error acknowledge, resend corresponding message', MODULE_ID)
            sendMsg(msgQueueOpen[i].msg, messageId)
          } else if ((data.s === ST_INVALID_STATETRANSITION) || (data.s === ST_INVALID_COMMAND)) {
            logger.info('%s::eventListener: ack for wrong command/state, not resending message', MODULE_ID)
            msgQueueOpen[i].state = MSG_STATE_ACK
          }
          break
        }
      }
    } else if (messageCc === MSG_PROG_HEAT) { // we have received a progress update
      logger.info('%s::eventListener: received a progress update message for a heat', MODULE_ID)
      let messageHeat = data.h
      let messageState = data.s
      let messageLanes = data.l
      updateHeat(messageHeat, messageState, messageLanes)
    } else if (messageCc === MSG_DET_CAR) {
      logger.info('%s::eventListener: received a car detected message', MODULE_ID)
      let messageHeat = data.h
      let messateState = data.s
      let messageLanes = data.l
      carDetected(messageHeat, messateState, messageLanes)
    } else if (messageCc === MSG_CPL_HEAT) {
      logger.info('%s::eventListener: received a heat setup complete message', MODULE_ID)
      if (data.s === ST_HEAT_SETUP) { // everything is okay
        let messageHeat = data.h
        let messageLines = data.l
        heatSetupComplete(messageHeat, messageLines)
      }
    } else if (messageCc === MSG_REP_LASER) {
      logger.info('%s::eventListener: received a laser setup message', MODULE_ID)
      if (data.s === 11) {
        laserSetup(data.l)
      }
    }
  })
}

module.exports = {
  init: init,
  initRace: initRace,
  initHeat: initHeat,
  startHeat: startHeat,
  startSetupRT: startSetupRT,
  stopSetupRT: stopSetupRT
}
