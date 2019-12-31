const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
app.use(express.static(path.join(__dirname, "../../build")));

const compute = require("./compute");
const simulate = require("./simulate");

console.log("Server is running");
const finalstandings = compute.computeRawStandings();
// console.log(
//   "\n\n---------Final standings--------\n",
//   finalstandings[0],
//   finalstandings[1]
// );

const simulationResults = simulate.runSimulation(finalstandings[2], compute.matchData);

app.get("/ping", function(req, res) {
  return res.send("pong");
});

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "../../build", "index.html"));
});

app.listen(process.env.PORT || 8080);
