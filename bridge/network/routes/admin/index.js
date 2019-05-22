const MODULE_ID = 'admin'
const logger = require('../../../utils/logger')
const errors = require('restify-errors')

var settingsDb

async function storeAppSettings (req, res, next) {
  logger.info('%s::storeAppSettings: request received', MODULE_ID)
  // check if authentication has admin access
  // override this check if user's role is test
  // be careful though not to allow permanent changes is user's role is test
  // or maybe make sure you don't grant test role to an end user
  // if (!req.user.role === 'admin' && req.user.role !== 'test') {
  if (!req.user.role === 'admin') {
    return res.send(new errors.ForbiddenError('You don\'t have sufficient privileges.'))
  }

  // check the base properties
  if (
    req.body === undefined ||
    req.body.appState === undefined ||
    req.body.jwtSecret === undefined ||
    req.body.rootpwd === undefined
  ) {
    logger.error('%s::storeAppSettings: received incomplete app settings', MODULE_ID)
    return next(new errors.BadRequestError('Incomplete app settings.'))
  }

  try {
    await settingsDb.put('settings', req.body)
    res.json(201, { 'inserted': 1 })
    logger.info('%s::storeAppSettings: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s::storeAppSettings: error storing app settings', MODULE_ID)
    return next(new errors.InternalServerError('App settings could not be saved.'))
  }
}

async function getInitAppSettings (req, res, next) {
  logger.info('%s::getInitAppSettings: request received', MODULE_ID)
  try {
    let settings = await settingsDb.get('settings')
    if (settings.appState === 'fresh') {
      res.json(200, settings)
    } else {
      // Return just the appState and nothing more, since the rest
      // is protected information now, since the app has been configured
      // The app should ask the user to login to change the app settings
      res.json(200, { 'appState': settings.appState })
    }
    logger.info('%s::getInitAppSettings: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s::getInitAppSettings: error getting app settings', MODULE_ID)
    return next(new errors.InternalServerError('App settings could not be retrieved.'))
  }
}

module.exports = (server, db) => {
  settingsDb = db.settings
  server.post('/admin/settings', storeAppSettings)
  server.get('/admin/init', getInitAppSettings)
}
