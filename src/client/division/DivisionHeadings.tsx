import React from "react";
import type { SortBy, DivisionWithChances, PlayerRow, Match } from "../../types";

type DivisionHeadingsProps = {
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

function DivisionHeadings(props: DivisionHeadingsProps) {
  return (
    <tr className="Division-row-headings">
      <th className="Extra-padding-left">Place</th>
      <th>Player</th>
      <th>Matches Played</th>
      <th>Match Record</th>
      <th>Game Record</th>
      <th>Game Difference</th>
      <th>Penalty Points</th>
      <th
        className={
          props.sortBy === "Points"
            ? "Header-sorted-by"
            : "Header-sortable"
        }
        onClick={() => {
          props.setSortBy("Points");
        }}
      >
        <div className="Header-sortable-inner">
          <div>Points</div>
          <div className="Sort-arrow">▼</div>
        </div>
      </th>
      <th
        className={
          props.sortBy === "Simulation"
            ? "Header-sorted-by"
            : "Header-sortable"
        }
        onClick={() => {
          props.setSortBy("Simulation");
        }}
      >
        <div className="Header-sortable-inner">
          <div>
            {props.division.settings.divisionName.match(/^1[^0-9]/) ||
            props.division.settings.numPrizeMoney > 0
              ? "Playoff Chance"
              : "Promo Chance"}
          </div>
          <div className="Sort-arrow">▼</div>
        </div>
      </th>
      <th
        className={
          props.sortBy === "Simulation"
            ? "Header-sorted-by"
            : "Header-sortable"
        }
        onClick={() => {
          props.setSortBy("Points");
        }}
      >
        <div className="Header-sortable-inner">
          <div>Relegation Chance</div>
          <div className="Sort-arrow">▼</div>
        </div>
      </th>
    </tr>
  );
}

export default DivisionHeadings;
