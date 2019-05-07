'use strict'

const MODULE_ID = 'db'
const fs = require('fs')
const level = require('level')
const logger = require('../utils/logger')

try {
  fs.accessSync('./databases',
    fs.constants.R_OK |
    fs.constants.W_OK |
    fs.constants.X_OK)
} catch (err) {
  logger.info('%s: fresh install, database directory will be created', MODULE_ID)
  fs.mkdirSync('./databases')
}

var car = level('./databases/car', { valueEncoding: 'json' })
var lane = level('./databases/lane', { valueEncoding: 'json' })
var heat = level('./databases/heat', { valueEncoding: 'json' })
var race = level('./databases/race', { valueEncoding: 'json' })
var raceconfig = level('./databases/raceconfig', { valueEncoding: 'json' })
var leaderboard = level('./databases/leaderboard', { valueEncoding: 'json' })
var highscore = level('./databases/highscore', { valueEncoding: 'json' })
var checkpoint = level('./databases/checkpoint', { valueEncoding: 'json' })

module.exports = {
  car: car,
  lane: lane,
  heat: heat,
  race: race,
  raceconfig: raceconfig,
  leaderboard: leaderboard,
  highscore: highscore,
  checkpoint: checkpoint
}
