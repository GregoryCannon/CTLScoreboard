import React, { Component } from "react";
import "./PenaltyPointsEditor.css";
const util = require("../../server/util");

class PenaltyPointsEditor extends Component {
  constructor(props) {
    super(props);

    this.submitPenaltyPoints = this.submitPenaltyPoints.bind(this);
    this.startEditing = this.startEditing.bind(this);
  }

  startEditing() {
    const numPoints = prompt("Enter the number of penalty points");
    if (numPoints != null) {
      this.submitPenaltyPoints(numPoints);
    }
  }

  submitPenaltyPoints(numPoints) {
    var request = new XMLHttpRequest();
    request.open("POST", util.getApiUrl("api/penalty"), true);
    request.setRequestHeader("Content-type", "application/json");

    // Set callback for response
    request.onload = function() {
      const response = JSON.parse(request.response);
      if (response.didSucceed) {
        // Refresh data
        this.props.refreshFunction();
      } else {
        alert(
          "Failed to report penalty points. Reason:\n\n" + response.errorMessage
        );
      }
    }.bind(this);

    // Send request to report penalty points
    const requestBody = {
      player: this.props.playerName,
      points: numPoints,
      divisionName: this.props.divisionName
    };
    request.send(JSON.stringify(requestBody));
  }

  render() {
    if (this.props.isAdmin && this.props.isEditingPenaltyPoints) {
      // Fixed number with 'edit' button
      return (
        <div>
          <div>{this.props.existingPenaltyPoints}</div>
          <button onClick={this.startEditing}>Edit</button>
        </div>
      );
    } else {
      // Standard view for non-admins
      return <div>{this.props.existingPenaltyPoints}</div>;
    }
  }
}

export default PenaltyPointsEditor;
