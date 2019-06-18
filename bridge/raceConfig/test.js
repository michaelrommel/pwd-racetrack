const generatorCreator = require('./GeneratorCreator')
const createRacechart = require('./createRacechart')

let rc
// rc = raceConfig.createRaceConfig(4, 25, 1)
// rc = raceConfig.createRaceConfig(4, 7, 2)
// rc = raceConfig.createRaceConfig(4, 7, 2)

// try generators
generatorCreator.createGenerators(6, 6, 1)
// rc = generatorCreator.evaluateGenerator([0, 1, 2, 2, 3, 6])
// rc = generatorCreator.evaluateGenerator([0, 3, 3, 5, 8])
// console.log(rc)
let chart = createRacechart.createRacechart(
  6, 6, 1,
  [
    [1, 1, 1, 1, 1],
    [5, 5, 5, 5, 5]
  ]
)
for (let r = 0; r < 6; r++) {
  process.stdout.write('Heat ' + (r + 1) + ': ')
  for (let l = 0; l < 6; l++) {
    process.stdout.write(chart[r][l] + 1 + ', ')
  }
  process.stdout.write('\n')
}
