const MODULE_ID = 'wsUtils'
const logger = require('../../../utils/logger')
const watershed = require('watershed')

var ws = new watershed.Watershed()

var clients = []

function clientAccept (req, res) {
  let upgrade = res.claimUpgrade()
  let clientConn = ws.accept(req, upgrade.socket, upgrade.head)
  logger.debug('%s::clientAccept: client accepted: %s', MODULE_ID, clientConn._remote)
  //
  // store watershed connection into an array of clients
  clients.push(clientConn)

  // set up functions for incoming data
  clientConn.on('text', (t) => {
    logger.debug('%s::clientAccept: data received: %s', MODULE_ID, t)
  })

  // an error on a socket has occurred
  clientConn.on('error', (err) => {
    logger.debug('%s::clientAccept: error on connection %s: %s', MODULE_ID, clientConn._remote, err.message)
  })

  // remove ended connections
  clientConn.on('end', (t) => {
    logger.debug('%s::clientAccept: connection closed: %s', MODULE_ID, clientConn._remote)
    for (let i = 0; i < clients.length; i++) {
      if (clients[i] === clientConn) {
        clients.splice(i, 1)
      }
    }
  })
}

function notify (data) {
  clients.forEach((c) => {
    logger.debug('%s::notify: client %s notified', MODULE_ID, c._remote)
    try {
      c.send(JSON.stringify(data))
    } catch (err) {
      logger.debug('%s::notify: client %s notification failed: %s', MODULE_ID, c._remote, err.message)
    }
  })
}

module.exports = {
  notify: notify,
  clientAccept: clientAccept
}
