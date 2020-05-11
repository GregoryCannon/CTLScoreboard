import React, { Component } from "react";
import ReportingPanel from "./ReportingPanel";
import MatchHistory from "./MatchHistory";
import Division from "./Division";
import "./StandingsPage.css";
const util = require("../server/util");

class StandingsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sortByPoints: true
    };
  }

  getPages() {
    let pages = [];
    const PAGE_SIZE = util.divisionsPerPage;
    const divData = this.props.divisionData;

    for (let i = 0; i < divData.length; i += PAGE_SIZE) {
      pages.push(divData.slice(i, i + PAGE_SIZE));
    }
    return pages;
  }

  render() {
    return (
      <div className="Standings-container">
        <div className="Left-panel">
          {this.getPages().map((divisionDataSlice, index) => (
            <div id={"Page-" + (index + 1)}>
              {divisionDataSlice.map((division, i) => (
                <Division
                  key={division.name}
                  data={division}
                  sortByPoints={this.state.sortByPoints}
                  isAdmin={this.props.isAdmin}
                  setSortByPoints={val => {
                    this.setState({
                      sortByPoints: val
                    });
                  }}
                  isEditingPenaltyPoints={this.props.isEditingPenaltyPoints}
                  refreshFunction={this.props.refreshFunction}
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
