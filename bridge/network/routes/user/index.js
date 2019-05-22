const MODULE_ID = 'user'
const logger = require('../../../utils/logger')
const errors = require('restify-errors')
const sodium = require('sodium').api
const userUtils = require('./userUtils')

var ctx
var userDb

async function createUser (req, res, next) {
  logger.info('%s::createUser: request received', MODULE_ID)
  if (
    req.body === undefined ||
    req.body.name === undefined ||
    req.body.role === undefined ||
    req.body.password === undefined) {
    return next(new errors.BadRequestError('Incomplete user information.'))
  } else {
    userUtils.setContext(ctx)
    try {
      let user = await userUtils.createUser(req.body.name, req.body.password, req.body.role)
      if (user) {
        // creation successful
        res.json(201, { 'inserted': 1 })
        return next()
      } else {
        return next(new errors.InternalServerError('Could not create user.'))
      }
    } catch (err) {
      if (err.duplicateUser) {
        return next(new errors.ConflictError({ 'info': { 'username': req.body.name } }, 'Username already exists.'))
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
    req.body.name === undefined ||
    req.body.role === undefined ||
    req.body.password === undefined) {
    return next(new errors.BadRequestError('Incomplete user information.'))
  } else {
    try {
      const user = await userDb.get(req.body.name)
      logger.warn('%s::modifyUser: Username %s found!', MODULE_ID, user)
      // create password hash for new user
      let pass = Buffer.from(req.body.password, 'utf8')
      let hash = sodium.crypto_pwhash_str(pass,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE)
      if (Buffer.isBuffer(hash)) {
        // save the created hash
        try {
          userDb.put(
            req.body.name,
            {
              'name': req.body.name,
              'role': req.body.role,
              'hash': hash.toString('base64')
            })
          res.json(201, { 'updated': 1 })
          logger.info('%s::modifyUser: User %s successfully modified.', MODULE_ID, req.body.name)
          return next()
        } catch (err) {
          logger.error('%s::modifyUser: Could not store user %s!', MODULE_ID, req.body.name)
          return next(new errors.InternalServerError('Could not modify user.'))
        }
      } else {
        logger.error('%s::modifyUser: Could not create password hash!', MODULE_ID)
        return next(new errors.InternalServerError('Could not create password hash.'))
      }
    } catch (err) {
      if (err.notFound) {
        // user to modify does not exist
        return next(new errors.NotFoundError({ 'info': { 'username': req.body.name } }, 'Username does not exist.'))
      } else {
        // other unspecified error
        logger.error('%s::modifyUser: %s', MODULE_ID, err)
        return next(new errors.InternalServerError('Could not modify user.'))
      }
    }
  }
}

module.exports = (server, db) => {
  ctx = { server, db }
  userDb = db.user
  server.post('/user', createUser)
  server.put('/user', modifyUser)
}
