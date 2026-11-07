# IR camera (front C6)

**Observatory → CCD camera card → Camera: IR camera (J, H, K)** takes near-infrared images of the tracked field. It uses the same window, exposure controls, catalog source choice, Save image (FITS) and Saved images round trip as the [CCD camera](CAMERA-EXPOSURE.md). Evidence: `docs/CAMERA-IR-PROVENANCE.json` (NATIVE-CAMERA-IR-C6-01, static reading of CLEA_VEO.exe 781bc970…c54c).

## Catalog
The original IR window asks **NOMAD**, the CCD's service, with J, H or K selected (0x51dfda; filter positions 0/1/2 → NOMAD selectors 3/4/5). The web reads NOMAD (VizieR I/297) `Jmag`/`Hmag`/`Kmag`. There is no 2MASS query; the `xena.harvard.edu/…/tmpsc.html` string is only the Help ▸ 2MASS link. NOMAD's J/H/K come from 2MASS, so IR images credit it: *This work uses data from the Two Micron All Sky Survey (2MASS; Skrutskie et al. 2006, AJ 131, 1163), a joint project of the University of Massachusetts and IPAC/Caltech, funded by NASA and the NSF.*

The IR search radius (1.5 × half of the larger field side) is 0.19° on the 0.4 m, 0.10° on the 0.9 m and 0.09° on the 4 m telescope, inside the 0.25° bundled extracts. Hosts, live mode and refusals are as for the CCD.

## Recovered model (what differs from the CCD)
- Detector: 512 × 512 pixels of 40 µm, 32-bit A/D, well 250 000 e⁻, liquid nitrogen; gains 1, 2, 4, 8 e⁻/ADU. Seeing jitter on (IR record byte +0x5a = 1, store 0x5a2c48).
- Same order as the CCD: moving objects first (2 draws each, no bounds test), then catalog rows (2 draws + inclusive bounds), background (one draw per pixel), sources in list order, then well/gain/A-D.
- The catalog update is the inherited CCD update **0x522454** (IR field VMT 0x51dc40 = [0x51dd10, 0x51def0, 0x522454], slot 2 at 0x51dc48, called from preparation at 0x51e46e), which projects each row with 0x522698. Select 0x51def0 also contains a loop at 0x51e035..0x51e0d4 over B1CatObj +0x1e, before the moving copy. *Inference:* that loop is inert, because the list is empty at that point: virtual0 0x59c45c clears the parsed list +0x43 and virtual8 0x59cc88 rebuilds +0x1e from it before any parse, and the parse (virtual4) runs only later from 0x522454.
- No overlay: IR preparation 0x51e43c goes straight from the background loop (ends 0x51e553) to the source loop (0x51e555), with no overlay branch. Recovered for preparation; PLAUSIBLE for the IR form itself, whose controls were not inspected.
- Background uses the **CCD** read noise, dark current and bias (0x51e4f3 reads the CCD record), and the source calibration uses the **CCD** pixel size (shared 0x52455c). These mixed owners are recovered, not web choices.
- No NF −0.25 adjustment.
- Moving objects (Object X asteroids) get the IR offsets of 0x51e110: J m − 1.13, H (m − 1.13) − 0.29, K ((m − 1.13) − 0.29) − 0.07, stored as Single.
- Final stage uses the IR well and A/D.

**Instructor values (Front T7).** VIREO reads the IR tab's record for the IR projection, plane, nominal field, well, A/D and
position noise. It reads the CCD tab's record for the background (read noise, dark noise, cooling, bias), the pixel size of the
star width and the base magnitude, count and exposure. The IR tab's own noise, bias, cooling and base values are therefore read
only by Information (and the dialog). The web follows that (docs/OPTICAL-OPTIONS.md): an IR image is uncertified when any field it
reads differs from VIREO's. A 1024² IR field on the 0.4 m needs a 0.38° cone, so no bundled extract covers it, and static mode
refuses with the usual no-extract message.

## Web adaptations
- **Exposure limit (recovered, Front RE5):** TIRCam's Start check (0x514268) is the CCD's (0x512244). A time ≥ 3600 s makes the ExpClock.Minutes setter (0x4fcbc8) raise "Minutes must be in the range of 0-59" uncaught, so both cameras take 1 s to 59 min 59 s. It is no longer an adaptation. (The absence of an overlay is recovered too, see above.) The card says so under the IR camera, and `src/core/cameraExposure.test.ts` and `tests/ir-camera.spec.ts` test it.
- One card with a camera choice instead of two windows. Changing camera resets the filter to the first position; gain 2 is kept (both cameras offer it).
- IR images are not passed to the Object X investigation (`onImage` receives CCD images only), so Object X replay and its session version are unchanged. Moving Object X asteroids are still drawn on IR images with the IR offsets, as in the original, but an IR exposure only reads the Object X list for its date: it never builds or saves a list in the Object X session (`ObjectXLab` `extraSources` with `camera: 'ir'`).
- FITS: `INSTRUME = 'IR'`, `FILTER` J/H/K, file `OpenVireo-IR-<date>-<time>-<filter>.fit`, and two 2MASS COMMENT cards. CCD FITS cards are unchanged byte for byte.

