const MODULE_ID = 'websocket'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')
const wsUtils = require('./wsUtils')

var ws
var shed

function attachWS (req, res, next) {
  if (!res.claimUpgrade) {
    next(new Error('Connection must upgrade to WebSockets'))
    return
  }
  logger.debug('upgrade claimed')

  var upgrade = res.claimUpgrade()
  wsUtils.setContext(ws.accept(req, upgrade.socket, upgrade.head))

  wsUtils.notify()

  next(false)
}

module.exports = (server, websocket) => {
  ws = websocket
  server.get('/websocket/attach', attachWS)
}
