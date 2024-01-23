import React, { Component } from "react";

class AboutPage extends Component {
  render() {
    return (
      <div className="about-page">
        <div className="about-page-paragraph">
          The <strong>Classic Tetris League</strong> is a round-robin NES Tetris
          tournament that counts some of the best Tetris players in the world
          among its participants. For more information or to learn how to
          participate as a player or commentator, join our{" "}
          <a href="">Discord</a> or follow our
          <a href="">Twitch channel</a>.
        </div>
        <div className="about-page-pagagraph">
          <strong>Tetris for the Non-Pros</strong> is a round-robin NES Tetris
          tournament that serves as a place for sub-maxout players to play
          opponents of a similar skill level. It seeks to be a welcoming place
          for players new to the cometitive classic Tetris scene. For more
          information or to learn how to participate as a player or commentator,
          join our <a href="">Discord</a>.
        </div>
      </div>
    );
  }
}
