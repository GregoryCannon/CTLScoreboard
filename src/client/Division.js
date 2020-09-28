import React, { Component } from "react";
import PenaltyPointsEditor from "./PenaltyPointsEditor";
import "./Division.css";
import { SortBy } from "../server/util.js";

const util = require("../server/util.js");
const divisionColorUtil = require("./divison-color-util");
import {
  BACKGROUND_COLOR_STR,
  WINNER_COLOR_STR,
  PROMO_COLOR_STR,
  RELEGATE_COLOR_STR,
  PLAYOFF_PROMO_COLOR_STR,
  PLAYOFF_RELEGATE_COLOR_STR
} from "./divison-color-util";

class Division extends Component {
  // Get a list of the colors for the player slots, ordered first place to last
  getRowColors(divisionData) {
    const numTotal = divisionData.standings.length;
    const numUnchanged =
      numTotal -
      divisionData.numWinner -
      divisionData.numAutoPromo -
      divisionData.numPlayoffPromo -
      divisionData.numPlayoffRelegate -
      divisionData.numAutoRelegate;
    let colors = [];
    for (let i = 0; i < divisionData.numWinner; i++) {
      colors.push(WINNER_COLOR_STR);
    }
    for (let i = 0; i < divisionData.numAutoPromo; i++) {
      colors.push(PROMO_COLOR_STR);
    }
    for (let i = 0; i < divisionData.numPlayoffPromo; i++) {
      colors.push(PLAYOFF_PROMO_COLOR_STR);
    }
    for (let i = 0; i < numUnchanged; i++) {
      colors.push(BACKGROUND_COLOR_STR);
    }
    for (let i = 0; i < divisionData.numPlayoffRelegate; i++) {
      colors.push(PLAYOFF_RELEGATE_COLOR_STR);
    }
    for (let i = 0; i < divisionData.numAutoRelegate; i++) {
      colors.push(RELEGATE_COLOR_STR);
    }
    return colors;
  }

  renderPercentage(percentChance) {
    if (percentChance === undefined) {
      return "-";
    }
    const floatPercent = parseFloat(percentChance);
    // Quasi-clinch
    if (floatPercent !== 0 && floatPercent < 0.01) {
      return "<0.01%";
    }
    if (floatPercent !== 100 && floatPercent > 99.99) {
      return ">99.99%";
    }
    // Small chance but not clinched
    if (floatPercent !== 0 && floatPercent < 0.5) {
      return "<1%";
    }
    if (floatPercent !== 100 && floatPercent > 99.5) {
      return ">99%";
    }
    return floatPercent.toFixed(0) + "%";
  }

  render() {
    // Get a sorted list of players
    const playerList = [...this.props.data.standings];
    if (this.props.sortBy === SortBy.points) {
      playerList.sort(util.compareRaw);
    } else {
      playerList.sort(util.compareSimulated);
    }

    // Calculate other constants
    const divName = this.props.data.divisionName;
    let rowColors = this.getRowColors(this.props.data);
    const totalMatchesInSeason = (playerList.length - 1) * 2;

    /*
    Divide the divisions into blocks by number.
    This division is at the start of the tier block if either:
        - the name is a single number (e.g. "3")
        - the name ends in A (e.g. "6A")
    */
    const divAtStartOfTier =
      !isNaN(divName) || divName[1] === "A" || divName[1] === "a";

    return (
      <div
        className={`Division ${
          divAtStartOfTier ? "Division-at-start-of-tier" : ""
        }`}
      >
        <table>
          <tbody>
            {/* Title row */}
            <tr>
              <th className="Division-title" colSpan="10">
                Division {this.props.data.divisionName}
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
                  this.props.sortBy === SortBy.points
                    ? "Header-sorted-by"
                    : "Header-sortable"
                }
                onClick={() => {
                  this.props.setSortBy(SortBy.points);
                }}
              >
                <div className="Header-sortable-inner">
                  <div>Points</div>
                  <div className="Sort-arrow">▼</div>
                </div>
              </th>
              <th
                className={
                  this.props.sortBy === SortBy.simulation
                    ? "Header-sorted-by"
                    : "Header-sortable"
                }
                onClick={() => {
                  this.props.setSortBy(SortBy.simulation);
                }}
              >
                <div className="Header-sortable-inner">
                  <div>
                    {this.props.data.divisionName == "1"
                      ? "Win Chance"
                      : "Promo Chance"}
                  </div>
                  <div className="Sort-arrow">▼</div>
                </div>
              </th>
              <th
                className={
                  this.props.sortBy === SortBy.simulation
                    ? "Header-sorted-by"
                    : "Header-sortable"
                }
                onClick={() => {
                  this.props.setSortBy(SortBy.simulation);
                }}
              >
                <div className="Header-sortable-inner">
                  <div>Relegation Chance</div>
                  <div className="Sort-arrow">▼</div>
                </div>
              </th>
            </tr>

            {/* Make a row for each player, looping through the data */}
            {playerList.map((player, index) => {
              const overallPromoChance =
                player.autoPromoChance + 0.5 * player.playoffRelegationChance;
              const overallRelegationChance =
                player.autoRelegationChance +
                0.5 * player.playoffRelegationChance;
              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: rowColors[index]
                  }}
                >
                  <td className="Extra-padding-left">{index + 1}</td>
                  <td className="No-wrap">{player.name}</td>
                  <td>
                    {player.mp} / {totalMatchesInSeason}
                  </td>
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
                      divisionName={this.props.data.divisionName}
                    />
                  </td>
                  <td>{player.points}</td>
                  <td
                    className="Simulation-data-cell"
                    style={{
                      backgroundColor:
                        this.props.data.divisionName === "1"
                          ? divisionColorUtil.getWinGradientColor(
                              overallPromoChance
                            )
                          : divisionColorUtil.getPromoGradientColor(
                              overallPromoChance
                            )
                    }}
                  >
                    {this.renderPercentage(overallPromoChance)}
                  </td>
                  <td
                    className="Simulation-data-cell"
                    style={{
                      backgroundColor: divisionColorUtil.getRelegationGradientColor(
                        overallRelegationChance
                      )
                    }}
                  >
                    {this.renderPercentage(overallRelegationChance)}
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

export default Division;
