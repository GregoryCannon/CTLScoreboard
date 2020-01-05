import React, { Component } from "react";
import "./MatchHistory.css";
const util = require("../server/util");

class MatchHistory extends Component {
  getMatchText(match) {
    return `${match.winner} ${match.winner_home ? "(H)" : "(A)"} def. ${
      match.loser
    } ${match.winner_home ? "(A)" : "(H)"}, ${match.winner_games}-${
      match.loser_games
    }`;
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
        alert("Match deleted!");
      } else {
        alert("Failed to delete match. Reason:\n\n" + response.errorMessage);
      }
    };

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
          {this.props.matchList.map((match, i) => {
            return (
              <div key={i} className="Reported-match">
                <span className="Match-division">D{match.division}</span>
                <span className="Match-text">{this.getMatchText(match)}</span>
                <a
                  className="Delete-match-button"
                  onClick={() => {
                    this.deleteMatchClicked(i);
                  }}
                >
                  <i className="fas fa-trash"></i>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default MatchHistory;
