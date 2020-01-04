import React, { Component } from "react";
import "./MatchHistory.css";

class MatchHistory extends Component {
  getMatchText(match) {
    return `${match.winner} ${match.winner_home ? "(H)" : "(A)"} def. ${
      match.loser
    } ${match.winner_home ? "(A)" : "(H)"}, ${match.winner_games}-${
      match.loser_games
    }`;
  }

  render() {
    return (
      <div className="Match-history">
        <div className="Match-history-title">Match History</div>
        <div className="Scrollable-list">
          {this.props.matchList.map((match, i) => {
            return (
              <div key={i} className="Reported-match">
                <span>{this.getMatchText(match)}</span>
                <span className="Trash-can">Delete</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default MatchHistory;
