# General field engine (audit item 2.1)

`src/core/fieldEngine.ts` builds a fresh field for any pointing that a field pack (`src/core/fieldPack.ts`) certifies, on telescope record 0, 1 or 2. It is pure TypeScript with no React or rendering code.

## Stages (recovered addresses in CLEA_VEO.exe 781bc970…c54c)
1. Area: pointing ± 0.375° in Dec and ± 0.375/(15·cos Dec) h in RA, limiting magnitude 20.
2. Regions 0x5977e0/0x5978c0 (strict overlap), band order 0x59ae16, per-band seek and scan 0x59af80..0x59b1f7, admission 0x599e08.
3. QSO stage, option `qso: 'gate' | 'merge'` (Front F M2; default `'gate'`). E02 LSS passes `'merge'` since Front L2 (2026-10-29; the 105 changed entries are listed in `data/hubble/existing-target-fingerprints.json` `updates`, frozen in `hubbleExistingTargets.test.ts`):
   - `'gate'`: any QSO inside the area is the typed `qso-merge` reason (unchanged).
   - `'merge'` (`qsoMerge.ts`): the caller passes the bundled, hash-checked `CLEA_QSO.DAT` (`io/bundledQsoCatalog.ts`); the engine checks it against the pack's own QSO list for its coverage. Loader 0x5987e4 scans the 52-byte records from record 0 with the position predicate 0x59677c (inclusive bounds, ordered-scan stop past the maximum RA, wrap branch at RA 12 h, no magnitude test) and builds type-3 objects in read order. Merge 0x597f90 then takes each QSO: nearest record within 2′ and 1 mag of its V (0x59a2e0, runner pruning included); a winner strictly inside 30″ is overwritten by the QSO; otherwise the cursor walks from the saved winner index (or the head when there is no winner) forward while RA ≤ the QSO's and backward while RA > it, and the QSO is inserted after the cursor (so a QSO west of the head goes after the head). It runs after the variable stage and before the galaxies; the galaxy cleanup 0x5980cc then also takes its type-3 branches (QSO within 30″ and 1 mag deletes the galaxy, which leaves the list cursor on its predecessor; otherwise both are kept). A slit selection of a QSO record is the typed `qso-selected` reason. An empty star list or a null GetAt (native null dereferences) and distances within the declared precision of the 30″ boundary are `merge-boundary`.
   - Evidence: `data/hubble/qso-merge-witnesses.json`, an independent Python model (explicit linked list with the recovered helper semantics 0x492574/0x4925dc/0x492688) of every unique LSS pointing and the Coma/Boötes centres; `qsoMerge.test.ts` reproduces all 169 modelled LSS pointings and both Coma centres (final star order, galaxy order, QSO operations). Pointings with a CLEA_VStrs.dat record in the area are not modelled there. In the real data every QSO is an ordered insert; replacement and galaxy deletion are covered by synthetic tests only.
   - Uncertainty: the loader's 95-byte QSO object (stack, ebp−0x210) is never cleared; +0x3e..+0x42 and +0x47..+0x5e are residue, copied whole by the replace branch (0x598026..0x598037), and native code reads +0x3e (e.g. 0x596858). Only the fields the merge, cleanup, paint and selection read are modelled.
   - The engine trusts the caller's `qsoCatalog.sha256`: hashing is asynchronous, so the io adapter (`io/bundledQsoCatalog.ts`) checks size and SHA-256 before the bytes reach the engine (tested); the engine then cross-checks the bytes against the pack's own QSO positions.
   - Photographic association: by default any photograph inside the area is a typed `unavailable` reason. With the `photographs`
     option (Object X) the association 0x5990a3, rescale 0x597290 and draw 0x597470 are ported (docs/OBJECT-X-SPECTRA.md).
   - Variables (default `variableDispatch: 'recovered'`, coordinator decision of 2026-10-28): every variable whose dispatch
     0x51ec48 returns false without side effects (zero period, zero word unless class 1, or class 3) takes the HI Peg
     false-merge branch, one after another in the variable stage's order (kept variables are inserted with 0x492728 under comparator 0x4bc950: RA, then Dec); a TRUE dispatch (classes 0/1/2, period ≠ 0, word ≠ 0 or class 1;
     Front T, `variableDispatch.ts`) modifies the hit star at the saved index or inserts a star after the RA cursor walk, with
     V/colours/spectral code from the class model at `options.variableTime` (the observatory-clock JD frozen at field build;
     host Now + offset natively). Without a JD a TRUE star gates the field (`variable-time-required`) only if its 99×99 stamp
     reaches the crop or a galaxy/QSO is within the merge guard; otherwise it is not painted (pixel-identical). The
     indeterminate original branches are typed (`variable-spectrum-dangling`, `variable-spectrum-indeterminate` — also a range spectrum
     that leaves the letter table or overflows the subclass at some magnitude, e.g. T Mon and SU Cyg —,
     `variable-colour-residue`, `variable-model-fault`); a merge boundary keeps `variable-merge` (Boo – 1/2
     use the outside-view rule). `'class-3'` keeps the earlier one-variable contract for comparison.
