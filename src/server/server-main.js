const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const compute = require("./compute");
const simulate = require("./simulate");
const util = require("./util");
const BotClient = require("./discord-bot").BotClient;
const discordAuthRouter = require("./discord-auth").router;
const configData = require("./config_data");

// Configure express
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../../build")));

// Database config
const monk = require("monk");
const db = monk(process.env.MONGODB_URI || "localhost:27017/ctl-matches");
const matchListDb = db.get("matchList"); // List of matches in JSON form
const penaltyDb = db.get("penalty"); // List of players and their penalty points

// Configure the discord bot
const token = process.env.DISCORD_TOKEN;
const discordBot = new BotClient(token);
discordBot.start();

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
  console.log("Invalidating cache for all divisions");
  // Move the now-invalid cache to backup before calculating the new cache
  backupStandings = cachedFinalStandings;

  // Mark all divisions as invalid
  let allDivisionsList = configData.divisionData.map(function(division) {
    return division.divisionName;
  });
  invalidDivisions = allDivisionsList;
}

/** Marks a particular division as being invalid in the cache. After calling this, callers should call refreshCachedStandings(). */
function invalidateCacheForDivision(divisionName) {
  console.log("Invalidating cache for division:", divisionName);
  // Move the now-invalid cache to backup before calculating the new cache
  backupStandings = cachedFinalStandings;

  // Mark the supplied division as invalid
  invalidDivisions.push(divisionName);
}

function isCacheValid() {
  return invalidDivisions.length === 0;
}

/** Updates the cache with a fully calculated set of standings, and marks the cache as valid. */
function setCachedStandings(newStandings) {
  cachedFinalStandings = newStandings;
  invalidDivisions = []; // Marking the cache as valid
}

/**
 * Refreshes the cached standings, re-calculating only the divisions marked as invalid in the cache.
 * @param callback - callback function when refresh is complete. Takes one boolean parameter which is true iff. the refresh succeeded.
 */
function refreshCachedStandings(callback) {
  console.log("-- Fetching matches from database...");
  // Get matches from db
  getValidMatches(function(e, matches) {
    console.log("-- Fetching penalty points from database...");
    // Get penalty points from db
    getPenaltyPointMap(function(penaltyPoints) {
      console.log("-- Calculating standings...");
      // Back up the standings before messing with anything
      backupStandings = cachedFinalStandings;
      try {
        // Attempt to calculate new standings
        const newStandings = calculateStandingsForInvalidDivisions(
          matches,
          penaltyPoints,
          cachedFinalStandings,
          invalidDivisions
        );
        console.log("Finished calculating standings");

        // If calculation success, save the result to cache
        setCachedStandings(newStandings);
        console.log("Updated standings in cache");
        callback(true);
      } catch (error) {
        // If calculation fails, restore from backup
        console.log(error);
        setCachedStandings(backupStandings);
        console.log("!! Match data corrupted, restoring from backup !!");
        callback(false);
      }
    });
  });
}

/** Generate up-to-date standings by recalculating the standings for all invalid divisions, and reusing the rest. */
function calculateStandingsForInvalidDivisions(
  matches,
  penaltyPoints,
  existingCache,
  invalidDivisions
) {
  console.log("Calculating standings for invalid divisions:", invalidDivisions);
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
      const cachedDivisionStandings = existingCache[d];
      finalStandings.push(cachedDivisionStandings);
    }
  }

  return finalStandings;
}

/** Start marking matches as corrupted from newest to oldest until the standings compute properly */
function invalidateCorruptedData() {
  console.log("Starting emergency de-corruption");
  invalidateCacheForAllDivisions();
  refreshCachedStandings(succeeded => {
    if (succeeded) {
      // On success, quit
      console.log("Successfully de-corrupted the dataset!");
      return true;
    } else {
      getValidMatches(function(e, matches) {
        if (matches.length == 0) {
          // On fail and no valid matches, this is the doomsday case. Lord knows what could get the db here.
          return false;
        }

        // On fail and some matches left, mark the first as corrupted and recurse
        const newestMatch = matches[matches.length - 1];
        const idOnlyBody = { _id: newestMatch._id };
        matchListDb.update(idOnlyBody, { $set: { corrupted: true } }, function(
          err,
          doc
        ) {
          if (err) {
            console.log(
              "Failed to mark match as corrupted:",
              newestMatch,
              "\nREASON:",
              err
            );
          } else {
            console.log("Marked match as corrupted:", newestMatch);
            // Recurse
            return invalidateCorruptedData();
          }
        });
      });
    }
  });
}

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

