import type { SteamAccount } from './types';

export const INITIAL_DEMO_ACCOUNTS: SteamAccount[] = [
  {
    id: 'greatmahakaal-main',
    steamId64: '76561198287445170',
    customUrl: 'greatmahakaal',
    personaName: 'TheKugelBlitz',
    avatarUrl: 'https://avatars.akamai.steamstatic.com/bd44a769f5b88b66bb922967115499dbfdcf70b5_full.jpg',
    profileUrl: 'https://steamcommunity.com/id/greatmahakaal/',
    vacBanned: false,
    communityBanned: false,
    primeStatus: true,
    dropStatus: {
      claimed: false,
      claimedAt: null,
      notes: 'Weekly Care Package Available! Eligible for Weapon Case + Skin'
    },
    xpStatus: {
      currentRank: 38,
      currentXp: 3840,
      multiplier: 'overachieving',
      weeklyXpEarned: 2400,
      estimatedMatchesNeeded: 2
    },
    serviceMedal: {
      currentYear: 2026,
      tier: 2,
      serviceMedalsOwned: ['2026 Service Medal (Tier 2 Emerald)', 'Premier Season Four Medal'],
      ranksUntilNextMedal: 2
    },
    tags: ['Main Spotlight', '10-Yr Veteran', '★ Kukri Fade FN'],
    lastChecked: new Date().toISOString()
  },
  {
    id: 'demo-acc-2',
    steamId64: '76561198129847112',
    customUrl: 'shadow_farmer_01',
    personaName: '⚡ Shadow Farmer #1',
    avatarUrl: 'https://avatars.steamstatic.com/b5bd56c1aa99e44ba301c400495da6b43a395b27_full.jpg',
    profileUrl: 'https://steamcommunity.com/id/shadow_farmer_01',
    vacBanned: false,
    communityBanned: false,
    primeStatus: true,
    dropStatus: {
      claimed: true,
      claimedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      recentDrop: {
        id: 'drop-item-1',
        name: 'Kilowatt Case',
        type: 'case',
        marketPrice: 1.84,
        date: new Date(Date.now() - 28 * 3600 * 1000).toLocaleDateString()
      },
      notes: 'Dropped Kilowatt Case + Dual Berettas Colony'
    },
    xpStatus: {
      currentRank: 24,
      currentXp: 1200,
      multiplier: 'standard',
      weeklyXpEarned: 5200,
      estimatedMatchesNeeded: 8
    },
    serviceMedal: {
      currentYear: 2026,
      tier: 1,
      serviceMedalsOwned: ['2025 Service Medal'],
      ranksUntilNextMedal: 16
    },
    tags: ['Farmer', 'Completed'],
    lastChecked: new Date().toISOString()
  },
  {
    id: 'demo-acc-3',
    steamId64: '76561198284756193',
    customUrl: 'neon_rider_smurf',
    personaName: '🎯 Neon Smurf II',
    avatarUrl: 'https://avatars.steamstatic.com/9748bfa9fbef6bbd02d04a6011c7fae9c748c03c_full.jpg',
    profileUrl: 'https://steamcommunity.com/id/neon_rider_smurf',
    vacBanned: false,
    communityBanned: false,
    primeStatus: true,
    dropStatus: {
      claimed: false,
      claimedAt: null,
      notes: 'Drop available! Play Premier or Competitive'
    },
    xpStatus: {
      currentRank: 17,
      currentXp: 4900,
      multiplier: 'overachieving',
      weeklyXpEarned: 950,
      estimatedMatchesNeeded: 1
    },
    serviceMedal: {
      currentYear: 2026,
      tier: 2,
      serviceMedalsOwned: ['2024 Service Medal', '2025 Service Medal (Tier 2)'],
      ranksUntilNextMedal: 23
    },
    tags: ['Smurf', 'Drop Ready'],
    lastChecked: new Date().toISOString()
  },
  {
    id: 'demo-acc-4',
    steamId64: '76561198450192834',
    customUrl: 'afk_drops_omega',
    personaName: '💠 Drops Omega 04',
    avatarUrl: 'https://avatars.steamstatic.com/d94ee9fa2e414168ee3a44b1d7d07949ec60dc1e_full.jpg',
    profileUrl: 'https://steamcommunity.com/id/afk_drops_omega',
    vacBanned: false,
    communityBanned: false,
    primeStatus: true,
    dropStatus: {
      claimed: true,
      claimedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
      recentDrop: {
        id: 'drop-item-2',
        name: 'Dreams & Nightmares Case',
        type: 'case',
        marketPrice: 0.95,
        date: new Date(Date.now() - 52 * 3600 * 1000).toLocaleDateString()
      }
    },
    xpStatus: {
      currentRank: 31,
      currentXp: 480,
      multiplier: 'reduced',
      weeklyXpEarned: 8900,
      estimatedMatchesNeeded: 15
    },
    serviceMedal: {
      currentYear: 2026,
      tier: 1,
      serviceMedalsOwned: ['2026 Service Medal'],
      ranksUntilNextMedal: 9
    },
    tags: ['Farmer', 'Reduced XP'],
    lastChecked: new Date().toISOString()
  }
];
