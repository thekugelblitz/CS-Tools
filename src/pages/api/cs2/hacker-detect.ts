import type { APIRoute } from 'astro';
import type { HackerScanResult, HackerThreatLevel } from '../../../lib/types';

export const prerender = false;

interface PlayerAnalysisInput {
  steamId64?: string;
  personaName?: string;
  kills?: number;
  deaths?: number;
  headshotPct?: number;
  adr?: number;
  aimRating?: number;
  reactionTimeMs?: number;
  crosshairErrorDeg?: number;
  throughSmokeKillsPct?: number;
  steamLevel?: number;
  hoursPlayed?: number;
  accountAgeYears?: number;
  medalsCount?: number;
  inventoryCount?: number;
  vacBanned?: boolean;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const input: PlayerAnalysisInput = body.player || body;

    const steamId = input.steamId64 || '76561198000000000';
    const persona = input.personaName || (steamId === '76561198287445170' ? 'TheKugelBlitz' : 'Inspected Player');

    // Extract metrics with sensible defaults
    const kills = input.kills ?? 18;
    const deaths = input.deaths ?? 12;
    const hsPct = input.headshotPct ?? 35;
    const adr = input.adr ?? 75;
    const aimRating = input.aimRating ?? 75;
    const reactionTime = input.reactionTimeMs ?? 280;
    const crosshairErr = input.crosshairErrorDeg ?? 6.5;
    const smokeKills = input.throughSmokeKillsPct ?? 6;
    const steamLvl = input.steamLevel ?? (steamId === '76561198287445170' ? 45 : 15);
    const hours = input.hoursPlayed ?? (steamId === '76561198287445170' ? 1200 : 800);
    const ageYears = input.accountAgeYears ?? (steamId === '76561198287445170' ? 10 : 4);
    const medals = input.medalsCount ?? (steamId === '76561198287445170' ? 3 : 1);
    const invCount = input.inventoryCount ?? (steamId === '76561198287445170' ? 563 : 40);
    const isVac = input.vacBanned ?? false;

    // 1. Aimbot / Soft-Aim Vector (0 - 100)
    let aimbotScore = 5;
    if (hsPct > 80 && kills >= 10) aimbotScore += 45;
    else if (hsPct > 65 && kills >= 10) aimbotScore += 25;
    else if (hsPct > 55) aimbotScore += 10;

    if (aimRating > 94) aimbotScore += 30;
    else if (aimRating > 88) aimbotScore += 15;

    if (crosshairErr < 3.8) aimbotScore += 25;
    else if (crosshairErr < 4.8) aimbotScore += 12;

    aimbotScore = Math.min(100, Math.max(0, aimbotScore));

    // 2. Wallhack / ESP Vector (0 - 100)
    let wallhackScore = 5;
    if (smokeKills > 30) wallhackScore += 45;
    else if (smokeKills > 20) wallhackScore += 25;
    else if (smokeKills > 12) wallhackScore += 10;

    if (adr > 115 && kills >= 15) wallhackScore += 20;

    wallhackScore = Math.min(100, Math.max(0, wallhackScore));

    // 3. Reaction Time Anomaly (0 - 100)
    let reactionScore = 5;
    if (reactionTime < 160) reactionScore += 75; // Inhuman sub-160ms TTK
    else if (reactionTime < 210) reactionScore += 40;
    else if (reactionTime < 250) reactionScore += 15;

    reactionScore = Math.min(100, Math.max(0, reactionScore));

    // 4. Account Trust Score (100 = verified safe veteran, 0 = fresh burner account)
    let trustScore = 80;
    if (ageYears >= 5) trustScore += 15;
    if (ageYears < 1) trustScore -= 30;
    if (hours < 100) trustScore -= 35;
    if (steamLvl <= 3) trustScore -= 20;
    if (medals === 0) trustScore -= 15;
    if (invCount < 5) trustScore -= 10;
    if (isVac) trustScore -= 50;

    trustScore = Math.min(100, Math.max(0, trustScore));
    const invertedTrustRisk = 100 - trustScore;

    // 5. Rating Spike Anomaly
    const ratingSpike = (adr > 110 && hours < 200) ? 65 : 10;

    // 6. Overall Weighted Threat Score
    // Weightings: Aimbot 35%, Wallhack 30%, Reaction Anomaly 15%, Untrusted Account 20%
    const compositeThreat = Math.round(
      (aimbotScore * 0.35) +
      (wallhackScore * 0.30) +
      (reactionScore * 0.15) +
      (invertedTrustRisk * 0.20)
    );

    const threatScore = Math.min(100, Math.max(2, compositeThreat));

    // Determine Threat Level & Flags
    let threatLevel: HackerThreatLevel = 'CLEAN';
    let verdictTitle = 'Legitimate Verified Player';
    let verdictSummary = 'Normal engagement metrics, human reaction times, and established account trust history.';
    const flags: string[] = [];

    if (threatScore >= 80) {
      threatLevel = 'FLAGGED';
      verdictTitle = 'Blatant Cheater Detected';
      verdictSummary = 'Extremely abnormal performance metrics matching active aim-assist, ESP tracking, and burner profile heuristics.';
    } else if (threatScore >= 50) {
      threatLevel = 'HIGH_RISK';
      verdictTitle = 'High Suspicion Profile';
      verdictSummary = 'Multiple statistical anomalies detected in aim consistency, pre-aim timing, or account freshness.';
    } else if (threatScore >= 25) {
      threatLevel = 'SUSPECT';
      verdictTitle = 'Possible Smurf / Elevated Skill';
      verdictSummary = 'Outperforming typical bracket average, but within plausible high-tier human mechanics.';
    }

    // Populate descriptive flags
    if (hsPct >= 75) flags.push(`Extreme Headshot Ratio (${hsPct.toFixed(1)}%)`);
    if (reactionTime < 180) flags.push(`Inhuman Time to Damage (${reactionTime}ms)`);
    if (crosshairErr < 4.0) flags.push(`Robotic Crosshair Placement (<4.0°)`);
    if (smokeKills >= 25) flags.push(`Abnormal Blind & Smoke Kill Rate (${smokeKills}%)`);
    if (hours < 100 && kills >= 20) flags.push(`Low CS2 Playtime (<100h) with 20+ Frags`);
    if (steamLvl <= 2) flags.push(`Disposable Steam Level (Lvl ${steamLvl})`);
    if (ageYears < 1) flags.push(`Fresh Account Creation (<1 Year)`);
    if (isVac) flags.push(`Previous VAC / Game Ban on Record`);

    if (flags.length === 0) {
      flags.push('Clean Headshot Distribution', 'Natural Human Reflexes', 'Trusted Steam Standing');
    }

    const result: HackerScanResult = {
      steamId64: steamId,
      personaName: persona,
      threatScore,
      threatLevel,
      verdictTitle,
      verdictSummary,
      vectors: {
        aimbotScore,
        wallhackScore,
        accountTrustScore: trustScore,
        reactionTimeAnomaly: reactionScore,
        ratingSpikeAnomaly: ratingSpike
      },
      flags,
      suspiciousRounds: threatScore > 50 ? [4, 9, 14] : undefined,
      scannedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify({ success: true, scan: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error processing anti-cheat detection' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
