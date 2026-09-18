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

// -------------------------------------------------------------
// Scavenger & Intelligence Models
// -------------------------------------------------------------

export interface PlatformLinks {
  steamCommunity: string;
  leetify?: string;
  cstracker?: string;
  csstat?: string;
  faceit?: string;
  scopegg?: string;
}

export interface InventoryShowcaseItem {
  name: string;
  type: string;
  category: 'knife' | 'gloves' | 'medal' | 'case' | 'skin';
  rarityColor?: string;
  wear?: string;
  iconUrl: string;
  estimatedValue?: number;
}

export interface ScavengedPlayerProfile {
  steamId64: string;
  customUrl: string;
  personaName: string;
  realName?: string;
  avatarUrl: string;
  location?: string;
  memberSince?: string;
  vacBanned: boolean;
  communityBanned: boolean;
  hoursPlayedCs2: number;
  totalInventoryCount: number;
  featuredInventory: InventoryShowcaseItem[];
  platformLinks: PlatformLinks;
  combatStats: {
    hltvRating: number;
    kdRatio: number;
    adr: number;
    headshotPercentage: number;
    kastPercentage: number;
    leetifyAimScore: number;
    crosshairPlacementError: number; // degrees
    timeToDamageMs: number; // ms
    clutchSuccessRate: number; // %
    clutch1v1Rate?: number;
    entrySuccessRate?: number;
    faceitLevel: number;
    faceitElo: number;
    faceitUsername?: string;
    winRate: number;
    totalMatchesRecorded: number;
    matchesWon?: number;
    matchesLost?: number;
    matchesTied?: number;
    totalKills?: number;
    totalDeaths?: number;
    totalAssists?: number;
    totalRounds?: number;
    totalHeadshots?: number;
    premierCurrentRating?: number;
    premierPeakRating?: number;
    competitiveRank?: string;
    competitiveWins?: number;
    wingmanRank?: string;
    wingmanWins?: number;
    counterStrafingPct?: number;
    flashEfficiencySec?: number;
    utilityDamagePerRound?: number;
    openingDuelWinRate?: number;
    openingDuelAttemptRate?: number;
    recentFormStreak?: ('W' | 'L' | 'T')[];
    vacBansDetected?: {
      totalPlayersScanned: number;
      bannedPlayersFound: number;
      pendingEloRollback: number;
      bannedList: { personaName: string; steamId64: string; banType: string; matchId: string; dateBanned: string }[];
    };
    proComparison?: {
      tier1Pro: { persona: string; hltv: number; adr: number; hsPct: number; ttdMs: number; counterStrafePct: number };
      premierAvg: { ratingTier: string; hltv: number; adr: number; hsPct: number; ttdMs: number; counterStrafePct: number };
    };
    topWeapons?: { name: string; kills: number; hsPct: number; accuracy: number; damage: number }[];
    topMaps?: { name: string; matches: number; winRate: number }[];
  };
}

// -------------------------------------------------------------
// Hacker & Cheater Prediction Radar Models
// -------------------------------------------------------------

export type HackerThreatLevel = 'CLEAN' | 'SUSPECT' | 'HIGH_RISK' | 'FLAGGED';

export interface HackerVectorBreakdown {
  aimbotScore: number; // 0 - 100
  wallhackScore: number; // 0 - 100
  accountTrustScore: number; // 0 - 100 (100 = clean/trusted, 0 = fresh throwaway)
  reactionTimeAnomaly: number; // 0 - 100
  ratingSpikeAnomaly: number; // 0 - 100
}

export interface HackerScanResult {
  steamId64: string;
  personaName: string;
  avatarUrl?: string;
  threatScore: number; // 0 - 100%
  threatLevel: HackerThreatLevel;
  verdictTitle: string;
  verdictSummary: string;
  vectors: HackerVectorBreakdown;
  flags: string[];
  suspiciousRounds?: number[];
  scannedAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  steamId64: string;
  vanityUrl?: string;
  trackedProfiles: { steamId64: string; personaName: string; avatarUrl?: string }[];
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserAccount | null;
}

export interface WeeklyDropIntelligence {
  cycleStartUtc: string;
  cycleEndUtc: string;
  resetDayName: string;
  secondsRemaining: number;
  formattedTimeRemaining: string;
  isDropClaimed: boolean;
  isDropDue: boolean;
  statusTitle: string;
  confidenceScore: number;
  recentInventoryDrops: { name: string; type: string; dateFound: string; iconUrl: string; marketPrice?: number }[];
  xpWeeklyAccumulated: number;
  xpToNextRank: number;
  currentRank: number;
  weeklyMultiplierTier: '4x Bonus' | '2x Bonus' | '1x Standard' | '0.175x Reduced';
  recommendation: string;
}

export interface MatchPlayerScore {
  steamId64: string;
  personaName: string;
  avatarUrl?: string;
  team: 'CT' | 'T' | 'Team1' | 'Team2';
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  headshotPct: number;
  kast: number;
  hltvRating: number;
  aimRating?: number;
  mvps?: number;
  accuracyPct?: number;
  preaimDeg?: number;
  ttdMs?: number;
  hackerScan: HackerScanResult;
}

export interface DetailedMatch {
  id: string;
  scrapedMatchId?: string;
  serverRegion?: string;
  map: string;
  mode: 'Premier' | 'Competitive' | 'Wingman' | 'Faceit';
  date: string;
  duration: string;
  scoreTeam1: number;
  scoreTeam2: number;
  team1Name: string;
  team2Name: string;
  winnerTeam: 1 | 2 | 0; // 0 = tie
  demoShareCode?: string;
  sourceUrl?: string;
  hackerBadge: {
    threatLevel: 'CLEAN' | 'SUSPECT' | 'FLAGGED';
    titleText: string;
    shortTag: string;
    flaggedPlayer?: string;
  };
  userTelemetry?: {
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    headshotPct: number;
    hltvRating: number;
    accuracyPct?: number;
    preaimDeg?: number;
    ttdMs?: number;
  };
  players: MatchPlayerScore[];
  hackerRadarSummary: {
    totalScanned: number;
    cleanCount: number;
    suspectCount: number;
    flaggedCount: number;
    highestThreatPlayer?: string;
  };
}


