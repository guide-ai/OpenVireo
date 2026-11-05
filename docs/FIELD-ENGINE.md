# General field engine (audit item 2.1)

`src/core/fieldEngine.ts` builds a fresh field for any pointing that a field pack (`src/core/fieldPack.ts`) certifies, on telescope record 0, 1 or 2. It is pure TypeScript with no React or rendering code.

## Stages (recovered addresses in CLEA_VEO.exe 781bc970…c54c)
1. Area: pointing ± 0.375° in Dec and ± 0.375/(15·cos Dec) h in RA, limiting magnitude 20.
2. Regions 0x5977e0/0x5978c0 (strict overlap), band order 0x59ae16, per-band seek and scan 0x59af80..0x59b1f7, admission 0x599e08.
3. QSO stage, option `qso: 'gate' | 'merge'` (Front F M2; default `'gate'`). E02 LSS passes `'merge'` since Front L2 (2026-10-29; the 105 changed entries are listed in `data/hubble/existing-target-fingerprints.json` `updates`, frozen in `hubbleExistingTargets.test.ts`):
   - `'gate'`: any QSO inside the area is the typed `qso-merge` reason (unchanged).
   - `'merge'` (`qsoMerge.ts`): the caller passes the bundled, hash-checked `CLEA_QSO.DAT` (`io/bundledQsoCatalog.ts`); the engine checks it against the pack's own QSO list for its coverage. Loader 0x5987e4 scans the 52-byte records from record 0 with the position predicate 0x59677c (inclusive bounds, ordered-scan stop past the maximum RA, wrap branch at RA 12 h, no magnitude test) and builds type-3 objects in read order. Merge 0x597f90 then takes each QSO: nearest record within 2′ and 1 mag of its V (0x59a2e0, runner pruning included); a winner strictly inside 30″ is overwritten by the QSO; otherwise the cursor walks from the saved winner index (or the head when there is no winner) forward while RA ≤ the QSO's and backward while RA > it, and the QSO is inserted after the cursor (so a QSO west of the head goes after the head). It runs after the variable stage and before the galaxies; the galaxy cleanup 0x5980cc then also takes its type-3 branches (QSO within 30″ and 1 mag deletes the galaxy, which leaves the list cursor on its predecessor; otherwise both are kept). A slit selection of a QSO record is the typed `qso-selected` reason. A nil GetAt (the saved winner index past the end after the runner deletion) is VIREO's access violation, `merge-access-violation` (Front AXISMERGE, below); distances within the declared precision of the 2′, 30″ or 0.006° comparisons are `merge-boundary`. The merge never meets an empty star list: the assembler stops before it (`empty-field`, below).
   - Evidence: `data/hubble/qso-merge-witnesses.json`, an independent Python model (explicit linked list with the recovered helper semantics 0x492574/0x4925dc/0x492688) of every unique LSS pointing and the Coma/Boötes centres; `qsoMerge.test.ts` reproduces all 169 modelled LSS pointings and both Coma centres (final star order, galaxy order, QSO operations). Pointings with a CLEA_VStrs.dat record in the area are not modelled there. In the real data every QSO is an ordered insert; replacement and galaxy deletion are covered by synthetic tests only.
   - Uncertainty: the loader's 95-byte QSO object (stack, ebp−0x210) is never cleared; +0x3e..+0x42 and +0x47..+0x5e are residue, copied whole by the replace branch (0x598026..0x598037), and native code reads +0x3e (e.g. 0x596858). Only the fields the merge, cleanup, paint and selection read are modelled.
   - The engine trusts the caller's `qsoCatalog.sha256`: hashing is asynchronous, so the io adapter (`io/bundledQsoCatalog.ts`) checks size and SHA-256 before the bytes reach the engine (tested); the engine then cross-checks the bytes against the pack's own QSO positions.
   - Photographic association: by default any photograph inside the area is a typed `unavailable` reason. With the `photographs`
     option (Object X) the association 0x5990a3, rescale 0x597290 and draw 0x597470 are ported (docs/OBJECT-X-SPECTRA.md).
     Bundled photographs (`core/approvedPhotographs.ts`): the Object X four (2026-10-28), the LSS five (Front F3, 2026-10-30) and
     since Front F4 (user approval of 2026-11-02; research file analysis/photos-2026-11-02/glimages-remaining.txt, SHA-256
     e31489b4…b81a) the 166 remaining files GLIMAGES.LST names and the zip contains, 175 in all.
     Callers fetch only the photographs a pack names (`photographsInPack`, `io/photographBitmaps.ts`), never the whole list.
     GLIMAGES.LST also names NGC205, NGC404, NGC750, NGC751, NGC4215, NGC4449 and NGC7331.BMP, absent from the zip; their rows
     (and NGC253.BMP's) have empty integer columns and the original parser drops them, so no field associates them (recovered
     missing-file behaviour). One bundled photograph is not drawn [W] (`UNDRAWN_PHOTOGRAPHS`; its fields keep
     `photographic-image`): M108.BMP has pixel indices beyond its 122-entry colour table, which the web decoder refuses, and
     what VIREO's bitmap loader paints for them is not recovered.
     **Listed size [I] (F4 review 1 M1).** A photograph is drawn at the bitmap's own size, its listed centre on the projected
     galaxy. The parser stores the listed width/height at record +0x7f/+0x81 (0x5970e7/0x597125), but no recovered routine reads
     them: the rescale 0x597290 loops over the bitmap's GetWidth/GetHeight, and the draw 0x597470 reads only the centre
     (+0x83/+0x85) before TCanvas.Draw 0x42c868 (analysis/hubble-acquisition/dossiers/galaxy-bitmap-draw.asm); a search of
     the whole disassembly finds no other word read of +0x7f/+0x81 (0x55a0a3 formats a ten-byte real of another structure). Before
     this, a web guard refused a size mismatch, which left NGC4643.BMP (142 × 130, listed 112 × 130) and M83.BMP (390 × 388,
     listed 152 × 50) undrawn; M83's listed centre (196, 200) lies inside its bitmap but outside the listed size, so the list's
     size is a data error. Both are drawn now.
     Measured at the 165 kept rows of the new files on the three telescopes (assembled tiles,
     analysis/front-f4/new-photograph-fields.tsv and review1-m1-fields.tsv): 477 of 495 evaluations change from
     `photographic-image` to a drawn field, 6 (M87, NGC 6181) now stop at `variable-time-required` (they need the observatory
     clock), 6 (NGC 1302, NGC 4691: no galaxy takes the photograph) were already drawn, and 6 (M108/NGC 3556) stay
     `photographic-image`.
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
   - Geometry 0x5943d4 and magnitude 0x55ea94 substitute 0.5 for a zero major axis; 0x55ea94 takes ratio × major for a zero minor.
   - These rules cover every one of the 24069 CLEA_GLX.DAT records (Front AXISMERGE, `galaxyCatalogAxes.test.ts`): 13653 have both
     axes, 4455 neither and 5961 no minor (none has only a zero major); every morphology branch is taken. The smallest ratio is
     Frac(1000 × 11.939) = 5.684341886080802e-14 (11538+2539, record 12359), positive only because it is computed exactly. The former
     field reason `axis-fallback` stood for no record and is gone; a record the rules refuse is an evidence error.

