import React, { Component } from "react";
import "./Division.css";
import { SortBy } from "../../server/util.js";
import DivisionHeadings from "./DivisionHeadings";
import DivisionRow from "./DivisionRow";
import html2canvas from "html2canvas";
const moment = require("moment");
const util = require("../../server/util.js");
import {
  BACKGROUND_COLOR_STR,
  WINNER_COLOR_STR,
  PROMO_COLOR_STR,
  RELEGATE_COLOR_STR,
  PLAYOFF_PROMO_COLOR_STR,
  PLAYOFF_RELEGATE_COLOR_STR,
  PRIZE_COLOR_STR,
} from "./division-color-util";

class Division extends Component {
  constructor(props) {
    super(props);

    this.downloadToImage = this.downloadToImage.bind(this);
  }

  // Get a list of the colors for the player slots, ordered first place to last
  getRowColors(division) {
    const numTotal = division.standings.length;
    const numUnchanged =
      numTotal -
      division.numWinner -
      (division.numPrizeMoney || 0) -
      division.numAutoPromo -
      division.numPlayoffPromo -
      division.numPlayoffRelegate -
      division.numAutoRelegate;
    let colors = [];
    for (let i = 0; i < division.numWinner; i++) {
      colors.push(WINNER_COLOR_STR);
    }
    for (let i = 0; i < division.numPrizeMoney; i++) {
      colors.push(PRIZE_COLOR_STR);
    }
    for (let i = 0; i < division.numAutoPromo; i++) {
      colors.push(PROMO_COLOR_STR);
    }
    for (let i = 0; i < division.numPlayoffPromo; i++) {
      colors.push(PLAYOFF_PROMO_COLOR_STR);
    }
    for (let i = 0; i < numUnchanged; i++) {
      colors.push(BACKGROUND_COLOR_STR);
    }
    for (let i = 0; i < division.numPlayoffRelegate; i++) {
      colors.push(PLAYOFF_RELEGATE_COLOR_STR);
    }
    for (let i = 0; i < division.numAutoRelegate; i++) {
      colors.push(RELEGATE_COLOR_STR);
    }
    return colors;
  }

  downloadToImage() {
    const name = this.props.data.divisionName;
    console.log("Querying:", "Division" + name);
    html2canvas(document.querySelector("#Division" + name)).then(function(
      canvas
    ) {
      const fileName =
        "CTL Division " +
        name +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      util.downloadCanvasAsPng(canvas, fileName);
    });
  }

  render() {
    // Get a sorted list of players
    const playerList = [...this.props.data.standings];
    if (this.props.sortBy === SortBy.points) {
      playerList.sort(util.compareRaw);
    } else {
      playerList.sort(util.compareSimulated);
    }

    console.log(this.props.data.standings);

    // Calculate other constants
    const divName = this.props.data.divisionName;
    let rowColors = this.getRowColors(this.props.data);
    const totalMatchesInSeason =
      (playerList.length - 1) * (this.props.data.oneMatchPerPair ? 1 : 2);

    /*
    Divide the divisions into blocks by number.
    This division is at the start of the tier block if either:
        - the name is a single number (e.g. "3")
        - the name ends in A (e.g. "6A")
    */
    const divAtStartOfTier =
      !isNaN(divName) || divName[1] === "A" || divName[1] === "a";

    // Calculate lists of players played and upcoming matches for each player
    const divisionScheduleInfo = util.getPlayerScheduleInfo(
      this.props.data,
      this.props.matchList
    );

    return (
      <div
        id={"Division" + this.props.data.divisionName}
        className={`Division ${
          divAtStartOfTier ? "Division-at-start-of-tier" : ""
        }`}
      >
        <table>
          <tbody>
            {/* Title row */}
            <tr>
              <th
                className="Division-title"
                colSpan={this.props.isAdmin ? 9 : 10}
              >
                Division {this.props.data.divisionName}
              </th>
              {this.props.isAdmin && (
                <th className="Division-export-button">
                  <button onClick={this.downloadToImage}>Export PNG</button>
                </th>
              )}
            </tr>

            {/* Row headings */}
            <DivisionHeadings {...this.props} />

            {/* Make a row for each player, looping through the data */}
            {playerList.map((player, index) => {
              const isOpen =
                this.props.expandedPlayerRow.divisionName ===
                  this.props.data.divisionName &&
                this.props.expandedPlayerRow.playerName === player.name;
              return (
                <DivisionRow
                  {...this.props}
                  isOpen={isOpen}
                  index={index}
                  player={player}
                  divisionScheduleInfo={divisionScheduleInfo}
                  bgColor={rowColors[index]}
                  totalMatchesInSeason={totalMatchesInSeason}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default Division;
