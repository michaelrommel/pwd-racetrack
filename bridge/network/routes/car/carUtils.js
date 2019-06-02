const MODULE_ID = 'carUtils'
const logger = require('../../../utils/logger')

let carDb

function setContext (ctx) {
  carDb = ctx.db.car
}

function UserException (id, msg) {
  this.id = id
  this.msg = msg
}

async function updateCar (rf, car) {
  logger.info('%s::updateCar: request received', MODULE_ID)

  try {
    await carDb.put(rf, car)
    logger.info('%s::updateCar: car %s successfully updated or created!',
      MODULE_ID, rf)
    return (car)
  } catch (err) {
    logger.error('%s::updateCar: Could not store car %s!', MODULE_ID, rf)
    throw new UserException('storeError', rf)
  }
}

async function createCar (rf, car) {
  logger.info('%s::createCar: request received', MODULE_ID)

  try {
    await carDb.get(rf)
    logger.warn('%s::createCar: car %s already exists!', MODULE_ID, rf)
    throw new UserException('duplicateCar', rf)
  } catch (err) {
    if (err.notFound) {
      try {
        let storedCar = await updateCar(rf, car)
        return (storedCar)
      } catch (err) {
        if (err.id === 'storeError') {
          logger.error('%s::createCar: Could not store car %s!', MODULE_ID, rf)
        } else {
          logger.error('%s::createCar: error while creating user: %s', MODULE_ID, err)
        }
        throw (err)
      }
    } else {
      // other unspecified error
      logger.error('%s::createCar: error storing car in database', MODULE_ID, err)
      throw (err)
    }
  }
}

module.exports = {
  setContext: setContext,
  updateCar: updateCar,
  createCar: createCar
}
