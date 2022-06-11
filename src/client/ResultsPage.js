import React, { Component } from "react";
import "./ResultsPage.css";

const util = require("../server/util");

// TODO move this to backend
const eloNames = {
  Charlie: "PASTELCHARLIE",
  Diggs: "DIGGS",
  doodle: "DOODLE",
  Gerhard: "GERHARD_ADLER",
  "Grand Designs": "GRANDDESIGNS",
  "mil0-": "MILO",
  Roman: "ANGRYRORO",
  WhiteMonster: "WHITE MONSTER",
  BillyMac: "BMAC",
  Maedhros: "MAEDHROS",
  Benfamir: "BENFAMIR",
  Peyton: "PEYTON",
  Flashmonger: "FLASHMONGER",
  TomelloSoulMan: "TOMELLO",
  Marts: "MARTS",
  Burritodad: "BURRITODAD",
  Hunn: "HUNN14",
  Frenchie: "FRENCHIESTFRIE",
  "Sleepy Samantha": "SAMANTHA",
  Lily: "SNOWLILYX",
  Junior: "JUNIOR",
  arbaro: "ARBARO",
  "Mario Lafleur": "MARIO LAFLEUR",
  mfrerck: "MFRERCK",
  "Richard Wolf VI": "RICHARD WOLF VI",
  Valid: "VALID",
  Schtoikle: "SCHTOIKLE",
  SirMaser: "SIRMASER",
  Tacomom18: "TACOMOM",
  DocPi: "DOC PI",
  YeehawMcKickass: "MCKICKASS",
  wdsubia: "WDSUBIA",
  Moon: "MOON",
  MrShadow: "MRSHADOW",
  Skai: "FRODO",
  TEMPHUiBIS: "TEMPHUIBIS",
  Dawson: "DAWSON",
  ElleryStacks: "ELLERYSTACKS",
  Odrachess: "ODRACHESS",
  "Lapis Lazuli": "LAPISLAZULI",
  Merle: "MERLE",
  Alphabet: "ALPHABETH",
  Chef: "CHEFGOBES",
  Zyxia: "ZYXIA",
  Cwiekoszczak: "CWIEKOSZCZAK",
  "og readmore": "OWEN",
  Zxvye: "ZXVYE",
  Bergtroll: "BERGTROLL",
  sixfour: "SIXFOUR",
  TapHeist: "HEIST",
  Muffyio: "MUFFYIO",
  careless: "CARELESS",
  Kanto: "KANTO",
  shulphuric: "SHULPHURIC",
  Tobs: "NOTOBIII",
  Archie: "ARCHNASH",
  weisbrot: "WEISBROT",
  Bendelson: "BENDY1",
  Bxnshy: "BXNSHY",
  tetristimer: "TETRISTIMER2000",
  LovenRazu: "LOVENRAZU",
  pumpyheart: "PUMPYHEART",
  DobREEE: "DOBRYCZLEK",
  Kyira: "KYIRA"
};

class ResultsPage extends Component {
  render() {
    return (
      <div className="Results-container">
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
            </tr>
            {this.props.matchList.map(match => {
              const homePlayer = match.winner_home ? match.winner : match.loser;
              const awayPlayer = match.winner_home ? match.loser : match.winner;
              const homeScore = match.winner_home
                ? match.winner_games
                : match.loser_games;
              const awayScore = match.winner_home
                ? match.loser_games
                : match.winner_games;

              return (
                <tr>
                  <td>{util.getMatchDateFormatted(match)}</td>
                  <td>{match.restreamer}</td>
                  <td>{eloNames[homePlayer]}</td>
                  <td>{homeScore}</td>
                  <td>{awayScore}</td>
                  <td>{eloNames[awayPlayer]}</td>
                  <td>{match.division}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default ResultsPage;
