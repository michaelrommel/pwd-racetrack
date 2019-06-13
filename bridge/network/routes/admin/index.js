const MODULE_ID = 'admin'
const logger = require('../../../utils/logger')
const adminUtils = require('../admin/adminUtils')
const userUtils = require('../user/userUtils')
const errors = require('restify-errors')

let settingsDb

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

  // check the minumum base properties
  if (
    req.body === undefined ||
    req.body.appState === undefined
  ) {
    logger.error('%s::storeAppSettings: received incomplete app settings', MODULE_ID)
    return next(new errors.BadRequestError('Incomplete app settings.'))
  }

  try {
    // make a shallow merge between the supplied parameters and the stored ones
    let appSettings = Object.assign(await adminUtils.getAppSettings(settingsDb), req.body)
    let response
    try {
      await settingsDb.put('settings', appSettings)
      logger.info('%s::storeAppSettings: settings stored and response sent', MODULE_ID)
      response = { 'success': true, 'msg': 'Application settings stored in db' }
      try {
        await userUtils.updateUser(
          'root',
          appSettings.rootpwd,
          'admin'
        )
        logger.info('%s::storeAppSettings: update of root user credentials successful', MODULE_ID)
        response.msg = response.msg + ', and root credentials updated.'
        res.json(201, response)
      } catch (err) {
        logger.error('%s::storeAppSettings: root user credential updates failed: %s',
          MODULE_ID, err)
        response.msg = response.msg + ', but root credentials could not be updated!'
        res.json(500, response)
      }
      return next()
    } catch (err) {
      logger.error('%s::storeAppSettings: error storing app settings', MODULE_ID)
      return next(new errors.InternalServerError('app settings could not be saved.'))
    }
  } catch (err) {
    logger.info('%s::storeAppSettings: could not get application settings', MODULE_ID)
    throw (err)
  }
}

async function getAppSettings (req, res, next) {
  logger.info('%s::getAppSettings: request received', MODULE_ID)
  if (!req.user.role === 'admin') {
    return res.send(new errors.ForbiddenError('You don\'t have sufficient privileges.'))
  }

  try {
    let settings = await adminUtils.getAppSettings(settingsDb)
    res.json(200, settings)
    logger.info('%s::getAppSettings: response sent', MODULE_ID)
    return next()
  } catch (err) {
    logger.error('%s::getAppSettings: error getting app settings', MODULE_ID)
    return next(new errors.InternalServerError('App settings could not be retrieved.'))
  }
}

async function getInitAppSettings (req, res, next) {
  logger.info('%s::getInitAppSettings: request received', MODULE_ID)
  try {
    let settings = await adminUtils.getAppSettings(settingsDb)
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
  server.get('/admin/settings', getAppSettings)
  server.get('/admin/init', getInitAppSettings)
}