4. Variables: none, or records whose dispatch 0x51ec48 returns false without side effects, merged one after another in the variable stage's order (kept variables are inserted with 0x492728 under comparator 0x4bc950: RA, then Dec) through the false-merge branch (`variableMerge.ts`). TRUE dispatches: hit/miss with the class model (Front T; see above). Indeterminate cases are typed; a merge boundary is `variable-merge` (Boo – 1/2: outside-view).
5. Galaxies:
   - Whole-file CLEA_GLX.DAT admission in source order. The GLX loader (call at 0x599128) inserts each galaxy with the cursor-relative linked-list insert 0x492728, using the strict RA/Dec-greater comparator 0x5969e0.
   - The cursor is the last inserted galaxy. A key greater than the cursor walks forward and goes after equal keys. Otherwise it walks backward and goes before equal keys, except that reaching an equal head inserts right after the head.
   - Tie order therefore depends on the read sequence. Ties preceded by a smaller galaxy come out in reverse read order (54891/54890, 15384+2831). Head-of-list ties differ, for example F6 IC 4395A, F7 NGC 5709, F8 14520+3025 and F9 IC 4572 (`fieldEngine.test.ts`).
   - Then cleanup 0x5980cc for each galaxy in that order.
6. Scene, 936² raster, 312² crop, slit level and fraction, and calibration, exactly as `galaxyExposure.ts` (fresh path). The slit selection uses the nearest rule 0x59a0fc, including the star-throughput tie branch.
7. Zero-axis galaxies (M3, `galaxyCatalogAxes.ts`):
   - 0x53b94c sets the axis ratio from the morphology: ≤−4 → 1; −3/−2/−1/0 → 0.9/0.8/0.7/0.6 (Extended); 1–8 or 20 → Frac(1000·RA) (0x53ba58, 0x40365c); anything else → 1.
   - Geometry 0x5943d4 and magnitude 0x55ea94 substitute 0.5 for a zero major axis.

## Equality evidence
`fieldEngine.test.ts` reproduces 36773/36747/54876 (records 0/1/2) and NGC 7501 (record 0). Everything matches the existing builders: star and galaxy order, cleanup and variable witnesses, crop bytes (3dd36af4…), slit level and fraction, amplitudes, means and journal draws.

`lssPacks.test.ts` reproduces the independent Python witnesses for all 219 LSS pointings.

## Fields across 0 h and near the poles (Front G, G1b)

These rules come from a static reading (`analysis/front-g-gsc/RE-wrap-polar-consumers.md`; asm excerpts and hashes in
`analysis/front-g-gsc/asm/`). Nothing was executed.

- **Area** (`freshFieldArea`, telescope load 0x53be70):
  - Dec is the pointing ± 0.375°, not clamped to ±90. RA is the pointing ± 0.375/(cos Dec·15) h.
  - The minimum gets +24 h if it is below 0, and the maximum −24 h if it is above 24, each once. A field across 0 h then has
    min > max.
  - With an RA half-width of 12–24 h the folded interval no longer matches the sky (RA 3 h at Dec 89.9 gives [12.68, 17.32]).
    VIREO's result is still deterministic, so it is ported as it is.
  - A folded bound outside 0–24 h (half-width about 24 h or more, |Dec| ≳ 89.94°), or equal bounds, is the typed `polar`
    (FieldEngineError). This is a web limit [W].
    - From about 89.94° to 89.994° VIREO is still deterministic: a small negative int32 band key, or a bound above 24 h.
    - Only beyond that (|key| ≥ 2³¹) and at exactly ±90° does its result depend on the x87 cosine near π/2 and on the Int64 key.
    - This replaces the earlier rejections of |Dec| ≥ 89° and of every wrapped field.
- **Regions** (0x5978c0):
  - In wrap mode, a region starting below 12 h overlaps when area.max > region.min; any other region overlaps when
    area.min < region.max. Dec is strict.
  - This is a 12 h rule, not geometry: a region from 11.9 h to 12.5 h is not selected by an area from 12.2 h to 0.1 h.
