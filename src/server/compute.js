/*
 Computes stats for each player based on match data
 */
import { 
  divisionData
} from "./config_data.js";
import {
  getPlayerData,
  calculatePointsWon,
  compareRaw
} from "./util.js";

function generateEmptyStandings() {
  return divisionData.map(division => {
    // Add empty standings to the division
    division["standings"] = division.players.map(player => {
      return {
        name: player,
        mp: 0,
        wins: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0
      };
    });
    return division;
  });
}

/* Update the standings based on the matches
(again it doesn't matter that the time complexity is trash lol) */
function computeRawStandings(matchData, penaltyPoints) {
  const standings = generateEmptyStandings();
  for (let d = 0; d < standings.length; d++) {
    const divisionStandings = standings[d].standings;
    const maxPointsPerMatch = standings[d].maxPointsPerMatch;

    // Update the four key source of truth properties (W,L,GF,GA) for each match
    for (let i = 0; i < matchData.length; i++) {
      const match = matchData[i];
      if (match.division !== standings[d].divisionName) {
        continue;
      }
      const winner = getPlayerData(divisionStandings, match.winner);
      const loser = getPlayerData(divisionStandings, match.loser);
      winner["wins"] += 1;
      winner["gf"] += match.winner_games;
      winner["ga"] += match.loser_games;
      winner["points"] += calculatePointsWon(
        true,
        match.loser_games,
        maxPointsPerMatch
      );
      loser["losses"] += 1;
      loser["gf"] += match.loser_games;
      loser["ga"] += match.winner_games;
      loser["points"] += calculatePointsWon(
        false,
        match.loser_games,
        maxPointsPerMatch
      );
    }

    // Handle penalty points
    for (let p = 0; p < divisionStandings.length; p++) {
      let player = divisionStandings[p];
      player.penaltyPoints = penaltyPoints[player.name] || 0;
      player.points -= player.penaltyPoints;
    }

    // Loop through the standings by player and update the rest of the properties
    // (MP, GD)
    for (let p = 0; p < divisionStandings.length; p++) {
      let player = divisionStandings[p];
      player.mp = player.wins + player.losses;
      player.gd = player.gf - player.ga;
    }

    // Sort by points
    divisionStandings.sort(compareRaw);
  }

  return standings;
}

export {
  generateEmptyStandings,
  computeRawStandings
};
