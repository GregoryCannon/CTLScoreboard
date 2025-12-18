import React, { Component } from "react";
import ReportingPanel from "./ReportingPanel";
import MatchHistory from "./MatchHistory";
import Division from "./division/Division";
import "./StandingsPage.css";
import * as configData from '../server/config_data.js';

class StandingsPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      expandedPlayerRow: {
        divisionName: "",
        playerName: ""
      },
      showCompetition: ""
    };

    this.setExpandedPlayer = this.setExpandedPlayer.bind(this);
  }

  getPages() {
    let pages = [];
    const PAGE_SIZES = [2, 3, 3, 4, 4, 4, 5, 5, 5, 5];
    const divData = this.props.divisionData.filter(div => {
      const competition = this.state.showCompetition;
      const isCorrectCompetition = (competition === "") || (div.competition === competition);
      return (!div.completed && isCorrectCompetition);
    });

    let i = 0;
    for (const pageSize of PAGE_SIZES) {
      pages.push(divData.slice(i, i + pageSize));
      i += pageSize;
    }

    return pages;
  }

  setExpandedPlayer(playerName, divisionName) {
    this.setState({
      ...this.state,
      expandedPlayerRow: {
        divisionName,
        playerName
      }
    });
  }

  setShowCompetition(competition) {
    this.setState({
      ...this.state,
      showCompetition: competition
    });
  }

  render() {
    return (
      <div className="Standings-container">
        <div className="Left-panel">
          {configData.competitions.map(competition => (
            <button 
              className="Nav-button"
              onClick={() => this.setShowCompetition(competition.abbreviation)}
            >
              {competition.buttonName}
            </button>
          ))}
          <button
            className="Nav-button"
            onClick={() => this.setShowCompetition("")}
          >
            Show all
          </button>
          {this.getPages().map((divisionDataSlice, index) => (
            <div id={"Page-" + (index + 1)}>
              {divisionDataSlice.map((division, i) => (
                <Division
                  key={division.name}
                  data={division}
                  sortBy={this.props.sortBy}
                  isAdmin={this.props.isAdmin}
                  setSortBy={this.props.setSortBy}
                  expandedPlayerRow={this.state.expandedPlayerRow}
                  isEditingPenaltyPoints={this.props.isEditingPenaltyPoints}
                  refreshFunction={this.props.refreshFunction}
                  setExpandedPlayerFunc={this.setExpandedPlayer}
                  matchList={this.props.matchList}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="Right-panel">
          <div className="Reporting-panel-card">
            <ReportingPanel
              refreshFunction={this.props.refreshFunction}
              isRestreamer={this.props.isRestreamer}
              discordIdentity={this.props.discordIdentity}
            />
          </div>

          <div className="Match-history-card">
            <MatchHistory
              matchList={this.props.matchList}
              divisionList={this.props.divisionData.map(
                division => division.divisionName
              )}
              refreshFunction={this.props.refreshFunction}
              isAdmin={this.props.isAdmin}
              discordIdentity={this.props.discordIdentity}
            />
          </div>
        </div>
      </div>
    );
  }
}
export default StandingsPage;
