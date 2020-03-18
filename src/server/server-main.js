const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const compute = require("./compute");
const simulate = require("./simulate");
const util = require("./util");
const BotClient = require("./discord-bot").BotClient;
const discordAuthRouter = require("./discord-auth").router;

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

// Whenever there is new information that hasn't been processed, clear the cache to force a refresh
function invalidateCache() {
  backupStandings = cachedFinalStandings;
  cachedFinalStandings = null;
}

function refreshCachedStandings(callback) {
  console.log("-- Fetching matches from database...");
  // Get matches from db
  getValidMatches(function(e, matches) {
    console.log("-- Fetching penalty points from database...");
    // Get penalty points from db
    getPenaltyPointMap(function(penaltyPoints) {
      console.log("-- Calculating standings...");
      backupStandings = cachedFinalStandings;
      // Process and save in cache
      try {
        cachedFinalStandings = getStandings(matches, penaltyPoints);
        console.log("Finished calculating standings");
        callback(true);
      } catch (error) {
        console.log(error);
        cachedFinalStandings = backupStandings;
        console.log("!! Match data corrupted, restoring from backup !!");
        callback(false);
      }
    });
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
      console.log(
        "Found penalty:",
        penaltyList[i].points,
        "for",
        penaltyList[i].player
      );
      penaltyPointsMap[penaltyList[i].player] = penaltyList[i].points;
    }
    callback(penaltyPointsMap);
  });
}

// Process the raw DB match data into standings
function getStandings(matchData, penaltyPoints) {
  const rawStandings = compute.computeRawStandings(matchData, penaltyPoints);
  const finalStandings = [];
  // Loop through each division and simulate many outcomes
  for (let d = 0; d < rawStandings.length; d++) {
    const division = rawStandings[d];
    const divMatches = matchData.filter(match => {
      return match.division == division.divisionName;
    });
    const matchSchedule = util.getMatchSchedule(division, divMatches);
    const simulationResults = simulate.runSimulation(division, matchSchedule);
    finalStandings.push(simulationResults);
  }
  return finalStandings;
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

// Start marking matches as corrupted from newest to oldest until the standings compute properly
function invalidateCorruptedData() {
  console.log("Starting emergency de-corruption");
  refreshCachedStandings(succeeded => {
    if (succeeded) {
      console.log("Successfully de-corrupted the dataset!");
      return true;
    } else {
      getValidMatches(function(e, matches) {
        if (matches.length == 0) {
          // The doomsday case. Lord knows what could get the db here.
          return false;
        }
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

  getValidMatches(function(e, matches) {
    console.log("-- Calculating standings...");
    // Process and save in cache
    backupStandings = cachedFinalStandings;
    try {
      cachedFinalStandings = getStandings(matches, {});
      console.log("Finished calculating standings");
    } catch (error) {
      cachedFinalStandings = backupStandings;
      console.log("!! Match data corrupted, restoring from backup !!");
    }
  });
}

/* 
  ----------
  Main request handlers
  ----------
  */

// Main GET standings request
app.get("/api/standings", function(req, res) {
  console.log("LOGGER----", "--- Get standings request: ", req.body);
  if (cachedFinalStandings != null) {
    console.log("Sending response with cached standings");
    return res.send(cachedFinalStandings);
  } else {
    console.log("Invalid cache, forced to refresh");
    refreshCachedStandings(succeeded => {
      if (succeeded) {
        console.log("Sending response with calculated standings");
      } else {
        console.log("Sending response with backup data");
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
  console.log("LOGGER----", "--- Post match request: ", req.body);
  console.log("Received request: ", req.body);

  // Check that the match hasn't already been reported
  getValidMatches(function(e, matches) {
    const winner = req.body.winner;
    const loser = req.body.loser;
    const winnerHome = req.body.winner_home;
    if (checkMatchAlreadyExists(matches, winner, loser, winnerHome)) {
      console.log(
        "LOGGER----",
        "Post match failed - match already exists\nRequest: ",
        req.body
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
      const newMatchData = { ...req.body, valid: true, corrupted: false };
      matchListDb.insert(newMatchData, function(err, doc) {
        if (err) {
          // If it failed, return error
          console.log(
            "LOGGER----",
            "Post match failed\nRequest: ",
            req.body,
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
            req.body
          );
          invalidateCache();
          discordBot.reportMatch(req.body);
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
  console.log("LOGGER----", "--- Delete match request: ", req.body);
  console.log("Received delete request:", req.body);
  if (req.body === {}) {
    console.log(
      "LOGGER----",
      "Delete match failed — empty body\nRequest: ",
      req.body
    );
    res.send({
      didSucceed: false,
      errorMessage:
        "The server didn't receive any data on which match to delete"
    });
  }

  const idOnlyBody = { _id: req.body._id };
  matchListDb.update(idOnlyBody, { $set: { valid: false } }, function(
    err,
    doc
  ) {
    if (err) {
      // If it failed, return error
      console.log(
        "LOGGER----",
        "Delete match failed\nRequest:",
        req.body,
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
        req.body
      );
      invalidateCache();
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
  penaltyDb.update(
    { player: req.body.player }, // Query
    { $set: { player: req.body.player, points: req.body.points } }, // Replacement document
    { upsert: true }, // Intelligently insert or update
    function(err, doc) {
      if (err) {
        // If it failed, return error
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
        // Otherwise, notify success
        console.log(
          "LOGGER----",
          "Post penalty points succeeded (invalidated)\nRequest: ",
          req.body
        );
        invalidateCache();
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
function main() {
  console.log("Server is running");
  refreshCachedStandings(succeeded => {
    if (succeeded) {
      console.log("Refreshed standings locally!");
    } else {
      console.log("!!!! Sev 0 - Data already corrupted on startup");
      invalidateCorruptedData();
    }
  });
}
main();

app.listen(process.env.PORT || 8080);
