# CCD camera exposure (front C)

The observatory now has a working **CCD camera**. With the dome open, the telescope pointed, the telescope view selected and tracking on, choose a filter (NF, B, V, R, I), an exposure time (1 s to 60 min, a web bound) and a gain (1, 2 or 5 e⁻/ADU), then **Start exposure**. The camera counts down in 1 s steps, waits for the catalog and builds a 1024×1024 image. **Stop** cancels the exposure and the catalog request. Leaving the observatory, losing tracking or moving the telescope also stops it.

Adaptation, in one line: the original asked the USNO NOFS server for NOMAD/USNO-B1 rows; that server no longer answers, so the web reads the same catalogs from CDS/VizieR (a bundled extract or a live query that sends only RA, Dec and radius), uses a private seeded random stream per exposure, and does not offer the bitmap overlay.

Evidence: [NATIVE-CAMERA-FRONT-C-C0-01](CAMERA-EXPOSURE-PROVENANCE.json), static reading of `CLEA_VEO.exe` SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c` with objdump. Nothing was executed or emulated, and no binary bytes are in the repository. Listings, the capture script and the independent control live in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-front-c/`.

## What the original does (recovered)

| Step | Address | Port |
|---|---|---|
| Field initialize clears the source list | 0x5220f4 | fresh list per exposure |
| Select copies the region record, raises the magnitude limit to 21.5, picks NOMAD or USNO-B1 (I → mode 1) | 0x5222d4 | `vizierRouteForCamera`, `compiledCameraQueryReference` |
| Moving (kind-2) records: projected with two draws and **no bounds test**, filter offset NF/R −0.54, B +0.65, V 0, I −0.88, appended first | 0x522718 | `CameraExtraSource` kind `pair` |
| Catalog rows: two draws each (RA then Dec), inclusive bounds, kind 0, Single magnitude | 0x522454, 0x522698 | `composeCameraExposure` |
| Field objects (kind 0) after the catalog | 0x5228dc, 0x51ef38, 0x522a18 | ported at certified fields (Front R2, below) |
| Background, one draw per pixel, row-major | 0x521635 | existing `cameraBackgroundStage` |
| Source loop: NF −0.25; kind 2 takes the next record as its endpoint (extended), others are points | 0x521a6f..0x521b35 | existing point/extended stages |
| Well, gain, A/D | 0x521b3b.. | existing `finalizeCameraPlane` |

The seeing jitter is on for the CCD (compiled record byte +0x5a = 1 at 0x5a2bd8). The USNO-B1 mode labels are B2/R2/I2 (string table 0x59c5e8). `xena.harvard.edu/…/tmpsc.html` is only the **Help ▸ 2MASS Catalog** link (options +0x20cd, opened by `N2MASSCatalog1Click` 0x58ec84); it is not a data source.

**Field objects (Front R2, 2026-10-29).** Recovery: research `analysis/front-r2/A-camera-field-overlay.md` §1.
- **VIREO** [D]:
  - The pass 0x5228dc runs only when the observatory field's variable list is not empty.
  - It walks the field star list in order. Every star the TRUE variable dispatch kept (type 0 with a GCVS pointer) costs two
    draws, after the catalog rows and before the background.
  - For a star on the detector, 0x522a18 returns the tail of the camera list. That record's magnitude becomes
    Single(V − colour term 0x51ef38), using the CCD form's filter byte even for IR, so the last such star wins. The record is
    then drawn at its own position, with NF −0.25 for the CCD.
  - With an empty camera list VIREO writes the observatory field star itself.
- **This site:**
  - It runs the pass on the certified field population at the camera pointing, built at the exposure JD
    (`src/camera/cameraFieldInputs.ts`, `src/core/cameraFieldObjects.ts`, composer step 2b).
  - At other pointings it does not run, and the exposure details say so [W].
  - A variable whose brightness is not known blocks the pass, and an empty list writes nothing [W].
  - A pointing with no certified pack says "not certified"; a pack or catalog that cannot be loaded says "could not be
    checked" (review 1 L1) [W].
  - The CCD filter byte is set when a CCD exposure starts (CCD Go 0x5126c1) and kept for the page, as the form keeps it for
    the process; 0 (NF) before any CCD exposure [I] (review 1 L5).
  - **Saturated tail [W] (review 1 H1).** For a class 1 or 2 variable the colour term is 30 or 60, so VIREO writes about V − 30
    or V − 60 into the tail catalog row and draws a saturated star. That magnitude is outside the calibrated source range
    (|m| ≤ 50, peak ≤ 1e12), so this site does not draw that one star (it consumes no draws) and the exposure details say so.
    The magnitude is never clamped. Among the certified pointings only LSS Field 8 near NGC 5924 has such a variable.
  - **Catalog "no data" gate** [I]: VIREO runs the catalog rows and this pass only when the catalog's vt+4 returns true
    (0x52246a/0x52246f → 0x522553). Which web state matches vt+4 = false is not recovered; the web runs the pass whenever an
    exposure is composed, and an empty camera list writes nothing (review 1 L3).

