# CS2 Multi-Account Drop & XP Radar (AMOLED)

A high-performance, dark/AMOLED dashboard for Counter-Strike 2 players and multi-account managers to track weekly Care Package drops, weekly XP bonus multiplier brackets, service medal prestige, and account status.

---

## 🚀 Dokploy One-Click Deployment Guide

This repository is pre-configured and 100% ready for instant deployment on **[Dokploy](https://dokploy.com/)** (as well as Coolify, Railway, or standard Docker).

### Option A: Deploy via Dokploy Application (Recommended)

1. In your Dokploy dashboard, navigate to your Project and click **Create Application**.
2. Select your Git provider (**GitHub / GitLab / Git**) and choose this repository.
3. In **Build Settings**:
   - **Build Type**: Choose **Dockerfile** (or **Nixpacks**).
   - **Dockerfile Path**: Leave as `./Dockerfile`.
   - **Port**: Enter `4321`.
4. (Optional) In the **Environment** tab:
   - `STEAM_API_KEY`: *(Optional)* Your Steam Web API Key from [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey).
5. In the **Domains** tab, add your domain (e.g. `cs.yourdomain.com`) with automatic Let's Encrypt SSL enabled.
6. Click **Deploy**! Dokploy will build the multi-stage image, start the container, and link the reverse proxy.

---

### Option B: Deploy via Dokploy Compose

1. In your Dokploy dashboard, click **Create Service** → **Compose**.
2. Select your Git repository and set Compose Path to `./docker-compose.yml`.
3. In the **Environment** tab, set any desired variables:
   ```env
   PORT=4321
   STEAM_API_KEY=your_key_here
   ```
4. Click **Deploy**. Dokploy will launch the compose service and manage the container lifecycle.

---

## 🐳 Docker Deployment (Local or VPS)

### Using Docker Compose
```bash
# Clone the repository
git clone <your-repo-url>
cd CS

# Start with Docker Compose
docker compose up -d
```
The dashboard is now live at [http://localhost:4321](http://localhost:4321).

### Using Docker CLI
```bash
# Build the production image
docker build -t cs2-drop-radar .

# Run container
docker run -d -p 4321:4321 --name cs2-drop-radar cs2-drop-radar
```

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
├── Dockerfile            # Optimized multi-stage Docker build for Dokploy/Production
├── docker-compose.yml    # One-click Compose deployment config
├── .dockerignore         # Docker ignore rules for fast caching
├── .env.example          # Sample environment variables
├── src/
│   ├── components/       # Astro UI components (cards, tables, modals, countdown)
│   ├── layouts/          # Base layout with AMOLED dark styles
│   ├── lib/              # State management, types, timers, mock data
│   ├── pages/            # Dashboard page and Steam API endpoints
│   ├── scripts/          # Client-side reactivity and modal logic
│   └── styles/           # AMOLED CSS and utilities
├── astro.config.mjs      # Astro configuration (Node SSR standalone)
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### 3. Production Build & Start
```bash
npm run build
npm run start
```
