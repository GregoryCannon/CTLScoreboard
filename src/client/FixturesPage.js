import React, { Component } from "react";
import "./FixturesPage.css";

const util = require("../server/util");

class FixturesPage extends Component {
  /* Runs through the list of matches and makes a hashmap (homePlayer, awayPlayer) -> (result). Used to make fixtures. */
  getFixturesMap(division, divMatches) {
    const hashMap = {};
    for (let i = 0; i < divMatches.length; i++) {
      const match = divMatches[i];
      const homePlayer = match.winner_home ? match.winner : match.loser;
      const awayPlayer = match.winner_home ? match.loser : match.winner;
      // const homeScore = match.winner_home
      //   ? match.winner_games
      //   : match.loser_games;
      // const awayScore = match.winner_home
      //   ? match.loser_games
      //   : match.winner_games;
      // // const resultString = `Complete ${homeScore} - ${awayScore}`;
      const resultString = `${match.winner} won ${match.winner_games}-${match.loser_games}`;

      if (!hashMap[homePlayer]) {
        hashMap[homePlayer] = {};
      }
      hashMap[homePlayer][awayPlayer] = resultString;
    }
    return hashMap;
  }

  render() {
    console;
    return (
      <div className="Fixtures-container">
        {this.props.divisionData.map(division => {
          console.log("matches", this.props.matchData);
          const divMatches = this.props.matchData.filter(
            match => match.division == division.divisionName
          );
          console.log("divMatches", divMatches);

          const fixturesMap = this.getFixturesMap(division, divMatches);
          console.log("fixturesMap", fixturesMap);

          return (
            <table className="Fixtures-table">
              <tbody>
                <tr>
                  <th
                    className="Division-header"
                    colSpan={division.players.length + 1}
                  >
                    Division {division.divisionName}
                  </th>
                </tr>

                {/* Away players' names */}
                <tr>
                  <th className="Secondary-header" />
                  {division.players.map(awayPlayer => (
                    <th className="Secondary-header">{awayPlayer} (A)</th>
                  ))}
                </tr>

                {/* Rows of home players */}
                {division.players.map(homePlayer => (
                  <tr>
                    <th className="Secondary-header">{homePlayer} (H)</th>
                    {division.players.map(awayPlayer => {
                      if (homePlayer === awayPlayer) {
                        return <td className="Match-invalid">N/A</td>;
                      }
                      if (
                        fixturesMap[homePlayer] &&
                        fixturesMap[homePlayer][awayPlayer]
                      ) {
                        return (
                          <td className="Match-complete">
                            {fixturesMap[homePlayer][awayPlayer]}
                          </td>
                        );
                      }
                      return <td className="Match-incomplete">Incomplete</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    );
  }
}

export default FixturesPage;
