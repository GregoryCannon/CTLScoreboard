import React, { Component, useRef, useState } from "react";
import "./ReportingPanel.css";
import moment from "moment";
import { divisionData } from "../server/config_data.ts";
import { getApiUrl } from "./util.ts";
import type { DivisionWithChances } from "../types.ts";

type ReportingPanelProps = {
  divisionData: DivisionWithChances[];
  refreshFunction: () => void;
  isRestreamer: boolean;
  discordIdentity: string;
}

function ReportingPanel(props: ReportingPanelProps) {
  const [statusText, setStatusText] = useState("");
  const [statusTextIsError, setStatusTextIsError] = useState(false);

  const [reportingDivision, setReportingDivision] = 
    useState(props.divisionData.length > 1 ? props.divisionData[0].settings.divisionName : "");
  const [winnerName, setWinnerName] = useState("");
  const [loserName, setLoserName] = useState("");
  const [winnerGameCount, setWinnerGameCount] = useState(3);
  const [loserGameCount, setLoserGameCount] = useState(0);
  const [winnerHome, setWinnerHome] = useState(true);
  const [vodUrl, setVodUrl] = useState("");
  const [matchDate, setMatchDate] = useState(moment.utc().toISOString().slice(0,16));
  const [reportDate, setReportDate] = useState(moment());

  const [animationStart, setAnimationStart] = useState(moment());

  // const divisionInput = useRef<HTMLInputElement>(null);
  // const winnerNameInput = useRef<HTMLInputElement>(null);
  // const loserNameInput = useRef<HTMLInputElement>(null);
  // const loserGamesInput = useRef<HTMLInputElement>(null);
  // const winnerGamesInput = useRef<HTMLInputElement>(null);
  // const vodUrlInput = useRef<HTMLInputElement>(null);
  const datePickerInput = useRef<HTMLInputElement>(null);

  const restreamer = props.discordIdentity.split("#")[0];

  const changeReportingDivision = (div: string) => {
    setReportingDivision(div);
    setWinnerName("");
    setLoserName("");
    setWinnerGameCount(getGamesToWin(div));
  };

  const setDateToNow = () => {
    setMatchDate(moment.utc().toISOString().slice(0, 16));
    setAnimationStart(moment());
    if (datePickerInput?.current !== null) {
      datePickerInput.current.className = "highlighted";
      setTimeout(() => { 
        if (datePickerInput?.current !== null) {
          datePickerInput.current.className = "";
        }
      }, 500);
    }
  };

  const getPlayerList = () => {
    if (reportingDivision === "") {
      return [];
    }
    const filteredDivisions = divisionData.filter(
      div => div.divisionName === reportingDivision
    );
    if (filteredDivisions.length !== 1) {
      return [];
    }
    return filteredDivisions[0].players;
  };

  const getGamesToWin = (div: string) => {
    if (div === "") return 0;

    const division = divisionData.find(
      d => d.divisionName === div
    );
    if (division === undefined) return 0;

    const isDivBo7 = division.bestOf !== undefined && division.bestOf === 7;
    return isDivBo7 ? 4 : 3;
  };

  // Check the form and return either 'valid' or the error to be displayed
  const validateFormData = () => {
    // Missing info
    if (!reportingDivision) 
      return "Select a division for the match";
    if (!winnerName) 
      return "Select the match winner";
    if (!loserName) 
      return "Select the match loser";
    if (!Number.isInteger(loserGameCount)) 
      return "Enter the game count of the match loser";
    if (vodUrl === "") 
      return "Enter the VOD url";
    if (!restreamer) 
      return "Failed to get Discord identity of restreamer.";

    // Invalid info
    if (winnerName === loserName) 
      return "Invalid match: a player cannot face themselves.";
    if (loserGameCount < 0 || winnerGameCount < 0) 
      return "Invalid match: can't have a negative number of wins";
    if (loserGameCount > winnerGameCount - 1)
      return "Invalid match: the winner must win more games than the loser.";

    // Otherwise, no issues
    return "valid";
  };

  const submitMatch = async () => {
    setReportDate(moment());

    const validationResult = validateFormData();
    if (validationResult !== "valid") {
      setStatusText(validationResult);
      setStatusTextIsError(true);
      return;
    }

    const requestBody = {
      division: reportingDivision,
      winner: winnerName,
      loser: loserName,
      winner_games: winnerGameCount,
      loser_games: loserGameCount,
      winner_home: winnerHome,
      match_date: moment.utc(matchDate).unix(),
      report_date: moment().unix(),
      restreamer: restreamer,
      vod_url: vodUrl,
    }

    try {
      const rawResponse = await fetch(getApiUrl("api/match-data"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!rawResponse.ok) {
        const errorMessage = `Match submission request failed with status ${rawResponse.status}`;
        throw new Error(errorMessage);
      }

      setStatusText("Submitted match!");
      setStatusTextIsError(false);
      props.refreshFunction();

    } catch (err) {
      const statusText = err instanceof Error ? err.message : "Match submission request failed";
      setStatusText(statusText);
      setStatusTextIsError(true);
      console.error(err);
    }
  }

  // If not logged in
  if (!props.discordIdentity) {
    return (
      <div>
        <div className="Report-matches-title">Report a Match</div>
        <div className="Error-message">
          <a href={getApiUrl("discord-api/login")}>Login with Discord</a>{" "}
          to report a match!
        </div>
      </div>
    );
  }

  // If logged in but not a restreamer
  if (!props.isRestreamer) {
    return (
      <div>
        <div className="Report-matches-title">Report a Match</div>
        <div className="Error-message">
          You do not have the 'Restreamer' role. Contact CTL admins to gain
          restreamer access.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="Report-matches-title">Report a Match</div>

      <div className="Report-matches-form">
        <div className="Select-reporting-division">
          Division{" "}
          <select
            className="Division-Input"
            value={reportingDivision}
            onChange={e => changeReportingDivision(e.target.value)}
          >
            <option value="" disabled>(division)</option>
            {divisionData
              .filter(division => !division.completed)
              .map((division) => {
              return (
                <option key={division.divisionName}>
                  {division.divisionName}
                </option>
              );
            })}
          </select>
        </div>

        {reportingDivision !== "" ? (
          <div>
            <div className="Match-reporting-container">
              {/* Winner panel */}
              <div className="Match-reporting-subpanel">
                <select
                  id="winner-name"
                  value={winnerName}
                  onChange={e => setWinnerName(e.target.value)}
                >
                  <option value="" disabled>
                    (winner)
                  </option>
                  {getPlayerList().map(playerName => {
                    return <option key={playerName}>{playerName}</option>;
                  })}
                </select>
                <input
                  id="winner-game-count"
                  className="Win-count-input"
                  type="number"
                  value={winnerGameCount}
                  onChange={e => setWinnerGameCount(parseInt(e.target.value))}
                  disabled
                ></input>
                <div>
                  <label htmlFor="winner-home">Home</label>
                  <input
                    id="winner-home"
                    type="radio"
                    name="home-away"
                    value={winnerHome ? "winner-home" : "loser-home"}
                    onChange={e => setWinnerHome(e.target.value === "winner-home")}
                  ></input>
                </div>
              </div>

              <div className="Defeated-text">defeated</div>

              {/* Loser panel */}

              <div className="Match-reporting-subpanel">
                <select
                  id="loser-name"
                  value={loserName}
                  onChange={e => setLoserName(e.target.value)}
                >
                  <option value="" disabled>
                    (loser)
                  </option>
                  {getPlayerList().map((playerName, i) => {
                    return <option key={playerName}>{playerName}</option>;
                  })}
                </select>
                <input
                  id="loser-game-count"
                  className="Win-count-input"
                  type="number"
                  value={loserGameCount}
                  onChange={e => setLoserGameCount(parseInt(e.target.value))}
                ></input>

                <div>
                  <label htmlFor="loser-home">Home</label>
                  <input
                    id="loser-home"
                    type="radio"
                    name="home-away"
                    value={winnerHome ? "winner-home" : "loser-home"}
                    onChange={e => setWinnerHome(e.target.value === "winner-home")}
                  ></input>
                </div>
              </div>
            </div>

            <table className="Text-input-table">
              <tbody>
                <tr>
                  <td>Match Date (UTC)</td>
                  <td>
                    <input
                      type="datetime-local"
                      value={matchDate}
                      onChange={e => setMatchDate(e.target.value)}
                      ref={datePickerInput}
                    />
                  </td>
                </tr>

                <tr>
                  <td>VOD</td>
                  <td>
                    <input
                      type="text"
                      placeholder="Twitch URL"
                      value={vodUrl}
                      onChange={e => setVodUrl(e.target.value)}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p>Select a division above to report a match!</p>
        )}

        <p className={statusTextIsError ? "Error-text" : "Status-text"}>
          {statusText}
        </p>
        <button onClick={setDateToNow} id="now-button">
          Now!
        </button>
        <button onClick={submitMatch} id="submit-button">
          Submit
        </button>
      </div>
    </div>
  );
}

export default ReportingPanel;
