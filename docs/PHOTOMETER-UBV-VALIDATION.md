# Pleiades UBV validation — 18 October 2026

Delivered: U/B acquisition through the existing visual photometer, native independent filter skies and filter-reset gating, explicitly selected saved acquired/manual B−V, and strict backward-compatible portable replay. The domain remains one original Pleiades target/two complete fields, telescope0, explicit1′ base field and0.1s. No new noise, calibration, temperature/extinction/distance model or automatic learner reading was added.

## Actual-repository checks

- `npm run build`: TypeScript(`tsc -b`) and Vite passed. The pre-existing large shared catalog/numerical chunk advisory remains; no dependency/config/service changes were made.
- `npm test`: **49 files,308 tests passed**. Fifteen added tests cover independent UBV flux/count/random-state references, rare zero-aperture source leakage in all three filters, unsupported R/I, independent sky gating/return/release, filter reset/Stop, same-target acquired versus manual colors, rejected unconfirmed/sky/wrong-filter/foreign-target pairs, exact legacy v1 bytes and v2 proof/replay/tamper handling. Prior scientific/state/import/session coverage is retained.
- `npm run test:e2e`: **64 passed in22.9s**. Three new complete UBV flows cover V/B/U sky+target+blank manual records, explicit color selection, separate acquired/manual differences, per-filter invalidation and same-context return, Stop/filter locks, cancelled B entry, v2 save/reload/reimport, altered-proof preservation, all-bank release invalidation, legacy v1 continuation into B, and late cancelled v2 reads. The previous61 full flows include V photometry, analysis v7/older, SSP exact bytes/reimport, manual spectroscopy/classification/Hubble and three-galaxy acquisition.
- Seed42 sequential V/B/U reads match independent references: target totals552/331/354, with separately acquired sky totals1/2/2. Displayed magnitudes9.647121003/10.207010255/10.133643341 produce acquired B−V0.559889252. Manual V9.647/B10.207 produce0.56; a separate mobile case deliberately enters V8.1/B9.2 and preserves manual1.1 while the acquired value remains0.559889252. No value is replaced with catalog color or graded.
- Current actual-run desktop/mobile screenshots were visually inspected: filter status and notebook tags are visible; selected pair identity is retained; the two B−V sources are clearly distinguished. At320px the color values stack to retain all digits, and there is no horizontal page overflow. Desktop screenshot also retains an intentional invalid-proof alert with all confirmed entries/color intact.

Retained screenshots: `.local/qa/openclea-photometer-ubv-desktop.png` and `openclea-photometer-ubv-mobile.png`.

## Scientific/static evidence and compatibility

Seven byte/listing captures, two exact sky literals and four original Single calibration constants match the pinned original binary. Six supporting binary/license/previous-evidence hashes match; all nine prior complete original catalog/license/binary hashes and both prior field/vector hashes remain unchanged. The v2 contract fingerprint matches the integrated UBV contract. Raw artifacts stay outside source. Independent vectors reuse the existing Decimal90 analytic aperture reference, add exact native source colors/sky offsets and direct flux, and use integer-modulo PRNG/Python lgamma with retained decision margins. These are synthetic analytic references, not original acquired observations or a native execution oracle.

Changing filter resets the current result and activates only its own bank. It does not consume PRNG state or clear other filter skies within that same active context. All banks are invalidated on the existing web release/reentry boundary. Each object retains its actual filter, target/context and sky-reading link. B−V requires explicit confirmed acquired B/V notebook rows for the same pinned target; it never infers a latest row or imports cached derived values.

Legacy V-only histories retain the exact v1 field/policy markers, JSON byte ordering and computed counts. New filter/color histories require v2 plus the UBV contract SHA. The legacy marker cannot authorize new events. Unknown cached counts/calibration/color, wrong proofs/ordering/filter/target and foreign analysis v7 files are rejected. Existing analysis/investigation v7 remains unchanged and separate. Source/sky sum and count/time normalization are unchanged.

Of221 existing source/data/test/config/dependency files, **214 retain their hashes**. The seven changed files in that inventory are the photometer state, portable IO and its tests, visual component/CSS, English catalog and planning metadata. Existing V-only field/helper/vector files, spectrum/session v7, dependencies/configuration and other laboratories are unchanged. All64 package statuses remain unchanged:0 complete,34 partial,28 contract gates,1 rights gate and1 not started; I01/N03/E04 remain partial.

Candidate browser testing initially exposed a Node ESM JSON-fixture import requirement; the fixture is now read as UTF8 JSON through filesystem APIs in the test. No application behavior was changed to satisfy that loading issue. Mobile color layout was refined before final checks. No original execution/microemulation, Windows, Claude, installation, publication, push or original-resource upload occurred. No infrastructure change was needed. No denied, pending or uncertain required action remains.

Logs, backups, patch, fingerprints and verification:

`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-ubv-integration/`

Static captures and independent generator:

`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-ubv-recovery/`

[URL, exact UI steps, native contracts and remaining scientific limits](PHOTOMETER-UBV.md).
