import type {
  SteamAccount,
  DropItem,
  XpMultiplier,
  ServiceMedalTier,
  CS2Match,
  ProPlayerStat,
  CaseMarketPrice,
  PlayerMatchLog,
  ScavengedPlayerProfile,
  DetailedMatch,
  HackerScanResult,
  InventoryShowcaseItem,
  MatchPlayerScore,
  UserAccount,
  WeeklyDropIntelligence
} from '../lib/types';
import {
  loadAccountsFromStorage,
  saveAccountsToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  getCurrentUser,
  setCurrentUser,
  loginUser,
  registerUser,
  loginWithSteam,
  logoutUser,
  addTrackedProfile,
  DEFAULT_USER,
  type AppSettings
} from '../lib/client-store';
import { getWeeklyResetCycle } from '../lib/drop-intelligence';
import { INITIAL_DEMO_ACCOUNTS } from '../lib/mock-data';

// Global state
let accounts: SteamAccount[] = [];
let settings: AppSettings = loadSettingsFromStorage();
let currentFilter: 'all' | 'available' | 'claimed' | 'near-medal' = 'all';
let searchQuery: string = '';
let currentView: 'grid' | 'table' = 'grid';
let currentScavengedProfile: ScavengedPlayerProfile | null = null;
let scavengedMatches: DetailedMatch[] = [];
let currentDropIntelligence: WeeklyDropIntelligence | null = null;

// Initialize
export function initDashboard() {
  accounts = loadAccountsFromStorage();
  currentView = settings.activeView || 'grid';

  bindEvents();
  setupAuth();
  setupDropRadar();
  setupTabNavigation();
  setupLogMatchModal();
  loadMarketPrices();
  setupScavenger();
  setupHackerRadar();
  setupMatchScorecardModal();
  render();
}


function bindEvents() {
  // Search
  const searchInput = document.getElementById('input-search') as HTMLInputElement | null;
  searchInput?.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value.toLowerCase().trim();
    renderAccounts();
  });

  // Filter tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const filter = tab.getAttribute('data-filter') as any;
      if (filter) {
        currentFilter = filter;
        filterTabs.forEach((t) => {
          t.classList.remove('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/30');
          t.classList.add('text-zinc-400');
        });
        tab.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/30');
        tab.classList.remove('text-zinc-400');
        renderAccounts();
      }
    });
  });

  // View switchers
  const btnGrid = document.getElementById('btn-view-grid');
  const btnTable = document.getElementById('btn-view-table');

  btnGrid?.addEventListener('click', () => {
    currentView = 'grid';
    settings.activeView = 'grid';
    saveSettingsToStorage(settings);
    updateViewButtons();
    renderAccounts();
  });

  btnTable?.addEventListener('click', () => {
    currentView = 'table';
    settings.activeView = 'table';
    saveSettingsToStorage(settings);
    updateViewButtons();
    renderAccounts();
  });

  // Bulk actions dropdown
  const bulkBtn = document.getElementById('btn-bulk-menu');
  const bulkDropdown = document.getElementById('bulk-dropdown');
  bulkBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    bulkDropdown?.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    bulkDropdown?.classList.add('hidden');
  });

  document.getElementById('btn-bulk-mark-claimed')?.addEventListener('click', () => {
    accounts.forEach((acc) => {
      acc.dropStatus.claimed = true;
      acc.dropStatus.claimedAt = new Date().toISOString();
      if (!acc.dropStatus.recentDrop) {
        acc.dropStatus.recentDrop = {
          id: `drop-${Date.now()}`,
          name: 'Kilowatt Case',
          type: 'case',
          marketPrice: 1.84,
          date: new Date().toLocaleDateString()
        };
      }
    });
    saveAccountsToStorage(accounts);
    render();
  });

  document.getElementById('btn-bulk-reset-available')?.addEventListener('click', () => {
    accounts.forEach((acc) => {
      acc.dropStatus.claimed = false;
      acc.dropStatus.claimedAt = null;
    });
    saveAccountsToStorage(accounts);
    render();
  });

  // Modals
  setupAddModal();
  setupEditModal();
  setupSettingsModal();

  // Top Nav Demo Button
  document.getElementById('btn-demo-data')?.addEventListener('click', () => {
    accounts = [...INITIAL_DEMO_ACCOUNTS];
    saveAccountsToStorage(accounts);
    render();
  });

  // Empty state buttons
  document.getElementById('empty-btn-add')?.addEventListener('click', () => {
    openAddModal();
  });

  document.getElementById('empty-btn-demo')?.addEventListener('click', () => {
    accounts = [...INITIAL_DEMO_ACCOUNTS];
    saveAccountsToStorage(accounts);
    render();
  });
}

function updateViewButtons() {
  const btnGrid = document.getElementById('btn-view-grid');
  const btnTable = document.getElementById('btn-view-table');

  if (currentView === 'grid') {
    btnGrid?.classList.add('bg-zinc-800', 'text-white');
    btnGrid?.classList.remove('text-zinc-500');
    btnTable?.classList.remove('bg-zinc-800', 'text-white');
    btnTable?.classList.add('text-zinc-500');
  } else {
    btnTable?.classList.add('bg-zinc-800', 'text-white');
    btnTable?.classList.remove('text-zinc-500');
    btnGrid?.classList.remove('bg-zinc-800', 'text-white');
    btnGrid?.classList.add('text-zinc-500');
  }
}

// ----------------------------------------------------------------------
// Rendering logic
// ----------------------------------------------------------------------

function render() {
  renderStats();
  renderAccounts();
}

function renderStats() {
  const total = accounts.length;
  const dropsReady = accounts.filter((a) => !a.dropStatus.claimed).length;
  const dropsClaimed = accounts.filter((a) => a.dropStatus.claimed).length;
  const nearMedal = accounts.filter((a) => a.xpStatus.currentRank >= 35).length;
  const allVacClean = accounts.every((a) => !a.vacBanned);

  const totalValue = accounts.reduce((acc, curr) => {
    return acc + (curr.dropStatus.recentDrop?.marketPrice || 0);
  }, 0);

  const completionPct = total > 0 ? Math.round((dropsClaimed / total) * 100) : 0;

  const totalEl = document.getElementById('stat-total-accounts');
  const readyEl = document.getElementById('stat-drops-ready');
  const claimedEl = document.getElementById('stat-drops-claimed');
  const nearMedalEl = document.getElementById('stat-near-medal');
  const vacStatusEl = document.getElementById('stat-vac-status');
  const valueEl = document.getElementById('stat-case-value');
  const pctEl = document.getElementById('stat-completion-pct');

  if (totalEl) totalEl.textContent = String(total);
  if (readyEl) readyEl.textContent = String(dropsReady);
  if (claimedEl) claimedEl.textContent = String(dropsClaimed);
  if (nearMedalEl) nearMedalEl.textContent = String(nearMedal);
  if (vacStatusEl) vacStatusEl.textContent = allVacClean ? '100% VAC Clean' : 'Bans Detected';
  if (valueEl) valueEl.textContent = `$${totalValue.toFixed(2)}`;
  if (pctEl) pctEl.textContent = `(${completionPct}%)`;
}

function getFilteredAccounts(): SteamAccount[] {
  return accounts.filter((acc) => {
    // Search
    const matchesSearch =
      !searchQuery ||
      acc.personaName.toLowerCase().includes(searchQuery) ||
      acc.steamId64.includes(searchQuery) ||
      (acc.customUrl && acc.customUrl.toLowerCase().includes(searchQuery)) ||
      (acc.tags && acc.tags.some((t) => t.toLowerCase().includes(searchQuery)));

    if (!matchesSearch) return false;

    // Filter
    if (currentFilter === 'available') return !acc.dropStatus.claimed;
    if (currentFilter === 'claimed') return acc.dropStatus.claimed;
    if (currentFilter === 'near-medal') return acc.xpStatus.currentRank >= 35;
    return true;
  });
}

function renderAccounts() {
  const loadingEl = document.getElementById('accounts-loading');
  const emptyEl = document.getElementById('accounts-empty');
  const gridContainer = document.getElementById('account-grid');
  const tableWrapper = document.getElementById('account-table-wrapper');
  const tableBody = document.getElementById('account-table-body');

  if (loadingEl) loadingEl.classList.add('hidden');

  const filtered = getFilteredAccounts();

  if (filtered.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (gridContainer) gridContainer.classList.add('hidden');
    if (tableWrapper) tableWrapper.classList.add('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  if (currentView === 'grid') {
    if (gridContainer) {
      gridContainer.classList.remove('hidden');
      gridContainer.innerHTML = filtered.map((acc) => renderCardHtml(acc)).join('');
      bindCardInteractions(gridContainer);
    }
    if (tableWrapper) tableWrapper.classList.add('hidden');
  } else {
    if (gridContainer) gridContainer.classList.add('hidden');
    if (tableWrapper) tableWrapper.classList.remove('hidden');
    if (tableBody) {
      tableBody.innerHTML = filtered.map((acc) => renderTableRowHtml(acc)).join('');
      bindTableInteractions(tableBody);
    }
  }
}

function getInitials(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'CS';
}

function getAvatarColorGradient(name: string): string {
  const palettes = [
    'from-emerald-500 to-teal-950 border-emerald-400/40 text-emerald-200',
    'from-cyan-500 to-blue-950 border-cyan-400/40 text-cyan-200',
    'from-purple-500 to-indigo-950 border-purple-400/40 text-purple-200',
    'from-amber-500 to-yellow-950 border-amber-400/40 text-amber-200',
    'from-rose-500 to-red-950 border-rose-400/40 text-rose-200'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx];
}

export function showToast(message: string, type: 'success' | 'info' | 'warn' = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const borderCol = type === 'success' ? 'border-emerald-500/40 bg-black/90 text-emerald-300' : 'border-cyan-500/40 bg-black/90 text-cyan-300';
  toast.className = `px-4 py-2.5 rounded-xl border ${borderCol} shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto`;
  toast.innerHTML = `
    <span class="w-2 h-2 rounded-full ${type === 'success' ? 'bg-emerald-400' : 'bg-cyan-400'}"></span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function getMultiplierBadge(multiplier: XpMultiplier) {
  switch (multiplier) {
    case 'overachieving':
      return `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">Bonus XP ~3x</span>`;
    case 'standard':
      return `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">Standard 1.0x</span>`;
    case 'reduced':
      return `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-950/80 text-yellow-400 border border-yellow-500/30">Reduced 0.5x</span>`;
    case 'penalty':
      return `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-red-950/80 text-red-400 border border-red-500/30">Penalty 0.175x</span>`;
  }
}

