'use strict'

var numLanes, numCars, numRounds

const evaluateGenerator = (generator) => {
  var i, r, l, tc, k
  // creates an array with number of cars + 1 elements
  var count = []

  // console.log('Checking: ', JSON.stringify(generator, null, 0))

  // resets the array to zero
  // TODO: check what is with element
  // index 0 and the last one?!
  for (i = 1; i <= numCars; i++) count[i] = 0

  // iterate over the number of rounds, index starts at 0
  for (r = 0; r < numRounds; r++) {
    // iterate over the number of lanes
    for (l = 1; l <= numLanes; l++) {
      // if it is not the first lane
      if (l > 1) {
        // reset counter index to 1 tc is a car number
        tc = 1
        // iterate over the generator digits downwards
        // means look, if car 1 appeard in lane l, which
        // cars would appear in the lanes below l
        for (k = l - 1; k >= 1; k--) {
          // generator here is the gens array of all the generator digits
          // r * (numLanes - 1) is the index of the first generator digit
          // for this round, so calculate a new car number
          tc -= generator[k + r * (numLanes - 1)]
          // wrap around if needed
          if (tc < 1) tc += numCars
          // increment the counter, that this car would be selected
          count[tc]++
        }
      }
      // if it is not the last lane
      if (l < numLanes) {
        // reset car number to 1
        tc = 1
        // iterate over remaining generator digits
        // means, look if car 1 appeared in lane l, which
        // cars would appear in lanes above l
        for (k = l; k < numLanes; k++) {
          // calculate the car numbers which would be selected by
          // this generator
          tc += generator[k + r * (numLanes - 1)]
          // wrap around if needed
          if (tc > numCars) tc -= numCars
          // increment the counter, that this car would be selected
          count[tc]++
        }
      }
    }
  }
  var rlo = 9999
  var rhi = 0
  for (i = 2; i <= numCars; i++) {
    // remember the maximum count, how often a car appeared as opponent
    if (count[i] > rhi) rhi = count[i]
    // remember the minimum count, how often a car appeared as opponent
    if (count[i] < rlo) rlo = count[i]
  }
  // if counts are equal, this could be a perfect or complementary perfect race
  if (rhi === rlo) {
    for (i = 1; i < numLanes; i++) {
      tc = 0
      for (r = 0; r < numRounds; r++) tc += generator[i + r * (numLanes - 1)]
      if (tc % numCars !== 0) {
        // if over all races the generators sum up to number of cars
        // then two cars appear in switched lanes in those races
        // Return: Perfect-N
        return 2
      }
    }
    // if we end up here
    // Return: Complementary Perfect-N
    return 3
  } else if (rhi === rlo + 1) {
    // the number differ at max by one, so it is
    // Return: Partial Perfect-N
    return 1
  } else {
    // This is a not so good solution
    return 0
  }
}

const sumReducer = (accumulator, currentValue) => accumulator + currentValue

const createGenerators = (nL, nC, nR) => {
  numLanes = nL
  numCars = nC
  numRounds = nR
  // generate tuples of generator digits
  let exhausted = false
  let generator = []
  let laneExhausted = []
  // initialise those dynamic arrays
  for (let l = 0; l < numLanes - 1; l++) {
    generator[l] = 1
    laneExhausted[l] = false
  }

  // evaluate the very first version as well
  let rc = evaluateGenerator([0, ...generator])
  if (rc > 0) {
    // seems to work
    console.log(JSON.stringify(generator, null, 0) + ' -> ' + rc)
  }

  while (!exhausted) {
    // get a new set of digits for the generator
    // start by incrementing the last digit, until
    // exhausted, then continue with the last but one and so on
    let couldIncrement = false
    for (let l = numLanes - 2; l >= 0; l--) {
      if (!couldIncrement) {
        // try incrementing this one
        generator[l]++
        // check, if it still fits
        if (generator.reduce(sumReducer) >= numCars) {
        // if (generator[l] >= numCars) {
          // exhausted, reset to one
          generator[l] = 1
        } else {
          // we can work with this configuration
          couldIncrement = true
        }
      }
    }
    if (!couldIncrement) {
      exhausted = true
    } else {
      // we can try to work with this configuration
      let rc = evaluateGenerator([0, ...generator])
      if (rc > 0) {
        // seems to work
        console.log(JSON.stringify(generator, null, 0) + ' -> ' + rc)
      }
    }
  }
}

module.exports = {
  createGenerators: createGenerators,
  evaluateGenerator: evaluateGenerator
}
