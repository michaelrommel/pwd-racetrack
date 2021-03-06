const MODULE_ID = 'race'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')
const heatUtils = require('../heat/heatUtils')
const raceUtils = require('../race/raceUtils')

var serial

var laneDb
var raceDb
var heatDb
var leaderboardDb
var highscoreDb
var checkpointDb

function listRaces (req, res, next) {
  logger.info('%s::listRaces: request received', MODULE_ID)
  let races = []
  raceDb.createReadStream()
    .on('data', function (data) {
      logger.debug('%s::listRaces: Received data: %s', MODULE_ID, data)
      let race = {}
      race[data.key] = data.value
      races.push(race)
    })
    .on('error', function (err) {
      logger.error('%s::listRaces: Error getting races: %s', MODULE_ID, err)
      return next(new httpErr.InternalServerError('Error retrieving race information'))
    })
    .on('end', function () {
      res.send(200, races)
      logger.info('%s::listRaces: response sent', MODULE_ID)
      return next()
    })
}

function getCurrentRace (req, res, next) {
  logger.info('%s::getCurrentRace: request received', MODULE_ID)
  res.send(200, { 'raceId': serial.getRaceId() })
  logger.info('%s::GetCurrentRace: response sent', MODULE_ID)
  return next()
}

async function getRace (req, res, next) {
  logger.info('%s::getRace: request received', MODULE_ID)
  if (req.params === undefined ||
      req.params.id === undefined
  ) {
    logger.error('%s::getRace: No raceId provided', MODULE_ID)
    return next(new httpErr.BadRequestError('No raceId provided'))
  }
  let raceId = req.params.id
  try {
    var race = await raceDb.get(raceId)
    res.send(200, race)
    logger.info('%s::GetRace: response sent', MODULE_ID)
    return next()
  } catch (err) {
    if (race === undefined) {
      logger.error('%s::GetRace: could not find race in database: %s', MODULE_ID, err)
    }
    return next(new httpErr.InternalServerError('Could not find race'))
  }
}

