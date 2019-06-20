const generatorCreator = require('./GeneratorCreator')
const createRacechart = require('./createRacechart')

let rc
// rc = raceConfig.createRaceConfig(4, 25, 1)
// rc = raceConfig.createRaceConfig(4, 7, 2)
// rc = raceConfig.createRaceConfig(4, 7, 2)

// try generators
let nL = 7
let nC = 8
generatorCreator.createGenerators(nL, nC, 1)
// rc = generatorCreator.evaluateGenerator([0, 1, 2, 2, 3, 6])
// rc = generatorCreator.evaluateGenerator([0, 3, 3, 5, 8])
// console.log(rc)
let chart = createRacechart.createRacechart(
  nL, nC, 1,
  [
    [1, 1, 1, 1, 1, 1],
    [7, 7, 7, 7, 7, 7]
  ]
)
for (let r = 0; r < nC; r++) {
  process.stdout.write('Heat ' + (r + 1) + ': ')
  for (let l = 0; l < nL; l++) {
    process.stdout.write(chart[r][l] + 1 + ', ')
  }
  process.stdout.write('\n')
}
