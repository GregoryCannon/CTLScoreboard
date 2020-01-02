const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
app.use(express.static(path.join(__dirname, "../../build")));

const compute = require("./compute");
const simulate = require("./simulate");
const util = require("./util");
import divisionData from "./config_data";

// Database config
var monk = require("monk");
var db = monk("localhost:27017/ctl-matches");

console.log("Server is running");

// Main GET function, triggered by get requests below
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

// Main routing functions
app.get("/match-data", function(req, res) {
  // Get matches from db
  const matchListDb = req.db.get("matchList");
  matchListDb.find({}, {}, function(e, docs) {
    // Process and return
    return res.send(getStandings(docs));
  });
});

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "../../build", "index.html"));
});

app.listen(process.env.PORT || 8080);
