const MODULE_ID = 'heat'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')
const heatUtils = require('./heatUtils')

var serialCom

var heatDb

function getHeat (req, res, next) {
  logger.info('%s: request received', MODULE_ID)

  if (req.params === undefined ||
    req.params.id === undefined) {
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
      logger.debug('%s: Received data: %s', MODULE_ID, JSON.stringify(data))
      let heat = {}
      heat[data.key] = data.value
      heats.push(heat)
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
  for (let n = 0; n < 4; n++) {
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
  if (complete === false) {
    logger.error('%s: Received incomplete create heat information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete create heat information.'))
  }
  // all was successful
  // reset time and score
  for (let n = 0; n < 4; n++) {
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
  logger.info('%s::getCurrentHeat: request received', MODULE_ID)

  if (req.params === undefined ||
    req.params.id === undefined) {
    logger.error('%s::getCurrentHeat: missing race id', MODULE_ID)
    return next(new httpErr.BadRequestError('missing race id'))
  }

  let currentHeat = {}
  var re = new RegExp(req.params.id, 'g')

  heatDb.createReadStream()
    .on('data', function (data) {
      if (data.key.match(re) &&
        (data.value.status === 'current' ||
        data.value.status === 'running' ||
        data.value.status === 'just finished')) {
        currentHeat = {...data.value}
      }
    })
    .on('error', function (err) {
      logger.error('%s::getCurrentHeat: Error getting heats: %s', MODULE_ID, err)
      return next(new httpErr.InternalServerError('Error retrieving heat information'))
    })
    .on('end', function () {
      if (currentHeat.length === 0) {
        logger.error('%s::getCurrentHeat: Did not find current heat', MODULE_ID)
        return next(new httpErr.InternalServerError('Could not find current heat'))
      } else {
        res.send(currentHeat)
        logger.info('%s::getCurrentHeat: response sent', MODULE_ID)
        return next()
      }
    })
}

function getNextHeat (req, res, next) {
  logger.info('%s::getNextHeat: request received', MODULE_ID)

  if (req.params === undefined ||
    req.params.id === undefined) {
    logger.error('%s::getNextHeat: missing race id', MODULE_ID)
    return next(new httpErr.BadRequestError('missing race id'))
  }

  let nextHeat = {}
  var re = new RegExp(req.params.id, 'g')

  heatDb.createReadStream()
    .on('data', function (data) {
      if (data.key.match(re) && data.value.status === 'next') {
        nextHeat = {...data.value}
      }
    })
    .on('error', function (err) {
      logger.error('%s::getNextHeat: Error getting heats: %s', MODULE_ID, err)
      return next(new httpErr.InternalServerError('Error retrieving heat information'))
    })
    .on('end', function () {
      if (nextHeat.length === 0) {
        logger.error('%s::getNextHeat: Did not find current heat', MODULE_ID)
        return next(new httpErr.InternalServerError('Could not find current heat'))
      } else {
        res.send(nextHeat)
        logger.info('%s::getNextHeat: response sent', MODULE_ID)
        return next()
      }
    })
}

function markCurrentHeat (req, res, next) {
  logger.info('%s::markCurrentHeat: request received', MODULE_ID)

  if (req.params === undefined ||
    req.params.id === undefined) {
    logger.error('%s::markCurrentHeat: Received incomplete put heat information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete mark current heat information'))
  }

  var heatKey = req.params.id
  var raceId = heatKey.slice(0, -3)
  var re = new RegExp(raceId, 'g')
  let noOfChanges = 0
  let found = false
  var toSave = []

  heatDb.createReadStream()
    .on('data', function (data) {
      let changed = false
      if (data.key.match(re)) {
        // we now got a heat from the current race
        if (data.value.status === 'current') {
          // we have another possibly stale mark
          let oldFinished = false
          for (let i = 0; i < data.value.results.length; i++) {
            if (data.value.results[i].t !== undefined &&
              data.value.results[i].t > 0) {
              oldFinished = true
            }
          }
          if (oldFinished) {
            data.value.status = 'finished'
          } else {
            data.value.status = ''
          }
          changed = true
        } else if (data.value.status === 'last finished') {
          // this was the last heat
          data.value.status = 'finished'
          changed = true
        }
        if (data.key === heatKey) {
          // this shall explicitly be set
          data.value.status = 'current'
          changed = true
          found = true
        }
        if (changed) {
          toSave.push(data)
          noOfChanges = noOfChanges + 1
        }
      }
    })
    .on('error', function (err) {
      logger.error('%s::markCurrentHeat: Error getting heats: %s', MODULE_ID, err)
      return next(new httpErr.InternalServerError('Error retrieving heat information'))
    })
    .on('end', async function () {
      if (noOfChanges > 0) {
        for (let i = 0; i < toSave.length; i++) {
          try {
            await heatDb.put(toSave[i].key, toSave[i].value)
          } catch (err) {
            logger.error('%s::markCurrentHeat: error saving back changed heat %s', MODULE_ID, toSave[i].key)
          }
        }
      }
      if (found) {
        res.json(202, {'noOfChanges': noOfChanges})
        logger.info('%s::markCurrentHeat: response sent', MODULE_ID)
        return next()
      } else {
        logger.error('%s::markCurrentHeat: Did not find heat to be marked: %s', MODULE_ID, heatKey)
        return next(new httpErr.InternalServerError('Could not mark current heat'))
      }
    })
}

function markNextHeat (req, res, next) {
  logger.info('%s::markNextHeat: request received', MODULE_ID)

  if (req.params === undefined ||
    req.params.id === undefined) {
    logger.error('%s::markNextHeat: Received incomplete put heat information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete mark current heat information'))
  }

  var heatKey = req.params.id
  var raceId = heatKey.slice(0, -3)
  var re = new RegExp(raceId, 'g')
  let noOfChanges = 0
  let found = false
  var toSave = []

  heatDb.createReadStream()
    .on('data', function (data) {
      let changed = false
      if (data.key.match(re)) {
        // we now got a heat from the current race
        if (data.value.status === 'next') {
          // we have another possibly stale mark
          let oldFinished = false
          for (let i = 0; i < data.value.results.length; i++) {
            if (data.value.results[i].t !== undefined &&
              data.value.results[i].t > 0) {
              oldFinished = true
            }
          }
          if (oldFinished) {
            data.value.status = 'finished'
          } else {
            data.value.status = ''
          }
          changed = true
        }
        if (data.key === heatKey) {
          // this shall explicitly be set
          data.value.status = 'next'
          changed = true
          found = true
        }
        if (changed) {
          toSave.push(data)
          noOfChanges = noOfChanges + 1
        }
      }
    })
    .on('error', function (err) {
      logger.error('%s::markNextHeat: Error getting heats: %s', MODULE_ID, err)
      return next(new httpErr.InternalServerError('Error retrieving heat information'))
    })
    .on('end', async function () {
      if (noOfChanges > 0) {
        for (let i = 0; i < toSave.length; i++) {
          try {
            await heatDb.put(toSave[i].key, toSave[i].value)
          } catch (err) {
            logger.error('%s::markNextHeat: error saving back changed heat %s', MODULE_ID, toSave[i].key)
          }
        }
      }
      if (found) {
        res.json(202, {'noOfChanges': noOfChanges})
        logger.info('%s::markNextHeat: response sent', MODULE_ID)
        return next()
      } else {
        logger.error('%s::markNextHeat: Did not find heat to be marked: %s', MODULE_ID, heatKey)
        return next(new httpErr.InternalServerError('Could not mark next heat'))
      }
    })
}

