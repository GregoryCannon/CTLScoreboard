import React, { Component } from "react";
import "./MatchHistory.css";
const moment = require("moment");

const util = require("../server/util");

class MatchHistory extends Component {
  getMatchText(match) {
    return `${match.winner} ${match.winner_home ? "(H)" : "(A)"} def. ${
      match.loser
    } ${match.winner_home ? "(A)" : "(H)"}, ${match.winner_games}-${
      match.loser_games
    }`;
  }

  getMatchDateFormatted(match) {
    if (!match.report_date) {
      return "unknown date";
    }
    const matchMoment = moment.unix(match.report_date).utc();
    return matchMoment.format("HH:MM MMM DD, YYYY");
  }

  makeDeleteRequest(idToDelete) {
    var request = new XMLHttpRequest();
    request.open("DELETE", util.getApiUrl("match-data", true));
    request.setRequestHeader("Content-type", "application/json");

    // Set callback for response
    request.onload = function() {
      console.log(request.response);
      const response = JSON.parse(request.response);
      if (response.didSucceed) {
        // Refresh data
        this.props.refreshFunction();
      } else {
        alert("Failed to delete match. Reason:\n\n" + response.errorMessage);
      }
    }.bind(this);

    // Send request with the id of the match to delete
    const requestBody = {
      _id: idToDelete
    };
    console.log("Sending request with body:", requestBody);
    request.send(JSON.stringify(requestBody));
  }

  deleteMatchClicked(matchIndex) {
    const matchData = this.props.matchList[matchIndex];
    console.log("matchdata to delete:", matchData);
    const confirmMessage = `Are you sure you want to delete this match between ${matchData.winner} and ${matchData.loser}?`;
    var result = confirm(confirmMessage);
    if (result) {
      this.makeDeleteRequest(matchData._id);
    }
  }

  render() {
    return (
      <div className="Match-history">
        <div className="Match-history-title">Match History</div>
        <div className="Scrollable-list">
          <table>
            <tbody>
              {[...this.props.matchList].reverse().map((match, i) => {
                return (
                  <tr key={this.getMatchText(match)} className="Reported-match">
                    <td className="Match-division">D{match.division}</td>
                    <td className="Match-text">
                      {this.getMatchText(match)}
                      <br />
                      <span className="Match-date">
                        {this.getMatchDateFormatted(match)}
                      </span>
                    </td>
                    <td>
                      <a
                        className="Delete-match-button"
                        onClick={() => {
                          this.deleteMatchClicked(
                            this.props.matchList.length - 1 - i
                          );
                        }}
                      >
                        <i className="fas fa-trash"></i>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default MatchHistory;
