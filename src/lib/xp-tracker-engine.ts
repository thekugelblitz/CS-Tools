/**
 * Standalone CS2 / CS:GO Profile Rank & XP Intelligence Engine
 * Inspired by verdammnis/csgo-xp-tracker, implemented 100% without hard dependencies
 * (No steam-user, No steam-totp, No credentials or Discord bot required).
 */

export interface RankInfo {
  level: number;
  name: string;
  tier: 'recruit' | 'corporal' | 'sergeant' | 'officer' | 'general';
}

export const CS2_RANKS: RankInfo[] = [
  { level: 1, name: 'Recruit', tier: 'recruit' },
  { level: 2, name: 'Private', tier: 'recruit' },
  { level: 3, name: 'Private', tier: 'recruit' },
  { level: 4, name: 'Private', tier: 'recruit' },
  { level: 5, name: 'Corporal', tier: 'corporal' },
  { level: 6, name: 'Corporal', tier: 'corporal' },
  { level: 7, name: 'Corporal', tier: 'corporal' },
  { level: 8, name: 'Corporal', tier: 'corporal' },
  { level: 9, name: 'Sergeant', tier: 'sergeant' },
  { level: 10, name: 'Sergeant', tier: 'sergeant' },
  { level: 11, name: 'Sergeant', tier: 'sergeant' },
  { level: 12, name: 'Sergeant', tier: 'sergeant' },
  { level: 13, name: 'Master Sergeant', tier: 'sergeant' },
  { level: 14, name: 'Master Sergeant', tier: 'sergeant' },
  { level: 15, name: 'Master Sergeant', tier: 'sergeant' },
  { level: 16, name: 'Master Sergeant', tier: 'sergeant' },
  { level: 17, name: 'Sergeant Major', tier: 'sergeant' },
  { level: 18, name: 'Sergeant Major', tier: 'sergeant' },
  { level: 19, name: 'Sergeant Major', tier: 'sergeant' },
  { level: 20, name: 'Sergeant Major', tier: 'sergeant' },
  { level: 21, name: 'Lieutenant', tier: 'officer' },
  { level: 22, name: 'Lieutenant', tier: 'officer' },
  { level: 23, name: 'Lieutenant', tier: 'officer' },
  { level: 24, name: 'Lieutenant', tier: 'officer' },
  { level: 25, name: 'Captain', tier: 'officer' },
  { level: 26, name: 'Captain', tier: 'officer' },
  { level: 27, name: 'Captain', tier: 'officer' },
  { level: 28, name: 'Captain', tier: 'officer' },
  { level: 29, name: 'Major', tier: 'officer' },
  { level: 30, name: 'Major', tier: 'officer' },
  { level: 31, name: 'Major', tier: 'officer' },
  { level: 32, name: 'Major', tier: 'officer' },
  { level: 33, name: 'Colonel', tier: 'officer' },
  { level: 34, name: 'Colonel', tier: 'officer' },
  { level: 35, name: 'Colonel', tier: 'officer' },
  { level: 36, name: 'Brigadier General', tier: 'general' },
  { level: 37, name: 'Major General', tier: 'general' },
  { level: 38, name: 'Lieutenant General', tier: 'general' },
  { level: 39, name: 'General', tier: 'general' },
  { level: 40, name: 'Global General', tier: 'general' }
];

export interface XpMultiplierStatus {
  tier: 'overachieving' | 'standard' | 'reduced' | 'penalty';
  label: string;
  multiplier: number;
  color: string;
  description: string;
}

export interface ServiceMedalProgress {
  currentRank: number;
  currentXp: number;
  xpToNextRank: number;
  rankProgressPercent: number;
  ranksUntilMedal: number;
  totalXpUntilMedal: number;
  multiplier: XpMultiplierStatus;
  estimates: {
    premierWinsNeeded: number; // Avg ~650 XP per win
    competitiveWinsNeeded: number; // Avg ~420 XP per win
    deathmatchesNeeded: number; // Avg ~120 XP per match
    wingmanWinsNeeded: number; // Avg ~210 XP per win
    hoursEstimate: number;
  };
}

