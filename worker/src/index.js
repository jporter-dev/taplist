const JSON_HEADERS = { "Content-Type": "application/json" };
const TAPLIST_KEY = "taplist";
const TAPLIST_CACHE_SECONDS = 300;
const BEER_CACHE_SECONDS = 604800; // 7 days

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
      return getBeer(url, env);
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
  if (!isAuthorized(request, env)) {
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

  // Merge with the existing list so venues that failed to scrape this run
  // keep their last-known-good beers.
  const existing = JSON.parse((await env.TAPLIST.get(TAPLIST_KEY)) ?? "{}");
  const merged = {
    updated_at: Date.now(),
    venues: { ...existing.venues, ...body.venues },
  };
  await env.TAPLIST.put(TAPLIST_KEY, JSON.stringify(merged));

  ctx.waitUntil(caches.default.delete(taplistCacheKey(request)));
  return json({ ok: true, venues: Object.keys(body.venues).length });
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

async function getBeer(url, env) {
  const q = url.searchParams.get("q")?.trim();
  if (!q) return json({ error: "Missing q parameter" }, 400);

  const kvKey = `beer:${slugify(q)}`;
  const cached = await env.TAPLIST.get(kvKey);
  if (cached) {
    return new Response(cached, {
      headers: { ...JSON_HEADERS, "X-Cache": "hit" },
    });
  }

  const creds = `client_id=${env.UNTAPPD_CLIENT_ID}&client_secret=${env.UNTAPPD_CLIENT_SECRET}`;
  const searchResp = await fetch(
    `https://api.untappd.com/v4/search/beer?q=${encodeURIComponent(q)}&${creds}`
  );
  if (!searchResp.ok) return json({ error: "Untappd search failed" }, 502);
  const search = await searchResp.json();
  const bid = search?.response?.beers?.items?.[0]?.beer?.bid;
  if (!bid) return json({ error: "Beer not found" }, 404);

  const infoResp = await fetch(
    `https://api.untappd.com/v4/beer/info/${bid}?${creds}`
  );
  if (!infoResp.ok) return json({ error: "Untappd beer info failed" }, 502);
  const info = await infoResp.json();
  const b = info?.response?.beer;
  if (!b) return json({ error: "Beer not found" }, 404);

  // Trimmed to the fields the frontend renders; auth_rating only exists for
  // user-token lookups, which the frontend does directly.
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
  return new Response(JSON.stringify(beer), {
    headers: { ...JSON_HEADERS, "X-Cache": "miss" },
  });
}

function isAuthorized(request, env) {
  const header = request.headers.get("Authorization") ?? "";
  return env.SCRAPER_TOKEN && header === `Bearer ${env.SCRAPER_TOKEN}`;
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
