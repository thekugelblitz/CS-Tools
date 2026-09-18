export type Currency = 'USD' | 'BRL' | 'EUR' | 'INR' | 'GBP';

export type ItemWear = 'FN' | 'MW' | 'FT' | 'WW' | 'BS';

export type ItemType = 'case' | 'weapon' | 'sticker' | 'graffiti';

export interface LootAccount {
  id: string;
  name: string;
  steamId: string;
  active: boolean;
  primeCost: number; // Base currency: USD
  avatarUrl: string;
  color: string;
  note?: string;
  rank?: number; // 1-40
  xpWithinRank?: number; // 0-5000
  weeklyXp?: number; // accumulated XP this reset week
  createdAt: string;
}

export interface LootDrop {
  id: string;
  accountId: string;
  weekId: string; // YYYY-MM-DD of reset Tuesday
  dropNumber: 1 | 2;
  itemName: string;
  itemType: ItemType;
  wear?: ItemWear;
  float?: number;
  marketHashName: string;
  imageUrl: string;
  steamValue: number; // Base currency: USD
  cashoutValue?: number; // Base currency: USD
  sold: boolean;
  soldAt?: string;
  note?: string;
  createdAt: string;
}

export interface LootGoal {
  id: string;
  name: string;
  targetAmount: number; // Base currency: USD (or count if type === 'drops')
  type: 'revenue' | 'profit' | 'drops' | 'cashout';
  targetItemName?: string;
  targetItemImage?: string;
  deadline?: string;
  color: string;
  createdAt: string;
}

export interface CollectionItem {
  name: string;
  marketHashName: string;
  type: ItemType;
  imageUrl: string;
  count: number;
  highestValue: number;
  firstSeen: string;
  lastSeen: string;
}

export interface FarmSummaryStats {
  totalDrops: number;
  dropsThisWeek: number;
  maxDropsThisWeek: number;
  totalSteamValue: number;
  totalCashout: number;
  totalPrimeCost: number;
  netProfit: number;
  roiPercent: number;
  paybackPercent: number;
  weeksToBreakEven: number;
  averageDropValue: number;
  bestDrop: LootDrop | null;
  perfectWeeksStreak: number;
  bestStreak: number;
}
