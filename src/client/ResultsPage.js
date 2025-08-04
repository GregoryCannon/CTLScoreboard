import React, { Component } from "react";
import "./ResultsPage.css";

const util = require("../server/util");

class ResultsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showCompetition: ""
    };
  }

  setShowCompetition(competition) {
    this.setState({
      ...this.state,
      showCompetition: competition
    });
  }

  // wobert's discord name breaks the elo reporting sheet
  dewobertifyRestreamer(restreamer) {
    return restreamer === "<just_wobert>" ? "wobert" : restreamer;
  }

  render() {
    return (
      <div className="Results-container">
        <button
          className="Nav-button"
          onClick={() => this.setShowCompetition("ctl")}
        >
          CTL
        </button>
        <button
          className="Nav-button"
          onClick={() => this.setShowCompetition("tnp")}
        >
          TNP
        </button>
        <button
          className="Nav-button"
          onClick={() => this.setShowCompetition("")}
        >
          Show all
        </button>
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
              <th>Competition</th>
            </tr>
            {this.props.matchList
              .filter(match => {
                console.log(match);
                if (this.state.showCompetition === "") return true;
                return (
                  this.state.showCompetition === util.getCompetition(match)
                );
              })
              .map(match => {
                const homePlayer = match.winner_home
                  ? match.winner
                  : match.loser;
                const awayPlayer = match.winner_home
                  ? match.loser
                  : match.winner;
                const homeScore = match.winner_home
                  ? match.winner_games
                  : match.loser_games;
                const awayScore = match.winner_home
                  ? match.loser_games
                  : match.winner_games;

                return (
                  <tr>
                    <td>{util.getMatchDateFormatted(match)}</td>
                    <td>{this.dewobertifyRestreamer(match.restreamer)}</td>
                    <td>{homePlayer}</td>
                    <td>{homeScore}</td>
                    <td>{awayScore}</td>
                    <td>{awayPlayer}</td>
                    <td>{match.division}</td>
                    <td>
                      {util.getCompetition(match) === "ctl"
                        ? "CT League"
                        : "TNP"}
                    </td>
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
