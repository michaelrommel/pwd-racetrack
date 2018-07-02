const MODULE_ID = 'app:main'
const config = require('./config')
const logger = require('./utils/logger')
const jwt = require('restify-jwt-community')
const level = require('level')
const SerialPort = require('serialport')

logger.info('%s: initializing', MODULE_ID)

var restify = require('restify')
var plugins = require('restify').plugins

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
    '/register'
  ]
}))

// Routes
require('./routes')(server, plugins)

// Serve
server.listen(config.PORT)
logger.info('%s: ready. listening on port %d', MODULE_ID, config.PORT)

var heatdb = level('./heatdb')

var port1 = new SerialPort('COM7',
  { 'baudRate': 57600,
    'dataBits': 8,
    'parity': 'none',
    'stopBits': 1
  },
  function (err) {
    if (err) {
      logger.info('Error opening: %s', err.message)
    }
  }
)

// for testing just an incremented number
var i = 0

port1.on('readable', function () {
  let newdata = port1.read().toString('utf8')
  logger.info('got serial data: %s', newdata)
  heatdb.put(i, newdata)
  i++

  // show all key-value pairs
  heatdb.createReadStream()
    .on('data', function (data) {
      logger.info('Key=%s, Value=%s', data.key, data.value)
    })
    .on('error', function (err) {
      logger.info('Error while reading db stream: %s!', err)
    })
    .on('close', function () {
      logger.info('DB stream closed')
    })
    .on('end', function () {
      logger.info('Stream ended')
    })
})

module.exports = server
