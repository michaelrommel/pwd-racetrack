'use strict'

const config = require('./utils/config')
const logger = require('./utils/logger')
const jwt = require('restify-jwt-community')

var restify = require('restify')
var plugins = require('restify').plugins

var server = restify.createServer()

function init (ctx) {
  server.use(plugins.bodyParser())

  // authorization
  var jwtConfig = {
    secret: config.JWT_SECRET
  }

  // secure all routes except /ping and /login
  server.use(jwt(jwtConfig).unless({
    path: [
      '/ping',
      '/user/login'
    ]
  }))

  // configure routes
  require('./routes')({server, plugins, ctx.db, ctx.serial})

  // start server
  server.listen(config.PORT)
  logger.info('%s: ready. listening on port %d', MODULE_ID, config.PORT)
}

module.exports = {
  init: init,
  startSetupRT: startSetupRT,
  stopSetupRT: stopSetupRT,
  initHeat: initHeat,
  startHeat: startHeat
}
