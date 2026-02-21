import React, { Component, useState, useEffect } from "react";
import moment from "moment";
import ResultsPage from "./ResultsPage.jsx";
import StandingsPage from "./StandingsPage.jsx";
import logo from "./logo.svg";
import "./App.css";
import html2canvas from "html2canvas";
import {
  Link,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { 
  SortBy,
  memeDivisionData,
  sampleMatchData,
  downloadCanvasAsPng,
} from "../server/util";
import {
  makeHttpRequest,
  getApiUrl
} from "./util";
import Cookies from "js-cookie";

function App() {
  const [isFetchingStandings, setIsFetchingStandings] = useState(false);
  const [isFetchingMatches, setIsFetchingMatches] = useState(false);
  const [isEditingPenaltyPoints, setIsEditingPenaltyPoints] = useState(false);
  const [divisionData, setDivisionData] = useState(memeDivisionData);
  const [matchList, setMatchList] = useState(sampleMatchData);
  const [sortBy, setSortBy] = useState(SortBy.simulation);
  const [discordIdentity, setDiscordIdentity] = useState("");
  const [privilegeLevel, setPrivilegeLevel] = useState("");

  useEffect(() => {
    logInToDiscordFromCookies()
      .then(discordInfo => { 
        updateSortByState(discordInfo);
      });
    refreshData();
  }, []);

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

  function updateSortByState(discordInfo) {
    // Get "sort by" state from cookies
    let sortBy = Cookies.get("sortBy");
    if (sortBy === undefined) {
      // Sort by % chance by default, unless you're moo (he likes sorting by points)
      sortBy =
        discordInfo.discordIdentity == "moodeuce#8573" ||
        discordInfo.discordIdentity == "GregBoomCannon#4087"
          ? SortBy.points
          : SortBy.simulation;
    }
    setSortBy(sortBy);
    setDiscordIdentity(discordInfo.discordIdentity);
    setPrivilegeLevel(discordInfo.privilegeLevel);
  }

  function logOutOfDiscord() {
    Cookies.remove("discordIdentity");
    Cookies.remove("discordIdentitySignature");
    Cookies.remove("sortBy");
    window.location.reload(false);
  }

  function toggleEditPenaltyPoints() {
    setIsEditingPenaltyPoints(!isEditingPenaltyPoints);
  }

  function saveImage() {
    // Note: page size is determined in StandingsPage.js, getPages()
    html2canvas(document.querySelector("#Page-1")).then(function(canvas) {
      const fileName =
        "CTL Standings part 1 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-2")).then(function(canvas) {
      const fileName =
        "CTL Standings part 2 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-3")).then(function(canvas) {
      const fileName =
        "CTL Standings part 3 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-4")).then(function(canvas) {
      const fileName =
        "CTL Standings part 4 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-5")).then(function(canvas) {
      const fileName =
        "CTL Standings part 5 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-6")).then(function(canvas) {
      const fileName =
        "CTL Standings part 6 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-7")).then(function(canvas) {
      const fileName =
        "CTL Standings part 7 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      downloadCanvasAsPng(canvas, fileName);
    });
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
      var newMatchList = JSON.parse(request.response);
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
              onClick={toggleEditPenaltyPoints}
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
            exact path="/"
            element={<Navigate replace to="/standings" />}
          />

          <Route
            path="/standings"
            element={
              <StandingsPage
                divisionData={divisionData}
                matchList={matchList}
                sortBy={sortBy}
                setSortBy={val => {
                  setSortBy(val);
                  Cookies.set("sortBy", val);
                }}
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
