const MODULE_ID = 'race'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')

var serial

async function startSetupRT (req, res, next) {
  logger.info('%s::startSetupRT: request received', MODULE_ID)

  serial.startSetupRT()

  res.json(200, {'msg':'Setup of Racetrack started'})
  logger.info('%s::startSetupRT: response sent', MODULE_ID)
}

async function stopSetupRT (req, res, next) {
  logger.info('%s::stopSetupRT: request received', MODULE_ID)

  serial.stopSetupRT()

  res.json(200, {'msg':'Setup of Racetrack stopped'})
  logger.info('%s::stopSetupRT: response sent', MODULE_ID)
}

module.exports = (server, db, ser) => {
  serial = ser
  server.get('/track/startsetuprt', startSetupRT)
  server.get('/track/stopsetuprt', stopSetupRT)
}
