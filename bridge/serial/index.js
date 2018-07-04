const logger = require('../utils/logger')
const level = require('level')

const MSG_ACK = "a";
const MSG_INIT_HEAT = "i";
const MSG_START_HEAT = "g";
const MSG_PROG_HEAT = "p";
const MSG_DET_CAR = "d";
const MSG_CPL_HEAT = "c";
const MSG_SET_TRACK = "s";
const MSG_REP_LASER = "l";

const ST_OK = 0;
const ST_HEAT_SETUP = 1;
const ST_HEAT_UNKWN = 5;
const ST_COR_LANE = 6;
const ST_WRO_LANE = 7;
const ST_TR_SET_START = 10;
const ST_TR_SET_STOP = 12;
const ST_ERROR = 101;

const MSG_STATE_PENDING = 0;
const MSG_STATE_ACK = 1;

const MSG_QUEUE_STOPPED = false;
const MSG_QUEUE_RUNNING = true;


var msg_id_counter = 0;
var msg_queue_status = MSG_QUEUE_STOPPED;
var msg_queue_timer = null;
var msg_queue_open = [];
var msg_queue_complete = [];

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
var sendMsg = function (msg, msg_id) {

	msg_id = msg_id || -1;
	
	if (msg_id == -1) { // new message that is not yet in queue
		msg_id == msg_id_counter++; // generating new unique msg id
		msg_queue_item = {};
		msg_queue_item.id = msg_id;
		msg_queue_item.msg = msg;
		msg_queue_item.msg.id = msg_id;
		msg_queue_item.state = MSG_STATE_PENDING;
		msg_queue_open.push(msg_queue_item);

		if (msg_queue_status == MSG_QUEUE_STOPPED) { // timer not running, start it

			msg_queue_timer = setInterval(check_msg_queue, TIMER_DELAY);
			msg_queue_status = MSG_QUEUE_RUNNING;
		}
	}

	port.send(JSON.stringify(msg));
}


// function for checking message queue periodically and triggering resend
// -----------------
// params
//
var check_msg_queue = function () {

	for (i = 0; i < msg_queue_open.length; i++) { // looping through open msg queue

		if (msg_queue_open[i].state == MSG_STATE_PENDING) { // msg still unacknowledged, resend
			sendMsg(msg_queue_open[i].msg, msg_queue_open[i].id);
		} else { // msg already acknowledged, pop from open msg queue
			msg_queue_complete.push(msg_queue_open[i]);
			msg_queue_open.splice(i, 1);
		}
	}

	if (msg_queue_open == 0) { // msg queue is empty, we can stop timer
		
		clearInterval(msg_queue_timer);
		msg_queue_timer = null;
		msg_queue_status = MSG_QUEUE_STOPPED;
	}
}


// function for acknowledging messages from race track
// -----------------
// params
//
var ack = function (id, state) {

	let msg = {};
	msg.id = id;
	msg.c = MSG_ACK;
	if (state == true) {
		msg.s = ST_OK;
	} else if (state == false) {
		msg.s = ST_ERROR;
	}
	
	sendMsg(msg);
}

// Start the setup of the racetrack 
var setupRT = function() {

	let msg = {};
	msg.c = MSG_SET_TRACK;
	msg.s = ST_TR_SET_START;

	sendMsg(msg);
}

// Start the setup of the racetrack
var stopSetupRT = function() {

	let msg = {};
	msg.c = MSG_SET_TRACK;
	msg.s = ST_TR_SET_STOP;

	sendMsg(msg);
}


// function for initializing a heat
// ----------------
// params
//
var initHeat = function (heat_id) {

	let msg = {};
	msg.id = id;
	msg.c = MSG_INIT_HEAT;
	msg.h = heat_id;
	msg.l = [];

	// either receive car information via function call 
	// from outside or retrieve information directly from db

	sendMsg(msg);
}


// function for starting a heat
// ----------------
// params
//
var startHeat = function (heat_id) {

	let msg = {};
	msg.c = MSG_START_HEAT;
	msg.h = heat_id;

	sendMsg(msg);
}

