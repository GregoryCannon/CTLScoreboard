import moment from "moment";
import type {
  Division,
  Match,
  PlayerScheduleMatchInfo,
  PlayerStandings,
  MatchSchedule,
  PlayerStandingsWithChances
} from "../types.ts"
import { divisionData, competitions } from "./config_data.ts";

const USE_PLAYOFFS_FOR_HYBRID_DIVISIONS = false;

const memeDivisionData: Division[] = [
  {
    settings: {
      divisionName: "1.3m",
      competition: "ctl",
      completed: false,
      oneMatchPerPair: false,
      maxPointsPerMatch: 7,
      numPrizeMoney: 0,
      bestOf: 5,
      numWinner: 1,
      numAutoPromo: 1,
      numPlayoffPromo: 0,
      numPlayoffRelegate: 0,
      numAutoRelegate: 1,
      players: [
        "greg",
        "jdmfx_",
        "jonas",
        "vst_koryan",
        "greentea",
        "boom_jeff",
        "buuuuuuuuco"
      ],
    },
    standings: [
      {
        name: "greg",
        mp: 12,
        wins: 12,
        losses: 0,
        gf: 36,
        ga: 1,
        gd: 36,
        points: 0,
        penaltyPoints: 0
      },
      {
        name: "jdmfx_",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 1,
        ga: 6,
        gd: -5,
        points: 1,
        penaltyPoints: 0
      },
      {
        name: "jonas",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0, 
        penaltyPoints: 0
      },
      {
        name: "vst_koryan",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      },
      {
        name: "greentea",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      },
      {
        name: "boom_jeff",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      },
      {
        name: "buuuuuuuuco",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      }
    ]
  },
  {
    settings: {
      divisionName: "1.3m",
      competition: "ctl",
      completed: false,
      oneMatchPerPair: false,
      maxPointsPerMatch: 7,
      numPrizeMoney: 0,
      bestOf: 5,
      numWinner: 1,
      numAutoPromo: 1,
      numPlayoffPromo: 0,
      numPlayoffRelegate: 0,
      numAutoRelegate: 1,
      players: [
        "greg",
        "jdmfx_",
        "jonas",
        "vst_koryan",
        "greentea",
        "boom_jeff",
        "buuuuuuuuco"
      ],
    },
    standings: [
      {
        name: "greg",
        mp: 12,
        wins: 12,
        losses: 0,
        gf: 36,
        ga: 1,
        gd: 36,
        points: 48,
        penaltyPoints: 0
      },
      {
        name: "jdmfx_",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 1,
        ga: 6,
        gd: -5,
        points: 1,
        penaltyPoints: 0
      },
      {
        name: "jonas",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      },
      {
        name: "vst_koryan",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      },
      {
        name: "greentea",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      },
      {
        name: "boom_jeff",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      },
      {
        name: "buuuuuuuuco",
        mp: 2,
        wins: 0,
        losses: 2,
        gf: 0,
        ga: 6,
        gd: -6,
        points: 0,
        penaltyPoints: 0
      }
    ]
  }
];

