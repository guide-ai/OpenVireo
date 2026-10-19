# Recovery contracts and boundaries

## Immutable target and analysis

VIREO `CLEA_VEO.exe`: PE32 i386, image base `0x400000`, SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Original source bytes were never changed or executed. REA 6.5.0 and Ghidra 12.1.4 perform static inspection in disposable analysis databases. Pseudocode is an analysis product, not recovered source code. The original Delphi compiler/ABI and x87 returns require assembly checks even when a procedure appears in the inventory.

Research root: `/home/dobleuber/Documents/Codex/2026-10-17/task-2`. Original downloads/data/manuals: `/tmp/clea-static-research`. Structured REA responses retain provider/profile/evidence identifiers; the project does not include executables, installers or tool runtimes.

## Observatory structure

Complete binary DFM trees were decoded for `TEnvironment1`, `TObsrvtry`, `THotListForm1`, `TSkyCoordsDlg`, `TOptionsDlg` and `TScopeDataDlg`. Classic VMT self/name/method pointers and bounded published-method records identify handlers. The new structural map records 76 methods for Environment, 72 for Obsrvtry, 17 for HotList, 3 for SkyCoords, 16 for Options and 5 for ScopeData. These counts are not a coverage percentage or proof that every handler was analyzed.

`TEnvironment1` contains dome and telescope entry. `TObsrvtry` contains sky display, tracking, directional motion, finder/telescope view and instrument access. `TSpectrometer` acquires spectra; `TSpectrumEngine` measures them later. The original VIREO manual pages 5–7 describes that sequence, north up/east left, a 2.5° finder and 15′ telescope field.

Method/DFM evidence: `analysis/observatory/` in the research root. REA dossiers: `analysis/rea-ghidra-observatory-results/`; extracted readable assembly/pseudocode: `analysis/observatory/dossiers/`. Seeds are evidence-backed entry metadata; their presence does not repair every body, type or ABI.

## Sky projection

`0x5949c8` initializes center RA/Dec, half-width/height and scales. Assembly at `0x594a44` calculates x; `0x594b04` calculates y. Caller `0x53ca7c` supplies the object's RA/Dec. The cosine uses **object declination**, not center declination. The 80-bit radians-per-degree constant at `0x594aec` decodes to π/180; the called routine at 0x4036ac contains FCOS at 0x4036b2; nearby float constants are −12, 24 and +12 hours.

```text
x = width/2 + wrap12(centerRA - objectRA) * cos(objectDec * π/180) * width * 15 / fieldDegrees
y = height/2 + (centerDec - objectDec) * height / fieldDegrees
```

wrap12 adds 24 for a difference below −12 and subtracts 24 above +12; exact ±12 ties are preserved. No gnomonic replacement model was introduced. The browser uses Number and subpixel SVG coordinates, not original Extended arithmetic or original integer rounding/PSF. Point glyph radius/appearance is a new presentation policy; it is not recovered instrument photometry.

`0x53e228` selects finder/telescope state and redraws; `0x53a310` displays degree/arcminute field values and enables instrument control only in the narrow field. `0x591e24` reads hot-list RA at +0x19 and Dec at +0x23. `0x5399e8` performs programmed-slew confirmation, horizon checks and timing; that complete behavior is not ported. `0x538e4c` shows pole reflection and a 12-hour RA change. Current quarter-field movement and immediate pointing are declared browsing adaptations. Reference access additionally requires an explicit pointing action and a half-SVG-unit centering tolerance; this is a new UI rule, not a recovered slit aperture. Coordinate inputs retain locale-independent round-trip strings rather than formatted display values. No tracking/time, horizon visibility or precession equivalence is claimed.

## Original resources

`data/sky/PROVENANCE.json` contains source paths/hashes, derived hashes, subset policy and projection contract. The compact GSC reader at `0x59ad98` opens 27-byte records: signed int32 RA, Dec, source identifier; four int16 fields; a flags byte; six bytes of shortstring data. Assembly at 0x59b055–0x59b071 uses FILD int32, divides in Extended by a float32 constant (10^7 or 10^5) and stores double. There is no intermediate float32 coordinate rounding, despite casts in the pseudocode. Magnitude at 0x59b075–0x59b081 divides the int16 by 1000 then stores float32. The browser uses Number division for coordinates and Math.fround only for magnitude; Extended-to-double equivalence is still not certified.

