const MODULE_ID = 'userUtils'
const logger = require('../../../utils/logger')
const sodium = require('sodium').api

let userDb

function setContext (ctx) {
  userDb = ctx.db.user
}

function UserException (id, msg) {
  this.id = id
  this.msg = msg
}

async function findUser (userId) {
  logger.info('%s::findUser: request received', MODULE_ID)
  if (userId.params === undefined) {
    logger.error('%s::findUser: No userid provided', MODULE_ID)
  }
  try {
    var user = await userDb.get(userId)
    logger.info('%s::findUser: response sent', MODULE_ID)
    return (user)
  } catch (err) {
    if (err.notFound) {
      logger.error('%s::findUser: could not find userid %s in database', MODULE_ID, userId)
    } else {
      logger.error('%s::findUser: error looking up userid %s: %s', MODULE_ID, userId, err)
    }
    throw (err)
  }
}

async function verifyUser (username, password) {
  logger.info('%s::verifyUser: request received', MODULE_ID)
  try {
    const user = await userDb.get(username)
    logger.info('%s::verifyUser: Username %s found!', MODULE_ID, user.name)
    // verify password hash for the user
    let pass = Buffer.from(password, 'utf8')
    let hash = Buffer.from(user.hash, 'base64')
    let match = sodium.crypto_pwhash_str_verify(hash, pass)
    if (match) {
      logger.info('%s::verifyUser: password matched', MODULE_ID)
      delete user.hash
      return (user)
    } else {
      logger.info('%s::verifyUser: wrong password', MODULE_ID)
      return (false)
    }
  } catch (err) {
    if (err.notFound) {
      logger.info('%s::verifyUser: username %s not found', MODULE_ID, username)
      return (false)
    } else {
      logger.error('%s::verifyUser: error looking up user %s: %s', MODULE_ID, username, err)
      throw (err)
    }
  }
}

async function modifyUser (username, password, role) {
  logger.info('%s::modifyUser: request received', MODULE_ID)
  // create password hash for new user
  let pass = Buffer.from(password, 'utf8')
  try {
    let hash = sodium.crypto_pwhash_str(pass,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE)
    if (Buffer.isBuffer(hash)) {
      // save the created hash
      try {
        userDb.put(
          username,
          {
            'name': username,
            'role': role,
            'hash': hash.toString('base64')
          })
        logger.info('%s::modifyUser: User %s successfully modified or created.', MODULE_ID, username)
        return ({ 'username': username, 'role': role })
      } catch (err) {
        logger.error('%s::modifyUser: Could not store user %s!', MODULE_ID, username)
        throw new UserException('storeError', username)
      }
    } else {
      logger.error('%s::modifyUser: Could not create password hash!', MODULE_ID)
      throw new UserException('passwordHashError', username)
    }
  } catch (err) {
    logger.error('%s::modifyUser: Could not create password hash!', MODULE_ID)
    throw new UserException('passwordHashError', username)
  }
}

async function createUser (username, password, role) {
  logger.info('%s::createUser: request received', MODULE_ID)
  try {
    await userDb.get(username)
    logger.warn('%s::createUser: username %s already exists!', MODULE_ID, username)
    throw new UserException('duplicateUser', username)
  } catch (err) {
    if (err.notFound) {
      try {
        let user = await modifyUser(username, password, role)
        return (user)
      } catch (err) {
        if (err.id === 'storeError') {
          logger.error('%s::createUser: Could not store user %s!', MODULE_ID, username)
        } else if (err.id === 'passwordHashError') {
          logger.error('%s::createUser: Could not create password hash!', MODULE_ID)
        } else {
          logger.error('%s::createUser: error while creating user: %s', MODULE_ID, err)
        }
        throw (err)
      }
    } else {
      // other unspecified error
      logger.error('%s::createUser: error while checking for dupes: %s', MODULE_ID, err)
      throw (err)
    }
  }
}

module.exports = {
  setContext: setContext,
  findUser: findUser,
  verifyUser: verifyUser,
  modifyUser: modifyUser,
  createUser: createUser
}
