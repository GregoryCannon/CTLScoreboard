require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const compute = require("./compute");
const simulate = require("./simulate");
const util = require("./util");
const { RegistrationAndMatchBot } = require("./registration-bot");
const discordAuthRouter = require("./discord-auth").router;
const configData = require("./config_data");
const logger = require("./logger");

// Configure express
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../../build")));

// Set CORS policy
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// Database config
const monk = require("monk");
const db = monk(process.env.DB_URI || "localhost:27017/ctl-matches");
const matchListDb = db.get("matchList"); // List of matches in JSON form
const penaltyDb = db.get("penalty"); // List of players and their penalty points

// Configure the reporting/signup Discord bots
const discordBots = {};
for (comp of configData.competitions) {
  // TEMPORARY TEST FIX
  if (comp.abbreviation == "dl"){
    continue
  }
  
  discordBots[comp.abbreviation] = new RegistrationAndMatchBot(comp);
}

// Add discord authentication router
app.use("/discord-api", discordAuthRouter);

/*
--------------------
Cache
(Store the calculated standings in memory, only updating when matches added or deleted)
--------------------
*/
let cachedFinalStandings = null;
let backupStandings = null;
let invalidDivisions = []; // Source of truth for whether the cache is valid. If empty, cache is valid.

/** Marks all divisions as being invalid in the cache. After calling this, callers should call refreshCachedStandings(). */
function invalidateCacheForAllDivisions() {
  logger.log("Invalidating cache for all divisions");
  // Move the now-invalid cache to backup before calculating the new cache
  moveCacheToBackup();

  // Mark all divisions as invalid
  let allDivisionsList = configData.divisionData.map(function(division) {
    return division.divisionName;
  });
  invalidDivisions = allDivisionsList;
}

/** Marks a particular division as being invalid in the cache. After calling this, callers should call refreshCachedStandings(). */
function invalidateCacheForDivision(divisionName) {
  logger.log("Invalidating cache for division:", divisionName);
  // Move the now-invalid cache to backup before calculating the new cache
  moveCacheToBackup();

  // Mark the supplied division as invalid
  invalidDivisions.push(divisionName);
}

function moveCacheToBackup() {
  backupStandings = JSON.parse(JSON.stringify(cachedFinalStandings));
}

function isCacheValid() {
  return invalidDivisions.length === 0;
}

/** Updates the cache with a fully calculated set of standings, and marks the cache as valid. */
function setCachedStandings(newStandings) {
  // It's ESSENTIAL to use a copy instead of the original reference or weird stuff happens.
  cachedFinalStandings = JSON.parse(JSON.stringify(newStandings));
  // Mark the cache as valid
  invalidDivisions = [];
}

/**
 * Refreshes the cached standings, re-calculating only the divisions marked as invalid in the cache.
 * @param callback - callback function when refresh is complete. Takes one boolean parameter which is true iff. the refresh succeeded.
 */
function refreshCachedStandings(callback) {
  logger.log("Fetching matches from database");
  // Get matches from db
  getValidMatches(function(e, matches) {
    logger.log("Fetching penalty points from database");
    // Get penalty points from db
    getPenaltyPointMap(function(penaltyPoints) {
      logger.log("Calculating standings");
      // Back up the standings before messing with anything
      moveCacheToBackup();
      try {
        // Attempt to calculate new standings
        const newStandings = calculateStandingsForInvalidDivisions(
          matches,
          penaltyPoints
        );
        logger.log("Finished calculating standings");

        // If calculation success, save the result to cache
        setCachedStandings(newStandings);
        logger.log("Updated standings in cache");
        callback(true);
      } catch (error) {
        // If calculation fails, restore from backup
        logger.log("Failed to calculate standings, reason:", error);
        setCachedStandings(backupStandings);
        logger.log("!! Match data corrupted, restoring from backup !!");
        callback(false);
      }
    });
  });
}

