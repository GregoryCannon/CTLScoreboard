import React, { Component } from "react";
import "./PenaltyPointsEditor.css";
import { getApiUrl } from "../util";

type PenaltyPointsEditorProps = {
  isAdmin: boolean;
  existingPenaltyPoints: number;
  isEditingPenaltyPoints: boolean;
  refreshFunction: () => void;
  playerName: string;
  divisionName: string;
}

function PenaltyPointsEditor(props: PenaltyPointsEditorProps) {
  const startEditing = () => {
    const numPoints = prompt("Enter the number of penalty points");
    if (numPoints != null && !Number.isNaN(Number(numPoints))) {
      submitPenaltyPoints(Number(numPoints));
    }
  }

  const submitPenaltyPoints = async (numPoints: number) => {
    try {
      const requestBody = {
        player: props.playerName,
        points: numPoints,
        divisionName: props.divisionName
      };

      const rawResponse = await fetch(getApiUrl("api/penalty"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
      });

      if (!rawResponse.ok) {
        throw new Error(`Penalty point submission failed with status ${rawResponse.status}`);
      }

      const response = await rawResponse.json();
      props.refreshFunction();

    } catch (err) {
      console.error(err);
    }
  }


  if (props.isAdmin && props.isEditingPenaltyPoints) {
    // Fixed number with 'edit' button
    return (
      <div>
        <div>{props.existingPenaltyPoints}</div>
        <button onClick={startEditing}>Edit</button>
      </div>
    );
   } else {
     // Standard view for non-admins
     return <div>{Math.round(props.existingPenaltyPoints)}</div>;
   }
}

export default PenaltyPointsEditor;