function getMedalColorClass(tier: ServiceMedalTier) {
  switch (tier) {
    case 1:
      return 'text-zinc-300 border-zinc-500/30 bg-zinc-900';
    case 2:
      return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/60 glow-emerald';
    case 3:
      return 'text-cyan-400 border-cyan-500/30 bg-cyan-950/60 glow-cyan';
    case 4:
      return 'text-purple-400 border-purple-500/30 bg-purple-950/60 glow-purple';
    case 5:
      return 'text-pink-400 border-pink-500/30 bg-pink-950/60';
    case 6:
      return 'text-red-400 border-red-500/30 bg-red-950/60 glow-red';
  }
}

function renderCardHtml(acc: SteamAccount): string {
  const isClaimed = acc.dropStatus.claimed;
  const xpPercent = Math.min(100, Math.round((acc.xpStatus.currentXp / 5000) * 100));
  const ranksLeft = Math.max(0, 40 - acc.xpStatus.currentRank);
  const initials = getInitials(acc.personaName);
  const gradientClass = getAvatarColorGradient(acc.personaName);

  return `
    <div class="relative rounded-2xl bg-surface-1 border ${isClaimed ? 'border-white/[0.08]' : 'border-emerald-500/30 shadow-[0_0_20px_-8px_rgba(16,185,129,0.18)]'
    } p-5 hover:border-white/[0.18] transition-all flex flex-col justify-between group" data-account-id="${acc.id}">
      
      <!-- Top Row: Avatar & Profile Info -->
      <div>
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="w-13 h-13 rounded-xl overflow-hidden border-2 ${isClaimed ? 'border-yellow-500/50' : 'border-emerald-400'
    } bg-black shrink-0 relative">
                <img
                  src="${acc.avatarUrl}"
                  alt="${acc.personaName}"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden'); this.nextElementSibling.classList.add('flex');"
                />
                <div class="w-full h-full hidden items-center justify-center font-extrabold font-mono text-sm bg-gradient-to-br ${gradientClass}">
                  ${initials}
                </div>
              </div>
              <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${acc.vacBanned ? 'bg-red-500' : 'bg-emerald-500'
    } ring-2 ring-black" title="${acc.vacBanned ? 'VAC Banned' : 'Clean / Prime'}"></span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-white text-base tracking-tight truncate max-w-[180px] sm:max-w-[220px]">
                  ${acc.personaName}
                </h4>
              </div>
              <div class="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                <span class="font-mono text-[11px] text-zinc-400">${acc.steamId64}</span>
                <button
                  class="btn-copy-id text-zinc-500 hover:text-white transition cursor-pointer"
                  data-id="${acc.steamId64}"
                  title="Copy SteamID64"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Drop Action Button -->
          <button
            class="btn-toggle-drop px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${isClaimed
      ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-900/60'
      : 'bg-emerald-400 text-black hover:bg-emerald-300 glow-emerald'
    }"
            data-account-id="${acc.id}"
          >
            ${isClaimed
      ? `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Claimed`
      : `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> Drop Ready`
    }
          </button>
        </div>

        <!-- Drop Status Banner -->
        <div class="p-3 rounded-xl bg-black border border-white/[0.06] mb-4">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="text-zinc-400 font-medium">Care Package Status:</span>
            ${isClaimed
      ? `<span class="font-bold text-yellow-400 flex items-center gap-1">
                    ${acc.dropStatus.recentDrop?.name || 'Care Package'} 
                    ${acc.dropStatus.recentDrop?.marketPrice ? `<span class="font-mono text-zinc-400">($${acc.dropStatus.recentDrop.marketPrice.toFixed(2)})</span>` : ''}
                   </span>`
      : `<span class="font-bold text-emerald-400 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Available to Earn
                   </span>`
    }
          </div>
          <p class="text-[11px] text-zinc-500">
            ${isClaimed
      ? `Claimed on ${acc.dropStatus.claimedAt ? new Date(acc.dropStatus.claimedAt).toLocaleDateString() : 'This Cycle'}. Next eligible after Wednesday reset.`
      : `Level up in-game once this week to unlock your 2-choice Care Package.`
    }
          </p>
        </div>

        <!-- CS2 Rank & XP Progress -->
        <div class="space-y-2 mb-4">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.1] font-mono font-bold text-white">
                Rank ${acc.xpStatus.currentRank}
              </span>
              ${getMultiplierBadge(acc.xpStatus.multiplier)}
            </div>
            <div class="flex items-center gap-1.5">
              <button
                class="btn-add-xp px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-emerald-400 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/[0.08] transition cursor-pointer"
                data-account-id="${acc.id}"
                data-amount="500"
                title="Add 500 XP"
              >
                +500 XP
              </button>
              <button
                class="btn-add-xp px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-cyan-400 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/[0.08] transition cursor-pointer"
                data-account-id="${acc.id}"
                data-amount="1000"
                title="Add 1000 XP"
              >
                +1000 XP
              </button>
            </div>
          </div>

          <!-- XP Bar -->
          <div>
            <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span>XP: <strong class="text-white font-mono">${acc.xpStatus.currentXp}</strong> / 5,000</span>
              <span class="font-mono text-zinc-500">${xpPercent}%</span>
            </div>
            <div class="w-full h-2 bg-black rounded-full overflow-hidden border border-white/[0.06] p-0.5">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 transition-all duration-300"
                style="width: ${xpPercent}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Service Medal Progress -->
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/60 border border-white/[0.06] text-xs mb-4">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${getMedalColorClass(acc.serviceMedal.tier)}">
              ${acc.serviceMedal.currentYear} Medal (T${acc.serviceMedal.tier})
            </span>
          </div>
          <span class="text-[11px] ${ranksLeft <= 5 ? 'text-purple-400 font-bold' : 'text-zinc-500'}">
            ${ranksLeft === 0 ? 'Ready to Claim Medal!' : `${ranksLeft} rank${ranksLeft > 1 ? 's' : ''} to next prestige`}
          </span>
        </div>
      </div>

      <!-- Footer Quick Action Bar -->
      <div class="pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <div class="flex items-center gap-1">
          <!-- Launch CS2 direct button -->
          <a
            href="steam://run/730/"
            title="Launch CS2 with Steam"
            class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/[0.08] transition"
          >
            <svg class="w-3.5 h-3.5 text-emerald-400 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Play CS2</span>
          </a>

          <!-- Steam Profile Link -->
          <a
            href="${acc.profileUrl}"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Steam Profile"
            class="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/[0.08] transition"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>

        <div class="flex items-center gap-1">
          <!-- Quick Log Match button -->
          <button
            class="btn-card-log-match p-1.5 text-zinc-400 hover:text-emerald-400 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/[0.08] transition cursor-pointer"
            data-account-id="${acc.id}"
            title="Log Match for ${acc.personaName}"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </button>

          <!-- Edit button -->
          <button
            class="btn-edit-account p-1.5 text-zinc-400 hover:text-cyan-400 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/[0.08] transition cursor-pointer"
            data-account-id="${acc.id}"
            title="Edit Details & XP"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>

          <!-- Delete button -->
          <button
            class="btn-delete-account p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/[0.08] transition cursor-pointer"
            data-account-id="${acc.id}"
            title="Remove Account"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderTableRowHtml(acc: SteamAccount): string {
  const isClaimed = acc.dropStatus.claimed;
  const xpPercent = Math.min(100, Math.round((acc.xpStatus.currentXp / 5000) * 100));
  const initials = getInitials(acc.personaName);
  const gradientClass = getAvatarColorGradient(acc.personaName);

  return `
    <tr class="hover:bg-zinc-900/40 transition">
      <!-- Account Info -->
      <td class="py-3 px-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg overflow-hidden border border-white/[0.1] shrink-0 bg-black relative">
            <img
              src="${acc.avatarUrl}"
              alt="${acc.personaName}"
              class="w-full h-full object-cover"
              loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden'); this.nextElementSibling.classList.add('flex');"
            />
            <div class="w-full h-full hidden items-center justify-center font-mono font-bold text-xs bg-gradient-to-br ${gradientClass}">
              ${initials}
            </div>
          </div>
          <div>
            <span class="font-bold text-white block">${acc.personaName}</span>
            <span class="text-[11px] text-zinc-500 font-mono">${acc.steamId64}</span>
          </div>
        </div>
      </td>

      <!-- Drop Status -->
      <td class="py-3 px-4">
        <button
          class="btn-toggle-drop px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${isClaimed
      ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-500/40'
      : 'bg-emerald-400 text-black hover:bg-emerald-300'
    }"
          data-account-id="${acc.id}"
        >
          ${isClaimed ? 'Claimed' : 'Drop Ready'}
        </button>
      </td>

      <!-- Rank & XP Progress -->
      <td class="py-3 px-4">
        <div class="w-36 space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-white">Rank ${acc.xpStatus.currentRank}</span>
            <span class="text-[10px] text-zinc-400">${acc.xpStatus.currentXp}/5000</span>
          </div>
          <div class="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/[0.06]">
            <div class="h-full bg-emerald-400 rounded-full" style="width: ${xpPercent}%"></div>
          </div>
        </div>
      </td>

      <!-- XP Multiplier -->
      <td class="py-3 px-4">
        ${getMultiplierBadge(acc.xpStatus.multiplier)}
      </td>

      <!-- Service Medal -->
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${getMedalColorClass(acc.serviceMedal.tier)}">
          ${acc.serviceMedal.currentYear} (T${acc.serviceMedal.tier})
        </span>
      </td>

      <!-- Actions -->
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <a
            href="steam://run/730/"
            title="Launch CS2"
            class="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded border border-white/[0.08]"
          >
            <svg class="w-3.5 h-3.5 fill-current text-emerald-400" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </a>
          <button
            class="btn-card-log-match p-1.5 text-zinc-400 hover:text-emerald-400 bg-zinc-900 rounded border border-white/[0.08] cursor-pointer"
            data-account-id="${acc.id}"
            title="Log Match"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </button>
          <button
            class="btn-edit-account p-1.5 text-zinc-400 hover:text-cyan-400 bg-zinc-900 rounded border border-white/[0.08] cursor-pointer"
            data-account-id="${acc.id}"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button
            class="btn-delete-account p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-900 rounded border border-white/[0.08] cursor-pointer"
            data-account-id="${acc.id}"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function bindCardInteractions(container: HTMLElement) {
  // Toggle drop
  container.querySelectorAll('.btn-toggle-drop').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-account-id');
      if (id) toggleDrop(id);
    });
  });

  // Add XP
  container.querySelectorAll('.btn-add-xp').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-account-id');
      const amount = parseInt(btn.getAttribute('data-amount') || '500', 10);
      if (id) addXp(id, amount);
    });
  });

  // Copy ID
  container.querySelectorAll('.btn-copy-id').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) {
        navigator.clipboard.writeText(id);
        btn.innerHTML = `<svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
          btn.innerHTML = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        }, 1500);
      }
    });
  });

  // Edit
  container.querySelectorAll('.btn-edit-account').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-account-id');
      if (id) openEditModal(id);
    });
  });

  // Log Match Quick Action
  container.querySelectorAll('.btn-card-log-match').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-account-id');
      if (id && (window as any).openLogMatchForAccount) {
        (window as any).openLogMatchForAccount(id);
      }
    });
  });

  // Delete
  container.querySelectorAll('.btn-delete-account').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-account-id');
      if (id) deleteAccount(id);
    });
  });
}

function bindTableInteractions(container: HTMLElement) {
  bindCardInteractions(container);
}

function toggleDrop(id: string) {
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return;

  acc.dropStatus.claimed = !acc.dropStatus.claimed;
  acc.dropStatus.claimedAt = acc.dropStatus.claimed ? new Date().toISOString() : null;

  if (acc.dropStatus.claimed) {
    if (settings.soundAlerts && (window as any).playDropChime) {
      (window as any).playDropChime();
    }
    if (!acc.dropStatus.recentDrop) {
      acc.dropStatus.recentDrop = {
        id: `drop-${Date.now()}`,
        name: 'Kilowatt Case',
        type: 'case',
        marketPrice: 1.84,
        date: new Date().toLocaleDateString()
      };
    }
    showToast(`🎉 Care Package claimed for ${acc.personaName}!`, 'success');
  } else {
    showToast(`Drop reverted to Pending for ${acc.personaName}`, 'info');
  }

  saveAccountsToStorage(accounts);
  render();
}

function addXp(id: string, amount: number) {
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return;

  acc.xpStatus.currentXp += amount;
  acc.xpStatus.weeklyXpEarned += amount;

  // Check level up
  if (acc.xpStatus.currentXp >= 5000) {
    acc.xpStatus.currentXp -= 5000;
    if (acc.xpStatus.currentRank < 40) {
      acc.xpStatus.currentRank += 1;
      showToast(`⭐ ${acc.personaName} Ranked Up to Rank ${acc.xpStatus.currentRank}!`, 'success');
    } else {
      // Reached 40 - can claim Service Medal!
      acc.serviceMedal.ranksUntilNextMedal = 0;
      showToast(`🏆 ${acc.personaName} reached Rank 40! Ready for Service Medal!`, 'success');
    }

    // Auto-grant drop on weekly rankup
    if (!acc.dropStatus.claimed) {
      acc.dropStatus.claimed = true;
      acc.dropStatus.claimedAt = new Date().toISOString();
      if (settings.soundAlerts && (window as any).playDropChime) {
        (window as any).playDropChime();
      }
    }
  } else {
    showToast(`+${amount} XP logged for ${acc.personaName}`, 'info');
  }

  // Multiplier bracket calculation
  if (acc.xpStatus.weeklyXpEarned < 4500) {
    acc.xpStatus.multiplier = 'overachieving';
  } else if (acc.xpStatus.weeklyXpEarned < 7500) {
    acc.xpStatus.multiplier = 'standard';
  } else if (acc.xpStatus.weeklyXpEarned < 11167) {
    acc.xpStatus.multiplier = 'reduced';
  } else {
    acc.xpStatus.multiplier = 'penalty';
  }

  acc.serviceMedal.ranksUntilNextMedal = Math.max(0, 40 - acc.xpStatus.currentRank);

  saveAccountsToStorage(accounts);
  render();
}

function deleteAccount(id: string) {
  accounts = accounts.filter((a) => a.id !== id);
  saveAccountsToStorage(accounts);
  render();
}

// ----------------------------------------------------------------------
// Add Account Modal
// ----------------------------------------------------------------------

function setupAddModal() {
  const modal = document.getElementById('modal-add-account');
  const openBtn = document.getElementById('btn-open-add-modal');
  const closeBtn = document.getElementById('btn-close-add-modal');
  const singleTab = document.getElementById('tab-single-add');
  const bulkTab = document.getElementById('tab-bulk-add');
  const singleForm = document.getElementById('form-single-add');
  const bulkForm = document.getElementById('form-bulk-add');
  const resolveBtn = document.getElementById('btn-resolve-steam');
  const inputUrl = document.getElementById('add-input-url') as HTMLInputElement | null;

  openBtn?.addEventListener('click', openAddModal);
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  singleTab?.addEventListener('click', () => {
    singleTab.classList.add('text-emerald-400', 'border-emerald-400');
    singleTab.classList.remove('text-zinc-400', 'border-transparent');
    bulkTab?.classList.remove('text-emerald-400', 'border-emerald-400');
    bulkTab?.classList.add('text-zinc-400', 'border-transparent');
    singleForm?.classList.remove('hidden');
    bulkForm?.classList.add('hidden');
  });

  bulkTab?.addEventListener('click', () => {
    bulkTab.classList.add('text-emerald-400', 'border-emerald-400');
    bulkTab.classList.remove('text-zinc-400', 'border-transparent');
    singleTab?.classList.remove('text-emerald-400', 'border-emerald-400');
    singleTab?.classList.add('text-zinc-400', 'border-transparent');
    bulkForm?.classList.remove('hidden');
    singleForm?.classList.add('hidden');
  });

  // Resolve Steam Profile via API
  resolveBtn?.addEventListener('click', async () => {
    const val = inputUrl?.value.trim();
    if (!val) return;

    resolveBtn.textContent = '...';
    try {
      const res = await fetch('/api/steam/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-steam-api-key': settings.steamApiKey
        },
        body: JSON.stringify({ input: val })
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        const previewEl = document.getElementById('resolve-preview');
        const avatarEl = document.getElementById('resolve-avatar') as HTMLImageElement;
        const nameEl = document.getElementById('resolve-name');
        const idEl = document.getElementById('resolve-id');

        if (avatarEl) avatarEl.src = data.data.avatarUrl;
        if (nameEl) nameEl.textContent = data.data.personaName;
        if (idEl) idEl.textContent = data.data.steamId64;
        previewEl?.classList.remove('hidden');

        // Pre-fill nickname if empty
        const nickInput = document.getElementById('add-input-nickname') as HTMLInputElement;
        if (nickInput && !nickInput.value) {
          nickInput.value = data.data.personaName;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      resolveBtn.textContent = 'Resolve';
    }
  });

  // Single form submission
  singleForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const urlVal = inputUrl?.value.trim() || '';
    const nickVal = (document.getElementById('add-input-nickname') as HTMLInputElement)?.value.trim();
    const rankVal = parseInt((document.getElementById('add-input-rank') as HTMLInputElement)?.value || '1', 10);
    const dropRadio = document.querySelector('input[name="add-drop-status"]:checked') as HTMLInputElement;
    const isClaimed = dropRadio?.value === 'claimed';

    // Resolve details
    let steamId64 = '7656119' + Math.floor(1000000000 + Math.random() * 9000000000);
    let personaName = nickVal || 'Steam Account';
    let avatarUrl = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';
    let profileUrl = `https://steamcommunity.com/profiles/${steamId64}`;

    try {
      const res = await fetch('/api/steam/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-steam-api-key': settings.steamApiKey },
        body: JSON.stringify({ input: urlVal })
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        steamId64 = data.data.steamId64;
        personaName = nickVal || data.data.personaName;
        avatarUrl = data.data.avatarUrl;
        profileUrl = data.data.profileUrl;
      }
    } catch {
      // safe fallback
    }

    const newAccount: SteamAccount = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      steamId64,
      personaName,
      avatarUrl,
      profileUrl,
      vacBanned: false,
      communityBanned: false,
      primeStatus: true,
      dropStatus: {
        claimed: isClaimed,
        claimedAt: isClaimed ? new Date().toISOString() : null,
        recentDrop: isClaimed
          ? {
            id: `drop-${Date.now()}`,
            name: 'Kilowatt Case',
            type: 'case',
            marketPrice: 1.84,
            date: new Date().toLocaleDateString()
          }
          : undefined
      },
      xpStatus: {
        currentRank: rankVal,
        currentXp: 0,
        multiplier: 'overachieving',
        weeklyXpEarned: 0,
        estimatedMatchesNeeded: 8
      },
      serviceMedal: {
        currentYear: 2026,
        tier: 1,
        serviceMedalsOwned: ['2026 Service Medal'],
        ranksUntilNextMedal: Math.max(0, 40 - rankVal)
      },
      lastChecked: new Date().toISOString()
    };

    accounts.unshift(newAccount);
    saveAccountsToStorage(accounts);
    render();
    modal?.classList.add('hidden');
    (singleForm as HTMLFormElement).reset();
    document.getElementById('resolve-preview')?.classList.add('hidden');
  });

  // Bulk form submission
  bulkForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (document.getElementById('bulk-input-text') as HTMLTextAreaElement)?.value || '';
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    lines.forEach((line, idx) => {
      const steamId64 = line.match(/\d{17}/)
        ? line.match(/\d{17}/)![0]
        : '7656119' + Math.floor(1000000000 + Math.random() * 9000000000);
      const name = line.includes('id/') ? line.split('id/')[1].replace('/', '') : `Fleet Account #${idx + 1}`;

      const newAcc: SteamAccount = {
        id: `acc-${Date.now()}-${idx}`,
        steamId64,
        personaName: name,
        avatarUrl: 'https://avatars.steamstatic.com/b5bd56c1aa99e44ba301c400495da6b43a395b27_full.jpg',
        profileUrl: `https://steamcommunity.com/profiles/${steamId64}`,
        vacBanned: false,
        communityBanned: false,
        primeStatus: true,
        dropStatus: { claimed: false, claimedAt: null },
        xpStatus: {
          currentRank: 1,
          currentXp: 0,
          multiplier: 'overachieving',
          weeklyXpEarned: 0,
          estimatedMatchesNeeded: 8
        },
        serviceMedal: {
          currentYear: 2026,
          tier: 1,
          serviceMedalsOwned: [],
          ranksUntilNextMedal: 39
        },
        lastChecked: new Date().toISOString()
      };
      accounts.unshift(newAcc);
    });

    saveAccountsToStorage(accounts);
    render();
    modal?.classList.add('hidden');
    (bulkForm as HTMLFormElement).reset();
  });
}

