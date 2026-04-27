import "dotenv/config";

import type {
  DivisionWithChances,
  Match,
  Penalty
} from "../types.ts";

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import monk from "monk";
import cors from "cors";

import { computeRawStandings } from "./compute.ts";
import { runSimulation } from "./simulate.ts";
import { getCompetition, getMatchSchedule } from "./util.ts";
import { RegistrationAndMatchBot } from "./registration-bot.ts";
import { router as discordAuthRouter } from "./discord-auth.ts";
import { competitions, divisionData } from "./config_data.ts";
import { log, logRequest, logResponse, logResponseDescription } from "./logger.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure express
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../../build")));
app.use(cors({
  allowedHeaders: ['Content-Type']
}))

// Set CORS policy
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// Database config
const db = monk(process.env.DB_URI || "localhost:27017/ctl-matches");
const matchListDb = db.get<Match>("matchList"); // List of matches in JSON form
const penaltyDb = db.get<Penalty>("penalty"); // List of players and their penalty points

// Configure the reporting/signup Discord bots
const discordBots: Record<string, RegistrationAndMatchBot> = {};
for (let comp of competitions) {
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
let cachedFinalStandings: DivisionWithChances[] | null = null;
let backupStandings: DivisionWithChances[] | null  = null;
let invalidDivisions: string[] = []; // Source of truth for whether the cache is valid. If empty, cache is valid.

/** Marks all divisions as being invalid in the cache. After calling this, callers should call refreshCachedStandings(). */
function invalidateCacheForAllDivisions() {
  log("Invalidating cache for all divisions");
  // Move the now-invalid cache to backup before calculating the new cache
  moveCacheToBackup();

  // Mark all divisions as invalid
  let allDivisionsList = divisionData.map(function(division) {
    return division.divisionName;
  });
  invalidDivisions = allDivisionsList;
}

/** Marks a particular division as being invalid in the cache. After calling this, callers should call refreshCachedStandings(). */
function invalidateCacheForDivision(divisionName: string) {
  log("Invalidating cache for division:", divisionName);
  // Move the now-invalid cache to backup before calculating the new cache
  moveCacheToBackup();

  // Mark the supplied division as invalid
  invalidDivisions.push(divisionName);
}

function moveCacheToBackup() {
  backupStandings = structuredClone(cachedFinalStandings);
}

function isCacheValid() {
  return invalidDivisions.length === 0;
}

/** Updates the cache with a fully calculated set of standings, and marks the cache as valid. */
function setCachedStandings(newStandings: DivisionWithChances[]) {
  cachedFinalStandings = structuredClone(newStandings);
  // Mark the cache as valid
  invalidDivisions = [];
}

/**
 * Refreshes the cached standings, re-calculating only the divisions marked as invalid in the cache.
 * @param callback - callback function when refresh is complete. Takes one boolean parameter which is true iff. the refresh succeeded.
 */
async function refreshCachedStandings(): Promise<boolean> {
  log("Fetching matches from database");
  const matches = await matchListDb.find({ valid: true, corrupted: false });

  log("Fetching penalty points from database");
  const penaltyPoints = await getPenaltyPointMap();
  log("Calculating standings");
  // Back up the standings before messing with anything
  moveCacheToBackup();
  try {
    // Attempt to calculate new standings
    const newStandings = calculateStandingsForInvalidDivisions(
      matches,
      penaltyPoints
    );
    log("Finished calculating standings");

    // If calculation success, save the result to cache
    setCachedStandings(newStandings);
    log("Updated standings in cache");
    return true;
  } catch (error) {
    // If calculation fails, restore from backup
    if (error instanceof Error) {
      log("Failed to calculate standings, reason:", error.message);
    } else {
      log("Failed to calculate standings");
    }

    if (backupStandings === null) {
      log("!! Match data corrupted, no backup !!");
    } else {
      setCachedStandings(backupStandings);
      log("!! Match data corrupted, restoring from backup !!");
    }
    return false;
  }
}

/** Generate up-to-date standings by recalculating the standings for all invalid divisions, and reusing the rest. */
function calculateStandingsForInvalidDivisions(matches: Match[], penaltyPoints: Record<string, number>): DivisionWithChances[] {
  log("Calculating standings for invalid divisions:", ...invalidDivisions);
  const rawStandings = computeRawStandings(matches, penaltyPoints);
  const finalStandings = [];

  // Loop through the divisions
  for (let d = 0; d < rawStandings.length; d++) {
    const division = rawStandings[d];
    console.log(`division: ${division.settings.divisionName}`);

    // If the division is invalid in cache, recalculate it
    if (invalidDivisions.includes(division.settings.divisionName)) {
      const divMatches = matches.filter(match => {
        return match.division == division.settings.divisionName;
      });
      console.log(` > ${divMatches.length} matches in div`);
      const divMatchSchedule = getMatchSchedule(division, divMatches);
      console.log(" > Got schedule");
      const simulationResults = runSimulation(
        division,
        divMatchSchedule
      );
      console.log(" > Ran simulation");
      finalStandings.push(simulationResults);
    }

    // Otherwise use the cached one
    else {
      if (cachedFinalStandings !== null) {
        const cachedDivisionStandings = cachedFinalStandings[d];
        finalStandings.push(cachedDivisionStandings);
      }
    }
  }
  log("Finished calculating standings for invalid divisions");
  return finalStandings;
}

/*
 -------------------
 Helper methods
 -------------------
 */

// function getValidMatches(callback) {
//   matchListDb.find({ valid: true, corrupted: false }, callback);
// }

async function getPenaltyPointMap() {
  const penaltyPointsMap: Record<string, number> = {};
  const penaltyList = await penaltyDb.find();
  for (let i = 0; i < penaltyList.length; i++) {
    penaltyPointsMap[penaltyList[i].player] = penaltyList[i].points;
  }
  return penaltyPointsMap;
}

function checkMatchAlreadyExists(
  matches: Match[], 
  division: string, 
  winner: string, 
  loser: string, 
  winnerHome: boolean
) {
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

function checkPreviousMatchHasSameTime(
  matches: Match[], 
  winner: string, 
  loser: string, 
  time: number
){
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    console.log(match);
    if (match.match_date !== time) continue;
    if (match.winner === winner && match.loser === loser) return true;
    if (match.loser === winner && match.winner === loser) return true;
  }
  return false;
}

function getMatchAlreadyExistsErrorMessage(
  winner: string, 
  loser: string, 
  winnerHome: boolean
) {
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
app.get("/api/standings", async function(req, res) {
  logRequest("Get standings", req.body);

  if (isCacheValid() && cachedFinalStandings !== null) {
    logResponseDescription("Sending cached standings");
    return res.send(cachedFinalStandings || {});
  } else {
    log("Invalid cache, forced to refresh");
    const cacheRefreshSuccess = await refreshCachedStandings();
    if (cacheRefreshSuccess) {
      log("Refresh succeeded");
      logResponseDescription(
        "Sending cached standings (= newly calculated standings)"
      );
    } else {
      log("Refresh failed");
      logResponseDescription(
        "Sending cached standings (= backup data)"
      );
    }
    return res.send(cachedFinalStandings || []);
  }
});

/** GET match data request */
app.get("/api/match-data", async function(req, res) {
  logRequest("Get match data", req.body);
  const validMatches = await matchListDb.find({ valid: true, corrupted: false });
  logResponseDescription("Sending match data");
  return res.send(validMatches);
});

/** POST request to report a match */
app.post("/api/match-data", async function(req, res) {
  logRequest("Report match", req.body);
  const newMatch = req.body;

  // Check that the winner has the correct number of games
  const divData = divisionData.find(
    d => d.divisionName === newMatch.division
  );
  if (divData === undefined) {
    const responseBody = {
      didSucceed: false,
      errorMessage: "Division data not found. Please contact the moderators of the competition."
    };
    logResponse("Report match", responseBody);
    res.send(responseBody);
    return;
  }
  const isDivBo7 = !(divData.bestOf === undefined) && divData.bestOf === 7;
  if (isDivBo7 && newMatch.winner_games !== 4) {
    const responseBody = {
      didSucceed: false,
      errorMessage: "The winner should have won 4 games."
    };
    logResponse("Report match", responseBody);
    res.send(responseBody);
    return;
  }
  if (!isDivBo7 && newMatch.winner_games !== 3) {
    const responseBody = {
      didSucceed: false,
      errorMessage: "The winner should have won 3 games."
    };
    logResponse("Report match", responseBody);
    res.send(responseBody);
    return;
  }

  // await getValidMatches(matches);
  const matches = await matchListDb.find({ valid: true, corrupted: false });

  // Check that the match hasn't already been reported
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
    logResponse("Report match", responseBody);
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
    logResponse("Report match", responseBody);
    res.send(responseBody);
  } else {
    // Continue with the post
    const newMatchData = { ...newMatch, valid: true, corrupted: false };
    try {
      await matchListDb.insert(newMatchData);
      invalidateCacheForDivision(newMatch.division);
      const comp = getCompetition(newMatch);
      if (comp === null) {
        log("Could not report new match -- invalid competition");
      } else {
        log("Reporting new match, competition =", comp);
        discordBots[comp].reportMatch(newMatch);
      }

      const responseBody = {
        didSucceed: true,
        errorMessage: ""
      };
      logResponse("Report match", responseBody);
      res.send(responseBody);
    } catch (err) {
      const responseBody = {
        didSucceed: false,
        errorMessage: err
      };
      logResponse("Report match", responseBody);
      res.send(responseBody);
    }
  }
});

/** DELETE all matches from a division */
app.delete("/api/match-data/purge", function(req, res) {
  logRequest("Purge division", req.body);
  if (Object.keys(req.body).length === 0) {
    const responseBody = {
      didSucceed: false,
      errorMessage:
        "The server didn't receive any data on which division to purge"
    };
    logResponse("Purge division", responseBody);
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
        logResponse("Purge division", responseBody);
        res.send(responseBody);
      } else {
        // Otherwise, return success
        invalidateCacheForDivision(divisionName);
        const responseBody = {
          didSucceed: true,
          errorMessage: ""
        };
        logResponse("Purge division", responseBody);
        res.send(responseBody);
      }
    }
  );
});

