const MODULE_ID = 'heatUtils'
const logger = require('../../../utils/logger')

let heatDb
let carDb
let raceDb
let raceConfigDb

function setContext (db) {
  carDb = db.car
  heatDb = db.heat
  raceDb = db.race
  raceConfigDb = db.raceconfig
}

function UserException (id, msg) {
  this.id = id
  this.msg = msg
}

// This function gets the race configuration of a given race and retrieves the raceconfig
// and creates the necessary heat database entries
async function initializeHeats (raceId, heatSpec) {
  let race
  try {
    race = await raceDb.get(raceId)
    let countLanes = race.lanes
    let heatsQuali = race.heatsQuali
    let raceCars = race.cars
    let raceConfigKey = '' + countLanes + '-' + heatsQuali
    let raceConfig
    let heatConfigList
    let lowerBound
    let upperBound
    try {
      raceConfig = await raceConfigDb.get(raceConfigKey)
      heatConfigList = raceConfig.heats

      if (typeof heatSpec === 'number') {
        // set the bounds of the loop so that only one heat is initialized
        lowerBound = heatSpec
        upperBound = heatSpec + 1
      } else {
        // 'all' was specified
        lowerBound = 0
        upperBound = heatsQuali
      }

      // iterate through configuration of heats in race config
      for (var i = lowerBound; i < upperBound; i++) {
        let heat = {}
        let heatId = i
        let heatConfig = heatConfigList[i]
        heat.heat = i
        heat.status = ''
        heat.results = []
        // iterate through lane/car config in individual heat config
        for (var l = 0; l < heatConfig.length; l++) {
          // get the startnumber of the car in this lane
          let startNumber = heatConfig[l]
          // iterate through cars in specific race to find the corresponding rfid for race car number
          let rf = raceCars[startNumber]
          let result = {}
          try {
            let car = await carDb.get(rf) // getting car information from car db for given rfid
            result.rf = car.rf
            result.ow = car.ow
            result.mn = car.mn
            result.sn = car.sn
          } catch (err) {
            logger.error('%s::initializeHeats: could not find car with RFID %s', MODULE_ID, rf)
            logger.error('%s::initializeHeats: error was: %s', MODULE_ID, err)
            result.rf = '00000000000000'
            result.ow = 'dummmy'
            result.mn = 0
            result.sn = 0
          }
          result.t = 0
          result.score = 0
          heat.results.push(result)
        }

        // put all information about all cars in this heat into the heatDb
        let heatKey = raceId + '-' + ('0' + heatId).slice(-2)
        try {
          await heatDb.put(heatKey, heat)
        } catch (err) {
          logger.error('%s::initializeHeats: could not save heat %s into heat db', MODULE_ID, heatKey)
          logger.error('%s::initializeHeats: error was: %s', MODULE_ID, err)
          throw new UserException('heaterror', heatKey)
        }
      }
    } catch (err) {
      // we could not find a suitable race configuration in the database
      logger.error('%s::initializeHeats: no suitable race configuration %s found', MODULE_ID, raceConfigKey)
      logger.error('%s::initializeHeats: error was: %s', MODULE_ID, err)
      throw new UserException('raceconfigerror', raceConfigKey)
    }
  } catch (err) {
    // could not find race
    logger.error('%s::initializeHeats: could not find race %s', MODULE_ID, raceId)
    throw new UserException('raceerror', raceId)
  }
}

// This function retrieves the raceconfig for a given race
async function getRaceConfigAndCars (raceId) {
  let race
  try {
    race = await raceDb.get(raceId)
    let countLanes = race.lanes
    let heatsQuali = race.heatsQuali
    let raceConfigKey = '' + countLanes + '-' + heatsQuali
    let raceConfig
    try {
      raceConfig = await raceConfigDb.get(raceConfigKey)
      return {'raceconfig': raceConfig, 'cars': race.cars}
    } catch (err) {
      // we could not find a suitable race configuration in the database
      logger.error('%s::getRaceConfig: no suitable race configuration %s found', MODULE_ID, raceConfigKey)
      logger.error('%s::getRaceConfig: error was: %s', MODULE_ID, err)
      throw new UserException('raceconfigerror', raceConfigKey)
    }
  } catch (err) {
    // could not find race
    logger.error('%s::getRaceConfig: could not find race %s', MODULE_ID, raceId)
    throw new UserException('raceerror', raceId)
  }
}

module.exports = {
  setContext: setContext,
  initializeHeats: initializeHeats,
  getRaceConfigAndCars: getRaceConfigAndCars
}
