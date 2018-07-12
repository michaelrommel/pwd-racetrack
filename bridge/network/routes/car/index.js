const MODULE_ID = 'car'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')

var carDb

function listCars (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  let cars = []
  carDb.createValueStream()
    .on('data', function (data) {
      logger.debug('Received data: %s', data)
      cars.push(data)
    })
    .on('error', function (err) {
      logger.error('Error getting cars: %s', err)
      return next(new httpErr.InternalServerError('Error retrieving car information'))
    })
    .on('end', function () {
      res.send(200, cars)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
}

function importCars (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.body === undefined ||
    req.body.rf === undefined ||
    req.body.ow === undefined ||
    req.body.name === undefined ||
    req.body.country === undefined ||
    req.body.mn === undefined ||
    req.body.sn === undefined
  ) {
    logger.error('Received incomplete create car information')
    return next(new httpErr.BadRequestError('Incomplete create car information.'))
  }
  carDb.put(req.body.rf, req.body)

  res.send(201, req.body)
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function getCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.params === undefined ||
    req.params.id === undefined
  ) {
    logger.error('Received incomplete get car information')
    return next(new httpErr.BadRequestError('Incomplete get car information.'))
  } else {
    carDb.get(req.params.id, function (err, value) {
      if (err) {
        if (err.notFound) {
          logger.error('Could not find specified car')
          return next(new httpErr.BadRequestError('Could not retrieve car information.'))
        }
      }
      res.send(value)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
  }
}

function createCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.params === undefined ||
    req.params.id === undefined ||
    req.body === undefined ||
    req.body.rf === undefined ||
    req.body.ow === undefined ||
    req.body.name === undefined ||
    req.body.country === undefined ||
    req.body.mn === undefined ||
    req.body.sn === undefined
  ) {
    logger.error('Received incomplete create car information')
    return next(new httpErr.BadRequestError('Incomplete create car information.'))
  }
  carDb.put(req.params.id, req.body)

  res.send(201, req.body)
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function updateCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.params === undefined ||
    req.params.id === undefined ||
    req.body === undefined ||
    req.body.rf === undefined ||
    req.body.ow === undefined ||
    req.body.name === undefined ||
    req.body.country === undefined ||
    req.body.mn === undefined ||
    req.body.sn === undefined
  ) {
    logger.error('Received incomplete update car information')
    return next(new httpErr.BadRequestError('Incomplete update car information.'))
  }

  carDb.put(req.params.id, req.body)
  res.send(202, req.body)
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function deleteCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.params === undefined ||
      req.params.id === undefined
  ) {
    logger.error('Received incomplete delete car information')
    return next(new httpErr.BadRequestError('Incomplete delete car information.'))
  } else {
    let key = req.params.id
    carDb.del(key, function (err) {
      if (err) {
        return next(new httpErr.BadRequestError('Specified car could not be deleted.'))
      }

      res.send(200)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
  }
}

module.exports = (server, db) => {
  carDb = db.car
  server.get('/car', listCars)
  server.post('/car', importCars)
  server.get('/car/:id', getCar)
  server.post('/car/:id', createCar)
  server.put('/car/:id', updateCar)
  server.del('/car/:id', deleteCar)
}
