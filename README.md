# Baltimore Taplist

> A unified, sortable, and searchable taplist for popular bars and breweries around Baltimore. Untappd ratings are tied in so users can choose venues that have a good beer selection when going out.

## Architecture

```
Browser (Vue 3 SPA) ──same-origin──> Cloudflare Worker "taplist"
                                      ├─ serves static assets (app/dist, SPA fallback)
                                      ├─ GET  /api/taplist        (KV aggregate, edge-cached 5 min)
                                      ├─ POST /api/taplist        (Bearer SCRAPER_TOKEN, scraper only)
                                      ├─ POST /api/auth/untappd   (OAuth code exchange; secret server-side)
                                      └─ GET  /api/beer?q=...     (KV-cached Untappd lookup, 7-day TTL)
GitHub Actions cron (~5h)  ──> scraper (Playwright + cheerio) ──authed POST──> /api/taplist
GitHub Actions push→main   ──> build app + wrangler deploy
```

Monorepo with npm workspaces:

- **`app/`**: Vue 3 + Vuetify 3 + Vite + Pinia frontend
- **`worker/`**: Cloudflare Worker (API + static assets + KV)
- **`scraper/`**: venue scraper (`config.yml`-driven; fetch/cheerio, Playwright, or JSON API per venue)

## Development

Requires Node 22 (`.tool-versions` is set up for asdf).

```bash
npm install

# terminal 1: worker with local KV (copy worker/.dev.vars.example to worker/.dev.vars first)
npm run dev:worker

# terminal 2: frontend with /api proxied to the worker
npm run dev:app

# scrape all venues without POSTing (prints JSON)
npm run scrape:dry

# scrape one venue while debugging selectors
node scraper/index.js --dry-run --site "Wet City"

# scrape and POST to the local worker
TAPLIST_API=http://localhost:8787 SCRAPER_TOKEN=dev-token npm run scrape
```

To test the production build through the worker (assets + API on one origin):

```bash
npm run build && npm run dev:worker   # then open http://localhost:8787
```

## Deployment

- **Push to `main`** → `.github/workflows/deploy.yml` builds the app and runs `wrangler deploy`.
- **Every ~5 hours** → `.github/workflows/scrape.yml` scrapes all venues and POSTs to the worker. Venues that fail to scrape keep their last-known-good beers (the worker merges).

Required GitHub repo secrets: `SCRAPER_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
Required worker secrets (`wrangler secret put`): `SCRAPER_TOKEN`, `UNTAPPD_CLIENT_SECRET`.

## Venue configuration

Venues live in `scraper/config.yml`. Each entry needs a `name`, `url`, and one of:

- `mode: fetch` (default): static HTML, scraped with cheerio using `selector` (plus optional `beerSelector`/`brewerySelector` sub-selectors)
- `mode: browser`: JS-rendered pages, scraped with Playwright using the same selector fields
- `mode: json`: a JSON API; `listKey` is the dot-path to the array, `fields` are joined with spaces to form the beer name

Optional `namefilter` references a named export from `scraper/filters.js` to clean up scraped names. Dead venues are documented at the bottom of the config.
