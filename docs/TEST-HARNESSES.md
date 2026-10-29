# Test harnesses

Some Playwright specs test a single panel's contract (timers, host API, lifted state, edge cases that the App cannot reach through its UI). They run against small standalone pages, not the App. Real-app flows for the same panels are in the `*-app.spec.ts` and `recorded-analysis-navigation.spec.ts` specs.

## Pages

| Page | Entry | Specs | Env var |
|---|---|---|---|
| `/__harness/radio/` | `tests/harness/radio.tsx` | `radio-control`, `radio-antenna`, `radio-antenna-lifecycle` | `OPENVIREO_RADIO_HARNESS_URL` |
| `/__harness/saved-rows/` | `tests/harness/saved-rows.tsx` | `pulsar-saved-rows` | `OPENVIREO_PULSAR_SAVED_ROWS_HARNESS_URL` |
| `/__harness/pulsar/` | `tests/harness/pulsar.tsx` | `pulsar-analysis` | `OPENVIREO_PULSAR_HARNESS_URL` |
| `/__harness/wedge/` | `tests/harness/wedge.tsx` | `wedge-lss`, `wedge-focus`, `wedge-prompt-focus` | `OPENVIREO_WEDGE_HARNESS_URL` |

Host APIs and query options:

- radio: `window.__radioHarness` (`counts`, `outcomes`, `setOptions`, `setEnvironment`, `patchAntenna`, `unmount`); `?transit=1 ?instant=1 ?limits=1 ?manualTick=1 ?rateBase= ?maxRateIndex= ?latitude= ?synthetic=scope-modal`.
- saved-rows: `window.__savedRows.render(props)/unmount()`, `window.__mount()`, `window.__modalLog`; `?plr=1 ?strict=1`.
- pulsar: `window.__pulsarHarness.render(props)/unmount()` (the controller returned by `mountPulsarWorkbench`).
- wedge: `?host=1` (host simulator with "route hidden" and "project operation" checkboxes), `?lang=es` (placeholder overrides for the message-catalog contract, not a reviewed translation).

## How they are served

`tests/harness/vite-plugin.ts` is a Vite plugin with `apply: 'serve'`. It only adds dev-server middleware, so `vite build` never sees it and the production bundle is unchanged (checked on 2026-10-29: the `dist/` file list and SHA-256 of all 1281 files were identical before and after). `vite preview` does not serve these pages either.

`playwright.config.ts` sets the four env vars to the pages on its own test server (`OPENVIREO_TEST_PORT`, default 5175) unless they are already set. A plain `npx playwright test` therefore runs these specs. To try a page by hand, start the dev server and open, for example, `http://127.0.0.1:5173/__harness/radio/?instant=1`.

## History

Until 2026-10-29 these pages lived outside the repository, in the evidence folders of the fronts that wrote them (`~/Documents/Codex/2026-10-18/task-3/claude-radio-saved-rows-app-integration/harness/`, `.../claude-pulsar-analysis/harness/vite.harness.mjs`, `.../claude-wedge-analysis/correction-host-focus/vite.config.mjs`). Nothing in the repo set the env vars, so about 160 tests were skipped in every normal run. The in-repo pages are ports of those last versions, with the same host APIs and query options.

## Deliberate skips

- Evidence screenshots in `radio-antenna.spec.ts` and `radio-antenna-lifecycle.spec.ts` run only when `OPENVIREO_RADIO_SCREENSHOTS` names a directory. They capture images and assert nothing.
- `test.skip(browserName !== 'chromium')` guards CDP/touch tests. The config has only a Chromium project, so these never skip today.