async function initHeat (req, res, next) {
  logger.info('%s::initHeat: request received', MODULE_ID)

  if (req.params === undefined ||
    req.params.id === undefined) {
    logger.error('%s::initHeat: Received incomplete init heat information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete init heat information'))
  }

  let raceId = req.params.id.slice(0, -3)
  let heatNumber = parseInt(req.params.id.slice(-2))
  let heat
  try {
    heat = await heatDb.get(req.params.id)
    try {
      serialCom.initHeat(heat.heat)
      logger.info('%s::initHeat: Successfully initialized specified heat %s', MODULE_ID, req.params.id)
      res.send(202, heat)
      logger.info('%s::initHeat: response sent', MODULE_ID)
      return next()
    } catch (err) {
      if (err.id === 'noheat') {
        logger.error('%s::initHeat: serial module returned heat not found', MODULE_ID)
      } else if (err.id === 'noresetheat') {
        logger.error('%s::initHeat: serial module returned heat not be resetted', MODULE_ID)
      }
      return next(new httpErr.InternalServerError('Could not initialize heat'))
    }
  } catch (err) {
    if (err) {
      logger.error('%s::initHeat: Could not find specified heat %s', MODULE_ID, req.params.id)
      // somehow the heat is missing, try to reconstruct it from the race config
      try {
        heatUtils.initializeHeats(raceId, heatNumber)
        res.send(503, 'heat re-initialized, please retry')
      } catch (err) {
        return next(new httpErr.InternalServerError('Could not re-initialize heat'))
      }
    }
  }
}

function startHeat (req, res, next) {
  logger.info('%s::startHeat: request received', MODULE_ID)

  if (req.params === undefined ||
    req.params.id === undefined) {
    logger.error('%s::startHeat: incomplete start heat information', MODULE_ID)
    return next(new httpErr.BadRequestError('Incomplete start heat information'))
  }
  let heatNumber = parseInt(req.params.id.slice(-2))
  serialCom.startHeat(heatNumber)
  res.send({'heat': heatNumber})
  logger.info('%s::startHeat: response sent', MODULE_ID)
  return next()
}

module.exports = (server, db, serial) => {
  heatDb = db.heat
  serialCom = serial
  heatUtils.setContext(db)
  server.get('/heat/', getAllHeats)
  server.get('/heat/:id', getHeat)
  server.post('/heat/:id', createHeat)
  server.get('/heat/current/:id', getCurrentHeat)
  server.get('/heat/next/:id', getNextHeat)
  server.put('/heat/current/:id', markCurrentHeat)
  server.put('/heat/next/:id', markNextHeat)
  server.put('/heat/init/:id', initHeat)
  server.put('/heat/go/:id', startHeat)
}
