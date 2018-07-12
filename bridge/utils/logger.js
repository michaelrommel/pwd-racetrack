const { createLogger, format, transports } = require('winston')
const config = require('./config')

const logger = createLogger({
  format: format.combine(
    format.colorize(),
    format.splat(),
    format.simple()
  ),
  level: config.LOG_LEVEL,
  transports: [
    new transports.Console({
      silent: false,
      timestamp: false
    })
  ],
  exitOnError: false
})

module.exports = logger
logger.debug('util:logger: initialized.')
logger.info('util:logger: ' + config.LOG_LEVEL)
