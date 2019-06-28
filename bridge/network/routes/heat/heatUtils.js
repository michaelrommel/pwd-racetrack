const MODULE_ID = 'heatUtils'
const logger = require('../../../utils/logger')
const raceconfigUtils = require('../raceconfig/raceconfigUtils')

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
  } catch (err) {
    // could not find race
    logger.error('%s::initializeHeats: could not find race %s', MODULE_ID, raceId)
    throw new UserException('raceerror', raceId)
  }

  let countLanes = race.lanes
  let countCars = race.countCars
  let rounds = race.rounds
  let offset = race.startAt
  let raceCars = race.cars
  let raceConfigKey = '' + countCars + '-' + countLanes + '-' + rounds
  let raceConfig
  let heatCount
  let heatConfigList
  let lowerBound
  let upperBound

  try {
    raceConfig = await raceConfigDb.get(raceConfigKey)
  } catch (err) {
    // we could not find a suitable race configuration in the database
    // lets try to create one
    raceConfig = raceconfigUtils.createRaceConfig(countLanes, countCars, rounds)
    logger.info('%s::initializeHeats: raceconfig %s generated', MODULE_ID, raceConfigKey)
    if (raceConfig !== undefined) {
      try {
        await raceConfigDb.put(raceConfigKey, raceConfig)
        logger.info('%s::initializeHeats: raceconfig %s persisted', MODULE_ID, raceConfigKey)
      } catch (err) {
        logger.error('%s::initializeHeats: could not persist raceconfig %s', MODULE_ID, raceConfigKey)
      }
    }
  }

  if (raceConfig !== undefined) {
    delHeatsForRace(raceId)
    logger.debug('%s::initializeHeats: raceconfig %s loaded', MODULE_ID, raceConfigKey)
    heatConfigList = raceConfig.heats
    heatCount = Object.keys(raceConfig.heats).length
    // we found a race config or could create one
    if (typeof heatSpec === 'number') {
      // set the bounds of the loop so that only one heat is initialized
      lowerBound = heatSpec
      upperBound = heatSpec
    } else {
      // presumably 'all' was specified, heatnumbers start at 1
      lowerBound = 1
      upperBound = 1 + heatCount
    }
    logger.debug('%s::initializeHeats: generating heats from %s to %s', MODULE_ID, lowerBound, upperBound)

    // iterate through configuration of heats in race config
    for (var i = lowerBound; i < upperBound; i++) {
      let heat = {}
      let finalHeatNumber = i + offset - 1
      let heatConfig = heatConfigList[i]

      heat.heat = finalHeatNumber
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
      let heatKey = raceId + '-' + ('0' + finalHeatNumber).slice(-2)
      logger.debug('%s::initializeHeats: heatkey: %s, heat: %s', MODULE_ID,
        heatKey, JSON.stringify(heat, null, 2))
      try {
        await heatDb.put(heatKey, heat)
      } catch (err) {
        logger.error('%s::initializeHeats: could not save heat %s into heat db', MODULE_ID, heatKey)
        logger.error('%s::initializeHeats: error was: %s', MODULE_ID, err)
        throw new UserException('heaterror', heatKey)
      }
    }
  } else {
    // we could not find or create a suitable race configuration
    logger.error('%s::initializeHeats: no suitable raceconfig %s found',
      MODULE_ID, raceConfigKey)
    throw new UserException('raceconfigerror', raceConfigKey)
  }
}

// This function retrieves the raceconfig for a given race
async function getRaceConfigAndCars (raceId) {
  let race
  try {
    race = await raceDb.get(raceId)
    let countLanes = race.lanes
    let countCars = race.countCars
    let rounds = race.rounds
    let raceConfigKey = '' + countCars + '-' + countLanes + '-' + rounds
    let raceConfig
    try {
      raceConfig = await raceConfigDb.get(raceConfigKey)
      return { 'raceconfig': raceConfig, 'cars': race.cars, 'startAt': race.startAt }
    } catch (err) {
      // we could not find a suitable race configuration in the database
      logger.error('%s::getRaceConfigAndCars: no suitable race configuration %s found', MODULE_ID, raceConfigKey)
      logger.error('%s::getRaceConfigAndCars: error was: %s', MODULE_ID, err)
      throw new UserException('raceconfigerror', raceConfigKey)
    }
  } catch (err) {
    // could not find race
    logger.error('%s::getRaceConfigAndCars: could not find race %s', MODULE_ID, raceId)
    throw new UserException('raceerror', raceId)
  }
}

async function delHeatsForRace (raceId) {
  logger.info('%s::delHeatsForRace: deleting heats for %s', MODULE_ID, raceId)
  let filter = new RegExp(raceId, 'g')
  let heatsToDelete = []
  heatDb.createReadStream()
    .on('data', function (data) {
      if (data.key.match(filter)) {
        heatsToDelete.push(data.key)
      }
    })
    .on('error', function (err) {
      logger.error('%s: Error getting heat: %s', MODULE_ID, err)
    })
    .on('end', function () {
      heatsToDelete.map((heatkey) => {
        heatDb.del(heatkey)
      })
      logger.info('%s: deleted heats: %s', MODULE_ID, JSON.stringify(heatsToDelete, null, 0))
    })
}

module.exports = {
  setContext: setContext,
  initializeHeats: initializeHeats,
  getRaceConfigAndCars: getRaceConfigAndCars
}
