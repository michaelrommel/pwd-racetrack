const MODULE_ID = 'ping'
const logger = require('../../../utils/logger')

function sendPing (req, res, next) {
  logger.info('%s: request received', MODULE_ID)
  res.send({ ping: 'OK' })
  logger.info('%s: response sent', MODULE_ID)
  return next()
}

module.exports = (server) => {
  server.get('/ping', sendPing)
}