// maybe we should write actual tests
// const sampleMatchData: Match[] = [
//   {
//     division: "2",
//     winner: "phamtom",
//     loser: "moodeuce",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "2",
//     winner: "moodeuce",
//     loser: "phamtom",
//     winner_games: 3,
//     loser_games: 2,
//     winner_home: false,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "2",
//     winner: "moodeuce",
//     loser: "galoomba",
//     winner_games: 3,
//     loser_games: 1,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "2",
//     winner: "phamtom",
//     loser: "b14nk",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "2",
//     winner: "tristop",
//     loser: "b14nk",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: false,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "2",
//     winner: "jakegames2",
//     loser: "b14nk",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: false,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "2",
//     winner: "moodeuce",
//     loser: "b14nk",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "2",
//     winner: "galoomba",
//     loser: "b14nk",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: false,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   /* Artificial example to confirm GD can break ties
//     adammts - 4 pts, GD 1
//     mohammad - 4 pts, GD 2
//     */
//   {
//     division: "1",
//     winner: "adammts",
//     loser: "cheez_fish",
//     winner_games: 3,
//     loser_games: 2,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "1",
//     winner: "mohammad",
//     loser: "cheez_fish",
//     winner_games: 3,
//     loser_games: 1,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   /* Artificial example to confirm MW can break ties
//      batfoy: 3-0 2-3 2-3 3-2,  12 pts, GD 2, 2 MW
//      hydrant: 3-2 3-2 0-3 3-0,  12 pts, GD 2, 3 MW
//      */
//   {
//     division: "1",
//     winner: "batfoy",
//     loser: "cheez_fish",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "1",
//     winner: "beastinshen",
//     loser: "batfoy",
//     winner_games: 3,
//     loser_games: 2,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "1",
//     winner: "brodin",
//     loser: "batfoy",
//     winner_games: 3,
//     loser_games: 2,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "1",
//     winner: "batfoy",
//     loser: "cheez_fish",
//     winner_games: 3,
//     loser_games: 2,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "1",
//     winner: "hydrantdude",
//     loser: "cheez_fish",
//     winner_games: 3,
//     loser_games: 2,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "1",
//     winner: "hydrantdude",
//     loser: "beastinshen",
//     winner_games: 3,
//     loser_games: 2,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "1",
//     winner: "brodin",
//     loser: "hydrantdude",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   },
//   {
//     division: "1",
//     winner: "hydrantdude",
//     loser: "cheez_fish",
//     winner_games: 3,
//     loser_games: 0,
//     winner_home: true,
//     vod_url: "https://example.com",
//     restreamer: "arbaro"
//   }
// ];

/** Checks if player names are in alphabetical order.
 * Used to pick which of the two matches to do for a pairing of players in divisions where each pair plays only once. */
function matchShouldHappen(
  name1: string, 
  name2: string
): boolean {
  return name1 < name2;
}

/**
 * Get a schedule of unplayed matches for the current season.
 * @param {division Object} division
 * @param {List<match object>} divMatches
 * @returns {List<{homePlayerName, awayPlayerName}}
 */
function getMatchSchedule(
  division: Division, 
  divMatches: Match[]
): MatchSchedule {
  const matchSchedule = [];
  const playedMatchSet = new Set();

  // Convert the list of played matches to a set
  for (const match of divMatches) {
    const homePlayer = match.winner_home ? match.winner : match.loser;
    const awayPlayer = match.winner_home ? match.loser : match.winner;
    playedMatchSet.add(homePlayer + awayPlayer); // Make the key by concatting the two players
  }

  for (let i = 0; i < division.settings.players.length; i++) {
    for (let j = 0; j < division.settings.players.length; j++) {
      const homePlayerName = division.settings.players[i];
      const awayPlayerName = division.settings.players[j];
      // Ignore pairings vs. yourself
      if (homePlayerName == awayPlayerName) {
        continue;
      }

      if (
        !playedMatchSet.has(homePlayerName + awayPlayerName) &&
        (!division.settings.oneMatchPerPair ||
          (matchShouldHappen(homePlayerName, awayPlayerName) &&
            !playedMatchSet.has(awayPlayerName + homePlayerName)))
      ) {
        matchSchedule.push({
          homePlayerName,
          awayPlayerName
        });
      }
    }
  }

  return matchSchedule;
}

function formatMatchResultForPlayer(
  match: Match, 
  playerName: string
): string {
  return match.winner === playerName
    ? match.winner_games + "-" + match.loser_games
    : match.loser_games + "-" + match.winner_games;
}

/**
 * Get the upcoming schedules for every player in the division
 */
