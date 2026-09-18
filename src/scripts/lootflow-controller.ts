import {
  lootStore,
  formatMoney,
  formatPercent,
  convertValue,
  getCurrentTuesdayWeekId,
  CURRENCY_RATES
} from '../lib/lootflow-store';
import { CS2_DROP_POOL } from '../lib/cs2-drop-pool';
import { calculateMedalProgress, getRankDetails, CS2_RANKS } from '../lib/xp-tracker-engine';
import type { Currency, ItemType, ItemWear, LootDrop } from '../lib/lootflow-types';

let currentTab = 'fleet';
let dropFilterQuery = '';
let dropFilterType = 'all';
let dropFilterSold = 'all';
let activeXpAccountId = '';

export function initLootFlow() {
  setupViewSwitcher();
  setupCurrencySelector();
  setupSubTabs();
  setupModals();
  setupLogDropPresets();
  setupXpTrackerTab();
  startLootResetCountdown();

  // Subscribe to store updates
  lootStore.subscribe(() => {
    renderAll();
  });

  // Initial render
  renderAll();
}

// -------------------------------------------------------------
// View Switcher (Drop Tracker vs Player Radar)
// -------------------------------------------------------------

function setupViewSwitcher() {
  const btnLootFlow = document.getElementById('btn-mode-lootflow');
  const btnQuickLook = document.getElementById('btn-mode-quicklook');
  const navBtnLootFlow = document.getElementById('nav-link-drop-tracker');
  const navBtnQuickLook = document.getElementById('nav-link-player-radar');

  const viewLootFlow = document.getElementById('view-lootflow-tracker');
  const viewQuickLook = document.getElementById('view-quicklook-radar');

  function setMode(mode: 'lootflow' | 'quicklook') {
    if (mode === 'lootflow') {
      viewLootFlow?.classList.remove('hidden');
      viewQuickLook?.classList.add('hidden');

      btnLootFlow?.classList.add('bg-emerald-400', 'text-black', 'glow-emerald', 'font-extrabold');
      btnLootFlow?.classList.remove('text-zinc-400');
      btnQuickLook?.classList.remove('bg-emerald-400', 'text-black', 'glow-emerald', 'font-extrabold');
      btnQuickLook?.classList.add('text-zinc-400');

      navBtnLootFlow?.classList.add('bg-emerald-400', 'text-black', 'glow-emerald', 'font-extrabold');
      navBtnLootFlow?.classList.remove('text-zinc-400');
      navBtnQuickLook?.classList.remove('bg-emerald-400', 'text-black', 'glow-emerald', 'font-extrabold');
      navBtnQuickLook?.classList.add('text-zinc-400');
    } else {
      viewQuickLook?.classList.remove('hidden');
      viewLootFlow?.classList.add('hidden');

      btnQuickLook?.classList.add('bg-emerald-400', 'text-black', 'glow-emerald', 'font-extrabold');
      btnQuickLook?.classList.remove('text-zinc-400');
      btnLootFlow?.classList.remove('bg-emerald-400', 'text-black', 'glow-emerald', 'font-extrabold');
      btnLootFlow?.classList.add('text-zinc-400');

      navBtnQuickLook?.classList.add('bg-emerald-400', 'text-black', 'glow-emerald', 'font-extrabold');
      navBtnQuickLook?.classList.remove('text-zinc-400');
      navBtnLootFlow?.classList.remove('bg-emerald-400', 'text-black', 'glow-emerald', 'font-extrabold');
      navBtnLootFlow?.classList.add('text-zinc-400');
    }
  }

  btnLootFlow?.addEventListener('click', () => setMode('lootflow'));
  btnQuickLook?.addEventListener('click', () => setMode('quicklook'));
  navBtnLootFlow?.addEventListener('click', () => setMode('lootflow'));
  navBtnQuickLook?.addEventListener('click', () => setMode('quicklook'));
}

// -------------------------------------------------------------
// Currency Selector
// -------------------------------------------------------------

function setupCurrencySelector() {
  const buttons = document.querySelectorAll('.lf-currency-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const curr = btn.getAttribute('data-curr') as Currency;
      if (curr) {
        lootStore.setCurrency(curr);
        updateCurrencyButtonStyles(curr);
      }
    });
  });
}

function updateCurrencyButtonStyles(currentCurr: Currency) {
  const buttons = document.querySelectorAll('.lf-currency-btn');
  buttons.forEach(btn => {
    const curr = btn.getAttribute('data-curr');
    if (curr === currentCurr) {
      btn.className = 'lf-currency-btn px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    } else {
      btn.className = 'lf-currency-btn px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer text-zinc-400 hover:text-white';
    }
  });
}

// -------------------------------------------------------------
// Sub-Tabs Navigation
// -------------------------------------------------------------

function setupSubTabs() {
  const tabButtons = document.querySelectorAll('.lf-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) {
        currentTab = tab;
        switchTab(tab);
      }
    });
  });
}

