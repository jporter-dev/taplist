# Cutover checklist (manual steps)

One-time steps to finish the migration from Pages + taplist-worker to the single Worker in this repo. Delete this file when done.

## 1. Secrets

- [ ] **Rotate the Untappd client secret** ([Untappd API dashboard](https://untappd.com/api/dashboard)). The old secret is committed to the public `origin/cloudflare` branch and was bundled into the old client JS.
- [ ] Generate a scraper token: `openssl rand -hex 32`
- [ ] Create a Cloudflare API token with Workers deploy + KV permissions (dashboard → My Profile → API Tokens → "Edit Cloudflare Workers" template).
- [ ] GitHub repo secrets (Settings → Secrets and variables → Actions): `SCRAPER_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- [ ] Worker secrets: `cd worker && npx wrangler secret put SCRAPER_TOKEN && npx wrangler secret put UNTAPPD_CLIENT_SECRET`

## 2. First deploy + data

- [ ] Merge the `modernize` branch to `main` (or push it and let the deploy workflow run from main after merge).
- [ ] Verify the deploy workflow is green and `https://taplist.<your-subdomain>.workers.dev/api/taplist` responds.
- [ ] Run the "Scrape taplists" workflow manually (Actions tab → workflow_dispatch) and confirm fresh data.

## 3. Domain cutover

The new site lives at `taplist.prtr.dev` (declared in `worker/wrangler.jsonc` under `routes`, provisioned automatically on deploy). The old Pages site keeps `taplist.jporter.dev` until it is retired — no need to detach it first.

- [ ] Deploy the worker (push to main or `cd worker && npx wrangler deploy`) and verify `https://taplist.prtr.dev/api/taplist` responds with JSON.
- [ ] Update the Untappd app registration's redirect URL to exactly `https://taplist.prtr.dev/` (must match the worker's `OAUTH_REDIRECT_URL` var).
- [ ] Test the OAuth round-trip on the prod domain (log in, check the feed in the right drawer).
- [ ] Optional: keep `taplist.jporter.dev` as a redirect to the new domain once the Pages project is retired.

## 4. Retire the old infrastructure (after a stable week)

- [ ] Delete the Pages deploy hook (`73d95584-...`) and the old worker's cron trigger.
- [ ] Delete the old `taplist-worker` Worker and the Pages project.
- [ ] Keep the KV namespace `7a6f2beb...` (reused by the new worker). Optionally delete the old per-venue keys (everything except `taplist` and `beer:*`).
- [ ] Archive the [taplist-worker](https://github.com/jporter-dev/taplist-worker) repo with a pointer to this one.
- [ ] Delete the `origin/cloudflare` branch (contains the leaked `.env`) and other stale branches (`algolia`, `untappd`, `dev`, `master`, `dependabot/*`).