/** DELETE match request */
app.delete("/api/match-data", async function(req, res) {
  logRequest("Delete match", req.body);
  const matchToDelete = req.body;

  if (Object.keys(matchToDelete).length === 0) {
    const responseBody = {
      didSucceed: false,
      errorMessage:
        "The server didn't receive any data on which match to delete"
    };
    logResponse("Delete match", responseBody);
    res.send(responseBody);
  }

  const idOnlyBody = { _id: matchToDelete._id };
  try {
    await matchListDb.update(idOnlyBody, { $set: { valid: false } });
    invalidateCacheForDivision(matchToDelete.division);
    const responseBody = {
      didSucceed: true,
      errorMessage: ""
    };
    logResponse("Delete match", responseBody);
    res.send(responseBody);
  } catch (err) {
    const responseBody = {
      didSucceed: false,
      errorMessage: err
    };
    logResponse("Delete match", responseBody);
    res.send(responseBody);
   }
});

/** POST request to report penalty points */
app.post("/api/penalty", function(req, res) {
  logRequest("Report penalty", req.body);
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
        logResponse("Report penalty", responseBody);
        res.send(responseBody);
      } else {
        // If DB operation succeeded, invalidate the cache and send success
        invalidateCacheForDivision(playerDivision);

        const responseBody = {
          didSucceed: true,
          errorMessage: ""
        };
        logResponse("Report penalty", responseBody);
        res.send(responseBody);
      }
    }
  );
});

app.get(["/assets/*", "*.ico", "*.css", "*.png"], function(req, res) {
  logRequest("Get asset", req.originalUrl);
  logResponseDescription("Sending asset");
  res.sendFile(path.join(__dirname, "../../dist", req.originalUrl));
});

/** GET request for serving the frontend */
app.get("*", function(req, res) {
  logRequest("Get frontend", req.body);
  logResponseDescription("Sending frontend");
  res.sendFile(path.join(__dirname, "../../dist", "index.html"));
});

/*
------------------------
Start script
------------------------
*/
async function initialSetup() {
  log("Server is running");
  invalidateCacheForAllDivisions();
  const succeeded = await refreshCachedStandings();
  if (succeeded) {
    log("Refreshed standings locally!");
  } else {
    log("!!!! Sev 0 - Data already corrupted on startup");
  }
}

initialSetup();

app.listen(process.env.PORT || 8080);
