import type { SteamAccount } from './types';
import { INITIAL_DEMO_ACCOUNTS } from './mock-data';

const STORAGE_KEY = 'cs2_tracker_accounts_v2';
const SETTINGS_KEY = 'cs2_tracker_settings_v2';
const AUTH_USER_KEY = 'cs2_auth_user_v2';
const USERS_DB_KEY = 'cs2_users_registry_v2';

export interface AppSettings {
  steamApiKey: string;
  autoCheckDrops: boolean;
  soundAlerts: boolean;
  activeView: 'grid' | 'table';
  filterStatus: 'all' | 'available' | 'claimed' | 'near-medal';
  lastSearchedPlayer?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  steamApiKey: '',
  autoCheckDrops: true,
  soundAlerts: true,
  activeView: 'grid',
  filterStatus: 'all',
  lastSearchedPlayer: ''
};

export function loadAccountsFromStorage(): SteamAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

// -------------------------------------------------------------
// Authentication & User Profile Management
// -------------------------------------------------------------

import type { UserAccount, AuthState } from './types';

export const DEFAULT_USER: UserAccount | null = null;

export function getCurrentUser(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
  } catch (err) {
    console.error('Failed to set current user:', err);
  }
}

export function registerUser(payload: {
  username: string;
  email: string;
  password?: string;
  steamId64?: string;
  vanityUrl?: string;
}): UserAccount {
  const cleanSteamId = payload.steamId64?.trim() || '';
  const cleanVanity = payload.vanityUrl?.trim() || '';

  const newUser: UserAccount = {
    id: `usr_${Date.now()}`,
    username: payload.username.trim() || 'CS2 Player',
    email: payload.email.trim().toLowerCase(),
    steamId64: cleanSteamId,
    vanityUrl: cleanVanity,
    avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    trackedProfiles: cleanSteamId ? [{
      steamId64: cleanSteamId,
      personaName: payload.username.trim() || 'My Account',
      avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
    }] : [],
    createdAt: new Date().toISOString()
  };

  setCurrentUser(newUser);
  return newUser;
}

export function loginUser(email: string): UserAccount {
  const existing = getCurrentUser();
  if (existing && existing.email === email.trim().toLowerCase()) {
    return existing;
  }

  const user: UserAccount = {
    id: `usr_${Date.now()}`,
    username: email.split('@')[0],
    email: email.trim().toLowerCase(),
    steamId64: '',
    vanityUrl: '',
    avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    trackedProfiles: [],
    createdAt: new Date().toISOString()
  };

  setCurrentUser(user);
  return user;
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export function addTrackedProfile(profile: {
  steamId64: string;
  personaName: string;
  avatarUrl?: string;
}): UserAccount | null {
  const user = getCurrentUser();
  if (!user) return null;

  const exists = user.trackedProfiles.some((p) => p.steamId64 === profile.steamId64);
  if (!exists) {
    user.trackedProfiles.push({
      steamId64: profile.steamId64,
      personaName: profile.personaName,
      avatarUrl: profile.avatarUrl || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
    });
    setCurrentUser(user);
  }
  return user;
}

export function removeTrackedProfile(steamId64: string): UserAccount | null {
  const user = getCurrentUser();
  if (!user) return null;

  user.trackedProfiles = user.trackedProfiles.filter((p) => p.steamId64 !== steamId64);
  setCurrentUser(user);
  return user;
}
