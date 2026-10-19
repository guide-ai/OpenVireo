# Point aperture / neighbor validation — 18 October 2026

Delivered: a new pure TypeScript point-source preparation core, static source-position reader witnesses, and narrowed lifecycle/persistence gates. No photometer acquisition UI, original observations, new default calibration, file importer or v7 photometry fields were added.

## Scientific review

19 bounded byte/listing captures and19 constants/immediates match the pinned target manifest; six source/previous-evidence files retain their hashes. Callback0x55cc34→0x55cc40→0x55f7d4, the stored2π normalization, photometer tolerance1e−7 and max10 refinements were traced. Separation cosine helper0x4036ac was separately checked:0x4036b2 is FCOS. Operand/stack review establishes point limits(r−d)/s and−(r+d)/s; the pushed12-byte arguments change ESP-relative offsets.

The recovered lookup is not a full-tail analytic CDF: table0 is0 at−5, construction integrates from−5 to each grid point, interpolation is retained, and above+5 returns1. Native inclusive+5 may address entry101 outside the allocated0–100 table; the port rejects it instead of claiming a safe native endpoint. Number/Math, explicit indexed coordinates rather than repeated Extended additions, finite/overflow bounds and rejecting nonconvergence are declared adaptations.

Nine new scientific tests compare safe knots/aperture cases against independent90-digit Gaussian power-series/interpolation references and UBV magnitudes against independently summed linear flux. They also verify flat-distance RA wrap, off-grid behavior, sentinels, Single projection, missing colors, skipped neighbors, bounded work and overflow. These synthetic algebraic references are not acquired spectra or an original runtime oracle. The central zero-admission/missing-color, R/I, image-object and unknown-scene domains remain excluded.

Static readers now establish24 PLEIADES.HTL records of86 bytes and16 CLUSTERS.DAT records of102 bytes, backed by native reader/consumer instructions. The retained reader witness hashes every record and preserves exact rational coordinates. Only Pascal names and positional fields were decoded; unused padding/fields, epoch, source UBV and generated-cluster associations are not inferred. The first hot-list target is01799-01442; M45 is a cluster-list entry, not a ready photometric observation.

Stop disables the timer and unlocks controls without calling reduction/Record. Record performs collection lookup/copy before modal review; its accept/cancel mutation and actual writer/replay remain unresolved. No guessed state or rollback behavior was implemented. The1000-base-count-per-callback versus100ms distinction is unchanged.

## Actual repository verification

- `npm run build`: TypeScript and Vite passed. Existing large-chunk advisory remains; UI build chunk names are unchanged because this core is not wired into an incomplete instrument.
- `npm test`:44 files,266 tests passed, including the nine new source contracts and all prior scientific/state/reader/session tests.
- `npm run test:e2e`:57 passed in21.8seconds. Coverage retains SSP export/reimport and exact bytes, manual measurement/cancel/save, invalid and late reads/restores, v7/older sessions, luminosity/width/classification, star and three-galaxy Hubble flows.
-200 of201 existing source/data/test/config/dependency files retain their prior hashes; only planning metadata changed among these existing files. All prior implementation files, numeric core, IO/session v7, tests and E2E remain unchanged. New source/vectors/provenance are additive.
- Current-run desktop/mobile classification screenshots were visually inspected; retained curves, controls, source identity and explicit errors fit their layouts. Copies:`.local/qa/openclea-photometer-source-regression-desktop.png` and `openclea-photometer-source-regression-mobile.png`. These verify existing UI regressions, not a photometer screen.
- Persistent `clea-web-preview.service` remains active, listening only on127.0.0.1:5173. No backend, Worker, IndexedDB, dependency or installation was added.

No original execution/microemulation, Windows, Claude, engine installation, remote push, publication or original-resource upload occurred. No action remains denied/pending/uncertain. Scientific acquisition is gated by source/neighbor-field and telescope/result lifecycle evidence, not a tool permission failure. Full I01/E04 and original x87/edition equivalence are not accepted; all64-package counts remain unchanged.

[Contract, API, steps and next exact gates](PHOTOMETER-SOURCE.md). Backups/patch/hashes/verification:`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-source-integration/`. Static captures, analytic generator and reader witnesses:`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-source-recovery/`.