/** Generate up-to-date standings by recalculating the standings for all invalid divisions, and reusing the rest. */
function calculateStandingsForInvalidDivisions(matches, penaltyPoints) {
  logger.log("Calculating standings for invalid divisions:", invalidDivisions);
  const rawStandings = compute.computeRawStandings(matches, penaltyPoints);
  const finalStandings = [];

  // Loop through the divisions
  for (let d = 0; d < rawStandings.length; d++) {
    const division = rawStandings[d];

    // If the division is invalid in cache, recalculate it
    if (invalidDivisions.includes(division.divisionName)) {
      const divMatches = matches.filter(match => {
        return match.division == division.divisionName;
      });
      const divMatchSchedule = util.getMatchSchedule(division, divMatches);
      const simulationResults = simulate.runSimulation(
        division,
        divMatchSchedule
      );
      finalStandings.push(simulationResults);
    }

    // Otherwise use the cached one
    else {
      const cachedDivisionStandings = cachedFinalStandings[d];
      finalStandings.push(cachedDivisionStandings);
    }
  }

  return finalStandings;
}

// /** Start marking matches as corrupted from newest to oldest until the standings compute properly */
// function invalidateCorruptedData() {
//   logger.log("Starting emergency de-corruption");
//   invalidateCacheForAllDivisions();
//   refreshCachedStandings(succeeded => {
//     if (succeeded) {
//       // On success, quit
//       logger.log("Successfully de-corrupted the dataset!");
//       return true;
//     } else {
//       getValidMatches(function(e, matches) {
//         if (matches.length == 0) {
//           // On fail and no valid matches, this is the doomsday case. Lord knows what could get the db here.
//           return false;
//         }

//         // On fail and some matches left, mark the first as corrupted and recurse
//         const newestMatch = matches[matches.length - 1];
//         const idOnlyBody = { _id: newestMatch._id };
//         matchListDb.update(idOnlyBody, { $set: { corrupted: true } }, function(
//           err,
//           doc
//         ) {
//           if (err) {
//             logger.log(
//               "Failed to mark match as corrupted:",
//               newestMatch,
//               "\nREASON:",
//               err
//             );
//           } else {
//             logger.log("Marked match as corrupted:", newestMatch);
//             // Recurse
//             return invalidateCorruptedData();
//           }
//         });
//       });
//     }
//   });
// }

/*
 -------------------
 Helper methods
 -------------------
 */

function getValidMatches(callback) {
  matchListDb.find({ valid: true, corrupted: false }, callback);
}

function getPenaltyPointMap(callback) {
  const penaltyPointsMap = {};
  penaltyDb.find({}, function(e, penaltyList) {
    for (let i = 0; i < penaltyList.length; i++) {
      penaltyPointsMap[penaltyList[i].player] = penaltyList[i].points;
    }
    callback(penaltyPointsMap);
  });
}

function checkMatchAlreadyExists(matches, division, winner, loser, winnerHome) {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (
      match.division === division &&
      match.winner === winner &&
      match.loser === loser &&
      match.winner_home === winnerHome
    ) {
      return true;
    }
    if (
      match.division === division &&
      match.winner === loser &&
      match.loser === winner &&
      match.winner_home !== winnerHome
    ) {
      return true;
    }
  }
  return false;
}

function checkPreviousMatchHasSameTime(matches, winner, loser, time) {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    console.log(match);
    if (match.match_date !== time) continue;
    if (match.winner === winner && match.loser === loser) return true;
    if (match.loser === winner && match.winner === loser) return true;
  }
  return false;
}

function getMatchAlreadyExistsErrorMessage(winner, loser, winnerHome) {
  return (
    "A match has already been reported between " +
    winner +
    " and " +
    loser +
    " (with " +
    (winnerHome ? winner : loser) +
    " at home)"
  );
}

/* 
  ----------
  Main request handlers
  ----------
  */

