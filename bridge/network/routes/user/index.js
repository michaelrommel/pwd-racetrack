const MODULE_ID = 'user'
const logger = require('../../../utils/logger')
const config = require('../../../utils/config')
const errors = require('restify-errors')
const sodium = require('sodium').api
const jwt = require('jsonwebtoken')

var userDb

async function loginUser (req, res, next) {
  logger.info('%s::loginUser: request received', MODULE_ID)

  if (
    req.body === undefined ||
    req.body.name === undefined ||
    req.body.password === undefined
  ) {
    return next(new errors.BadRequestError('Incomplete registration information.'))
  } else {
    try {
      const user = await userDb.get(req.body.name)
      logger.info('%s::loginUser: Username %s found!', MODULE_ID, user.name)
      // verify password hash for the user
      let pass = Buffer.from(req.body.password, 'utf8')
      let hash = Buffer.from(user.hash, 'base64')
      let match = sodium.crypto_pwhash_str_verify(hash, pass)
      if (match) {
        // Only include the information you need in the token
        let credentials = {
          name: user.name,
          role: user.role
        }
        credentials['token'] = jwt.sign(credentials, config.JWT_SECRET)
        logger.info('%s::loginUser: token generated', MODULE_ID)
        res.json(200, credentials)
        logger.info('%s::loginUser: credentials sent', MODULE_ID)
        return next()
      } else {
        // login was unsuccessful
        return next(new errors.UnauthorizedError('Login not successful'))
      }
    } catch (err) {
      if (err.notFound) {
        // user was not found, return the same error
        return next(new errors.UnauthorizedError('Login not successful'))
      } else {
        // another error occurred
        return next(new errors.InternalServerError('Login not successful'))
      }
    }
  }
}

async function createUser (req, res, next) {
  logger.info('%s::createUser: request received', MODULE_ID)

  if (
    req.body === undefined ||
    req.body.name === undefined ||
    req.body.role === undefined ||
    req.body.password === undefined) {
    return next(new errors.BadRequestError('Incomplete user information.'))
  } else {
    try {
      const userExists = await userDb.get(req.body.name)
      logger.warn('%s::createUser: Username %s already exists!', MODULE_ID, userExists)
      return next(new errors.ConflictError({ 'info': { 'username': userExists } }, 'Username already exists.'))
    } catch (err) {
      if (err.notFound) {
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
            res.json(201, { 'inserted': 1 })
            logger.info('%s::createUser: User %s successfully created.', MODULE_ID, req.body.name)
            return next()
          } catch (err) {
            logger.error('%s::createUser: Could not store user %s!', MODULE_ID, req.body.name)
            return next(new errors.InternalServerError('Could not create user.'))
          }
        } else {
          logger.error('%s::createUser: Could not create password hash!', MODULE_ID)
          return next(new errors.InternalServerError('Could not create password hash.'))
        }
      } else {
        // other unspecified error
        logger.error('%s::createUser: %s', MODULE_ID, err)
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
  userDb = db.user
  server.post('/user/login', loginUser)
  server.post('/user', createUser)
  server.put('/user', modifyUser)
}
