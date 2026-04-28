import type { 
  Division, 
  DivisionWithChances, 
  MatchSchedule,
  PlayerStandings,
  PlayerStandingsWithChances,
  PromoChances
} from "../types.ts";
import {
  getPlayerLookupMap,
  getPlayerData,
  calculatePointsWon,
  compareRaw
} from "./util.ts";
import {
  checkClinchesForDivision
} from "./clinch-checker.ts";

type ResultCounts = {
  divisionWin: Record<string, number>,
  prizeMoney: Record<string, number>,
  autoPromo: Record<string, number>,
  playoffPromo: Record<string, number>,
  autoRelegation: Record<string, number>,
  playoffRelegation: Record<string, number>,
}

const NUM_ITERATIONS = 20000;
// Whether or not to adjust players' simulated winrates based on their performance so far

/*
Simulate one run through from the current moment in time to the end of the season.
Code is similar to `computeRawStandings` in compute.js
*/
function simulateOneIteration(
  division: Division, 
  matchSchedule: MatchSchedule, 
  resultCounts: ResultCounts
) {
  const bestOf = division.settings.bestOf || 5;
  const gamesToWin = 0.5 + bestOf / 2;
  const maxPointsPerMatch =
    bestOf == 7 ? 10 : division.settings.competition === "tnp" ? 8 : 7;
  const simulationCloneDivision = structuredClone(division);
  const startOfSeasonCloneDivision = structuredClone(division);

  const divisionStandings = simulationCloneDivision.standings;
  const startOfSimPlayerLookup = getPlayerLookupMap(
    startOfSeasonCloneDivision
  );

  // Loop through the match schedule and pick random winners
  for (const match of matchSchedule) {
    const homePlayerName = match.homePlayerName;
    const awayPlayerName = match.awayPlayerName;

    // Pick a match result
    let winner, loser, loserGames;
    const randWinIndex = Math.floor(Math.random() * 2);
    const winnerName = [homePlayerName, awayPlayerName][randWinIndex];
    const loserName = [homePlayerName, awayPlayerName][1 - randWinIndex];

    try {
      winner = getPlayerData(divisionStandings, winnerName);
      loser = getPlayerData(divisionStandings, loserName);
    } catch(e) {
      console.log(`(simulate.ts) Unable to get player data for match ${winnerName} vs ${loserName}`);
      console.error(e);
      continue;
    }
    loserGames = Math.floor(Math.random() * gamesToWin);

    // Update the four key source of truth properties (W,L,GF,GA) for each match
    // console.log("winner:", winnerName, "current points:", winner.points)
    // console.log("loser:", loserName, "current points:", loser.points)
    winner["wins"] += 1;
    winner["gf"] += gamesToWin;
    winner["ga"] += loserGames;
    winner["points"] += calculatePointsWon(
      true,
      loserGames,
      maxPointsPerMatch
    );
    loser["losses"] += 1;
    loser["gf"] += loserGames;
    loser["ga"] += gamesToWin;
    loser["points"] += calculatePointsWon(
      false,
      loserGames,
      maxPointsPerMatch
    );
  }

  // Loop through the standings by player and update the rest of the properties
  // (MP, GD)
  for (let p = 0; p < divisionStandings.length; p++) {
    let player = divisionStandings[p];
    player.mp = player.wins + player.losses;
    player.gd = player.gf - player.ga;
  }

  // Sort the simulated results by points, GD, etc.
  divisionStandings.sort(compareRaw);

  // Determine who gets promoted
  const numPromo = division.settings.numAutoPromo + division.settings.numPlayoffPromo;
  const numPrizeMoney = (division.settings.numPrizeMoney || 0) + division.settings.numWinner;
  const numRelegate = division.settings.numPlayoffRelegate + division.settings.numAutoRelegate;

  // Division title
  resultCounts.divisionWin[divisionStandings[0].name] += 1;

  // Prize money
  for (let i = 0; i < numPrizeMoney; i++) {
    resultCounts.prizeMoney[divisionStandings[i].name] += 1;
  }

  // Auto promo or win
  for (let i = 0; i < division.settings.numAutoPromo + division.settings.numWinner; i++) {
    resultCounts.autoPromo[divisionStandings[i].name] += 1;
  }

  // Playoff promo
  for (let i = division.settings.numAutoPromo; i < numPromo; i++) {
    resultCounts.playoffPromo[divisionStandings[i].name] += 1;
  }

  // Playoff relegation
  const end = simulationCloneDivision.standings.length - 1;
  for (let j = end - division.settings.numAutoRelegate; j > end - numRelegate; j--) {
    resultCounts.playoffRelegation[divisionStandings[j].name] += 1;
  }

  // Auto relegation
  for (let j = end; j > end - division.settings.numAutoRelegate; j--) {
    resultCounts.autoRelegation[divisionStandings[j].name] += 1;
  }
}

