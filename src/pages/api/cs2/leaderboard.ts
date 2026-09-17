import type { APIRoute } from 'astro';

export const prerender = false;

interface CacheEntry {
  timestamp: number;
  data: any;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const GET: APIRoute = async () => {
  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ success: true, cached: true, players: cache.data }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    const response = await fetch('https://api.csapi.de/players/stats', {
      headers: {
        'User-Agent': 'CS2-Drop-Radar/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (cache) {
        return new Response(JSON.stringify({ success: true, cached: true, stale: true, players: cache.data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ success: false, error: `Upstream CS API returned ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    cache = {
      timestamp: now,
      data
    };

    return new Response(JSON.stringify({ success: true, cached: false, players: data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (err: any) {
    if (cache) {
      return new Response(JSON.stringify({ success: true, cached: true, stale: true, players: cache.data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Failed to fetch pro player statistics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
