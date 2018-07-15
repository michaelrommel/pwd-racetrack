const MODULE_ID = 'track'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')

var laneDb

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
          return next(new httpErr.BadRequestError('Could not retrieve lane information.'))
        }
      }
      res.send(value)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
  }
}

function getTrackHighscores (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server, db) => {
  laneDb = db.lane
  server.get('/track/highscores', getTrackHighscores)
  server.get('/track/lanes/:id', getLaneStatus)
}
