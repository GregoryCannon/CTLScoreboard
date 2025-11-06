import React, { Component, useState } from "react";
import "./MatchHistory.css";

const util = require("../server/util");
const ALL_DIVISIONS = "(All)";

function MatchHistory(props) {
  const [selectedDivision, setSelectedDivision] = useState(ALL_DIVISIONS);
  const [filteredMatchList, setFilteredMatchList] = useState(props.matchList);

  const getDivisionDisplayName = match => {
    return match.division.match(/^[1-9]/)
      ? `D${match.division}`
      : match.division;
  };

  const getMatchText = match => {
    return `${match.winner} ${match.winner_home ? "(H)" : "(A)"} def. ${
      match.loser
    } ${match.winner_home ? "(A)" : "(H)"}, ${match.winner_games}-${
      match.loser_games
    }`;
  };

  const updateSelectedDivision = selectedDivision => {
    setSelectedDivision(selectedDivision);
    setFilteredMatchList(props.matchList.filter(
      match => match.divsion === selectedDivision
    ));
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
        this.props.refreshFunction();
      } else {
        alert("Failed to delete match. Reason:\n\n" + response.errorMessage);
      }
    };

    // Send request with the id of the match to delete
    const requestBody = matchData;
    request.send(JSON.stringify(requestBody));
  };

  const deleteMatchClicked = matchData => {
    const confirmMessage = `Are you sure you want to delete this match between ${matchData.winner} and ${matchData.loser}?`;
    var result = confirm(confirmMessage);
    if (result) {
      makeDeleteRequest(matchData);
    };
  }

  const isMatchDeletable = match => {
    return (
      props.isAdmin ||
      props.discordIdentity.split("#")[0] === match.restreamer
    );
  };

  return (
    <div>
        <div className="Match-history-title">
          <span>Match History</span>
          <select className="Division-select" onChange={e => updateSelectedDivision(e.target.value)}>
            <option>{ALL_DIVISIONS}</option>
            {this.props.divisionList.map(divisionName => {
              return <option>{divisionName}</option>;
            })}
          </select>
        </div>
        {filteredMatchList.length === 0 ? (
          <div className="No-matches-found">No matches found</div>
        ) : (
          <div className="Scrollable-list">
            <table>
              <tbody>
                {filteredMatchList.map(match => {
                  return (
                    <tr
                      key={getMatchText(match)}
                      className="Reported-match"
                    >
                      <td className="Match-division">
                        {getDivisionDisplayName(match)}
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
