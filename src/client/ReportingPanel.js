import React, { Component } from "react";
import "./ReportingPanel.css";
const moment = require("moment");
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
      winnerHome: ""
    };
    this.divisionInput = React.createRef();
    this.winnerNameInput = React.createRef();
    this.loserNameInput = React.createRef();
    this.loserGamesInput = React.createRef();
    this.winnerGamesInput = React.createRef();
    this.winnerHomeInput = React.createRef();
    this.loserHomeInput = React.createRef();
    this.vodUrlInput = React.createRef();
    this.restreamerInput = React.createRef();
    this.datePickerInput = React.createRef();

    this.changeReportingDivision = this.changeReportingDivision.bind(this);
    this.submitClicked = this.submitClicked.bind(this);
    this.changeWinnerHome = this.changeWinnerHome.bind(this);
  }

  changeReportingDivision(event) {
    this.setState({
      reportingDivision: event.target.value,
      winnerName: "",
      loserName: "",
      loserGameCount: "",
      winnerGameCount: GAMES_TO_WIN,
      winnerHome: ""
    });
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

  changeWinnerHome(isHome) {
    this.setState({ winnerHome: isHome });
  }

  // Check the form and return either 'valid' or the error to be displayed
  validateFormData(formData) {
    console.log(formData);
    // Missing info
    if (!formData.division) {
      return "Select a division for the match";
    }
    if (formData.winner === "") {
      return "Select the match winner";
    }
    if (formData.loser === "") {
      return "Select the match loser";
    }
    if (!Number.isInteger(formData.loser_games)) {
      return "Enter the game count of the match loser";
    }
    if (formData.winner_games !== GAMES_TO_WIN) {
      return "The winner should have won 3 games.";
    }
    if (formData.winner_home === "") {
      return "Select which player was home for this match";
    }

    // Invalid info
    if (formData.winner === formData.loser) {
      return "Invalid match: a player cannot face themselves.";
    }
    if (formData.loser_games < 0 || formData.winner_games < 0) {
      return "Invalid match: can't have a negative number of wins";
    }
    if (formData.loser_games > formData.winner_games - 1) {
      return "Invalid match: the winner must win more games than the loser.";
    }

    // Otherwise, no issues
    return "valid";
  }

  makeSubmitRequest(formData) {
    var request = new XMLHttpRequest();

    // Open a new connection, using the POST request on the URL endpoint
    request.open("POST", util.getApiUrl("match-data"), true);
    request.setRequestHeader("Content-type", "application/json");

    // Set a callback for the result
    request.onload = function() {
      const response = JSON.parse(request.response);
      if (response.didSucceed) {
        this.setState({
          statusText: "Submitted match!",
          statusTextIsError: false
        });
        // Refresh parent
        this.props.refreshFunction();
      } else {
        this.setState({
          statusText: response.errorMessage,
          statusTextIsError: true
        });
      }
    }.bind(this);

    // Send request (formatted exactly like in DB for easy forwarding)
    request.send(JSON.stringify(formData));
  }

  submitClicked() {
    // Check for errors

    const formData = {
      division: this.divisionInput.current.value,
      winner: this.winnerNameInput.current.value,
      loser: this.loserNameInput.current.value,
      winner_games: parseInt(this.winnerGamesInput.current.value, 10),
      loser_games: parseInt(this.loserGamesInput.current.value, 10),
      winner_home: this.state.winnerHome,
      report_date: moment(this.datePickerInput.current.value).unix(),
      restreamer: this.restreamerInput.current.value,
      vod_url: this.vodUrlInput.current.value
    };

    const validationResult = this.validateFormData(formData);
    if (validationResult !== "valid") {
      this.setState({
        statusText: validationResult,
        statusTextIsError: true
      });
      return;
    }

    this.makeSubmitRequest(formData);
  }

  render() {
    const dateDefault = moment
      .utc()
      .toISOString()
      .substr(0, 16);
    console.log("Current moment ISO:", dateDefault);
    const playerNameList = this.getPlayerList();
    return (
      <div>
        <div className="Report-matches-title">Report a Match</div>

        <div className="Report-matches-form">
          <div className="Select-reporting-division">
            Division{" "}
            <select
              className="Division-Input"
              ref={this.divisionInput}
              onChange={this.changeReportingDivision}
            >
              {configData.divisionData.map((division, i) => {
                return (
                  <option key={division.divisionName}>
                    {division.divisionName}
                  </option>
                );
              })}
            </select>
          </div>

          {this.state.reportingDivision !== "" ? (
            <div>
              <div className="Match-reporting-container">
                {/* Winner panel */}
                <div className="Match-reporting-subpanel">
                  <select
                    id="winner-name"
                    defaultValue=""
                    ref={this.winnerNameInput}
                  >
                    <option value="" selected disabled>
                      (winner)
                    </option>
                    {playerNameList.map(playerName => {
                      return <option key={playerName}>{playerName}</option>;
                    })}
                  </select>
                  <input
                    id="winner-game-count"
                    className="Win-count-input"
                    type="number"
                    defaultValue={GAMES_TO_WIN}
                    ref={this.winnerGamesInput}
                  ></input>
                  <div>
                    <label htmlFor="winner-home">Home</label>
                    <input
                      id="winner-home"
                      type="radio"
                      name="home-away"
                      ref={this.winnerHomeInput}
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
                    ref={this.loserNameInput}
                  >
                    <option value="" selected disabled>
                      (loser)
                    </option>
                    {playerNameList.map((playerName, i) => {
                      return <option key={playerName}>{playerName}</option>;
                    })}
                  </select>
                  <input
                    id="loser-game-count"
                    className="Win-count-input"
                    type="number"
                    ref={this.loserGamesInput}
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

              <table className="Text-input-table">
                <tbody>
                  <tr>
                    <td>Match Date (UTC)</td>
                    <td>
                      <input
                        type="datetime-local"
                        defaultValue={dateDefault}
                        ref={this.datePickerInput}
                      />
                    </td>
                  </tr>

                  <tr>
                    <td>VOD</td>
                    <td>
                      <input
                        type="text"
                        placeholder="Twitch URL"
                        ref={this.vodUrlInput}
                      />
                    </td>
                  </tr>

                  <tr>
                    <td>Restreamer</td>
                    <td>
                      <input
                        type="text"
                        placeholder="Twitch username"
                        ref={this.restreamerInput}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p>Select a division above to report a match!</p>
          )}

          <p
            className={
              this.state.statusTextIsError ? "Error-text" : "Status-text"
            }
          >
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
