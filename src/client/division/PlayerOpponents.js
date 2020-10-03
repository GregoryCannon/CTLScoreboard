import "./PlayerOpponents.css";
import React from "react";

function PlayerOpponents(props) {
  return (
    <div className="Opponents-root">
      <div className="Flex-panel">
        <h4>Played Matches</h4>
        {props.scheduleInfo.playedList.map(entry => (
          <div>{entry.opponent + "\t" + entry.extraInfo}</div>
        ))}
      </div>

      <div className="Flex-panel">
        <h4>Upcoming Matches</h4>
        {props.scheduleInfo.unplayedList.map(entry => (
          <div>{entry.opponent + "\t" + entry.extraInfo}</div>
        ))}
      </div>
    </div>
  );
}

export default PlayerOpponents;