## Merge faults and the empty field (Front AXISMERGE)

Static reading of 0x597ac8, 0x597f90, 0x5980cc, 0x59a2e0, 0x59a49c and the list helpers (analysis/front-axismerge/RECOVERY.md,
excerpts.asm). Nothing was executed.
- **Nil GetAt [D].** The nearest search 0x59a2e0 saves the winner's list index and may then delete the runner (0x59a46a..0x59a478)
  without repairing it. When the winner was the last record, the saved index equals the new count and GetAt 0x492688 returns nil
  (index > Count − 1, 0x49268e). The cleanup then reads `[nil+0x3d]` at 0x59814e (only when best × 3600 < 30); the QSO merge
  writes through nil in its replace copy at 0x598033 (< 30″) or reads `[nil+0x19]` in its RA walk at 0x598066 (≥ 30″). The
  frames up to the render 0x53a40c are try/finally only, so the field load is abandoned [D for the frames; I that the VCL handler
  shows "Access violation at address 0059814E in module 'CLEA_VEO.exe'. Read of address 0000003D"]. The web types the field
  `merge-access-violation` and records `population.mergeFault` (stage, object, address, access, saved index, list length).
- **Measured:** no exercise pointing (HTL rows of Hubble, Object X, Pleiades, Pulsars and the nine LSS fields, the Hubble engine
  targets, the Multi-Spec bases) is affected. Over all 24069 galaxy and 2269 QSO positions, 9 galaxy pointings meet the cleanup
  fault (`src/io/fieldMergeFault.test.ts`), and 14 of 164838 pointings of a whole-sky 0.5° grid; no QSO-merge fault, no
  precision boundary and no empty GSC list occurs (analysis/front-axismerge/axismerge-measure.tsv, SHA-256 9cdcf966…256e).
- **Precision band [U].** 0x59a49c computes the distance in x87 Extended with FCOS (0x4036ac) and FSQRT, and the comparisons
  (2′ initial, 0.006° runner gap, best × 3600 < 30) are Extended. FCOS's last bits are implementation-defined, so a distance
  within the declared Number guard of a limit is not decided; it stays `merge-boundary`. None was met in the measurement.
