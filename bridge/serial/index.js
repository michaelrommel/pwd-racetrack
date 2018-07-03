const logger = require('../utils/logger')
const level = require('level')



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

// function for sending JSON objects over the line
// -----------------
// params
//
var sendObj = function (obj) {

	// to do: internal handling of message identifier
	// something like "if !(obj.id) { obj.id = i++ }
	// message queue required ??
	//
	// handling of ack returns ??

	port.send(JSON.stringify(obj));
}


// function for acknowledging messages from race track
// -----------------
// params
//
var ack = function (id, state) {

	let msg = {};
	msg.id = id;
	msg.c = "a";
	if (state == true) {
		msg.s = 0;
	} else if (state == false) {
		msg.s = 101;
	}
	
	sendObj(msg);
}

// Start the setup of the racetrack var setupRT = function() {

	let msg = {};
	msg.c = "s";
	msg.s = 10;

	sendObj(msg);
}

// Start the setup of the racetrack
var stopSetupRT = function() {

	let msg = {};
	msg.c = "s";
	msg.s = 12;

	sendObj(msg);
}


// function for initializing a heat
// ----------------
// params
//
var initHeat = function (id) {

	let msg = {};
	msg.id = id;
	msg.c = "i";
	msg.h = 7;
	msg.l = [];

	// either receive car information via function call 
	// from outside or retrieve information directly from db

	sendObj(msg);
}


// function for starting a heat
// ----------------
// params
//
var startHeat = function () {

	let msg = {};
	msg.c = "g";
	msg.h = 7;

	sendObj(msg);
}

// function for updating heat information
// ----------------
// params
//
var updateHeat = function (heat_id, heat_status, lanes) {

	let heatdb = level('../db/heatdb');

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
}


// function for car detection
// ---------------
// params
//
var carDetected = function () {

}


// function for detection of heat setup complete
// -----------
// params
//
var heatSetupComplete = function(heat) {
	// message completion of heat setup do db or somewhere else ??

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
    // end ??
  }

  message_id = data.id;
  logger.debug('JSON data (message ID): %i', message_id);
  message_cc = data.c;

  if (message_cc == "p") { // we have received a progess update
	  message_heat = data.h;
	  message_state = data.s;
	  message_lanes = data.l;

	  if (message_state == 2) { // we have received the progess for an ongoing heat
		  // do nothing ?
	  } else if (message_state == 3) { // we have received the progess for a finished heat
		  // update heat db with finished heat information ? 
		  updateHeat(message_heat, messate_state, message_lanes);
	  }

  } else if (message_cc == "d") {
	  message_heat = data.h;
	  message_state = data.s;
	  message_lanes = data.l;

	  carDetected(message_heat, message_state, message_lanes);

  } else if (message_cc == "c") {
	  if (data.s == 1) { // everything is okay
		  message_heat = data.h;

		  heatSetupComplete(message_heat);

	  }
  } else if (message_cc == "l") {
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
