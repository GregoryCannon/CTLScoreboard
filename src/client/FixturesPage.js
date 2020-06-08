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
      const resultStrings = [
        match.winner,
        `won ${match.winner_games}-${match.loser_games}`
      ];

      if (!hashMap[homePlayer]) {
        hashMap[homePlayer] = {};
      }
      hashMap[homePlayer][awayPlayer] = resultStrings;
    }
    return hashMap;
  }

  /* Fills one cell in the fixtures table with either the match result, incomplete, or N/A */
  renderFixturesCellContent(homePlayer, awayPlayer, fixturesMap) {
    if (homePlayer === awayPlayer) {
      return <td className="Match-invalid">N/A</td>;
    }
    if (fixturesMap[homePlayer] && fixturesMap[homePlayer][awayPlayer]) {
      const result = fixturesMap[homePlayer][awayPlayer];
      return (
        <td className="Match-complete">
          {result[0]}
          <br />
          {result[1]}{" "}
        </td>
      );
    }
    return <td className="Match-incomplete">Incomplete</td>;
  }

  render() {
    return (
      <div className="Fixtures-container">
        {this.props.divisionData.map(division => {
          const divMatches = this.props.matchList.filter(
            match => match.division == division.divisionName
          );

          const fixturesMap = this.getFixturesMap(division, divMatches);

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

                {/* Single row of away players' names */}
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
                      return this.renderFixturesCellContent(
                        homePlayer,
                        awayPlayer,
                        fixturesMap
                      );
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