- **Empty field [D].** After the variable stage the assembler tests the star list (0x597c8a). If it is empty it shows
  "No Stars Found in Field!" / "Possible Error in Field Parameters: MinRA … LimitMag …" (MB_ICONSTOP) and jumps to 0x597ea3:
  no QSO load, no QSO merge, no galaxy load, no cleanup; 0x53be70 then skips 0x53c500/0x53caec/0x53cb40. The engine returns that
  empty population with the typed `empty-field` (not population-blocking) [W: a reason instead of the box], and drops the
  `qso-merge` and `photographic-image` gates, whose stages VIREO then never runs. No instrument field measured is empty; the
  finder can be (a Finder Mag Limit below every star, no variable in the box), and photometer fields often are (2705 of 24069
  galaxy positions; `photometer-empty`, docs/PHOTOMETER-FIELD.md; M31's core was `photometer-galaxy` before).

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

## NGC 224 (Front C7)
VIREO's telescope painter sends any galaxy whose name contains `NGC 224` (Pos at 0x53b4fc; only CLEA_GLX.DAT record 897) to 0x53b848, which paints nothing and only shows MessageBox "Image Too Large!" / "M31 Image Too Large to Load! Sorry about that. (We're working on it.)" (0x53b8ec/0x53b938); the loop then goes on at 0x53b62f, skipping the stamp, the photograph and the overlay gate store 0x53b628. The engine does the same: M31 stays in the population (catalogue, slit lookup) and is not painted, and the field result carries `m31Notice`, which the sky view and the field spectrometer show as a notice [W: not a modal box]. A slit on M31 reads the 0x53e338 level of what else is painted there; at its centre that is 0, so the spectrometer gives the sky reading (0x50f338 → 0x50db1a). [I] Where other paint lies under the slit (level above 0, for example 0.6916107 h, +41.37777°: level 82), and for a Multi-Spec fibre (0x527b38, no throughput), M31 follows the generic galaxy path like any galaxy without its own spectrum (GLXYTMPL.SP at V 4.3): those paths are driven by the catalogue alone, and VIREO has no other M31 test (one `NGC 224` string in the executable). [I] "Only record 897" rests on the web's name composition; GLIMAGES.LST and GLXYSP.LST hold no `NGC 224`. The box appears in VIREO once per telescope field reload (0x53a40c → 0x53b390), never on a repaint, a camera exposure or in the finder (0x53b058 paints M31 normally); the web's notice stays while the field is shown [W]. The photometer is unchanged: it builds its own population and still types a selected galaxy `photometer-galaxy` (in VIREO's Object mode it measures M31 from the catalogue; its galaxy gate 0x50066d..0x5006b3 gives 0 below level 80 in Sky mode only).

## Typed unavailable reasons
outside-pack, variable-time-required, variable-spectrum-dangling, variable-spectrum-indeterminate, variable-colour-residue, variable-model-fault (Front T), qso-merge (`'gate'` only), qso-selected (`'merge'` only), photographic-image, variable-merge, merge-boundary, merge-access-violation, empty-field (Front AXISMERGE), no-galaxy-selected, star-selected, slit-empty, spectrum-range, mean-bound (poissonDraw's 10⁶ per-draw admission on every record since Front L4; it was 12 on the 0.4/0.9 m) and spectrum-mapping (LSS only).

Front L4 (2026-10-31): the telescope stamp has no size bound (0x5943d4, 0x59456c have none): every galaxy is painted in place, clipped to the 936² cache, and a galaxy whose minor axis rounds to 0 px composes nothing and is not painted. (L4 review L1) That is the code: VIREO's draw also allocates two (2a+1)² bitmaps per galaxy (0x5945b2, 0x594643), about 4.8×10⁸ px each for the LMC (and the SMC is of the same order), which Win32 would very likely fail to allocate [I]; the web's acquiring of fields that hold them is therefore [W]/[I], not a recovered VIREO outcome. The former `stamp-bound` reason (major ≤ 100 px, minor ≥ 1 px) is gone. Measurement and plan: analysis/front-plans/front-l4.md; rows: docs/LSS-SURVEY.md "Mean bound and stamp cap".

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
  photograph matcher; its records hold B−V/U−B 30.0 (0x59bca6/0x59bcad) and code 0 (0x59bcb6). They are marked `fsc`, so Catalog
  Object shows their colours blank, as VIREO does (review 1 M2).
- **Paint 0x53b058:** 936² over 7.5°; galaxies in list order with stamp set 1 at stored − +0x6f8; stars at cached level (bank
  offset 1) − +0x6f4, where +0x6f4 is the telescope record's +0x38 (finderFactorMag −6/−5/−4). No NGC 224 routine and no
  photograph. Every galaxy with a non-zero minor axis is drawn, large ones included (VIREO's 0x59456c has no size bound; the web
  bound for the finder is 1200 px, above the largest V ≤ 12 galaxy, the LMC at about 1099 px, and the finder paints in place,
  clipped to the cache, so such a stamp costs only its 1-byte profile; G5 review 1 M1 and closure N1). Only the four V ≤ 12
  galaxies whose minor axis rounds to 0 px (A0341-1431, A0839-2008, A0956-3000, A1832-3759) are listed in
  `unpaintedGalaxies` [I: it composes nothing]. A TRUE-dispatch variable whose values are unavailable types the field with its
  reason when its stamp reaches the 936² cache, as the telescope view does for its crop (review 1 M3).
- The pack decoder's variable bound is now 4,000 entries: a finder field across 0 h covers the whole RA ring of a 7.5° band,
  which holds up to 3,483 CLEA_VStrs.dat records (a web bound, not a VIREO limit).

## Numerical policy
Arithmetic uses Number with nearest-even rounding; x87 equivalence is not claimed. The one exception is Frac(1000·RA): it is exact in the Extended significand, so it is computed exactly and rounded once.
