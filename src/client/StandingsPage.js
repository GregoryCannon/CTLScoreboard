import React, { Component } from "react";
import ReportingPanel from "./ReportingPanel";
import MatchHistory from "./MatchHistory";
import Division from "./Division";
import "./StandingsPage.css";

class StandingsPage extends Component {
  constructor() {
    super();
    this.state = {
      sortByPoints: false
    };
  }

  render() {
    return (
      <div className="Standings-container">
        <div className="Left-panel">
          <div id="Page-1">
            {this.state.divisionData.slice(0, 4).map((division, i) => {
              return (
                <Division
                  key={i}
                  data={division}
                  sortByPoints={this.state.sortByPoints}
                  setSortByPoints={val => {
                    this.setState({
                      sortByPoints: val
                    });
                  }}
                />
              );
            })}
          </div>
          <div id="Page-2">
            {this.state.divisionData.slice(4).map((division, i) => {
              return (
                <Division
                  key={i}
                  data={division}
                  sortByPoints={this.state.sortByPoints}
                  setSortByPoints={val => {
                    this.setState({
                      sortByPoints: val
                    });
                  }}
                />
              );
            })}
          </div>
        </div>
        <div className="Right-panel">
          <div className="Reporting-panel-card">
            <ReportingPanel refreshFunction={this.refreshData} />
          </div>

          <div className="Match-history-card">
            <MatchHistory
              matchList={this.state.matchData}
              refreshFunction={this.refreshData}
              isAdmin={this.state.isAdmin}
            />
          </div>
        </div>
      </div>
    );
  }
}
export default StandingsPage;
