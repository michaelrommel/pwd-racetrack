const MODULE_ID = 'car'
const logger = require('../../utils/logger')
const httpErr = require('restify-errors')

function listCars (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function importCars (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function getCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function createCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function updateCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function deleteCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server) => {
  server.get('/car', listCars)
  server.post('/car', importCars)
  server.get('/car/:id', getCar)
  server.post('/car/:id', createCar)
  server.put('/car/:id', updateCar)
  server.del('/car/:id', deleteCar)
}
