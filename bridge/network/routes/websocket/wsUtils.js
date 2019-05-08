const MODULE_ID = 'wsUtils'
const logger = require('../../../utils/logger')
const watershed = require('watershed')

var ws = new watershed.Watershed()

var clients = []

function clientAccept (req, res) {
  let upgrade = res.claimUpgrade()
  let clientConn = ws.accept(req, upgrade.socket, upgrade.head)
  logger.debug('%s::clientAccept: client accepted', MODULE_ID)
  clients.push(clientConn)
}

function notify () {
  clients.forEach((c) => {
    logger.debug('%s::notify: client %s notified', MODULE_ID, c)
    c.send('test')
  })
}

module.exports = {
  notify: notify,
  clientAccept: clientAccept
}
