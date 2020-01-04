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
      isFetching: false,
      divisionData: util.memeDivisionData
    };
  }

  fetchData() {
    this.setState({ ...this.state, isFetching: true });

    // make api call
    var request = new XMLHttpRequest();

    // Open a new connection, using the GET request on the URL endpoint
    request.open("GET", "http://localhost:8080/match-data", true);

    request.onload = function() {
      // Begin accessing JSON data here
      var newDivisionData = JSON.parse(request.response);
      this.setState({
        ...this.state,
        divisionData: newDivisionData,
        isFetching: false
      });
    }.bind(this);

    // Send request
    request.send();
  }

  componentDidMount() {
    this.fetchData();
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to CTL</h2>
        </div>
        <div className="Content-container">
          <div className="Left-panel">
            <p className="Loading-text">
              {this.state.isFetching ? "Fetching data..." : ""}
            </p>
            {this.state.divisionData.map((division, i) => {
              return <Division key={i} data={division} />;
            })}
          </div>
          <div className="Right-panel">
            <div className="Reporting-panel-card">
              <ReportingPanel />
            </div>

            <div className="Match-history-card">
              <MatchHistory matchList={util.sampleMatchData} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
