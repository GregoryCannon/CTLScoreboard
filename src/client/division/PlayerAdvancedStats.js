import "./PlayerAdvancedStats.css";
import React from "react";
import { USE_PLAYOFFS_FOR_HYBRID_DIVISIONS } from "../../server/util";

function PlayerAdvancedStats(props) {
  const shouldShowUnchangedRow =
    !USE_PLAYOFFS_FOR_HYBRID_DIVISIONS ||
    (props.division.numPlayoffPromo == 0 &&
      props.division.numPlayoffRelegate == 0);

  return (
    <div className="Player-advanced-stats">
      <h4>Advanced Stats</h4>
      {props.division.numWinner === 0 && (
        <div className="Stats-winner">
          Division Win Chance:{" "}
          {props.renderPercentageFunc(props.playerData.divisionWinChance)}
        </div>
      )}
      {/* {props.division.numPrizeMoney && (
        <div className="Stats-winner">
          Prize Money Chance:{" "}
          {props.renderPercentageFunc(props.playerData.prizeMoneyChance)}
        </div>
      )} */}
      Placement Odds:
      {console.log(props.division.divisionName)}
      <table>
        {props.division.numAutoPromo + props.division.numWinner > 0 && (
          <tr
            className={
              props.division.divisionName.match(/^1[^0-9]/) || props.data.divisionName === "1"
                ? "Stats-winner"
                : "Stats-auto-promo"
            }
          >
            <td>
              {props.division.divisionName.match(/^1[^0-9]/) || props.data.divisionName === "1"
                ? "Winner's Bracket"
                : "Promotion"}
            </td>
            <td>
              {props.renderPercentageFunc(props.playerData.autoPromoChance)}
            </td>
          </tr>
        )}

        {props.division.numPrizeMoney > 0 && (
          <tr className={"Stats-prize-money"}>
            <td>Loser's Bracket</td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.prizeMoneyChance -
                  props.playerData.autoPromoChance
              )}
            </td>
          </tr>
        )}

        {props.division.numPlayoffPromo > 0 && (
          <tr className="Stats-playoff-promo">
            <td>
              {USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
                ? "Upper Tier"
                : "Promotion Playoff"}
            </td>
            <td>
              {props.renderPercentageFunc(props.playerData.playoffPromoChance)}
            </td>
          </tr>
        )}

        {shouldShowUnchangedRow && (
          <tr className="Stats-unchanged">
            <td>Unchanged</td>
            <td>
              {props.renderPercentageFunc(
                100 -
                  (props.division.numPrizeMoney > 0
                    ? props.playerData.prizeMoneyChance
                    : props.playerData.autoPromoChance +
                      props.playerData.playoffPromoChance) -
                  props.playerData.autoRelegationChance -
                  props.playerData.playoffRelegationChance
              )}
            </td>
          </tr>
        )}

        {props.division.numPlayoffRelegate > 0 && (
          <tr className="Stats-playoff-relegation">
            <td>
              {USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
                ? "Lower Tier"
                : "Conditional Relegation"}
            </td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.playoffRelegationChance
              )}
            </td>
          </tr>
        )}

        {props.division.numAutoRelegate > 0 && (
          <tr className="Stats-auto-relegation">
            <td>Relegation</td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.autoRelegationChance
              )}
            </td>
          </tr>
        )}
      </table>
    </div>
  );
}

export default PlayerAdvancedStats;
