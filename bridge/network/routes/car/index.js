const MODULE_ID = 'car'
const logger = require('../../../utils/logger')
const errors = require('restify-errors')
const carUtils = require('./carUtils')

var ctx
var carDb

function listCars (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  let cars = []
  carDb.createReadStream()
    .on('data', function (data) {
      logger.debug('%s: Received data: %s', MODULE_ID, data)
      let car = {}
      car[data.key] = data.value
      cars.push(car)
    })
    .on('error', function (err) {
      logger.error('%s: Error getting cars: %s', MODULE_ID, err)
      return next(new errors.InternalServerError('Error retrieving car information'))
    })
    .on('end', function () {
      res.send(200, cars)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
}

async function importCars (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.body === undefined ||
    req.body.cars === undefined
  ) {
    logger.error('%s: Received incomplete create car information', MODULE_ID)
    return next(new errors.BadRequestError('Incomplete create car information.'))
  }

  let cars = req.body.cars
  let inserted = 0
  for (let i = 0; i < cars.length; i++) {
    if (
      cars[i].rf === undefined ||
      cars[i].ow === undefined ||
      cars[i].name === undefined ||
      cars[i].country === undefined ||
      cars[i].mn === undefined ||
      cars[i].sn === undefined
    ) {
      logger.error('%s: Skipping car with incomplete car information', MODULE_ID)
    } else {
      try {
        await carDb.put(cars[i].rf, cars[i])
        inserted++
      } catch (err) {
        logger.error('%s: Could not insert car #%d', MODULE_ID, i)
      }
    }
  }

  res.json(201, { 'inserted': inserted })
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function getCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.params === undefined ||
    req.params.id === undefined
  ) {
    logger.error('%s: Received incomplete get car information', MODULE_ID)
    return next(new errors.BadRequestError('Incomplete get car information.'))
  } else {
    carDb.get(req.params.id, function (err, value) {
      if (err) {
        if (err.notFound) {
          logger.error('%s: Could not find specified car', MODULE_ID)
          return next(
            new errors.BadRequestError('Could not retrieve car information.')
          )
        }
      }
      res.send(value)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
  }
}

async function createCar (req, res, next) {
  logger.info('%s::createCar: request received', MODULE_ID)

  if (req.user.role !== 'admin' &&
    req.user.role !== 'editor'
  ) {
    return res.send(
      new errors.ForbiddenError('You don\'t have sufficient privileges.')
    )
  }

  if (
    req.params === undefined ||
    req.params.id === undefined ||
    req.body === undefined ||
    req.body.rf === undefined ||
    req.body.ow === undefined ||
    req.body.name === undefined ||
    req.body.country === undefined ||
    req.body.mn === undefined ||
    req.body.sn === undefined) {
    logger.error('%s::createCar: Received incomplete create car information', MODULE_ID)
    return next(new errors.BadRequestError('Incomplete create car information.'))
  } else {
    carUtils.setContext(ctx)
    try {
      let car = await carUtils.createCar(req.params.id, req.body)
      if (car) {
        // creation successful
        let response = { 'success': true, 'data': car }
        res.send(201, response)
        logger.info('%s::createCar: response sent', MODULE_ID)
        return next()
      } else {
        logger.error('%s::createCar: Could not create car', MODULE_ID)
        return next(new errors.InternalServerError('Error storing car.'))
      }
    } catch (err) {
      if (err.id === 'duplicateCar') {
        return next(new errors.ConflictError(
          { 'info': { 'car': req.params.id } },
          'Car already exists.')
        )
      } else {
        logger.error('%s::createCar: Could not create car', MODULE_ID)
        return next(new errors.InternalServerError('Could not create car.'))
      }
    }
  }
}

async function updateCar (req, res, next) {
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
    req.body.sn === undefined) {
    logger.error('%s: Received incomplete update car information', MODULE_ID)
    return next(new errors.BadRequestError('Incomplete update car information.'))
  } else {
    try {
      let car = await carUtils.updateCar(req.params.id, req.body)
      if (car) {
        // creation successful
        let response = { 'success': true, 'data': car }
        res.send(202, response)
        return next()
      } else {
        logger.error('%s::updateCar: carutils returned nothing', MODULE_ID)
        return next(new errors.InternalServerError('Could not update car.'))
      }
    } catch (err) {
      // other unspecified error
      logger.error('%s::updateCar: unknown error %s', MODULE_ID, err)
      return next(new errors.InternalServerError('Could not update car.'))
    }
  }
}

function deleteCar (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.params === undefined ||
      req.params.id === undefined
  ) {
    logger.error('%s: Received incomplete delete car information', MODULE_ID)
    return next(new errors.BadRequestError('Incomplete delete car information.'))
  } else {
    let key = req.params.id
    carDb.del(key, function (err) {
      if (err) {
        return next(new errors.BadRequestError('Specified car could not be deleted.'))
      }

      res.send(200)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
  }
}

module.exports = (server, db) => {
  ctx = { server, db }
  carDb = db.car
  server.get('/car', listCars)
  server.post('/car', importCars)
  server.get('/car/:id', getCar)
  server.post('/car/:id', createCar)
  server.put('/car/:id', updateCar)
  server.del('/car/:id', deleteCar)
}
