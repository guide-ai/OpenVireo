# E01 Hubble: from 8 to the 13 original Hubble.HTL galaxies (Front F)

Plan: `analysis/front-plans/front-h-hubble-13.md` (research root), with the coordinator's binding decisions. The eight earlier
targets stay on their frozen pinned paths; the new ones are listed in one table, `src/core/hubbleEngineTargets.ts`.

## M0 — frozen regression
`src/core/hubbleExistingTargets.test.ts` with `data/hubble/existing-target-fingerprints.json`, frozen at main 612e846 before any
engine change: for the 14 existing (target, telescope) pairs (36773/36747/54876 × records 0–2, CorBor – 1/3 and Pegasus × record
0) the policy, crop SHA-256, slit level and fraction, zero point, amplitudes, mean and wavelength digests and five journal
trajectories (counts digest, totals, draws, final seed, CSV digest); and for all 219 LSS rows × 3 records the status, reasons,
selected record, crop digest and calibration. Regeneration needs `OPENVIREO_FREEZE_FINGERPRINTS=1` and an unchanged engine.

## Per-target status
| HTL row | Target | Route | Telescopes | Status |
|---|---|---|---|---|
| 3 | 36805 UM-I – 3 | cached pan of the verified 36773 field (M1) | 0.4 m | available |
| 4 | NGC 4874 Coma – 1 | engine, QSO merge (M3) | 0.4 m, 4 m (0.9 m: mean bound) | available |
| 5 | NGC 4889 Coma – 2 | engine, QSO merge, own NGC4889.SP (M4) | 0.4 m, 4 m (0.9 m: mean bound) | available |
| 6 | 51976 Boo – 1 | engine, QSO merge, RS Boo outside view, start-time continuation (M5) | 0.4 m, 0.9 m, 4 m | available |
| 7 | 51975 Boo – 2 | engine, QSO merge, RS Boo outside view, start-time continuation (M5) | 0.4 m, 0.9 m, 4 m | available |

## M1 — UM-I – 3 (36805)
A fresh field centred on 36805 contains GLIMAGES.LST row 82 (the NGC 3898 photograph), and photographic association
(0x598e3b..0x598e52, insertion 0x599128) is not ported. Coordinator decision: reuse the verified 36773 (UM-I – 2) field through
the recovered cached-pan branch on the 0.4 m, exactly as CorBor – 1/3 reuse 54876.
- `data/hubble/umi-cached-provenance.json`: base 36773 (record 12119, snapshot cbe1f9aa…), the same recovered addresses and cache
  constants as route B, and the recorded integers: rect (242, 208)–(554, 520), unrounded pan (242.094, 208.347), slit query
  (398, 364), selection radius 9, distance 0.359 px, slit level 97, fraction 0.235225.
- 36805 (record 12127) is in the verified 36773 population, and that field's whole-list GLIMAGES.LST check has no position match.
- `data/hubble/umi-independent-vectors.json`: an independent Python control (static CLEA_GLX.DAT read) of projection, offset,
  unrounded pan, rectangle, query and selection distance; equal to the TypeScript values bit for bit.
- Workbook V 15.4 (Hubble Data.xls · Sheet1!C4) in `data/hubble/umi-distance-references.json`.
- Adaptations: cached view of the verified UM-I – 2 field on the 0.4 m only (not a fresh UM-I – 3 field); Number arithmetic and the
  nearest-centre raster are the declared browser policies.

## Session v29
`src/io/analysisSession.ts`: a v29 wraps an unchanged v1..28 base, outermost (a v28 Object X, v27 LSS or v26 observatory wrapper
may sit directly under it). It carries `extendedPolicy` `openvireo-hubble-extended-targets-v29`, the binary hash and one bank per
(telescope, target) key of the extended table (`observing.extendedGalaxies`, key `telescope:id`). Only inside a v29 may the base
archive hold more than 12 acquisitions (web bound 16, `EXTENDED_MAX_ACQUISITION_ARCHIVE`). Acquisitions, banks or context of
extended targets in any other version are rejected. All replay inputs (base archive and slots, v24/v25/v29 banks) are counted
against the one 24 000-event budget before replay.

## M2 — QSO merge
See docs/FIELD-ENGINE.md (stage 3). The engine targets below use `qso: 'merge'`; E02 LSS keeps `'gate'`.

## M3/M4 — Coma – 1 (NGC 4874) and Coma – 2 (NGC 4889)
- Field: a fresh general-field-engine field at the exact catalogue centre, from the derived pack `data/hubble/engine-coma.json`
  (both pointings; N2230 only). Every read is byte-equal to, or the 8-byte position prefix of, a read already published in
  `data/lss/lss-field-03/04.json` (test), so no new GSC bytes are published.
- QSO 1443 (CSO 786, V 17.4) is the only QSO in both areas; it has no merge winner (nothing within 2′ and 1 mag) and is inserted
  in RA order (positions 169 and 152), as the independent Python witness gives; it lies outside the 312² crop.
- `data/hubble/engine-targets.json` records, per telescope, the policy, crop SHA-256, slit level and fraction, star/galaxy counts,
  source file and QSO operations; the loader (`io/hubbleEngineTargets.ts`) re-derives them, checks the crop digest and only then
  registers the definitions. Telescope availability follows the existing mean bound: 0.4 m and 4 m available, KPNO 0.9 m
  `mean-bound` (max Poisson mean 17.8 and 29.1 against the bound 12). This differs from the plan's guess ("likely 4 m only").
