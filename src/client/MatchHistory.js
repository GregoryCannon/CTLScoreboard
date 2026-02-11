import React, { useEffect, useState } from "react";
import "./MatchHistory.css";

const util = require("../server/util");
const ALL_DIVISIONS = "(All)";

function MatchHistory(props) {
  const [selectedDivision, setSelectedDivision] = useState(ALL_DIVISIONS);
  const [filteredMatches, setFilteredMatches] = useState(props.matchList);

  useEffect(() => {
    setFilteredMatches(filterMatches(selectedDivision, props.matchList));
  }, [props.matchList])

  const filterMatches = (div, matches) => {
    return div === ALL_DIVISIONS
      ? matches
      : matches.filter(match => match.division === div);
  }

  const selectDivision = div => {
    setSelectedDivision(div);
    setFilteredMatches(filterMatches(div, props.matchList));
  }

  const getMatchDivision = match => {
    return match.division.match(/^[1-9]/)
      ? `D${match.division}`
      : match.division;
  }

  const getMatchText = match => {
    return `${match.winner} ${match.winner_home ? "(H)" : "(A)"} def. ${
      match.loser
    } ${match.winner_home ? "(A)" : "(H)"}, ${match.winner_games}-${
      match.loser_games
    }`;
  }

  const makeDeleteRequest = matchData => {
    var request = new XMLHttpRequest();
    request.open("DELETE", util.getApiUrl("api/match-data", true));
    request.setRequestHeader("Content-type", "application/json");

    // Set callback for response
    request.onload = function() {
      const response = JSON.parse(request.response);
      if (response.didSucceed) {
        // Refresh data
        props.refreshFunction();
      } else {
        alert("Failed to delete match. Reason:\n\n" + response.errorMessage);
      }
    }.bind(this);

    // Send request with the id of the match to delete
    const requestBody = matchData;
    request.send(JSON.stringify(requestBody));
  }

  const deleteMatchClicked = matchData => {
    const confirmMessage = `Are you sure you want to delete this match between ${matchData.winner} and ${matchData.loser}?`;
    var result = confirm(confirmMessage);
    if (result) {
      makeDeleteRequest(matchData);
    }
  }

  const getFilteredMatchList = () => {
    if (selectedDivision === ALL_DIVISIONS) {
      return props.matchList;
    }
    return props.matchList.filter(
      match => match.division === selectedDivision
    );
  }

  const isMatchDeletable = match => {
    return (
      props.isAdmin ||
      props.discordIdentity.split("#")[0] === match.restreamer
    );
  }

  const ondivisionChanged = event => {
    selectDivision(event.target.value);
  }

  return (
    <div className="Match-history">
      <div className="Match-history-title">
        <span>Match History</span>
        <select className="Division-select" onChange={ondivisionChanged}>
          <option>{ALL_DIVISIONS}</option>
          {props.divisionList.map(divisionName => {
            return <option>{divisionName}</option>;
          })}
        </select>
      </div>
      {filteredMatches.length === 0 ? (
        <div className="No-matches-found">No matches found</div>
      ) : (
        <div className="Scrollable-list">
          <table>
            <tbody>
              {filteredMatches.map(match => {
                return (
                  <tr
                    key={getMatchText(match)}
                    className="Reported-match"
                  >
                    <td className="Match-division">
                      {getMatchDivision(match)}
                    </td>
                    <td className="Match-text">
                      {getMatchText(match)}
                      <br />
                      <span className="Match-date">
                        {util.getMatchDateFormatted(match)}
                      </span>
                    </td>
                    <td>
                      <a
                        className="Delete-match-button"
                        style={{
                          visibility: isMatchDeletable(match)
                            ? "visible"
                            : "hidden"
                        }}
                        onClick={() => {
                          deleteMatchClicked(match);
                        }}
                      >
                        <i className="fas fa-trash"></i>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
  

export default MatchHistory;
