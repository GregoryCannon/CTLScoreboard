import React from "react";
import { SortBy } from "../../server/util.js";

function DivisionHeadings(props) {
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
          props.sortBy === SortBy.points
            ? "Header-sorted-by"
            : "Header-sortable"
        }
        onClick={() => {
          props.setSortBy(SortBy.points);
        }}
      >
        <div className="Header-sortable-inner">
          <div>Points</div>
          <div className="Sort-arrow">▼</div>
        </div>
      </th>
      <th
        className={
          props.sortBy === SortBy.simulation
            ? "Header-sorted-by"
            : "Header-sortable"
        }
        onClick={() => {
          props.setSortBy(SortBy.simulation);
        }}
      >
        <div className="Header-sortable-inner">
          <div>
            {props.data.divisionName === "1" ? "Win Chance" : "Promo Chance"}
          </div>
          <div className="Sort-arrow">▼</div>
        </div>
      </th>
      <th
        className={
          props.sortBy === SortBy.simulation
            ? "Header-sorted-by"
            : "Header-sortable"
        }
        onClick={() => {
          props.setSortBy(SortBy.simulation);
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
