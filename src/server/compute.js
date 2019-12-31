/*
 Computes stats for each player based on match data
 */

const configData = require("./config_data");

const matchData = [
  {
    division: "2",
    winner: "phamtom",
    loser: "moodeuce",
    winner_games: 3,
    loser_games: 0
  },
  {
    division: "2",
    winner: "moodeuce",
    loser: "phamtom",
    winner_games: 3,
    loser_games: 2
  },
  {
    division: "2",
    winner: "moodeuce",
    loser: "galoomba",
    winner_games: 3,
    loser_games: 1
  },
  {
    division: "2",
    winner: "divcaste",
    loser: "tristop",
    winner_games: 3,
    loser_games: 2
  },
  /* Artificial example to confirm GD can break ties
    adammts - 4 pts, GD 1
    mohammad - 4 pts, GD 2
    */
  {
    division: "1",
    winner: "adammts",
    loser: "cheez_fish",
    winner_games: 3,
    loser_games: 2
  },
  {
    division: "1",
    winner: "mohammad",
    loser: "cheez_fish",
    winner_games: 3,
    loser_games: 1
  },
  /* Artificial example to confirm MW can break ties
     batfoy: 3-0 2-3 2-3 3-2,  12 pts, GD 2, 2 MW
     hydrant: 3-2 3-2 0-3 3-0,  12 pts, GD 2, 3 MW
     */
  {
    division: "1",
    winner: "batfoy",
    loser: "cheez_fish",
    winner_games: 3,
    loser_games: 0
  },
  {
    division: "1",
    winner: "beastinshen",
    loser: "batfoy",
    winner_games: 3,
    loser_games: 2
  },
  {
    division: "1",
    winner: "brodin",
    loser: "batfoy",
    winner_games: 3,
    loser_games: 2
  },
  {
    division: "1",
    winner: "batfoy",
    loser: "cheez_fish",
    winner_games: 3,
    loser_games: 2
  },
  {
    division: "1",
    winner: "hydrantdude",
    loser: "cheez_fish",
    winner_games: 3,
    loser_games: 2
  },
  {
    division: "1",
    winner: "hydrantdude",
    loser: "beastinshen",
    winner_games: 3,
    loser_games: 2
  },
  {
    division: "1",
    winner: "brodin",
    loser: "hydrantdude",
    winner_games: 3,
    loser_games: 0
  },
  {
    division: "1",
    winner: "hydrantdude",
    loser: "cheez_fish",
    winner_games: 3,
    loser_games: 0
  }
];

function generateEmptyStandings() {
  return configData.divisionData.map(division => {
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

/* Do an O(n) filter to get a player from the list 
(there are never many players or many matches so the complexity doesn't matter) */
function getPlayerData(list, playerName) {
  for (let p = 0; p < list.length; p++) {
    const player = list[p];
    if (player.name == playerName) {
      return player;
    }
  }
  console.log("Unable to find player ", playerName, "in list:\n", list);
}

/* Comparison function for sorting the players 
   Official ordering according to moodeuce is "GD>MW>GF>H2H>some other thing"
   This function will sort according to Points > GD > MW > GF, then there has to be
   human intervention for the rest.
*/
function compareRaw(player1, player2) {
  // console.log("Comparing", player1.name, player2.name);
  // Higher score first
  if (player2.points != player1.points) {
    // console.log("points:", player1.points, player2.points);
    return player2.points - player1.points;
  }
  // Higher GD first
  if (player2.gd != player1.gd) {
    // console.log("gd:", player1.gd, player2.gd);
    return player2.gd - player1.gd;
  }
  // Higher Matches Won first
  if (player2.wins != player1.wins) {
    // console.log("wins:", player1.wins, player2.wins);
    return player2.wins - player1.wins;
  }
  // Higher GF first
  if (player2.gf != player1.gf) {
    return player2.gf - player1.gf;
  }
}

/* Update the standings based on the matches
(again it doesn't matter that the time complexity is trash lol) */
function computeRawStandings() {
  const standings = generateEmptyStandings();
  for (let d = 0; d < standings.length; d++) {
    const divisionStandings = standings[d].standings;

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
      winner["points"] += 4;
      loser["losses"] += 1;
      loser["gf"] += match.loser_games;
      loser["ga"] += match.winner_games;
      loser["points"] += match.loser_games;
    }

    // Loop through the standings by player and update the rest of the properties
    // (MP, GD)
    for (let p = 0; p < divisionStandings.length; p++) {
      player = divisionStandings[p];
      player.mp = player.wins + player.losses;
      player.gd = player.gf - player.ga;
    }

    // Sort by points
    divisionStandings.sort(compareRaw);
  }

  return standings;
}

module.exports = {
  generateEmptyStandings,
  computeRawStandings,
  matchData
};
