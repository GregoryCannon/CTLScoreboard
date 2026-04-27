import type { PlayerScheduleMatchInfo } from "../../types";
import "./PlayerOpponents.css";
import React from "react";

type PlayerOpponentsProps = {
  scheduleInfo: PlayerScheduleMatchInfo;
}

function PlayerOpponents(props: PlayerOpponentsProps) {
  return (
    <div className="Player-opponents">
      <div className="Flex-panel">
        <h4>Played Matches</h4>
        {props.scheduleInfo.playedList.map(entry => (
          <div key={`opponent-${entry.opponent}`}>{entry.opponent + "\t" + entry.extraInfo}</div>
        ))}
      </div>

      <div className="Flex-panel">
        <h4>Upcoming Matches</h4>
        {props.scheduleInfo.unplayedList.map(entry => (
          <div key={`upcoming-${entry.opponent}`}>{entry.opponent + "\t" + entry.extraInfo}</div>
        ))}
      </div>
    </div>
  );
}

export default PlayerOpponents;
