import type { 
  Division,
  PlayerStandings,
  StandingsSpot,
  GuaranteeType,
  SimType,
  DivisionWithChances
} from "../types.ts";
import {
  compareRaw
} from "./util.ts";

/**
 * A class for checking if players have naïvely clinched any one of many positions.
 *
 * NB: "clinching playoff promo" means clinching AT LEAST playoff promo or better.
 * Likewise with clinching not-playoff-relegation, etc.
 */

/*
Simulate the worst possible season for a player (naïvely, not following match schedule)
*/
function simulateWorstSeasonForPlayer(
  division: Division, 
  targetPlayer: PlayerStandings // just using name?
): PlayerStandings[] {
  const cloneDivision = JSON.parse(JSON.stringify(division));
  const divisionStandings = cloneDivision.standings;

  const matchesPerSeason =
    (divisionStandings.length - 1) * (division.settings.oneMatchPerPair ? 1 : 2);

  for (let p = 0; p < divisionStandings.length; p++) {
    let loopPlayer = divisionStandings[p];
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
      loopPlayer.points += toPlay * 7;
      loopPlayer.gd += toPlay * 3;
      loopPlayer.gf += toPlay * 3;
      loopPlayer.ga += 0; // for clarity
      loopPlayer.losses += 0; // for clarity
      loopPlayer.wins += toPlay;
      loopPlayer.mp += toPlay;
    }
  }

  // Sort the simulated results by points, GD, etc.
  divisionStandings.sort(compareRaw);
  return divisionStandings;
}

/*
Simulate the best possible season for a player (naively, not following match schedule)
*/
function simulateBestSeasonForPlayer(
  division: Division, 
  targetPlayer: PlayerStandings
): PlayerStandings[] {
  const cloneDivision = JSON.parse(JSON.stringify(division));
  const divisionStandings = cloneDivision.standings;

  const matchesPerSeason =
    (divisionStandings.length - 1) * (division.settings.oneMatchPerPair ? 1 : 2);

  for (let p = 0; p < divisionStandings.length; p++) {
    let loopPlayer = divisionStandings[p];
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
      loopPlayer.points += toPlay * 7;
      loopPlayer.gd += toPlay * 3;
      loopPlayer.gf += toPlay * 3;
      loopPlayer.ga += 0; // for clarity
      loopPlayer.losses += 0; // for clarity
      loopPlayer.wins += toPlay;
      loopPlayer.mp += toPlay;
    }
  }

  // Sort the simulated results by points, GD, etc.
  divisionStandings.sort(compareRaw);
  return divisionStandings;
}

/**
 * Checks if a player is in the top/bottom X spots of a division.
 */
function isInExtreme(
  standingsSpot: StandingsSpot, 
  numPlaces: number, 
  player: PlayerStandings, 
  divisionStandings: PlayerStandings[]
): boolean {
  let isInSpot = false;
  if (standingsSpot === "Top") {
    // Check top X spots
    for (let i = 0; i < numPlaces; i++) {
      if (divisionStandings[i].name === player.name) {
        isInSpot = true;
      }
    }
  } else {
    // Check bottom X spots
    const end = divisionStandings.length - 1;
    for (let j = end; j > end - numPlaces; j--) {
      if (divisionStandings[j].name === player.name) {
        isInSpot = true;
      }
    }
  }
  return isInSpot;
}

/* 
-------- Possible configurations --------
clinch promo          worst, top, always true
clinch non-rel        worst, bottom, always false
clinch rel            best, bottom, always true
clinch non-promo      best, top, always false
*/

/**
 * Check for a clinch with the following parameters:
 * @param {StandingsSpot} standingsSpot - whether top or bottom
 * @param {GuaranteeType} guaranteeType - whether want true or false
 * @param {number} numPlaces - how many places included at top/bottom
 * @param {player object} player
 * @param {division object} division
 */
