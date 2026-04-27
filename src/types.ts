
type CompetitionSettings = {
  abbreviation: string;
  buttonName: string;
  eloName: string;
  registrationBotInfo: {
    registrationOpen: boolean;
    divisions: string[];
    signupMessage: string;
    registrationClosedMessage: string;
  }
};

type Division = {
  settings: DivisionSettings;
  standings: PlayerStandings[];
};

type DivisionWithChances = Omit<Division, "standings"> & {
  standings: PlayerStandingsWithChances[];
}

type DivisionSettings = {
  divisionName: string;
  competition: string;
  completed: boolean;
  oneMatchPerPair: boolean;
  maxPointsPerMatch: number;
  numWinner: number;
  numPrizeMoney: number;
  bestOf: number,
  numAutoPromo: number;
  numPlayoffPromo: number;
  numPlayoffRelegate: number;
  numAutoRelegate: number;
  players: string[];
};

type PlayerStandings = {
  name: string;
  mp: number;
  wins: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  penaltyPoints: number;
};

type PlayerStandingsWithChances = PlayerStandings & {
  chances: PromoChances
};

type PromoChances = {
  autoPromo: number;
  playoffPromo: number;
  autoRelegation: number;
  playoffRelegation: number;
  divisionWin: number;
  prizeMoney: number;
};

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

type MatchSchedule = { homePlayerName: string, awayPlayerName: string }[]

type ScheduleMatchInfo = {
  opponent: string;
  extraInfo: string;
};

type PlayerScheduleMatchInfo = {
  playedList: ScheduleMatchInfo[];
  unplayedList: ScheduleMatchInfo[];
};

type Penalty = {
  player: string,
  points: number
}

type StandingsSpot = "Top" | "Bottom";

type GuaranteeType = "True" | "False";

type SimType = "WorstCase" | "BestCase";

type SortBy = "Points" | "Simulation";

type PrivilegeLevel = "Admin" | "Restreamer" | "Player";

type PlayerRow = {
  divisionName: string;
  playerName: string;
}

export type {
  CompetitionSettings,
  Division,
  DivisionWithChances,
  DivisionSettings,
  PlayerStandings,
  PlayerStandingsWithChances,
  PromoChances,
  Match,
  StandingsSpot,
  GuaranteeType,
  SimType,
  PlayerScheduleMatchInfo,
  SortBy,
  PrivilegeLevel,
  MatchSchedule,
  Penalty,
  PlayerRow
};