function openAddModal() {
  const modal = document.getElementById('modal-add-account');
  modal?.classList.remove('hidden');
}

// ----------------------------------------------------------------------
// Edit Modal
// ----------------------------------------------------------------------

function setupEditModal() {
  const modal = document.getElementById('modal-edit-account');
  const closeBtn = document.getElementById('btn-close-edit-modal');
  const form = document.getElementById('form-edit-account');
  const deleteBtn = document.getElementById('btn-delete-account-modal');
  const dropCheckbox = document.getElementById('edit-input-drop-claimed') as HTMLInputElement | null;
  const dropDetails = document.getElementById('edit-drop-details');

  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  dropCheckbox?.addEventListener('change', () => {
    if (dropCheckbox.checked) {
      dropDetails?.classList.remove('hidden');
    } else {
      dropDetails?.classList.add('hidden');
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = (document.getElementById('edit-account-id') as HTMLInputElement)?.value;
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;

    acc.personaName = (document.getElementById('edit-input-name') as HTMLInputElement)?.value || acc.personaName;
    const claimed = (document.getElementById('edit-input-drop-claimed') as HTMLInputElement)?.checked;
    acc.dropStatus.claimed = claimed;
    acc.dropStatus.claimedAt = claimed ? (acc.dropStatus.claimedAt || new Date().toISOString()) : null;

    if (claimed) {
      const itemName = (document.getElementById('edit-input-item-name') as HTMLInputElement)?.value.trim();
      const itemPrice = parseFloat((document.getElementById('edit-input-item-price') as HTMLInputElement)?.value || '0');
      acc.dropStatus.recentDrop = {
        id: acc.dropStatus.recentDrop?.id || `drop-${Date.now()}`,
        name: itemName || 'Weekly Care Package',
        type: 'case',
        marketPrice: isNaN(itemPrice) ? 0 : itemPrice,
        date: new Date().toLocaleDateString()
      };
    }

    acc.xpStatus.currentRank = parseInt((document.getElementById('edit-input-rank') as HTMLInputElement)?.value || '1', 10);
    acc.xpStatus.currentXp = parseInt((document.getElementById('edit-input-xp') as HTMLInputElement)?.value || '0', 10);
    acc.xpStatus.multiplier = (document.getElementById('edit-input-multiplier') as HTMLSelectElement)?.value as XpMultiplier;

    acc.serviceMedal.currentYear = parseInt((document.getElementById('edit-input-medal-year') as HTMLInputElement)?.value || '2026', 10);
    acc.serviceMedal.tier = parseInt((document.getElementById('edit-input-medal-tier') as HTMLSelectElement)?.value || '1', 10) as ServiceMedalTier;
    acc.serviceMedal.ranksUntilNextMedal = Math.max(0, 40 - acc.xpStatus.currentRank);

    const tagsRaw = (document.getElementById('edit-input-tags') as HTMLInputElement)?.value || '';
    acc.tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);

    saveAccountsToStorage(accounts);
    render();
    modal?.classList.add('hidden');
  });

  deleteBtn?.addEventListener('click', () => {
    const id = (document.getElementById('edit-account-id') as HTMLInputElement)?.value;
    if (id) {
      deleteAccount(id);
      modal?.classList.add('hidden');
    }
  });
}

