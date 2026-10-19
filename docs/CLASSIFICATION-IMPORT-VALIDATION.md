# Classification import validation — 18 October 2026

Delivered in `/home/dobleuber/Projects/personal/clea-web`; persistent preview
http://127.0.0.1:5173/#classification, `clea-web-preview.service` active/running,
listening only on 127.0.0.1:5173.

## Delivered behavior

Existing analyser SP/SSP imports can enter visual classification; the comparator
also has a direct bounded file input. Original practice, every raw acquired star
and each imported byte identity retain independent workspaces. Equal bytes select
existing work rather than duplicate/reset it; identical names with different bytes
remain separate. No file is evicted. Source/header claims do not fill a spectral
type, create acquired provenance or supply a Hubble input.

Coverage and 0–1 flux are checked before accepting a source. The difference option
requires all 2799 parsed printed wavelengths to equal the immutable original grid;
no endpoint/length-only shortcut or hidden interpolation is used. Imported width
is disabled, including original-grid files. Original-practice width state remains
retained. Native execution/x87 equivalence and physical class validation are not
claimed. See [CLASSIFICATION-IMPORT.md](CLASSIFICATION-IMPORT.md) for exact policy,
steps, provenance and remaining N02/E03 work.

Full investigation v7 carries exact name/SHA-256/text plus manual state and an
explicit import policy; it does not accept cached samples, header objects, grids
or computed widths. Every nested file is rehashed/reparsed before restoration.
Prior full v1–v6 and practice v1–v3 remain readable, with unchanged output versions
when no imported contexts exist. Practice-only restore retains file/acquired work.
Four files, 4 MiB combined text, 2 MiB/50000 samples per file and 16 MiB full JSON
are explicit bounds. The existing response/archive/session limits remain enforced.

## Final verification on the actual repository

- `npm run build`: passed TypeScript project build and Vite. The existing large-
  chunk advisory remains; there is no new backend, dependency, Worker or IndexedDB.
- `npm test`: 42 files, 249 tests passed (1.80s); eight new contracts cover original
  grid/source hashes, BOM byte roundtrip, marker-based SSP claims, signed/profile
  boundaries, malformed/partial/oversize input, independent state/repeats/budgets,
  all-wavelength guards, v7 raw/measurement replay, forged schema/source data and
  non-destructive practice-only merge.
- `npm run test:e2e -- --workers=2`: 57 tests passed (reported duration 1.0m) against
  the persistent loopback preview. All 53 earlier flows remain green.
- Four new browser flows cover analyser-to-comparator linkage, exact-grid
  difference, blank/manual answer and confirmation cancel/save, preserved analyser
  control/log and practice-width draft, CSV4 and exact-byte download, full v7
  reload/restore, mobile SSP claims/XSS-safe text, visual-only mismatched grids,
  same-name/different-byte files, same-byte aliases, real chooser cancellation,
  invalid/signed/partial/full-archive rejection, delayed local-read cancellation,
  navigation/late completion, raw stellar replay/measurement/response retention,
  cancelled/invalid full restoration and practice-only merging.
- The affected 18 classification/width/luminosity/SSP browser flows passed together
  before integration. Final desktop 1440px and mobile 320px screenshots were
  visually inspected: source identity and long names wrap, plots remain readable,
  same-grid/mismatched-grid states are clear and width limits stay explicit.
- A separate audit rehashed all 74 original classification/manual/license/list
  files and all 57 runtime SP copies; all printed grids match the derived guard.
  The shared parser files `spectrumFiles.ts`, `legacySpectrumFile.ts` and
  `core/spectrum.ts` retain their pre-increment hashes. No original resource was
  added or modified; acquisition, noise, source-plus-sky and Hubble numerical
  modules remain unchanged.

During incremental wiring, typecheck caught incomplete callback/translation and
JSX connections; these were corrected before the verified builds. An initial new
browser expectation hardcoded a shorter z display (`+0.005000`) than the existing
formatter's `+0.00500000000`; the test now captures the actual prior display and
asserts exact retention. No numerical/display policy was changed to satisfy it.
Visual QA also prompted explicit unknown-spectrum labels and wrapping of long
names, and a concise imported-width unavailable panel. Final tests include these
changes.

## Review limits and remaining work

No Windows/CLEA execution/emulation, Claude, installation, remote repository/push,
public upload or deployment. The user prohibits Claude for this increment; this
is not an external/Claude review. No denied, pending or uncertain tool action
remains for this delivered package.

The imported file role remains a manual choice. SHA-256 verifies retained bytes,
not authorship, physical type or a native acquisition. Broader signed/flux>1 or
locale/codepage import profiles, full cursor/photo/zoom behavior, native/standalone
result/grade files, imported/acquired equivalent widths and educator acceptance
remain open. N02/E03 stay partial. A concrete next feature is manual wavelength/
trace-intensity marking using the already recovered cursor contract and explicit
SVG/source-state mapping; photo sampling and automatic interpretation stay separate.

## Deliverables

Guide: `docs/CLASSIFICATION-IMPORT.md`. Machine-readable policy and original-grid
witness: `data/classification/import-provenance.json` and `printed-grid.json`.
External reproduction: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/classification-import-recovery/`.
Backups, before/after hashes, unchanged-source/source-validation receipts and
reviewable patch: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/classification-import-integration/`.
Browser evidence: `.local/qa/openclea-classification-import-desktop.png` and
`.local/qa/openclea-classification-import-mobile.png`.
