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
    return next(new httpErr.BadRequestError('Incomplete get heat information'))
  }

  heatDb.get(req.params.id, function (err, value) {
    if (err) {
      if (err.notFound) {
        logger.error('Could not find specified heat')
        return next(new httpErr.BadRequestError('Could not retrieve heat information'))
      }
    }
    res.send(value)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  })
}

function getAllHeats (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  let heats = []
  heatDb.createReadStream()
    .on('data', function (data) {
      logger.debug('%s: Received data: %s', MODULE_ID, data)
      let heat = {}
      heat[data.key] = data.value
      heats.push(heat)
    })
    .on('error', function (err) {
      logger.error('%s: Error getting cars: %s', MODULE_ID, err)
      return next(new httpErr.InternalServerError('Error retrieving heat information'))
    })
    .on('end', function () {
      res.send(200, heats)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
}

async function createHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  let complete = true
  // check the base properties
  if (
    req.params === undefined ||
    req.params.id === undefined ||
    req.body === undefined ||
    req.body.heat === undefined ||
    req.body.status === undefined ||
    req.body.results === undefined 
  ) {
    complete = false
  }
  // check the properties of each array
  for (let n = 0; n < 4; n++ ) {
    if ( 
      req.body.results[n].rf === undefined ||
      req.body.results[n].ow === undefined ||
      req.body.results[n].mn === undefined ||
      req.body.results[n].sn === undefined
    ) {
      complete = false
    }
  }
  // if any of these were missing
  if ( complete === false ) {
    logger.error('%s: Received incomplete create heat information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete create heat information.'))
  }
  // all was successful
  // reset time and score
  for (let n = 0; n < 4; n++ ) {
    req.body.results[n].t = 0
    req.body.results[n].score = 0
  }
  try {
    await heatDb.put(req.params.id, req.body)
    res.json(201, {'inserted': 1})
    logger.info('%s: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s: error creating heat with id: %s', MODULE_ID, req.params.id)
    return next(new httpErr.InternalServerError('raceconfig could not be savesd'))
  }
}

function getCurrentHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  heatDb.getValueStream()
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
    return next(new httpErr.InternalServerError('Error retrieving heat information'))
  })
  .on('end', function () {
    logger.error('Did not find current heat')
    return next(new httpErr.InternalServerError('Could not find current heat'))
  })

}

function getNextHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  heatDb.getValueStream()
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
    return next(new httpErr.InternalServerError('Error retrieving heat information'))
  })
  .on('end', function () {
    logger.error('Did not find next heat')
    return next(new httpErr.InternalServerError('Could not find next heat'))
  })
}

function markCurrentHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  
  if (req.params === undefined ||
      req.params.id === undefined) {
          
    logger.error('Received incomplete put heat information')
    return next(new httpErr.BadRequestError('Incomplete mark current heat information'))
  }

  heatDb.get(req.params.id, function (err, value) {
    if (err) {
      if (err.notFound) {
        logger.error('Could not find specified heat')
        return next(new httpErr.BadRequestError('Could not mark current heat'))
      }
    }

    value.status = 'current'

    heatDb.put(req.params.id, value, function (err) {
      if (err) {
        if (err.notFound) {
          logger.error('Could not find specified heat')
          return next(new httpErr.BadRequestError('Could not mark current heat'))
	}
	logger.error('Could not update current heat')
	return next(new httpErr.InternalServerError('Could not mark current heat'))
      }
      logger.info('Successfully marked current heat')
      res.send(202, value)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })

  })
  
}

function markNextHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  
  if (req.params === undefined ||
      req.params.id === undefined) {

    logger.error('Received incomplete put heat information')
    return next(new httpErr.BadRequestError('Incomplete mark next heat information'))
  }

  heatDb.get(req.params.id, function (err, value) {
    if (err) {
      if (err.notFound) {
        logger.error('Could not find specified heat')
        return next(new httpErr.BadRequestError('Could not mark next heat'))
      }
    }

    value.status = 'next'

    heatDb.put(req.params.id, value, function (err) {
      if (err) {
        if (err.notFound) {
          logger.error('Could not find specified heat')
          return next(new httpErr.BadRequestError('Could not mark next heat'))
	}
	logger.error('Could not update current heat')
	return next(new httpErr.InternalServerError('Could not mark next heat'))
      }
      logger.info('Successfully marked next heat')
      res.send(202, value)
      logger.info('%s: response sent', MODULE_ID)
      return next()
    })
  })
}

function initHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  
  if (req.params === undefined ||
      req.params.id === undefined) {

    logger.error('Received incomplete put heat information')
    return next(new httpErr.BadRequestError('Incomplete init heat information'))
  }

  heatDb.get(req.params.id, function (err, value) {
    if (err) {
      if (err.notFound) {
        logger.error('Could not find specified heat')
        return next(new httpErr.BadRequestError('Could not initialize specified heat'))
      }
    }
    
    serialCom.initHeat(value.heat)
    
    logger.info('Successfully initialized specified heat')
    res.send(202, value)
    logger.info('%s: response sent', MODULE_ID)
    return next()
  })
}

function startHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  
  if (req.params === undefined ||
      req.params.id === undefined) {

    logger.error('Received incomplete put heat information')
    return next(new httpErr.BadRequestError('Incomplete start heat information'))
  }
  let heatNumber = parseInt(req.params.id.replace('.*-([0-9][0-9])$', '\1'))
  serialCom.startHeat(heatNumber)
  res.send({})
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server, db, serial) => {
  heatDb = db.heat
  serialCom = serial
  server.get('/heat/', getAllHeats)
  server.get('/heat/:id', getHeat)
  server.post('/heat/:id', createHeat)
  server.get('/heat/current', getCurrentHeat)
  server.get('/heat/next', getNextHeat)
  server.put('/heat/current/:id', markCurrentHeat)
  server.put('/heat/next/:id', markNextHeat)
  server.put('/heat/init/:id', initHeat)
  server.put('/heat/go/:id', startHeat)
}
