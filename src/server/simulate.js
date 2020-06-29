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

  // Soft promo gets .5 of a promo (since they have a 50% chance)
  for (let i = division.numAutoPromo; i < numPromo; i++) {
    const maybePromoedName = divisionStandings[i].name;
    promoCounts[maybePromoedName] += 0.5;
  }

  // Auto relegate
  const end = cloneDivision.players.length - 1;
  for (let j = end; j > end - division.numHardRelegate; j--) {
    const relegatedName = divisionStandings[j].name;
    // console.log("Relegated: " + relegatedName);
    relegationCounts[relegatedName] += 1;
  }

  // Soft relegate gets .5 of a relegation (since they have a 50% chance)
  for (let j = end - division.numHardRelegate; j > end - numRelegate; j--) {
    const maybeRelegatedName = divisionStandings[j].name;
    relegationCounts[maybeRelegatedName] += 0.5;
  }
}

/*
Simulate the worst possible season for a player (naively, not following match schedule)
*/
function simulateWorstSeasonForPlayer(division, targetPlayer) {
  const cloneDivision = JSON.parse(JSON.stringify(division));
  const divisionStandings = cloneDivision.standings;

  const matchesPerSeason = (divisionStandings.length - 1) * 2;

  for (let p = 0; p < divisionStandings.length; p++) {
    loopPlayer = divisionStandings[p];
    // Worst case for target player
    if (loopPlayer.name == targetPlayer.name) {
      const toPlay = matchesPerSeason - loopPlayer.mp;
      loopPlayer.points += 0; // 0s for clarity
      loopPlayer.gd += toPlay * -3;
      loopPlayer.gf += 0;
      loopPlayer.ga += toPlay * 3;
      loopPlayer.losses += toPlay;
      loopPlayer.wins += 0;
      loopPlayer.mp += toPlay;
    } else {
      // Best case for all others
      const toPlay = matchesPerSeason - loopPlayer.mp;
      loopPlayer.points += toPlay * 4;
      loopPlayer.gd += toPlay * 3;
      loopPlayer.gf += toPlay * 3;
      loopPlayer.ga += 0; // for clarity
      loopPlayer.losses += 0; // for clarity
      loopPlayer.wins += toPlay;
      loopPlayer.mp += toPlay;
    }
  }

  // Sort the simulated results by points, GD, etc.
  divisionStandings.sort(util.compareRaw);
  return divisionStandings;
}

/*
Simulate the best possible season for a player (naively, not following match schedule)
*/
function simulateBestSeasonForPlayer(division, targetPlayer) {
  const cloneDivision = JSON.parse(JSON.stringify(division));
  const divisionStandings = cloneDivision.standings;

  const matchesPerSeason = (divisionStandings.length - 1) * 2;

  for (let p = 0; p < divisionStandings.length; p++) {
    loopPlayer = divisionStandings[p];
    // Worst case for all other players
    if (loopPlayer.name != targetPlayer.name) {
      const toPlay = matchesPerSeason - loopPlayer.mp;
      loopPlayer.points += 0; // 0s for clarity
      loopPlayer.gd += toPlay * -3;
      loopPlayer.gf += 0;
      loopPlayer.ga += toPlay * 3;
      loopPlayer.losses += toPlay;
      loopPlayer.wins += 0;
      loopPlayer.mp += toPlay;
    } else {
      // Best case for target player
      const toPlay = matchesPerSeason - loopPlayer.mp;
      loopPlayer.points += toPlay * 4;
      loopPlayer.gd += toPlay * 3;
      loopPlayer.gf += toPlay * 3;
      loopPlayer.ga += 0; // for clarity
      loopPlayer.losses += 0; // for clarity
      loopPlayer.wins += toPlay;
      loopPlayer.mp += toPlay;
    }
  }

  // Sort the simulated results by points, GD, etc.
  divisionStandings.sort(util.compareRaw);
  return divisionStandings;
}

function didClinchPromo(targetPlayer, division) {
  const divisionStandings = simulateWorstSeasonForPlayer(
    division,
    targetPlayer
  );
  let promoed = false;

  // Check if the guaranteed promoed players includes the target
  for (let i = 0; i < division.numAutoPromo + division.numWinner; i++) {
    const promoedName = divisionStandings[i].name;
    if (promoedName === targetPlayer.name) {
      promoed = true;
    }
  }
  return promoed;
}