// function for updating heat information
// ----------------
// params
//
var updateHeat = function (heat_id, heat_status, lanes) {

	dto = {};
	dto.heat = heat_id;
	dto.lanes = lanes;

	if (message_state == 2) { // we have received the progess for an ongoing heat
		// simply update heat status	
		dto.state = 'running';
		
	} else if (message_state == 3) { // we have received the progess for a finished heat

		dto.state = 'finished';
		// update highscore and leaderboard
	}


	let heatdb = level('../db/heatdb');

	heatdb.put("2018-Race", dto);

	/*
	 heatdb.get(heat_id, function(err, value) {
		if (err) { // some error occured
			if (err.notFound) { // key not found, heat does not exist yet in db
			
			}

		} else { // heat found in db, insert new information

		}
	}
	
	// show all key-value pairs
	heatdb.createReadStream()
	  .on('data', function (data) {
	    logger.info('Key=%s, Value=%s', data.key, data.value)
	  })
	  .on('error', function (err) {
	    logger.info('Error while reading db stream: %s!', err)
	  })
	  .on('close', function () {
	    logger.info('DB stream closed')
	  })
	  .on('end', function () {
	    logger.info('Stream ended')
	  })
	  */
}


// function for car detection
// ---------------
// params
//
var carDetected = function (heat_id, msg_state, lanes) {
	
	dto = {};
	dto.status = "nok";
	dto.heat = heat_id;
	dto.lanes = []
	
	for (int i = 0; i < lanes.length; i++) {
		lane = lanes[i];
		lane.lane = i;

		if (msg_state == ST_HEAT_UNKNWN) {

			lane.state = "nok";
			dto.lanes.push(lane);
		} else if (msg_state == ST_COR_LANE) {

			lane.state = "ok";
			dto.lanes.push(lane);
		} else if (msg_state == ST_WRO_LANE) {

			lane.state = "nok";
			dto.lanes.push(lane);
		}
	}

	saveLaneStatus(dto);
}


// function for detection of heat setup complete
// -----------
// params
//
var heatSetupComplete = function(heatid, lanes) {

	dto = {};
	dto.status = "ok";
	dto.heat = heat_id;
	dto.lanes = [];

	for (int i = 0; i < lanes.length; i++) {

		lane = lanes[i];
		lane.lane = i;
		lane.state = "ok";
		dto.lanes.push(lane);
	}

	saveLaneStatus(dto);
}


// function for pushin lane status to database
// -----------
// params
//
var saveLaneStatus = function(laneDto) {

	let laneDB = level('../db/lanedb');

	laneDB.put("2018-Race", laneDto)
}


// function for laser setup measurement 
// -----------
// params
//
var laserSetup = function(laser_data) {
	// message laser setup measurements do db or somewhere else ??

}

// event listener for incomming data from race track
port.on('readable', function () {
  let newdata = port.read().toString('utf8')
  logger.info('got serial data: %s', newdata)

  try {
 
    data = JSON.parse(newdata);
  } catch (err) {
    logger.error('Error parsing input data to JSON obj: %s', err.message);
    // error acknowledgement
    // id cannot be transmitted if JSON obj is malformed and cannot be parsed
  }

  message_id = data.id;
  logger.debug('JSON data (message ID): %i', message_id);

  // message received completely, acknowledge
  ack(message_id, true);

  message_cc = data.c;

  if (message_cc == MSG_ACK) { // we have received a message acknowledge
	  for (int i = 0; i < msg_queue_open.length; i++) {

		  if (msg_queue_open[i].id == message_id) {

			  if (data.s == ST_OK) {

				  msg_queue_open[i].state = MSG_STATE_ACK;
			  } else if (data.s == ST_ERROR) {

				  sendMsg(msg_queue_open[i].msg, message_id);
			  }
		  }
		  break;
	  }

  } else if (message_cc == MSG_PROG_HEAT) { // we have received a progess update
	  message_heat = data.h;
	  message_state = data.s;
	  message_lanes = data.l;

	  updateHeat(message_heat, messate_state, message_lanes);

  } else if (message_cc == MSG_DET_CAR) {
	  message_heat = data.h;
	  message_state = data.s;
	  message_lanes = data.l;

	  carDetected(message_heat, message_state, message_lanes);

  } else if (message_cc == MSG_CPL_HEAT) {
	  if (data.s == ST_HEAT_SETUP) { // everything is okay
		  message_heat = data.h;
		  message_lines = data.l;

		  heatSetupComplete(message_heat, message_lines);

	  }
  } else if (message_cc == MSG_REP_LASER) {
	  if ( data.s == 11) {
		laserSetup(data.l);
	  }
  }

})


var serial_commer;
serial_commer.setupRT = setupRT
serial_commer.stopSetupRT = stopSetupRT
serial_commer.initHeat = initHeat
serial_commer.startHeat = startHeat

modules.export = serial_commer
