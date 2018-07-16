const MODULE_ID = 'race'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')
const heatUtils = require('../heat/heatUtils')

var serial

var raceDb
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

async function initRace (req, res, next) {
  logger.info('%s::intRace: request received', MODULE_ID)
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
      logger.error('%s::initRace: could not save raceId %s as checkpoint', MODULE_ID, raceId)
    }

    // the serial module deals with all messsages in one heat, this heat must
    // be initialized
    serial.initRace(raceId)

    res.send(200, race)
    logger.info('%s::intRace: response sent', MODULE_ID)
    return next()
  } catch (err) {
    if (race === undefined) {
      logger.error('%s::intRace: could not find race in database: %s', MODULE_ID, err)
    }
    return next(new httpErr.InternalServerError('Could not find race'))
  }
}

async function createRace (req, res, next) {
  logger.info('%s::createRace: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined ||
      req.body.description === undefined ||
      req.body.lanes === undefined ||
      req.body.startAt === undefined ||
      req.body.finalists === undefined ||
      req.body.cars === undefined ||
      Object.keys(req.body.cars).length < 15) {
    logger.error('%s::createRace: Received incomplete create race information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete create race information.'))
  }

  let raceId = req.params.id
  let countCars = Object.keys(req.body.cars).length
  let race = {}
  race['description'] = req.body.description
  race['lanes'] = req.body.lanes
  race['cars'] = req.body.cars
  race['heats'] = countCars
  race['startAt'] = req.body.startAt
  race['finalists'] = req.body.finalists

  try {
    await raceDb.put(raceId, race)
    try {
      await heatUtils.initializeHeats(raceId, 'all')
    } catch (err) {
      if (err.id === 'heaterror') {
        logger.error('%s::createRace: Unable to insert heat %s into heat database', MODULE_ID, err.msg)
        return next(new httpErr.InternalServerError('Could not insert heat'))
      } else if (err.id === 'raceconfigerror') {
        logger.error('%s::createRace: Unable to retrieve race configuration %s from raceconfig database', MODULE_ID, err.msg)
        return next(new httpErr.InternalServerError('Could not get reaceconfig'))
      }
    }
    res.send(201, race)
    logger.info('%s::createRace: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s::createRace: Unable to insert race information into database', MODULE_ID)
    return next(new httpErr.InternalServerError('Could not create race'))
  }
}

// function for sorting leaderboard
var sortByCumScoreAndTime = function (a, b) {
  if ((a.cumulatedScore < b.cumulatedScore) || (b.cumulatedScore === undefined)) {
    return 1
  } else if ((a.cumulatedScore > b.cumulatedScore) || (a.cumulatedScore === undefined)) {
    return -1
  }
  // now we have to sort by ascending cumulated time
  if ((a.cumulatedTime < b.cumulatedTime) || (b.cumulatedTime === undefined)) {
    return -1
  } else if ((a.cumulatedTime > b.cumulatedTime) || (a.cumulatedTime === undefined)) {
    return 1
  }
  return 0
}

function getLeaderboard (req, res, next) {
  logger.info('%s::getLeaderboard: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined) {
    logger.error('%s::getLeaderboard: received incomplete get leaderboard request', MODULE_ID)
    return next(new httpErr.BadRequestError('incomplete get leader board request.'))
  }

  leaderboardDb.get(req.params.id, function (err, leaderboard) {
    if (err) {
      if (err.notFound) {
        logger.error('%s::getLeaderboard: could not find leaderboard for race %s', MODULE_ID, req.params.id)
        return next(new httpErr.InternalServerError('could not find leaderboard.'))
      }
      logger.error('%s::getLeaderboard: error retrieving leaderboard for race %s from db', MODULE_ID, req.params.id)
      return next(new httpErr.InternalServerError('Unable to process get leaderboard request.'))
    }
    // sort the whole leaderboard
    let top = Object.values(leaderboard)
    top.sort(sortByCumScoreAndTime)
    res.send(top)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  })
}

async function getHighscore (req, res, next) {
  logger.info('%s::getHighscore: request received', MODULE_ID)

  if (req.params === undefined ||
      req.params.id === undefined) {
    logger.error('%s::getHighscore: received incomplete get highscore request', MODULE_ID)
    return next(new httpErr.BadRequestError('incomplete get highscore request.'))
  }

  let highscore
  try {
    highscore = await highscoreDb.get(req.params.id)
  } catch (err) {
    if (err.notFound) {
      logger.error('%s::getHighscore: could not find highscore for race %d', MODULE_ID, req.params.id)
      return next(new httpErr.InternalServer('could not find highscore'))
    }
    logger.error('%s::getHighscore: error retrieving highscore from database', MODULE_ID)
    return next(new httpErr.InternalServer('error retrieving highscore from database'))
  }
  res.send(highscore)
  logger.info('%s::getHighscore: response sent', MODULE_ID)
  return next()
}

module.exports = (server, db, ser) => {
  serial = ser
  raceDb = db.race
  leaderboardDb = db.leaderboard
  highscoreDb = db.highscore
  checkpointDb = db.checkpoint
  heatUtils.setContext(db)
  server.get('/race', listRaces)
  server.get('/race/:id', getRace)
  server.post('/race/:id', createRace)
  server.post('/race/init/:id', initRace)
  server.get('/race/leaderboard/:id', getLeaderboard)
  server.get('/race/highscore/:id', getHighscore)
}
