# Optional accounts and cloud saves — local backend (Front A)

Updated 2026-10-29. Authority: AGENTS.md decision (4) of 2026-10-29 and docs/EXTERNAL-SERVICES.md §4 (level B).
Plan: research folder `analysis/front-plans/front-a-backend.md`.

This is new web infrastructure [W], not a CLEA contract. It runs **only on loopback**: there is no Cloudflare account,
no `wrangler login`, no deployment, no DNS, no remote D1/R2/KV and no real email. Deployment, a real email provider,
the analytics token and the minimum age in the terms remain user decisions.

## What it does

- **Accounts are optional.** Ordinary builds contain no account UI and make no request; Save and Restore investigation
  work with local files exactly as before. The account appears only in builds made with `VITE_OPENVIREO_CLOUD=1`.
- **Sign-in by emailed link**, no password. The link carries a single-use token that expires after 15 minutes, in the
  URL fragment (`#signin=…`), so it never reaches a server log or a `Referer`. Opening the link never signs in by
  itself: the panel shows the masked address the link is for and the user clicks **Complete sign-in**, then sees
  "Signed in as … Not you? Sign out." (protects against login CSRF and against scanners that run JavaScript). A new
  link retires every older unused link for that address, using one retires its siblings, and signing in replaces the
  browser's previous session. **Sign out everywhere** ends every session of the account. The account is created at
  the first completed sign-in. Requests are rate-limited per mailbox (plus tags and Gmail dots count as one), per
  client and globally per hour, and the answer never reveals whether an account exists.
- **Cloud copies of saved investigations**: the exact bytes of the file Save investigation produced (format unchanged,
  SHA-256 recorded), up to Restore's own size cap (16 MiB + 4096 B). Older saves whose `format` carries an earlier
  producer name are admitted exactly as local Restore admits them (the worker reuses `projectMarker` from
  `src/core/projectMetadata.ts`). Restore from the cloud goes through the ordinary Restore investigation path, which
  validates the file fully. Quota: 20 files and 128 MiB per account, reserved atomically (one D1 statement checks and
  inserts the index row before the bytes are written), so concurrent uploads cannot exceed it.
- **Progress per exercise**, derived only from the saved investigations: version 1 records which exercises
  (E01–E06, E08) the newest saved file holds work for. A Hubble workspace without recorded measurements is not counted
  as E01 work. `src/cloud/progress.test.ts` ties the section names to `src/io/analysisSession.ts` and to real saved
  files, so a renamed or new section fails a test. Key results (H₀, pulsar DM, Pleiades distance, Object X type)
  are **not derived yet**; each row says `results-not-derived-v1`.
- **Preferences** (theme, language, telescope options): stored and validated by the API; the app does not sync them
  yet.
- **Export** (one JSON with profile, preferences, progress and every investigation embedded) and **delete account**
  (confirmed by typing the email; removes every row and stored file).
- **Visit analytics**: Cloudflare Web Analytics is the proposal. `src/cloud/analytics.ts` is an inert placeholder: off
  without a build-time token, nothing calls it, no cookies.

## Layout

| Path | What |
|---|---|
| `worker/` | Separate package (own `package.json`, lockfile, `tsconfig.json`, `wrangler.jsonc`). The root build and tests do not use it. |
| `worker/migrations/0001_level_b.sql` | D1 schema: users, login_tokens, sessions, rate_limits, investigations (index; bytes in R2), preferences, exercise_progress, dev_outbox. Teacher features (level C) are new tables only. |
| `worker/src/` | Router, auth, email sink, rate limits, investigations, progress, preferences, account. |
| `worker/test/` | Vitest inside workerd (`@cloudflare/vitest-plugin`, Miniflare D1/R2 in memory). |
| `src/cloud/` | Frontend: build flag, API client, sign-in link handling, the account panel, messages, analytics placeholder. |
| `src/OpenVireo.tsx` | One import and one `<CloudEntry/>` in the investigation toolbar. |
| `vite.cloud.config.ts`, `playwright.cloud.config.ts`, `tests/cloud-account.spec.ts` | Local end-to-end flow. |

## Run it locally

```bash
cd worker && npm ci
```

```bash
cd worker && cp .dev.vars.example .dev.vars && npm run migrate:local && npm run dev
```