- **Stars** (0x597ac8): two reads per band, [min, 24.0] and then [0.0, max], over the same band order. Both append to one list.
- **Variables** (0x5981a0 twice): the [min, 24] records, then the [0, max] records, in file order, then the cursor insert.
- **QSOs** (0x5987e4, predicate 0x59677c): one scan from record 0 that stops at the first record below 12 h past max. In a
  field across 0 h only the 0 h side is admitted, as long as such a record exists. CLEA_QSO.DAT is RA-ordered, and its last RA
  below 12 h (11.995417 h, pinned) decides this (`fieldQsoMatches`).
- **Galaxies** (0x598acc), in two passes, each with predicate 0x59677c, its stop flag and the magnitude test:
  1. from record 0;
  2. from the RA index entry for min.
  - The index is CLEA_GLX.NDX. Each entry h is the first record with RA ≥ h, so it is derived from the RA-ordered CLEA_GLX.DAT
    and not published.
- **Photographs** (0x596b1c): in wrap mode, RA ≥ min or RA ≤ max, inclusive (`nativePhotographInArea`).
- **Projection:** the RA difference was already wrapped (0x5949c8, `hourDifference`).
- **Budget:** the visit budget per band is 100,000 (`FIELD_SCAN_BUDGET`), enough for a whole polar band.
- **Pack limits:** the variable limit per pack is 1,000, because a field across 0 h covers its whole Dec ring (at most 549
  variables).
- **Tests:** `src/core/fieldWrap.test.ts` (rules) and `src/io/assembledFieldPack.test.ts` (tiled reads and populations at
  wrap and polar pointings).
- **Unchanged:** every published pack, fingerprint and count. For ordinary areas the code paths are the earlier ones, and the
  equality proofs still pass.

## Typed unavailable reasons
outside-pack, variable-time-required, variable-spectrum-dangling, variable-spectrum-indeterminate, variable-colour-residue, variable-model-fault (Front T), qso-merge (`'gate'` only), qso-selected (`'merge'` only), photographic-image, variable-merge, axis-fallback, merge-boundary, stamp-bound (the browser raster bound: major axis ≤ 100 px, minor axis ≥ 1 px), no-galaxy-selected, star-selected, slit-empty, spectrum-range, mean-bound (the existing per-telescope bound) and spectrum-mapping (LSS only).

When a field is assembled from the compact GSC tiles (Front G), `AssembledFieldError` adds further reasons
(docs/COMPACT-GSC-TILES.md):
- `polar`: a web limit [W].
- `band-end`: VIREO itself reads past the end of a declination band there, which raises an input/output error and leaves a
  partial star list. The web shows no field [W].
- `regions`, `budget`, `plan` and `source`.

## The finder field (Front G5)
`FieldOptions.finder` builds the finder field 0x53bae4 on the same packs (`evaluateFinderView`; docs/SKY-FIELD-VIEW.md):
- **Area:** half 3.75° (Field Creation Factor 3 × Finder Field 2.50°), limit 14 (0x53bcc1), folded as the instrument field.
- **Stars:** FSCFieldObj's reader 0x59b374 is the NewGSC reader 0x59ad98 with three differences [D, instruction diff]:
  - a record above the Finder Mag Limit (env+0x2bb8, 11.5) is skipped before admission 0x599e08;
  - B−V and U−B are stored as 30.0 and the spectral word as 0;
  - the four flag bytes are set to 1. +0x35 and +0x5b are left unwritten [U]; the web stores 0 [W].
- **Mode 0:** no QSO load or merge; galaxies at min(14, 12) = 12 with the loader 0x59b894, which is 0x598acc without the
  photograph matcher (colours 30.0, code 0).
- **Paint 0x53b058:** 936² over 7.5°; galaxies in list order with stamp set 1 at stored − +0x6f8; stars at cached level (bank
  offset 1) − +0x6f4, where +0x6f4 is the telescope record's +0x38 (finderFactorMag −6/−5/−4). No NGC 224 routine and no
  photograph. A galaxy whose minor axis rounds to 0 px is listed in `unpaintedGalaxies` [I: it composes nothing].
- The pack decoder's variable bound is now 4,000 entries: a finder field across 0 h covers the whole RA ring of a 7.5° band,
  which holds up to 3,483 CLEA_VStrs.dat records (a web bound, not a VIREO limit).

## Numerical policy
Arithmetic uses Number with nearest-even rounding; x87 equivalence is not claimed. The one exception is Frac(1000·RA): it is exact in the Extended significand, so it is computed exactly and rounded once.
