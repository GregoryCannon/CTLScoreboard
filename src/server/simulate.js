const util = require("./util");
const adjustedProbability = require("./adjusted-probability");
const clinchChecker = require("./clinch-checker");

const NUM_ITERATIONS = 20000;
// Whether or not to adjust players' simulated winrates based on their performance so far
const USE_ADJUSTED_PROBABILITIES = true;

/*
Simulate one run through from the current moment in time to the end of the season.
Code is similar to `computeRawStandings` in compute.js
*/
function simulateOneIteration(division, matchSchedule, resultCounts) {
  const simulationCloneDivision = JSON.parse(JSON.stringify(division));
  const startOfSeasonCloneDivision = JSON.parse(JSON.stringify(division));

  const divisionStandings = simulationCloneDivision.standings;
  const startOfSimPlayerLookup = util.getPlayerLookupMap(startOfSeasonCloneDivision);

  // Loop through the match schedule and pick random winners
  for (const match of matchSchedule) {
    const playerName1 = match.playerName1;
    const playerName2 = match.playerName2;
    const playerData1 = util.getPlayerData(divisionStandings, playerName1);
    const playerData2 = util.getPlayerData(divisionStandings, playerName2);

    // Pick a match result
    let winner, loser, loserGames;
    if (USE_ADJUSTED_PROBABILITIES) {
      // Use statistical analysis for more accurate simulation
      const result = adjustedProbability.getMatchResult(
        playerName1,
        playerName2,
        startOfSimPlayerLookup
      );
      winner = result.player1Win ? playerData1 : playerData2;
      loser = result.player1Win ? playerData2 : playerData1;
      loserGames = result.loserGames;
    } else {
      // Old method (all matches 50/50)
      const randWinIndex = Math.floor(Math.random() * 2);
      const winnerName = [playerName1, playerName2][randWinIndex];
      const loserName = [playerName1, playerName2][1 - randWinIndex];
      winner = util.getPlayerData(divisionStandings, winnerName);
      loser = util.getPlayerData(divisionStandings, loserName);
      loserGames = Math.floor(Math.random() * 3);
    }

    // Update the four key source of truth properties (W,L,GF,GA) for each match
    // console.log("winner:", winnerName, "current points:", winner.points)
    // console.log("loser:", loserName, "current points:", loser.points)
    winner["wins"] += 1;
    winner["gf"] += 3;
    winner["ga"] += loserGames;
    winner["points"] += 4;
    loser["losses"] += 1;
    loser["gf"] += loserGames;
    loser["ga"] += 3;
    loser["points"] += loserGames;
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
  const numPromo = division.numAutoPromo + division.numPlayoffPromo;
  const numRelegate = division.numPlayoffRelegate + division.numAutoRelegate;

  // Auto promo or win
  for (let i = 0; i < division.numAutoPromo + division.numWinner; i++) {
    resultCounts.autoPromo[divisionStandings[i].name] += 1;
  }

  // Playoff promo
  for (let i = division.numAutoPromo; i < numPromo; i++) {
    resultCounts.playoffPromo[divisionStandings[i].name] += 1;
  }

  // Playoff relegation
  const end = simulationCloneDivision.players.length - 1;
  for (let j = end - division.numAutoRelegate; j > end - numRelegate; j--) {
    resultCounts.playoffRelegation[divisionStandings[j].name] += 1;
  }

  // Auto relegation
  for (let j = end; j > end - division.numAutoRelegate; j--) {
    resultCounts.autoRelegation[divisionStandings[j].name] += 1;
  }
}

function playersHaveEquivalentUpcomingMatches(
  player1,
  player2,
  division,
  matchSchedule
) {
  const player1Schedule = matchSchedule.filter(
    x => x.playerName1 === player1.name || x.playerName2 === player1.name
  );
  const player2Schedule = matchSchedule.filter(
    x => x.playerName1 === player2.name || x.playerName2 === player2.name
  );
  const mwdList1 = player1Schedule.map(x => {
    const opponentName =
      x.playerName1 === player1.name ? x.playerName2 : x.playerName1;
    const opponent = util.getPlayerData(division.standings, opponentName);
    return player1.wins - player1.losses - (opponent.wins - opponent.losses);
  });
  const mwdList2 = player2Schedule.map(x => {
    const opponentName =
      x.playerName1 === player2.name ? x.playerName2 : x.playerName1;
    const opponent = util.getPlayerData(division.standings, opponentName);
    return player2.wins - player2.losses - (opponent.wins - opponent.losses);
  });
  mwdList1.sort();
  mwdList2.sort();
  return JSON.stringify(mwdList1) === JSON.stringify(mwdList2);
}

function playerFullyTied(player1, player2, division, matchSchedule) {
  if (USE_ADJUSTED_PROBABILITIES) {
    // If the simulations account for player strength, players cannot be fully tied unless
    // they have no games played or the same opponent schedule
    return (
      player1.wins + player1.losses + player2.wins + player2.losses == 0 ||
      (player1.wins === player2.wins &&
        player1.losses === player2.losses &&
        playersHaveEquivalentUpcomingMatches(
          player1,
          player2,
          division,
          matchSchedule
        ))
    );
  } else {
    return (
      player1.wins == player2.wins &&
      player1.losses == player2.losses &&
      player1.gd == player2.gd &&
      player1.points == player2.points
    );
  }
}

/** Find all clusters of players with the same states, and make them have the same simulation stats. */
function correctForVariance(division, matchSchedule) {
  const playerList = division.standings;

  // Get clusters
  let clusters = [];
  for (const currentPlayer of playerList) {
    let foundCluster = false;
    // Check if it matches any of the clusters
    for (let c = 0; c < clusters.length; c++) {
      const clusterFirstPlayer = clusters[c][0];
      if (
        playerFullyTied(
          currentPlayer,
          clusterFirstPlayer,
          division,
          matchSchedule
        )
      ) {
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
    let autoPromoTotal = 0;
    let playoffPromoTotal = 0;
    let autoRelTotal = 0;
    let playoffRelTotal = 0;
    for (player of cluster) {
      autoPromoTotal += parseFloat(player.autoPromoChance);
      playoffPromoTotal += parseFloat(player.playoffPromoChance);
      autoRelTotal += parseFloat(player.autoRelegationChance);
      playoffRelTotal += parseFloat(player.playoffRelegationChance);
    }
    const normalizedAutoPromo = autoPromoTotal / cluster.length;
    const normalizedPlayoffPromo = playoffPromoTotal / cluster.length;
    const normalizedAutoRel = autoRelTotal / cluster.length;
    const normalizedPlayoffRel = playoffRelTotal / cluster.length;

    for (player of cluster) {
      player.autoPromoChance = normalizedAutoPromo;
      player.playoffPromoChance = normalizedPlayoffPromo;
      player.autoRelegationChance = normalizedAutoRel;
      player.playoffRelegationChance = normalizedPlayoffRel;
    }
  }
}

function getChance(type, resultCounts, player) {
  return parseFloat(
    ((resultCounts[type][player.name] / NUM_ITERATIONS) * 100).toFixed(3)
  );
}

/** Takes the counts from the simulation and computes probabilities of each outcome */
function assignChancesToPlayers(resultCounts, division) {
  // Compute chances of all outcomes
  for (const player of division.standings) {
    player.autoPromoChance = getChance("autoPromo", resultCounts, player);
    player.playoffPromoChance = getChance("playoffPromo", resultCounts, player);
    player.autoRelegationChance = getChance(
      "autoRelegation",
      resultCounts,
      player
    );
    player.playoffRelegationChance = getChance(
      "playoffRelegation",
      resultCounts,
      player
    );
  }
}

/* 
Main method to:
- Simulate many games
- Add a property to each player based on promo chance and relegation chance
- Sort by promo chance and relegation chance */
function runSimulation(division, matchSchedule) {
  // Make result counter object
  const resultCounts = {
    autoPromo: {},
    autoRelegation: {},
    playoffPromo: {},
    playoffRelegation: {},
    divisionWin: {}
  };

  for (let p = 0; p < division.players.length; p++) {
    const playerName = division.players[p];
    resultCounts.autoPromo[playerName] = 0;
    resultCounts.autoRelegation[playerName] = 0;
    resultCounts.playoffPromo[playerName] = 0;
    resultCounts.playoffRelegation[playerName] = 0;
    resultCounts.divisionWin[playerName] = 0;
  }

  // Simulate all the iterations
  for (let iterCount = 0; iterCount < NUM_ITERATIONS; iterCount++) {
    simulateOneIteration(division, matchSchedule, resultCounts);
  }

  assignChancesToPlayers(resultCounts, division);
  clinchChecker.checkClinchesForDivision(division);
  correctForVariance(division, matchSchedule);

  return division;
}

module.exports = {
  runSimulation
};
