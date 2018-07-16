'use strict'

const MODULE_ID = 'network'
const config = require('../utils/config')
const logger = require('../utils/logger')
const jwt = require('restify-jwt-community')

const util = require('util')

var restify = require('restify')
var plugins = require('restify').plugins

var server = restify.createServer()

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
      /race\/leaderboard/ig,
      /race\/highscore/ig,
      /heat\/current/ig,
      /heat\/next/ig,
      /user\/login/ig
    ]
  }))

  // logger.debug(util.inspect(ctx))

  // configure routes
  require('./routes')({server, plugins, db, serial})

  // start server
  server.listen(config.PORT)
  logger.info('%s: ready. listening on port %d', MODULE_ID, config.PORT)
}

module.exports = {
  init: init
}
