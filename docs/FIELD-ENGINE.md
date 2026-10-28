# General field engine (audit item 2.1)

`src/core/fieldEngine.ts` builds a fresh field for any pointing that a field pack (`src/core/fieldPack.ts`) certifies, on telescope record 0, 1 or 2. It is pure TypeScript with no React or rendering code.

## Stages (recovered addresses in CLEA_VEO.exe 781bc970…c54c)
1. Area: pointing ± 0.375° in Dec and ± 0.375/(15·cos Dec) h in RA, limiting magnitude 20.
2. Regions 0x5977e0/0x5978c0 (strict overlap), band order 0x59ae16, per-band seek and scan 0x59af80..0x59b1f7, admission 0x599e08.
3. QSO stage, option `qso: 'gate' | 'merge'` (Front F M2; default `'gate'`, so E02 LSS is byte-identical, frozen in `hubbleExistingTargets.test.ts`):
   - `'gate'`: any QSO inside the area is the typed `qso-merge` reason (unchanged).
   - `'merge'` (`qsoMerge.ts`): the caller passes the bundled, hash-checked `CLEA_QSO.DAT` (`io/bundledQsoCatalog.ts`); the engine checks it against the pack's own QSO list for its coverage. Loader 0x5987e4 scans the 52-byte records from record 0 with the position predicate 0x59677c (inclusive bounds, ordered-scan stop past the maximum RA, wrap branch at RA 12 h, no magnitude test) and builds type-3 objects in read order. Merge 0x597f90 then takes each QSO: nearest record within 2′ and 1 mag of its V (0x59a2e0, runner pruning included); a winner strictly inside 30″ is overwritten by the QSO; otherwise the cursor walks from the saved winner index (or the head when there is no winner) forward while RA ≤ the QSO's and backward while RA > it, and the QSO is inserted after the cursor (so a QSO west of the head goes after the head). It runs after the variable stage and before the galaxies; the galaxy cleanup 0x5980cc then also takes its type-3 branches (QSO within 30″ and 1 mag deletes the galaxy, which leaves the list cursor on its predecessor; otherwise both are kept). A slit selection of a QSO record is the typed `qso-selected` reason. An empty star list or a null GetAt (native null dereferences) and distances within the declared precision of the 30″ boundary are `merge-boundary`.
   - Evidence: `data/hubble/qso-merge-witnesses.json`, an independent Python model (explicit linked list with the recovered helper semantics 0x492574/0x4925dc/0x492688) of every unique LSS pointing and the Coma/Boötes centres; `qsoMerge.test.ts` reproduces all 169 modelled LSS pointings and both Coma centres (final star order, galaxy order, QSO operations). Pointings with a CLEA_VStrs.dat record in the area are not modelled there. In the real data every QSO is an ordered insert; replacement and galaxy deletion are covered by synthetic tests only.
   - Photographic association stays unported: any photograph inside the area is a typed `unavailable` reason.
4. Variables: none, or exactly one class-3 record through the false-merge branch (`variableMerge.ts`). Anything else is `variable-merge`.
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

## Typed unavailable reasons
outside-pack, qso-merge (`'gate'` only), qso-selected (`'merge'` only), photographic-image, variable-merge, axis-fallback, merge-boundary, stamp-bound (the browser raster bound: major axis ≤ 100 px, minor axis ≥ 1 px), no-galaxy-selected, star-selected, slit-empty, spectrum-range, mean-bound (the existing per-telescope bound) and spectrum-mapping (LSS only).

## Numerical policy
Arithmetic uses Number with nearest-even rounding; x87 equivalence is not claimed. The one exception is Frac(1000·RA): it is exact in the Extended significand, so it is computed exactly and rounded once.
