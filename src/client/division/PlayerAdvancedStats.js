import "./PlayerAdvancedStats.css";
import React from "react";

function PlayerAdvancedStats(props) {
  return (
    <div className="Player-advanced-stats">
      <h4>Advanced Stats</h4>
      {props.division.numWinner === 0 && (
        <div className="Stats-winner">
          Division Win Chance:{" "}
          {props.renderPercentageFunc(props.playerData.autoPromoChance)}
        </div>
      )}
      Placement Odds:
      <table>
        {props.division.numAutoPromo + props.division.numWinner > 0 && (
          <tr
            className={
              props.division.divisionName === "1"
                ? "Stats-winner"
                : "Stats-auto-promo"
            }
          >
            <td>
              {props.division.divisionName === "1" ? "Winner" : "Auto-Promo"}
            </td>
            <td>
              {props.renderPercentageFunc(props.playerData.autoPromoChance)}
            </td>
          </tr>
        )}

        {props.division.numPlayoffPromo > 0 && (
          <tr className="Stats-playoff-promo">
            <td>Playoff Promo</td>
            <td>
              {props.renderPercentageFunc(props.playerData.playoffPromoChance)}
            </td>
          </tr>
        )}

        <tr className="Stats-unchanged">
          <td>Unchanged</td>
          <td>
            {props.renderPercentageFunc(
              100 -
                props.playerData.autoPromoChance -
                props.playerData.playoffPromoChance -
                props.playerData.autoRelegationChance -
                props.playerData.playoffRelegationChance
            )}
          </td>
        </tr>

        {props.division.numPlayoffRelegate > 0 && (
          <tr className="Stats-playoff-relegation">
            <td>Playoff Relegation</td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.playoffRelegationChance
              )}
            </td>
          </tr>
        )}

        {props.division.numAutoRelegate > 0 && (
          <tr className="Stats-auto-relegation">
            <td>Auto-Relegation</td>
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
