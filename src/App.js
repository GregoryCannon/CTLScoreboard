import React, { Component } from "react";
import Division from "./Division";
import logo from "./logo.svg";
import "./App.css";

const divisionData = [{
  divisionName: "1",
  numWinner: 1,
  numAutoPromo: 0,
  numSoftPromo: 0,
  numSoftRelegate: 1,
  numHardRelegate: 1,
  standings: [
    {
      name: "ADAMMTS",
      mp: 10,
      wins: 6,
      losses: 4,
      gf: 21,
      ga: 18,
      gd: 3,
      pts: 27
    },
    {
      name: "MOHAMMAD",
      mp: 4,
      wins: 2,
      losses: 2,
      gf: 8,
      ga: 8,
      gd: 0,
      pts: 10
    },
    {
      name: "BATFOY",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "BATFOY",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "BATFOY",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "BATFOY",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "BATFOY",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "BATFOY",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
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
  standings: [
    {
      name: "PHAMTOM",
      mp: 4,
      wins: 3,
      losses: 1,
      gf: 11,
      ga: 5,
      gd: 6,
      pts: 14
    },
    {
      name: "TRISTOP",
      mp: 4,
      wins: 2,
      losses: 2,
      gf: 8,
      ga: 8,
      gd: 0,
      pts: 10
    },
    {
      name: "JAKEGAMES2",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "MOODEUCE",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "GALOOMBA",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "B14NK",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    },
    {
      name: "DIVCASTE",
      mp: 2,
      wins: 2,
      losses: 0,
      gf: 6,
      ga: 1,
      gd: 5,
      pts: 8
    }
  ]
}];

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to CTL</h2>
        </div>
        {divisionData.map((division,i) => {
          return (<Division key={i} data={division} />);
        })}
  
      </div>
    );
  }
}

export default App;
