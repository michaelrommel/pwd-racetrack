const MODULE_ID = 'websocket'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')
const wsUtils = require('./wsUtils')

function attachWS (req, res, next) {
  if (!res.claimUpgrade) {
    logger.debug('%s::notify: unable to upgrade connection %s', MODULE_ID, JSON.stringify(res, 2))
    return next(new httpErr.UpgradeRequiredError('Connection must upgrade to WebSockets'))
  }

  wsUtils.clientAccept(req, res)
  wsUtils.notify('Connection to server established.')

  next(false)
}

module.exports = (server, websocket) => {
  server.get('/websocket/attach', attachWS)
}