function didClinchNonRelegation(player, division) {
  const divisionStandings = simulateWorstSeasonForPlayer(division, player);
  let relegated = false;

  // Auto+Soft relegate
  const end = division.players.length - 1;
  const numRelegate = division.numSoftRelegate + division.numHardRelegate;
  for (let j = end; j > end - numRelegate; j--) {
    const relegatedName = divisionStandings[j].name;
    if (relegatedName === player.name) {
      relegated = true;
    }
  }
  return !relegated;
}

function didClinchRelegation(player, division) {
  const divisionStandings = simulateBestSeasonForPlayer(division, player);
  let relegated = false;

  // Auto relegate only
  const end = division.players.length - 1;
  for (let j = end; j > end - division.numHardRelegate; j--) {
    const relegatedName = divisionStandings[j].name;
    if (relegatedName === player.name) {
      relegated = true;
    }
  }
  return relegated;
}

function didClinchNonPromo(player, division) {
  const divisionStandings = simulateBestSeasonForPlayer(division, player);
  let promoed = false;

  // Auto promo or win
  for (
    let i = 0;
    i < division.numAutoPromo + division.numWinner + division.numSoftPromo;
    i++
  ) {
    const promoedName = divisionStandings[i].name;
    if (promoedName === player.name) {
      promoed = true;
    }
  }
  return !promoed;
}

// Function for manual testing of clinching methods. Unused currently.
function testClinchingCalculationMethods() {
  const memeDivision = util.memeDivisionData[0];
  console.log(
    "clinchedPromo:",
    didClinchPromo(memeDivision.standings[0], memeDivision)
  );
  console.log(
    "clinchedRelegation:",
    didClinchRelegation(memeDivision.standings[0], memeDivision)
  );
  console.log(
    "clinchedNonPromo:",
    didClinchNonPromo(memeDivision.standings[0], memeDivision)
  );
  console.log(
    "clinchedNonRelegation:",
    didClinchNonRelegation(memeDivision.standings[0], memeDivision)
  );
}

function playerFullyTied(player1, player2) {
  return (
    player1.wins == player2.wins &&
    player1.losses == player2.losses &&
    player1.gd == player2.gd &&
    player1.points == player2.points
  );
}

/** Find all clusters of players with the same states, and make them have the same simulation stats. */
function correctForVariance(division) {
  const playerList = division.standings;

  // Get clusters
  let clusters = [];
  for (const currentPlayer of playerList) {
    let foundCluster = false;
    // Check if it matches any of the clusters
    for (let c = 0; c < clusters.length; c++) {
      const clusterFirstPlayer = clusters[c][0];
      if (playerFullyTied(currentPlayer, clusterFirstPlayer)) {
        foundCluster = 1;
        clusters[c].push(currentPlayer);
      }
    }

    if (!foundCluster) {
      // Make new cluster
      clusters.push([currentPlayer]);
    }
  }

  // Normalize across each cluster
  for (const cluster of clusters) {
    let promoTotal = 0;
    let relTotal = 0;
    for (player of cluster) {
      promoTotal += parseFloat(player.promoChance);
      relTotal += parseFloat(player.relegationChance);
    }
    const normalizedPromo = promoTotal / cluster.length;
    const normalizedRel = relTotal / cluster.length;
    for (player of cluster) {
      player.promoChance = normalizedPromo;
      player.relegationChance = normalizedRel;
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

    // Check 100s and 0s for if they actually clinched or not
    if (player.promoChance == 100 && !didClinchPromo(player, division)) {
      player.promoChance = 99.99;
    } else if (
      player.promoChance == 0 &&
      !didClinchNonPromo(player, division)
    ) {
      player.promoChance = 0.01;
    }
    if (
      player.relegationChance == 100 &&
      !didClinchRelegation(player, division)
    ) {
      player.relegationChance = 99.99;
    } else if (
      player.relegationChance == 0 &&
      !didClinchNonRelegation(player, division)
    ) {
      player.relegationChance = 0.01;
    }
  }

  correctForVariance(division);

  return division;
}

module.exports = {
  runSimulation
};