function getPlayerScheduleInfo(
  division: Division, 
  matchList: Match[]
): Record<string, PlayerScheduleMatchInfo> {

  const resultsMap = {} as Record<string, PlayerScheduleMatchInfo>;

  // A map from homePlayer -> awayPlayer -> match data object
  const playedMatchMap = new Map();
  // Use string concatenation to make the keys
  const getKey = (player1Name: string, player2Name: string) => 
    player1Name + "," + player2Name;

  // Convert the list of played matches to a set
  const divMatches = matchList.filter(match => {
    return match.division == division.settings.divisionName;
  });
  for (const match of divMatches) {
    const homePlayerName = match.winner_home ? match.winner : match.loser;
    const awayPlayerName = match.winner_home ? match.loser : match.winner;
    playedMatchMap.set(getKey(homePlayerName, awayPlayerName), match);
  }

  // Create the played/schedule lists
  const sortedPlayerList = [...division.settings.players];
  sortedPlayerList.sort();
  for (const player of sortedPlayerList) {
    const playedList = [];
    const unplayedList = [];

    for (const opponent of sortedPlayerList) {
      if (opponent === player) {
        continue;
      }

      const homeKey = getKey(player, opponent);
      const awayKey = getKey(opponent, player);
      const playedAtHome = playedMatchMap.has(homeKey);
      const playedAway = playedMatchMap.has(awayKey);
      const homeResult =
        playedAtHome &&
        formatMatchResultForPlayer(playedMatchMap.get(homeKey), player);
      const awayResult =
        playedAway &&
        formatMatchResultForPlayer(playedMatchMap.get(awayKey), player);

      if (division.settings.oneMatchPerPair) {
        // Division where each pair plays only once, home/away not relevant
        if (playedAtHome || playedAway) {
          playedList.push({
            opponent,
            extraInfo: " (" + (homeResult || awayResult) + ")"
          });
        } else {
          unplayedList.push({ opponent, extraInfo: " (1 set)" });
        }
      } else {
        // Division where each pair plays twice, with home/away
        if (playedAtHome && playedAway) {
          playedList.push({
            opponent,
            extraInfo: " (" + homeResult + ", " + awayResult + ")"
          });
        } else if (playedAtHome && !playedAway) {
          playedList.push({ opponent, extraInfo: " (" + homeResult + ")" });
          unplayedList.push({ opponent, extraInfo: " (Away)" });
        } else if (playedAway && !playedAtHome) {
          playedList.push({ opponent, extraInfo: " (" + awayResult + ")" });
          unplayedList.push({ opponent, extraInfo: " (Home)" });
        } else {
          unplayedList.push({ opponent, extraInfo: " (2 sets)" });
        }
      }
    }

    resultsMap[player] = {
      playedList: playedList,
      unplayedList: unplayedList
    };
  }

  return resultsMap;
}

/* Comparison function for sorting the players 
   Official ordering according to moodeuce is "GD>MW>GF>H2H>some other thing"
   This function will sort according to Points > GD > MW > GF, then there has to be
   human intervention for the rest.
*/
function compareRaw(
  player1: PlayerStandings, 
  player2: PlayerStandings
): number {
  // Higher score first
  if (player2.points !== player1.points) {
    return player2.points - player1.points;
  }
  // Higher Matches Won first
  if (player2.wins !== player1.wins) {
    return player2.wins - player1.wins;
  }
  // Higher GD first
  if (player2.gd !== player1.gd) {
    return player2.gd - player1.gd;
  }
  // Higher GF first
  if (player2.gf !== player1.gf) {
    return player2.gf - player1.gf;
  }
  return player1.name.localeCompare(player2.name);
}

