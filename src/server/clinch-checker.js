const util = require("./util");

/**
 * A class for checking if players have naïvely clinched any one of many positions.
 *
 * NB: "clinching playoff promo" means clinching AT LEAST playoff promo or better.
 * Likewise with clinching not-playoff-relegation, etc.
 */

// Enums
const SimType = Object.freeze({ BEST_CASE: 1, WORST_CASE: 2 });
const StandingsSpot = Object.freeze({ TOP: 1, BOTTOM: 2 });
const GuaranteeType = Object.freeze({ GUARANTEE_TRUE: 1, GUARANTEE_FALSE: 2 });

/*
Simulate the worst possible season for a player (naïvely, not following match schedule)
*/
function simulateWorstSeasonForPlayer(division, targetPlayer) {
  const cloneDivision = JSON.parse(JSON.stringify(division));
  const divisionStandings = cloneDivision.standings;

  const matchesPerSeason =
    (divisionStandings.length - 1) * (division.oneMatchPerPair ? 1 : 2);

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
  divisionStandings.sort(util.compareRaw);
  return divisionStandings;
}

/*
Simulate the best possible season for a player (naively, not following match schedule)
*/
function simulateBestSeasonForPlayer(division, targetPlayer) {
  const cloneDivision = JSON.parse(JSON.stringify(division));
  const divisionStandings = cloneDivision.standings;

  const matchesPerSeason =
    (divisionStandings.length - 1) * (division.oneMatchPerPair ? 1 : 2);

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
  divisionStandings.sort(util.compareRaw);
  return divisionStandings;
}

/**
 * Checks if a player is in the top/bottom X spots of a division.
 */