- NGC 4889 own spectrum: the GLXYSP lookup 0x55eb64 removes a parenthesised suffix and spaces from the name and takes the first
  GLXYSP.LST line that contains it (Pos 0x40640c) → `NGC4889.SP` (27616 bytes, SHA-256 d48f7964…1e39). The matched branch of
  0x55e55c uses it with wavelength factor 1 (no catalogue shift). NGC 4874 has no line and keeps GLXYTMPL.SP. The analyzer's
  provenance text names the own spectrum.
- Workbook V: 12.9 (Sheet1!C5), 12.5 (Sheet1!C6).
- Adaptations: fresh field at the exact catalogue centre (not the rounded HTL coordinates), no cached pan from these fields;
  field preparation is asynchronous (a few seconds; a load or identity failure is an explicit, retryable notice).

## M5 — Boötes – 1/2 (51976, 51975)
- Pack `data/hubble/engine-bootes.json` (both centres, N3000). Against the published LSS reads it
  adds exactly the whole records N3000 512620 and 512802 (approved 2026-10-27); everything else is byte-equal or a position prefix.
- RS Boo (CLEA_VStrs.dat record 10908, RRAB, class 0) — coordinator rule "footprint outside the view". Engine option
  `variables: 'outside-view'`: the nearest merge (reference 0) hits N3000@513122 at 1.86″, but the runner N3000@513119 (14.3″) is
  pruned first, so the unrepaired saved index resolves to a third record, N3000@513131 — the record the unrecovered class-0 update
  would act on. All three positions' 99×99 footprints miss the 312² crop (margins recorded in the test), no galaxy or QSO is within
  2′ + 0.006° of them (the reach of the 0x59a2e0 runner pruning, about 2.36′; review 2 finding 10), the runner is removed as
  natively, and the winner and the resolved record are not painted. The native update (0x59864d..0x59869b) is a recovered
  overwrite of the resolved record's name, magnitude (+0x29 from the variable's +0x27), variable pointer (+0x5b) and flags
  (+0x39..+0x3c = 1), position kept; the class-0 light curve that follows is not modelled. The crop is therefore independent of
  both. Real data: QSO 1656 is 14.2–19.3′ from RS Boo, 513122 and 513131, and no CLEA_GLX galaxy is near them. The rule is used
  for Boo – 1/2 only (Object X uses the recovered zero-period dispatch instead, docs/OBJECT-X-SPECTRA.md).
- Adaptation (acknowledged by the coordinator, 2026-10-27): neighbour 14299+3148 (zero-axis, morphology 4) has a minor axis that rounds to
  0 px (browser stamp bound). Under the same rule, a galaxy outside the stamp bound whose largest footprint misses the crop is
  recorded and not painted; otherwise `stamp-bound` stays.
- QSO 1656 (HS 1431+3144, V 17.3) is an ordered insert (position 65) and lies inside both crops: it is painted as a type-3 point.
- Independent Python witness `data/hubble/bootes-witnesses.json` (winner, resolved record, runner, QSO operation, final star order,
  galaxy order) is reproduced exactly.
- Blocker: at z ≈ 0.13 the GLXYTMPL.SP fallback shifted by 1+z starts above 4000 Å (`spectrum-range`). The recovered blue
  continuation (galaxyContinuum.ts, 0x55e97c) draws one uniform per out-of-range channel; how those draws are ordered against the
  exposure's own random stream at Go (0x50f484) is not recovered, so no acquisition is offered (`spectrum-continuation`). Both
  Boötes V references (catalogue 17.9/18.5, workbook 18.5/17.6) will be shown once the target is enabled.

### Start-time continuation (coordinator condition, 2026-10-27)
- Writers of +0x312b (static): reset 0x50e2a0 and Go 0x50f5e5 zero it; the timer 0x50f98d adds each integrated interval. Go
  0x50f4f4..0x50f5c9 re-prepares the 600 channel means from the current global random state when [+0x416]==0 and +0x312b==0,
  i.e. when nothing was integrated since the previous Go or reset, then starts the timer (0x510ed0).
- Web: `JournalSourcePreparer` (exposureJournal.ts). A start with no positive tick since the previous start or reset calls it
  with the exposure's seed; its means, seed and uniform draws replace the current ones. It is attached only where draws can
  occur (the galaxy continuation, fieldEngine option `continuation: 'start-time'`), so every existing exposure is unchanged:
  the M0 fingerprints and all v1–v28 session tests pass unmodified.
- Availability uses the deterministic upper bound of the continuation (every uniform → 1) against the existing mean bound:
  both Boötes targets are faint (max Poisson mean 0.07/0.65/18.7 and 0.02/0.14/3.5 on the 0.4/0.9/4 m) and available everywhere.
  The recorded crop and slit level are image-only and independent of the draws.
- V references: workbook 18.5 / 17.6 (Sheet1!C7/C8) is the reference row; the catalogue values 17.9 / 18.5 (CLEA_GLX.DAT) are
  shown beside it on the exposure page; neither is chosen for the student.