function openEditModal(id: string) {
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return;

  const modal = document.getElementById('modal-edit-account');
  const idInput = document.getElementById('edit-account-id') as HTMLInputElement;
  const nameInput = document.getElementById('edit-input-name') as HTMLInputElement;
  const dropCheckbox = document.getElementById('edit-input-drop-claimed') as HTMLInputElement;
  const itemNameInput = document.getElementById('edit-input-item-name') as HTMLInputElement;
  const itemPriceInput = document.getElementById('edit-input-item-price') as HTMLInputElement;
  const dropDetails = document.getElementById('edit-drop-details');
  const rankInput = document.getElementById('edit-input-rank') as HTMLInputElement;
  const xpInput = document.getElementById('edit-input-xp') as HTMLInputElement;
  const multSelect = document.getElementById('edit-input-multiplier') as HTMLSelectElement;
  const medalYearInput = document.getElementById('edit-input-medal-year') as HTMLInputElement;
  const medalTierSelect = document.getElementById('edit-input-medal-tier') as HTMLSelectElement;
  const tagsInput = document.getElementById('edit-input-tags') as HTMLInputElement;

  if (idInput) idInput.value = acc.id;
  if (nameInput) nameInput.value = acc.personaName;
  if (dropCheckbox) {
    dropCheckbox.checked = acc.dropStatus.claimed;
    if (dropCheckbox.checked) {
      dropDetails?.classList.remove('hidden');
    } else {
      dropDetails?.classList.add('hidden');
    }
  }
  if (itemNameInput) itemNameInput.value = acc.dropStatus.recentDrop?.name || '';
  if (itemPriceInput) itemPriceInput.value = String(acc.dropStatus.recentDrop?.marketPrice || '');
  if (rankInput) rankInput.value = String(acc.xpStatus.currentRank);
  if (xpInput) xpInput.value = String(acc.xpStatus.currentXp);
  if (multSelect) multSelect.value = acc.xpStatus.multiplier;
  if (medalYearInput) medalYearInput.value = String(acc.serviceMedal.currentYear);
  if (medalTierSelect) medalTierSelect.value = String(acc.serviceMedal.tier);
  if (tagsInput) tagsInput.value = (acc.tags || []).join(', ');

  modal?.classList.remove('hidden');
}

// ----------------------------------------------------------------------
// Settings & Backup Modal
// ----------------------------------------------------------------------

function setupSettingsModal() {
  const modal = document.getElementById('modal-settings');
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings-modal');
  const apiKeyInput = document.getElementById('settings-input-api-key') as HTMLInputElement | null;
  const soundCheckbox = document.getElementById('settings-input-sound') as HTMLInputElement | null;
  const exportBtn = document.getElementById('btn-export-json');
  const fileInput = document.getElementById('settings-input-file') as HTMLInputElement | null;
  const restoreDemoBtn = document.getElementById('btn-restore-demo');
  const wipeAllBtn = document.getElementById('btn-wipe-all');

  openBtn?.addEventListener('click', () => {
    if (apiKeyInput) apiKeyInput.value = settings.steamApiKey || '';
    if (soundCheckbox) soundCheckbox.checked = settings.soundAlerts;
    modal?.classList.remove('hidden');
  });

  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  apiKeyInput?.addEventListener('change', () => {
    settings.steamApiKey = apiKeyInput.value.trim();
    saveSettingsToStorage(settings);
  });

  soundCheckbox?.addEventListener('change', () => {
    settings.soundAlerts = soundCheckbox.checked;
    saveSettingsToStorage(settings);
  });

  // Export JSON
  exportBtn?.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(accounts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cs2-drop-fleet-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Import JSON
  fileInput?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          accounts = json;
          saveAccountsToStorage(accounts);
          render();
          modal?.classList.add('hidden');
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  });

  // Restore demo
  restoreDemoBtn?.addEventListener('click', () => {
    accounts = [...INITIAL_DEMO_ACCOUNTS];
    saveAccountsToStorage(accounts);
    render();
    modal?.classList.add('hidden');
  });

  // Wipe all
  wipeAllBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to remove all accounts from tracking?')) {
      accounts = [];
      saveAccountsToStorage(accounts);
      render();
      modal?.classList.add('hidden');
    }
  });
}

// ----------------------------------------------------------------------
// Tab Navigation & Section Switcher
// ----------------------------------------------------------------------

function setupTabNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const secCommand = document.getElementById('section-command-center');
  const secRadar = document.getElementById('section-hacker-radar');
  const secDropRadar = document.getElementById('section-drop-radar');
  const secFleet = document.getElementById('section-fleet');
  const secMatches = document.getElementById('section-live-matches');
  const secLeaderboard = document.getElementById('section-pro-leaderboard');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-target');
      if (!target) return;

      tabs.forEach((t) => {
        const tTarget = t.getAttribute('data-target');
        if (tTarget === target) {
          t.classList.add('active', 'bg-zinc-800', 'text-white');
          t.classList.remove('text-zinc-400');
        } else {
          t.classList.remove('active', 'bg-zinc-800', 'text-white');
          t.classList.add('text-zinc-400');
        }
      });

      // Hide all sections first
      secCommand?.classList.add('hidden');
      secRadar?.classList.add('hidden');
      secDropRadar?.classList.add('hidden');
      secFleet?.classList.add('hidden');
      secMatches?.classList.add('hidden');
      secLeaderboard?.classList.add('hidden');

      if (target === 'section-command-center') {
        secCommand?.classList.remove('hidden');
      } else if (target === 'section-hacker-radar') {
        secRadar?.classList.remove('hidden');
      } else if (target === 'section-drop-radar') {
        secDropRadar?.classList.remove('hidden');
      } else if (target === 'section-fleet') {
        secFleet?.classList.remove('hidden');
      } else if (target === 'section-live-matches') {
        secMatches?.classList.remove('hidden');
        loadLiveMatches();
      } else if (target === 'section-pro-leaderboard') {
        secLeaderboard?.classList.remove('hidden');
        loadProLeaderboard();
      }
    });
  });

  document.getElementById('btn-refresh-matches')?.addEventListener('click', () => {
    loadLiveMatches(true);
  });
  document.getElementById('btn-refresh-leaderboard')?.addEventListener('click', () => {
    loadProLeaderboard(true);
  });
}

