import React, { Component } from "react";
import "./division.css";

class Division extends Component {
  constructor() {
    super();

    this.state = {
      sortBy: "promo" // Either 'promo' for simul results, or 'points' for points
    };
  }
  // Get a list of the colors for the player slots, ordered first place to last
  getRowColors(divisionData) {
    const winner = "rgb(255, 204, 0)";
    const autopromo = "rgb(102, 153, 0)";
    const softpromo = "rgb(153, 204, 153)";
    const softrelegate = "rgb(255, 128, 128)";
    const hardrelegate = "rgb(255, 51, 51)";
    const unchanged = "rgb(207, 231, 245)";

    const numTotal = divisionData.standings.length;
    const numUnchanged =
      numTotal -
      divisionData.numWinner -
      divisionData.numAutoPromo -
      divisionData.numSoftPromo -
      divisionData.numSoftRelegate -
      divisionData.numHardRelegate;
    let colors = [];
    for (let i = 0; i < divisionData.numWinner; i++) {
      colors.push(winner);
    }
    for (let i = 0; i < divisionData.numAutoPromo; i++) {
      colors.push(autopromo);
    }
    for (let i = 0; i < divisionData.numSoftPromo; i++) {
      colors.push(softpromo);
    }
    for (let i = 0; i < numUnchanged; i++) {
      colors.push(unchanged);
    }
    for (let i = 0; i < divisionData.numSoftRelegate; i++) {
      colors.push(softrelegate);
    }
    for (let i = 0; i < divisionData.numHardRelegate; i++) {
      colors.push(hardrelegate);
    }
    return colors;
  }

  renderPercentage(percentChance) {
    if (percentChance === undefined) {
      return "-";
    }
    return percentChance + "%";
  }

  render() {
    const rowColors = this.getRowColors(this.props.data);
    const sortedPlayers = [...this.props.data.standings];
    if (this.state.sortBy == "points") {
      sortedPlayers.sort((player1, player2) => {
        return player2.points - player1.points;
      });
    }

    return (
      <div className="Division">
        <table>
          <tbody>
            {/* Title row */}
            <tr>
              <th className="Division-title" colSpan="10">
                CTL Division {this.props.data.divisionName} League Standings
              </th>
            </tr>

            {/* Row headings */}
            <tr>
              <th className="Extra-padding-left">Place</th>
              <th>Player</th>
              <th>Matches Played</th>
              <th>Match Record</th>
              <th>Game Record</th>
              <th>Game Difference</th>
              <th
                className={
                  this.state.sortBy == "points"
                    ? "Header-sorted-by"
                    : "Header-sortable"
                }
                onClick={() => {
                  this.setState({ sortBy: "points" });
                }}
              >
                Points
              </th>
              <th
                className={
                  this.state.sortBy == "promo"
                    ? "Header-sorted-by"
                    : "Header-sortable"
                }
                onClick={() => {
                  this.setState({ sortBy: "promo" });
                }}
              >
                Promo Chance
              </th>
              <th>Relegation Chance</th>
            </tr>

            {/* Make a row for each player, looping through the data */}
            {sortedPlayers.map((player, index) => {
              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: rowColors[index]
                  }}
                >
                  <td className="Extra-padding-left">{index + 1}</td>
                  <td>{player.name}</td>
                  <td>{player.mp}</td>
                  <td>
                    {player.wins} - {player.losses}
                  </td>
                  <td>
                    {player.gf} - {player.ga}
                  </td>
                  <td>{player.gd}</td>
                  <td>{player.points}</td>
                  <td>{this.renderPercentage(player.promoChance)}</td>
                  <td>{this.renderPercentage(player.relegationChance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default Division;
