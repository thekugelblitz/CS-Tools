import type { APIRoute } from 'astro';
import type { CaseMarketPrice } from '../../../lib/types';

export const prerender = false;

interface CacheEntry {
  timestamp: number;
  data: CaseMarketPrice[];
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const CS2_DROP_CASES = [
  {
    name: 'Gallery Case',
    marketHashName: 'Gallery Case',
    icon: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFU1nfbOIWx8_9m5kIGZlPjzMITdn2xZ_Ish0r-TrNugi1W2rhE4Z2qmJteTJwA4N1rTrlK6xLy615-96p_JzCc37Ccl4XfcnAv33081gP34cw/360fx360f'
  },
  {
    name: 'Kilowatt Case',
    marketHashName: 'Kilowatt Case',
    icon: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFU2nfNaWRBD_9m4homZlPjzMITdn2xZ_IshiL-Q9Nyn0AWx_RBsZzr0ctSSd1VqM1vTrFO-lb3og5TovpTNz3Rq6ydx5i3UnAv3309eY8cKJA/360fx360f'
  },
  {
    name: 'Dreams & Nightmares Case',
    marketHashName: 'Dreams & Nightmares Case',
    icon: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFUwnfbODzx94N2km4aZkPX4PLTVn35u5cx1g-jU-LP5gVO8v11rMT_zJ9ORcwVoYwvW-1Lvx-y6gJ-875TAzXE3uyJx4SuInAv330_7z3Xh7w/360fx360f'
  },
  {
    name: 'Revolution Case',
    marketHashName: 'Revolution Case',
    icon: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFU0nfbOJD594N2km4aZkPX4PLTVn35u5cx1g-jU-LP5gVO8v11rMW_3IdSWcwA3NArXq1Lqyevmg5Tov5TNzHE1viJx5CuIzQv330-Jgq0t_w/360fx360f'
  },
  {
    name: 'Recoil Case',
    marketHashName: 'Recoil Case',
    icon: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFU1nfbODj9H_8i_k4O0n_L1JaDum25V4dB8xLvFp9WgjAW3-RE_ZTr6JY7EdwU3YgvWr1Lqxrvmg5TouJ2fySBiviV2-z59x54x1Q/360fx360f'
  },
  {
    name: 'Fracture Case',
    marketHashName: 'Fracture Case',
    icon: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFUwnfbODzx94N2km4-ZkvL7PLTVn35u5cx1g-jU-LP5gVO8v11sYm_zctOScwY_YwvV_wK-l-y7hp65u86fznIxuyJwsHfcngv3309D5h5T2Q/360fx360f'
  }
];

async function fetchCasePrice(caseInfo: (typeof CS2_DROP_CASES)[0]): Promise<CaseMarketPrice> {
  const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(caseInfo.marketHashName)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          name: caseInfo.name,
          marketHashName: caseInfo.marketHashName,
          lowestPrice: data.lowest_price || '$0.20',
          medianPrice: data.median_price || data.lowest_price || '$0.20',
          volume: data.volume || '10,000+',
          lastUpdated: new Date().toLocaleTimeString(),
          icon: caseInfo.icon
        };
      }
    }
  } catch (err) {
    // ignore individual error
  }

  // Fallback defaults if Steam Community rate-limits
  return {
    name: caseInfo.name,
    marketHashName: caseInfo.marketHashName,
    lowestPrice: '$0.25',
    medianPrice: '$0.25',
    volume: '25,000+',
    lastUpdated: new Date().toLocaleTimeString(),
    icon: caseInfo.icon
  };
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return new Response(JSON.stringify({ success: true, cached: true, prices: cache.data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }

  try {
    // Fetch prices in parallel
    const prices = await Promise.all(CS2_DROP_CASES.map((c) => fetchCasePrice(c)));
    cache = {
      timestamp: now,
      data: prices
    };

    return new Response(JSON.stringify({ success: true, cached: false, prices }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Failed to fetch case prices' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
