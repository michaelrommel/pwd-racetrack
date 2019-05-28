const MODULE_ID = 'user'
const logger = require('../../../utils/logger')
const errors = require('restify-errors')
const userUtils = require('./userUtils')

var ctx

async function createUser (req, res, next) {
  logger.info('%s::createUser: request received', MODULE_ID)
  if (
    req.body === undefined ||
    req.body.username === undefined ||
    req.body.password === undefined ||
    req.body.role === undefined) {
    return next(new errors.BadRequestError('Incomplete user information.'))
  } else {
    userUtils.setContext(ctx)
    try {
      let user = await userUtils.createUser(req.body.username, req.body.password, req.body.role)
      if (user) {
        // creation successful
        res.json(201, { 'inserted': 1 })
        return next()
      } else {
        return next(new errors.InternalServerError('Could not create user.'))
      }
    } catch (err) {
      if (err.id === 'duplicateUser') {
        return next(new errors.ConflictError({ 'info': { 'username': req.body.username } }, 'Username already exists.'))
      } else {
        return next(new errors.InternalServerError('Could not create user.'))
      }
    }
  }
}

async function modifyUser (req, res, next) {
  logger.info('%s::modifyUser: request received', MODULE_ID)

  if (
    req.body === undefined ||
    req.body.username === undefined ||
    req.body.password === undefined ||
    req.body.role === undefined) {
    return next(new errors.BadRequestError('Incomplete user information.'))
  } else {
    try {
      let user = await userUtils.modifyUser(req.body.username, req.body.password, req.body.role)
      if (user) {
        // creation successful
        res.json(201, { 'updated': 1 })
        return next()
      } else {
        return next(new errors.InternalServerError('Could not modify user.'))
      }
    } catch (err) {
      // other unspecified error
      logger.error('%s::modifyUser: %s', MODULE_ID, err)
      return next(new errors.InternalServerError('Could not modify user.'))
    }
  }
}

module.exports = (server, db) => {
  ctx = { server, db }
  server.post('/user', createUser)
  server.put('/user', modifyUser)
}
