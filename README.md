# CS2 Multi-Account Drop & XP Radar (AMOLED)

A high-performance, dark/AMOLED dashboard for Counter-Strike 2 players and multi-account managers to track weekly Care Package drops, weekly XP bonus multiplier brackets, service medal prestige, and account status.

---

## Features

- **CS2 Weekly Drop Reset Sync**: Synchronized to official CS2 reset (Wednesday 01:00 UTC / Tuesday 8:00 PM CT) with live countdown timer and cycle progress.
- **Weekly Drop Tracking**: 1-click claim toggle, estimated case market value, and dropped item logging.
- **XP & Multiplier Calculator**: Tracks current XP, automatic level-up at 5,000 XP, and calculates XP multiplier brackets (Overachieving ~3x, Standard 1.0x, Reduced 0.5x, Penalty 0.175x).
- **Service Medal Prestige Tracker**: Tracks progress towards Rank 40 and current year Service Medal tier (Tier 1 Grey through Tier 6 Ruby Red).
- **Fleet Views**: Toggle between high-density table view (ideal for 10-50+ accounts) and visual card grid.
- **Add & Resolve Accounts**: Supports numeric SteamID64, vanity custom URLs, profile links, and bulk pasting.
- **Zero Database Required**: Persists in browser `localStorage` with full JSON export and import capabilities.
- **Direct Steam Integration**: Direct links to Steam profiles and 1-click launch protocol (`steam://run/730/`) to launch CS2.

---

## Project Structure

```
├── src/
│   ├── components/       # Astro UI components (cards, tables, modals, countdown)
│   ├── layouts/          # Base layout with AMOLED dark styles
│   ├── lib/              # State management, types, timers, mock data
│   ├── pages/            # Dashboard page and Steam API endpoints
│   ├── scripts/          # Client-side reactivity and modal logic
│   └── styles/           # AMOLED CSS and utilities
├── astro.config.mjs      # Astro configuration
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### 3. Production Build
```bash
npm run build
npm run preview
```
