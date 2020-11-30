import React, { Component } from "react";
import ResultsPage from "./ResultsPage";
import FixturesPage from "./FixturesPage";
import StandingsPage from "./StandingsPage";
import logo from "./logo.svg";
import "./App.css";
import html2canvas from "html2canvas";
import {
  BrowserRouter as Router,
  Link,
  Route,
  Redirect,
} from "react-router-dom";
import { SortBy } from "../server/util.js";
import Cookies from "js-cookie";

const moment = require("moment");
const util = require("../server/util.js");

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isFetchingStandings: false,
      isFetchingMatches: false,
      isEditingPenaltyPoints: false,
      divisionData: util.memeDivisionData,
      matchList: util.sampleMatchData,
      currentPage: "standings",
      sortBy: SortBy.simulation,
      discordIdentity: "",
      privilegeLevel: "",
    };

    this.logInToDiscordFromCookies().then((discordInfo) => {
      this.updateSortByState(discordInfo);
    });

    this.refreshData = this.refreshData.bind(this);
    this.toggleEditPenaltyPoints = this.toggleEditPenaltyPoints.bind(this);
  }

  componentDidMount() {
    this.refreshData();
  }

  isAdmin() {
    return this.state.privilegeLevel == "Admin";
  }

  isRestreamer() {
    return (
      this.state.privilegeLevel == "Admin" ||
      this.state.privilegeLevel == "Restreamer"
    );
  }

  async logInToDiscordFromCookies() {
    const discordIdentity = Cookies.get("discordIdentity");
    const discordIdentitySignature = Cookies.get("discordIdentitySignature");

    if (discordIdentity && discordIdentitySignature) {
      const jsonResponse = await util.makeHttpRequest(
        "POST",
        "discord-api/validate",
        {
          discordIdentity: discordIdentity,
          discordIdentitySignature: discordIdentitySignature,
        }
      );

      if (jsonResponse.valid) {
        return {
          discordIdentity: jsonResponse.discordIdentity,
          privilegeLevel: jsonResponse.privilegeLevel,
        };
      } else {
        alert("Your saved login is invalid. Please log in with Discord again.");
        this.logOutOfDiscord();
      }
    }
    return {
      discordIdentity: "",
      privilegeLevel: "",
    };
  }

  updateSortByState(discordInfo) {
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
    this.setState({
      sortBy: sortBy,
      discordIdentity: discordInfo.discordIdentity,
      privilegeLevel: discordInfo.privilegeLevel,
    });
  }

  logOutOfDiscord() {
    Cookies.remove("discordIdentity");
    Cookies.remove("discordIdentitySignature");
    Cookies.remove("sortBy");
    window.location.reload(false);
  }

  toggleEditPenaltyPoints() {
    this.setState({
      isEditingPenaltyPoints: !this.state.isEditingPenaltyPoints,
    });
  }

  saveImage() {
    // Note: page size is determined in StandingsPage.js, getPages()
    html2canvas(document.querySelector("#Page-1")).then(function(canvas) {
      const fileName =
        "CTL Standings part 1 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-2")).then(function(canvas) {
      const fileName =
        "CTL Standings part 2 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-3")).then(function(canvas) {
      const fileName =
        "CTL Standings part 3 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-4")).then(function(canvas) {
      const fileName =
        "CTL Standings part 4 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-5")).then(function(canvas) {
      const fileName =
        "CTL Standings part 5 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-6")).then(function(canvas) {
      const fileName =
        "CTL Standings part 6 " +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });
  }

  fetchStandings() {
    this.setState({ ...this.state, isFetchingStandings: true });

    var request = new XMLHttpRequest();
    request.open("GET", util.getApiUrl("api/standings"), true);

    // Callback for result
    request.onload = function() {
      var newDivisionData = JSON.parse(request.response);
      this.setState({
        ...this.state,
        divisionData: newDivisionData,
        isFetchingStandings: false,
      });
    }.bind(this);

    request.send();
  }

  fetchMatches() {
    var request = new XMLHttpRequest();
    request.open("GET", util.getApiUrl("api/match-data"), true);

    // Callback for result
    request.onload = function() {
      var newMatchList = JSON.parse(request.response);
      // Sort matches by match date
      newMatchList.sort((a, b) => b.report_date - a.report_date);
      this.setState({
        ...this.state,
        matchList: newMatchList,
        isFetchingMatches: false,
      });
    }.bind(this);

    request.send();
  }

  refreshData() {
    this.fetchMatches();
    this.fetchStandings();
  }

  render() {
    return (
      <Router>
        <div className="App">
          <div
            className="Loading-display"
            style={{
              visibility:
                this.state.isFetchingStandings || this.state.isFetchingMatches
                  ? "visible"
                  : "hidden",
            }}
          >
            <div className="Loading-background" />
            <div className="Loading-spinner" />
          </div>
          <div className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <div className="Header-nav">
              {/* Log in/out button */}
              {this.state.discordIdentity ? (
                <button className="Nav-button" onClick={this.logOutOfDiscord}>
                  Log out
                </button>
              ) : (
                <a
                  className="Nav-button"
                  href={util.getApiUrl("discord-api/login")}
                >
                  Log in with Discord
                </a>
              )}

              {/* Save standings button (admin-only) */}
              <button
                style={{ visibility: this.isAdmin() ? "visible" : "hidden" }}
                className="Nav-button"
                onClick={this.saveImage}
              >
                Export standings to images
              </button>

              {/* Assign penalty points button (admin-only) */}
              <button
                style={{ visibility: this.isAdmin() ? "visible" : "hidden" }}
                className="Nav-button"
                onClick={this.toggleEditPenaltyPoints}
              >
                {this.state.isEditingPenaltyPoints
                  ? "Finish editing penalty points"
                  : "Edit penalty points"}
              </button>
            </div>

            <div className="Discord-status-text">
              {this.state.discordIdentity ? (
                <div>
                  Logged in as {this.state.discordIdentity} (
                  {this.state.privilegeLevel})
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

              <Link className="Nav-button" to="/fixtures">
                Fixtures
              </Link>
            </div>
          </div>

          <Route exact path="/">
            <Redirect to="/standings" />
          </Route>

          <Route
            path="/standings"
            render={(props) => (
              <StandingsPage
                {...props}
                divisionData={this.state.divisionData}
                matchList={this.state.matchList}
                sortBy={this.state.sortBy}
                setSortBy={(val) => {
                  this.setState({
                    sortBy: val,
                  });
                  Cookies.set("sortBy", val);
                }}
                isAdmin={this.isAdmin()}
                isRestreamer={this.isRestreamer()}
                discordIdentity={this.state.discordIdentity}
                isEditingPenaltyPoints={this.state.isEditingPenaltyPoints}
                refreshFunction={this.refreshData}
              />
            )}
          />

          <Route
            path="/results"
            render={(props) => <ResultsPage matchList={this.state.matchList} />}
          />

          <Route
            path="/fixtures"
            render={(props) => (
              <FixturesPage
                divisionData={this.state.divisionData}
                matchList={this.state.matchList}
              />
            )}
          />

          <div className="Attribution-text">
            Website developed by Greg Cannon. Source code available on{" "}
            <a href="https://github.com/GregoryCannon/CTLScoreboard">Github</a>.
          </div>
        </div>
      </Router>
    );
  }
}

export default App;
