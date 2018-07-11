const MODULE_ID = 'main'
const config = require('./config')
const logger = require('./utils/logger')
const jwt = require('restify-jwt-community')
const level = require('level')

logger.info('%s: initializing', MODULE_ID)

var restify = require('restify')
var plugins = require('restify').plugins

var racedb = level('./db/racedb', ({valueEncoding: 'json'}))
var cardb = level('./db/cardb', ({valueEncoding: 'json'}))
var lanedb = level('./db/lanedb', ({valueEncoding: 'json'}))
var heatdb = level('./db/heatdb', ({valueEncoding: 'json'}))
var leaderboarddb = level('./db/leaderboard', ({valueEncoding: 'json'}))
var highscoredb = level('./db/highscore', ({valueEncoding: 'json'}))

const serialCom = require('./serial')

var server = restify.createServer()

server.use(plugins.bodyParser())

// Auth
var jwtConfig = {
  secret: config.JWT_SECRET
}

// secure all routes. except /ping
server.use(jwt(jwtConfig).unless({
  path: [
    '/ping',
    '/user/login'
  ]
}))

// Routes
require('./routes')({server, plugins, racedb, cardb, heatdb, leaderboarddb, highscoredb, serialCom})

// Serve
server.listen(config.PORT)
logger.info('%s: ready. listening on port %d', MODULE_ID, config.PORT)

// initialize Serial communication
serialCom.init({lanedb, heatdb, leaderboarddb, highscoredb})
