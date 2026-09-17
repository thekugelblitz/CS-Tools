import type { ResetCycleInfo } from './types';

/**
 * CS2 Weekly Care Package drops reset every Wednesday at 01:00 UTC (Tuesday 8:00 PM CT).
 */
export function getNextResetDate(now: Date = new Date()): Date {
  const reset = new Date(now.getTime());
  // UTC Day: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, ...
  const currentDay = reset.getUTCDay();
  const currentHour = reset.getUTCHours();
  
  // Calculate days until next Wednesday
  let daysUntilWednesday = (3 - currentDay + 7) % 7;
  
  // If today is Wednesday, check if 01:00 UTC has already passed
  if (daysUntilWednesday === 0 && currentHour >= 1) {
    daysUntilWednesday = 7;
  }

  reset.setUTCDate(reset.getUTCDate() + daysUntilWednesday);
  reset.setUTCHours(1, 0, 0, 0);

  return reset;
}

export function getPreviousResetDate(now: Date = new Date()): Date {
  const nextReset = getNextResetDate(now);
  const prevReset = new Date(nextReset.getTime() - 7 * 24 * 60 * 60 * 1000);
  return prevReset;
}

export function getResetCycleInfo(now: Date = new Date()): ResetCycleInfo {
  const nextReset = getNextResetDate(now);
  const prevReset = getPreviousResetDate(now);
  
  const totalCycleMs = nextReset.getTime() - prevReset.getTime();
  const elapsedCycleMs = now.getTime() - prevReset.getTime();
  const cycleProgressPercent = Math.min(100, Math.max(0, (elapsedCycleMs / totalCycleMs) * 100));

  const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  
  const daysRemaining = Math.floor(totalSeconds / (3600 * 24));
  const hoursRemaining = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutesRemaining = Math.floor((totalSeconds % 3600) / 60);
  const secondsRemaining = totalSeconds % 60;

  return {
    nextResetTimestamp: nextReset.getTime(),
    formattedUtc: nextReset.toUTCString(),
    formattedLocal: nextReset.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }),
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    cycleProgressPercent: Math.round(cycleProgressPercent * 10) / 10
  };
}
