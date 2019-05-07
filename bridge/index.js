const MODULE_ID = 'main'
const logger = require('./utils/logger')

logger.info('%s: initializing', MODULE_ID)

// variable that holds the current raceID
var raceId = '2018-Race'

// get all databases
var db = require('./db')

// get the modules for network communication
const network = require('./network')
// get the modules for serial communication
const serial = require('./serial')

logger.debug('%s: restoring running state', MODULE_ID)
db.checkpoint.get('raceId')
  .then((val) => {
    logger.debug('%s: restored raceId as %s', MODULE_ID, val)
    raceId = val
    // initialize Serial communication
    serial.init({ db, raceId })
  })
  .catch((err) => {
    logger.debug('%s: Could not retrieve raceId, error: %s', MODULE_ID, err)
    serial.init({ db, raceId })
  })

// initialize Network communication
network.init({ db, serial })
