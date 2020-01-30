const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const compute = require("./compute");
const simulate = require("./simulate");
const util = require("./util");
const BotClient = require("./discord-bot").BotClient;

// Configure express
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../../build")));

// Database config
const monk = require("monk");
const db = monk(process.env.MONGODB_URI || "localhost:27017/ctl-matches");
const matchListDb = db.get("matchList");
var ObjectID = db.helper.id.ObjectID;

// Create a logger
const logger = require("simple-node-logger").createSimpleFileLogger(
  "project.log"
);

// Configure the discord bot
const token = "NjcyMzE1NzgzMzYzMTY2MjA4.XjKMew.G96pU7U86WumR4r6KrsqZFflmAg";
const discordBot = new BotClient(token);
discordBot.start();

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
  getMatches(function(e, matches) {
    console.log("-- Calculating standings...");
    // Process and save in cache
    cachedFinalStandings = getStandings(matches);
    console.log("Finished calculating standings");
    callback();

    // // Test sending out a discord ping
    // const discordTestMatch = matches[0];
    // discordBot.reportMatch(discordTestMatch);
  });
}

/*
 -------------------
 Helper methods
 -------------------
 */

function getMatches(callback) {
  matchListDb.find({ valid: true }, callback);
}

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
  logger.info("--- Get standings request: ", req.body);
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
  logger.info("--- Get match data request: ", req.body);
  // Get matches from db
  getMatches(function(e, matches) {
    return res.send(matches);
  });
});

// Main POST request to report a match
app.post("/match-data", function(req, res) {
  logger.info("--- Post match request: ", req.body);
  console.log("Received request: ", req.body);

  // Check that the match hasn't already been reported
  getMatches(function(e, matches) {
    const winner = req.body.winner;
    const loser = req.body.loser;
    const winnerHome = req.body.winner_home;
    if (checkMatchAlreadyExists(matches, winner, loser, winnerHome)) {
      logger.info(
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
      const newMatchData = { ...req.body, valid: true };
      matchListDb.insert(newMatchData, function(err, doc) {
        if (err) {
          logger.error(err);
          // If it failed, return error
          logger.info(
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
          logger.info("Post match succeeded\nRequest: ", req.body);
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

app.delete("/match-data", function(req, res) {
  logger.info("--- Delete match request: ", req.body);
  console.log("Received delete request:", req.body);
  if (req.body === {}) {
    logger.info("Delete match failed — empty body\nRequest: ", req.body);
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
      logger.info("Delete match failed\nRequest:", req.body, "\nError: ", err);
      res.send({
        didSucceed: false,
        errorMessage: err
      });
    } else {
      // Otherwise, notify success
      logger.info("Delete match succeeded (invalidated)\nRequest: ", req.body);
      invalidateCache();
      res.send({
        didSucceed: true,
        errorMessage: ""
      });
    }
  });
});

app.get("/", function(req, res) {
  logger.info("--- Get frontend request");
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
