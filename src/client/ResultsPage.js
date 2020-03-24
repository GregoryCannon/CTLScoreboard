import React, { Component } from "react";
import "./ResultsPage.css";

const util = require("../server/util");

class ResultsPage extends Component {
  render() {
    return (
      <div className="Results-container">
        <table className="Results-table">
          <tbody>
            <tr className="Results-header">
              <th>Match Time (UTC)</th>
              <th>Restreamer</th>
              <th>Home</th>
              <th>Home Score</th>
              <th>Away Score</th>
              <th>Away</th>
              <th>Division</th>
            </tr>
            {this.props.matchList.map(match => {
              const homePlayer = match.winner_home ? match.winner : match.loser;
              const awayPlayer = match.winner_home ? match.loser : match.winner;
              const homeScore = match.winner_home
                ? match.winner_games
                : match.loser_games;
              const awayScore = match.winner_home
                ? match.loser_games
                : match.winner_games;

              return (
                <tr>
                  <td>{util.getMatchDateFormatted(match)}</td>
                  <td>{match.restreamer}</td>
                  <td>{homePlayer}</td>
                  <td>{homeScore}</td>
                  <td>{awayScore}</td>
                  <td>{awayPlayer}</td>
                  <td>{match.division}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default ResultsPage;
