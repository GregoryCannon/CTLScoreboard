import React, { Component } from "react";
import "./ResultsPage.css";

const util = require("../server/util");

class ResultsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showCompetition: ""
    }
  }

  setShowCompetition(competition) {
    this.setState({
      ...this.state,
      showCompetition: competition
    });
  }

  getCompetition(match) {
    console.log(match.division);
    const div = this.props.divisionData.find(
      div => div.divisionName === match.division
    );

    if (!div) return null;

    return div.competition;
  }

  render() {
    return (
      <div className="Results-container">
        <button className="Nav-button" onClick={() => this.setShowCompetition("ctl")}>CTL</button>
        <button className="Nav-button" onClick={() => this.setShowCompetition("tnp")}>TNP</button>
        <button className="Nav-button" onClick={() => this.setShowCompetition("")}>Show all</button>
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
              <th>Compeition</th>
            </tr>
            {this.props.matchList
              .filter(match => {
                console.log(match);
                if (this.state.showCompetition === "") return true;
                return this.state.showCompetition === this.getCompetition(match);
              })
              .map(match => {
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
                    <td>
                      {
                        this.getCompetition(match) === "ctl" 
                          ? "CT League" 
                          : "TNP"
                      }
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
