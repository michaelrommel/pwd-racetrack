'use strict'

const MODULE_ID = 'network'
const config = require('../utils/config')
const logger = require('../utils/logger')
const jwt = require('restify-jwt-community')
const fs = require('fs')
const nanoid = require('nanoid')

// const util = require('util')

const restify = require('restify')
const plugins = require('restify').plugins
const corsplugin = require('restify-cors-middleware')

var options = {
  certificate: fs.readFileSync('./network/pwd-racetrack.chained.crt.pem'),
  key: fs.readFileSync('./network/pwd-racetrack.key.pem'),
  handleUpgrades: true
}

var server = restify.createServer(options)

const cors = corsplugin({
  preflightMaxAge: 5,
  origins: [
    'http://localhost:3000'
  ],
  allowHeaders: ['Authorization'],
  exposeHeaders: ['Authorization']
})

async function init (ctx) {
  var db = ctx.db
  var serial = ctx.serial

  var appSettings

  server.pre(cors.preflight)
  server.use(cors.actual)

  server.use(plugins.bodyParser())

  try {
    // try to get the basic configuration
    appSettings = await db.settings.get('settings')
  } catch (err) {
    if (err.notFound) {
      // could not get settings, perhaps a fresh install
      appSettings = {
        'appState': 'fresh',
        'jwtSecret': nanoid(),
        'rootpwd': false
      }
      try {
        db.settings.put('settings', appSettings)
        logger.info('%s::init: application settings stored', MODULE_ID)
      } catch (err) {
        logger.error('%s::init: could not store application settings!', MODULE_ID)
        throw (err)
      }
    } else {
      logger.error('%s::init: error while loading app settings!', MODULE_ID)
    }
  }

  // authorization
  var jwtConfig = {
    secret: appSettings.jwtSecret
  }

  // secure all routes except /ping and /login
  server.use(jwt(jwtConfig).unless({
    path: [
      /ping/ig,
      /display/ig,
      /favicon.ico/ig,
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
  require('./routes')({ server, plugins, db, serial })

  // start server
  server.listen(config.PORT)
  logger.info('%s: ready. listening on port %d', MODULE_ID, config.PORT)
}

module.exports = {
  init: init
}
