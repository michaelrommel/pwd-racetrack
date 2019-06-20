const MODULE_ID = 'wsUtils'
const logger = require('../../../utils/logger')
const Websocket = require('ws')

var clients = []
var ws

function init (server) {
  ws = new Websocket.Server({ 'noServer': true })

  ws.on('connection', (clientConn, req) => {
    // we got a new connection
    logger.debug('%s::clientAccept: client accepted: %s',
      MODULE_ID, req.connection.remoteAddress)
    //
    // store watershed connection into an array of clients
    clients.push(clientConn)

    // set up functions for incoming data
    clientConn.on('message', (t) => {
      logger.debug('%s::message: received on connection %s: %s',
        MODULE_ID,
        clientConn._socket.remoteAddress + ':' + clientConn._socket.remotePort,
        t)
    })

    // error handling
    clientConn.on('error', (err) => {
      logger.debug('%s::error: error on connection %s: %s',
        MODULE_ID,
        clientConn._socket.remoteAddress + ':' + clientConn._socket.remotePort,
        err)
    })

    // end of connection
    clientConn.on('close', () => {
      logger.debug('%s::error: error on connection %s: %s',
        MODULE_ID,
        clientConn._socket.remoteAddress + ':' + clientConn._socket.remotePort)
      for (let i = 0; i < clients.length; i++) {
        if (clients[i] === clientConn) {
          clients.splice(i, 1)
        }
      }
    })
  })
}

function handleUpgrade (req, sock, head) {
  ws.handleUpgrade(req, sock, head, (conn) => {
    ws.emit('connection', conn, req)
  })
}

function notify (data) {
  clients.forEach((c) => {
    logger.debug('%s::notify: trying client %s',
      MODULE_ID,
      c._socket.remoteAddress + ':' + c._socket.remotePort)
    try {
      if (c.readyState === Websocket.OPEN) {
        c.send(JSON.stringify(data))
      } else {
        logger.error('%s::notify: client %s is not ready',
          MODULE_ID, c._socket.remotePort)
      }
    } catch (err) {
      logger.error('%s::notify: client %s notification failed: %s',
        MODULE_ID, c._socket.remotePort, err.message)
    }
  })
}

module.exports = {
  init: init,
  handleUpgrade: handleUpgrade,
  notify: notify
}
