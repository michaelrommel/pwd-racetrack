const MODULE_ID = 'user'
const logger = require('../../../utils/logger')
const config = require('../../../utils/config')
const errors = require('restify-errors')

function loginUser (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  logger.debug(req.body)

  let resp = {}
  if (
    req.body === undefined ||
    req.body.name === undefined ||
    req.body.role === undefined ||
    req.body.password === undefined
  ) {
    resp = new errors.BadRequestError('Incomplete registration information.')
  } else {
    const jwt = require('jsonwebtoken')

    // Only include the information you need in the token, please read about JWT
    resp = {
      name: req.body.name,
      role: req.body.role
    }
    resp['token'] = jwt.sign(resp, config.JWT_SECRET)

    logger.info('%s: token generated', MODULE_ID)
  }

  res.send(resp)

  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function createUser (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  let resp = {}
  res.send(resp)
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

function modifyUser (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  let resp = {}
  res.send(resp)
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server) => {
  server.post('/user/:id', createUser)
  server.post('/user/login', loginUser)
  server.put('/user/:id', modifyUser)
}
