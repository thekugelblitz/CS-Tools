import type {
  Currency,
  LootAccount,
  LootDrop,
  LootGoal,
  CollectionItem,
  FarmSummaryStats
} from './lootflow-types';
import { CS2_DROP_POOL } from './cs2-drop-pool';

const STORAGE_ACCOUNTS = 'lootflow_accounts_v1';
const STORAGE_DROPS = 'lootflow_drops_v1';
const STORAGE_GOALS = 'lootflow_goals_v1';
const STORAGE_CURRENCY = 'lootflow_currency_v1';

// Currency Rates vs Base USD
export const CURRENCY_RATES: Record<Currency, { rate: number; symbol: string; prefix: boolean }> = {
  USD: { rate: 1.0, symbol: '$', prefix: true },
  BRL: { rate: 5.65, symbol: 'R$ ', prefix: true },
  EUR: { rate: 0.92, symbol: '€', prefix: true },
  INR: { rate: 86.5, symbol: '₹', prefix: true },
  GBP: { rate: 0.78, symbol: '£', prefix: true }
};

export function convertValue(valueUsd: number, currency: Currency): number {
  const c = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  return valueUsd * c.rate;
}

export function formatMoney(valueUsd: number, currency: Currency): string {
  const c = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  const converted = valueUsd * c.rate;
  const formatted = converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${c.symbol}${formatted}`;
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// Tuesday 8:00 PM CT / Wednesday 00:00 UTC Reset Cycle Week ID
export function getCurrentTuesdayWeekId(date = new Date()): string {
  const d = new Date(date);
  // CS2 drops reset on Wednesday 00:00 UTC (which is Tuesday evening in Americas)
  // Calculate the most recent Tuesday
  const day = d.getUTCDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  const diff = (day >= 3) ? day - 2 : day + 5; // Distance to previous Tuesday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

// Initial Realistic Demo Data
export const DEMO_ACCOUNTS: LootAccount[] = [
  {
    id: 'acc-main',
    name: 'TheKugelBlitz (Main)',
    steamId: '76561198000000001',
    active: true,
    primeCost: 14.99,
    avatarUrl: 'https://avatars.akamai.steamstatic.com/bd44a769f5b88b66bb922967115499dbfdcf70b5_full.jpg',
    color: '#10b981',
    note: 'Primary competitive Premier account',
    rank: 28,
    xpWithinRank: 3150,
    weeklyXp: 3150,
    createdAt: '2026-01-10T12:00:00Z'
  },
  {
    id: 'acc-farm-1',
    name: 'DropFarmer_Alpha',
    steamId: '76561198000000002',
    active: true,
    primeCost: 14.99,
    avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    color: '#06b6d4',
    note: 'Dedicated weekly care package farmer',
    rank: 14,
    xpWithinRank: 4800,
    weeklyXp: 4800,
    createdAt: '2026-02-01T14:30:00Z'
  },
  {
    id: 'acc-smurf-2',
    name: 'Vortex_DropAlt',
    steamId: '76561198000000003',
    active: true,
    primeCost: 14.99,
    avatarUrl: 'https://avatars.steamstatic.com/76561198000000003_full.jpg',
    color: '#f59e0b',
    note: 'Secondary casual farm profile',
    rank: 6,
    xpWithinRank: 1200,
    weeklyXp: 1200,
    createdAt: '2026-02-15T09:15:00Z'
  }
];

const currentWeek = getCurrentTuesdayWeekId();

export const DEMO_DROPS: LootDrop[] = [
  // Current Week Drops
  {
    id: 'drop-01',
    accountId: 'acc-main',
    weekId: currentWeek,
    dropNumber: 1,
    itemName: 'Gallery Case',
    itemType: 'case',
    marketHashName: 'Gallery Case',
    imageUrl: CS2_DROP_POOL[0].imageUrl,
    steamValue: 1.45,
    cashoutValue: 1.30,
    sold: true,
    soldAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    note: 'Instant sale on Steam Community Market'
  },
  {
    id: 'drop-02',
    accountId: 'acc-main',
    weekId: currentWeek,
    dropNumber: 2,
    itemName: 'Desert Eagle | Mudder',
    itemType: 'weapon',
    wear: 'FT',
    float: 0.214,
    marketHashName: 'Desert Eagle | Mudder (Field-Tested)',
    imageUrl: CS2_DROP_POOL[9].imageUrl,
    steamValue: 0.12,
    sold: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString()
  },
  {
    id: 'drop-03',
    accountId: 'acc-farm-1',
    weekId: currentWeek,
    dropNumber: 1,
    itemName: 'Kilowatt Case',
    itemType: 'case',
    marketHashName: 'Kilowatt Case',
    imageUrl: CS2_DROP_POOL[1].imageUrl,
    steamValue: 0.95,
    cashoutValue: 0.88,
    sold: true,
    soldAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString()
  },
  {
    id: 'drop-04',
    accountId: 'acc-farm-1',
    weekId: currentWeek,
    dropNumber: 2,
    itemName: 'Sealed Graffiti | Karambit (Tracer Yellow)',
    itemType: 'graffiti',
    marketHashName: 'Sealed Graffiti | Karambit (Tracer Yellow)',
    imageUrl: CS2_DROP_POOL[15].imageUrl,
    steamValue: 0.06,
    sold: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString()
  },
  // Past Drops
  {
    id: 'drop-05',
    accountId: 'acc-main',
    weekId: '2026-03-10',
    dropNumber: 1,
    itemName: 'Dreams & Nightmares Case',
    itemType: 'case',
    marketHashName: 'Dreams & Nightmares Case',
    imageUrl: CS2_DROP_POOL[2].imageUrl,
    steamValue: 1.12,
    cashoutValue: 1.05,
    sold: true,
    soldAt: '2026-03-11T16:00:00Z',
    createdAt: '2026-03-11T12:00:00Z'
  },
  {
    id: 'drop-06',
    accountId: 'acc-main',
    weekId: '2026-03-10',
    dropNumber: 2,
    itemName: 'P250 | Cassette',
    itemType: 'weapon',
    wear: 'FN',
    float: 0.035,
    marketHashName: 'P250 | Cassette (Factory New)',
    imageUrl: CS2_DROP_POOL[11].imageUrl,
    steamValue: 0.18,
    sold: false,
    createdAt: '2026-03-11T13:30:00Z'
  },
  {
    id: 'drop-07',
    accountId: 'acc-farm-1',
    weekId: '2026-03-10',
    dropNumber: 1,
    itemName: 'Revolution Case',
    itemType: 'case',
    marketHashName: 'Revolution Case',
    imageUrl: CS2_DROP_POOL[3].imageUrl,
    steamValue: 0.38,
    cashoutValue: 0.35,
    sold: true,
    soldAt: '2026-03-12T10:00:00Z',
    createdAt: '2026-03-12T08:00:00Z'
  },
  {
    id: 'drop-08',
    accountId: 'acc-smurf-2',
    weekId: '2026-03-10',
    dropNumber: 1,
    itemName: 'Kilowatt Case',
    itemType: 'case',
    marketHashName: 'Kilowatt Case',
    imageUrl: CS2_DROP_POOL[1].imageUrl,
    steamValue: 0.95,
    cashoutValue: 0.90,
    sold: true,
    soldAt: '2026-03-13T14:00:00Z',
    createdAt: '2026-03-13T11:00:00Z'
  },
  {
    id: 'drop-09',
    accountId: 'acc-main',
    weekId: '2026-03-03',
    dropNumber: 1,
    itemName: 'MP9 | Starlight Protector',
    itemType: 'weapon',
    wear: 'MW',
    float: 0.089,
    marketHashName: 'MP9 | Starlight Protector (Minimal Wear)',
    imageUrl: CS2_DROP_POOL[10].imageUrl,
    steamValue: 4.80,
    cashoutValue: 4.50,
    sold: true,
    soldAt: '2026-03-04T18:00:00Z',
    createdAt: '2026-03-04T15:00:00Z',
    note: 'Lucky high tier classified drop!'
  },
  {
    id: 'drop-10',
    accountId: 'acc-farm-1',
    weekId: '2026-03-03',
    dropNumber: 1,
    itemName: 'Dreams & Nightmares Case',
    itemType: 'case',
    marketHashName: 'Dreams & Nightmares Case',
    imageUrl: CS2_DROP_POOL[2].imageUrl,
    steamValue: 1.12,
    cashoutValue: 1.05,
    sold: true,
    soldAt: '2026-03-05T19:00:00Z',
    createdAt: '2026-03-05T16:00:00Z'
  },
  {
    id: 'drop-11',
    accountId: 'acc-smurf-2',
    weekId: '2026-03-03',
    dropNumber: 1,
    itemName: 'Gallery Case',
    itemType: 'case',
    marketHashName: 'Gallery Case',
    imageUrl: CS2_DROP_POOL[0].imageUrl,
    steamValue: 1.45,
    cashoutValue: 1.35,
    sold: true,
    soldAt: '2026-03-06T12:00:00Z',
    createdAt: '2026-03-06T09:00:00Z'
  },
  {
    id: 'drop-12',
    accountId: 'acc-main',
    weekId: '2026-02-24',
    dropNumber: 1,
    itemName: 'Recoil Case',
    itemType: 'case',
    marketHashName: 'Recoil Case',
    imageUrl: CS2_DROP_POOL[4].imageUrl,
    steamValue: 0.28,
    cashoutValue: 0.25,
    sold: true,
    soldAt: '2026-02-25T11:00:00Z',
    createdAt: '2026-02-25T08:00:00Z'
  }
];

export const DEMO_GOALS: LootGoal[] = [
  {
    id: 'goal-prime-payback',
    name: 'Prime Investment Break-Even',
    targetAmount: 44.97, // 3 accounts * $14.99
    type: 'cashout',
    color: '#10b981',
    createdAt: '2026-01-10T12:00:00Z'
  },
  {
    id: 'goal-awp-asiimov',
    name: 'Target Skin: AWP | Asiimov (FT)',
    targetAmount: 85.00,
    type: 'revenue',
    targetItemName: 'AWP | Asiimov (Field-Tested)',
    targetItemImage: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7cqWdQ-sJ0xOzAot-jiQa2_kRla2qlINPBcQE7aQ7U_1G5xbznhMK-uZ_KyCZh7CJw5mGdwUI3PqFsmQ/360fx360f',
    deadline: '2026-12-31',
    color: '#f59e0b',
    createdAt: '2026-02-01T14:00:00Z'
  }
];

// Storage Engine
export class LootFlowStore {
  private accounts: LootAccount[] = [];
  private drops: LootDrop[] = [];
  private goals: LootGoal[] = [];
  private currency: Currency = 'USD';
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const rawAccounts = localStorage.getItem(STORAGE_ACCOUNTS);
      this.accounts = rawAccounts ? JSON.parse(rawAccounts) : [...DEMO_ACCOUNTS];

      const rawDrops = localStorage.getItem(STORAGE_DROPS);
      this.drops = rawDrops ? JSON.parse(rawDrops) : [...DEMO_DROPS];

      const rawGoals = localStorage.getItem(STORAGE_GOALS);
      this.goals = rawGoals ? JSON.parse(rawGoals) : [...DEMO_GOALS];

      const rawCurr = localStorage.getItem(STORAGE_CURRENCY) as Currency;
      this.currency = rawCurr && CURRENCY_RATES[rawCurr] ? rawCurr : 'USD';
    } catch {
      this.accounts = [...DEMO_ACCOUNTS];
      this.drops = [...DEMO_DROPS];
      this.goals = [...DEMO_GOALS];
      this.currency = 'USD';
    }
  }

  public saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(this.accounts));
      localStorage.setItem(STORAGE_DROPS, JSON.stringify(this.drops));
      localStorage.setItem(STORAGE_GOALS, JSON.stringify(this.goals));
      localStorage.setItem(STORAGE_CURRENCY, this.currency);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    this.notify();
  }

  public resetToDemo(): void {
    this.accounts = JSON.parse(JSON.stringify(DEMO_ACCOUNTS));
    this.drops = JSON.parse(JSON.stringify(DEMO_DROPS));
    this.goals = JSON.parse(JSON.stringify(DEMO_GOALS));
    this.currency = 'USD';
    this.saveToStorage();
  }

  public clearAllData(): void {
    this.accounts = [];
    this.drops = [];
    this.goals = [];
    this.saveToStorage();
  }

  // Getters
  public getAccounts(): LootAccount[] {
    return this.accounts;
  }

  public getDrops(): LootDrop[] {
    return this.drops;
  }

  public getGoals(): LootGoal[] {
    return this.goals;
  }

  public getCurrency(): Currency {
    return this.currency;
  }

  public setCurrency(c: Currency): void {
    this.currency = c;
    this.saveToStorage();
  }

  // Account CRUD
  public addAccount(account: Omit<LootAccount, 'id' | 'createdAt'>): LootAccount {
    const newAcc: LootAccount = {
      ...account,
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    this.accounts.push(newAcc);
    this.saveToStorage();
    return newAcc;
  }

  public updateAccount(id: string, updates: Partial<LootAccount>): void {
    const idx = this.accounts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.accounts[idx] = { ...this.accounts[idx], ...updates };
      this.saveToStorage();
    }
  }

  public deleteAccount(id: string): void {
    this.accounts = this.accounts.filter(a => a.id !== id);
    this.drops = this.drops.filter(d => d.accountId !== id);
    this.saveToStorage();
  }

  // Drop CRUD
  public addDrop(drop: Omit<LootDrop, 'id' | 'createdAt'>): LootDrop {
    const newDrop: LootDrop = {
      ...drop,
      id: `drop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    this.drops.unshift(newDrop);
    this.saveToStorage();
    return newDrop;
  }

  public toggleDropSold(id: string, customCashout?: number): void {
    const drop = this.drops.find(d => d.id === id);
    if (drop) {
      drop.sold = !drop.sold;
      if (drop.sold) {
        drop.soldAt = new Date().toISOString();
        if (customCashout !== undefined) {
          drop.cashoutValue = customCashout;
        } else if (!drop.cashoutValue) {
          drop.cashoutValue = drop.steamValue * 0.85; // Default Steam 15% fee deduction
        }
      } else {
        drop.soldAt = undefined;
      }
      this.saveToStorage();
    }
  }

  public deleteDrop(id: string): void {
    this.drops = this.drops.filter(d => d.id !== id);
    this.saveToStorage();
  }

  // Goal CRUD
  public addGoal(goal: Omit<LootGoal, 'id' | 'createdAt'>): LootGoal {
    const newGoal: LootGoal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    this.goals.push(newGoal);
    this.saveToStorage();
    return newGoal;
  }

  public deleteGoal(id: string): void {
    this.goals = this.goals.filter(g => g.id !== id);
    this.saveToStorage();
  }

  // Calculations & Analytics
  public getSummaryStats(): FarmSummaryStats {
    const currentWeekId = getCurrentTuesdayWeekId();
    const activeAccounts = this.accounts.filter(a => a.active);
    const maxDropsThisWeek = activeAccounts.length * 2;

    const dropsThisWeekList = this.drops.filter(d => d.weekId === currentWeekId);
    const dropsThisWeek = dropsThisWeekList.length;

    let totalSteamValue = 0;
    let totalCashout = 0;
    let bestDrop: LootDrop | null = null;

    this.drops.forEach(d => {
      totalSteamValue += d.steamValue;
      if (d.sold) {
        totalCashout += d.cashoutValue ?? (d.steamValue * 0.85);
      }
      if (!bestDrop || d.steamValue > bestDrop.steamValue) {
        bestDrop = d;
      }
    });

    const totalPrimeCost = activeAccounts.reduce((sum, a) => sum + (a.primeCost || 14.99), 0);
    // Net profit vs cashout + unsolds
    const netProfit = (totalCashout + (totalSteamValue - totalCashout * 0.85)) - totalPrimeCost;
    const roiPercent = totalPrimeCost > 0 ? ((totalSteamValue / totalPrimeCost) - 1) * 100 : 0;
    const paybackPercent = totalPrimeCost > 0 ? Math.min(100, (totalSteamValue / totalPrimeCost) * 100) : 100;

    // Estimate weeks to break even
    const averageDropValue = this.drops.length > 0 ? totalSteamValue / this.drops.length : 0;
    const expectedWeeklyDrops = activeAccounts.length * 2;
    const expectedWeeklyValue = expectedWeeklyDrops * (averageDropValue || 0.80);
    const remainingToPayback = Math.max(0, totalPrimeCost - totalSteamValue);
    const weeksToBreakEven = expectedWeeklyValue > 0 ? Math.ceil(remainingToPayback / expectedWeeklyValue) : 0;

    // Perfect week calculation
    const streaks = this.calculatePerfectWeeksStreaks();

    return {
      totalDrops: this.drops.length,
      dropsThisWeek,
      maxDropsThisWeek,
      totalSteamValue,
      totalCashout,
      totalPrimeCost,
      netProfit,
      roiPercent,
      paybackPercent,
      weeksToBreakEven,
      averageDropValue,
      bestDrop,
      perfectWeeksStreak: streaks.currentStreak,
      bestStreak: streaks.bestStreak
    };
  }

  // Calculate Perfect Weeks (all active accounts having 2 drops in that week)
  public calculatePerfectWeeksStreaks(): { currentStreak: number; bestStreak: number } {
    const activeCount = this.accounts.filter(a => a.active).length;
    if (activeCount === 0) return { currentStreak: 0, bestStreak: 0 };

    // Group drops by weekId and accountId
    const weekMap: Record<string, Set<string>> = {};
    this.drops.forEach(d => {
      if (!weekMap[d.weekId]) weekMap[d.weekId] = new Set();
      weekMap[d.weekId].add(d.accountId);
    });

    const sortedWeeks = Object.keys(weekMap).sort().reverse();
    let currentStreak = 0;
    let bestStreak = 0;
    let runningStreak = 0;

    for (let i = 0; i < sortedWeeks.length; i++) {
      const week = sortedWeeks[i];
      const accountsWithDrops = weekMap[week].size;
      // Perfect week if accounts with drops >= activeCount
      if (accountsWithDrops >= activeCount) {
        runningStreak++;
        if (i === currentStreak) {
          currentStreak = runningStreak;
        }
        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }

    return { currentStreak, bestStreak };
  }

  // Aggregated Discovered Collection Codex
  public getDiscoveredCollection(): CollectionItem[] {
    const map = new Map<string, CollectionItem>();

    this.drops.forEach(d => {
      const key = d.marketHashName || d.itemName;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (d.steamValue > existing.highestValue) {
          existing.highestValue = d.steamValue;
        }
        if (new Date(d.createdAt) < new Date(existing.firstSeen)) {
          existing.firstSeen = d.createdAt;
        }
        if (new Date(d.createdAt) > new Date(existing.lastSeen)) {
          existing.lastSeen = d.createdAt;
        }
      } else {
        map.set(key, {
          name: d.itemName,
          marketHashName: d.marketHashName,
          type: d.itemType,
          imageUrl: d.imageUrl,
          count: 1,
          highestValue: d.steamValue,
          firstSeen: d.createdAt,
          lastSeen: d.createdAt
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.highestValue - a.highestValue);
  }

  // Export & Import
  public exportCsv(): string {
    const headers = ['ID', 'Account ID', 'Item Name', 'Type', 'Wear', 'Float', 'Steam Value (USD)', 'Sold', 'Cashout Value (USD)', 'Date', 'Week ID'];
    const rows = this.drops.map(d => [
      d.id,
      d.accountId,
      `"${d.itemName}"`,
      d.itemType,
      d.wear || '',
      d.float || '',
      d.steamValue.toFixed(2),
      d.sold ? 'YES' : 'NO',
      d.cashoutValue ? d.cashoutValue.toFixed(2) : '',
      d.createdAt,
      d.weekId
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  public exportJson(): string {
    return JSON.stringify({
      accounts: this.accounts,
      drops: this.drops,
      goals: this.goals,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  public importJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.accounts) && Array.isArray(parsed.drops)) {
        this.accounts = parsed.accounts;
        this.drops = parsed.drops;
        this.goals = Array.isArray(parsed.goals) ? parsed.goals : [];
        this.saveToStorage();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Global Singleton for Client-side
export const lootStore = new LootFlowStore();