async function getHeatsForRace (req, res, next) {
  logger.info('%s::getRace: request received', MODULE_ID)
  if (req.params === undefined ||
      req.params.id === undefined
  ) {
    logger.error('%s::getRace: No raceId provided', MODULE_ID)
    return next(new httpErr.BadRequestError('No raceId provided'))
  }
  let raceId = req.params.id
  let filter = new RegExp(raceId, 'g')
  let heats = []
  heatDb.createReadStream()
    .on('data', function (data) {
      // logger.debug('%s::getHeatsForRace: Received data: %s',
      //   MODULE_ID, JSON.stringify(data))
      if (data.key.match(filter)) {
        let heat = { ...data.value }
        heat['heatkey'] = data.key
        heats.push(heat)
      }
    })
    .on('error', function (err) {
      logger.error('%s: Error getting heat: %s', MODULE_ID, err)
      return next(new httpErr.InternalServerError('Error retrieving heat information'))
    })
    .on('end', function () {
      res.send(200, heats)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
}

async function initRace (req, res, next) {
  logger.info('%s::initRace: request received', MODULE_ID)
  if (req.params === undefined ||
      req.params.id === undefined
  ) {
    logger.error('%s::initRace: no raceId provided', MODULE_ID)
    return next(new httpErr.BadRequestError('no raceId provided'))
  }
  let raceId = req.params.id
  try {
    var race = await raceDb.get(raceId)

    // save the current active race in case of restarts of the bridge
    try {
      await checkpointDb.put('raceId', raceId)
      logger.debug('%s::initRace: saved raceId %s as checkpoint', MODULE_ID, raceId)
    } catch (err) {
      logger.error('%s::initRace: could not save raceId %s as checkpoint',
        MODULE_ID, raceId)
    }

    // the serial module deals with all messsages in one heat, this heat must
    // be initialized
    serial.initRace(raceId)

    res.send(200, race)
    logger.info('%s::initRace: response sent for %s', MODULE_ID, raceId)
    return next()
  } catch (err) {
    if (race === undefined) {
      logger.error('%s::initRace: could not find race in database: %s', MODULE_ID, err)
    }
    return next(new httpErr.InternalServerError('Could not find race'))
  }
}

async function createRace (req, res, next) {
  logger.info('%s::createRace: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined ||
      req.body === undefined ||
      req.body.description === undefined ||
      req.body.lanes === undefined ||
      req.body.rounds === undefined ||
      req.body.raceStatus === undefined ||
      req.body.startAt === undefined ||
      req.body.finalists === undefined ||
      req.body.cars === undefined) {
    logger.error('%s::createRace: Received incomplete create race information',
      MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete create race information.'))
  }

  let raceId = req.params.id
  let race = { ...req.body }
  let countCars = Object.keys(req.body.cars).length
  race['countCars'] = countCars

  try {
    await raceDb.put(raceId, race)
    try {
      await heatUtils.initializeHeats(raceId, 'all')
    } catch (err) {
      if (err.id === 'heaterror') {
        logger.error('%s::createRace: Unable to insert heat %s into heat database',
          MODULE_ID, err.msg)
        return next(new httpErr.InternalServerError('Could not insert heat'))
      } else if (err.id === 'raceconfigerror') {
        logger.error('%s::createRace: Unable to retrieve race configuration ' +
          '%s from raceconfig database', MODULE_ID, err.msg)
        return next(new httpErr.InternalServerError('Could not get raceconfig'))
      }
    }
    res.send(201, race)
    logger.info('%s::createRace: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s::createRace: Unable to insert race information into database',
      MODULE_ID)
    return next(new httpErr.InternalServerError('Could not create race'))
  }
}

function getLeaderboard (req, res, next) {
  logger.info('%s::getLeaderboard: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined) {
    logger.error('%s::getLeaderboard: received incomplete get leaderboard request',
      MODULE_ID)
    return next(new httpErr.BadRequestError('incomplete get leader board request.'))
  }

  leaderboardDb.get(req.params.id, function (err, leaderboard) {
    if (err) {
      if (err.notFound) {
        logger.error('%s::getLeaderboard: could not find leaderboard for race %s',
          MODULE_ID, req.params.id)
        return next(new httpErr.NotFoundError('could not find leaderboard.'))
      }
      logger.error('%s::getLeaderboard: error retrieving leaderboard for race %s ' +
        'from db', MODULE_ID, req.params.id)
      return next(new httpErr.InternalServerError('Unable to process ' +
        'getLeaderboard request.'))
    }
    // sort the whole leaderboard
    let top = Object.values(leaderboard)
    top.sort(raceUtils.sortByCumScoreAndTime)
    res.send(top)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  })
}

async function getHighscore (req, res, next) {
  logger.info('%s::getHighscore: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined) {
    logger.error('%s::getHighscore: received incomplete get highscore request',
      MODULE_ID)
    return next(new httpErr.BadRequestError('incomplete get highscore request.'))
  }

  let highscore
  try {
    highscore = await highscoreDb.get(req.params.id)
  } catch (err) {
    if (err.notFound) {
      logger.error('%s::getHighscore: could not find highscore for race %s',
        MODULE_ID, req.params.id)
      return next(new httpErr.InternalServerError('could not find highscore'))
    }
    logger.error('%s::getHighscore: error retrieving highscore for race %s from db',
      MODULE_ID, req.params.id)
    return next(new httpErr.InternalServerError('error retrieving highscore ' +
      'from database'))
  }
  res.send(highscore)
  logger.info('%s::getHighscore: response sent', MODULE_ID)
  return next()
}

function getLaneStatus (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (
    req.params === undefined ||
    req.params.id === undefined
  ) {
    logger.error('%s: Received incomplete get car information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete get car information.'))
  } else {
    laneDb.get(req.params.id, function (err, value) {
      if (err) {
        if (err.notFound) {
          logger.error('%s: Could not find specified raceId', MODULE_ID)
          return next(new httpErr.BadRequestError('Could not retrieve ' +
            'lane information.'))
        }
      }
      res.send(value)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
  }
}

module.exports = (server, db, ser) => {
  serial = ser
  raceDb = db.race
  heatDb = db.heat
  laneDb = db.lane
  leaderboardDb = db.leaderboard
  highscoreDb = db.highscore
  checkpointDb = db.checkpoint
  heatUtils.setContext(db)
  server.get('/race', listRaces)
  server.get('/race/current', getCurrentRace)
  server.get('/race/:id', getRace)
  server.get('/race/heats/:id', getHeatsForRace)
  server.post('/race/:id', createRace)
  server.post('/race/init/:id', initRace)
  server.get('/race/leaderboard/:id', getLeaderboard)
  server.get('/race/highscore/:id', getHighscore)
  server.get('/race/lanes/:id', getLaneStatus)
}
