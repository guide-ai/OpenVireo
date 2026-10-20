# Photometer timed-series validation — 2026-10-19

[Feature, evidence and exact manual steps](PHOTOMETER-INTEGRATION.md). Persistent preview: **http://127.0.0.1:5173/#photometer**. The existing `clea-web-preview.service` remained active at PID668923; it was not restarted. Temporary browser-test servers bind loopback only.

## Integrated verification

| Check | Result |
|---|---|
| `npm run build` (TypeScript project checks + Vite) | Passed |
| `npm test` |728 tests /80 files passed |
| `OPENVIREO_TEST_PORT=5175 npx playwright test --workers=4` |128 passed |
| New series + review regression flows on existing5173 preview |7 passed |
| Desktop1440px / mobile320px visual inspection |Completed series, partial Stop and editable note-limit dialog inspected; no overflow |
| Existing scientific data/primitives |101 data files and source/UBV/Poisson/reduction primitives retain baseline SHA-256 |
| Plan/acceptance |All64 original package statuses and counts retained |

The final integrated logs are in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/claude-photometer-integration-review/`: `final-actual-build.log`, `final-actual-unit.log`, `final-actual-browser.log` and `final-persistent-browser.log`. The persistent run uses copies of the two actual new-feature specs; its only changes capture the oversized-note dialog at320px. Its scope is recorded in `persistent-visual-scope.json`. The original source specs also pass in the128-flow regression. No application source was changed for that visual run. Vite retains the existing large-chunk advisory; compilation succeeds.

## Discriminating evidence

The initial series stage passed721 unit/126 E2E; the two confirmed review defects were then reproduced before correction. `before-unit.log` records four failed legacy/timed note-capacity regressions plus the unchanged-draft identity check. `before-browser.log` shows B/V selections lost on hide. Corrected tests cover escaped control/CJK note cost, atomic rejected entries, a shorter retry, both saves, pending B/V and seed123 across active/inactive hide, strict oversized nested-owner rejection before RNG, and pure callback admission at safe/backward/unavailable/hidden boundaries.

Native-series references cover13 independent sky/object pairs, all three targets×UBV, mixed durations, partial checkpoints, periods/base sums/draws/seeds and the maximum100s×5 reading. The original analytic comparison's one-count failure is retained in `photometer-series-integration/new-core.log`; `photometer-integration-recovery/analytic-discrepancy.json` and the bound Decimal90 finite-quadrature generator explain the correction without changing production science. `evidence-validation.json` checks29 original/license/range/reference bindings. These are static/independent implementation checks, not original executions.

[Review disposition](REVIEW-RESULT.md) links the immutable native Claude report and audit. Opus5.5 is confirmed by initialization/37 assistant model messages/result usage; configured high effort and the native high preset are recorded separately from unavailable provider telemetry. All nine findings were independently dispositioned. The two reproduced defects and adopted maintainability/contract-separation improvements are corrected and tested. There was one completed native review; the post-report corrections were not sent through a second Claude run. No new `/security-review` was run; its separate historical denial remains preserved.

## Preserved boundaries

Old raw photometer v1–v3 writer expressions, header/version selection, escaping/key order and canonical byte behavior are retained (`writer-equivalence.json` plus legacy round-trip tests). New explicit timing journals use owner4 inside the existing full8–18 nested protocol; outer scope/version rules, spectra, SSP/CSV, Hubble and classification contracts are unchanged. Manual notebook and B/V choices never come from catalog answers. Source+sky are added; sky is subtracted only in the recovered reduction using that sky's own duration.

The fixed three-target/telescope0/UBV slice uses integer nominal100ms executed callbacks, with no wall-time catch-up. Native Extended thresholds, global VCL/RNG/reentry, other21 targets, other telescopes/apertures/seeing, RI, native photometry-file/report compatibility and full exercise/classroom acceptance remain open. Exact-precision rejection commits no invented draw. Full packages remain1 complete/35 partial/26 contract-gated/1 not-started/1 rights-gated. No original execution, microemulation, installation, public asset upload, deployment, remote commit or push occurred.
