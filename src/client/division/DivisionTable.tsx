import React, { Component, useState } from "react";
import "./DivisionTable.css";
import { 
  downloadCanvasAsPng,
  getPlayerScheduleInfo
} from "../../server/util";
import {
  getApiUrl
} from "../util";
import DivisionHeadings from "./DivisionHeadings";
import DivisionRow from "./DivisionRow";
import html2canvas from "html2canvas";
import moment from "moment";
import {
  BACKGROUND_COLOR_STR,
  WINNER_COLOR_STR,
  PROMO_COLOR_STR,
  RELEGATE_COLOR_STR,
  PLAYOFF_PROMO_COLOR_STR,
  PLAYOFF_RELEGATE_COLOR_STR,
  PRIZE_COLOR_STR
} from "./division-color-util";
import type { DivisionWithChances, Match, PlayerRow, SortBy } from "../../types";

type DivisionTableProps = {
  key: string;
  division: DivisionWithChances;
  sortBy: SortBy;
  isAdmin: boolean;
  setSortBy: (value: SortBy) => void;
  expandedPlayerRow: PlayerRow;
  isEditingPenaltyPoints: boolean;
  refreshFunction: () => void;
  setExpandedPlayer: (value: PlayerRow) => void;
  matchList: Match[];
}

function DivisionTable(props: DivisionTableProps) {
  const [divisionPlayers, setDivisionPlayers] = useState(props.division.standings);

  const divName = props.division.settings.divisionName;
  const totalMatchesInSeason =
    (props.division.standings.length - 1) * (props.division.settings.oneMatchPerPair ? 1 : 2);

  const getRowColors = () => {
    const division = props.division;
    const numTotal = division.standings.length;
    const numUnchanged =
      numTotal -
      division.settings.numWinner -
      (division.settings.numPrizeMoney || 0) -
      division.settings.numAutoPromo -
      division.settings.numPlayoffPromo -
      division.settings.numPlayoffRelegate -
      division.settings.numAutoRelegate;
    let colors = [];
    for (let i = 0; i < division.settings.numWinner; i++) {
      colors.push(WINNER_COLOR_STR);
    }
    for (let i = 0; i < division.settings.numPrizeMoney; i++) {
      colors.push(PRIZE_COLOR_STR);
    }
    for (let i = 0; i < division.settings.numAutoPromo; i++) {
      colors.push(PROMO_COLOR_STR);
    }
    for (let i = 0; i < division.settings.numPlayoffPromo; i++) {
      colors.push(PLAYOFF_PROMO_COLOR_STR);
    }
    for (let i = 0; i < numUnchanged; i++) {
      colors.push(BACKGROUND_COLOR_STR);
    }
    for (let i = 0; i < division.settings.numPlayoffRelegate; i++) {
      colors.push(PLAYOFF_RELEGATE_COLOR_STR);
    }
    for (let i = 0; i < division.settings.numAutoRelegate; i++) {
      colors.push(RELEGATE_COLOR_STR);
    }
    return colors;
  }

  const downloadToImage = () => {
    console.log("Querying:", "Division" + divName);
    html2canvas(
      document.querySelector("#DivisionTable" + divName.replace(/ /g, "")) as HTMLElement
    ).then(function(canvas) {
      const fileName =
        "CTL Division " +
        name +
        moment()
          .utc()
          .format("MM/DD/YYYY");
      downloadCanvasAsPng(canvas, fileName);
    });
  }

  const makePurgeDivisionRequest = async () => {
    try {
      const requestBody = { divisionName: divName };
      const rawResponse = await fetch(getApiUrl("api/match-data/purge"), { 
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!rawResponse.ok) {
        const errorMessage = `Division purge request failed with status ${rawResponse.status}`;
        alert(errorMessage);
        throw new Error(errorMessage);
      }

      const response = await rawResponse.json();
      props.refreshFunction();

    } catch (err) {
      console.error(err);
    }
  }

  const purgeDivisionClicked = () => {
    const confirmMessage = `Are you sure you want to purge division ${props.division.settings.divisionName}?`;
    var result = confirm(confirmMessage);
    if (result) {
      makePurgeDivisionRequest();
    }
  };

  /*
  Divide the divisions into blocks by number.
  This division is at the start of the tier block if either:
      - the name is a single number (e.g. "3")
      - the name ends in A (e.g. "6A")
  TODO: Currently, only works for CTL divs.
  */
  const divAtStartOfTier =
    divName.length === 1 || divName[1] === "A" || divName[1] === "a";

  const divisionScheduleInfo = getPlayerScheduleInfo(props.division, props.matchList);

  return (
    <div
      id={"Division" + props.division.settings.divisionName.replace(/ /g, "")}
      className={`Division ${
        divAtStartOfTier ? "Division-at-start-of-tier" : ""
      }`}
    >
      {props.isAdmin && (
        <div className="Divison-actions">
          <button onClick={downloadToImage}>Export PNG</button>
          <button onClick={purgeDivisionClicked}>Purge Division</button>
        </div>
      )}
      <table
        id={"DivisionTable" + divName.replace(/ /g, "")}
      >
        <tbody>
          {/* Title row */}
          <tr>
            <th className="Division-title" colSpan={10}>
              Division {divName}
            </th>
          </tr>

          {/* Row headings */}
          <DivisionHeadings {...props} />

          {/* Make a row for each player, looping through the data */}
          {props.division.standings.map((player, index) => {
            const isOpen =
              props.expandedPlayerRow.divisionName ===
                divName && props.expandedPlayerRow.playerName === player.name;
            return (
              <DivisionRow
                {...props}
                key={`${divName}-${index}`}
                isOpen={isOpen}
                index={index}
                player={player}
                divisionScheduleInfo={divisionScheduleInfo}
                bgColor={getRowColors()[index]}
                totalMatchesInSeason={totalMatchesInSeason}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DivisionTable;
