const MODULE_ID = 'auth'
const logger = require('../../../utils/logger')
const errors = require('restify-errors')
const passport = require('passport')
const jwt = require('jsonwebtoken')

let settingsDb

async function getJwtSecret () {
  try {
    let appSettings = await settingsDb.get('settings')
    logger.info('%s::getJwtSecret: application settings retrieved', MODULE_ID)
    return (appSettings.jwtSecret)
  } catch (err) {
    logger.info('%s::getJwtSecret: could not get application settings', MODULE_ID)
    throw (err)
  }
}

async function localLogin (req, res, next) {
  // we are already authenticated here
  logger.info('%s::localLogin: token request received', MODULE_ID)

  try {
    let jwtSecret = await getJwtSecret()
    try {
      // Only include the information you need in the token
      let credentials = {
        name: req.user.name,
        role: req.user.role
      }
      credentials['token'] = jwt.sign(credentials, jwtSecret)
      logger.info('%s::localLogin: token generated', MODULE_ID)
      res.json(200, credentials)
      logger.info('%s::localLogin: credentials sent', MODULE_ID)
      return next()
    } catch (err) {
      return next(new errors.InternalServerError('JWT token generation not successful'))
    }
  } catch (err) {
    return next(new errors.InternalServerError('JWT secret not available'))
  }
}

module.exports = (server, db) => {
  settingsDb = db.settings
  server.get('/auth/github-login', passport.authenticate('github', { session: false }))
  server.get('/auth/github-token', passport.authenticate('github', { session: false }),
    function (req, res) {
      res.json({ id: req.user.id, username: req.user.username })
    }
  )
  server.post('/auth/local-login', passport.authenticate('local', { session: false }), localLogin)
}
