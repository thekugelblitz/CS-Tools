import type { SteamAccount, DropItem, XpMultiplier, ServiceMedalTier } from '../lib/types';
import {
  loadAccountsFromStorage,
  saveAccountsToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  type AppSettings
} from '../lib/client-store';
import { INITIAL_DEMO_ACCOUNTS } from '../lib/mock-data';

// Global state
let accounts: SteamAccount[] = [];
let settings: AppSettings = loadSettingsFromStorage();
let currentFilter: 'all' | 'available' | 'claimed' | 'near-medal' = 'all';
let searchQuery: string = '';
let currentView: 'grid' | 'table' = 'grid';

// Initialize
export function initDashboard() {
  accounts = loadAccountsFromStorage();
  currentView = settings.activeView || 'grid';

  bindEvents();
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