/** GET standings request */
app.get("/api/standings", function(req, res) {
  logger.logRequest("Get standings", req.body);

  if (isCacheValid() && cachedFinalStandings !== null) {
    logger.logResponseDescription("Sending cached standings");
    return res.send(cachedFinalStandings || {});
  } else {
    logger.log("Invalid cache, forced to refresh");
    return refreshCachedStandings(succeeded => {
      if (succeeded) {
        logger.log("Refresh succeeded");
        logger.logResponseDescription(
          "Sending cached standings (= newly calculated standings)"
        );
      } else {
        logger.log("Refresh failed");
        logger.logResponseDescription(
          "Sending cached standings (= backup data)"
        );
      }
      return res.send(cachedFinalStandings || {});
    });
  }
});

/** GET match data request */
app.get("/api/match-data", function(req, res) {
  logger.logRequest("Get match data", req.body);

  // Get matches from db
  getValidMatches(function(e, matches) {
    logger.logResponseDescription("Sending match data");
    return res.send(matches);
  });
});

/** POST request to report a match */
app.post("/api/match-data", function(req, res) {
  logger.logRequest("Report match", req.body);
  const newMatch = req.body;

  // Check that the winner has the correct number of games
  const divData = configData.divisionData.find(
    d => d.divisionName === newMatch.division
  );
  const isDivBo7 = !(divData.bestOf === undefined) && divData.bestOf === 7;
  if (isDivBo7 && newMatch.winner_games !== 4) {
    const responseBody = {
      didSucceed: false,
      errorMessage: "The winner should have won 4 games."
    };
    logger.logResponse("Report match", responseBody);
    res.send(responseBody);
    return;
  }
  if (!isDivBo7 && newMatch.winner_games !== 3) {
    const responseBody = {
      didSucceed: false,
      errorMessage: "The winner should have won 3 games."
    };
    logger.logResponse("Report match", responseBody);
    res.send(responseBody);
    return;
  }

  // Check that the match hasn't already been reported
  getValidMatches(function(e, matches) {
    if (
      checkMatchAlreadyExists(
        matches,
        newMatch.division,
        newMatch.winner,
        newMatch.loser,
        newMatch.winner_home
      )
    ) {
      const responseBody = {
        didSucceed: false,
        errorMessage: getMatchAlreadyExistsErrorMessage(
          newMatch.winner,
          newMatch.loser,
          newMatch.winner_home
        )
      };
      logger.logResponse("Report match", responseBody);
      res.send(responseBody);
      // function checkPreviousMatchHasSameTime(matches, winner, loser, time) {
    } else if (
      checkPreviousMatchHasSameTime(
        matches,
        newMatch.winner,
        newMatch.loser,
        newMatch.match_date
      )
    ) {
      const responseBody = {
        didSucceed: false,
        errorMessage:
          "Please make sure matches between the same two players have different match times."
      };
      logger.logResponse("Report match", responseBody);
      res.send(responseBody);
    } else {
      // Continue with the post
      const newMatchData = { ...newMatch, valid: true, corrupted: false };
      matchListDb.insert(newMatchData, function(err, doc) {
        if (err) {
          // If it failed, return error
          const responseBody = {
            didSucceed: false,
            errorMessage: err
          };
          logger.logResponse("Report match", responseBody);
          res.send(responseBody);
        } else {
          // If succeeded, invalidate cache, report the match to discord, and send success response
          invalidateCacheForDivision(newMatch.division);
          const comp = util.getCompetition(newMatch);
          console.log("Reporting new match, competition =", comp);
          discordBots[comp].reportMatch(newMatch);

          const responseBody = {
            didSucceed: true,
            errorMessage: ""
          };
          logger.logResponse("Report match", responseBody);
          res.send(responseBody);
        }
      });
    }
  });
});

