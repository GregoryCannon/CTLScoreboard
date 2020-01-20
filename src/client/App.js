import React, { Component } from "react";
import Division from "./Division";
import ReportingPanel from "./ReportingPanel";
import MatchHistory from "./MatchHistory";
import logo from "./logo.svg";
import "./App.css";
const util = require("../server/util.js");

class App extends Component {
  constructor() {
    super();
    this.state = {
      isFetchingStandings: false,
      isFetchingMatches: false,
      divisionData: util.memeDivisionData,
      matchData: util.sampleMatchData
    };
    this.refreshData = this.refreshData.bind(this);
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
          <h2>Welcome to CTL</h2>
        </div>
        <div className="Content-container">
          <div className="Left-panel">
            <p className="Loading-text">
              {this.state.isFetchingStandings || this.state.isFetchingMatches
                ? "Fetching data..."
                : ""}
            </p>
            {this.state.divisionData.map((division, i) => {
              return <Division key={i} data={division} />;
            })}
          </div>
          <div className="Right-panel">
            <div className="Reporting-panel-card">
              <ReportingPanel refreshFunction={this.refreshData} />
            </div>

            <div className="Match-history-card">
              <MatchHistory
                matchList={this.state.matchData}
                refreshFunction={this.refreshData}
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