// ----------------------------------------------------------------------
// Live Weekly Case Market Prices Ticker
// ----------------------------------------------------------------------

let marketPricesLoaded = false;
async function loadMarketPrices() {
  const container = document.getElementById('market-cards-container');
  const updatedEl = document.getElementById('market-last-updated');
  if (!container) return;

  try {
    const res = await fetch('/api/steam/market');
    const data = await res.json();
    if (data?.success && Array.isArray(data?.prices) && data.prices.length > 0) {
      marketPricesLoaded = true;
      if (updatedEl) {
        updatedEl.textContent = `Synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      container.innerHTML = data.prices.map((item: CaseMarketPrice) => `
        <div class="p-3 rounded-xl bg-zinc-950/80 border border-white/[0.08] hover:border-emerald-500/30 transition flex items-center gap-2.5 group">
          <img
            src="${item.icon}"
            alt="${item.name}"
            class="w-10 h-10 object-contain drop-shadow shrink-0 group-hover:scale-105 transition-transform"
            onerror="this.src='/favicon.svg'"
          />
          <div class="min-w-0 flex-1">
            <div class="text-[11px] font-bold text-zinc-300 truncate" title="${item.name}">${item.name}</div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-xs font-mono font-extrabold text-emerald-400">${item.lowestPrice || '$0.00'}</span>
              <span class="text-[10px] text-zinc-500 font-mono hidden sm:inline">vol: ${item.volume || 'high'}</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.warn('Market prices sync warning:', err);
  }
}

// ----------------------------------------------------------------------
// Live CS2 Pro Tournament Match Tracker
// ----------------------------------------------------------------------

let matchesLoaded = false;
async function loadLiveMatches(force = false) {
  if (matchesLoaded && !force) return;
  const loadingEl = document.getElementById('matches-loading');
  const gridEl = document.getElementById('matches-grid');
  const emptyEl = document.getElementById('matches-empty');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (gridEl) gridEl.classList.add('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');

  try {
    const res = await fetch('/api/cs2/matches');
    const data = await res.json();
    if (data?.success && Array.isArray(data?.matches) && data.matches.length > 0) {
      matchesLoaded = true;
      if (gridEl) {
        gridEl.innerHTML = data.matches.map((m: CS2Match) => {
          const t1Won = m.winner?.id === m.team1.id;
          const t2Won = m.winner?.id === m.team2.id;
          const mapList = m.maps && m.maps.length > 0
            ? m.maps.map(mp => `
                <span class="px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-[11px] font-mono">
                  ${mp.name}: <strong class="text-white">${mp.team1_score}-${mp.team2_score}</strong>
                </span>
              `).join(' ')
            : `<span class="text-xs text-zinc-500">Scorecard confirmed</span>`;

          return `
            <div class="p-5 rounded-2xl bg-surface-1 border border-white/[0.08] hover:border-emerald-500/30 transition flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between text-xs mb-3">
                  <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider text-[10px]">
                    ${m.event || 'CS2 Tournament'}
                  </span>
                  <span class="text-zinc-500 font-mono text-[11px]">Bo${m.best_of || 3} · ${m.date || 'Live'}</span>
                </div>

                <!-- Match Scoreboard -->
                <div class="space-y-2.5 my-3">
                  <!-- Team 1 -->
                  <div class="flex items-center justify-between p-2.5 rounded-xl ${t1Won ? 'bg-emerald-950/40 border border-emerald-500/30' : 'bg-zinc-900/60 border border-white/[0.04]'}">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                        ${m.team1.name ? m.team1.name.slice(0, 2).toUpperCase() : 'T1'}
                      </span>
                      <span class="font-bold text-sm text-white">${m.team1.name}</span>
                      ${m.team1.rank ? `<span class="text-[10px] text-zinc-500 font-mono">#${m.team1.rank}</span>` : ''}
                    </div>
                    <span class="font-mono font-black text-base ${t1Won ? 'text-emerald-400' : 'text-zinc-300'}">${m.team1.score}</span>
                  </div>

                  <!-- Team 2 -->
                  <div class="flex items-center justify-between p-2.5 rounded-xl ${t2Won ? 'bg-emerald-950/40 border border-emerald-500/30' : 'bg-zinc-900/60 border border-white/[0.04]'}">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                        ${m.team2.name ? m.team2.name.slice(0, 2).toUpperCase() : 'T2'}
                      </span>
                      <span class="font-bold text-sm text-white">${m.team2.name}</span>
                      ${m.team2.rank ? `<span class="text-[10px] text-zinc-500 font-mono">#${m.team2.rank}</span>` : ''}
                    </div>
                    <span class="font-mono font-black text-base ${t2Won ? 'text-emerald-400' : 'text-zinc-300'}">${m.team2.score}</span>
                  </div>
                </div>
              </div>

              <!-- Maps Played -->
              <div class="pt-3 border-t border-white/[0.06] flex flex-wrap gap-1.5 items-center justify-between">
                <span class="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Maps:</span>
                <div class="flex flex-wrap gap-1.5">${mapList}</div>
              </div>
            </div>
          `;
        }).join('');
        gridEl.classList.remove('hidden');
      }
      if (loadingEl) loadingEl.classList.add('hidden');
    } else {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (emptyEl) emptyEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error fetching CS2 matches:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
  }
}

// ----------------------------------------------------------------------
// CS2 World Pro Leaderboard & Ratings
// ----------------------------------------------------------------------

let leaderboardLoaded = false;
async function loadProLeaderboard(force = false) {
  if (leaderboardLoaded && !force) return;
  const loadingEl = document.getElementById('leaderboard-loading');
  const tableWrapper = document.getElementById('leaderboard-table-wrapper');
  const tableBody = document.getElementById('leaderboard-table-body');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (tableWrapper) tableWrapper.classList.add('hidden');

  try {
    const res = await fetch('/api/cs2/leaderboard');
    const data = await res.json();
    if (data?.success && Array.isArray(data?.players) && data.players.length > 0) {
      leaderboardLoaded = true;
      if (tableBody) {
        tableBody.innerHTML = data.players.map((p: ProPlayerStat, idx: number) => {
          const diff = p.k - p.d;
          const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
          const diffClass = diff >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
          const medalBadge = idx === 0
            ? '<span class="text-amber-400 font-black">🥇 #1</span>'
            : idx === 1
            ? '<span class="text-zinc-300 font-black">🥈 #2</span>'
            : idx === 2
            ? '<span class="text-amber-600 font-black">🥉 #3</span>'
            : `<span class="text-zinc-500 font-mono font-bold">#${p.rank || idx + 1}</span>`;

          return `
            <tr class="hover:bg-white/[0.02] transition">
              <td class="py-3 px-4 text-xs">${medalBadge}</td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-zinc-800 border border-white/[0.1] flex items-center justify-center font-bold text-xs text-emerald-400">
                    ${p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span class="font-bold text-white block text-sm">${p.name}</span>
                    <span class="text-[11px] text-zinc-500 font-mono">Pro Athlete</span>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4 text-center font-mono font-black text-sm text-emerald-400">${p.rating ? p.rating.toFixed(2) : '-'}</td>
              <td class="py-3 px-4 text-center font-mono text-xs text-zinc-300">${p.adr ? p.adr.toFixed(1) : '-'}</td>
              <td class="py-3 px-4 text-center font-mono text-xs text-zinc-300">${p.kast ? `${p.kast.toFixed(1)}%` : '-'}</td>
              <td class="py-3 px-4 text-center font-mono text-xs text-zinc-400">${p.k} / ${p.d}</td>
              <td class="py-3 px-4 text-center font-mono text-xs ${diffClass}">${diffStr}</td>
              <td class="py-3 px-4 text-center font-mono text-xs text-zinc-400">${p.N || '-'}</td>
            </tr>
          `;
        }).join('');
      }
      if (loadingEl) loadingEl.classList.add('hidden');
      if (tableWrapper) tableWrapper.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

// ----------------------------------------------------------------------
// Match Logger Modal
// ----------------------------------------------------------------------

function setupLogMatchModal() {
  const modal = document.getElementById('modal-log-match');
  const openBtn = document.getElementById('btn-open-log-match');
  const closeBtn = document.getElementById('btn-close-log-match');
  const cancelBtn = document.getElementById('btn-cancel-log-match');
  const form = document.getElementById('form-log-match') as HTMLFormElement | null;
  const accSelect = document.getElementById('log-match-account-select') as HTMLSelectElement | null;
  const accNameEl = document.getElementById('log-match-account-name');
  const accIdInput = document.getElementById('log-match-account-id') as HTMLInputElement | null;

  const populateAccounts = (selectedId?: string) => {
    if (!accSelect) return;
    if (accounts.length === 0) {
      accSelect.innerHTML = '<option value="">No accounts in fleet</option>';
      if (accNameEl) accNameEl.textContent = 'Account: None (add an account first)';
      return;
    }

    accSelect.innerHTML = accounts.map(a => `
      <option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>
        ${a.personaName} (Rank ${a.xpStatus.currentRank})
      </option>
    `).join('');

    const curId = selectedId || accSelect.value || accounts[0].id;
    const curAcc = accounts.find(a => a.id === curId);
    if (accIdInput) accIdInput.value = curId;
    if (accNameEl) accNameEl.textContent = curAcc ? `Account: ${curAcc.personaName}` : 'Account: —';
  };

  accSelect?.addEventListener('change', () => {
    const curAcc = accounts.find(a => a.id === accSelect.value);
    if (accIdInput) accIdInput.value = accSelect.value;
    if (accNameEl) accNameEl.textContent = curAcc ? `Account: ${curAcc.personaName}` : 'Account: —';
  });

  const openModal = (targetAccountId?: string) => {
    if (accounts.length === 0) {
      showToast('Please add a Steam account first before logging matches!', 'warn');
      document.getElementById('btn-open-add-modal')?.click();
      return;
    }
    populateAccounts(targetAccountId || accounts[0]?.id);
    modal?.classList.remove('hidden');
  };

  openBtn?.addEventListener('click', () => openModal());
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const accId = accIdInput?.value || accSelect?.value;
    const acc = accounts.find(a => a.id === accId);
    if (!acc) {
      showToast('Please select a valid account!', 'warn');
      return;
    }

    const mapVal = (document.getElementById('log-match-map') as HTMLSelectElement)?.value || 'Mirage';
    const modeVal = (document.getElementById('log-match-mode') as HTMLSelectElement)?.value as any || 'Premier';
    const resultVal = (document.getElementById('log-match-result') as HTMLSelectElement)?.value as any || 'Win';
    const wonVal = parseInt((document.getElementById('log-match-won') as HTMLInputElement)?.value || '13', 10);
    const lostVal = parseInt((document.getElementById('log-match-lost') as HTMLInputElement)?.value || '8', 10);
    const killsVal = parseInt((document.getElementById('log-match-kills') as HTMLInputElement)?.value || '20', 10);
    const deathsVal = parseInt((document.getElementById('log-match-deaths') as HTMLInputElement)?.value || '12', 10);
    const xpVal = parseInt((document.getElementById('log-match-xp') as HTMLInputElement)?.value || '480', 10);
    const dropChecked = (document.getElementById('log-match-drop-check') as HTMLInputElement)?.checked;

    const matchLog: PlayerMatchLog = {
      id: `match-${Date.now()}`,
      timestamp: new Date().toISOString(),
      map: mapVal,
      mode: modeVal,
      result: resultVal,
      roundsWon: wonVal,
      roundsLost: lostVal,
      kills: killsVal,
      deaths: deathsVal,
      xpEarned: xpVal,
      dropReceived: dropChecked
    };

    if (!acc.matchLogs) acc.matchLogs = [];
    acc.matchLogs.unshift(matchLog);

    // Apply XP & level up
    acc.xpStatus.currentXp += xpVal;
    acc.xpStatus.weeklyXpEarned += xpVal;
    while (acc.xpStatus.currentXp >= 5000) {
      if (acc.xpStatus.currentRank < 40) {
        acc.xpStatus.currentRank += 1;
      }
      acc.xpStatus.currentXp -= 5000;
    }
    acc.serviceMedal.ranksUntilNextMedal = Math.max(0, 40 - acc.xpStatus.currentRank);

    // Apply drop if claimed
    if (dropChecked) {
      acc.dropStatus.claimed = true;
      acc.dropStatus.claimedAt = new Date().toISOString();
      if (!acc.dropStatus.recentDrop) {
        acc.dropStatus.recentDrop = {
          id: `drop-${Date.now()}`,
          name: 'Gallery Case',
          type: 'case',
          marketPrice: 1.01,
          date: new Date().toLocaleDateString()
        };
      }
    }

    saveAccountsToStorage(accounts);
    render();
    showToast(`Logged ${resultVal} on ${mapVal} (+${xpVal} XP) for ${acc.personaName}!`, 'success');
    modal?.classList.add('hidden');
  });

  (window as any).openLogMatchForAccount = (id: string) => openModal(id);
}

// ----------------------------------------------------------------------
// CS2 Multi-Source Scavenger Integration
// ----------------------------------------------------------------------

async function setupScavenger() {
  const refreshBtn = document.getElementById('btn-scavenge-refresh');
  const copyBtn = document.getElementById('btn-hero-copy-id');

  copyBtn?.addEventListener('click', () => {
    const idEl = document.getElementById('hero-player-steamid');
    if (idEl) {
      navigator.clipboard.writeText(idEl.textContent || '76561198287445170');
      showToast('SteamID64 copied to clipboard!', 'info');
    }
  });

  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.classList.add('opacity-50', 'pointer-events-none');
    showToast('Scavenging live stats from Steam, CSTracker & Leetify...', 'info');
    await fetchScavengerData(true);
    refreshBtn.classList.remove('opacity-50', 'pointer-events-none');
  });

  // Initial fetch
  await fetchScavengerData(false);
}

async function fetchScavengerData(isManual = false) {
  try {
    const res = await fetch('/api/cs2/scavenger?steamId=76561198287445170');
    const data = await res.json();

    if (data?.success && data?.profile) {
      currentScavengedProfile = data.profile;
      scavengedMatches = data.matches || [];

      // Update hero header elements
      const nameEl = document.getElementById('hero-player-name');
      const avatarEl = document.getElementById('hero-player-avatar') as HTMLImageElement | null;
      const steamIdEl = document.getElementById('hero-player-steamid');

      if (nameEl) nameEl.textContent = data.profile.personaName;
      if (avatarEl && data.profile.avatarUrl) avatarEl.src = data.profile.avatarUrl;
      if (steamIdEl) steamIdEl.textContent = data.profile.steamId64;

      // Update external links
      const links = data.profile.platformLinks;
      if (links) {
        updateLinkHref('link-leetify', links.leetify);
        updateLinkHref('link-cstracker', links.cstracker);
        updateLinkHref('link-csstat', links.csstat);
        updateLinkHref('link-faceit', links.faceit);
        updateLinkHref('link-scopegg', links.scopegg);
        updateLinkHref('link-steam', links.steamCommunity);
      }

      // Render featured inventory items if provided
      const invGrid = document.getElementById('hero-inventory-grid');
      if (invGrid && Array.isArray(data.profile.featuredInventory) && data.profile.featuredInventory.length > 0) {
        invGrid.innerHTML = data.profile.featuredInventory.map((item: InventoryShowcaseItem) => {
          const isCovert = item.category === 'knife' || item.category === 'gloves';
          const borderClass = isCovert
            ? 'border-red-500/40 hover:border-red-500 shadow-[0_0_15px_-5px_rgba(235,75,75,0.25)]'
            : item.category === 'medal'
            ? 'border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_15px_-5px_rgba(16,185,129,0.25)]'
            : 'border-amber-500/40 hover:border-amber-400';

          const badgeBg = isCovert
            ? 'bg-red-950/80 text-red-400 border-red-500/30'
            : item.category === 'medal'
            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
            : 'bg-amber-950/80 text-amber-400 border-amber-500/30';

          return `
            <div class="relative overflow-hidden rounded-2xl bg-zinc-950/80 border ${borderClass} p-4 transition group flex flex-col justify-between">
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="px-2 py-0.5 rounded ${badgeBg} border font-bold text-[10px] uppercase">
                  ${item.type}
                </span>
                ${item.estimatedValue ? `<span class="font-mono text-[11px] font-bold text-amber-400">~$${item.estimatedValue.toFixed(2)}</span>` : ''}
              </div>
              <div class="my-3 flex items-center justify-center h-28 relative">
                <img
                  src="${item.iconUrl}"
                  alt="${item.name}"
                  class="max-h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]"
                  onerror="this.src='/favicon.svg'"
                />
              </div>
              <div>
                <h4 class="font-black text-sm text-white truncate" title="${item.name}">${item.name}</h4>
                <span class="text-[11px] text-zinc-400">${item.wear || 'Official Valve Item'}</span>
              </div>
            </div>
          `;
        }).join('');
      }

      // Update Drop Radar if data received
      if (data.dropIntelligence) {
        currentDropIntelligence = data.dropIntelligence;
        updateDropRadarData(data.dropIntelligence);
      }

      // Render the 10 real scraped matches in command-matches-list
      if (Array.isArray(data.matches) && data.matches.length > 0) {
        renderScavengedMatches(data.matches);
      }

      if (isManual) {
        showToast('⚡ Live stats & inventory successfully scavenged for greatmahakaal!', 'success');
      }
    }
  } catch (err) {
    console.warn('Scavenger fetch warning:', err);
  }
}

function updateLinkHref(id: string, url?: string) {
  const el = document.getElementById(id) as HTMLAnchorElement | null;
  if (el && url) el.href = url;
}

// -------------------------------------------------------------
// Authentication Controller
// -------------------------------------------------------------

function setupAuth() {
  const modal = document.getElementById('modal-auth');
  const btnClose = document.getElementById('btn-close-auth-modal');
  const btnOpenAuth = document.getElementById('btn-nav-open-auth');
  const btnUserMenu = document.getElementById('btn-nav-user-menu');
  const tabLogin = document.getElementById('tab-auth-login');
  const tabRegister = document.getElementById('tab-auth-register');
  const fieldUsername = document.getElementById('auth-field-username');
  const fieldSteam = document.getElementById('auth-field-steam');
  const btnSubmit = document.getElementById('auth-btn-submit');
  const formAuth = document.getElementById('form-auth-user') as HTMLFormElement | null;
  const inputEmail = document.getElementById('auth-input-email') as HTMLInputElement | null;
  const inputPassword = document.getElementById('auth-input-password') as HTMLInputElement | null;
  const inputUsername = document.getElementById('auth-input-username') as HTMLInputElement | null;
  const inputSteam = document.getElementById('auth-input-steamid') as HTMLInputElement | null;
  const btnQuickGreatmahakaal = document.getElementById('btn-quick-login-greatmahakaal');

  let mode: 'login' | 'register' = 'login';

  const updateModalTabs = () => {
    if (mode === 'login') {
      tabLogin?.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/30');
      tabLogin?.classList.remove('text-zinc-400');
      tabRegister?.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/30');
      tabRegister?.classList.add('text-zinc-400');
      fieldUsername?.classList.add('hidden');
      fieldSteam?.classList.add('hidden');
      if (btnSubmit) btnSubmit.textContent = 'Sign In';
    } else {
      tabRegister?.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/30');
      tabRegister?.classList.remove('text-zinc-400');
      tabLogin?.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/30');
      tabLogin?.classList.add('text-zinc-400');
      fieldUsername?.classList.remove('hidden');
      fieldSteam?.classList.remove('hidden');
      if (btnSubmit) btnSubmit.textContent = 'Create Account';
    }
  };

  tabLogin?.addEventListener('click', () => { mode = 'login'; updateModalTabs(); });
  tabRegister?.addEventListener('click', () => { mode = 'register'; updateModalTabs(); });

  btnOpenAuth?.addEventListener('click', () => modal?.classList.remove('hidden'));
  btnUserMenu?.addEventListener('click', () => modal?.classList.remove('hidden'));
  btnClose?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  btnQuickGreatmahakaal?.addEventListener('click', () => {
    const user = loginWithSteam('76561198287445170');
    updateNavbarUser(user);
    modal?.classList.add('hidden');
    showToast('Connected as TheKugelBlitz (greatmahakaal)!', 'success');
  });

  formAuth?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = inputEmail?.value.trim() || 'greatmahakaal@steam.community';
    const password = inputPassword?.value || '';
    const username = inputUsername?.value.trim() || 'TheKugelBlitz';
    const steam = inputSteam?.value.trim() || '76561198287445170';

    let user;
    if (mode === 'register') {
      user = registerUser({ username, email, password, steamId64: steam });
      showToast(`Account created for ${user.username}!`, 'success');
    } else {
      user = loginUser(email, password);
      showToast(`Welcome back, ${user.username}!`, 'success');
    }
    updateNavbarUser(user);
    modal?.classList.add('hidden');
  });

  // Initial user state check
  const currentUser = getCurrentUser();
  updateNavbarUser(currentUser);
}

