const MODULE_ID = 'heat'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')
var serialCom

function getHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function getCurrentHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function getNextHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function markCurrentHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function markNextHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function initHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function startHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  serialCom.startHeat(req.params.id)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server, db, serial) => {
  serialCom = serial
  server.get('/heat/:id', getHeat)
  server.get('/heat/current', getCurrentHeat)
  server.get('/heat/next', getNextHeat)
  server.put('/heat/current/:id', markCurrentHeat)
  server.put('/heat/next/:id', markNextHeat)
  server.put('/heat/init/:id', initHeat)
  server.put('/heat/go/:id', startHeat)
}