Not recovered, and kept explicit: the writer of the region record `[0x5b5b30]` (the web uses whole-sky bounds, so selection keeps only the magnitude limit); the global random-stream prefix at Go; the overlay bitmap; the native image-to-screen mapping (the web display stretches the 1st–99.9th percentile; pixel values are unchanged).

Front R1 (2026-10-29): the colour term 0x51ef38 is recovered and ported as a pure function, `src/core/cameraColourTerm.ts` (docs/RADIO-CAMERA-R1.md). It is not wired, because the camera has no field-engine population of field variable stars; the field-object pass stays typed.

## Catalog: NOFS → CDS/VizieR

Endpoint: IVOA Simple Cone Search, `https://vizier.cds.unistra.fr/viz-bin/conesearch/<cat>/out?RA=…&DEC=…&SR=…` with `I/297` (NOMAD) or `I/284` (USNO-B1). It was chosen because NOFS `vo_cone.cgi` was itself a cone search, the request carries nothing but the cone, and VizieR answers with CORS. RA/Dec use 6 decimals and SR 2 decimals, as in the recovered query builder; SR is 1.5 × half-field (0.23° for the 0.4 m, 0.12° for the 0.9 m, 0.10° for the 4 m).

Hosts. CDS (`vizier.cds.unistra.fr`) and every official VizieR mirror are approved (CfA `vizier.cfa.harvard.edu`, 2026-10-27; all official mirrors, 2026-10-29). The code knows CDS, CfA and IDIA (`vizier.idia.ac.za`). Every bundled extract, recorded test response and live result names the host that served it (`host` in `data/camera/extracts.json` and in the provenance files, `CATHOST` in the saved FITS header, and the Source line under Exposure details). An extract is used only if its `host` is approved and equals the host of its own `https` request URL. Hosts are never mixed within one extract.

Live mode tries the hosts in `VIZIER_POLICY.liveHosts` in order: IDIA, then CDS (Front C5W, 2026-10-29: IDIA answered in about 2 s with `Access-Control-Allow-Origin: *` while CDS timed out). CfA stays out until a successful CORS response from it is seen. It moves to the next host only after a network error, a timeout or a 5xx answer; a 4xx, an oversized body or a cancel ends the attempt. When every host fails, the camera shows its "could not be reached / did not answer" message and produces no image. **The live list is CDS only for now.** On 2026-10-28 the CfA query endpoint answered 504 after 60 s, or nothing at all, so whether its responses carry `Access-Control-Allow-Origin` (needed for a browser query) could not be checked. Until a successful CfA response shows that header, CfA serves only extracts recorded offline. The fallback itself is covered by unit tests with both hosts.

`src/core/vizierNomad.ts` reads the VOTable TABLEDATA serialization (bounded size, rows and cells; typed refusals for QUERY_STATUS errors, overflow, BINARY/FITS, missing columns or band, malformed rows) and maps each row onto the recovered NOFS contract:

