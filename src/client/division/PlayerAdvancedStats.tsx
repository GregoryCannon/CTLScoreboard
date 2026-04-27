import "./PlayerAdvancedStats.css";
import React from "react";
import { USE_PLAYOFFS_FOR_HYBRID_DIVISIONS } from "../../server/util";
import type { DivisionWithChances, PlayerStandingsWithChances } from "../../types";

type PlayerAdvancedStatsProps = {
  playerData: PlayerStandingsWithChances;
  renderPercentageFunc: (percentChance: number) => string;
  division: DivisionWithChances;
}

function PlayerAdvancedStats(props: PlayerAdvancedStatsProps) {
  const shouldShowUnchangedRow =
    !USE_PLAYOFFS_FOR_HYBRID_DIVISIONS ||
    (props.division.settings.numPlayoffPromo == 0 &&
      props.division.settings.numPlayoffRelegate == 0);

  return (
    <div className="Player-advanced-stats">
      <h4>Advanced Stats</h4>
      {props.division.settings.numWinner === 0 && (
        <div className="Stats-winner">
          Division Win Chance:{" "}
          {props.renderPercentageFunc(props.playerData.chances.divisionWin)}
        </div>
      )}
      {/* {props.division.numPrizeMoney && (
        <div className="Stats-winner">
          Prize Money Chance:{" "}
          {props.renderPercentageFunc(props.playerData.prizeMoneyChance)}
        </div>
      )} */}
      Placement Odds:
      <table><tbody>
        {props.division.settings.numAutoPromo + props.division.settings.numWinner > 0 && (
          <tr
            className={
              props.division.settings.numWinner > 0
                ? "Stats-winner"
                : "Stats-auto-promo"
            }
          >
            <td>
              {props.division.settings.numWinner > 0
                ? "Win Division"
                : "Promotion"}
            </td>
            <td>
              {props.renderPercentageFunc(props.playerData.chances.autoPromo)}
            </td>
          </tr>
        )}

        {props.division.settings.numPrizeMoney > 0 && (
          <tr className={"Stats-prize-money"}>
            <td>Make Playoffs</td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.chances.prizeMoney -
                  props.playerData.chances.autoPromo
              )}
            </td>
          </tr>
        )}

        {props.division.settings.numPlayoffPromo > 0 && (
          <tr className="Stats-playoff-promo">
            <td>
              {USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
                ? "Upper Tier"
                : "Promotion Playoff"}
            </td>
            <td>
              {props.renderPercentageFunc(props.playerData.chances.playoffPromo)}
            </td>
          </tr>
        )}

        {shouldShowUnchangedRow && (
          <tr className="Stats-unchanged">
            <td>Unchanged</td>
            <td>
              {props.renderPercentageFunc(
                100 -
                  (props.division.settings.numPrizeMoney > 0
                    ? props.playerData.chances.prizeMoney
                    : props.playerData.chances.autoPromo +
                      props.playerData.chances.playoffPromo) -
                  props.playerData.chances.autoRelegation -
                  props.playerData.chances.playoffRelegation
              )}
            </td>
          </tr>
        )}

        {props.division.settings.numPlayoffRelegate > 0 && (
          <tr className="Stats-playoff-relegation">
            <td>
              {USE_PLAYOFFS_FOR_HYBRID_DIVISIONS
                ? "Lower Tier"
                : "Conditional Relegation"}
            </td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.chances.playoffRelegation
              )}
            </td>
          </tr>
        )}

        {props.division.settings.numAutoRelegate > 0 && (
          <tr className="Stats-auto-relegation">
            <td>Relegation</td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.chances.autoRelegation
              )}
            </td>
          </tr>
        )}
      </tbody></table>
    </div>
  );
}

export default PlayerAdvancedStats;