function checkClinch(
  standingsSpot: StandingsSpot,
  guaranteeType: GuaranteeType,
  numPlaces: number,
  player: PlayerStandings,
  division: Division
): boolean {
  // Determine if it's worst or best case analysis based on the desired clinch type
  const simType: SimType =
    (standingsSpot === "Top" && guaranteeType === "True") ||
    (standingsSpot === "Top" && guaranteeType === "False")
      ? "WorstCase"
      : "BestCase";
  // Get the worst/best case end-of-season standings
  const divisionStandings =
    simType === "BestCase"
      ? simulateBestSeasonForPlayer(division, player)
      : simulateWorstSeasonForPlayer(division, player);
  // Check if the player ends up in a spot that meets the condition
  const isInSpot = isInExtreme(
    standingsSpot,
    numPlaces,
    player,
    divisionStandings
  );
  const desiredValue = guaranteeType === "True"; // Whether the player wants isInSpot to be true

  return isInSpot === desiredValue;
}

function didClinchPrizeMoney(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots = division.settings.numPrizeMoney + division.settings.numWinner;
  return checkClinch(
    "Top",
    "True",
    numSpots,
    player,
    division
  );
}

function didClinchNonPrizeMoney(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots = division.settings.numPrizeMoney + division.settings.numWinner;
  return checkClinch(
    "Top",
    "False",
    numSpots,
    player,
    division
  );
}

function didClinchAutoPromo(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots = division.settings.numAutoPromo + division.settings.numWinner;
  return checkClinch(
    "Top",
    "True",
    numSpots,
    player,
    division
  );
}

function didClinchPlayoffPromo(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots =
    division.settings.numAutoPromo + division.settings.numPlayoffPromo + division.settings.numWinner;
  return checkClinch(
    "Top",
    "True",
    numSpots,
    player,
    division
  );
}

function didClinchNonAutoPromo(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots = division.settings.numAutoPromo + division.settings.numWinner;
  return checkClinch(
    "Top",
    "False",
    numSpots,
    player,
    division
  );
}

function didClinchNonPlayoffPromo(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots =
    division.settings.numAutoPromo + division.settings.numPlayoffPromo + division.settings.numWinner;
  return checkClinch(
    "Top",
    "False",
    numSpots,
    player,
    division
  );
}

function didClinchAutoRelegation(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots = division.settings.numAutoRelegate;
  return checkClinch(
    "Top",
    "True",
    numSpots,
    player,
    division
  );
}

function didClinchPlayoffRelegation(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots = division.settings.numAutoRelegate + division.settings.numPlayoffRelegate;
  return checkClinch(
    "Bottom",
    "True",
    numSpots,
    player,
    division
  );
}

function didClinchNonAutoRelegation(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots = division.settings.numAutoRelegate;
  return checkClinch(
    "Bottom",
    "False",
    numSpots,
    player,
    division
  );
}

function didClinchNonPlayoffRelegation(
  player: PlayerStandings, 
  division: Division
): boolean {
  const numSpots = division.settings.numAutoRelegate + division.settings.numPlayoffRelegate;
  return checkClinch(
    "Bottom",
    "False",
    numSpots,
    player,
    division
  );
}

function didClinchDivisionWin(
  player: PlayerStandings, 
  division: Division
): boolean {
  return checkClinch(
    "Top",
    "True",
    1,
    player,
    division
  );
}

function didClinchNonDivisionWin(
  player: PlayerStandings, 
  division: Division
): boolean {
  return checkClinch(
    "Top",
    "False",
    1,
    player,
    division
  );
}

/**
 * (Main function used externally)
 *
 * Checks that every time a probability is either 100% or 0%, that it is actually
 * mathematically clinched. If not, corrects it to 99.999 or 0.001.
 */
