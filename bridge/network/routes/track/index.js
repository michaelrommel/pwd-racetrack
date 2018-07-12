const MODULE_ID = 'track'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')

function getTrackHighscores (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server) => {
  server.get('/track/highscores', getTrackHighscores)
}
