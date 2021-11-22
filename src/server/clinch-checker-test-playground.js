/**
 * Playground for manual testing of clinch checking.
 *
 * Writing unit tests isn't worth it in this case because the clinching code doesn't
 * change much, and if it did it would be due to a new scoring system, which would have
 * different test cases anyways. ¯\_(ツ)_/¯
 */

const clinchChecker = require("./clinch-checker");

const testDivision = {
  divisionName: "1.3m",
  numWinner: 0,
  numAutoPromo: 1,
  numPlayoffPromo: 0,
  numPlayoffRelegate: 0,
  numAutoRelegate: 1,
  players: ["greg", "jdmfx_", "jonas", "larry"],
  standings: [
    {
      name: "greg",
      mp: 6,
      wins: 6,
      losses: 0,
      gf: 18,
      ga: 0,
      gd: 18,
      points: 24
    },
    {
      name: "jdmfx_",
      mp: 6,
      wins: 6,
      losses: 0,
      gf: 12,
      ga: 1,
      gd: 11,
      points: 24
    },
    {
      name: "jonas",
      mp: 6,
      wins: 3,
      losses: 3,
      gf: 6,
      ga: 6,
      gd: 0,
      points: 12
    },
    {
      name: "larry",
      mp: 6,
      wins: 0,
      losses: 6,
      gf: 0,
      ga: 12,
      gd: -12,
      points: 0
    }
  ]
};

// Function for manual testing of clinching methods.
function testClinchingCalculationMethods() {
  const targetPlayer = testDivision.standings[0];
  console.log(
    "BEST:\n",
    clinchChecker.simulateBestSeasonForPlayer(testDivision, targetPlayer)
  );
  console.log(
    "WORST:\n",
    clinchChecker.simulateWorstSeasonForPlayer(testDivision, targetPlayer)
  );

  console.log(
    "didClinchAutoPromo:",
    clinchChecker.didClinchAutoPromo(targetPlayer, testDivision)
  );
  console.log(
    "didClinchPlayoffPromo:",
    clinchChecker.didClinchPlayoffPromo(targetPlayer, testDivision)
  );
  console.log(
    "didClinchNonAutoPromo:",
    clinchChecker.didClinchNonAutoPromo(targetPlayer, testDivision)
  );
  console.log(
    "didClinchNonPlayoffPromo:",
    clinchChecker.didClinchNonPlayoffPromo(targetPlayer, testDivision)
  );

  console.log(
    "didClinchAutoRelegation:",
    clinchChecker.didClinchAutoRelegation(targetPlayer, testDivision)
  );
  console.log(
    "didClinchPlayoffRelegation:",
    clinchChecker.didClinchPlayoffRelegation(targetPlayer, testDivision)
  );
  console.log(
    "didClinchNonAutoRelegation:",
    clinchChecker.didClinchNonAutoRelegation(targetPlayer, testDivision)
  );
  console.log(
    "didClinchNonRelegation:",
    clinchChecker.didClinchNonPlayoffRelegation(targetPlayer, testDivision)
  );
}
testClinchingCalculationMethods();