function checkClinchesForDivision(
  division: DivisionWithChances
): void {
  const CORRECTION_MARGIN = 0.001; // in percent, i.e. 0.001%
  for (const player of division.standings) {
    if (!player.chances) 
      throw new Error(`Clinch chances not provided for player ${player.name}`);
    // To have 100% auto-promo, must have clinched auto-promo
    if (
      player.chances.autoPromo === 100 &&
      !didClinchAutoPromo(player, division)
    ) {
      player.chances.autoPromo = 100 - CORRECTION_MARGIN;
    }
    // To have 0% auto-promo, must have clinched not-auto-promo (or have 0 autopromo spots)
    if (
      player.chances.autoPromo === 0 &&
      !(division.settings.numAutoPromo === 0 || didClinchNonAutoPromo(player, division))
    ) {
      player.chances.autoPromo = CORRECTION_MARGIN;
    }
    // To have 100% playoff promo, must have clinched playoff promo AND clinched not-auto-promo
    if (
      player.chances.playoffPromo === 100 &&
      !(
        didClinchPlayoffPromo(player, division) &&
        didClinchNonAutoPromo(player, division)
      )
    ) {
      player.chances.playoffPromo = 100 - CORRECTION_MARGIN;
    }
    // To have 0% playoff promo, must have clinched auto-promo or not-playoff-promo
    // (or have no playoff promo spots)
    if (
      player.chances.playoffPromo === 0 &&
      !(
        division.settings.numPlayoffPromo === 0 ||
        didClinchAutoPromo(player, division) ||
        didClinchNonPlayoffPromo(player, division)
      )
    ) {
      player.chances.playoffPromo = CORRECTION_MARGIN;
    }

    // To have 100% auto-relegation, must have clinched auto-relegation
    if (
      player.chances.autoRelegation === 100 &&
      !didClinchAutoRelegation(player, division)
    ) {
      player.chances.autoRelegation = 100 - CORRECTION_MARGIN;
    }
    // To have 0% auto-relegation, must have clinched not-auto-relegation
    if (
      player.chances.autoRelegation === 0 &&
      !(
        division.settings.numAutoRelegate === 0 ||
        didClinchNonAutoRelegation(player, division)
      )
    ) {
      player.chances.autoRelegation = CORRECTION_MARGIN;
    }
    // To have 100% playoff relegation, must have clinched playoff relegation AND clinched not-auto-relegation
    if (
      player.chances.playoffRelegation === 100 &&
      !(
        didClinchPlayoffRelegation(player, division) &&
        didClinchNonAutoRelegation(player, division)
      )
    ) {
      player.chances.playoffRelegation = 100 - CORRECTION_MARGIN;
    }
    // To have 0% playoff relegation, must have clinched auto-relegation or not-playoff-relegation
    if (
      player.chances.playoffRelegation === 0 &&
      !(
        division.settings.numPlayoffRelegate === 0 ||
        didClinchAutoRelegation(player, division) ||
        didClinchNonPlayoffRelegation(player, division)
      )
    ) {
      player.chances.playoffRelegation = CORRECTION_MARGIN;
    }

    // To have 100% division win, must have clinched division win
    if (
      player.chances.divisionWin === 100 &&
      !didClinchDivisionWin(player, division)
    ) {
      player.chances.divisionWin = 100 - CORRECTION_MARGIN;
    }
    // To have 0% division win, must have clinched not-division-win
    if (
      player.chances.divisionWin === 0 &&
      !didClinchNonDivisionWin(player, division)
    ) {
      player.chances.divisionWin = CORRECTION_MARGIN;
    }
  }
}

export {
  checkClinchesForDivision /* the only one used externally, others exported for testing */,
  simulateBestSeasonForPlayer,
  simulateWorstSeasonForPlayer,
  didClinchAutoPromo,
  didClinchPlayoffPromo,
  didClinchNonAutoPromo,
  didClinchNonPlayoffPromo,
  didClinchAutoRelegation,
  didClinchPlayoffRelegation,
  didClinchNonAutoRelegation,
  didClinchNonPlayoffRelegation,
  didClinchDivisionWin,
  didClinchNonDivisionWin,
  didClinchNonPrizeMoney,
  didClinchPrizeMoney
};
