const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../../build")));

const compute = require("./compute");
const simulate = require("./simulate");
const util = require("./util");

// Database config
var monk = require("monk");
var db = monk(process.env.MONGODB_URI || "localhost:27017/ctl-matches");
var ObjectID = db.helper.id.ObjectID;

// Make our db accessible to our router
app.use(function(req, res, next) {
  req.db = db;
  next();
});

/*
--------------------
Cache
(Store the calculated standings in memory, only updating when matches added or deleted)
--------------------
*/
let cachedFinalStandings = null;

// Whenever there is new information that hasn't been processed, clear the cache to force a refresh
function invalidateCache() {
  cachedFinalStandings = null;
}

function refreshCachedStandings(callback) {
  console.log("-- Fetching matches from database...");
  // Get matches from db
  const matchListDb = db.get("matchList");
  matchListDb.find({}, {}, function(e, matches) {
    console.log("-- Calculating standings...");
    // Process and save in cache
    cachedFinalStandings = getStandings(matches);
    console.log("Finished calculating standings");
    callback();
  });
}

// Calculate the standings once on startup

/*
 -------------------
 Helper methods
 -------------------
 */

// Process the raw DB match data into standings
function getStandings(matchData) {
  const rawStandings = compute.computeRawStandings(matchData);
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

/* 
  ----------
  Main request handlers
  ----------
  */

// Main GET standings request
app.get("/standings", function(req, res) {
  if (cachedFinalStandings != null) {
    console.log("Sending response with cached standings");
    return res.send(cachedFinalStandings);
  } else {
    console.log("Invalid cache, forced to refresh");
    refreshCachedStandings(() => {
      console.log("Sending response with calculated standings");
      return res.send(cachedFinalStandings);
    });
  }
});

// Main GET match data request
app.get("/match-data", function(req, res) {
  // Get matches from db
  const matchListDb = req.db.get("matchList");
  matchListDb.find({}, {}, function(e, matches) {
    return res.send(matches);
  });
});

// Main POST request to report a match
app.post("/match-data", function(req, res) {
  console.log("Received request: ", req.body);

  // Check that the match hasn't already been reported
  const matchListDb = req.db.get("matchList");
  matchListDb.find({}, {}, function(e, matches) {
    const winner = req.body.winner;
    const loser = req.body.loser;
    const winnerHome = req.body.winner_home;
    if (checkMatchAlreadyExists(matches, winner, loser, winnerHome)) {
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
      matchListDb.insert(req.body, function(err, doc) {
        if (err) {
          // If it failed, return error
          res.send({
            didSucceed: false,
            errorMessage: err
          });
        } else {
          // Otherwise, notify of success
          invalidateCache();
          res.send({
            didSucceed: true,
            errorMessage: ""
          });
        }
      });
    }
  });
});

app.delete("/match-data", function(req, res) {
  console.log("Received delete request:", req.body);
  const matchListDb = req.db.get("matchList");
  if (req.body === {}) {
    res.send({
      didSucceed: false,
      errorMessage:
        "The server didn't receive any data on which match to delete"
    });
  }
  matchListDb.remove(req.body, function(err, doc) {
    if (err) {
      // If it failed, return error
      res.send({
        didSucceed: false,
        errorMessage: err
      });
    } else {
      // Otherwise, notify success
      invalidateCache();
      res.send({
        didSucceed: true,
        errorMessage: ""
      });
    }
  });
});

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "../../build", "index.html"));
});

/*
Start script
*/
function main() {
  console.log("Server is running");
  refreshCachedStandings(() => {
    console.log("Refreshed standings locally!");
  });
}
main();

app.listen(process.env.PORT || 8080);
