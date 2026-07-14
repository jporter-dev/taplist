const JSON_HEADERS = { "Content-Type": "application/json" };
const TAPLIST_KEY = "taplist";
const TAPLIST_CACHE_SECONDS = 300;
const BEER_CACHE_SECONDS = 604800; // 7 days
const BEER_NEGATIVE_CACHE_SECONDS = 86400; // 1 day; unfindable beers stop burning quota

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/api/taplist") {
      if (request.method === "GET") return getTaplist(request, env, ctx);
      if (request.method === "POST") return postTaplist(request, env, ctx);
      return json({ error: "Method not allowed" }, 405);
    }

    if (pathname === "/api/auth/untappd" && request.method === "POST") {
      return exchangeOauthCode(request, env);
    }

    if (pathname === "/api/beer" && request.method === "GET") {
      return getBeer(request, url, env);
    }

    if (pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};

async function getTaplist(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = taplistCacheKey(request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const data = await env.TAPLIST.get(TAPLIST_KEY);
  const response = new Response(data ?? "{}", {
    headers: {
      ...JSON_HEADERS,
      "Cache-Control": `public, max-age=${TAPLIST_CACHE_SECONDS}`,
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function postTaplist(request, env, ctx) {
  if (!(await isAuthorized(request, env))) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body?.venues || typeof body.venues !== "object") {
    return json({ error: "Body must contain a venues object" }, 400);
  }

  // Merge so venues that failed this scrape keep their last-known-good beers.
  const existing = JSON.parse((await env.TAPLIST.get(TAPLIST_KEY)) ?? "{}");
  stampFirstSeen(body.venues, existing.venues ?? {});
  const merged = {
    updated_at: Date.now(),
    venues: { ...existing.venues, ...body.venues },
  };
  await env.TAPLIST.put(TAPLIST_KEY, JSON.stringify(merged));

  ctx.waitUntil(caches.default.delete(taplistCacheKey(request)));
  return json({ ok: true, venues: Object.keys(body.venues).length });
}

// Powers the "new on tap" badge. null means unknown: the beer predates
// tracking, or the whole venue is new (badging an entire venue is noise).
function stampFirstSeen(incoming, existing) {
  const now = Date.now();
  for (const [name, venue] of Object.entries(incoming)) {
    const priorVenue = existing[name];
    const prior = new Map((priorVenue?.beers ?? []).map((b) => [b.id, b]));
    for (const beer of venue.beers ?? []) {
      const old = prior.get(beer.id);
      beer.first_seen = !priorVenue ? null : old ? (old.first_seen ?? null) : now;
    }
  }
}

async function exchangeOauthCode(request, env) {
  let code;
  try {
    ({ code } = await request.json());
  } catch {
    // fall through to the missing-code error
  }
  if (!code) return json({ error: "Missing code" }, 400);

  const params = new URLSearchParams({
    client_id: env.UNTAPPD_CLIENT_ID,
    client_secret: env.UNTAPPD_CLIENT_SECRET,
    response_type: "code",
    redirect_url: env.OAUTH_REDIRECT_URL,
    code,
  });
  const response = await fetch(
    `https://untappd.com/oauth/authorize/?${params}`
  );
  if (!response.ok) {
    return json({ error: "Untappd token exchange failed" }, 502);
  }
  const data = await response.json();
  const token = data?.response?.access_token;
  if (!token) return json({ error: "No access token returned" }, 502);
  return json({ access_token: token });
}

async function getBeer(request, url, env) {
  const q = url.searchParams.get("q")?.trim();
  if (!q) return json({ error: "Missing q parameter" }, 400);

  // The scraper (authed) enriches whole venues in one run; only browsers
  // share the per-IP budget. Protects the app-wide Untappd hourly quota.
  const authed = await isAuthorized(request, env);
  // X-Authed lets the scraper detect a token mismatch from response headers.
  const diag = { "X-Authed": String(authed) };
  if (!authed) {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.BEER_RATELIMIT.limit({ key: ip });
    if (!success) return json({ error: "Too many requests" }, 429, diag);
  }

  const kvKey = `beer:${slugify(q)}`;
  const cached = await env.TAPLIST.get(kvKey, "json");
  if (cached) {
    if (cached.not_found) {
      return json({ error: "Beer not found" }, 404, { ...diag, "X-Cache": "hit" });
    }
    return json(cached, 200, { ...diag, "X-Cache": "hit" });
  }

  const creds = `client_id=${env.UNTAPPD_CLIENT_ID}&client_secret=${env.UNTAPPD_CLIENT_SECRET}`;
  const searchResp = await fetch(
    `https://api.untappd.com/v4/search/beer?q=${encodeURIComponent(q)}&${creds}`
  );
  if (!searchResp.ok) {
    return json({ error: `Untappd search failed (${searchResp.status})` }, 502, diag);
  }
  const search = await searchResp.json();
  const bid = bestMatch(search?.response?.beers?.items, q)?.beer?.bid;
  if (!bid) return notFound(env, kvKey, diag);

  const infoResp = await fetch(
    `https://api.untappd.com/v4/beer/info/${bid}?${creds}`
  );
  if (!infoResp.ok) {
    return json({ error: `Untappd beer info failed (${infoResp.status})` }, 502, diag);
  }
  const info = await infoResp.json();
  const b = info?.response?.beer;
  if (!b) return notFound(env, kvKey, diag);

  // Only the fields the frontend renders; auth_rating requires a user token.
  const beer = {
    bid: b.bid,
    beer_name: b.beer_name,
    beer_label: b.beer_label,
    beer_description: b.beer_description,
    beer_style: b.beer_style,
    beer_abv: b.beer_abv,
    rating_score: b.rating_score,
    stats: { user_count: b.stats?.user_count ?? 0 },
    brewery: {
      brewery_name: b.brewery?.brewery_name,
      brewery_slug: b.brewery?.brewery_slug,
    },
  };
  await env.TAPLIST.put(kvKey, JSON.stringify(beer), {
    expirationTtl: BEER_CACHE_SECONDS,
  });
  return json(beer, 200, { ...diag, "X-Cache": "miss" });
}

// Scraped names are "<brewery> <beer>", but Untappd's first hit is sometimes
// another brewery's beer with a similar name. Prefer a hit whose brewery
// actually appears in the query.
function bestMatch(items, q) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const query = q.toLowerCase();
  const match = items.find((item) => {
    const brewery = item.brewery?.brewery_name?.toLowerCase();
    return brewery && query.includes(brewery);
  });
  return match ?? items[0];
}

async function notFound(env, kvKey, diag = {}) {
  await env.TAPLIST.put(kvKey, JSON.stringify({ not_found: true }), {
    expirationTtl: BEER_NEGATIVE_CACHE_SECONDS,
  });
  return json({ error: "Beer not found" }, 404, { ...diag, "X-Cache": "miss" });
}

async function isAuthorized(request, env) {
  const header = request.headers.get("Authorization") ?? "";
  const expected = `Bearer ${env.SCRAPER_TOKEN}`;
  if (!env.SCRAPER_TOKEN) return false;
  const enc = new TextEncoder();
  const a = enc.encode(header);
  const b = enc.encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

function taplistCacheKey(request) {
  const url = new URL(request.url);
  return new Request(`${url.origin}/api/taplist`, { method: "GET" });
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}
