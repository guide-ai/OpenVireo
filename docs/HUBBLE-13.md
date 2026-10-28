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
| 6 | 51976 Boo – 1 | engine (M5) | — | variable-qso-merge (pending) |
| 7 | 51975 Boo – 2 | engine (M5) | — | variable-qso-merge (pending) |

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
