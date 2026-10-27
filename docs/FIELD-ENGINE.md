# General field engine (audit item 2.1)

`src/core/fieldEngine.ts` builds a fresh field for any pointing that a field pack (`src/core/fieldPack.ts`) certifies, on telescope record 0, 1 or 2. It is pure TypeScript with no React or rendering code.

## Stages (recovered addresses in CLEA_VEO.exe 781bc970…c54c)
1. Area: pointing ± 0.375° in Dec and ± 0.375/(15·cos Dec) h in RA, limiting magnitude 20.
2. Regions 0x5977e0/0x5978c0 (strict overlap), band order 0x59ae16, per-band seek and scan 0x59af80..0x59b1f7, admission 0x599e08.
3. QSO merge 0x597f90 and photographic association: these are not ported, so any QSO or photograph inside the area is a typed `unavailable` reason.
4. Variables: none, or exactly one class-3 record through the false-merge branch (`variableMerge.ts`). Anything else is `variable-merge`.
5. Galaxies:
   - Whole-file CLEA_GLX.DAT admission in source order, then the 0x492728 sorted insert with the strict RA/Dec-greater comparator 0x5969e0.
   - The insert goes *before* equal keys, so tied galaxies end up in reverse read order. This matches the generators and the 54891/54890 pair. The plan's "insert-after" wording disagrees.
   - Then cleanup 0x5980cc for each galaxy in that order.
6. Scene, 936² raster, 312² crop, slit level and fraction, and calibration, exactly as `galaxyExposure.ts` (fresh path). The slit selection uses the nearest rule 0x59a0fc, including the star-throughput tie branch.
7. Zero-axis galaxies (M3, `galaxyCatalogAxes.ts`):
   - 0x53b94c sets the axis ratio from the morphology: ≤−4 → 1; −3/−2/−1/0 → 0.9/0.8/0.7/0.6 (Extended); 1–8 or 20 → Frac(1000·RA) (0x53ba58, 0x40365c); anything else → 1.
   - Geometry 0x5943d4 and magnitude 0x55ea94 substitute 0.5 for a zero major axis.

## Equality evidence
`fieldEngine.test.ts` reproduces 36773/36747/54876 (records 0/1/2) and NGC 7501 (record 0). Everything matches the existing builders: star and galaxy order, cleanup and variable witnesses, crop bytes (3dd36af4…), slit level and fraction, amplitudes, means and journal draws.

`lssPacks.test.ts` reproduces the independent Python witnesses for all 219 LSS pointings.

## Typed unavailable reasons
outside-pack, qso-merge, photographic-image, variable-merge, axis-fallback, merge-boundary, stamp-bound (the browser raster bound: major axis ≤ 100 px, minor axis ≥ 1 px), no-galaxy-selected, star-selected, slit-empty, spectrum-range, mean-bound (the existing per-telescope bound) and spectrum-mapping (LSS only).

## Numerical policy
Arithmetic uses Number with nearest-even rounding; x87 equivalence is not claimed. The one exception is Frac(1000·RA): it is exact in the Extended significand, so it is computed exactly and rounded once.