function switchTab(tab: string) {
  const tabButtons = document.querySelectorAll('.lf-tab-btn');
  tabButtons.forEach(btn => {
    const t = btn.getAttribute('data-tab');
    if (t === tab) {
      btn.className = 'lf-tab-btn px-4 py-2 rounded-xl text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 transition flex items-center gap-2 cursor-pointer shrink-0 font-bold';
    } else {
      btn.className = 'lf-tab-btn px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.03] transition flex items-center gap-2 cursor-pointer shrink-0';
    }
  });

  const tabContents = ['fleet', 'ledger', 'collection', 'goals', 'xp-radar'];
  tabContents.forEach(t => {
    const el = document.getElementById(`tab-content-${t}`);
    if (el) {
      if (t === tab) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  if (tab === 'xp-radar') {
    renderXpTrackerTab();
  }
}

// -------------------------------------------------------------
// Live Reset Countdown Timer
// -------------------------------------------------------------

function startLootResetCountdown() {
  const timerEl = document.getElementById('lf-reset-countdown');
  function update() {
    if (!timerEl) return;
    const now = new Date();
    // Wednesday 00:00:00 UTC is drop reset
    const target = new Date(now);
    target.setUTCHours(0, 0, 0, 0);
    const day = target.getUTCDay();
    const daysUntilWed = (3 - day + 7) % 7 || 7;
    target.setUTCDate(target.getUTCDate() + daysUntilWed);

    const diff = target.getTime() - now.getTime();
    if (diff <= 0) {
      timerEl.textContent = 'Resetting now...';
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    timerEl.textContent = `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  }

  update();
  setInterval(update, 1000);
}

// -------------------------------------------------------------
// Main Render Pipeline
// -------------------------------------------------------------

function renderAll() {
  const currency = lootStore.getCurrency();
  updateCurrencyButtonStyles(currency);

  const stats = lootStore.getSummaryStats();
  const accounts = lootStore.getAccounts();
  const drops = lootStore.getDrops();
  const goals = lootStore.getGoals();
  const collection = lootStore.getDiscoveredCollection();

  // 1. Hero KPI Cards
  const grossEl = document.getElementById('stat-gross-value');
  if (grossEl) grossEl.textContent = formatMoney(stats.totalSteamValue, currency);

  const totalDropsSub = document.getElementById('stat-total-drops-sub');
  if (totalDropsSub) totalDropsSub.textContent = `${stats.totalDrops} drops recorded`;

  const avgDropEl = document.getElementById('stat-avg-drop');
  if (avgDropEl) avgDropEl.textContent = formatMoney(stats.averageDropValue, currency);

  const bestDropEl = document.getElementById('stat-best-drop');
  if (bestDropEl) bestDropEl.textContent = stats.bestDrop ? formatMoney(stats.bestDrop.steamValue, currency) : formatMoney(0, currency);

  const cashoutEl = document.getElementById('stat-cashout-value');
  if (cashoutEl) cashoutEl.textContent = formatMoney(stats.totalCashout, currency);

  const soldCountSub = document.getElementById('stat-sold-count-sub');
  const soldCount = drops.filter(d => d.sold).length;
  if (soldCountSub) soldCountSub.textContent = `${soldCount} items sold`;

  const primeCostEl = document.getElementById('stat-prime-cost');
  if (primeCostEl) primeCostEl.textContent = formatMoney(stats.totalPrimeCost, currency);

  const accountsSub = document.getElementById('stat-accounts-sub');
  if (accountsSub) accountsSub.textContent = `${accounts.filter(a => a.active).length} active accounts`;

  const netProfitEl = document.getElementById('stat-net-profit');
  if (netProfitEl) {
    const netConverted = convertValue(stats.netProfit, currency);
    const sign = netConverted >= 0 ? '+' : '';
    netProfitEl.textContent = `${sign}${formatMoney(Math.abs(stats.netProfit), currency)}`;
    netProfitEl.className = stats.netProfit >= 0 ? 'text-xl sm:text-2xl font-black font-mono text-emerald-400' : 'text-xl sm:text-2xl font-black font-mono text-amber-400';
  }

  const roiBadge = document.getElementById('stat-roi-badge');
  if (roiBadge) {
    roiBadge.textContent = formatPercent(stats.roiPercent);
    roiBadge.className = stats.roiPercent >= 0
      ? 'px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-400'
      : 'px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-amber-500/20 text-amber-400';
  }

  const roiSub = document.getElementById('stat-roi-sub');
  if (roiSub) {
    roiSub.textContent = stats.paybackPercent >= 100 ? '100% Breakeven Passed 🎉' : `${stats.paybackPercent.toFixed(1)}% of prime recovered`;
  }

  const weekClaimsEl = document.getElementById('stat-week-claims');
  if (weekClaimsEl) {
    weekClaimsEl.textContent = `${stats.dropsThisWeek} / ${stats.maxDropsThisWeek}`;
  }

  const streakCountEl = document.getElementById('stat-streak-count');
  if (streakCountEl) streakCountEl.textContent = `${stats.perfectWeeksStreak}w`;

  // 2. Payback Progress Bar
  const pbBadge = document.getElementById('pb-progress-badge');
  if (pbBadge) pbBadge.textContent = `${stats.paybackPercent.toFixed(1)}% Payback`;

  const pbRemaining = document.getElementById('pb-remaining-amount');
  const remainingUsd = Math.max(0, stats.totalPrimeCost - stats.totalSteamValue);
  if (pbRemaining) pbRemaining.textContent = formatMoney(remainingUsd, currency);

  const pbEta = document.getElementById('pb-eta-text');
  if (pbEta) {
    pbEta.textContent = remainingUsd <= 0
      ? 'Break-Even Reached! 🚀'
      : `Break-Even ETA: ~${stats.weeksToBreakEven} weeks at current drop pace`;
  }

  const pbBar = document.getElementById('pb-progress-bar');
  if (pbBar) pbBar.style.width = `${Math.min(100, stats.paybackPercent)}%`;

  // 3. Tab Badge Counts
  const countFleet = document.getElementById('count-tab-fleet');
  if (countFleet) countFleet.textContent = accounts.length.toString();

  const countDrops = document.getElementById('count-tab-drops');
  if (countDrops) countDrops.textContent = drops.length.toString();

  const countCollection = document.getElementById('count-tab-collection');
  if (countCollection) countCollection.textContent = collection.length.toString();

  const countGoals = document.getElementById('count-tab-goals');
  if (countGoals) countGoals.textContent = goals.length.toString();

  // 4. Render Contents
  renderFleetGrid(accounts, drops, currency);
  renderDropsTable(drops, accounts, currency);
  renderCollectionGrid(collection, currency);
  renderGoalsAndStreaks(goals, stats, accounts, drops, currency);
  renderXpTrackerTab();
}

// -------------------------------------------------------------
// Render Fleet Grid
// -------------------------------------------------------------

function renderFleetGrid(accounts: any[], drops: any[], currency: Currency) {
  const container = document.getElementById('fleet-accounts-grid');
  if (!container) return;

  const currentWeek = getCurrentTuesdayWeekId();

  if (accounts.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center rounded-2xl bg-[#11161d] border border-white/[0.06] space-y-3">
        <p class="text-sm font-bold text-zinc-400">No Steam Accounts Added Yet</p>
        <p class="text-xs text-zinc-500">Click "Add Account" to start tracking Prime drop progress and payback.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = accounts.map(acc => {
    // Drops for this account in current week
    const weekDrops = drops.filter(d => d.accountId === acc.id && d.weekId === currentWeek);
    const drop1 = weekDrops.find(d => d.dropNumber === 1);
    const drop2 = weekDrops.find(d => d.dropNumber === 2);

    // Total value generated by this account
    const accDrops = drops.filter(d => d.accountId === acc.id);
    const totalVal = accDrops.reduce((sum, d) => sum + d.steamValue, 0);

    const rank = acc.rank || 21;
    const rankInfo = getRankDetails(rank);

    return `
      <div class="p-5 rounded-2xl bg-[#11161d] border border-white/[0.07] hover:border-white/[0.14] transition space-y-4 relative group">
        <!-- Top header with Avatar & Status -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="relative w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0" style="border-color: ${acc.color || '#10b981'}">
              <img src="${acc.avatarUrl || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'}" alt="${acc.name}" class="w-full h-full object-cover" />
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h4 class="font-black text-white text-sm truncate max-w-[140px] sm:max-w-[180px]">${acc.name}</h4>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30">Prime</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                <span>Rank ${rank} (${rankInfo.name})</span>
              </div>
            </div>
          </div>

          <!-- Account Drop Count Pill -->
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${weekDrops.length === 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : weekDrops.length === 1 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-400 border border-white/[0.06]'}">
            ${weekDrops.length} / 2 Drops
          </span>
        </div>

        <!-- Weekly 2-Drop Limit Status Pills -->
        <div class="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
          <div class="p-2 rounded-xl border ${drop1 ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-[#0d1117] border-white/[0.06] text-zinc-500'} flex flex-col justify-between">
            <div class="text-[9px] uppercase font-bold text-zinc-400">Weekly Drop #1</div>
            <div class="font-bold truncate text-[11px] mt-0.5">${drop1 ? drop1.itemName : '⏳ Ready / Eligible'}</div>
            <div class="text-[10px] text-zinc-400 mt-1">${drop1 ? formatMoney(drop1.steamValue, currency) : 'Needs 5k XP'}</div>
          </div>

          <div class="p-2 rounded-xl border ${drop2 ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-[#0d1117] border-white/[0.06] text-zinc-500'} flex flex-col justify-between">
            <div class="text-[9px] uppercase font-bold text-zinc-400">Weekly Drop #2</div>
            <div class="font-bold truncate text-[11px] mt-0.5">${drop2 ? drop2.itemName : '⏳ Ready / Eligible'}</div>
            <div class="text-[10px] text-zinc-400 mt-1">${drop2 ? formatMoney(drop2.steamValue, currency) : 'Second drop'}</div>
          </div>
        </div>

        <!-- Account Financial Summary & Action -->
        <div class="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
          <div>
            <div class="text-[10px] text-zinc-500 uppercase font-mono">Total Loot Made</div>
            <div class="font-black font-mono text-white text-sm">${formatMoney(totalVal, currency)}</div>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              class="btn-log-drop-for-acc px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs transition cursor-pointer glow-emerald flex items-center gap-1"
              data-account-id="${acc.id}"
            >
              <span>+ Log Drop</span>
            </button>
            <button
              class="btn-delete-account p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              data-account-id="${acc.id}"
              title="Delete account"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners for account card actions
  container.querySelectorAll('.btn-log-drop-for-acc').forEach(btn => {
    btn.addEventListener('click', () => {
      const accId = btn.getAttribute('data-account-id');
      openLogDropModal(accId || '');
    });
  });

  container.querySelectorAll('.btn-delete-account').forEach(btn => {
    btn.addEventListener('click', () => {
      const accId = btn.getAttribute('data-account-id');
      if (accId && confirm('Delete this account and its associated drops?')) {
        lootStore.deleteAccount(accId);
      }
    });
  });
}

// -------------------------------------------------------------
// Render Drops Ledger Table
// -------------------------------------------------------------

function renderDropsTable(drops: LootDrop[], accounts: any[], currency: Currency) {
  const tbody = document.getElementById('drops-table-body');
  if (!tbody) return;

  const accMap = new Map(accounts.map(a => [a.id, a]));

  // Apply filters
  let filtered = drops;
  if (dropFilterQuery) {
    const q = dropFilterQuery.toLowerCase();
    filtered = filtered.filter(d => {
      const accName = accMap.get(d.accountId)?.name || '';
      return d.itemName.toLowerCase().includes(q) || accName.toLowerCase().includes(q);
    });
  }
  if (dropFilterType !== 'all') {
    filtered = filtered.filter(d => d.itemType === dropFilterType);
  }
  if (dropFilterSold === 'sold') {
    filtered = filtered.filter(d => d.sold);
  } else if (dropFilterSold === 'unsold') {
    filtered = filtered.filter(d => !d.sold);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-zinc-500 font-body">
          No drop records found matching the current filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(drop => {
    const acc = accMap.get(drop.accountId);
    const dateStr = new Date(drop.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <!-- Item Info -->
        <td class="py-3.5 px-4 font-sans">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#0d1117] border border-white/[0.06] flex items-center justify-center p-1 shrink-0">
              <img src="${drop.imageUrl || CS2_DROP_POOL[0].imageUrl}" alt="${drop.itemName}" class="w-full h-full object-contain" />
            </div>
            <div>
              <div class="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                <span>${drop.itemName}</span>
                ${drop.wear ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-300 font-semibold">${drop.wear}</span>` : ''}
              </div>
              <div class="text-[10px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                <span class="capitalize">${drop.itemType}</span>
                <span>·</span>
                <span>Drop #${drop.dropNumber}</span>
                ${drop.float ? `<span>· Float: ${drop.float.toFixed(3)}</span>` : ''}
              </div>
            </div>
          </div>
        </td>

        <!-- Account -->
        <td class="py-3.5 px-4 font-mono text-xs text-zinc-300">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" style="background-color: ${acc?.color || '#10b981'}"></span>
            <span class="truncate max-w-[120px]">${acc ? acc.name : 'Unknown Account'}</span>
          </div>
        </td>

        <!-- Week / Date -->
        <td class="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
          <div>Week ${drop.weekId}</div>
          <div class="text-zinc-600 text-[10px]">${dateStr}</div>
        </td>

        <!-- Steam Est -->
        <td class="py-3.5 px-4 font-mono text-xs font-bold text-zinc-200">
          ${formatMoney(drop.steamValue, currency)}
        </td>

        <!-- Sold Status / Cashout -->
        <td class="py-3.5 px-4 font-mono text-xs">
          ${drop.sold
            ? `<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                <span>✓ SOLD:</span>
                <span>${formatMoney(drop.cashoutValue ?? (drop.steamValue * 0.85), currency)}</span>
              </div>`
            : `<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold">
                <span>In Inventory</span>
              </div>`
          }
        </td>

        <!-- Actions -->
        <td class="py-3.5 px-4 font-mono text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button
              class="btn-toggle-sold px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${drop.sold ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}"
              data-drop-id="${drop.id}"
            >
              ${drop.sold ? 'Mark Unsold' : 'Mark Sold'}
            </button>
            <button
              class="btn-delete-drop p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
              data-drop-id="${drop.id}"
              title="Delete Drop"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach event handlers
  tbody.querySelectorAll('.btn-toggle-sold').forEach(btn => {
    btn.addEventListener('click', () => {
      const dropId = btn.getAttribute('data-drop-id');
      if (dropId) lootStore.toggleDropSold(dropId);
    });
  });

  tbody.querySelectorAll('.btn-delete-drop').forEach(btn => {
    btn.addEventListener('click', () => {
      const dropId = btn.getAttribute('data-drop-id');
      if (dropId && confirm('Delete this drop log?')) lootStore.deleteDrop(dropId);
    });
  });
}

// -------------------------------------------------------------
// Render Discovered Collection Codex
// -------------------------------------------------------------

function renderCollectionGrid(collection: any[], currency: Currency) {
  const container = document.getElementById('collection-grid');
  const unlockedCount = document.getElementById('collection-unlocked-count');
  if (unlockedCount) unlockedCount.textContent = collection.length.toString();
  if (!container) return;

  if (collection.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center rounded-2xl bg-[#11161d] border border-white/[0.06] space-y-2">
        <p class="text-sm font-bold text-zinc-400">No Items Discovered Yet</p>
        <p class="text-xs text-zinc-500">Log drops across your fleet to populate your CS2 item collection!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = collection.map(item => {
    const firstDate = new Date(item.firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `
      <div class="p-3.5 rounded-2xl bg-[#11161d] border border-white/[0.07] hover:border-purple-500/40 transition flex flex-col justify-between space-y-2 relative group">
        <!-- Item badge count -->
        <span class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-black text-[10px] border border-purple-500/30">
          ×${item.count}
        </span>

        <!-- Image -->
        <div class="w-full h-20 sm:h-24 flex items-center justify-center p-2">
          <img src="${item.imageUrl || CS2_DROP_POOL[0].imageUrl}" alt="${item.name}" class="max-h-full object-contain group-hover:scale-110 transition duration-300" />
        </div>

        <!-- Details -->
        <div>
          <h5 class="font-bold text-white text-xs truncate" title="${item.name}">${item.name}</h5>
          <div class="flex items-center justify-between text-[11px] font-mono mt-1 pt-1 border-t border-white/[0.04]">
            <span class="text-zinc-400 text-[10px]">Peak Val:</span>
            <strong class="text-amber-400">${formatMoney(item.highestValue, currency)}</strong>
          </div>
          <div class="text-[9px] text-zinc-500 font-mono mt-0.5">Found: ${firstDate}</div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Render Goals & Streaks
// -------------------------------------------------------------

function renderGoalsAndStreaks(goals: any[], stats: any, accounts: any[], drops: any[], currency: Currency) {
  const container = document.getElementById('goals-list-container');
  const insightsContainer = document.getElementById('goals-insights-list');

  const currStreakEl = document.getElementById('goal-current-streak');
  if (currStreakEl) currStreakEl.textContent = `${stats.perfectWeeksStreak} Weeks`;

  const bestStreakEl = document.getElementById('goal-best-streak');
  if (bestStreakEl) bestStreakEl.textContent = `${stats.bestStreak} Weeks`;

  // System Insights
  if (insightsContainer) {
    const activeAccCount = accounts.filter(a => a.active).length;
    insightsContainer.innerHTML = `
      <div class="p-3 rounded-xl bg-[#0d1117] border border-white/[0.06] flex items-start justify-between gap-3">
        <div>
          <div class="font-bold text-white">Prime Fleet Velocity</div>
          <div class="text-[11px] text-zinc-400 mt-0.5">
            ${activeAccCount} accounts active generating up to ${activeAccCount * 2} drops per cycle ($${(activeAccCount * 2 * (stats.averageDropValue || 0.8)).toFixed(2)}/wk).
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 uppercase">Profitable</span>
      </div>

      <div class="p-3 rounded-xl bg-[#0d1117] border border-white/[0.06] flex items-start justify-between gap-3">
        <div>
          <div class="font-bold text-white">Break-Even Velocity</div>
          <div class="text-[11px] text-zinc-400 mt-0.5">
            ${stats.paybackPercent >= 100 ? 'Full Prime investment paid off! All ongoing drops are 100% pure profit.' : `Estimated break-even in ~${stats.weeksToBreakEven} weeks at current drop value.`}
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 uppercase">Telemetry</span>
      </div>
    `;
  }

  // Goals List
  if (container) {
    if (goals.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center rounded-2xl bg-[#0d1117] border border-white/[0.06] text-zinc-500 text-xs">
          No milestone goals defined. Create your first goal to track your dream CS2 skin or payback targets!
        </div>
      `;
      return;
    }

    container.innerHTML = goals.map(goal => {
      let currentAmount = 0;
      if (goal.type === 'cashout') currentAmount = stats.totalCashout;
      else if (goal.type === 'revenue') currentAmount = stats.totalSteamValue;
      else if (goal.type === 'profit') currentAmount = Math.max(0, stats.netProfit);
      else if (goal.type === 'drops') currentAmount = stats.totalDrops;

      const progressPercent = Math.min(100, (currentAmount / (goal.targetAmount || 1)) * 100);
      const remaining = Math.max(0, goal.targetAmount - currentAmount);

      return `
        <div class="p-4 rounded-2xl bg-[#0d1117] border border-white/[0.06] space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-full" style="background-color: ${goal.color || '#f59e0b'}"></span>
              <div>
                <h4 class="font-bold text-white text-xs sm:text-sm">${goal.name}</h4>
                <div class="text-[10px] text-zinc-500 font-mono capitalize">Type: ${goal.type} Goal</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-zinc-200">
                ${goal.type === 'drops' ? `${currentAmount} / ${goal.targetAmount} drops` : `${formatMoney(currentAmount, currency)} / ${formatMoney(goal.targetAmount, currency)}`}
              </span>
              <button
                class="btn-delete-goal p-1 text-zinc-600 hover:text-red-400 transition cursor-pointer"
                data-goal-id="${goal.id}"
                title="Delete goal"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="relative w-full h-2 rounded-full bg-[#11161d] border border-white/[0.06] overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              style="width: ${progressPercent}%; background-color: ${goal.color || '#10b981'}"
            ></div>
          </div>

          <div class="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>${progressPercent.toFixed(1)}% Completed</span>
            <span>Remaining: <strong class="text-white">${goal.type === 'drops' ? `${remaining} drops` : formatMoney(remaining, currency)}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-delete-goal').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-goal-id');
        if (id && confirm('Delete this target goal?')) lootStore.deleteGoal(id);
      });
    });
  }
}

// -------------------------------------------------------------
// Tab 5: XP & Service Medal Progression Radar (Zero Bot Dependency)
// -------------------------------------------------------------

function setupXpTrackerTab() {
  const accSelect = document.getElementById('select-xp-account') as HTMLSelectElement | null;
  accSelect?.addEventListener('change', () => {
    activeXpAccountId = accSelect.value;
    renderXpTrackerTab();
  });

  // Quick match XP add buttons
  document.querySelectorAll('.btn-add-xp-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const xpToAdd = parseInt(btn.getAttribute('data-xp') || '0', 10);
      addXpToActiveAccount(xpToAdd);
    });
  });

  document.getElementById('btn-reset-xp-account')?.addEventListener('click', () => {
    resetXpForActiveAccount();
  });
}

function addXpToActiveAccount(amount: number) {
  const accounts = lootStore.getAccounts();
  const acc = accounts.find(a => a.id === activeXpAccountId) || accounts[0];
  if (!acc) return;

  let rank = acc.rank || 28;
  let xp = (acc.xpWithinRank || 0) + amount;
  let weekly = (acc.weeklyXp || 0) + amount;

  while (xp >= 5000 && rank < 40) {
    xp -= 5000;
    rank++;
  }

  lootStore.updateAccount(acc.id, {
    rank,
    xpWithinRank: xp,
    weeklyXp: weekly
  });

  if (typeof (window as any).playDropChime === 'function') {
    (window as any).playDropChime();
  }

  renderXpTrackerTab();
}

function resetXpForActiveAccount() {
  const accounts = lootStore.getAccounts();
  const acc = accounts.find(a => a.id === activeXpAccountId) || accounts[0];
  if (!acc) return;

  lootStore.updateAccount(acc.id, {
    rank: 1,
    xpWithinRank: 0,
    weeklyXp: 0
  });

  renderXpTrackerTab();
}

function renderXpTrackerTab() {
  const accounts = lootStore.getAccounts();
  const accSelect = document.getElementById('select-xp-account') as HTMLSelectElement | null;
  if (!accSelect) return;

  if (!activeXpAccountId && accounts.length > 0) {
    activeXpAccountId = accounts[0].id;
  }

  // Populate dropdown options
  accSelect.innerHTML = accounts.map(a => `
    <option value="${a.id}" ${a.id === activeXpAccountId ? 'selected' : ''}>${a.name}</option>
  `).join('');

  const activeAcc = accounts.find(a => a.id === activeXpAccountId) || accounts[0];
  if (!activeAcc) return;

  const currentRank = activeAcc.rank || 28;
  const currentXp = activeAcc.xpWithinRank || 3150;
  const weeklyXp = activeAcc.weeklyXp || currentXp;

  const progress = calculateMedalProgress(currentRank, currentXp, weeklyXp);
  const rankInfo = getRankDetails(currentRank);

  // Update DOM elements
  const rankNumEl = document.getElementById('xp-rank-number');
  if (rankNumEl) rankNumEl.textContent = currentRank.toString();

  const rankTitleEl = document.getElementById('xp-rank-title');
  if (rankTitleEl) rankTitleEl.textContent = rankInfo.name;

  const multBadge = document.getElementById('xp-multiplier-badge');
  const multText = document.getElementById('xp-multiplier-text');
  if (multBadge && multText) {
    multText.textContent = progress.multiplier.label;
    multBadge.style.color = progress.multiplier.color;
    multBadge.style.borderColor = `${progress.multiplier.color}40`;
  }

  const descEl = document.getElementById('xp-bracket-description');
  if (descEl) descEl.textContent = progress.multiplier.description;

  const progNumEl = document.getElementById('xp-progress-numbers');
  if (progNumEl) progNumEl.textContent = `${currentXp.toLocaleString()} / 5,000 XP`;

  const levelBar = document.getElementById('xp-level-bar');
  if (levelBar) levelBar.style.width = `${progress.rankProgressPercent}%`;

  const neededText = document.getElementById('xp-needed-text');
  if (neededText) neededText.textContent = `${progress.xpToNextRank.toLocaleString()} XP to Next Rank & Care Package`;

  const percentText = document.getElementById('xp-percent-text');
  if (percentText) percentText.textContent = `${progress.rankProgressPercent.toFixed(1)}%`;

  // Medal Estimates
  const ranksToMedalEl = document.getElementById('xp-ranks-to-medal');
  if (ranksToMedalEl) ranksToMedalEl.textContent = `${progress.ranksUntilMedal} Ranks Left`;

  const totalToMedalEl = document.getElementById('xp-total-to-medal');
  if (totalToMedalEl) totalToMedalEl.textContent = `${progress.totalXpUntilMedal.toLocaleString()} XP`;

  const hoursEstEl = document.getElementById('xp-hours-estimate');
  if (hoursEstEl) hoursEstEl.textContent = `~${progress.estimates.hoursEstimate} gameplay hours estimated`;

  const estPremier = document.getElementById('xp-est-premier');
  if (estPremier) estPremier.textContent = `~${progress.estimates.premierWinsNeeded} wins`;

  const estComp = document.getElementById('xp-est-comp');
  if (estComp) estComp.textContent = `~${progress.estimates.competitiveWinsNeeded} wins`;

  const estDm = document.getElementById('xp-est-dm');
  if (estDm) estDm.textContent = `~${progress.estimates.deathmatchesNeeded} games`;

  const estWingman = document.getElementById('xp-est-wingman');
  if (estWingman) estWingman.textContent = `~${progress.estimates.wingmanWinsNeeded} wins`;
}

// -------------------------------------------------------------
// Modals Setup
// -------------------------------------------------------------

function setupModals() {
  // Modal openers
  document.getElementById('btn-open-log-drop')?.addEventListener('click', () => openLogDropModal(''));
  document.getElementById('btn-open-add-account')?.addEventListener('click', openAccountModal);
  document.getElementById('btn-open-add-goal')?.addEventListener('click', openGoalModal);
  document.getElementById('btn-goals-add-trigger')?.addEventListener('click', openGoalModal);
  document.getElementById('btn-open-data-modal')?.addEventListener('click', openDataModal);

  // Close modals
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      ['modal-log-drop', 'modal-account', 'modal-goal', 'modal-data-sync'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
      });
    });
  });

  // Filter inputs
  const inputSearch = document.getElementById('input-filter-drop-name') as HTMLInputElement | null;
  inputSearch?.addEventListener('input', () => {
    dropFilterQuery = inputSearch.value.trim();
    renderDropsTable(lootStore.getDrops(), lootStore.getAccounts(), lootStore.getCurrency());
  });

  const selectType = document.getElementById('select-filter-type') as HTMLSelectElement | null;
  selectType?.addEventListener('change', () => {
    dropFilterType = selectType.value;
    renderDropsTable(lootStore.getDrops(), lootStore.getAccounts(), lootStore.getCurrency());
  });

  const selectSold = document.getElementById('select-filter-sold') as HTMLSelectElement | null;
  selectSold?.addEventListener('change', () => {
    dropFilterSold = selectSold.value;
    renderDropsTable(lootStore.getDrops(), lootStore.getAccounts(), lootStore.getCurrency());
  });

  // Form Submissions
  setupLogDropForm();
  setupAccountForm();
  setupGoalForm();
  setupDataSyncForm();
}

function openLogDropModal(preselectedAccountId: string) {
  const modal = document.getElementById('modal-log-drop');
  const accSelect = document.getElementById('drop-input-account') as HTMLSelectElement | null;
  if (!modal || !accSelect) return;

  const accounts = lootStore.getAccounts();
  accSelect.innerHTML = accounts.map(a => `
    <option value="${a.id}" ${a.id === preselectedAccountId ? 'selected' : ''}>${a.name}</option>
  `).join('');

  modal.classList.remove('hidden');
}

function openAccountModal() {
  const modal = document.getElementById('modal-account');
  modal?.classList.remove('hidden');
}

function openGoalModal() {
  const modal = document.getElementById('modal-goal');
  modal?.classList.remove('hidden');
}

function openDataModal() {
  const modal = document.getElementById('modal-data-sync');
  modal?.classList.remove('hidden');
}

function setupLogDropPresets() {
  document.querySelectorAll('.btn-case-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name') || '';
      const price = btn.getAttribute('data-price') || '';
      const type = btn.getAttribute('data-type') || 'case';

      const nameInput = document.getElementById('drop-input-item-name') as HTMLInputElement | null;
      const priceInput = document.getElementById('drop-input-price') as HTMLInputElement | null;
      const typeSelect = document.getElementById('drop-input-item-type') as HTMLSelectElement | null;

      if (nameInput) nameInput.value = name;
      if (priceInput) priceInput.value = price;
      if (typeSelect) typeSelect.value = type;
    });
  });

  // Sold toggle behavior
  const soldToggle = document.getElementById('drop-input-sold-toggle') as HTMLInputElement | null;
  const soldExtra = document.getElementById('drop-sold-extra');
  soldToggle?.addEventListener('change', () => {
    if (soldToggle.checked) {
      soldExtra?.classList.remove('hidden');
      const priceInput = document.getElementById('drop-input-price') as HTMLInputElement | null;
      const cashoutInput = document.getElementById('drop-input-cashout-val') as HTMLInputElement | null;
      if (priceInput && cashoutInput && !cashoutInput.value) {
        const val = parseFloat(priceInput.value) || 0;
        cashoutInput.value = (val * 0.85).toFixed(2);
      }
    } else {
      soldExtra?.classList.add('hidden');
    }
  });
}

function setupLogDropForm() {
  const form = document.getElementById('form-log-drop') as HTMLFormElement | null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const accSelect = document.getElementById('drop-input-account') as HTMLSelectElement;
    const nameInput = document.getElementById('drop-input-item-name') as HTMLInputElement;
    const typeSelect = document.getElementById('drop-input-item-type') as HTMLSelectElement;
    const wearSelect = document.getElementById('drop-input-wear') as HTMLSelectElement;
    const floatInput = document.getElementById('drop-input-float') as HTMLInputElement;
    const priceInput = document.getElementById('drop-input-price') as HTMLInputElement;
    const dropNumSelect = document.getElementById('drop-input-drop-num') as HTMLSelectElement;
    const soldToggle = document.getElementById('drop-input-sold-toggle') as HTMLInputElement;
    const cashoutInput = document.getElementById('drop-input-cashout-val') as HTMLInputElement;

    const preset = CS2_DROP_POOL.find(p => p.name.toLowerCase() === nameInput.value.trim().toLowerCase());
    const imageUrl = preset ? preset.imageUrl : CS2_DROP_POOL[0].imageUrl;

    const steamValue = parseFloat(priceInput.value) || 0;
    const isSold = soldToggle.checked;
    const cashoutValue = isSold ? (parseFloat(cashoutInput.value) || steamValue * 0.85) : undefined;

    lootStore.addDrop({
      accountId: accSelect.value,
      weekId: getCurrentTuesdayWeekId(),
      dropNumber: (parseInt(dropNumSelect.value, 10) || 1) as (1 | 2),
      itemName: nameInput.value.trim(),
      itemType: typeSelect.value as ItemType,
      wear: (wearSelect.value || undefined) as (ItemWear | undefined),
      float: floatInput.value ? parseFloat(floatInput.value) : undefined,
      marketHashName: nameInput.value.trim(),
      imageUrl,
      steamValue,
      cashoutValue,
      sold: isSold,
      soldAt: isSold ? new Date().toISOString() : undefined
    });

    // Play satisfying drop audio chime!
    if (typeof (window as any).playDropChime === 'function') {
      (window as any).playDropChime();
    }

    form.reset();
    document.getElementById('modal-log-drop')?.classList.add('hidden');
  });
}

function setupAccountForm() {
  const form = document.getElementById('form-account') as HTMLFormElement | null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('account-input-name') as HTMLInputElement;
    const steamIdInput = document.getElementById('account-input-steamid') as HTMLInputElement;
    const costInput = document.getElementById('account-input-cost') as HTMLInputElement;
    const colorSelect = document.getElementById('account-input-color') as HTMLSelectElement;
    const notesInput = document.getElementById('account-input-notes') as HTMLInputElement;

    lootStore.addAccount({
      name: nameInput.value.trim(),
      steamId: steamIdInput.value.trim() || `id-${Date.now()}`,
      active: true,
      primeCost: parseFloat(costInput.value) || 14.99,
      avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
      color: colorSelect.value,
      note: notesInput.value.trim(),
      rank: 21,
      xpWithinRank: 1000,
      weeklyXp: 1000
    });

    form.reset();
    document.getElementById('modal-account')?.classList.add('hidden');
  });
}

function setupGoalForm() {
  const form = document.getElementById('form-goal') as HTMLFormElement | null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('goal-input-name') as HTMLInputElement;
    const amountInput = document.getElementById('goal-input-amount') as HTMLInputElement;
    const typeSelect = document.getElementById('goal-input-type') as HTMLSelectElement;
    const itemInput = document.getElementById('goal-input-item-name') as HTMLInputElement;

    lootStore.addGoal({
      name: nameInput.value.trim(),
      targetAmount: parseFloat(amountInput.value) || 50,
      type: typeSelect.value as any,
      targetItemName: itemInput.value.trim() || undefined,
      color: '#f59e0b'
    });

    form.reset();
    document.getElementById('modal-goal')?.classList.add('hidden');
  });
}

function setupDataSyncForm() {
  // Export CSV
  document.getElementById('btn-sync-export-csv')?.addEventListener('click', () => {
    downloadFile(lootStore.exportCsv(), `lootflow-drops-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  });

  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    downloadFile(lootStore.exportCsv(), `lootflow-drops-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  });

  // Export JSON
  document.getElementById('btn-sync-export-json')?.addEventListener('click', () => {
    downloadFile(lootStore.exportJson(), `lootflow-backup-${new Date().toISOString().slice(0,10)}.json`, 'application/json');
  });

  // Import JSON file
  const fileInput = document.getElementById('input-import-json-file') as HTMLInputElement | null;
  fileInput?.addEventListener('change', (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (lootStore.importJson(content)) {
        alert('Data imported successfully!');
        document.getElementById('modal-data-sync')?.classList.add('hidden');
      } else {
        alert('Failed to parse import JSON. Check file structure.');
      }
    };
    reader.readAsText(file);
  });

  // Quick reset demo
  document.getElementById('btn-quick-demo-reset')?.addEventListener('click', () => {
    if (confirm('Reset to demo fleet with 3 accounts and verified drop history?')) {
      lootStore.resetToDemo();
    }
  });

  // Clear all data
  document.getElementById('btn-danger-clear-all')?.addEventListener('click', () => {
    if (confirm('Permanently delete all accounts, drops, and goals?')) {
      lootStore.clearAllData();
      document.getElementById('modal-data-sync')?.classList.add('hidden');
    }
  });
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