Then, from the repo root, start the app with the account enabled and `/api` proxied to the worker (port 8787 by
default; `APP_ORIGIN` in `.dev.vars` must match the app's origin):

```bash
VITE_OPENVIREO_CLOUD=1 OPENVIREO_WORKER_PORT=8787 node node_modules/vite/bin/vite.js --config vite.cloud.config.ts --host 127.0.0.1 --port 5175
```

Sign-in links are printed in the `wrangler dev` terminal (`[dev email sink]`) and kept in the local `dev_outbox` table.
Local state lives in `worker/.wrangler/` (git-ignored).

## Tests

```bash
cd worker && npm test
```

```bash
OPENVIREO_TEST_PORT=5297 npx playwright test -c playwright.cloud.config.ts
```

The Playwright config starts `wrangler dev --local` on `127.0.0.1:<port+1>` with fresh state and the app on
`127.0.0.1:<port>` (never 5173), then: request a link → read it from the dev sink → open it in a new tab → Save
investigation → upload → reload → restore → download (same bytes) → export → delete the copy → delete the account. In the
default suite the same spec only checks that ordinary builds show no account UI and call no API.

## Security notes

- Session cookie `__Host-ov_session`: HttpOnly, Secure, SameSite=Strict, Path=/, 30 days; only SHA-256 of session ids
  and sign-in tokens is stored. Chromium accepts the Secure cookie over `http://127.0.0.1`; a dev-only
  `COOKIE_INSECURE_LOOPBACK=1` exists for browsers that do not, honoured only with a loopback `APP_ORIGIN` (the same
  gate as the dev email sink) on a request that arrived on loopback. It uses the cookie name `ov_session` without `Secure`. The Playwright flow verified the
  `__Host-` cookie in Chromium only (the one browser installed in `.local/browsers`); Firefox and WebKit are untested.
- CSRF: every write needs the `X-OpenVireo-CSRF: 1` header, an `Origin` equal to `APP_ORIGIN` when present and a
  same-origin `Sec-Fetch-Site` when present. The worker sends no CORS headers.
- The dev email sink and `GET /api/dev/outbox` work only with `EMAIL_MODE=dev-sink`, a loopback `APP_ORIGIN` **and** a
  request whose own URL host is loopback; otherwise sign-in requests fail closed with `503 email-not-configured`. If
  either dev switch (`EMAIL_MODE=dev-sink`, `COOKIE_INSECURE_LOOPBACK=1`) is configured and a request arrives on a
  non-loopback host, the worker refuses every request with `503 dev-config-on-public-host`, so a deployment that
  inherited dev variables cannot run.
- Ordinary builds contain no cloud file or code: the flag is read inline at the dynamic import so the bundler drops
  the chunk, and `npm run build` ends with `scripts/check-cloud-free-dist.mjs`, which fails if `dist/` holds a
  `CloudAccount-*` file or a cloud marker string (skipped for `VITE_OPENVIREO_CLOUD=1` builds).
- Terms/minimum-age hook: `TERMS_POLICY=none` today (nothing enforced); any other value fails closed until the policy
  is decided and implemented.
- Wrangler runs with `WRANGLER_SEND_METRICS=false` (no telemetry) and `WRANGLER_HIDE_BANNER=true` (the banner is what
  runs its npm update check) in every script and in the Playwright config. Wrangler 4.150.0 still has two other
  update-check paths, both off the normal path: a warning that the compatibility date is newer than the bundled runtime
  (ours, 2026-10-01, is older than the runtime's 2026-10-06) and the message printed after a crash.
- No secrets exist yet. `.dev.vars` is git-ignored; `worker/.dev.vars.example` documents every variable.

## Not done (decisions or follow-ups)

- **One-click "Save to cloud".** The JSON is produced inside `SpectrumInstrument.tsx`, which other fronts are editing,
  so today the cloud panel uploads the file Save investigation produced. A ~3-line hook there (route the serialized text
  to a callback instead of the download) enables a one-click button; the client already has `upload(blob,name)`.
- Key-result derivation for progress (needs either the browser to attach results computed by the existing pure
  readers, or the worker to import them).
- Preference sync in the app; teacher features (level C); deployment, domain, real email provider, analytics token,
  minimum age and terms text.

### Deployment prerequisites (review 1, 2026-10-29)

- **Victim lockout:** anyone can spend an address's 3 link requests per 15 minutes and delay that person's sign-in.
  Revisit with the real email provider (for example a per-address cooldown instead of a hard limit, or a challenge).
- **Client address:** `CF-Connecting-IP` is trustworthy only behind Cloudflare's edge; under `wrangler dev` or any
  other front it is absent or spoofable. The per-mailbox and global caps do not depend on it.
- **Orphan stored files:** the index row is reserved before the bytes are written and released if the write fails,
  and account deletion sweeps the user's files again after deleting the rows. A worker dying between the R2 write and
  a failed rollback, or an upload racing an account deletion, can still leave an unindexed object under
  `inv/<user>/`; a periodic sweep of objects without an index row is needed before deployment. A row whose bytes are
  missing shows as `"file": null, "missing": true` in the export.
- **Idle sessions:** sessions have a 30-day absolute expiry and no idle limit (`last_seen_at` is recorded); decide an
  idle limit at deployment.

## Dependencies (worker only, pinned)

`wrangler` 4.150.0, `@cloudflare/vitest-plugin` 1.4.1 (successor of `@cloudflare/vitest-pool-workers`),
`@cloudflare/workers-types` 5.20261008.1, `vitest` 4.1.11 (the plugin's runner fails under the root's Vitest 5 at this
version), `typescript` 6.0.3. `worker/.npmrc` sets `legacy-peer-deps` because npm 10.9 crashes resolving the plugin's
peer set. `wrangler` downloads the `workerd` runtime binary into `worker/node_modules`; nothing native is committed.
