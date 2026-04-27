import React, { Component, useState, useEffect } from "react";
import {
  Link,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import moment from "moment";
import html2canvas from "html2canvas";
import Cookies from "js-cookie";

import ResultsPage from "./ResultsPage.tsx";
import StandingsPage from "./StandingsPage.tsx";
import logo from "./logo.svg";
import { 
  downloadCanvasAsPng,
  compareRaw,
  compareSimulated
} from "../server/util.ts";
import {
  type DivisionWithChances,
  type Match,
  type SortBy
} from "../types.ts";
import {
  makeHttpRequest,
  getApiUrl
} from "./util.ts";

import "./App.css";

type DiscordInfo = {
  discordIdentity: string;
  privilegeLevel: string
}

function App() {
  const [isFetchingStandings, setIsFetchingStandings] = useState(false);
  const [isFetchingMatches, setIsFetchingMatches] = useState(false);
  const [isEditingPenaltyPoints, setIsEditingPenaltyPoints] = useState(false);
  const [divisionData, setDivisionData] = useState([] as DivisionWithChances[]);
  const [matchList, setMatchList] = useState([] as Match[]);
  const [sortBy, setSortBy] = useState("simulation" as SortBy);
  const [discordIdentity, setDiscordIdentity] = useState("");
  const [privilegeLevel, setPrivilegeLevel] = useState("");

  useEffect(() => {
    console.log("Logging into Discord from cookies");
    logInToDiscordFromCookies()
      .then(discordInfo => { 
        setDiscordIdentity(discordInfo.discordIdentity);
        setPrivilegeLevel(discordInfo.privilegeLevel);
      });
    let sortBy = (Cookies.get("sortBy") || "simulation") as SortBy;
    updatePlayerSorting(sortBy);
    refreshData();
  }, []);

  function updatePlayerSorting(sortBy: SortBy): void {
    setSortBy(sortBy);
    Cookies.set("sortBy", sortBy);
    const comparisonFunction = (sortBy === "Simulation") ? compareSimulated : compareRaw;
    setDivisionData(divisionData.map(d => ({ 
      ...d, 
      standings: d.standings.sort(comparisonFunction)
    })));
  }

  function isAdmin() {
    return privilegeLevel == "Admin";
  }

  function isRestreamer() {
    return (
      privilegeLevel == "Admin" ||
      privilegeLevel == "Restreamer"
    );
  }

  async function logInToDiscordFromCookies() {
    const discordIdentity = Cookies.get("discordIdentity");
    const discordIdentitySignature = Cookies.get("discordIdentitySignature");

    if (discordIdentity && discordIdentitySignature) {
      const jsonResponse = await makeHttpRequest(
        "POST",
        "discord-api/validate",
        {
          discordIdentity: discordIdentity,
          discordIdentitySignature: discordIdentitySignature
        }
      );

      if (jsonResponse.valid) {
        return {
          discordIdentity: jsonResponse.discordIdentity,
          privilegeLevel: jsonResponse.privilegeLevel
        };
      } else {
        alert("Your saved login is invalid. Please log in with Discord again.");
        logOutOfDiscord();
      }
    }
    return {
      discordIdentity: "",
      privilegeLevel: ""
    };
  }

  function logOutOfDiscord() {
    Cookies.remove("discordIdentity");
    Cookies.remove("discordIdentitySignature");
    Cookies.remove("sortBy");
    window.location.reload();
  }

  function saveImage() {
    // Note: page size is determined in StandingsPage.js, getPages()
    // This only does the first seven pages -- could use a rethink
    for (let i = 1; i < 8; i++) {
      console.log(`page ${i}`)
      html2canvas(document.querySelector(`#Page-${i}`) as HTMLElement).then(function(canvas) {
        const fileName =
          `CTL Standings part ${i} ` +
          moment()
            .utc()
            .format("MM/DD/YYYY");
        downloadCanvasAsPng(canvas, fileName);
      });
    }
  }

  function fetchStandings() {
    setIsFetchingStandings(true);

    var request = new XMLHttpRequest();
    request.open("GET", getApiUrl("api/standings"), true);

    // Callback for result
    request.onload = () => {
      var newDivisionData = JSON.parse(request.response);
      setDivisionData(newDivisionData);
      setIsFetchingStandings(false);
    };

    request.send();
  }

  function fetchMatches() {
    var request = new XMLHttpRequest();
    request.open("GET", getApiUrl("api/match-data"), true);

    // Callback for result
    request.onload = () => {
      var newMatchList = JSON.parse(request.response) as Match[];
      // Sort matches by match date
      newMatchList.sort((a, b) => b.report_date - a.report_date);
      setMatchList(newMatchList);
      setIsFetchingMatches(false);
    };

    request.send();
  }

  function refreshData() {
    fetchMatches();
    fetchStandings();
  }

    return (
      <div className="App">
        <div
          className="Loading-display"
          style={{
            visibility:
              isFetchingStandings || isFetchingMatches
                ? "visible"
                : "hidden"
          }}
        >
          <div className="Loading-background" />
          <div className="Loading-spinner" />
        </div>
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <div className="Header-nav">
            {/* Log in/out button */}
            {discordIdentity ? (
              <button className="Nav-button" onClick={logOutOfDiscord}>
                Log out
              </button>
            ) : (
              <a
                className="Nav-button"
                href={getApiUrl("discord-api/login")}
              >
                Log in with Discord
              </a>
            )}

            {/* Save standings button (admin-only) */}
            <button
              style={{ visibility: isAdmin() ? "visible" : "hidden" }}
              className="Nav-button"
              onClick={saveImage}
            >
              Export standings to images
            </button>

            {/* Assign penalty points button (admin-only) */}
            <button
              style={{ visibility: isAdmin() ? "visible" : "hidden" }}
              className="Nav-button"
              onClick={() => setIsEditingPenaltyPoints(!isEditingPenaltyPoints)}
            >
              {isEditingPenaltyPoints
                ? "Finish editing penalty points"
                : "Edit penalty points"}
            </button>
          </div>

          <div className="Discord-status-text">
            {discordIdentity ? (
              <div>
                Logged in as {discordIdentity} (
                {privilegeLevel})
              </div>
            ) : (
              ""
            )}
          </div>

          <h1>CTL Standings</h1>

          <div className="Content-nav">
            <Link className="Nav-button" to="/standings">
              Standings
            </Link>

            <Link className="Nav-button" to="/results">
              Results
            </Link>
          </div>
        </div>

        <Routes>
          <Route 
            path="/"
            element={<Navigate replace to="/standings" />}
          />

          <Route
            path="/standings"
            element={
              <StandingsPage
                divisionData={divisionData}
                matchList={matchList}
                sortBy={sortBy}
                setSortBy={updatePlayerSorting}
                isAdmin={isAdmin()}
                isRestreamer={isRestreamer()}
                discordIdentity={discordIdentity}
                isEditingPenaltyPoints={isEditingPenaltyPoints}
                refreshFunction={refreshData}
              />
            }
          />

          <Route
            path="/results"
            element={
              <ResultsPage
                matchList={matchList}
                divisionData={divisionData}
              />
            }
          />
        </Routes>

        <div className="Attribution-text">
          Website developed by Greg Cannon. Source code available on{" "}
          <a href="https://github.com/GregoryCannon/CTLScoreboard">Github</a>.
        </div>
      </div>
    );
  }

export default App;