/* Comparison function to sort players based on their simulation data. */
function compareSimulated(
  player1: PlayerStandingsWithChances, 
  player2: PlayerStandingsWithChances
): number {
  // Round to whole number
  const p1Promo = Math.round(
    player1.chances.autoPromo +
    0.5 * player1.chances.playoffPromo
  );
  const p1Rel = Math.round(
    player1.chances.autoRelegation +
    0.5 * player1.chances.playoffRelegation
  );
  const p2Promo = Math.round(
    player2.chances.autoPromo +
    0.5 * player2.chances.playoffPromo
  );
  const p2Rel = Math.round(
    player2.chances.autoRelegation +
    0.5 * player2.chances.playoffRelegation
  );

  // Ideally, sort based on (promo %) - (rel %)
  // If it's significantly different between the two players, sort by that
  const diffFactor = p2Promo - p2Rel - (p1Promo - p1Rel);
  if (Math.abs(diffFactor) > 3) {
    return diffFactor;
  }

  // Otherwise, if their promo chances differ (after they were rounded to 1%), sort based on that
  if (p2Promo !== p1Promo) {
    return p2Promo - p1Promo;
  }

  // Likewise with relegation (but BACKWARDS because lower is better)
  if (p2Rel !== p1Rel) {
    return p1Rel - p2Rel;
  }

  // Otherwise sort by current points
  return compareRaw(player1, player2);
}

// Compute the number of points earned for a game under the new 7/0 6/1 5/2 system
function calculatePointsWon(
  isWinner: boolean, 
  loserGames: number, 
  maxPoints: number
): number {
  return isWinner ? maxPoints - loserGames : loserGames;
}

/* Do an O(n) filter to get a player from the list 
(there are never many players or many matches so the complexity doesn't matter) */
function getPlayerData(
  list: PlayerStandings[], 
  playerName: string
): PlayerStandings {
  for (let p = 0; p < list.length; p++) {
    const player = list[p];
    if (player.name === playerName) {
      return player;
    }
  }
  throw new Error("Unable to find player " + playerName + "in list:\n" + list);
}

/**
 * Convert a list of player objects to a map from playerName -> player object
 */
function getPlayerLookupMap(
  division: Division
): Record<string, PlayerStandings> {

  const map = {} as Record<string, PlayerStandings>;
  for (const player of division.standings) {
    map[player.name] = player;
  }
  return map;
}

function getMatchDateFormatted(match: Match): string {
  if (!match.match_date) {
    return "unknown date";
  }
  const matchMoment = moment.unix(match.match_date);
  // Jan 29 2023 18:30:00
  // return matchMoment.utc().format("MMM DD YYYY, HH:mm");
  return matchMoment.utc().format("lll");
}

function getCompetition(match: Match): string | null {
  console.log(match.division);
  const div = divisionData.find(div => div.divisionName === match.division);
  if (!div) return null;
  return div.competition;
}

function getCompetitionEloName(match: Match): string | null {
  const abbreviation = getCompetition(match);
  if (!abbreviation) return null;

  const eloName = competitions.find(comp => comp.abbreviation === abbreviation)?.eloName;
  if (!eloName) return null;

  return eloName;
}

function downloadCanvasAsPng(
  canvas: HTMLCanvasElement, 
  filename: string
): void {
  // create an "off-screen" anchor tag
  var lnk = document.createElement("a"),
    e;

  // the key here is to set the download attribute of the a tag
  lnk.download = filename;

  // convert canvas content to data-uri for link. When download
  // attribute is set the content pointed to by link will be
  // pushed as "download" in HTML5 capable browsers
  lnk.href = canvas.toDataURL();

  // create a "fake" click-event to trigger the download
  if (document.createEvent) {
    e = document.createEvent("MouseEvents");
    e.initMouseEvent(
      "click",
      true,
      true,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null
    );

    lnk.dispatchEvent(e);
  } 
}

export {
  downloadCanvasAsPng,
  compareRaw,
  compareSimulated,
  getPlayerData,
  getMatchSchedule,
  getPlayerScheduleInfo,
  getPlayerLookupMap,
  calculatePointsWon,
  getMatchDateFormatted,
  getCompetition,
  getCompetitionEloName,
  USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
};
