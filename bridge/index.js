const MODULE_ID = 'main'
const config = require('./utils/config')
const logger = require('./utils/logger')
const level = require('level')

logger.info('%s: initializing', MODULE_ID)

// get all databases
var db = require('./db')
// get the modules for network communication
const network = require('./network')
// get the modules for serial communication
const serial = require('./serial')

// initialize Serial communication
serial.init({lanedb, heatdb, leaderboarddb, highscoredb})

// initialize Network communication
network.init({db, serial});