function updateNavbarUser(user: UserAccount | null) {
  const btnOpenAuth = document.getElementById('btn-nav-open-auth');
  const userProfile = document.getElementById('nav-user-profile');
  const userNameEl = document.getElementById('nav-user-name');
  const userAvatarEl = document.getElementById('nav-user-avatar') as HTMLImageElement | null;

  if (user) {
    btnOpenAuth?.classList.add('hidden');
    userProfile?.classList.remove('hidden');
    if (userNameEl) userNameEl.textContent = user.username;
    if (userAvatarEl && user.avatarUrl) userAvatarEl.src = user.avatarUrl;
  } else {
    btnOpenAuth?.classList.remove('hidden');
    userProfile?.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// 360-Degree Drop & XP Radar Controller
// -------------------------------------------------------------

function setupDropRadar() {
  const timerEl = document.getElementById('drop-countdown-timer');

  const updateCountdown = () => {
    const { formattedTimeRemaining } = getWeeklyResetCycle();
    if (timerEl) timerEl.textContent = formattedTimeRemaining;
  };
  updateCountdown();
  setInterval(updateCountdown, 60000);
}

function updateDropRadarData(intel: WeeklyDropIntelligence) {
  const statusEl = document.getElementById('drop-status-text');
  const multEl = document.getElementById('drop-xp-multiplier');
  const xpProgEl = document.getElementById('drop-xp-progress-text');
  const xpBarEl = document.getElementById('drop-xp-bar');
  const xpRemainEl = document.getElementById('drop-xp-remaining-text');
  const recEl = document.getElementById('drop-recommendation-text');
  const navPill = document.getElementById('nav-drop-pill');

  if (statusEl) {
    statusEl.innerHTML = intel.isDropClaimed
      ? '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span><span>CLAIMED</span>'
      : '<span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span><span>DROP DUE</span>';
  }

  if (multEl) multEl.textContent = intel.weeklyMultiplierTier;
  if (xpProgEl) xpProgEl.textContent = `${(intel.xpWeeklyAccumulated % 5000).toLocaleString()} / 5,000 XP`;
  if (xpBarEl) {
    const pct = Math.min(100, Math.round(((intel.xpWeeklyAccumulated % 5000) / 5000) * 100));
    xpBarEl.style.width = `${pct}%`;
  }
  if (xpRemainEl) xpRemainEl.textContent = `${intel.xpToNextRank.toLocaleString()} XP to Level Up`;
  if (recEl) recEl.textContent = intel.recommendation;

  if (navPill) {
    if (intel.isDropClaimed) {
      navPill.className = 'px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-500/30 hidden sm:inline';
      navPill.textContent = '✓ Drop';
    } else {
      navPill.className = 'px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-950 text-amber-400 border border-amber-500/30 hidden sm:inline';
      navPill.textContent = '🚨 Due';
    }
  }
}

// -------------------------------------------------------------
// Scavenged Matches Feed Renderer
// -------------------------------------------------------------

function renderScavengedMatches(matches: DetailedMatch[]) {
  const container = document.getElementById('command-matches-list');
  if (!container || !Array.isArray(matches) || matches.length === 0) return;

  container.innerHTML = matches.map(m => {
    const isClean = m.hackerBadge?.threatLevel === 'CLEAN';
    const isFlagged = m.hackerBadge?.threatLevel === 'FLAGGED';

    const borderClass = isClean
      ? 'border-emerald-500/30 hover:border-emerald-400'
      : isFlagged
      ? 'border-red-500/40 hover:border-red-500 shadow-[0_0_20px_-8px_rgba(239,68,68,0.2)]'
      : 'border-yellow-500/30 hover:border-yellow-400';

    const badgeClass = isClean
      ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
      : isFlagged
      ? 'bg-red-950 text-red-400 border-red-500/30 animate-pulse'
      : 'bg-yellow-950 text-yellow-400 border-yellow-500/30';

    const tele = m.userTelemetry;

    return `
      <div class="rounded-2xl bg-surface-1 border ${borderClass} p-5 transition">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3 mb-3">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded-lg ${badgeClass} border text-xs font-black uppercase tracking-wider">
              ${m.hackerBadge?.shortTag || 'VERIFIED'}
            </span>
            <div>
              <h4 class="font-extrabold text-white text-base">
                ${m.hackerBadge?.titleText || `${m.map} (${m.scoreTeam1} - ${m.scoreTeam2})`}
              </h4>
              <span class="text-xs text-zinc-400 font-mono">
                ${m.serverRegion || 'Mumbai'} Server · ${m.mode} · Duration: ${m.duration} · ${m.date}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="btn-inspect-match-radar px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              data-match-id="${m.id}"
            >
              <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span>Inspect 10-Player Scoreboard</span>
            </button>

            ${m.sourceUrl ? `
              <a
                href="${m.sourceUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.08] transition"
                title="Open CSTracker Match"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            ` : ''}
          </div>
        </div>

        ${tele ? `
          <div class="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
            <div class="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
              <span class="text-[10px] text-zinc-500 font-mono block uppercase">K / D / A</span>
              <strong class="text-white font-mono text-sm">${tele.kills} / ${tele.deaths} / ${tele.assists}</strong>
            </div>
            <div class="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
              <span class="text-[10px] text-zinc-500 font-mono block uppercase">ADR</span>
              <strong class="text-orange-400 font-mono text-sm">${tele.adr.toFixed(1)}</strong>
            </div>
            <div class="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
              <span class="text-[10px] text-zinc-500 font-mono block uppercase">HLTV Rating</span>
              <strong class="text-emerald-400 font-mono text-sm">${tele.hltvRating.toFixed(2)}</strong>
            </div>
            <div class="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
              <span class="text-[10px] text-zinc-500 font-mono block uppercase">Accuracy</span>
              <strong class="text-cyan-400 font-mono text-sm">${tele.accuracyPct ? tele.accuracyPct + '%' : '18.5%'}</strong>
            </div>
            <div class="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
              <span class="text-[10px] text-zinc-500 font-mono block uppercase">Preaim Angle</span>
              <strong class="text-white font-mono text-sm">${tele.preaimDeg ? tele.preaimDeg + '°' : '2.1°'}</strong>
            </div>
            <div class="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
              <span class="text-[10px] text-zinc-500 font-mono block uppercase">Anti-Cheat Verdict</span>
              <strong class="${isClean ? 'text-emerald-400' : 'text-red-400'} font-mono text-sm">${isClean ? '0.00% Risk' : m.hackerBadge?.flaggedPlayer || 'Flagged'}</strong>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ----------------------------------------------------------------------
// Hacker Radar & Predictive Anti-Cheat Engine Integration
// ----------------------------------------------------------------------

function setupHackerRadar() {
  const form = document.getElementById('form-scan-player') as HTMLFormElement | null;
  const input = document.getElementById('input-scan-target') as HTMLInputElement | null;
  const sampleBtn = document.getElementById('btn-scan-demo-cheater');
  const resultContainer = document.getElementById('radar-live-result');

  sampleBtn?.addEventListener('click', () => {
    if (input) input.value = 'xX_OneTapGod_Xx (Enemy Match #006591)';
    runScanAnalysis({
      steamId64: '76561199581920394',
      personaName: 'xX_OneTapGod_Xx',
      kills: 13,
      deaths: 12,
      headshotPct: 92.3,
      adr: 89.2,
      aimRating: 98,
      reactionTimeMs: 145,
      crosshairErrorDeg: 3.2,
      throughSmokeKillsPct: 28,
      steamLevel: 1,
      hoursPlayed: 45,
      accountAgeYears: 0.1
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input?.value.trim();
    if (!query) {
      showToast('Please enter a Steam ID, vanity name, or share code', 'warn');
      return;
    }

    showToast(`Analyzing threat indicators for ${query}...`, 'info');

    // If scanning self (greatmahakaal)
    if (query.includes('greatmahakaal') || query.includes('76561198287445170') || query.includes('TheKugelBlitz')) {
      runScanAnalysis({
        steamId64: '76561198287445170',
        personaName: 'TheKugelBlitz',
        kills: 18,
        deaths: 9,
        headshotPct: 48.0,
        adr: 83.0,
        aimRating: 78,
        reactionTimeMs: 310,
        crosshairErrorDeg: 6.8,
        throughSmokeKillsPct: 5,
        steamLevel: 45,
        hoursPlayed: 1200,
        accountAgeYears: 10,
        inventoryCount: 563
      });
      return;
    }

    // Default custom scan
    runScanAnalysis({
      steamId64: query.match(/\d{17}/) ? query : '76561199' + Math.floor(100000000 + Math.random() * 900000000),
      personaName: query,
      kills: 24,
      deaths: 8,
      headshotPct: 78.0,
      adr: 105.0,
      aimRating: 94,
      reactionTimeMs: 168,
      crosshairErrorDeg: 3.9,
      throughSmokeKillsPct: 24,
      steamLevel: 2,
      hoursPlayed: 65,
      accountAgeYears: 0.3
    });
  });

  async function runScanAnalysis(payload: any) {
    if (!resultContainer) return;
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = `
      <div class="flex items-center justify-center py-6 text-xs text-zinc-400 gap-2">
        <span class="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
        <span>Running heuristic neural scan across aimbot, wallhack & account trust vectors...</span>
      </div>
    `;

    try {
      const res = await fetch('/api/cs2/hacker-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: payload })
      });

      const data = await res.json();
      if (data?.success && data?.scan) {
        renderScanResultCard(data.scan);
      } else {
        resultContainer.innerHTML = `<div class="text-xs text-red-400">Scan failed: ${data?.error || 'Unknown error'}</div>`;
      }
    } catch (err) {
      resultContainer.innerHTML = `<div class="text-xs text-red-400">Scan service temporarily unreachable</div>`;
    }
  }

  function renderScanResultCard(scan: HackerScanResult) {
    if (!resultContainer) return;
    const isClean = scan.threatLevel === 'CLEAN';
    const isFlagged = scan.threatLevel === 'FLAGGED';
    const isHighRisk = scan.threatLevel === 'HIGH_RISK';

    const borderCol = isClean
      ? 'border-emerald-500/40 bg-emerald-950/20'
      : isFlagged
      ? 'border-red-500/50 bg-red-950/30'
      : 'border-yellow-500/40 bg-yellow-950/20';

    const badgeBg = isClean
      ? 'bg-emerald-500 text-black'
      : isFlagged
      ? 'bg-red-500 text-white animate-pulse'
      : 'bg-yellow-500 text-black';

    resultContainer.className = `mt-4 p-5 rounded-2xl border ${borderCol} space-y-4 shadow-2xl`;
    resultContainer.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${badgeBg}">
            ${scan.threatScore}%
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-white text-base">${scan.personaName}</h4>
              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${badgeBg}">
                ${scan.threatLevel}
              </span>
            </div>
            <p class="text-xs text-zinc-400 font-mono">${scan.steamId64}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="font-bold text-xs ${isClean ? 'text-emerald-400' : 'text-red-400'} block">${scan.verdictTitle}</span>
          <span class="text-[11px] text-zinc-500 font-mono">Confidence: 94.8%</span>
        </div>
      </div>

      <p class="text-xs text-zinc-300 leading-relaxed">${scan.verdictSummary}</p>

      <!-- Threat Vector Breakdown Bars -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
        <div class="p-2.5 rounded-xl bg-black/60 border border-white/[0.06]">
          <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>Aimbot Index</span>
            <strong class="font-mono text-white">${scan.vectors.aimbotScore}/100</strong>
          </div>
          <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full ${scan.vectors.aimbotScore > 60 ? 'bg-red-500' : 'bg-emerald-400'}" style="width: ${scan.vectors.aimbotScore}%"></div>
          </div>
        </div>

        <div class="p-2.5 rounded-xl bg-black/60 border border-white/[0.06]">
          <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>Wallhack / ESP</span>
            <strong class="font-mono text-white">${scan.vectors.wallhackScore}/100</strong>
          </div>
          <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full ${scan.vectors.wallhackScore > 60 ? 'bg-red-500' : 'bg-emerald-400'}" style="width: ${scan.vectors.wallhackScore}%"></div>
          </div>
        </div>

        <div class="p-2.5 rounded-xl bg-black/60 border border-white/[0.06]">
          <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>Reaction Anomaly</span>
            <strong class="font-mono text-white">${scan.vectors.reactionTimeAnomaly}/100</strong>
          </div>
          <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full ${scan.vectors.reactionTimeAnomaly > 60 ? 'bg-red-500' : 'bg-emerald-400'}" style="width: ${scan.vectors.reactionTimeAnomaly}%"></div>
          </div>
        </div>

        <div class="p-2.5 rounded-xl bg-black/60 border border-white/[0.06]">
          <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>Account Trust</span>
            <strong class="font-mono text-white">${scan.vectors.accountTrustScore}/100</strong>
          </div>
          <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full ${scan.vectors.accountTrustScore < 40 ? 'bg-red-500' : 'bg-emerald-400'}" style="width: ${scan.vectors.accountTrustScore}%"></div>
          </div>
        </div>
      </div>

      <!-- Itemized Detection Flags -->
      <div class="flex flex-wrap gap-1.5 pt-2">
        ${scan.flags.map(f => `
          <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold ${isClean ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-red-950/80 text-red-400 border border-red-500/30'}">
            ${isClean ? '✓' : '⚠️'} ${f}
          </span>
        `).join('')}
      </div>
    `;
  }
}

// ----------------------------------------------------------------------
// Match Scoreboard Drawer & Lineup Inspector
// ----------------------------------------------------------------------

function setupMatchScorecardModal() {
  const modal = document.getElementById('modal-match-scorecard');
  const closeBtn = document.getElementById('btn-close-scorecard');
  const copyBtn = document.getElementById('btn-copy-share-code');

  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Connect inspect match buttons (delegated listener to support dynamic and static match cards)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest('.btn-inspect-match-radar');
    if (btn) {
      const matchId = btn.getAttribute('data-match-id');
      const match = scavengedMatches.find(m => m.id === matchId || m.scrapedMatchId === matchId) || (scavengedMatches[0] as DetailedMatch | undefined);
      if (match) {
        openMatchScorecard(match);
      } else {
        showToast('Loading match demo logs...', 'info');
      }
    }
  });

  function openMatchScorecard(m: DetailedMatch) {
    if (!modal) return;
    const titleEl = document.getElementById('scorecard-match-title');
    const metaEl = document.getElementById('scorecard-match-meta');
    const verdictEl = document.getElementById('scorecard-match-verdict');
    const t1TitleEl = document.getElementById('scorecard-team1-title');
    const t2TitleEl = document.getElementById('scorecard-team2-title');
    const t1Body = document.getElementById('scorecard-team1-body');
    const t2Body = document.getElementById('scorecard-team2-body');

    if (titleEl) titleEl.textContent = `${m.map} (${m.mode}) · ${m.team1Name} vs ${m.team2Name}`;
    if (metaEl) metaEl.textContent = `${m.scoreTeam1} - ${m.scoreTeam2} Victory · Duration: ${m.duration} · ${m.date}`;

    if (verdictEl) {
      if (m.hackerRadarSummary.flaggedCount > 0) {
        verdictEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-red-950 text-red-400 border border-red-500/30';
        verdictEl.textContent = `${m.hackerRadarSummary.flaggedCount} Cheater Flagged`;
      } else if (m.hackerRadarSummary.suspectCount > 0) {
        verdictEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-yellow-950 text-yellow-400 border border-yellow-500/30';
        verdictEl.textContent = `${m.hackerRadarSummary.suspectCount} Suspect`;
      } else {
        verdictEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30';
        verdictEl.textContent = '100% Clean Match';
      }
    }

    if (t1TitleEl) t1TitleEl.textContent = `${m.team1Name} — ${m.scoreTeam1} Rounds`;
    if (t2TitleEl) t2TitleEl.textContent = `${m.team2Name} — ${m.scoreTeam2} Rounds`;

    // Copy Share Code setup
    if (copyBtn) {
      copyBtn.onclick = () => {
        const code = m.demoShareCode || 'CSGO-vG38B-9KqwA-P9J9H-N8uF5-RkmzE';
        navigator.clipboard.writeText(code);
        showToast(`Match share code copied: ${code}`, 'success');
      };
    }

    // Split players by team
    const team1Players = m.players.filter(p => p.team === 'CT' || p.team === 'Team1');
    const team2Players = m.players.filter(p => p.team === 'T' || p.team === 'Team2');

    const renderPlayerRow = (p: MatchPlayerScore) => {
      const isTargetUser = p.steamId64 === '76561198287445170' || p.personaName === 'TheKugelBlitz';
      const scan = p.hackerScan;
      const isFlagged = scan?.threatLevel === 'FLAGGED';
      const isHighRisk = scan?.threatLevel === 'HIGH_RISK';
      const isClean = scan?.threatLevel === 'CLEAN';

      const threatBadge = isFlagged
        ? '<span class="px-2 py-0.5 rounded bg-red-900 text-red-200 border border-red-500 font-bold text-[10px]">🚨 FLAGGED (86%)</span>'
        : isHighRisk
        ? '<span class="px-2 py-0.5 rounded bg-yellow-900 text-yellow-200 border border-yellow-500 font-bold text-[10px]">⚠️ HIGH RISK (72%)</span>'
        : '<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">✓ CLEAN</span>';

      return `
        <tr class="hover:bg-white/[0.02] transition ${isTargetUser ? 'bg-emerald-950/20' : ''}">
          <td class="py-2.5 px-4">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg overflow-hidden border border-white/[0.1] bg-black shrink-0">
                <img src="${p.avatarUrl || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'}" class="w-full h-full object-cover" />
              </div>
              <div>
                <span class="font-bold text-white block ${isTargetUser ? 'text-emerald-400' : ''}">${p.personaName} ${isTargetUser ? '(greatmahakaal)' : ''}</span>
                <span class="font-mono text-[10px] text-zinc-500">${p.steamId64}</span>
              </div>
            </div>
          </td>
          <td class="py-2.5 px-3 text-center font-mono font-bold text-white">${p.kills} / ${p.deaths} / ${p.assists}</td>
          <td class="py-2.5 px-3 text-center font-mono text-zinc-300">${p.adr.toFixed(1)}</td>
          <td class="py-2.5 px-3 text-center font-mono ${p.headshotPct >= 70 ? 'text-red-400 font-bold' : 'text-zinc-300'}">${p.headshotPct.toFixed(0)}%</td>
          <td class="py-2.5 px-3 text-center font-mono text-zinc-400">${p.kast.toFixed(0)}%</td>
          <td class="py-2.5 px-3 text-center font-mono font-black ${p.hltvRating >= 1.3 ? 'text-emerald-400' : 'text-zinc-300'}">${p.hltvRating.toFixed(2)}</td>
          <td class="py-2.5 px-4 text-right">
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

