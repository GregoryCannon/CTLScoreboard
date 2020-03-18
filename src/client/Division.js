import React, { Component } from "react";
import PenaltyPointsEditor from "./PenaltyPointsEditor";
import "./division.css";

const util = require("../server/util.js");

class Division extends Component {
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
    const floatPercent = parseFloat(percentChance);
    if (floatPercent !== 0 && floatPercent < 1) {
      return "<1%";
    }
    if (floatPercent !== 100 && floatPercent > 99) {
      return ">99%";
    }
    return floatPercent.toFixed(0) + "%";
  }

  render() {
    const rowColors = this.getRowColors(this.props.data);
    const sortedPlayers = [...this.props.data.standings];
    if (this.props.sortByPoints) {
      sortedPlayers.sort(util.compareRaw);
    } else {
      // Sort by the simulation data
      sortedPlayers.sort(util.compareSimulated);
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
              <th>Penalty Points</th>
              <th
                className={
                  this.props.sortByPoints
                    ? "Header-sorted-by"
                    : "Header-sortable"
                }
                onClick={() => {
                  this.props.setSortByPoints(true);
                }}
              >
                <div className="Header-sortable-inner">
                  <div>Points</div>
                  <i class="fas fa-angle-down"></i>
                </div>
              </th>
              <th
                className={
                  this.props.sortByPoints
                    ? "Header-sortable"
                    : "Header-sorted-by"
                }
                onClick={() => {
                  this.props.setSortByPoints(false);
                }}
              >
                <div className="Header-sortable-inner">
                  <div>
                    {this.props.data.divisionName == "1"
                      ? "Win Chance"
                      : "Promo Chance"}
                  </div>
                  <i class="fas fa-angle-down"></i>
                </div>
              </th>
              <th
                className={
                  this.props.sortByPoints
                    ? "Header-sortable"
                    : "Header-sorted-by"
                }
                onClick={() => {
                  this.props.setSortByPoints(false);
                }}
              >
                <div className="Header-sortable-inner">
                  <div>Relegation Chance</div>
                  <i class="fas fa-angle-down"></i>
                </div>
              </th>
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
                  <td className="No-wrap">{player.name}</td>
                  <td>{player.mp}</td>
                  <td>
                    {player.wins} - {player.losses}
                  </td>
                  <td>
                    {player.gf} - {player.ga}
                  </td>
                  <td>{player.gd}</td>
                  <td>
                    <PenaltyPointsEditor
                      isAdmin={this.props.isAdmin}
                      existingPenaltyPoints={player.penaltyPoints}
                      isEditingPenaltyPoints={this.props.isEditingPenaltyPoints}
                      refreshFunction={this.props.refreshFunction}
                      playerName={player.name}
                    />
                  </td>
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
