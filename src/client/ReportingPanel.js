import React, { Component } from "react";
import "./ReportingPanel.css";
const configData = require("../server/config_data");
const util = require("../server/util");
const GAMES_TO_WIN = 3;

class ReportingPanel extends Component {
  constructor() {
    super();
    this.state = {
      statusText: "",
      statusTextIsError: false,
      reportingDivision: configData.divisionData[0].divisionName,
      winnerName: "",
      loserName: "",
      loserGameCount: "",
      winnerGameCount: GAMES_TO_WIN,
      winnerHome: ""
    };
    this.changeReportingDivision = this.changeReportingDivision.bind(this);
    this.changeWinner = this.changeWinner.bind(this);
    this.changeLoser = this.changeLoser.bind(this);
    this.changeLoserGameCount = this.changeLoserGameCount.bind(this);
    this.changeWinnerGameCount = this.changeWinnerGameCount.bind(this);
    this.submitClicked = this.submitClicked.bind(this);
    this.changeWinnerHome = this.changeWinnerHome.bind(this);
  }

  changeReportingDivision(event) {
    this.setState({ ...this.state, reportingDivision: event.target.value });
  }

  getPlayerList() {
    if (this.state.reportingDivision === "") {
      return [];
    }
    const filteredDivisions = configData.divisionData.filter(
      div => div.divisionName === this.state.reportingDivision
    );
    if (filteredDivisions.length !== 1) {
      return [];
    }
    return filteredDivisions[0].players;
  }

  changeWinner(event) {
    this.setState({ ...this.state, winnerName: event.target.value });
  }

  changeLoser(event) {
    this.setState({ ...this.state, loserName: event.target.value });
  }

  changeLoserGameCount(event) {
    this.setState({
      ...this.state,
      loserGameCount: parseInt(event.target.value, 10)
    });
  }

  changeWinnerGameCount(event) {
    this.setState({
      ...this.state,
      winnerGameCount: parseInt(event.target.value, 10)
    });
  }

  changeWinnerHome(isHome) {
    this.setState({ ...this.state, winnerHome: isHome });
  }

  // Check the form and return either 'valid' or the error to be displayed
  validateForm() {
    // Missing info
    if (!this.state.reportingDivision) {
      return "Select a division for the match";
    }
    if (this.state.winnerName === "") {
      return "Select the match winner";
    }
    if (this.state.loserName === "") {
      return "Select the match loser";
    }
    if (this.state.loserGameCount === "") {
      return "Enter the game count of the match loser";
    }
    if (this.state.winnerGameCount !== GAMES_TO_WIN) {
      return "Enter the game count of match winner";
    }
    if (this.state.winnerHome === "") {
      return "Select which player was home for this match";
    }

    // Invalid info
    if (this.state.winnerName === this.state.loserName) {
      return "Invalid match — A player cannot face themselves.";
    }
    if (this.state.loserGameCount < 0 || this.state.winnerGameCount < 0) {
      return "Invalid match — Can't have a negative number of wins";
    }
    if (this.state.loserGameCount > this.state.winnerGameCount - 1) {
      return "Invalid match — The loser has more game wins than the winner.";
    }

    // Otherwise, no issues
    return "valid";
  }

  makeSubmitRequest() {
    var request = new XMLHttpRequest();

    // Open a new connection, using the POST request on the URL endpoint
    request.open("POST", util.getApiUrl("match-data"), true);
    request.setRequestHeader("Content-type", "application/json");

    // Set a callback for the result
    request.onload = function() {
      console.log("Received response from server:\n", request.response);
      const response = JSON.parse(request.response);
      if (response.didSucceed) {
        this.setState({
          ...this.state,
          statusText: "Submitted match!",
          statusTextIsError: false
        });
      } else {
        this.setState({
          ...this.state,
          statusText: response.errorMessage,
          statusTextIsError: true
        });
      }
    }.bind(this);

    // Send request (formatted exactly like in DB for easy forwarding)
    const requestBody = {
      division: this.state.reportingDivision,
      winner: this.state.winnerName,
      loser: this.state.loserName,
      winner_games: this.state.winnerGameCount,
      loser_games: this.state.loserGameCount,
      winner_home: this.state.winnerHome
    };
    request.send(JSON.stringify(requestBody));
  }

  submitClicked() {
    // Check for errors
    const validationResult = this.validateForm();
    if (validationResult !== "valid") {
      this.setState({
        ...this.state,
        statusText: validationResult,
        statusTextIsError: true
      });
      return;
    }

    this.makeSubmitRequest();
  }

  render() {
    const playerNameList = this.getPlayerList();
    return (
      <div>
        <div className="Report-matches-title">Report a Match</div>

        <div className="Report-matches-form">
          <div className="Select-reporting-division">
            Division{" "}
            <select
              className="Division-picker"
              onChange={this.changeReportingDivision}
            >
              {configData.divisionData.map((division, i) => {
                return <option key={i}>{division.divisionName}</option>;
              })}
            </select>
          </div>

          {this.state.reportingDivision !== "" ? (
            <div className="Match-reporting-container">
              {/* Winner panel */}
              <div className="Match-reporting-subpanel">
                <select
                  id="winner-name"
                  defaultValue=""
                  onChange={this.changeWinner}
                >
                  <option value="" disabled>
                    (winner)
                  </option>
                  {playerNameList.map((playerName, i) => {
                    return <option key={i}>{playerName}</option>;
                  })}
                </select>
                <input
                  id="winner-game-count"
                  className="Win-count-input"
                  type="number"
                  defaultValue={GAMES_TO_WIN}
                  onChange={this.changeWinnerGameCount}
                ></input>
                <div>
                  <label htmlFor="winner-home">Home</label>
                  <input
                    id="winner-home"
                    type="radio"
                    name="home-away"
                    onChange={e => {
                      this.changeWinnerHome(event.target.value === "on");
                    }}
                  ></input>
                </div>
              </div>

              <div className="Defeated-text">defeated</div>

              {/* Loser panel */}

              <div className="Match-reporting-subpanel">
                <select
                  id="loser-name"
                  defaultValue=""
                  onChange={this.changeLoser}
                >
                  <option value="" disabled>
                    (loser)
                  </option>
                  {playerNameList.map((playerName, i) => {
                    return <option key={i}>{playerName}</option>;
                  })}
                </select>
                <input
                  id="loser-game-count"
                  className="Win-count-input"
                  type="number"
                  onChange={this.changeLoserGameCount}
                ></input>

                <div>
                  <label htmlFor="loser-home">Home</label>
                  <input
                    id="loser-home"
                    type="radio"
                    name="home-away"
                    onChange={e => {
                      this.changeWinnerHome(event.target.value === "off");
                    }}
                  ></input>
                </div>
              </div>
            </div>
          ) : (
            <p>Select a divison above to report a match!</p>
          )}

          <p className="{this.state.statusTextIsError ? Error-text : Status-text}">
            {this.state.statusText}
          </p>
          <button onClick={this.submitClicked} id="submit-button">
            Submit
          </button>
        </div>
      </div>
    );
  }
}

export default ReportingPanel;