function isInExtreme(standingsSpot, numPlaces, player, divisionStandings) {
  let isInSpot = false;
  if (standingsSpot === StandingsSpot.TOP) {
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
  standingsSpot,
  guaranteeType,
  numPlaces,
  player,
  division
) {
  // Determine if it's worst or best case analysis based on the desired clinch type
  const simType =
    (standingsSpot === StandingsSpot.TOP &&
      guaranteeType === GuaranteeType.GUARANTEE_TRUE) ||
    (standingsSpot === StandingsSpot.BOTTOM &&
      guaranteeType === GuaranteeType.GUARANTEE_FALSE)
      ? SimType.WORST_CASE
      : SimType.BEST_CASE;
  // Get the worst/best case end-of-season standings
  const divisionStandings =
    simType === SimType.BEST_CASE
      ? simulateBestSeasonForPlayer(division, player)
      : simulateWorstSeasonForPlayer(division, player);
  // Check if the player ends up in a spot that meets the condition
  const isInSpot = isInExtreme(
    standingsSpot,
    numPlaces,
    player,
    divisionStandings
  );
  const desiredValue = guaranteeType === GuaranteeType.GUARANTEE_TRUE; // Whether the player wants isInSpot to be true

  return isInSpot === desiredValue;
}

function didClinchAutoPromo(player, division) {
  const numSpots = division.numAutoPromo + division.numWinner;
  return checkClinch(
    StandingsSpot.TOP,
    GuaranteeType.GUARANTEE_TRUE,
    numSpots,
    player,
    division
  );
}

function didClinchPlayoffPromo(player, division) {
  const numSpots =
    division.numAutoPromo + division.numPlayoffPromo + division.numWinner;
  return checkClinch(
    StandingsSpot.TOP,
    GuaranteeType.GUARANTEE_TRUE,
    numSpots,
    player,
    division
  );
}

function didClinchNonAutoPromo(player, division) {
  const numSpots = division.numAutoPromo + division.numWinner;
  return checkClinch(
    StandingsSpot.TOP,
    GuaranteeType.GUARANTEE_FALSE,
    numSpots,
    player,
    division
  );
}

function didClinchNonPlayoffPromo(player, division) {
  const numSpots =
    division.numAutoPromo + division.numPlayoffPromo + division.numWinner;
  return checkClinch(
    StandingsSpot.TOP,
    GuaranteeType.GUARANTEE_FALSE,
    numSpots,
    player,
    division
  );
}

function didClinchAutoRelegation(player, division) {
  const numSpots = division.numAutoRelegate;
  return checkClinch(
    StandingsSpot.BOTTOM,
    GuaranteeType.GUARANTEE_TRUE,
    numSpots,
    player,
    division
  );
}

function didClinchPlayoffRelegation(player, division) {
  const numSpots = division.numAutoRelegate + division.numPlayoffRelegate;
  return checkClinch(
    StandingsSpot.BOTTOM,
    GuaranteeType.GUARANTEE_TRUE,
    numSpots,
    player,
    division
  );
}

function didClinchNonAutoRelegation(player, division) {
  const numSpots = division.numAutoRelegate;
  return checkClinch(
    StandingsSpot.BOTTOM,
    GuaranteeType.GUARANTEE_FALSE,
    numSpots,
    player,
    division
  );
}

function didClinchNonPlayoffRelegation(player, division) {
  const numSpots = division.numAutoRelegate + division.numPlayoffRelegate;
  return checkClinch(
    StandingsSpot.BOTTOM,
    GuaranteeType.GUARANTEE_FALSE,
    numSpots,
    player,
    division
  );
}

function didClinchDivisionWin(player, division) {
  return checkClinch(
    StandingsSpot.TOP,
    GuaranteeType.GUARANTEE_TRUE,
    1,
    player,
    division
  );
}

function didClinchNonDivisionWin(player, division) {
  return checkClinch(
    StandingsSpot.TOP,
    GuaranteeType.GUARANTEE_FALSE,
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
function checkClinchesForDivision(division) {
  const CORRECTION_MARGIN = 0.001; // in percent, i.e. 0.001%
  for (const player of division.standings) {
    // To have 100% auto-promo, must have clinched auto-promo
    if (
      player.autoPromoChance === 100 &&
      !didClinchAutoPromo(player, division)
    ) {
      player.autoPromoChance = 100 - CORRECTION_MARGIN;
    }
    // To have 0% auto-promo, must have clinched not-auto-promo (or have 0 autopromo spots)
    if (
      player.autoPromoChance === 0 &&
      !(division.numAutoPromo === 0 || didClinchNonAutoPromo(player, division))
    ) {
      player.autoPromoChance = CORRECTION_MARGIN;
    }
    // To have 100% playoff promo, must have clinched playoff promo AND clinched not-auto-promo
    if (
      player.playoffPromoChance === 100 &&
      !(
        didClinchPlayoffPromo(player, division) &&
        didClinchNonAutoPromo(player, division)
      )
    ) {
      player.playoffPromoChance = 100 - CORRECTION_MARGIN;
    }
    // To have 0% playoff promo, must have clinched auto-promo or not-playoff-promo
    // (or have no playoff promo spots)
    if (
      player.playoffPromoChance === 0 &&
      !(
        division.numPlayoffPromo === 0 ||
        didClinchAutoPromo(player, division) ||
        didClinchNonPlayoffPromo(player, division)
      )
    ) {
      player.playoffPromoChance = CORRECTION_MARGIN;
    }

    // To have 100% auto-relegation, must have clinched auto-relegation
    if (
      player.autoRelegationChance === 100 &&
      !didClinchAutoRelegation(player, division)
    ) {
      player.autoRelegationChance = 100 - CORRECTION_MARGIN;
    }
    // To have 0% auto-relegation, must have clinched not-auto-relegation
    if (
      player.autoRelegationChance === 0 &&
      !(
        division.numAutoRelegate === 0 ||
        didClinchNonAutoRelegation(player, division)
      )
    ) {
      player.autoRelegationChance = CORRECTION_MARGIN;
    }
    // To have 100% playoff relegation, must have clinched playoff relegation AND clinched not-auto-relegation
    if (
      player.playoffRelegationChance === 100 &&
      !(
        didClinchPlayoffRelegation(player, division) &&
        didClinchNonAutoRelegation(player, division)
      )
    ) {
      player.playoffRelegationChance = 100 - CORRECTION_MARGIN;
    }
    // To have 0% playoff relegation, must have clinched auto-relegation or not-playoff-relegation
    if (
      player.playoffRelegationChance === 0 &&
      !(
        division.numPlayoffRelegate === 0 ||
        didClinchAutoRelegation(player, division) ||
        didClinchNonPlayoffRelegation(player, division)
      )
    ) {
      player.playoffRelegationChance = CORRECTION_MARGIN;
    }

    // To have 100% division win, must have clinched division win
    if (
      player.divisionWinChance === 100 &&
      !didClinchDivisionWin(player, division)
    ) {
      player.divisionWinChance = 100 - CORRECTION_MARGIN;
    }
    // To have 0% division win, must have clinched not-division-win
    if (
      player.divisionWinChance === 0 &&
      !didClinchNonDivisionWin(player, division)
    ) {
      player.divisionWinChance = CORRECTION_MARGIN;
    }
  }
}

module.exports = {
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
  didClinchNonDivisionWin
};