function playerFullyTied(player1: PlayerStandings, player2: PlayerStandings) {
  return (
    player1.wins == player2.wins &&
    player1.losses == player2.losses &&
    player1.gd == player2.gd &&
    player1.points == player2.points
  );
}

/** Find all clusters of players with the same states, and make them have the same
 * simulation stats. */
function correctForVariance(division: DivisionWithChances) {
  const playerList = division.standings;

  // Get clusters
  let clusters = [];
  for (const currentPlayer of playerList) {
    let foundCluster = false;
    // Check if it matches any of the clusters
    for (const cluster of clusters) {
      const clusterFirstPlayer = cluster[0];
      if (
        playerFullyTied(
          currentPlayer,
          clusterFirstPlayer
        )
      ) {
        foundCluster = true;
        cluster.push(currentPlayer);
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
    let divisionWinTotal = 0;
    let prizeMoneyTotal = 0;
    for (let player of cluster) {
      autoPromoTotal += player.chances.autoPromo;
      playoffPromoTotal += player.chances.playoffPromo;
      autoRelTotal += player.chances.autoRelegation;
      playoffRelTotal += player.chances.playoffRelegation;
      divisionWinTotal += player.chances.divisionWin;
      prizeMoneyTotal += player.chances.prizeMoney;
    }
    const normalizedAutoPromo = autoPromoTotal / cluster.length;
    const normalizedPlayoffPromo = playoffPromoTotal / cluster.length;
    const normalizedAutoRel = autoRelTotal / cluster.length;
    const normalizedPlayoffRel = playoffRelTotal / cluster.length;
    const normalizedDivisionWin = divisionWinTotal / cluster.length;
    const normalizedPrizeMoney = prizeMoneyTotal / cluster.length;

    for (let player of cluster) {
      let chances: PromoChances = {
        autoPromo: normalizedAutoPromo,
        playoffPromo: normalizedPlayoffPromo,
        autoRelegation: normalizedAutoRel,
        playoffRelegation: normalizedPlayoffRel,
        divisionWin: normalizedDivisionWin,
        prizeMoney: normalizedPrizeMoney
      }
      player.chances = chances;
    }
  }
}

function getChance(
  type: keyof ResultCounts, 
  resultCounts: ResultCounts, 
  player: PlayerStandings
): number {
  return (resultCounts[type][player.name] / NUM_ITERATIONS) * 100;
}

/** Takes the counts from the simulation and computes probabilities of each outcome */
function assignChancesToPlayers(
  resultCounts: ResultCounts, 
  division: Division
): DivisionWithChances {
  const playerStandingsWithChances: PlayerStandingsWithChances[] = [];

  // Compute chances of all outcomes
  for (const player of division.standings) {
    const chances: PromoChances = {
      autoPromo: getChance("autoPromo", resultCounts, player),
      playoffPromo: getChance("playoffPromo", resultCounts, player),
      autoRelegation: getChance(
        "autoRelegation",
        resultCounts,
        player
      ),
      playoffRelegation: getChance(
        "playoffRelegation",
        resultCounts,
        player
      ),
      divisionWin: getChance("divisionWin", resultCounts, player),
      prizeMoney: getChance("prizeMoney", resultCounts, player),
    }

    playerStandingsWithChances.push({
      ...player,
      chances: chances
    })
  }

  const newDivision: DivisionWithChances = {
    ...division,
    standings: playerStandingsWithChances
  };
  return newDivision;
}

/* 
Main method to:
- Simulate many games
- Add a property to each player based on promo chance and relegation chance
- Sort by promo chance and relegation chance */
function runSimulation(
  division: Division, 
  matchSchedule: MatchSchedule
): DivisionWithChances {
  console.log(" > Running simulation");
  // Make result counter object
  const resultCounts: ResultCounts = {
    autoPromo: {},
    autoRelegation: {},
    playoffPromo: {},
    playoffRelegation: {},
    divisionWin: {},
    prizeMoney: {}
  };


  for (let p = 0; p < division.settings.players.length; p++) {
    const playerName = division.settings.players[p];
    resultCounts.autoPromo[playerName] = 0;
    resultCounts.autoRelegation[playerName] = 0;
    resultCounts.playoffPromo[playerName] = 0;
    resultCounts.playoffRelegation[playerName] = 0;
    resultCounts.divisionWin[playerName] = 0;
    resultCounts.prizeMoney[playerName] = 0;
  }

  console.log(`   > Result counts added to each player`);

  // Simulate all the iterations
  for (let iterCount = 0; iterCount < NUM_ITERATIONS; iterCount++) {
    simulateOneIteration(division, matchSchedule, resultCounts);
  }

  console.log(`   > All iterations simulated`);

  let divWithChances = assignChancesToPlayers(resultCounts, division);
  checkClinchesForDivision(divWithChances);
  correctForVariance(divWithChances);
  return divWithChances;
}

export {
  runSimulation
};
