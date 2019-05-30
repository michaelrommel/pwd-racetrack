'use strict'

const MODULE_ID = 'network'
const config = require('../utils/config')
const logger = require('../utils/logger')
const userUtils = require('./routes/user/userUtils')

// const util = require('util')

const fs = require('fs')
const restify = require('restify')
const plugins = require('restify').plugins
const jwt = require('restify-jwt-community')
const corsplugin = require('restify-cors-middleware')
const nanoid = require('nanoid')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const GithubStrategy = require('passport-github').Strategy

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

  userUtils.setContext(ctx)

  try {
    // try to get the basic configuration
    appSettings = await db.settings.get('settings')
    logger.info('%s::init: application settings retrieved', MODULE_ID)
  } catch (err) {
    if (err.notFound) {
      // could not get settings, perhaps a fresh install
      appSettings = {
        'appState': 'fresh',
        'jwtSecret': nanoid(),
        'rootpwd': nanoid(),
        'rootPwdChanged': false
      }
      try {
        await db.settings.put('settings', appSettings)
        logger.info('%s::init: fresh application settings stored', MODULE_ID)
        // try to create a root user
        try {
          await userUtils.modifyUser('root', appSettings.rootpwd, 'admin')
          logger.info('%s::init: preliminary root user created', MODULE_ID)
        } catch (err) {
          logger.error('%s::init: preliminary root user could not be created', MODULE_ID)
          throw (err)
        }
      } catch (err) {
        logger.error('%s::init: could not store application settings!', MODULE_ID)
        throw (err)
      }
    } else {
      logger.error('%s::init: error while loading app settings!', MODULE_ID)
    }
  }

  if (appSettings.githubClientId !== undefined &&
    appSettings.githubClientId !== '' &&
    appSettings.githubClientSecret !== undefined &&
    appSettings.githubClientSecret !== '') {
    passport.use(new GithubStrategy(
      {
        clientID: appSettings.githubClientId,
        clientSecret: appSettings.githubClientSecret,
        callbackURL: 'https://127.0.0.1/auth/github-token'
      },
      // this is the verify() function
      async function (accessToken, refreshToken, profile, done) {
        try {
          let user = await userUtils.findUser({ githubId: profile.id })
          // possibly create a token here?
          return done(null, user)
        } catch (err) {
          return done(err, profile)
        }
      }
    ))
  }

  passport.use(new LocalStrategy(
    // this is the verify() function
    async function (username, password, done) {
      try {
        let user = await userUtils.verifyUser(username, password)
        if (user) {
          // we got a user object back
          return done(null, user)
        } else {
          // credential validation failed
          return done(null, false)
        }
      } catch (err) {
        return done(err)
      }
    }
  ))

  server.pre(cors.preflight)
  server.use(cors.actual)

  server.use(plugins.bodyParser())

  server.use(passport.initialize())

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
      /race\/current/ig,
      /race\/leaderboard/ig,
      /race\/highscore/ig,
      /race\/lanes/ig,
      /heat\/current/ig,
      /heat\/next/ig,
      /user\/login/ig,
      /auth/ig,
      /admin\/init/ig,
      /websocket\/attach/ig
    ]
  }))
  // logger.debug(util.inspect(ctx))

  // configure routes
  require('./routes')({ server, plugins, db, serial })

  // start server
  server.listen(config.PORT)
  logger.info('%s::init: ready. listening on port %d', MODULE_ID, config.PORT)
}

module.exports = {
  init: init
}
