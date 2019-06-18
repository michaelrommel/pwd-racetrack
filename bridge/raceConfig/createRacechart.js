'use strict'

// generators is an array ot two generators
const createRacechart = (nL, nC, nR, generators) => {
  let numLanes = nL
  let numCars = nC
  // let numRounds = nR
  let chart = []
  // generate as many rows as there are cars in the race
  for (let row = 0; row < numCars; row++) {
    chart[row] = []
    // start by putting each car in lane 1
    let carNumber = row
    chart[row][0] = carNumber
    for (let l = 1; l < numLanes; l++) {
      // calculate the rest of the cars
      // odd rows use generator0
      carNumber += generators[row & 1][l - 1]
      carNumber %= numCars
      chart[row][l] = carNumber
    }
  }
  return chart
}

module.exports = {
  createRacechart: createRacechart
}
