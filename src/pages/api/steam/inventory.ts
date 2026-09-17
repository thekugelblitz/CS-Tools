import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const steamId = url.searchParams.get('steamId');

    if (!steamId) {
      return new Response(JSON.stringify({ success: false, error: 'steamId query param is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const inventoryUrl = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=60`;
    const res = await fetch(inventoryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      if (res.status === 403) {
        return new Response(JSON.stringify({ success: true, isPrivate: true, message: 'Inventory is private' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ success: false, error: `Steam returned status ${res.status}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await res.json();
    const descriptions = data?.descriptions || [];

    const medals: string[] = [];
    const recentCases: any[] = [];

    for (const item of descriptions) {
      const name: string = item.market_name || item.name || '';
      
      // Match service medals & coins
      if (name.includes('Service Medal') || name.includes('Veteran Coin') || name.includes('Loyalty Badge')) {
        if (!medals.includes(name)) {
          medals.push(name);
        }
      }

      // Match weapon cases
      if (name.includes('Case') && !name.includes('Key')) {
        recentCases.push({
          name,
          iconUrl: item.icon_url ? `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}/300fx300f` : undefined,
          type: item.type || 'Container'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isPrivate: false,
        medals,
        recentCases: recentCases.slice(0, 5)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to inspect inventory' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
