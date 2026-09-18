import type {
  ScavengedPlayerProfile,
  DetailedMatch,
  WeeklyDropIntelligence,
  UserAccount,
  MatchPlayerScore
} from '../lib/types';
import {
  getCurrentUser,
  setCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  addTrackedProfile,
  removeTrackedProfile
} from '../lib/client-store';
import { getWeeklyResetCycle } from '../lib/drop-intelligence';

// Application State
let currentProfile: ScavengedPlayerProfile | null = null;
let currentMatches: DetailedMatch[] = [];
let currentDropIntel: WeeklyDropIntelligence | null = null;
let activeMatchFilter: 'all' | 'flagged' | 'clean' = 'all';
let countdownInterval: any = null;

// Entry Point
export function initDashboard() {
  setupAuth();
  setupQuickLook();
  setupMatchScorecardModal();
  setupSettingsModal();
  startWeeklyResetTimer();

  // Load initial search (or check URL params)
  const urlParams = new URLSearchParams(window.location.search);
  const initialPlayer = urlParams.get('player') || urlParams.get('steamId') || 'greatmahakaal';
  fetchPlayerIntel(initialPlayer);
}

// -------------------------------------------------------------
// Quick Look & Player Search Engine
// -------------------------------------------------------------

function setupQuickLook() {
  const searchInput = document.getElementById('input-quick-player-search') as HTMLInputElement | null;
  const searchBtn = document.getElementById('btn-execute-quick-search');
  const clearBtn = document.getElementById('btn-clear-quick-search');
  const trackBtn = document.getElementById('btn-track-this-player');
  const quickPills = document.querySelectorAll('.btn-quick-pill');

  // Input typing reactivity
  searchInput?.addEventListener('input', () => {
    if (clearBtn) {
      if (searchInput.value.trim().length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
  });

  // Clear button
  clearBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      clearBtn.classList.add('hidden');
      searchInput.focus();
    }
  });

  // Execute search on button click
  searchBtn?.addEventListener('click', () => {
    const q = searchInput?.value.trim();
    if (q) {
      fetchPlayerIntel(q);
    } else {
      showToast('Please enter a SteamID or vanity URL', 'warning');
    }
  });

  // Execute search on Enter key
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput?.value.trim();
      if (q) fetchPlayerIntel(q);
    }
  });

  // Quick suggestions pills
  quickPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const id = pill.getAttribute('data-id');
      if (id) {
        if (searchInput) searchInput.value = id;
        fetchPlayerIntel(id);
      }
    });
  });

  // Track Profile button
  trackBtn?.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) {
      // Open Auth modal if not logged in
      openAuthModal();
      showToast('Please sign in to track profiles', 'info');
      return;
    }

    if (!currentProfile) return;

    addTrackedProfile({
      steamId64: currentProfile.steamId64,
      personaName: currentProfile.personaName,
      avatarUrl: currentProfile.avatarUrl
    });

    renderTrackedProfiles();
    updateTrackButtonState();
    showToast(`Tracked ${currentProfile.personaName} in your account!`, 'success');
  });

  // Match filter tabs
  const filterBtns = document.querySelectorAll('.btn-match-filter');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.classList.remove('active', 'bg-zinc-800', 'text-white');
        b.classList.add('bg-zinc-900', 'text-zinc-400');
      });
      btn.classList.add('active', 'bg-zinc-800', 'text-white');
      btn.classList.remove('bg-zinc-900', 'text-zinc-400');

      activeMatchFilter = (btn.getAttribute('data-filter') as any) || 'all';
      renderMatchesList();
    });
  });

  // Competitive Intel Navigation Tabs (Matches, Aim, Weapons, Maps, Bans, Pro)
  const intelTabs = document.querySelectorAll('.btn-intel-tab');
  intelTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      intelTabs.forEach((t) => {
        t.classList.remove('active', 'bg-zinc-800', 'text-white');
        t.classList.add('bg-zinc-950', 'text-zinc-400');
      });
      tab.classList.add('active', 'bg-zinc-800', 'text-white');
      tab.classList.remove('bg-zinc-950', 'text-zinc-400');

      document.querySelectorAll('.intel-tab-pane').forEach((pane) => {
        pane.classList.add('hidden');
      });

      if (targetId) {
        document.getElementById(targetId)?.classList.remove('hidden');
      }
    });
  });
}

