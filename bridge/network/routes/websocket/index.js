const MODULE_ID = 'websocket'
const logger = require('../../../utils/logger')
const wsUtils = require('./wsUtils')

function attach (req, res, next) {
  let upgradeObject = res.claimUpgrade()

  logger.info('%s::attachWS: new websocket client', MODULE_ID)
  wsUtils.handleUpgrade(req, upgradeObject.socket, upgradeObject.head)

  wsUtils.notify('Connection to server established.')

  next(false)
}

module.exports = (server, websocket) => {
  server.get('/websocket/attach', attach)
}
