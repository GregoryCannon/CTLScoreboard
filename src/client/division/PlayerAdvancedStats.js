import "./PlayerAdvancedStats.css";
import React from "react";

function PlayerAdvancedStats(props) {
  return (
    <React.Fragment>
      <h4>Advanced Stats</h4>
      Division Win Chance: IMPLEMENT ME PLSSSSSSSSS
      <br />
      <br />
      Placement Odds:
      <table>
        {props.division.numAutoPromo + props.division.numWinner > 0 && (
          <tr>
            <td>
              {props.division.divisionName === "1"
                ? "Winner"
                : "Automatic Promo"}
            </td>
            <td>
              {props.renderPercentageFunc(props.playerData.autoPromoChance)}
            </td>
          </tr>
        )}

        {props.division.numPlayoffPromo > 0 && (
          <tr>
            <td>Playoff Promo</td>
            <td>
              {props.renderPercentageFunc(props.playerData.playoffPromoChance)}
            </td>
          </tr>
        )}

        <tr>
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
          <tr>
            <td>Playoff Relegation</td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.playoffRelegationChance
              )}
            </td>
          </tr>
        )}

        {props.division.numAutoRelegate > 0 && (
          <tr>
            <td>Automatic Relegation</td>
            <td>
              {props.renderPercentageFunc(
                props.playerData.autoRelegationChance
              )}
            </td>
          </tr>
        )}
      </table>
    </React.Fragment>
  );
}

export default PlayerAdvancedStats;
