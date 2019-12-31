

function getMatchSchedule(division, matchData){
  const matchSchedule = [];

  // Get all matchups
  for (let i = 0; i < division.players.length; i++){
    for (let j = 0; j < division.players.length; j++){
      // Toss out matches vs. yourself or not in alphabetical order (to not double count)
      if (division.players[i] >= division.players[j]){
        continue;
      }
      
    }
  }

  // Count how





  return matchSchedule;
}

/* 
Main method to:
- Simulate many games
- Add a property to each player based on promo chance and relegation chance
- Sort by promo chance and relegation chance */
function runSimulation(division, matchData){
  // Make result counter objects
  const promoCounts = {}
  const relegationCounts = {}
  for (let p = 0; p < division.players.length; p++){
    promoCounts[division.players[p]] = 0;
    relegationCounts[division.players[p]] = 0;
  }

  console.log("promoCounts", promoCounts, "\nrelegationCounts", relegationCounts);

  // Get match schedule
  const matchSchedule = getMatchSchedule
}

module.exports = {
  runSimulation
}