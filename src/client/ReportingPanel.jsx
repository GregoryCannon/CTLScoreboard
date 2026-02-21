import React, { Component } from "react";
import "./ReportingPanel.css";
import moment from "moment";
import { divisionData } from "../server/config_data";
import { getApiUrl } from "./util";

class ReportingPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      statusText: "",
      statusTextIsError: false,
      reportingDivision: divisionData[0].divisionName,
      winnerHome: "",
      matchDate: moment
        .utc()
        .toISOString()
        .slice(0, 16),
      animationStart: moment()
    };
    this.divisionInput = React.createRef();
    this.winnerNameInput = React.createRef();
    this.loserNameInput = React.createRef();
    this.loserGamesInput = React.createRef();
    this.winnerGamesInput = React.createRef();
    this.vodUrlInput = React.createRef();
    this.datePickerInput = React.createRef();

    this.changeReportingDivision = this.changeReportingDivision.bind(this);
    this.submitClicked = this.submitClicked.bind(this);
  }

  // componentDidMount() {
  //   setInterval(() => {
  //     const animationClassSet =
  //       this.datePickerInput?.current?.className === "highlighted";
  //     const animationTimePassed =
  //       moment().diff(this.state.animationStart) > 500;
  //     if (animationClassSet && animationTimePassed) {
  //       this.datePickerInput.current.className = "";
  //     }
  //   }, 1000);
  // }

  changeReportingDivision(event) {
    this.setState({
      ...this.state,
      reportingDivision: event.target.value,
      winnerName: "",
      loserName: "",
      loserGameCount: "",
      winnerGameCount: this.getGamesToWin(event.target.value)
    });
  }

  changeWinnerHome(winnerHome) {
    this.setState({
      winnerHome: winnerHome
    });
  }

  changeDate(date) {
    this.setState({
      matchDate: date
    });
  }

  setDateToNow() {
    this.setState({
      ...this.state,
      matchDate: moment
        .utc()
        .toISOString()
        .slice(0, 16),
      animationStart: moment()
    });
    this.datePickerInput.current.className = "highlighted";
    setTimeout(() => { this.datePickerInput.current.className = "" }, 500);
  }

  getPlayerList() {
    if (this.state.reportingDivision === "") {
      return [];
    }
    const filteredDivisions = divisionData.filter(
      div => div.divisionName === this.state.reportingDivision
    );
    if (filteredDivisions.length !== 1) {
      return [];
    }
    return filteredDivisions[0].players;
  }

  getGamesToWin(reportingDivision) {
    if (this.state.reportingDivision === "") return 0;

    const division = divisionData.find(
      div => div.divisionName === reportingDivision
    );
    if (division === undefined) return 0;

    console.log(division);
    const isDivBo7 = division.bestOf !== undefined && division.bestOf === 7;
    return isDivBo7 ? 4 : 3;
  }

  // Check the form and return either 'valid' or the error to be displayed
  validateFormData(formData) {
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
    if (formData.winner_home === "") {
      return "Select which player was home for this match";
    }
    if (formData.vod_url === "") {
      return "Enter the VOD url";
    }
    if (!formData.restreamer) {
      return "Failed to get Discord identity of restreamer.";
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
    request.open("POST", getApiUrl("api/match-data"), true);
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
      match_date: moment.utc(this.state.matchDate).unix(),
      report_date: moment().unix(),
      restreamer: this.props.discordIdentity.split("#")[0],
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
    const playerNameList = this.getPlayerList();

    // If not logged in
    if (!this.props.discordIdentity) {
      return (
        <div>
          <div className="Report-matches-title">Report a Match</div>
          <div className="Error-message">
            <a href={getApiUrl("discord-api/login")}>Login with Discord</a>{" "}
            to report a match!
          </div>
        </div>
      );
    }

    // If logged in but not a restreamer
    else if (!this.props.isRestreamer) {
      return (
        <div>
          <div className="Report-matches-title">Report a Match</div>
          <div className="Error-message">
            You do not have the 'Restreamer' role. Contact CTL admins to gain
            restreamer access.
          </div>
        </div>
      );
    }

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
              {divisionData
                .filter(division => !division.completed)
                .map((division) => {
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
                    defaultValue={this.getGamesToWin()}
                    value={this.state.winnerGameCount}
                    ref={this.winnerGamesInput}
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
                        onChange={e => this.changeDate(e.target.value)}
                        value={this.state.matchDate}
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
          <button onClick={() => this.setDateToNow()} id="now-button">
            Now!
          </button>
          <button onClick={this.submitClicked} id="submit-button">
            Submit
          </button>
        </div>
      </div>
    );
  }
}

export default ReportingPanel;
