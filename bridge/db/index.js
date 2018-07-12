'use strict'

const level = require('level')

var race = level('./databases/race', {valueEncoding: 'json'})
var car = level('./databases/car', {valueEncoding: 'json'})
var lane = level('./databases/lane', {valueEncoding: 'json'})
var heat = level('./databases/heat', {valueEncoding: 'json'})
var leaderboard = level('./databases/leaderboard', {valueEncoding: 'json'})
var highscore = level('./databases/highscore', {valueEncoding: 'json'})
var checkpoint = level('./databases/checkpoint', {valueEncoding: 'json'})

module.exports = {
  race: race,
  car: car,
  lane: lane,
  heat: heat,
  leaderboard: leaderboard,
  highscore: highscore,
  checkpoint: checkpoint
}
