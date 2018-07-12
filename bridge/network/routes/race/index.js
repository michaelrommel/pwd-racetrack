const MODULE_ID = 'race'
const logger = require('../../utils/logger')
const httpErr = require('restify-errors')

function listRaces (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function createRace (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function getLeaderboard (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function getHighscores (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server) => {
  server.get('/race', listRaces)
  server.post('/race/:id', createRace)
  server.get('/race/leaderboard/:id', getLeaderboard)
  server.get('/race/highscores/:id', getHighscores)
}
