import React, { Component, useState } from "react";
import ReportingPanel from "./ReportingPanel.tsx";
import MatchHistory from "./MatchHistory.tsx";
import DivisionTable from "./division/DivisionTable.tsx";
import "./StandingsPage.css";
import { competitions } from "../server/config_data.ts"; // bad
import type { DivisionWithChances, Match, PlayerRow, SortBy } from "../types.ts";

type StandingsPageProps = {
  divisionData: DivisionWithChances[];
  matchList: Match[];
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  isAdmin: boolean;
  isRestreamer: boolean;
  discordIdentity: string;
  isEditingPenaltyPoints: boolean;
  refreshFunction: () => void;
}


function StandingsPage(props: StandingsPageProps) {
  const [expandedPlayer, setExpandedPlayer] = useState({ divisionName: "", playerName: ""} as PlayerRow);
  const [competition, setCompetition] = useState("");
  
  const getPages = () => {
    let pages = [];
    const PAGE_SIZES = [2, 3, 3, 4, 4, 4, 5, 5, 5, 5];
    const divData = props.divisionData.filter(div => {
      const isCorrectCompetition = (competition === "") || (div.settings.competition === competition);
      return (!div.settings.completed && isCorrectCompetition);
    });

    let i = 0;
    for (const pageSize of PAGE_SIZES) {
      pages.push(divData.slice(i, i + pageSize));
      i += pageSize;
    }

    return pages;
  };

  return (
    <div className="Standings-container">
      <div className="Left-panel">
        {competitions.map(competition => (
          <button 
            key={`standings-select-${competition.abbreviation}`}
            className="Nav-button"
            onClick={() => setCompetition(competition.abbreviation)}
          >
            {competition.buttonName}
          </button>
        ))}
        <button
          className="Nav-button"
          onClick={() => setCompetition("")}
        >
          Show all
        </button>
        {getPages().map((divisionDataSlice, index) => (
          <div id={"Page-" + (index + 1)} key={`page-${index+1}`}>
            {divisionDataSlice.map((division, i) => (
              <DivisionTable
                key={division.settings.divisionName}
                division={division}
                sortBy={props.sortBy}
                isAdmin={props.isAdmin}
                setSortBy={props.setSortBy}
                expandedPlayerRow={expandedPlayer}
                isEditingPenaltyPoints={props.isEditingPenaltyPoints}
                refreshFunction={props.refreshFunction}
                setExpandedPlayer={setExpandedPlayer}
                matchList={props.matchList}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="Right-panel">
        <div className="Reporting-panel-card">
          <ReportingPanel
            refreshFunction={props.refreshFunction}
            isRestreamer={props.isRestreamer}
            discordIdentity={props.discordIdentity}
            divisionData={props.divisionData}
          />
        </div>

        <div className="Match-history-card">
          <MatchHistory
            matchList={props.matchList}
            divisionList={props.divisionData.map(
              division => division.settings.divisionName
            )}
            refreshFunction={props.refreshFunction}
            isAdmin={props.isAdmin}
            discordIdentity={props.discordIdentity}
          />
        </div>
      </div>
    </div>
  );
}

export default StandingsPage;