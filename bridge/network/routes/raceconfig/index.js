const MODULE_ID = 'raceconfig'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')

var raceconfigDb

function listRaceconfigs (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  let raceconfigs = []
  raceconfigDb.createReadStream()
    .on('data', function (data) {
      logger.debug('%s: Received data: %s: %s', MODULE_ID, data.key, data.value)
      let rc = {}
      rc[data.key] = data.value
      raceconfigs.push(rc)
    })
    .on('error', function (err) {
      logger.error('Error getting cars: %s', err)
      return next(new httpErr.InternalServerError('Error retrieving raceconfig information'))
    })
    .on('end', function () {
      res.send(200, raceconfigs)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
}

async function getRaceconfig (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  if (
    req.params === undefined ||
    req.params.id === undefined
  ) {
    logger.error('%s: Received incomplete get raceconfig information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete get raceconfig information.'))
  }
  try {
    let rc = await raceconfigDb.get(req.params.id)
    res.json(200, rc)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s: error retrieving raceconfig with id: %s', MODULE_ID, req.params.id)
    return next(new httpErr.InternalServerError('raceconfig could not be retrieved'))
  }
}

async function createRaceconfig (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  if (
    req.params === undefined ||
    req.params.id === undefined ||
    req.body === undefined ||
    req.body.heats === undefined
  ) {
    logger.error('%s: Received incomplete create raceconfig information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete create raceconfig information.'))
  }
  try {
    await raceconfigDb.put(req.params.id, req.body)
    res.json(201, { 'inserted': 1 })
    logger.info('%s: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s: error creating raceconfig with id: %s', MODULE_ID, req.params.id)
    return next(new httpErr.InternalServerError('raceconfig could not be savesd'))
  }
}

module.exports = (server, db) => {
  raceconfigDb = db.raceconfig
  server.get('/raceconfig', listRaceconfigs)
  server.get('/raceconfig/:id', getRaceconfig)
  server.post('/raceconfig/:id', createRaceconfig)
}
