const MODULE_ID = 'heat'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')
var serialCom
var heatDb

function getHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if ( req.params === undefined ||
       req.params.id === undefined ) {

    logger.error('Received incomplete get heat information')
    return next(new httpErr.BadRequestError('Incomplete get heat information')
  }

  heat.get(req.params.id, funtion (err, value) {
    if (err) {
      if (err.notFound) {
        logger.error('Could not find specified heat')
        return next(new httpErr.BadRequestError('Could not retrieve heat information')
      }
    }
    res.send(value)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  })
}

function getCurrentHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  heat.getValueStream()
  .on('data', function (data) {
    logger.debug('Received data: %s', data)
    
    if (data.status === 'current' || data.status === 'running') {

      
      res.send(data)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    }
  })
  .on('error', function (err) {
    logger.error('Error getting heats: %s', err)
    return next(new httpErr.InternalServerError('Error retrieving heat information')
  })
  .on('end', function () {
    logger.error('Did not find current heat')
    return next(new httpErr.InternalServerError('Could not find current heat')
  })

}

function getNextHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  heat.getValueStream()
  .on('data', function (data) {
    logger.debug('Received data: %s', data)
    
    if (data.status === 'next') {

      
      res.send(data)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    }
  })
  .on('error', function (err) {
    logger.error('Error getting heats: %s', err)
    return next(new httpErr.InternalServerError('Error retrieving heat information')
  })
  .on('end', function () {
    logger.error('Did not find next heat')
    return next(new httpErr.InternalServerError('Could not find next heat')
  })
}

function markCurrentHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  
  if (req.params === undefined ||
      req.params.id === undefined) {

    logger.error('Received incomplete get heat information')
    return next(new httpErr.BadRequestError('Incomplete get heat information')
  }

  heat.get(req.params.id, funtion (err, value) {
    if (err) {
      if (err.notFound) {
        logger.error('Could not find specified heat')
        return next(new httpErr.BadRequestError('Could not mark current heat')
      }
    }

    value.status = 'current'

    heat.put(req.params.id, value, function (err) {
      if (err) {
        if (err.notFound) {
          logger.error('Could not find specified heat')
          return next(new httpErr.BadRequestError('Could not mark current heat')
	}
	logger.error.('Could not update current heat')
	return next(new httpErr.InternalServerError('Could not mark current heat')
      }
      logger.info('Successfully marked current heat')
      res.send(202, value)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })

  }
  
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function markNextHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function initHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function startHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  serialCom.startHeat(req.params.id)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server, serial, db) => {
  heatDb = db.heat
  serialCom = serial
  server.get('/heat/:id', getHeat)
  server.get('/heat/current', getCurrentHeat)
  server.get('/heat/next', getNextHeat)
  server.put('/heat/current/:id', markCurrentHeat)
  server.put('/heat/next/:id', markNextHeat)
  server.put('/heat/init/:id', initHeat)
  server.put('/heat/go/:id', startHeat)
}
