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
var db = monk("localhost:27017/ctl-matches");

console.log("Server is running");

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

// Make our db accessible to our router
app.use(function(req, res, next) {
  req.db = db;
  next();
});

// Main GET match data request
app.get("/match-data", function(req, res) {
  // Get matches from db
  const matchListDb = req.db.get("matchList");
  matchListDb.find({}, {}, function(e, matches) {
    console.log("matches", matches);
    // Process and return
    return res.send(getStandings(matches));
  });
});

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
  }
  return false;
}

// Main POST request to report a match
app.post("/match-data", function(req, res) {
  console.log("Received request: ", req.body);

  // Check that the match hasn't already been reported
  const matchListDb = req.db.get("matchList");
  matchListDb.find({}, {}, function(e, matches) {
    const winner = req.body.winner;
    const loser = req.body.loser;
    const winnerHome = req.body.winner_home;
    // const matchesParsed = JSON.parse(matches);
    if (checkMatchAlreadyExists(matches, winner, loser, winnerHome)) {
      const errMessage =
        "A match has already been reported between " +
        winner +
        " and " +
        loser +
        " (with " +
        (winnerHome ? winner : loser) +
        " at home)";
      res.send({
        didSucceed: false,
        errorMessage: errMessage
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
          return;
        } else {
          // And forward to success page
          res.send({
            didSucceed: true,
            errorMessage: ""
          });
          return;
        }
      });
    }
  });
});

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "../../build", "index.html"));
});

app.listen(process.env.PORT || 8080);