/** DELETE all matches from a division */
app.delete("/api/match-data/purge", function(req, res) {
  logger.logRequest("Purge division", req.body);
  if (Object.keys(req.body).length === 0) {
    const responseBody = {
      didSucceed: false,
      errorMessage:
        "The server didn't receive any data on which division to purge"
    };
    logger.logResponse("Purge division", responseBody);
    res.send(responseBody);
  }

  const divisionName = req.body.divisionName;
  const divisionQuery = { division: divisionName };
  matchListDb.update(
    divisionQuery,
    { $set: { valid: false } },
    { multi: true },
    function(err, doc) {
      if (err) {
        // If it failed, return error
        const responseBody = {
          didSucceed: false,
          errorMessage: err
        };
        logger.logResponse("Purge division", responseBody);
        res.send(responseBody);
      } else {
        // Otherwise, return success
        invalidateCacheForDivision(divisionName);
        const responseBody = {
          didSucceed: true,
          errorMessage: ""
        };
        logger.logResponse("Purge division", responseBody);
        res.send(responseBody);
      }
    }
  );
});

/** DELETE match request */
app.delete("/api/match-data", function(req, res) {
  logger.logRequest("Delete match", req.body);
  const matchToDelete = req.body;

  if (Object.keys(matchToDelete).length === 0) {
    const responseBody = {
      didSucceed: false,
      errorMessage:
        "The server didn't receive any data on which match to delete"
    };
    logger.logResponse("Delete match", responseBody);
    res.send(responseBody);
  }

  const idOnlyBody = { _id: matchToDelete._id };
  matchListDb.update(idOnlyBody, { $set: { valid: false } }, function(
    err,
    doc
  ) {
    if (err) {
      // If it failed, return error
      const responseBody = {
        didSucceed: false,
        errorMessage: err
      };
      logger.logResponse("Delete match", responseBody);
      res.send(responseBody);
    } else {
      // Otherwise, return success
      invalidateCacheForDivision(matchToDelete.division);
      const responseBody = {
        didSucceed: true,
        errorMessage: ""
      };
      logger.logResponse("Delete match", responseBody);
      res.send(responseBody);
    }
  });
});

/** POST request to report penalty points */
app.post("/api/penalty", function(req, res) {
  logger.logRequest("Report penalty", req.body);
  const penalizedPlayer = req.body.player;
  const penaltyAmount = req.body.points;
  const playerDivision = req.body.divisionName;

  // Update the penalty database
  penaltyDb.update(
    { player: penalizedPlayer }, // Query
    { $set: { player: penalizedPlayer, points: penaltyAmount } }, // Document to add or replace
    { upsert: true }, // Intelligently insert or update
    function(err, doc) {
      if (err) {
        // If DB operation failed, return error
        const responseBody = {
          didSucceed: false,
          errorMessage: err
        };
        logger.logResponse("Report penalty", responseBody);
        res.send(responseBody);
      } else {
        // If DB operation succeeded, invalidate the cache and send success
        invalidateCacheForDivision(playerDivision);

        const responseBody = {
          didSucceed: true,
          errorMessage: ""
        };
        logger.logResponse("Report penalty", responseBody);
        res.send(responseBody);
      }
    }
  );
});

/** GET request for serving the frontend */
app.get("*", function(req, res) {
  logger.logRequest("Get frontend", req.body);
  logger.logResponseDescription("Sending frontend");
  res.sendFile(path.join(__dirname, "../../build", "index.html"));
});

/*
------------------------
Start script
------------------------
*/
function initialSetup() {
  logger.log("Server is running");
  invalidateCacheForAllDivisions();
  refreshCachedStandings(succeeded => {
    if (succeeded) {
      logger.log("Refreshed standings locally!");
    } else {
      logger.log("!!!! Sev 0 - Data already corrupted on startup");
      // Don't run this routine because it causes more harm than good. Definitely better to fail-fast.
      // invalidateCorruptedData();
    }
  });
}

initialSetup();

app.listen(process.env.PORT || 8080);
