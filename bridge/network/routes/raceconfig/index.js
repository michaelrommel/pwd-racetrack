const MODULE_ID = 'raceconfig'
const logger = require('../../utils/logger')
const httpErr = require('restify-errors')

function listRaceconfigs (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function getRaceconfig (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function createRaceconfig (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server) => {
  server.get('/raceconfig', listRaceconfigs)
  server.get('/raceconfig/:id', getRaceconfig)
  server.post('/raceconfig/:id', createRaceconfig)
}
