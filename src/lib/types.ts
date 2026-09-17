export type XpMultiplier = 'overachieving' | 'standard' | 'reduced' | 'penalty';

export type ServiceMedalTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface DropItem {
  id: string;
  name: string;
  type: 'case' | 'skin' | 'graffiti';
  iconUrl?: string;
  marketPrice?: number;
  date: string;
}

export interface PlayerMatchLog {
  id: string;
  timestamp: string;
  map: string;
  mode: 'Premier' | 'Competitive' | 'Wingman' | 'Deathmatch' | 'Casual';
  result: 'Win' | 'Loss' | 'Tie';
  roundsWon: number;
  roundsLost: number;
  kills: number;
  deaths: number;
  xpEarned: number;
  dropReceived?: boolean;
}

export interface SteamAccount {
  id: string;
  steamId64: string;
  customUrl?: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
  vacBanned: boolean;
  communityBanned: boolean;
  primeStatus: boolean;
  
  // Weekly Drop Tracking
  dropStatus: {
    claimed: boolean;
    claimedAt: string | null;
    recentDrop?: DropItem;
    notes?: string;
  };

  // XP Progress & Multiplier
  xpStatus: {
    currentRank: number; // 1 - 40
    currentXp: number; // 0 - 5000 within rank
    multiplier: XpMultiplier;
    weeklyXpEarned: number; // tracks weekly XP for multiplier bracket
    estimatedMatchesNeeded: number;
  };

  // Service Medal
  serviceMedal: {
    currentYear: number;
    tier: ServiceMedalTier;
    serviceMedalsOwned: string[];
    ranksUntilNextMedal: number; // 40 - currentRank
  };

  // Match History
  matchLogs?: PlayerMatchLog[];

  // Metadata
  tags?: string[];
  lastChecked: string;
  isPrivate?: boolean;
}

export interface ResetCycleInfo {
  nextResetTimestamp: number;
  formattedUtc: string;
  formattedLocal: string;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  cycleProgressPercent: number;
}

// Live Open API Models
export interface CS2MatchMap {
  id: number;
  name: string;
  team1_score: number;
  team2_score: number;
}

export interface CS2MatchTeam {
  id: number;
  name: string;
  score: number;
  rank: number;
}

export interface CS2Match {
  id: number;
  team1: CS2MatchTeam;
  team2: CS2MatchTeam;
  maps: CS2MatchMap[];
  best_of: number;
  date: string;
  event: string;
  winner?: {
    id: number;
    name: string;
  };
}

export interface ProPlayerStat {
  id: number;
  name: string;
  rank: number;
  k: number;
  d: number;
  swing: number;
  adr: number;
  kast: number;
  rating: number;
  N: number;
}

export interface CaseMarketPrice {
  name: string;
  marketHashName: string;
  lowestPrice: string;
  medianPrice: string;
  volume: string;
  lastUpdated: string;
  icon: string;
}
