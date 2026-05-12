type Match = {
  division: string;
  winner: string;
  loser: string;
  winner_games: number;
  loser_games: number;
  winner_home: boolean;
  match_date: number;
  report_date: number;
  vod_url: string;
  restreamer: string;
};

const checkMatchAlreadyExists = (
  matches: Match[], 
  division: string, 
  winner: string, 
  loser: string, 
  winnerHome: boolean
): boolean => {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (
      match.division === division &&
      match.winner === winner &&
      match.loser === loser &&
      match.winner_home === winnerHome
    ) {
      return true;
    }
    if (
      match.division === division &&
      match.winner === loser &&
      match.loser === winner &&
      match.winner_home !== winnerHome
    ) {
      return true;
    }
  }
  return false;
};

const checkPreviousMatchHasSameTime = (
  matches: Match[], 
  winner: string, 
  loser: string, 
  time: number
): boolean => {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    console.log(match);
    if (match.match_date !== time) continue;
    if (match.winner === winner && match.loser === loser) return true;
    if (match.loser === winner && match.winner === loser) return true;
  }
  return false;
};

const getMatchAlreadyExistsErrorMessage = (
  winner: string, 
  loser: string, 
  winnerHome: boolean
): string => {
  return (
    "A match has already been reported between " +
    winner +
    " and " +
    loser +
    " (with " +
    (winnerHome ? winner : loser) +
    " at home)"
  );
};

export {
  type Match,
  checkMatchAlreadyExists,
  checkPreviousMatchHasSameTime,
  getMatchAlreadyExistsErrorMessage
};
