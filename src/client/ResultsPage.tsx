import React, { Component, useState } from "react";
import "./ResultsPage.css";
import {
  getCompetition,
  getMatchDateFormatted,
  getCompetitionEloName
} from "../server/util.ts";
import { competitions } from "../server/config_data.ts";
import type { DivisionWithChances, Match } from "../types.ts";

type ResultsPageProps = {
  matchList: Match[];
  divisionData: DivisionWithChances[];
}

function ResultsPage(props: ResultsPageProps) {
  const [shownCompetition, setShownCompetition] = useState("");

  return (
    <div className="Results-container">
      {competitions.map(competition => (
        <button 
          className="Nav-button"
          key={`results-${competition.abbreviation}`}
          onClick={() => setShownCompetition(competition.abbreviation)}
        >
          {competition.buttonName}
        </button>
      ))}
      <button
        className="Nav-button"
        onClick={() => setShownCompetition("")}
      >
        Show all
      </button>
      <table className="Results-table">
        <tbody>
          <tr className="Results-header">
            <th>Match Time (UTC)</th>
            <th>Restreamer</th>
            <th>Home</th>
            <th>Home Score</th>
            <th>Away Score</th>
            <th>Away</th>
            <th>Division</th>
            <th>Competition</th>
          </tr>
          {props.matchList
            .filter(match => {
              console.log(match);
              if (shownCompetition === "") return true;
              return (
                shownCompetition === getCompetition(match)
              );
            })
            .map(match => {
              const homePlayer = match.winner_home
                ? match.winner
                : match.loser;
              const awayPlayer = match.winner_home
                ? match.loser
                : match.winner;
              const homeScore = match.winner_home
                ? match.winner_games
                : match.loser_games;
              const awayScore = match.winner_home
                ? match.loser_games
                : match.winner_games;

              return (
                <tr key={`row-${match.division}-${homePlayer}-${awayPlayer}`}>
                  <td>{getMatchDateFormatted(match)}</td>
                  <td>{match.restreamer}</td>
                  <td>{homePlayer}</td>
                  <td>{homeScore}</td>
                  <td>{awayScore}</td>
                  <td>{awayPlayer}</td>
                  <td>{match.division}</td>
                  <td>
                    {getCompetitionEloName(match)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

export default ResultsPage;
