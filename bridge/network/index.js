'use strict'

const MODULE_ID = 'network'
const config = require('../utils/config')
const logger = require('../utils/logger')
const jwt = require('restify-jwt-community')
const fs = require('fs')

// const util = require('util')

const restify = require('restify')
const plugins = require('restify').plugins

var options = {
  certificate: fs.readFileSync('./network/pwd-racetrack.onehc.net.chained.crt.pem'),
  key: fs.readFileSync('./network/pwd-racetrack.onehc.net.key.pem'),
  handleUpgrades: true
}

var server = restify.createServer(options)

function init (ctx) {
  var db = ctx.db
  var serial = ctx.serial

  server.use(plugins.bodyParser())

  // authorization
  var jwtConfig = {
    secret: config.JWT_SECRET
  }

  // secure all routes except /ping and /login
  server.use(jwt(jwtConfig).unless({
    path: [
      /ping/ig,
      /display/ig,
      /race\/leaderboard/ig,
      /race\/highscore/ig,
      /race\/lanes/ig,
      /heat\/current/ig,
      /heat\/next/ig,
      /user\/login/ig,
      /websocket\/attach/ig
    ]
  }))
  // logger.debug(util.inspect(ctx))

  // configure routes
  require('./routes')({server, ws, plugins, db, serial})

  // start server
  server.listen(config.PORT)
  logger.info('%s: ready. listening on port %d', MODULE_ID, config.PORT)
}

module.exports = {
  init: init
}
