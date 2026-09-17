import type { APIRoute } from 'astro';

export const prerender = false;

interface CacheEntry {
  timestamp: number;
  data: any;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const GET: APIRoute = async () => {
  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ success: true, cached: true, matches: cache.data }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        }
      });
    }

    const response = await fetch('https://api.csapi.de/matches/latest', {
      headers: {
        'User-Agent': 'CS2-Drop-Radar/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // If error but we have stale cache, serve stale
      if (cache) {
        return new Response(JSON.stringify({ success: true, cached: true, stale: true, matches: cache.data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ success: false, error: `Upstream CS API returned status ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    cache = {
      timestamp: now,
      data
    };

    return new Response(JSON.stringify({ success: true, cached: false, matches: data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (err: any) {
    if (cache) {
      return new Response(JSON.stringify({ success: true, cached: true, stale: true, matches: cache.data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Failed to fetch CS2 matches' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