- RA degrees ÷ 15 → hours; proper motion ÷ 1000 then ÷ 54000 (RA) or ÷ 3600 (Dec), times the epoch offset from J2000 at the observatory JD (date bias 0);
- `pmRA` is passed through unchanged. NOMAD stores μα·cosδ; the recovered code does not divide by cosδ. Whether NOFS served the same value is not known;
- selected magnitude stored Single; 0, ≥30 or blank rejects; blank motion makes the row invalid (never zero-filled);
- NOFS cut the magnitude window on the server (`&bri=1.0&fai=21.5`); cone search has no such cut, so the reader applies it to the selected band (inclusive);
- rows go through the recovered RA-then-Dec sorted insertion, then selection with Single sentinels 25/−2;
- `MaxTuples` reached, `matches` larger than the rows, or `QUERY_STATUS=OVERFLOW` → **overflow**: no image, never a partial field;
- a usable answer needs exactly one TABLE with the required columns (an empty TABLEDATA is a valid empty field). No TABLE, a `QUERY_STATUS` other than OK, or the cone-search error signal (`INFO`/`PARAM name="Error"`) is a typed **query-status**/**table-count** refusal, never an empty "Image ready.";
- a literal `NaN` cell (the declared VOTable null) counts as blank;
- the recovered sorted insertion now runs in linear time (same result as the literal cursor walk, checked on 3,000 random tie-heavy inputs) up to the reader's 60,000-row bound, so a 10,000+ row field is ordered instead of failing. Any reader failure ends the request with a typed message; nothing is left waiting.

USNO-B1 columns (`USNO-B1.0`, `Imag`, `pmRA`, `pmDE`) are tested with an authored document and, since Front C5W, with a real I/284 response recorded from IDIA (`tests/fixtures/vizier/usnob1-56.75+24.12-r0.01.xml`).

**Bundled extracts (Front C5W, 2026-10-29).** 34 cone searches (the 17 ObjectX.HTL positions × NOMAD and USNO-B1, SR 0.25°) were recorded from IDIA and saved byte for byte in `public/camera/vizier/`. Each is named by catalog and cone centre, never by the Object X target. `data/camera/extracts.json` and `EXTRACTS-PROVENANCE.json` record query, client and server dates, serving host, CORS header, SHA-256, rows and MaxTuples (no field reached it; the densest, near the galactic centre, has 25,169 rows). 0.25° is the widest camera cone (0.228° on the 0.4 m CCD) plus about 78″ of pointing slack. The default static mode now makes an image at every Object X field without contacting any mirror; elsewhere it still shows the no-extract message.

`src/io/cameraCatalog.ts` either loads a bundled extract (only when the requested cone lies wholly inside the extract's cone; its SHA-256 is checked) or performs the live request with a 30 s timeout and abort on Stop. Nothing is cached. In static mode (the default) the page sends nothing to CDS. Whether an extract covers the pointing is known before Start: the window says so under the source choice, and Start reports it at once instead of after the countdown. A live request still carries the browser's usual Origin, User-Agent and IP address; the query itself carries only RA, Dec and SR. The 30 s timeout is independent of the exposure length.

## Composer and random stream

`src/core/cameraExposure.ts` composes recipe + catalog selection + moving pairs in the recovered order above. `src/core/cameraRandom.ts` steps the recovered `Random` recurrence (0x4035e4) from a uint32 seed chosen at Start (shown under **Exposure details**). Front X supplies moving objects through `CameraExtraSource = {raHours, decDeg, storedMag, kind:'pair', end}` obtained from the `CameraControl` prop `extraSources(jd, seconds)`, called at prepare time with the observatory JD captured at Start and the exposure length in seconds (the pair's end is the position at JD + seconds, as ComputeMovers 0x59940c uses dt = exposure; a one-argument callback still works); `storedMag` is the record magnitude before the filter offset, which the composer applies. A pair whose projected pixel position exceeds 10⁶ (far off-axis) is skipped with the typed reason `moving-pair-off-detector` after its four draws; the native overflow path is not recovered. Streaks use the recovered geometry unchanged: the Gaussian visit rectangle around the segment, clipped to the 1024² plane, and the cross pass only when the scale is below 1.25. The web visit guard for a streak is therefore plane-sized (1024² + 65,536, `CAMERA_STREAK_VISIT_LIMIT`) instead of the stage default 65,536, which refused diagonal streaks of about 0.15° and longer. For scale: at the ObjectX default time (2009-06-01 04:00 UT, ObjX_MPC.CMO.sav) 1994 CC moves 0.091°/h, Eros 0.015°/h and Pluto 0.001°/h, so within the 60-min limit the fastest E08 streak is about 0.09°; unit tests draw 0.15° and 0.5° diagonal streaks. A pair that still cannot be planned is skipped alone (`moving-pair-budget` or `moving-pair-geometry`) with no draws for its streak. Skipped pairs are returned in `exposure.skipped` (passed to `onImage`) and listed under **Exposure details**. Natively 0x522718 copies only the leading run of kind-2 records; the web list is all pairs, which come first anyway.

Sources are added in place to one owned Float32 plane (a Float32Array store rounds exactly like `Math.fround`), with the same per-visit arithmetic and draw order as the stage modules. Parsing and composing run in a Web Worker (`src/camera/cameraWorker.ts`), one per exposure; Stop terminates it. Timings on this machine (Node, authored star grids): before, 200 stars 4.0 s and 800 stars 12.8 s (each source copied the 1 M-pixel plane); after, 0 stars 0.43 s, 800 stars 0.46 s, 5,000 stars 0.96 s, 20,000 stars 2.3 s. The empty-field cost alone (1 M background draws) exceeds 200 ms, so the Worker is needed even for sparse fields. The random-draw cap is a web guard (the native loops have none), sized at 200 M draws for up to 50,000 catalog rows.

The control `scripts/exposure_control.py` is a separate stdlib Python re-implementation, line by line, of the declared policy, written by the same author as the TypeScript. It checks composition and draw order, not readings shared with the earlier stage documents. Five cases match bit for bit and are pinned in `src/core/cameraExposure.controls.json`: NF and V with the recorded catalog (with and without a moving pair), B with three recorded stars and a pair, and I with an authored USNO-B1 table that includes one off-detector row. They are synthetic recipes, not observations; the hashes reproduce on V8 only.

## Save image (FITS)

**Save image (FITS)** downloads `OpenVireo-CCD-<UTC date>-<time>-<filter>.fit`, which opens under **Saved images**. `src/core/fitsWriter.ts` keeps the recovered representation (SIMPLE T, BITPIX −32, NAXIS 2; y outside, x inside; big-endian Single words, NATIVE-FITS-SINGLE-PLANE-01). Every other card is web-authored, because the native keyword writer 0x523218 is not ported: DATE-OBS/MJD-OBS (observatory clock at Start), EXPTIME, FILTER, GAIN, TELESCOP, pointing, a TAN WCS that matches the camera projection (CRPIX 513, CDELT from the pixel step; per-star seeing jitter is not in the WCS), CATALOG/CATMODE/CATSHA/CATEXTR, CAMSEED and CAMDRAWS, and the citations as COMMENT cards. The data are zero-padded to the 2880-byte block (the captured native flush wrote no pad). Images are not stored in the investigation JSON; front X keeps recipes in session v28.

## Licence and citations

CDS asks users to cite the service and the catalogs. VizieR declares **no explicit licence** for I/297 or I/284 (its general page `https://cds.unistra.fr/vizier-org/licences_vizier.html` is linked from every response as `rights_uri`). Both catalogs are probably US-government USNO works; that is recorded as uncertain. Per the user's decision of 2026-10-27, recorded test responses and static extracts are published with:

- CDS/VizieR, doi:10.26093/cds/vizier;
- NOMAD: Zacharias N. et al. 2004, AAS 205, 48.15 (bibcode 2004AAS...205.4815Z);
- USNO-B1.0: Monet D.G. et al. 2003, AJ 125, 984.

The camera window shows this citation under every image.

## Tests

- Vitest: `vizierNomad.test.ts` (11), `nativeNomadOrder.test.ts` (6, equivalence with the cursor walk), `cameraExposure.test.ts` (8, five pinned control hashes, 0.15° and 0.5° streaks), `camera/cameraWorkerCore.test.ts` (2), `io/cameraCatalog.test.ts` (4), `fitsWriter.test.ts` (2, full-plane bit round trip through the existing reader).
- Playwright `tests/camera-exposure.spec.ts` (10): readiness gate; static mode without extract makes **no CDS request**; live mode with the recorded response (only RA/DEC/SR, image, details); CCD I asks I/284; timeout and overflow make no image; Stop with keyboard at 320 px aborts the pending request; Save image downloads a FITS file that reopens under Saved images with the same SHA-256; a 10,001-row field makes an image; Stop during image building answers within 1.5 s; exposures over 60 min are refused in the form. All VizieR traffic goes through `page.route`.

Run `node node_modules/vitest/vitest.mjs run src/core/vizierNomad.test.ts src/core/cameraExposure.test.ts src/io/cameraCatalog.test.ts` and `OPENVIREO_TEST_PORT=5196 node_modules/.bin/playwright test tests/camera-exposure.spec.ts`.

Still open in front C: bundled extracts for the ObjectX.HTL fields (C5). The IR camera (C6) is described in [CAMERA-IR.md](CAMERA-IR.md).
