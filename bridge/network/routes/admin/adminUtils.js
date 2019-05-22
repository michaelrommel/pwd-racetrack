const MODULE_ID = 'adminUtils'
const logger = require('../../../utils/logger')

async function getAppSettings (settingsDb) {
  try {
    let appSettings = await settingsDb.get('settings')
    logger.info('%s::getAppSettings: application settings retrieved', MODULE_ID)
    return (appSettings)
  } catch (err) {
    logger.info('%s::getAppSettings: could not get application settings', MODULE_ID)
    throw (err)
  }
}

module.exports = {
  getAppSettings: getAppSettings
}
