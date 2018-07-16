const MODULE_ID = 'static'
const logger = require('../../../utils/logger')
const httpErr = require('restify-errors')

module.exports = (server, plugins) => {
  server.get('/display/*', plugins.serveStatic({
    directory: './network/routes/static',
    default: 'live.html'
  }))
}
