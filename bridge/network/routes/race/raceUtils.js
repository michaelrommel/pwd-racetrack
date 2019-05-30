const MODULE_ID = 'raceUtils'

// function for sorting leaderboard
const sortByCumScoreAndTime = (a, b) => {
  if ((a.cumulatedScore < b.cumulatedScore) ||
      (b.cumulatedScore === undefined)) {
    return 1
  } else if ((a.cumulatedScore > b.cumulatedScore) ||
             (a.cumulatedScore === undefined)) {
    return -1
  }
  // now we have to sort by ascending cumulated time
  if ((a.cumulatedTime < b.cumulatedTime) ||
      (b.cumulatedTime === undefined)) {
    return -1
  } else if ((a.cumulatedTime > b.cumulatedTime) ||
             (a.cumulatedTime === undefined)) {
    return 1
  }
  return 0
}

module.exports = {
  sortByCumScoreAndTime: sortByCumScoreAndTime
}
