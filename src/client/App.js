import React, { Component } from "react";
import Division from "./Division";
import logo from "./logo.svg";
import "./App.css";

const divisionData = [
  {
    divisionName: "1",
    numWinner: 1,
    numAutoPromo: 0,
    numSoftPromo: 0,
    numSoftRelegate: 1,
    numHardRelegate: 1,
    players: [
      "adammts",
      "mohammad",
      "batfoy",
      "hydrantdude",
      "brodin",
      "beastinshen",
      "cheez_fish"
    ],
    standings: [
      {
        name: "hydrantdude",
        mp: 4,
        wins: 3,
        losses: 1,
        gf: 9,
        ga: 7,
        gd: 2,
        points: 12
      },
      {
        name: "batfoy",
        mp: 4,
        wins: 2,
        losses: 2,
        gf: 10,
        ga: 8,
        gd: 2,
        points: 12
      },
      {
        name: "brodin",
        mp: 2,
        wins: 2,
        losses: 0,
        gf: 6,
        ga: 2,
        gd: 4,
        points: 8
      },
      {
        name: "cheez_fish",
        mp: 6,
        wins: 0,
        losses: 6,
        gf: 7,
        ga: 18,
        gd: -11,
        points: 7
      },
      {
        name: "beastinshen",
        mp: 2,
        wins: 1,
        losses: 1,
        gf: 5,
        ga: 5,
        gd: 0,
        points: 6
      },
      {
        name: "mohammad",
        mp: 1,
        wins: 1,
        losses: 0,
        gf: 3,
        ga: 1,
        gd: 2,
        points: 4
      },
      {
        name: "adammts",
        mp: 1,
        wins: 1,
        losses: 0,
        gf: 3,
        ga: 2,
        gd: 1,
        points: 4
      }
    ]
  },

  {
    divisionName: "2",
    numWinner: 0,
    numAutoPromo: 1,
    numSoftPromo: 1,
    numSoftRelegate: 1,
    numHardRelegate: 1,
    players: [
      "phamtom",
      "tristop",
      "jakegames2",
      "moodeuce",
      "galoomba",
      "b14nk",
      "divcaste"
    ],
    standings: [
      {
        name: "moodeuce",
        mp: 3,
        wins: 2,
        losses: 1,
        gf: 6,
        ga: 6,
        gd: 0,
        points: 8
      },
      {
        name: "phamtom",
        mp: 2,
        wins: 1,
        losses: 1,
        gf: 5,
        ga: 3,
        gd: 2,
        points: 6
      },
      {
        name: "divcaste",
        mp: 1,
        wins: 1,
        losses: 0,
        gf: 3,
        ga: 2,
        gd: 1,
        points: 4
      },
      {
        name: "tristop",
        mp: 1,
        wins: 0,
        losses: 1,
        gf: 2,
        ga: 3,
        gd: -1,
        points: 2
      },
      {
        name: "galoomba",
        mp: 1,
        wins: 0,
        losses: 1,
        gf: 1,
        ga: 3,
        gd: -2,
        points: 1
      },
      {
        name: "jakegames2",
        mp: 0,
        wins: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0
      },
      {
        name: "b14nk",
        mp: 0,
        wins: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0
      }
    ]
  }
];

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to CTL</h2>
        </div>
        {divisionData.map((division, i) => {
          return <Division key={i} data={division} />;
        })}
      </div>
    );
  }
}

export default App;