function checkMatchAlreadyExists(matches, winner, loser, winnerHome) {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (
      match.winner === winner &&
      match.loser === loser &&
      match.winner_home === winnerHome
    ) {
      return true;
    }
    if (
      match.winner === loser &&
      match.loser === winner &&
      match.winner_home !== winnerHome
    ) {
      return true;
    }
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

// Main GET standings request
app.get("/api/standings", function(req, res) {
  console.log("LOGGER----", "--- Get standings request: ", req.body);
  if (isCacheValid()) {
    console.log("Sending response with cached standings");
    return res.send(cachedFinalStandings);
  } else {
    console.log("Invalid cache, forced to refresh");
    refreshCachedStandings(succeeded => {
      if (succeeded) {
        console.log(
          "Refresh succeeded - sending response with calculated standings"
        );
      } else {
        console.log("Refresh failed - sending response with backup data");
      }
      return res.send(cachedFinalStandings);
    });
  }
});

// Main GET match data request
app.get("/api/match-data", function(req, res) {
  console.log("LOGGER----", "--- Get match data request: ", req.body);
  // Get matches from db
  getValidMatches(function(e, matches) {
    return res.send(matches);
  });
});

// Main POST request to report a match
app.post("/api/match-data", function(req, res) {
  const newMatch = req.body;
  console.log("LOGGER----", "--- Post match request: ", newMatch);
  console.log("Received request: ", newMatch);

  // Check that the match hasn't already been reported
  getValidMatches(function(e, matches) {
    const winner = newMatch.winner;
    const loser = newMatch.loser;
    const winnerHome = newMatch.winner_home;
    if (checkMatchAlreadyExists(matches, winner, loser, winnerHome)) {
      console.log(
        "LOGGER----",
        "Post match failed - match already exists\nRequest: ",
        newMatch
      );
      res.send({
        didSucceed: false,
        errorMessage: getMatchAlreadyExistsErrorMessage(
          winner,
          loser,
          winnerHome
        )
      });
    } else {
      // Continue with the post
      const newMatchData = { ...newMatch, valid: true, corrupted: false };
      matchListDb.insert(newMatchData, function(err, doc) {
        if (err) {
          // If it failed, return error
          console.log(
            "LOGGER----",
            "Post match failed\nRequest: ",
            newMatch,
            "\nError: ",
            err
          );
          res.send({
            didSucceed: false,
            errorMessage: err
          });
        } else {
          // Otherwise, notify of success and post to discord
          console.log(
            "LOGGER----",
            "Post match succeeded\nRequest: ",
            newMatch
          );
          invalidateCacheForDivision(newMatch.division);
          discordBot.reportMatch(newMatch);
          res.send({
            didSucceed: true,
            errorMessage: ""
          });
        }
      });
    }
  });
});

// Main DELETE match request
app.delete("/api/match-data", function(req, res) {
  const matchToDelete = req.body;
  console.log("LOGGER----", "--- Delete match request: ", matchToDelete);
  console.log("Received delete request:", matchToDelete);
  if (matchToDelete === {}) {
    console.log(
      "LOGGER----",
      "Delete match failed — empty body\nRequest: ",
      matchToDelete
    );
    res.send({
      didSucceed: false,
      errorMessage:
        "The server didn't receive any data on which match to delete"
    });
  }

  const idOnlyBody = { _id: matchToDelete._id };
  matchListDb.update(idOnlyBody, { $set: { valid: false } }, function(
    err,
    doc
  ) {
    if (err) {
      // If it failed, return error
      console.log(
        "LOGGER----",
        "Delete match failed\nRequest:",
        matchToDelete,
        "\nError: ",
        err
      );
      res.send({
        didSucceed: false,
        errorMessage: err
      });
    } else {
      // Otherwise, notify success
      console.log(
        "LOGGER----",
        "Delete match succeeded (invalidated)\nRequest: ",
        matchToDelete
      );
      invalidateCacheForDivision(matchToDelete.division);
      res.send({
        didSucceed: true,
        errorMessage: ""
      });
    }
  });
});

// POST request to report penalty points
app.post("/api/penalty", function(req, res) {
  console.log("Attempted report of penalty points, with body", req.body);
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
        console.log(
          "LOGGER----",
          "Post penalty points failed\nRequest:",
          req.body,
          "\nError: ",
          err
        );
        res.send({
          didSucceed: false,
          errorMessage: err
        });
      } else {
        // If DB operation succeeded, invalidate the cache and send success
        console.log(
          "LOGGER----",
          "Post penalty points succeeded (invalidated)\nRequest: ",
          req.body
        );
        invalidateCacheForDivision(playerDivision);
        res.send({
          didSucceed: true,
          errorMessage: ""
        });
      }
    }
  );
});

// POST request to authenticate as admin
app.post("/api/authenticate", function(req, res) {
  console.log("Auth attempt with password:", req.body.password);
  if (req.body.password === (process.env.ADMIN_PASSWORD || "tameimpala")) {
    console.log("Auth passed, sending response");
    res.send({
      didSucceed: true
    });
  } else {
    console.log("Auth failed, sending response");
    res.send({
      didSucceed: false
    });
  }
});

// Main GET request for serving the frontend
app.get("*", function(req, res) {
  console.log("LOGGER----", "--- Get frontend request");
  res.sendFile(path.join(__dirname, "../../build", "index.html"));
});

/*
------------------------
Start script
------------------------
*/
function initialSetup() {
  console.log("Server is running");
  invalidateCacheForAllDivisions();
  refreshCachedStandings(succeeded => {
    if (succeeded) {
      console.log("Refreshed standings locally!");
    } else {
      console.log("!!!! Sev 0 - Data already corrupted on startup");
      invalidateCorruptedData();
    }
  });
}

initialSetup();

app.listen(process.env.PORT || 8080);
