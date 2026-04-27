import "./AboutPage.css";

function AboutPage() {
  return (
    <div className="about-page">
      <p className="about-page-paragraph">
        The <strong>Classic Tetris League</strong> is a round-robin NES Tetris
        competition that counts some of the best Tetris players in the world
        among its participants. For more information or to learn how to
        participate as a player or commentator, join our <a href="https://discord.gg/wBfwwBVZTb">Discord</a> or 
        follow our <a href="https://twitch.tv/classictetrisleague">Twitch channel</a>.
      </p>
      <p className="about-page-pagagraph">
        <strong>Tetris for the Non-Pros</strong> serves as a place for sub-maxout players to play
        opponents of a similar skill level. We seek to be a welcoming place
        for players new to the cometitive classic Tetris scene. We offer round-robin divisions,
        a ladder league, weekly Elo shows, and more. For more
        information or to learn how to participate as a player or commentator,
        join tetris for the non-pros at <a href="https://tnp.tetris.lol">tnp.tetris.lol</a>.
      </p>
      <p className="about-page-pagagraph">
        The <strong>DAS League</strong> is a round-robin NES Tetris
        competition open to players of all skill levels. Only the press-and-hold DAS
        playstyle is allowed. For more information, join our <a href="https://discord.gg/taba4gjzvk">Discord</a>.
      </p>
    </div>
  );
}

export { AboutPage };