18,841,240 source records were inspected; 2,369,926 records with packed magnitude between −3000 and 12000 form the current preview subset, partitioned into 864 RA-hour × five-degree-declination files. This is a declared delivery/coverage choice, not full original mode filtering or a cleaned catalog of stars. Catalog object classifications, duplicates, original field filters and fainter telescope limits remain pending.

`Images/Galaxies/GLIMAGES.LST` explicitly associates image filenames with RA hours/Dec degrees; `M_Galaxies.prn` supplies the unit header. The first entry for each NGC identifier is retained. `Hubble.HTL` contains 13 fixed 86-byte records: ShortString[24], Extended RA, Extended Dec, ShortString[40]. Binary coordinates are decoded offline to Number. Hot-list coordinates take priority only for added targets absent from the image list; no modern coordinate catalog is substituted.

Library spectra are matched by exact NGC identifier and SHA-256. Their original finite intensities are retained, including values above one. They are not acquired observations and cannot alone enable measurement recording. The reference curve is rescaled for display only. User imports retain the separate normalized 0–1 adapter contract.

Bitmap→PNG conversion does not resize/crop/synthesize pixels; RGB pixel bytes were compared before/after. Original `m108.bmp` has an invalid colormap index and was excluded rather than silently repaired. Archival previews have no claimed recovered angular extent or exposure simulation. `NkdEye.dat` was range-inspected but is not rendered because its original consumer schema remains unverified.

## Spectral measurement

Root `PROVENANCE.json` retains six individually sourced spectral contracts with artifact hash, address/ranges, evidence_id and original REA response path.

- `0x58499c`, especially `0x5849b9–0x5849c5`: add one to Extended z, multiply each base wavelength double and store shifted double. Browser adaptation: Number multiplication of `(1+z)*λ`.
- `0x584424`: control contribution uses signed low-32-bit integer multiplication; the browser uses Math.imul.
- `0x5844a8`: rebase the existing displacement before setting position to zero; recentering is not z=0.
- `0x5844e8`: accumulate displacement before changing fine/coarse factor. Clicking the already active browser button is a new no-op policy because it is not an original change event.
- `0x58383c`, including `0x5838b4/0x5838ba` and `0x5839fb/0x583a01`: store z as float32. Original RecordZ has additional fields/branches and event ordering not completely ported.
- Original line lists: GLXYLNS (3), BALMER (8), AGN_QSO (24); GLXYTMPL has 3351 wavelength/intensity samples from 3650 through 7000 Å.

The analyst step, local position range, CSV adapter, confirmation UI and adaptive decimal formatting are web adaptations. The original acquisition-derived step is not invented. Render every visible spectral sample so narrow absorption features are not lost through uniform subsampling. Imported errors report physical input line numbers.

## Precision and unfinished science

Number is binary64; Math.fround reduces to binary32. Neither reproduces Extended x87, its control word, intermediate rounding or legacy number formatting automatically. Validate each output/conversion separately. Original and browser numeric representations must not be conflated.

Start/timer/save dossiers exist for acquisition. Pure interpolation, PRNG/Poisson, supplied-image slit sampling and magnitude calibration are implemented as tested Number adaptations. Complete source/image synthesis, timing, metadata and end-to-end integration remain pending; the x87 tangent midpoint is an explicit precision gate. See HUBBLE-RECOVERY.md. A bounded original v=cz velocity table now derives from savedSinglez records; seeHUBBLE-VELOCITY.md. The visible velocity table does not compute distance or a Hubble fit. Separate pure [workbook/manual distance and summary recipes](HUBBLE-DISTANCE-RECIPES.md) now require explicit apparent/absolute magnitudes and supplied velocities; they are not a recovered native regression or completed exercise workflow. [Stellar profiles](STAR-PROFILES.md) and the [bounded spectrum codec](SPECTRUM-SAVE-CONTRACT.md) add tested helper contracts; the [source-plus-sky amendment](ACQUISITION-BUFFER-AMENDMENT.md) corrects the historical save label without changing acquisition arithmetic. Photometry, cameras, radio, standalone historical editions and Win16/NE workflows remain pending. The normal REA resolver rejects NE; a direct correct-loader Ghidra pilot is still required. No original execution/emulation or public release is authorized.

The reviewed catalog loader uses only intersecting RA/declination cells and an LRU cache capped at 32 cells/200,000 records. Retiling preserves the exact packed-record multiset per hour. The north polar field requests 24 small cells totaling 65,109 JSON bytes rather than all 60.9 MB. New measurement recording rejects a float32 result at or below z=−1; that post-quantization physical-domain guard is a browser policy, not asserted original RecordZ behavior.
