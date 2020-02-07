import React, { Component } from "react";
import Division from "./Division";
import ReportingPanel from "./ReportingPanel";
import MatchHistory from "./MatchHistory";
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
      currentTypedAdminPassword: ""
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
      console.log("Received data:", request.response);
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
      console.log("Received data:", request.response);
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
          <h2>Welcome to CTL</h2>
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
        </div>
        <div className="Content-container">
          <div className="Left-panel">
            <div id="Page-1">
              {this.state.divisionData.slice(0, 4).map((division, i) => {
                return <Division key={i} data={division} />;
              })}
            </div>
            <div id="Page-2">
              {this.state.divisionData.slice(4).map((division, i) => {
                return <Division key={i} data={division} />;
              })}
            </div>
          </div>
          <div className="Right-panel">
            <div className="Reporting-panel-card">
              <ReportingPanel refreshFunction={this.refreshData} />
            </div>

            <div className="Match-history-card">
              <MatchHistory
                matchList={this.state.matchData}
                refreshFunction={this.refreshData}
                isAdmin={this.state.isAdmin}
              />
            </div>
          </div>
        </div>

        <div className="Attribution-text">
          Website developed by Greg Cannon. Source code available on{" "}
          <a href="https://github.com/GregoryCannon/CTLScoreboard">Github</a>.
        </div>
      </div>
    );
  }
}

export default App;
