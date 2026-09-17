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
