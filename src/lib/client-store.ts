import type { SteamAccount } from './types';
import { INITIAL_DEMO_ACCOUNTS } from './mock-data';

const STORAGE_KEY = 'cs2_tracker_accounts_v1';
const SETTINGS_KEY = 'cs2_tracker_settings_v1';

export interface AppSettings {
  steamApiKey: string;
  autoCheckDrops: boolean;
  soundAlerts: boolean;
  activeView: 'grid' | 'table';
  filterStatus: 'all' | 'available' | 'claimed' | 'near-medal';
}

export const DEFAULT_SETTINGS: AppSettings = {
  steamApiKey: '',
  autoCheckDrops: true,
  soundAlerts: true,
  activeView: 'grid',
  filterStatus: 'all'
};

export function loadAccountsFromStorage(): SteamAccount[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAccountsToStorage(INITIAL_DEMO_ACCOUNTS);
      return INITIAL_DEMO_ACCOUNTS;
    }
    let parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveAccountsToStorage(INITIAL_DEMO_ACCOUNTS);
      return INITIAL_DEMO_ACCOUNTS;
    }
    // Ensure greatmahakaal-main is present and at the front
    const hasGreatmahakaal = parsed.some(
      (a: SteamAccount) => a.id === 'greatmahakaal-main' || a.steamId64 === '76561198287445170' || a.customUrl === 'greatmahakaal'
    );
    if (!hasGreatmahakaal) {
      parsed = [INITIAL_DEMO_ACCOUNTS[0], ...parsed];
      saveAccountsToStorage(parsed);
    }
    return parsed;
  } catch {
    return INITIAL_DEMO_ACCOUNTS;
  }
}

export function saveAccountsToStorage(accounts: SteamAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent('accounts-updated', { detail: accounts }));
  } catch (err) {
    console.error('Failed to save accounts to storage:', err);
  }
}

export function loadSettingsFromStorage(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsToStorage(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}
