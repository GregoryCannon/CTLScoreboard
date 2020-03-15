import React, { Component } from "react";
import ResultsPage from "./ResultsPage";
import FixturesPage from "./FixturesPage";
import StandingsPage from "./StandingsPage";
import logo from "./logo.svg";
import "./App.css";
import html2canvas from "html2canvas";
const moment = require("moment");
const util = require("../server/util.js");

class App extends Component {
  constructor() {
    super();
    this.state = {
      isFetchingStandings: false,
      isFetchingMatches: false,
      isAdmin: false,
      divisionData: util.memeDivisionData,
      matchData: util.sampleMatchData,
      showAdminPasswordForm: false,
      currentTypedAdminPassword: "",
      currentPage: "standings",
      sortByPoints: false
    };
    this.refreshData = this.refreshData.bind(this);
    this.authenticateAdmin = this.authenticateAdmin.bind(this);
    this.toggleAdminPasswordForm = this.toggleAdminPasswordForm.bind(this);
  }

  authenticateAdmin() {
    var request = new XMLHttpRequest();
    request.open("POST", util.getApiUrl("authenticate"), true);
    request.setRequestHeader("Content-type", "application/json");

    // Callback for result
    request.onload = function() {
      const response = JSON.parse(request.response);
      if (response.didSucceed) {
        this.setState({ ...this.state, isAdmin: true });
      } else {
        alert("Incorrect admin password");
      }
    }.bind(this);

    request.send(
      JSON.stringify({ password: this.state.currentTypedAdminPassword })
    );
  }

  toggleAdminPasswordForm() {
    this.setState({
      ...this.state,
      showAdminPasswordForm: !this.state.showAdminPasswordForm
    });
  }

  saveImage() {
    html2canvas(document.querySelector("#Page-1")).then(function(canvas) {
      const fileName =
        "CTL Standings part 1" +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });

    html2canvas(document.querySelector("#Page-2")).then(function(canvas) {
      const fileName =
        "CTL Standings part 2" +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });
  }

  fetchStandings() {
    this.setState({ ...this.state, isFetchingStandings: true });

    var request = new XMLHttpRequest();
    request.open("GET", util.getApiUrl("standings"), true);

    // Callback for result
    request.onload = function() {
      var newDivisionData = JSON.parse(request.response);
      this.setState({
        ...this.state,
        divisionData: newDivisionData,
        isFetchingStandings: false
      });
    }.bind(this);

    request.send();
  }

  fetchMatches() {
    var request = new XMLHttpRequest();
    request.open("GET", util.getApiUrl("match-data"), true);

    // Callback for result
    request.onload = function() {
      var newMatchData = JSON.parse(request.response);
      this.setState({
        ...this.state,
        matchData: newMatchData,
        isFetchingMatches: false
      });
    }.bind(this);

    request.send();
  }

  refreshData() {
    this.fetchMatches();
    this.fetchStandings();
  }

  componentDidMount() {
    this.refreshData();
  }

  render() {
    return (
      <div className="App">
        <div
          className="Loading-display"
          style={{
            visibility:
              this.state.isFetchingStandings || this.state.isFetchingMatches
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
            <button
              className="Admin-login-button"
              disabled={this.state.isAdmin}
              onClick={this.toggleAdminPasswordForm}
            >
              {this.state.isAdmin ? "You're now an admin!" : "Admin login"}
            </button>
            <div
              className="Password-entry-form"
              style={{
                visibility:
                  this.state.showAdminPasswordForm && !this.state.isAdmin
                    ? "visible"
                    : "hidden"
              }}
            >
              Enter the admin password
              <br />
              <input
                name="myPass"
                id="myPass"
                type="password"
                onChange={() => {
                  this.setState({
                    currentTypedAdminPassword: event.target.value
                  });
                }}
              />
              <br />
              <button onClick={this.authenticateAdmin}>Submit</button>
            </div>
            <button onClick={this.saveImage}>Export Standings to Image</button>
          </div>

          <h1>CTL Standings</h1>

          <div className="Content-nav">
            <button
              disabled={this.state.currentPage == "standings"}
              onClick={() => {
                this.setState({
                  currentPage: "standings"
                });
                console.log("standings", this.state);
              }}
            >
              Standings
            </button>

            <button
              disabled={this.state.currentPage == "results"}
              onClick={() => {
                this.setState({
                  currentPage: "results"
                });
                console.log("results", this.state);
              }}
            >
              Results
            </button>

            <button
              disabled={this.state.currentPage == "fixtures"}
              onClick={() => {
                this.setState({
                  currentPage: "fixtures"
                });
                console.log("fixtures", this.state);
              }}
            >
              Fixtures
            </button>
          </div>
        </div>

        {this.state.currentPage == "standings" ? (
          <StandingsPage
            divisionData={this.state.divisionData}
            matchData={this.state.matchData}
            sortByPoints={this.state.sortByPoints}
            isAdmin={this.state.isAdmin}
          />
        ) : (
          <div />
        )}

        {this.state.currentPage == "results" ? (
          <ResultsPage matches={this.state.matchData} />
        ) : (
          <div />
        )}

        {this.state.currentPage == "fixtures" ? (
          <FixturesPage
            divisionData={this.state.divisionData}
            matchData={this.state.matchData}
          />
        ) : (
          <div />
        )}

        <div className="Attribution-text">
          Website developed by Greg Cannon. Source code available on{" "}
          <a href="https://github.com/GregoryCannon/CTLScoreboard">Github</a>.
        </div>
      </div>
    );
  }
}

export default App;
