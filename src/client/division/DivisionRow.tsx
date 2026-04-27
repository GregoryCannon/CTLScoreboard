import React, { Component, useState } from "react";
import PenaltyPointsEditor from "./PenaltyPointsEditor";
import PlayerAdvancedStats from "./PlayerAdvancedStats";
import PlayerOpponents from "./PlayerOpponents";
import {
  getWinGradientColor,
  getPromoGradientColor,
  getRelegationGradientColor,
} from './division-color-util';
import "./DivisionRow.css";
import { USE_PLAYOFFS_FOR_HYBRID_DIVISIONS } from "../../server/util";
import type { DivisionWithChances, Match, PlayerRow, PlayerScheduleMatchInfo, PlayerStandingsWithChances, SortBy } from "../../types";

// this is probably way too many attributes
type DivisionRowProps = {
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
  isOpen: boolean;
  index: number;
  player: PlayerStandingsWithChances;
  divisionScheduleInfo: Record<string, PlayerScheduleMatchInfo>;
  bgColor: string;
  totalMatchesInSeason: number;

}

function DivisionRow(props: DivisionRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const renderPercentage = (percentChance: number) => {
    if (percentChance === undefined) {
      return "-";
    }
    // Quasi-clinch
    if (percentChance !== 0 && percentChance < 0.01) {
      return "<0.01%";
    }
    if (percentChance !== 100 && percentChance > 99.99) {
      return ">99.99%";
    }
    // Small chance but not clinched
    if (percentChance !== 0 && percentChance < 0.5) {
      return "<1%";
    }
    if (percentChance !== 100 && percentChance > 99.5) {
      return ">99%";
    }
    return percentChance.toFixed(0) + "%";
  };

  const toggleOpen = () => {
    if (props.isOpen) {
      // Close the row
      props.setExpandedPlayer({ divisionName: "", playerName: "" });
    } else {
      // Set the currently open row in the parent to this row
      props.setExpandedPlayer({
        divisionName: props.division.settings.divisionName,
        playerName: props.player.name,
      });
    }
  };

  const overallPromoChance =
    props.division.settings.numPrizeMoney > 0
      ? props.player.chances.prizeMoney
      : props.player.chances.autoPromo +
        (USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
          ? 0
          : 0.5 * props.player.chances.playoffPromo); // Maybe include the playoff promo chance as well
  const overallRelegationChance =
    props.player.chances.autoRelegation +
    (USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
      ? 0
      : 0.5 * props.player.chances.playoffRelegation); // Maybe include the playoff promo chance as well

  return (
    <React.Fragment>
      {/* Main content row */}
      <tr
        key={`player-row-${props.index}`}
        className="Player-main-row"
        style={{
          backgroundColor: isHovered
            ? "rgb(239 250 255)"
            : props.bgColor
        }}
        onClick={toggleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <td className="Extra-padding-left">{props.index + 1}</td>
        <td className="No-wrap">{props.player.name}</td>
        <td>
          {props.player.mp} / {props.totalMatchesInSeason}
        </td>
        <td>
          {props.player.wins} - {props.player.losses}
        </td>
        <td>
          {props.player.gf} - {props.player.ga}
        </td>
        <td>{props.player.gd}</td>
        <td>
          <PenaltyPointsEditor
            isAdmin={props.isAdmin}
            existingPenaltyPoints={props.player.penaltyPoints}
            isEditingPenaltyPoints={props.isEditingPenaltyPoints}
            refreshFunction={props.refreshFunction}
            playerName={props.player.name}
            divisionName={props.division.settings.divisionName}
          />
        </td>
        <td>{Math.round(props.player.points)}</td>
        <td
          className="Simulation-data-cell"
          style={{
            backgroundColor: isHovered
              ? "rgb(239 250 255)"
              : props.division.settings.numWinner > 0
              ? getWinGradientColor(overallPromoChance)
              : getPromoGradientColor(overallPromoChance)
          }}
        >
          {renderPercentage(overallPromoChance)}
        </td>
        <td
          className="Simulation-data-cell"
          style={{
            backgroundColor: isHovered
              ? "rgb(239 250 255)"
              : getRelegationGradientColor(
                  overallRelegationChance
                )
          }}
        >
          {renderPercentage(overallRelegationChance)}
        </td>
      </tr>

      {/* Expandible row with additional stats and info */}
      <tr className="Expandible-container" key={`expandable-${props.index}`}>
        <td colSpan={10} style={{ padding: "0" }}>
          <div
            className="Expandible-content"
            style={{
              maxHeight: props.isOpen ? "100vh" : "0",
              borderWidth: 0,
              borderColor: props.isOpen ? "#888f" : "#8880"
            }}
          >
            <PlayerOpponents
              scheduleInfo={
                props.divisionScheduleInfo[props.player.name]
              }
            />
            <PlayerAdvancedStats
              playerData={props.player}
              renderPercentageFunc={renderPercentage}
              division={props.division}
            />
          </div>
        </td>
      </tr>
    </React.Fragment>
  )
}

export default DivisionRow;