## Tests
`src/core/cameraExposure.test.ts` pins three IR cases (J catalog; H catalog with a moving pair; K catalog with a moving pair) against the Python control `exposure_control.py`, a line-by-line port by the same author. It checks composition and draw order, not the IR reading itself: its IR branch shares the author's reading of the mixed owners and offsets. The cases run on the AUTHORED table `tests/fixtures/vizier/authored-nomad-jhk-control.xml`. The test file also covers the IR offsets, the gain and filter refusals and the shared web limit. `src/core/fitsWriter.test.ts` pins the SHA-256 of a CCD FITS file to its C6 value, so IR changes cannot alter CCD bytes. `src/core/objectXLab.test.ts` checks that IR exposures never build an Object X list. `tests/ir-camera.spec.ts` covers the IR choice, J/H/K and gains, the 2MASS credit (also while an IR image is shown after switching back to CCD), static mode making no request, a live K exposure (I/297, SR 0.19), the IR FITS round trip and keyboard use at 320 px. The NOMAD test fixture `tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml` has blank J/H/K, so those cases use the authored table.

**Recorded J/H/K (Front IRJHK).** Two test files (8 Vitest tests and 1 Playwright test) use a recorded response with real 2MASS J/H/K. The response is the bundled C5W extract `public/camera/vizier/nomad-184.7070+14.7974-r0.25.xml` (I/297, SR 0.25°, recorded from vizier.idia.ac.za on 2026-10-29, SHA-256 `7fbca0159228e5bd3f9b47113d6a1e9210a8e74ea1c5c9fa4ccbd27e73184662`, 1317 rows; 224 of them have J, H and K, which are blank or present together). Each test reads its expected values straight from the recorded bytes with its own small reader, never from `readVizierCatalog`.
- `src/core/cameraIrRecorded.test.ts` (Vitest). IR filter positions 0/1/2 route to NOMAD J/H/K (0x51dfda). For each band, the admitted rows are exactly the rows whose cell is non-blank, each at that cell stored as Single. Every blank row is rejected as `selected-magnitude`, with no other band used in its place ([W], vizierNomad.ts). A star with J but no V is a J candidate and a V rejection. An IR exposure at the cone centre (0.4 m), with the band taken from the camera route as CameraControl does, selects all 224 rows. It draws each star on the detector at its own recorded J, H or K value. Each such star lies within the field's half-diagonal (about 0.179°, from the 15.21′ field size) by the response's own `_r`. That is a footprint bound, not a test of the 0.19° search radius: static mode never applies the radius, which only the live K test checks (SR 0.19). The image's brightest pixel falls on the brightest star in the band, which is more than 2 mag ahead of the next one in each band.
- `tests/ir-camera.spec.ts` (Playwright, static mode, no request to any mirror). The test points the telescope at the cone centre and makes J, H and K exposures. For each one, Exposure details names the extract and its hash, and the rows line reads 1317 / 224 / n, with n > 0 stars on the detector. The 1317 and 224 are counted from the bytes in the test. Each exposure waits for Exposing… and then Image ready., and checks the image label for its filter. As a contrast, a CCD V exposure on the same bytes selects the 250 rows that have V. No request leaves the local origin. Limitation: in this extract J, H and K are present for the same 224 rows, and the page shows no magnitude per band. The e2e counts are therefore the same for J, H and K and cannot tell the bands apart. Only the Vitest file checks the values per band.

These tests show which recorded values the IR path reads. Like the control cases, they are not evidence of the original's output.

## Model and effort
Plan and implementation (06b3143, 86a3959, 81c0d5c): claude-opus-5-5 in the front C session, medium effort, as the coordinator set. Independent review: claude-opus-5-5 subagent at high effort (`analysis/reviews/front-c-review-2.md` in the research root). Review fixes: the same front C session. Front IRJHK (recorded J/H/K tests, test and docs only): claude-opus-5-5 subagent at medium effort, as the coordinator set. Independent review 1 (claude-opus-5-5 at high effort) had no High or Medium findings. Its Lows and Nits were fixed by the same subagent: the `_r` check is now a footprint bound at the field's half-diagonal (L1); the exposure test takes its band from the camera route, and the e2e limitation is stated (L2); the e2e waits for Exposing… and checks the image label before reading the rows (L3); the split readers note that they rely on the hash-pinned bytes; and the e2e checks that no request leaves the local origin.

## Review 2 resolution
The raw report stays in the research root; these are the changes made in response.
- **M1:** the IR catalog update is now cited as the inherited CCD update 0x522454. The loop 0x51e035..0x51e0d4 is described as inert, and that is marked as an inference (composer comment, this doc, provenance).
- **L1:** the IR note and 2MASS credit show while the selected camera or the image on screen is IR. An e2e check covers it.
- **L2:** "no overlay" is recorded as recovered: PLAUSIBLE for the IR form, recovered for IR preparation. Only the exposure-time limit remains a web adaptation.
- **L3:** the control is no longer called independent, and an H case is pinned. A recorded J/H/K response waited on C5. It was
  recorded in C5W (docs/CAMERA-EXPOSURE.md), and Front IRJHK tests the IR path on it (see Tests).
- **L4:** the FITS file name takes its camera from `exposure.recipe.camera`. Object X uses the recipe's camera for the filter name. 45 CCD recipes give FITS files, names and draw counts identical to 81c0d5c, and one CCD file hash is now pinned.
- **Info:**
  - The notices say the IR camera reads only NOMAD.
  - IR exposures still draw current Object X asteroids, but never build a list or record pairs.
  - This model and effort note was added.
