const MODULE_ID = 'main'
const config = require('./utils/config')
const logger = require('./utils/logger')
const level = require('level')
const util = require('util')

logger.info('%s: initializing', MODULE_ID)

// variable that holds the current raceID
var raceId = '2018-Race'

// get all databases
var db = require('./db')

// get the modules for network communication
const network = require('./network')
// get the modules for serial communication
const serial = require('./serial')

logger.debug('restoring running state')
db.checkpoint.get('raceId')
  .then((val) => {
    logger.debug('restored raceId as %s', val)
    raceId = val
    // initialize Serial communication
    serial.init({db, raceId})
  })
  .catch((err) => {
    logger.debug('Could not retrieve raceId')
    serial.init({db, raceId})
  })

// initialize Network communication
network.init({db, serial})
