import React, { Component } from "react";
import PlayerAdvancedStats from "./PlayerAdvancedStats";
import PlayerOpponents from "./PlayerOpponents";
const divisionColorUtil = require("./division-color-util");
import "./DivisionRow.css";
import { USE_PLAYOFFS_FOR_HYBRID_DIVISIONS } from "../../server/util";

class DivisionRow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isHovered: false
    };

    this.toggleOpen = this.toggleOpen.bind(this);
    this.setIsHovered = this.setIsHovered.bind(this);
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

  toggleOpen() {
    if (this.props.isOpen) {
      // Close the row
      this.props.setExpandedPlayerFunc("", "");
    } else {
      // Set the currently open row in the parent to this row
      this.props.setExpandedPlayerFunc(
        this.props.player.name,
        this.props.data.divisionName
      );
    }
  }

  setIsHovered(isHovered) {
    this.setState({ isHovered: isHovered });
  }

  render() {
    const overallPromoChance =
      this.props.data.numPrizeMoney > 0
        ? this.props.player.prizeMoneyChance
        : this.props.player.autoPromoChance +
          (USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
            ? 0
            : 0.5 * this.props.player.playoffPromoChance); // Maybe include the playoff promo chance as well
    const overallRelegationChance =
      this.props.player.autoRelegationChance +
      (USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
        ? 0
        : 0.5 * this.props.player.playoffRelegationChance); // Maybe include the playoff promo chance as well

    return (
      <React.Fragment>
        {/* Main content row */}
        <tr
          key={this.props.index}
          className="Player-main-row"
          style={{
            backgroundColor: this.state.isHovered
              ? "rgb(239 250 255)"
              : this.props.bgColor
          }}
          onClick={this.toggleOpen}
          onMouseEnter={() => this.setIsHovered(true)}
          onMouseLeave={() => this.setIsHovered(false)}
        >
          <td className="Extra-padding-left">{this.props.index + 1}</td>
          <td className="No-wrap">{this.props.player.name}</td>
          <td>
            {this.props.player.mp} / {this.props.totalMatchesInSeason}
          </td>
          <td>
            {this.props.player.wins} - {this.props.player.losses}
          </td>
          <td>
            {this.props.player.gf} - {this.props.player.ga}
          </td>
          <td>{this.props.player.gd}</td>
          <td>{Math.round(this.props.player.points)}</td>
          <td
            className="Simulation-data-cell"
            style={{
              backgroundColor: this.state.isHovered
                ? "rgb(239 250 255)"
                : this.props.data.divisionName.includes("Gold")
                ? divisionColorUtil.getWinGradientColor(overallPromoChance)
                : divisionColorUtil.getPromoGradientColor(overallPromoChance)
            }}
          >
            {this.renderPercentage(overallPromoChance)}
          </td>
          <td
            className="Simulation-data-cell"
            style={{
              backgroundColor: this.state.isHovered
                ? "rgb(239 250 255)"
                : divisionColorUtil.getRelegationGradientColor(
                    overallRelegationChance
                  )
            }}
          >
            {this.renderPercentage(overallRelegationChance)}
          </td>
        </tr>

        {/* Expandible row with additional stats and info */}
        <tr className="Expandible-container" key={this.props.index}>
          <td colSpan={10} style={{ padding: "0" }}>
            <div
              className="Expandible-content"
              style={{
                maxHeight: this.props.isOpen ? "30vh" : "0",
                borderWidth: 0,
                borderColor: this.props.isOpen ? "#888f" : "#8880"
              }}
            >
              <PlayerOpponents
                scheduleInfo={
                  this.props.divisionScheduleInfo[this.props.player.name]
                }
              />

              <PlayerAdvancedStats
                playerData={this.props.player}
                renderPercentageFunc={this.renderPercentage}
                division={this.props.data}
              />
            </div>
          </td>
        </tr>
      </React.Fragment>
    );
  }
}

export default DivisionRow;