// -------------------------------------------------------------
// Fetch Scavenger Data from API
// -------------------------------------------------------------

async function fetchPlayerIntel(query: string) {
  const loading = document.getElementById('hub-loading-indicator');
  const dossier = document.getElementById('player-dossier-card');
  const searchInput = document.getElementById('input-quick-player-search') as HTMLInputElement | null;

  if (searchInput) searchInput.value = query;
  loading?.classList.remove('hidden');

  try {
    const res = await fetch(`/api/cs2/scavenger?player=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.success && data.profile) {
      currentProfile = data.profile;
      currentMatches = data.matches || [];
      currentDropIntel = data.dropIntelligence || null;

      renderPlayerDossier();
      renderMatchesList();
      updateTrackButtonState();

      // Update URL query state without reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('player', query);
      window.history.replaceState({}, '', newUrl.toString());
    } else {
      showToast(data.error || 'Failed to resolve player dossier', 'error');
    }
  } catch (err: any) {
    console.error('Scavenger fetch error:', err);
    showToast('Failed to connect to CS2 intelligence service', 'error');
  } finally {
    loading?.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// Render Player Profile & 360 Drop Intel
// -------------------------------------------------------------

function renderPlayerDossier() {
  if (!currentProfile) return;

  const p = currentProfile;
  const c = p.combatStats;

  // Header Elements
  const avatarEl = document.getElementById('hub-player-avatar') as HTMLImageElement | null;
  const personaEl = document.getElementById('hub-player-persona');
  const steamIdEl = document.getElementById('hub-player-steamid');
  const locationEl = document.getElementById('hub-player-location');
  const tenureEl = document.getElementById('hub-player-tenure');

  if (avatarEl) avatarEl.src = p.avatarUrl;
  if (personaEl) personaEl.textContent = p.personaName;
  if (steamIdEl) steamIdEl.textContent = p.steamId64;
  if (locationEl) locationEl.textContent = p.location || 'Global';
  if (tenureEl) tenureEl.textContent = p.memberSince || 'CS2 Player';

  // Cross links
  const linkSteam = document.getElementById('hub-link-steam') as HTMLAnchorElement | null;
  const linkCsstat = document.getElementById('hub-link-csstat') as HTMLAnchorElement | null;
  const linkCstracker = document.getElementById('hub-link-cstracker') as HTMLAnchorElement | null;

  if (linkSteam) linkSteam.href = p.platformLinks.steamCommunity;
  if (linkCsstat) linkCsstat.href = p.platformLinks.csstat;
  if (linkCstracker) linkCstracker.href = p.platformLinks.cstracker;

  // Ranks
  const premierEl = document.getElementById('hub-rank-premier');
  const premierPeakEl = document.getElementById('hub-rank-premier-peak');
  const compEl = document.getElementById('hub-rank-comp');
  const compWinsEl = document.getElementById('hub-rank-comp-wins');
  const wingmanEl = document.getElementById('hub-rank-wingman');

  if (premierEl) premierEl.textContent = c.premierCurrentRating ? c.premierCurrentRating.toLocaleString() : 'Unranked';
  if (premierPeakEl) premierPeakEl.textContent = c.premierPeakRating ? `Peak: ${c.premierPeakRating.toLocaleString()}` : '';
  if (compEl) compEl.textContent = c.competitiveRank || 'Gold Nova III';
  if (compWinsEl) compWinsEl.textContent = `${c.competitiveWins || 0} Wins`;
  if (wingmanEl) wingmanEl.textContent = c.wingmanRank || 'Master Guardian II';

  // Combat Stats
  const hltvEl = document.getElementById('hub-stat-hltv');
  const kdEl = document.getElementById('hub-stat-kd');
  const killsEl = document.getElementById('hub-stat-kills');
  const adrEl = document.getElementById('hub-stat-adr');
  const hsEl = document.getElementById('hub-stat-hs');
  const kastEl = document.getElementById('hub-stat-kast');
  const clutchEl = document.getElementById('hub-stat-clutch');

  if (hltvEl) hltvEl.textContent = c.hltvRating.toFixed(2);
  if (kdEl) kdEl.textContent = c.kdRatio.toFixed(2);
  if (killsEl) killsEl.textContent = `${c.totalKills.toLocaleString()} / ${c.totalDeaths.toLocaleString()}`;
  if (adrEl) adrEl.textContent = c.adr.toFixed(1);
  if (hsEl) hsEl.textContent = `${c.headshotPercentage.toFixed(1)}%`;
  if (kastEl) kastEl.textContent = `${c.kastPercentage.toFixed(0)}%`;
  if (clutchEl) clutchEl.textContent = `${c.clutch1v1Rate.toFixed(0)}%`;

  // Drop Intel
  const dropBadge = document.getElementById('hub-drop-badge');
  const dropAudit = document.getElementById('hub-drop-audit-text');
  const xpText = document.getElementById('hub-xp-text');
  const xpBar = document.getElementById('hub-xp-bar');

  if (currentDropIntel) {
    const isClaimed = currentDropIntel.status === 'CLAIMED';
    if (dropBadge) {
      dropBadge.className = isClaimed
        ? 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-500/40'
        : 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-yellow-950 text-yellow-400 border border-yellow-500/40 animate-pulse';
      dropBadge.textContent = isClaimed ? '✓ WEEKLY DROP CLAIMED' : '⚠️ CARE PACKAGE DUE';
    }

    if (dropAudit) {
      dropAudit.textContent = isClaimed
        ? (currentDropIntel.recentDroppedItem?.name ? `${currentDropIntel.recentDroppedItem.name} ($${currentDropIntel.recentDroppedItem.estimatedValue.toFixed(2)}) in inventory` : 'Drop package redeemed this cycle')
        : `${currentDropIntel.xpEarnedInCycle.toLocaleString()} / 5,000 XP — Profile Rank-Up needed`;
    }

    if (xpText) xpText.textContent = `${currentDropIntel.xpEarnedInCycle.toLocaleString()} / 5,000`;
    if (xpBar) {
      const pct = Math.min(100, Math.round((currentDropIntel.xpEarnedInCycle / 5000) * 100));
      xpBar.style.width = `${pct}%`;
    }
  }

  // 1. Render Recent Form Streak (Competitor feature)
  const streakContainer = document.getElementById('hub-form-streak-container');
  if (streakContainer && c.recentFormStreak) {
    streakContainer.innerHTML = c.recentFormStreak.map((res) => {
      const isW = res === 'W';
      const isL = res === 'L';
      const colorClass = isW
        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
        : isL
        ? 'bg-red-950 text-red-400 border-red-500/40'
        : 'bg-yellow-950 text-yellow-400 border-yellow-500/40';
      return `<span class="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-black border ${colorClass}">${res}</span>`;
    }).join('');
  }

  // 2. Render Leetify Aim & Utility metrics
  const elCrosshair = document.getElementById('intel-crosshair');
  const elTtd = document.getElementById('intel-ttd');
  const elStrafe = document.getElementById('intel-counter-strafe');
  const elFlash = document.getElementById('intel-flash');
  const elOpening = document.getElementById('intel-opening');
  const elUtility = document.getElementById('intel-utility');

  if (elCrosshair && c.crosshairPlacementError) elCrosshair.textContent = `${c.crosshairPlacementError.toFixed(1)}°`;
  if (elTtd && c.timeToDamageMs) elTtd.textContent = `${c.timeToDamageMs} ms`;
  if (elStrafe && c.counterStrafingPct) elStrafe.textContent = `${c.counterStrafingPct.toFixed(1)}%`;
  if (elFlash && c.flashEfficiencySec) elFlash.textContent = `${c.flashEfficiencySec.toFixed(2)}s`;
  if (elOpening && c.openingDuelWinRate) elOpening.textContent = `${c.openingDuelWinRate.toFixed(1)}%`;
  if (elUtility && c.utilityDamagePerRound) elUtility.textContent = `${c.utilityDamagePerRound.toFixed(1)} ADR`;

  // 3. Render Weapon Arsenal Grid (CSTracker / HLTV feature)
  const weaponsContainer = document.getElementById('intel-weapons-grid');
  if (weaponsContainer && c.topWeapons) {
    weaponsContainer.innerHTML = c.topWeapons.map((w) => {
      return `
        <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-white text-sm">${w.name}</span>
            <span class="text-xs font-mono font-bold text-emerald-400">${w.kills.toLocaleString()} Kills</span>
          </div>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between text-zinc-400">
              <span>Headshot Ratio</span>
              <strong class="text-white font-mono">${w.hsPct}%</strong>
            </div>
            <div class="w-full h-1.5 bg-black rounded-full overflow-hidden">
              <div class="h-full bg-yellow-400" style="width: ${w.hsPct}%"></div>
            </div>
          </div>
          <div class="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
            <span>Accuracy: ${w.accuracy}%</span>
            <span>Damage: ${w.damage.toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 4. Render Active Duty Maps Grid (Leetify / HLTV feature)
  const mapsContainer = document.getElementById('intel-maps-grid');
  if (mapsContainer && c.topMaps) {
    mapsContainer.innerHTML = c.topMaps.map((m) => {
      const isPositive = m.winRate >= 50;
      return `
        <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-white text-sm uppercase tracking-wider">${m.name.replace('de_', '')}</span>
            <span class="text-xs font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-zinc-400'}">${m.winRate.toFixed(1)}% WR</span>
          </div>
          <div class="w-full h-1.5 bg-black rounded-full overflow-hidden">
            <div class="h-full ${isPositive ? 'bg-emerald-400' : 'bg-red-400'}" style="width: ${m.winRate}%"></div>
          </div>
          <div class="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>${m.matches} Matches Played</span>
            <span class="text-zinc-400">${isPositive ? 'Favored Map' : 'Needs Practice'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. Render Pro Benchmarks
  const proHltv = document.getElementById('pro-comp-hltv');
  const proAdr = document.getElementById('pro-comp-adr');
  const proHs = document.getElementById('pro-comp-hs');
  const proTtd = document.getElementById('pro-comp-ttd');
  const proStrafe = document.getElementById('pro-comp-strafe');

  if (proHltv) proHltv.textContent = c.hltvRating.toFixed(2);
  if (proAdr) proAdr.textContent = c.adr.toFixed(1);
  if (proHs) proHs.textContent = `${c.headshotPercentage.toFixed(1)}%`;
  if (proTtd && c.timeToDamageMs) proTtd.textContent = `${c.timeToDamageMs} ms`;
  if (proStrafe && c.counterStrafingPct) proStrafe.textContent = `${c.counterStrafingPct.toFixed(1)}%`;
}

// -------------------------------------------------------------
// Render Matches List (with prominent Title Hacker Indication)
// -------------------------------------------------------------

function renderMatchesList() {
  const container = document.getElementById('hub-matches-list');
  const countBadge = document.getElementById('hub-match-count-badge');
  if (!container) return;

  let filtered = currentMatches;
  if (activeMatchFilter === 'flagged') {
    filtered = currentMatches.filter(m => m.hackerBadge.threatLevel === 'FLAGGED' || m.hackerBadge.threatLevel === 'SUSPECT');
  } else if (activeMatchFilter === 'clean') {
    filtered = currentMatches.filter(m => m.hackerBadge.threatLevel === 'CLEAN');
  }

  if (countBadge) countBadge.textContent = `${filtered.length} Match${filtered.length === 1 ? '' : 'es'}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
        <p class="text-sm font-bold text-zinc-400">No matches found matching filter "${activeMatchFilter}".</p>
        <button class="btn-match-filter text-xs font-bold text-emerald-400 underline cursor-pointer" data-filter="all">Reset filter</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((m) => {
    const isWin = m.winnerTeam === 1;
    const isLoss = m.winnerTeam === 2;
    const isTie = m.winnerTeam === 0;

    const scorePill = isWin
      ? '<span class="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-xs font-black">WIN</span>'
      : isLoss
      ? '<span class="px-2.5 py-1 rounded-lg bg-red-950/80 text-red-400 border border-red-500/30 text-xs font-black">LOSS</span>'
      : '<span class="px-2.5 py-1 rounded-lg bg-yellow-950/80 text-yellow-400 border border-yellow-500/30 text-xs font-black">TIE</span>';

    const isFlagged = m.hackerBadge.threatLevel === 'FLAGGED';
    const isSuspect = m.hackerBadge.threatLevel === 'SUSPECT';

    const threatTag = isFlagged
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-950 text-red-400 border border-red-500/40">🚨 CHEATER FLAGGED</span>'
      : isSuspect
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-950 text-yellow-400 border border-yellow-500/40">⚠️ SUSPICIOUS</span>'
      : '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30">✓ CLEAN</span>';

    const u = m.userTelemetry;

    return `
      <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border ${isFlagged ? 'border-red-500/30 bg-red-950/10' : 'border-white/[0.06]'} transition flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Left: Match Identity & Hacker Indication in Title -->
        <div class="space-y-1.5 flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            ${scorePill}
            <span class="font-mono font-black text-white text-sm sm:text-base">${m.scoreTeam1} - ${m.scoreTeam2}</span>
            <span class="text-zinc-600">·</span>
            <span class="font-bold text-white text-xs sm:text-sm">${m.map}</span>
            <span class="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">${m.mode}</span>
            <span class="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">${m.serverRegion}</span>
            ${threatTag}
          </div>

          <!-- MATCH TITLE WITH EXPLICIT HACKER STATUS -->
          <h3 class="text-xs sm:text-sm font-extrabold text-zinc-200 truncate ${isFlagged ? 'text-red-300' : ''}">
            ${m.hackerBadge.titleText}
          </h3>

          <div class="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-500">
            <span>Duration: ${m.duration}</span>
            <span>·</span>
            <span>${m.date}</span>
          </div>
        </div>

        <!-- Middle: User's Combat Line in this Match -->
        <div class="flex items-center gap-3 sm:gap-4 shrink-0 bg-black/40 px-3 py-2 rounded-xl border border-white/[0.04] text-xs font-mono">
          <div>
            <span class="text-[10px] text-zinc-500 block">K / D / A</span>
            <span class="font-bold text-white">${u.kills} / ${u.deaths} / ${u.assists}</span>
          </div>
          <div>
            <span class="text-[10px] text-zinc-500 block">ADR</span>
            <span class="font-bold text-cyan-400">${u.adr.toFixed(1)}</span>
          </div>
          <div>
            <span class="text-[10px] text-zinc-500 block">HS%</span>
            <span class="font-bold ${u.headshotPct >= 60 ? 'text-red-400' : 'text-zinc-300'}">${u.headshotPct.toFixed(0)}%</span>
          </div>
          <div>
            <span class="text-[10px] text-zinc-500 block">HLTV</span>
            <span class="font-bold ${u.hltvRating >= 1.3 ? 'text-emerald-400' : 'text-zinc-300'}">${u.hltvRating.toFixed(2)}</span>
          </div>
        </div>

        <!-- Right: Inspect Scoreboard Button -->
        <div class="shrink-0 flex items-center justify-end">
          <button
            class="btn-inspect-match w-full sm:w-auto px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-emerald-500 hover:text-black text-white text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer border border-white/[0.08]"
            data-match-id="${m.id}"
            title="Inspect 10-Player Full Roster"
          >
            <span>Scoreboard</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Match Scorecard Modal (Full 5v5 10-Player Roster)
// -------------------------------------------------------------

function setupMatchScorecardModal() {
  const modal = document.getElementById('modal-match-scorecard');
  const closeBtn = document.getElementById('btn-close-scorecard');
  const copyBtn = document.getElementById('btn-copy-share-code');
  const copyBtnMobile = document.getElementById('btn-copy-share-code-mobile');

  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Delegated click listener for Scoreboard buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest('.btn-inspect-match');
    if (btn) {
      const matchId = btn.getAttribute('data-match-id');
      const match = currentMatches.find(m => m.id === matchId || m.scrapedMatchId === matchId) || currentMatches[0];
      if (match) {
        openScorecard(match);
      }
    }
  });

  function openScorecard(m: DetailedMatch) {
    if (!modal) return;

    const titleEl = document.getElementById('scorecard-match-title');
    const metaEl = document.getElementById('scorecard-match-meta');
    const verdictEl = document.getElementById('scorecard-match-verdict');
    const t1TitleEl = document.getElementById('scorecard-team1-title');
    const t2TitleEl = document.getElementById('scorecard-team2-title');
    const t1Body = document.getElementById('scorecard-team1-body');
    const t2Body = document.getElementById('scorecard-team2-body');

    if (titleEl) titleEl.textContent = `${m.map} (${m.mode}) · ${m.scoreTeam1} - ${m.scoreTeam2}`;
    if (metaEl) metaEl.textContent = `${m.serverRegion} Server · Duration: ${m.duration} · ${m.date}`;

    // Verdict Badge
    if (verdictEl) {
      if (m.hackerRadarSummary.flaggedCount > 0) {
        verdictEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase bg-red-950 text-red-400 border border-red-500/40';
        verdictEl.textContent = `🚨 ${m.hackerRadarSummary.flaggedCount} Cheater Flagged`;
      } else if (m.hackerRadarSummary.suspectCount > 0) {
        verdictEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase bg-yellow-950 text-yellow-400 border border-yellow-500/40';
        verdictEl.textContent = '⚠️ 1 Suspect Player';
      } else {
        verdictEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30';
        verdictEl.textContent = '✓ 100% Clean Match';
      }
    }

    if (t1TitleEl) t1TitleEl.textContent = `${m.team1Name} (${m.scoreTeam1} Rounds)`;
    if (t2TitleEl) t2TitleEl.textContent = `${m.team2Name} (${m.scoreTeam2} Rounds)`;

    // Demo copy handler
    const handleCopy = () => {
      const code = m.demoShareCode || 'CSGO-mK49B-8LpwA-Q9J9H-N8uF5-RkmzE';
      navigator.clipboard.writeText(code);
      showToast(`Match Demo Code copied: ${code}`, 'success');
    };

    if (copyBtn) copyBtn.onclick = handleCopy;
    if (copyBtnMobile) copyBtnMobile.onclick = handleCopy;

    // Split 10 players into Team 1 (5 players) and Team 2 (5 players)
    const team1Players = m.players.filter(p => p.team === 'Team1' || p.team === 'CT');
    const team2Players = m.players.filter(p => p.team === 'Team2' || p.team === 'T');

    const renderPlayerRow = (p: MatchPlayerScore) => {
      const isTarget = currentProfile && (p.steamId64 === currentProfile.steamId64 || p.personaName === currentProfile.personaName);
      const isFlagged = p.hackerScan?.threatLevel === 'FLAGGED';
      const isSuspect = p.hackerScan?.threatLevel === 'SUSPECT' || p.hackerScan?.threatLevel === 'HIGH_RISK';

      const threatBadge = isFlagged
        ? '<span class="px-2 py-0.5 rounded bg-red-900/90 text-red-200 border border-red-500 font-bold text-[10px] whitespace-nowrap">🚨 FLAGGED</span>'
        : isSuspect
        ? '<span class="px-2 py-0.5 rounded bg-yellow-900/90 text-yellow-200 border border-yellow-500 font-bold text-[10px] whitespace-nowrap">⚠️ SUSPECT</span>'
        : '<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] whitespace-nowrap">✓ CLEAN</span>';

      return `
        <tr class="hover:bg-white/[0.03] transition ${isTarget ? 'bg-emerald-950/30' : isFlagged ? 'bg-red-950/20' : ''}">
          <td class="py-2.5 px-3 sm:px-4">
            <div class="flex items-center gap-2 sm:gap-2.5">
              <div class="w-7 h-7 rounded-lg overflow-hidden border border-white/[0.1] bg-black shrink-0">
                <img src="${p.avatarUrl || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'}" class="w-full h-full object-cover" />
              </div>
              <div class="min-w-0">
                <span class="font-bold text-white block truncate text-xs ${isTarget ? 'text-emerald-400' : ''}">
                  ${p.personaName} ${isTarget ? '<span class="text-[10px] text-emerald-300">(You)</span>' : ''}
                </span>
                <span class="font-mono text-[9px] text-zinc-500 block truncate">${p.steamId64}</span>
              </div>
            </div>
          </td>
          <td class="py-2.5 px-2 text-center font-bold text-white">${p.kills} / ${p.deaths} / ${p.assists}</td>
          <td class="py-2.5 px-2 text-center text-zinc-300">${p.adr.toFixed(1)}</td>
          <td class="py-2.5 px-2 text-center ${p.headshotPct >= 70 ? 'text-red-400 font-bold' : 'text-zinc-300'}">${p.headshotPct.toFixed(0)}%</td>
          <td class="py-2.5 px-2 text-center text-zinc-400">${p.kast.toFixed(0)}%</td>
          <td class="py-2.5 px-2 text-center font-black ${p.hltvRating >= 1.3 ? 'text-emerald-400' : 'text-zinc-300'}">${p.hltvRating.toFixed(2)}</td>
          <td class="py-2.5 px-3 sm:px-4 text-right">
            ${threatBadge}
          </td>
        </tr>
      `;
    };

    if (t1Body) t1Body.innerHTML = team1Players.map(renderPlayerRow).join('');
    if (t2Body) t2Body.innerHTML = team2Players.map(renderPlayerRow).join('');

    modal.classList.remove('hidden');
  }
}

// -------------------------------------------------------------
// Authentication & User Profile Management
// -------------------------------------------------------------

function setupAuth() {
  const openAuthBtn = document.getElementById('btn-nav-open-auth');
  const userMenuBtn = document.getElementById('btn-nav-user-menu');
  const modal = document.getElementById('modal-auth');
  const closeBtn = document.getElementById('btn-close-auth');
  const formSignIn = document.getElementById('form-sign-in') as HTMLFormElement | null;
  const formSignUp = document.getElementById('form-sign-up') as HTMLFormElement | null;
  const authTabs = document.querySelectorAll('.auth-tab');
  const quickConnectSteam = document.getElementById('btn-auth-quick-steam');
  const userSignOutBtn = document.getElementById('btn-auth-sign-out');

  openAuthBtn?.addEventListener('click', openAuthModal);
  userMenuBtn?.addEventListener('click', openAuthModal);
  closeBtn?.addEventListener('click', closeAuthModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeAuthModal();
  });

  // Tab switcher
  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      authTabs.forEach((t) => {
        t.classList.remove('active', 'bg-zinc-800', 'text-white');
        t.classList.add('text-zinc-400');
      });
      tab.classList.add('active', 'bg-zinc-800', 'text-white');
      tab.classList.remove('text-zinc-400');

      const containerSignIn = document.getElementById('auth-view-signin');
      const containerSignUp = document.getElementById('auth-view-signup');
      if (mode === 'signup') {
        containerSignIn?.classList.add('hidden');
        containerSignUp?.classList.remove('hidden');
      } else {
        containerSignIn?.classList.remove('hidden');
        containerSignUp?.classList.add('hidden');
      }
    });
  });

  // Handle Sign In
  formSignIn?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('input-signin-email') as HTMLInputElement | null;
    const email = emailInput?.value.trim();
    if (email) {
      const user = loginUser(email);
      updateAuthUI(user);
      closeAuthModal();
      showToast(`Welcome back, ${user.username}!`, 'success');
    }
  });

  // Handle Register
  formSignUp?.addEventListener('submit', (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('input-signup-username') as HTMLInputElement | null;
    const emailInput = document.getElementById('input-signup-email') as HTMLInputElement | null;
    const steamInput = document.getElementById('input-signup-steamid') as HTMLInputElement | null;

    if (usernameInput?.value && emailInput?.value) {
      const user = registerUser({
        username: usernameInput.value,
        email: emailInput.value,
        steamId64: steamInput?.value
      });
      updateAuthUI(user);
      closeAuthModal();
      showToast(`Account created for ${user.username}!`, 'success');
      if (steamInput?.value) {
        fetchPlayerIntel(steamInput.value);
      }
    }
  });

  // Quick Connect via Steam button
  quickConnectSteam?.addEventListener('click', () => {
    const user = registerUser({
      username: 'SteamPlayer',
      email: 'player@steam.cs2live',
      steamId64: '76561198287445170'
    });
    updateAuthUI(user);
    closeAuthModal();
    showToast('Connected via Steam!', 'success');
  });

  // Sign out button
  userSignOutBtn?.addEventListener('click', () => {
    logoutUser();
    updateAuthUI(null);
    closeAuthModal();
    showToast('Signed out of CS2Live', 'info');
  });

  // Initial Auth UI state
  updateAuthUI(getCurrentUser());
}

function openAuthModal() {
  const modal = document.getElementById('modal-auth');
  modal?.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('modal-auth');
  modal?.classList.add('hidden');
}

function updateAuthUI(user: UserAccount | null) {
  const openAuthBtn = document.getElementById('btn-nav-open-auth');
  const userProfile = document.getElementById('nav-user-profile');
  const userNameEl = document.getElementById('nav-user-name');
  const userAvatarEl = document.getElementById('nav-user-avatar') as HTMLImageElement | null;
  const userCountEl = document.getElementById('nav-user-tracked-count');
  const quickAuthBanner = document.getElementById('quick-auth-banner');

  if (user) {
    openAuthBtn?.classList.add('hidden');
    userProfile?.classList.remove('hidden');
    userProfile?.classList.add('flex');

    if (userNameEl) userNameEl.textContent = user.username;
    if (userAvatarEl) userAvatarEl.src = user.avatarUrl;
    if (userCountEl) userCountEl.textContent = `${user.trackedProfiles.length} Saved`;

    if (quickAuthBanner) {
      quickAuthBanner.innerHTML = `
        <span class="text-zinc-400">Signed in as <strong class="text-white">${user.username}</strong></span>
      `;
    }

    renderTrackedProfiles();
  } else {
    openAuthBtn?.classList.remove('hidden');
    userProfile?.classList.add('hidden');
    userProfile?.classList.remove('flex');

    if (quickAuthBanner) {
      quickAuthBanner.innerHTML = `
        <span class="text-zinc-400 hidden sm:inline">Track weekly drops & matches:</span>
        <button id="btn-banner-signin" class="text-emerald-400 font-bold hover:underline cursor-pointer">Sign in</button>
      `;
      document.getElementById('btn-banner-signin')?.addEventListener('click', openAuthModal);
    }

    const trackedPillsContainer = document.getElementById('user-tracked-pills');
    trackedPillsContainer?.classList.add('hidden');
  }

  updateTrackButtonState();
}

function renderTrackedProfiles() {
  const user = getCurrentUser();
  const container = document.getElementById('user-tracked-pills');
  const list = document.getElementById('user-tracked-pills-list');

  if (!user || user.trackedProfiles.length === 0) {
    container?.classList.add('hidden');
    return;
  }

  container?.classList.remove('hidden');
  if (list) {
    list.innerHTML = user.trackedProfiles.map((p) => `
      <button
        class="btn-tracked-player-pill px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
        data-id="${p.steamId64}"
      >
        <span>${p.personaName}</span>
      </button>
    `).join('');

    list.querySelectorAll('.btn-tracked-player-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) fetchPlayerIntel(id);
      });
    });
  }
}

function updateTrackButtonState() {
  const trackBtn = document.getElementById('btn-track-this-player');
  const trackLabel = document.getElementById('hub-track-label');
  const user = getCurrentUser();

  if (!trackBtn || !trackLabel) return;

  if (!user) {
    trackLabel.textContent = 'Sign in to Track';
    trackBtn.className = 'px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/[0.1] text-xs font-bold transition flex items-center gap-2 cursor-pointer';
    return;
  }

  const isTracked = currentProfile && user.trackedProfiles.some(p => p.steamId64 === currentProfile?.steamId64);
  if (isTracked) {
    trackLabel.textContent = '✓ Tracked Profile';
    trackBtn.className = 'px-4 py-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-2 cursor-pointer';
  } else {
    trackLabel.textContent = '+ Track This Player';
    trackBtn.className = 'px-4 py-2 rounded-xl bg-zinc-900 hover:bg-emerald-500 hover:text-black text-white border border-white/[0.1] text-xs font-bold transition flex items-center gap-2 cursor-pointer';
  }
}

// -------------------------------------------------------------
// Live Wednesday 00:00 UTC Reset Timer
// -------------------------------------------------------------

function startWeeklyResetTimer() {
  if (countdownInterval) clearInterval(countdownInterval);

  function update() {
    const cycle = getWeeklyResetCycle();
    const countdownEl = document.getElementById('hub-reset-countdown');
    if (!countdownEl) return;

    const diff = cycle.nextResetDate.getTime() - Date.now();
    if (diff <= 0) {
      countdownEl.textContent = '00d 00h 00m 00s';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    countdownEl.textContent = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

// -------------------------------------------------------------
// Settings Modal
// -------------------------------------------------------------

function setupSettingsModal() {
  const modal = document.getElementById('modal-settings');
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const clearBtn = document.getElementById('btn-clear-all-data');

  openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  clearBtn?.addEventListener('click', () => {
    if (confirm('Clear all local storage data and cached profiles?')) {
      localStorage.clear();
      window.location.reload();
    }
  });
}

// -------------------------------------------------------------
// Toast Notification Utility
// -------------------------------------------------------------

function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
    error: 'bg-red-950 text-red-300 border-red-500/40',
    warning: 'bg-yellow-950 text-yellow-300 border-yellow-500/40',
    info: 'bg-zinc-900 text-zinc-200 border-white/[0.1]'
  };

  toast.className = `px-4 py-2.5 rounded-xl border ${colors[type]} text-xs font-semibold shadow-2xl backdrop-blur-md transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto`;
  toast.textContent = message;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