/**
 * Evaluates weekly multiplier tier based on XP accumulated during current reset week.
 * Exact CS2 weekly brackets:
 * 0 - 4,500 XP: 4.0x Bonus XP
 * 4,500 - 7,500 XP: 2.0x / 1.0x Standard XP
 * 7,500 - 11,199 XP: Reduced XP
 * 11,200+ XP: 0.175x Penalty XP
 */
export function getWeeklyMultiplierTier(weeklyXpEarned: number): XpMultiplierStatus {
  if (weeklyXpEarned >= 11200) {
    return {
      tier: 'penalty',
      label: 'Reduced XP (0.175x)',
      multiplier: 0.175,
      color: '#ef4444',
      description: 'Weekly XP cap reached (>11,200 XP). Heavy reduction applied until Wednesday 00:00 UTC reset.'
    };
  }
  if (weeklyXpEarned >= 7500) {
    return {
      tier: 'reduced',
      label: 'Diminishing XP (0.5x)',
      multiplier: 0.5,
      color: '#f59e0b',
      description: 'High weekly XP. XP gain reduced until upcoming reset.'
    };
  }
  if (weeklyXpEarned >= 4500) {
    return {
      tier: 'standard',
      label: 'Standard XP (1.0x)',
      multiplier: 1.0,
      color: '#06b6d4',
      description: 'Normal XP rate. Weekly rank-up care package already unlocked.'
    };
  }
  return {
    tier: 'overachieving',
    label: '4x Overachieving Bonus',
    multiplier: 4.0,
    color: '#10b981',
    description: 'Weekly care package bonus active! First 4,500 XP earns 4x boosted XP.'
  };
}

/**
 * Calculates complete Service Medal progress and match time estimations.
 */
export function calculateMedalProgress(
  currentRank: number = 1,
  currentXp: number = 0,
  weeklyXp: number = 0
): ServiceMedalProgress {
  const boundedRank = Math.min(40, Math.max(1, currentRank));
  const boundedXp = Math.min(4999, Math.max(0, currentXp));
  const xpToNextRank = Math.max(0, 5000 - boundedXp);
  const rankProgressPercent = (boundedXp / 5000) * 100;

  const ranksUntilMedal = Math.max(0, 40 - boundedRank);
  const totalXpUntilMedal = (ranksUntilMedal * 5000) + xpToNextRank;

  const multiplier = getWeeklyMultiplierTier(weeklyXp || boundedXp);

  // Match requirement estimations based on average XP rewards
  const avgPremierXp = 650;
  const avgCompXp = 420;
  const avgDmXp = 120;
  const avgWingmanXp = 210;

  const premierWinsNeeded = Math.ceil(totalXpUntilMedal / avgPremierXp);
  const competitiveWinsNeeded = Math.ceil(totalXpUntilMedal / avgCompXp);
  const deathmatchesNeeded = Math.ceil(totalXpUntilMedal / avgDmXp);
  const wingmanWinsNeeded = Math.ceil(totalXpUntilMedal / avgWingmanXp);

  // Assuming ~35 mins per Premier/Comp, ~10 mins per DM, ~15 mins per Wingman
  const hoursEstimate = Math.round((premierWinsNeeded * 35) / 60);

  return {
    currentRank: boundedRank,
    currentXp: boundedXp,
    xpToNextRank,
    rankProgressPercent,
    ranksUntilMedal,
    totalXpUntilMedal,
    multiplier,
    estimates: {
      premierWinsNeeded,
      competitiveWinsNeeded,
      deathmatchesNeeded,
      wingmanWinsNeeded,
      hoursEstimate
    }
  };
}

export function getRankDetails(rankLevel: number): RankInfo {
  const bounded = Math.min(40, Math.max(1, rankLevel));
  return CS2_RANKS[bounded - 1];
}
