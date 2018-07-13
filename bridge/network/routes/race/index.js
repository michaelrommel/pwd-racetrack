const MODULE_ID = 'race'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')
var raceDb
var heatDb
var raceConfigDb
var carDb
var leaderboardDb
var highscoreDb

function listRaces (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  let races = []
  carDb.createReadStream()
    .on('data', function (data) {
      logger.debug('%s: Received data: %s', MODULE_ID, data)
      let race = {}
      race[data.key] = data.value
      races.push(race)
    })
    .on('error', function (err) {
      logger.error('%s: Error getting races: %s', MODULE_ID, err)
      return next(new httpErr.InternalServerError('Error retrieving race information'))
    })
    .on('end', function () {
      res.send(200, races)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
}

async function initRace (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined 
  ) {
    logger.error('%s: Received incomplete create race information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete create race information.'))
  }

  let raceKey = req.params.id
  serial.initRace(raceKey)

  try {
    race = await raceDb.get(raceKey)
    initializeHeats(raceKey, race['lanes'], race['cars'].length, race['cars'])
    res.send(200, race)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s: Unable to insert race information into database', MODULE_ID)
    return next(new httpErr.InternalServerError('Could not create race'))
  }
}

async function createRace (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined ||
      req.body.description === undefined ||
      req.body.lanes === undefined ||
      req.body.cars === undefined ||
      req.body.cars.length < 20) {
    logger.error('%s: Received incomplete create race information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete create race information.'))
  }

  let raceKey = req.params.id
  let countCars = req.body.cars.length
  let race = {}
  race['description'] = req.body.description
  race['lanes'] = req.body.lanes
  race['cars'] = req.body.cars
  race['heatsQuali'] = countCars
  race['heatsFinals'] = 14
  race['finalCarCount'] = 7

  try {
    await raceDb.put(raceKey, race)
    initializeHeats(raceKey, race['lanes'], countCars, race['cars'])

    res.send(201, race)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s: Unable to insert race information into database', MODULE_ID)
    return next(new httpErr.InternalServerError('Could not create race'))
  }
}

async function initializeHeats (raceKey, countLanes, countCars, raceCars) {
  let raceConfigKey = '' + countLanes + '-' + countCars

  try {
    let raceConfig = await raceConfigDb.get(raceConfigKey)

    let heatsConfig = raceConfig.heats

    for (var i = 0; i < heatsConfig.length; i++) { // iterate through configuration of heats in race config
      let heat = {}
      let heatConfig = heatsConfig[i]
      let heatId = heatsConfig[i].keys()[0]
      heat.heat = parseInt(heatId)
      heat.status = ''
      heat.results = []
      for (var k = 0; k < heatConfig[heatId].length; k++) { // iterate through lane/car config in individual heat config
        for (var m = 0; m < raceCars.length; m++) { // iterate through cars in specific race to find the corresponding rfid for race car number
          let raceCarKey = raceCars[m].keys()[0]
          if (raceCarKey === ('' + heatConfig[heatId])) {
            let rf = raceCars[raceCarKey]
            let car = await carDb.get(rf) // getting car information from car db for given rfid
            let result = {}
            result.rf = car.rf
            result.ow = car.ow
            result.mn = car.mn
            result.sn = car.sn
            result.t = 0
            result.score = 0

            heat.results.push(result)

            break
          }
        }
      }

      let heatKey = raceKey + '-' + ('0' + heatId).slice(-2)
      await heatDb.put(heatKey, heat)
    }
  } catch (err) {
    throw err
  }
}

function getLeaderboard (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined) {
    logger.error('%s: Received incomplete get leaderboard request', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete get leader board request.'))
  }

  leaderboardDb.get(req.params.id, function (err, value) {
    if (err) {
      if (err.notFound) {
        logger.error('%s: Received incorrect get leaderboard request', MODULE_ID)
        return next(new httpErr.BadRequestError('Incorrect get leader board request.'))
      }
      logger.error('%s: Error retrieving leaderboard from database', MODULE_ID)
      return next(new httpErr.BadRequestError('Unable to process get leaderboard request.'))
    }

    res.send(value)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  })
}

function getHighscores (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined) {
    logger.error('%s: Received incomplete get highscore request', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete get highscore request.'))
  }

  highscoreDb.get(req.params.id, function (err, value) {
    if (err) {
      if (err.notFound) {
        logger.error('%s: Received incorrect get highscore request', MODULE_ID)
        return next(new httpErr.BadRequestError('Incorrect get highscore request.'))
      }
      logger.error('%s: Error retrieving highscore from database', MODULE_ID)
      return next(new httpErr.BadRequestError('Unable to process get highscore request.'))
    }

    res.send(value)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  })
}

module.exports = (server, db, serial) => {
  raceDb = db.race
  heatDb = db.heat
  raceConfigDb = db.raceconfig
  carDb = db.car
  leaderboardDb = db.leaderboard
  highscoreDb = db.highscoreDb
  server.get('/race', listRaces)
  server.post('/race/:id', createRace)
  server.post('/race/init/:id', initRace)
  server.get('/race/leaderboard/:id', getLeaderboard)
  server.get('/race/highscores/:id', getHighscores)
}
