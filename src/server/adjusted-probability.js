// The minimum probability for an outcome, if the linear model predicts <0 or >1
const MIN_PROBABILITY = 0.01;
// Researched linear regression probabilities for each outcome
const COEFFICIENTS = {
  win_3_0: {
    intercept: 0.158,
    slope: 0.0171
  },
  win_3_1: {
    intercept: 0.18,
    slope: 0.0079
  },
  win_3_2: {
    intercept: 0.162,
    slope: 0.00264
  },
  lose_2_3: {
    intercept: 0.162,
    slope: -0.00264
  },
  lose_1_3: {
    intercept: 0.18,
    slope: -0.0079
  },
  lose_0_3: {
    intercept: 0.158,
    slope: -0.0171
  }
};

/**
 * Generate the probability array (ordered from 3-0 win to 0-3 loss).
 * @param {number} matchWinDiff
 */
function getProbabilities(matchWinDiff) {
  // Generate the outcome probabilities based on the coefficients
  let probabilities = [];
  probabilities.push(
    COEFFICIENTS.win_3_0.intercept + COEFFICIENTS.win_3_0.slope * matchWinDiff
  );
  probabilities.push(
    COEFFICIENTS.win_3_1.intercept + COEFFICIENTS.win_3_1.slope * matchWinDiff
  );
  probabilities.push(
    COEFFICIENTS.win_3_2.intercept + COEFFICIENTS.win_3_2.slope * matchWinDiff
  );
  probabilities.push(
    COEFFICIENTS.lose_2_3.intercept + COEFFICIENTS.lose_2_3.slope * matchWinDiff
  );
  probabilities.push(
    COEFFICIENTS.lose_1_3.intercept + COEFFICIENTS.lose_1_3.slope * matchWinDiff
  );
  probabilities.push(
    COEFFICIENTS.lose_0_3.intercept + COEFFICIENTS.lose_0_3.slope * matchWinDiff
  );

  // Cap probabilities based on the minimum probability
  probabilities = probabilities.map(rawProbability => {
    if (rawProbability < MIN_PROBABILITY) {
      return MIN_PROBABILITY;
    }
    if (rawProbability > 1 - MIN_PROBABILITY) {
      return 1 - MIN_PROBABILITY;
    }
    return rawProbability;
  });

  // Re-normalize the probabilities
  const sum = probabilities.reduce((a, b) => a + b);
  probabilities = probabilities.map(p => p / sum);

  return probabilities;
}

function makeProbabilitiesCumulative(probabilities) {
  let runningTotal = 0;
  const cumulativeProbabilities = [];
  for (const prob of probabilities) {
    runningTotal += prob;
    cumulativeProbabilities.push(runningTotal);
  }
  return cumulativeProbabilities;
}

/**
 * Takes two players' data and gets a match result for them in accordance with statistical research.
 * Returns an object { player1win :bool, loserGames :number }
 */
function getMatchResult(playerName1, playerName2, startOfSimPlayerLookup) {
  // Match win difference from player 1 perspective
  const playerData1 = startOfSimPlayerLookup[playerName1];
  const playerData2 = startOfSimPlayerLookup[playerName2];
  const matchWinDiff =
    playerData1.wins -
    playerData1.losses -
    (playerData2.wins - playerData2.losses);

  const probabilities = getProbabilities(matchWinDiff);
  const cumulativeProbabilities = makeProbabilitiesCumulative(probabilities);

  const rand = Math.random();
  if (rand < cumulativeProbabilities[0]) {
    return {
      player1Win: true,
      loserGames: 0
    };
  } else if (rand < cumulativeProbabilities[1]) {
    return {
      player1Win: true,
      loserGames: 1
    };
  } else if (rand < cumulativeProbabilities[2]) {
    return {
      player1Win: true,
      loserGames: 2
    };
  } else if (rand < cumulativeProbabilities[3]) {
    return {
      player1Win: false,
      loserGames: 2
    };
  } else if (rand < cumulativeProbabilities[4]) {
    return {
      player1Win: false,
      loserGames: 1
    };
  } else {
    return {
      player1Win: false,
      loserGames: 0
    };
  }
}

// const testPlayer1 = {
//   name: "greg",
//   mp: 12,
//   wins: 12,
//   losses: 0,
//   gf: 36,
//   ga: 1,
//   gd: 36,
//   points: 48
// };
// const testPlayer2 = {
//   name: "jdmfx_",
//   mp: 2,
//   wins: 0,
//   losses: 2,
//   gf: 1,
//   ga: 6,
//   gd: -5,
//   points: 1
// };
// for (let i = 0; i < 10; i ++){
//   console.log(getMatchResult(testPlayer1, testPlayer2));
// }

export {
  getMatchResult
};
