const NUM_ITERATIONS = process.env.NUM_ITERATIONS || 20000;

const util = require("./util");

/*
Simulate one run through from the current moment in time to the end of the season.
Code is similar to `computeRawStandings` in compute.js
*/
function simulateOneIteration(
  division,
  matchSchedule,
  promoCounts,
  relegationCounts
) {
  const cloneDivision = JSON.parse(JSON.stringify(division));

  const divisionStandings = cloneDivision.standings;

  // Loop through the match schedule and pick random winners
  for (let i = 0; i < matchSchedule.length; i++) {
    const playerName1 = matchSchedule[i].playerName1;
    const playerName2 = matchSchedule[i].playerName2;

    const randWinIndex = Math.floor(Math.random() * 2);
    const winnerName = [playerName1, playerName2][randWinIndex];
    const loserName = [playerName1, playerName2][1 - randWinIndex];
    const winner = util.getPlayerData(divisionStandings, winnerName);
    const loser = util.getPlayerData(divisionStandings, loserName);
    const randLoserGames = Math.floor(Math.random() * 3);

    // Update the four key source of truth properties (W,L,GF,GA) for each match
    // console.log("winner:", winnerName, "current points:", winner.points)
    // console.log("loser:", loserName, "current points:", loser.points)
    winner["wins"] += 1;
    winner["gf"] += 3;
    winner["ga"] += randLoserGames;
    winner["points"] += 4;
    loser["losses"] += 1;
    loser["gf"] += randLoserGames;
    loser["ga"] += 3;
    loser["points"] += randLoserGames;
    // console.log("new winner points:", winner.points)
    // console.log("new loser points:", loser.points)
  }

  // Loop through the standings by player and update the rest of the properties
  // (MP, GD)
  for (let p = 0; p < divisionStandings.length; p++) {
    player = divisionStandings[p];
    player.mp = player.wins + player.losses;
    player.gd = player.gf - player.ga;
  }

  // Sort the simulated results by points, GD, etc.
  divisionStandings.sort(util.compareRaw);

  // Determine who gets promoted
  const numPromo = division.numAutoPromo + division.numSoftPromo;
  const numRelegate = division.numSoftRelegate + division.numHardRelegate;

  // console.log("\n\n\nAbout to promo/relegate-------------" + JSON.stringify(divisionStandings, null, 3));

  // Auto promo or win
  for (let i = 0; i < division.numAutoPromo + division.numWinner; i++) {
    const promoedName = divisionStandings[i].name;
    // console.log("Promo: " + promoedName);
    promoCounts[promoedName] += 1;
  }

  // Soft promo gets a 50% chance of promoing (I know it's oversimplifying but whatever)
  for (let i = division.numAutoPromo; i < numPromo; i++) {
    const maybePromoedName = divisionStandings[i].name;
    const coinFlip = Math.floor(Math.random() * 2);
    if (coinFlip == 1) {
      // console.log("Promo: " + promoedName);
      promoCounts[maybePromoedName] += 1;
    }
  }

  // Auto relegate
  const end = cloneDivision.players.length - 1;
  for (let j = end; j > end - division.numHardRelegate; j--) {
    const relegatedName = divisionStandings[j].name;
    // console.log("Relegated: " + relegatedName);
    relegationCounts[relegatedName] += 1;
  }

  // Soft relegate gets 50% chance of relegating
  for (let j = end - division.numHardRelegate; j > end - numRelegate; j--) {
    const maybeRelegatedName = divisionStandings[j].name;
    const coinFlip = Math.floor(Math.random() * 2);
    if (coinFlip == 1) {
      // console.log("Relegated: " + relegatedName);
      relegationCounts[maybeRelegatedName] += 1;
    }
  }
}

/* 
Main method to:
- Simulate many games
- Add a property to each player based on promo chance and relegation chance
- Sort by promo chance and relegation chance */
function runSimulation(division, matchSchedule) {
  // Make result counter objects
  const promoCounts = {};
  const relegationCounts = {};
  for (let p = 0; p < division.players.length; p++) {
    promoCounts[division.players[p]] = 0;
    relegationCounts[division.players[p]] = 0;
  }

  // Simulate all the iterations
  for (let iterCount = 0; iterCount < NUM_ITERATIONS; iterCount++) {
    simulateOneIteration(
      division,
      matchSchedule,
      promoCounts,
      relegationCounts
    );
  }

  // Compute promotion chances
  for (let p = 0; p < division.players.length; p++) {
    const player = division.standings[p];
    player.promoChance = (
      (promoCounts[player.name] * 100) /
      NUM_ITERATIONS
    ).toFixed(3);
    player.relegationChance = (
      (relegationCounts[player.name] * 100) /
      NUM_ITERATIONS
    ).toFixed(3);
  }

  return division;
}

module.exports = {
  runSimulation
};
