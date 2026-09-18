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

// -------------------------------------------------------------
// Authentication & User Profile Management
// -------------------------------------------------------------

import type { UserAccount, AuthState } from './types';

const AUTH_USER_KEY = 'cs2_auth_user_v1';
const USERS_DB_KEY = 'cs2_users_registry_v1';

export const DEFAULT_USER: UserAccount = {
  id: 'usr_greatmahakaal',
  username: 'TheKugelBlitz',
  email: 'greatmahakaal@steam.community',
  steamId64: '76561198287445170',
  vanityUrl: 'greatmahakaal',
  avatarUrl: 'https://avatars.akamai.steamstatic.com/bd44a769f5b88b66bb922967115499dbfdcf70b5_full.jpg',
  trackedProfiles: [
    {
      steamId64: '76561198287445170',
      personaName: 'TheKugelBlitz',
      avatarUrl: 'https://avatars.akamai.steamstatic.com/bd44a769f5b88b66bb922967115499dbfdcf70b5_full.jpg'
    }
  ],
  createdAt: new Date('2016-03-01T00:00:00Z').toISOString()
};

export function getCurrentUser(): UserAccount | null {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      // Seed default active user
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(DEFAULT_USER));
      return DEFAULT_USER;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USER;
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
  const cleanSteamId = payload.steamId64?.trim() || (payload.vanityUrl?.includes('7656119') ? payload.vanityUrl : '76561198287445170');
  const cleanVanity = payload.vanityUrl?.trim() || 'greatmahakaal';

  const newUser: UserAccount = {
    id: `usr_${Date.now()}`,
    username: payload.username.trim(),
    email: payload.email.trim().toLowerCase(),
    steamId64: cleanSteamId,
    vanityUrl: cleanVanity,
    avatarUrl: 'https://avatars.akamai.steamstatic.com/bd44a769f5b88b66bb922967115499dbfdcf70b5_full.jpg',
    trackedProfiles: [
      {
        steamId64: cleanSteamId,
        personaName: payload.username.trim(),
        avatarUrl: 'https://avatars.akamai.steamstatic.com/bd44a769f5b88b66bb922967115499dbfdcf70b5_full.jpg'
      }
    ],
    createdAt: new Date().toISOString()
  };

  setCurrentUser(newUser);
  return newUser;
}

export function loginUser(emailOrUsername: string, _password?: string): UserAccount {
  const current = getCurrentUser();
  if (current && (current.email.toLowerCase() === emailOrUsername.toLowerCase() || current.username.toLowerCase() === emailOrUsername.toLowerCase())) {
    setCurrentUser(current);
    return current;
  }

  // Allow flexible sign in with fallback or new profile
  const user: UserAccount = {
    ...DEFAULT_USER,
    username: emailOrUsername.includes('@') ? emailOrUsername.split('@')[0] : emailOrUsername,
    email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@steam.community`
  };
  setCurrentUser(user);
  return user;
}

export function loginWithSteam(steamIdOrVanity: string): UserAccount {
  const cleanId = steamIdOrVanity.replace(/https?:\/\/steamcommunity\.com\/(id|profiles)\//, '').replace(/\/$/, '');
  const isId64 = /^\d{17}$/.test(cleanId);

  const user: UserAccount = {
    ...DEFAULT_USER,
    steamId64: isId64 ? cleanId : '76561198287445170',
    vanityUrl: isId64 ? 'greatmahakaal' : cleanId,
    username: isId64 ? 'TheKugelBlitz' : cleanId
  };

  setCurrentUser(user);
  return user;
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export function addTrackedProfile(steamId64: string, personaName: string, avatarUrl?: string): UserAccount | null {
  const user = getCurrentUser();
  if (!user) return null;

  const exists = user.trackedProfiles.some(p => p.steamId64 === steamId64);
  if (!exists) {
    user.trackedProfiles.push({
      steamId64,
      personaName,
      avatarUrl: avatarUrl || 'https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
    });
    setCurrentUser(user);
  }
  return user;
}

