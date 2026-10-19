# Hubble guide verification — 18 October 2026

Repository: `/home/dobleuber/Projects/personal/clea-web`.
Persistent preview: http://127.0.0.1:5173/. Existing
`clea-web-preview.service` confirmed active/running with Vite explicitly bound to
127.0.0.1:5173 and strictPort. No service settings or security policy changed.

Acceptance was assessed before implementation in
[HUBBLE-ACCEPTANCE.md](HUBBLE-ACCEPTANCE.md): the three-galaxy acquired/manual
analysis/fit/session/SSP path already existed, but a novice needed external
instructions to join its parts. This increment closes that P03/Q02 UI slice.
The N05 inventory now correctly says partial implementation rather than
resources-only. E01 and phase 2 remain partial for original and wider scope.

- `npm run build` passed, including `tsc -b`. Vite retains the known large
  scientific-data chunk warning; no new dependency or background service.
- `npm test`: **216 passed in 36 files** (baseline 210).
- `npm run test:e2e -- --workers=2`: **41 passed in 40.7 s**, against the actual
  persistent preview (baseline 39).
- New E2E captured no page runtime errors. Desktop and 320 px mobile screenshots
  visually inspected; modal scrolling, next-step button, source text, guidance
  and recovery sections fit with no horizontal document/dialog overflow.

New pure tests check unique acquired target counting, identity+SHA+target
binding, generic/stellar exclusion, missing archives, distinct recipes, exact
three-row readiness, missing sources, repeated targets, original 36773 origin
compatibility and nonmutation. These validate a new workflow summary, not an
original scientific routine or a student's accuracy.

The guide's full browser path acquires/records three targets using deliberately
operator-selected test positions (not recovered answers), follows navigation,
requires explicit magnitudes/sources/target IDs, tests missing-source/invalid
number recovery and duplicate records, saves/reloads/restores, recalculates
progress, rejects a bad restore atomically and preserves the log. Mobile covers
Escape and return focus, opening the guide during exposure, leaving/reactivating
routes, paused-time preservation and raw snapshot restoration. Existing suites
retain record cancellation, invalid/cancelled file import, SSP/replay and full
three-target fit coverage.

One initial candidate test assumed exactly 1000 ms after opening/closing the
modal while exposure remained running. Real browser callbacks committed an
additional 105 ms, consistent with the declared timing policy. The test now
asserts the correct invariant: the actual committed paused time remains
unchanged while away and after restoration. No timing behavior was changed to
satisfy a fixture. Candidate tests and the complete final suite passed afterward.

Screenshots:
- `.local/qa/openclea-hubble-guide-desktop.png`
- `.local/qa/openclea-hubble-guide-mobile.png`
- `.local/qa/openclea-hubble-guide-recovery-mobile.png`

Scientific formulas, original manifests/resources, normalizations and session
schema v1/v2/v3 were unchanged. Progress is recalculated from existing restored
data; no cached completion flag is accepted. No original CLEA/Windows/emulation,
Claude, REA installation/diagnosis, remote repository, push, publication or public
resource upload occurred. There was no auto-review rejection or execution blocker.

Still open: educator/real-learner evaluation, other original fields/instruments,
instructor/time/site/tracking and historical HubLab branches, native x87/RTL/GDI
and process-wide RNG continuity, original SSP writer oracle, external reviews
under existing restrictions, and rights/release gates. A ready dataset is not a
numerical grade, H0 determination, native-equivalence result or suite completion.
See [HUBBLE-LAB-GUIDE.md](HUBBLE-LAB-GUIDE.md) for exact user steps and provenance.
