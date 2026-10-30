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

## Web adaptations
- **Exposure limit (recovered, Front RE5):** TIRCam's Start check (0x514268) is the CCD's (0x512244). A time ≥ 3600 s makes the ExpClock.Minutes setter (0x4fcbc8) raise "Minutes must be in the range of 0-59" uncaught, so both cameras take 1 s to 59 min 59 s. It is no longer an adaptation. (The absence of an overlay is recovered too, see above.) The card says so under the IR camera, and `src/core/cameraExposure.test.ts` and `tests/ir-camera.spec.ts` test it.
- One card with a camera choice instead of two windows. Changing camera resets the filter to the first position; gain 2 is kept (both cameras offer it).
- IR images are not passed to the Object X investigation (`onImage` receives CCD images only), so Object X replay and its session version are unchanged. Moving Object X asteroids are still drawn on IR images with the IR offsets, as in the original, but an IR exposure only reads the Object X list for its date: it never builds or saves a list in the Object X session (`ObjectXLab` `extraSources` with `camera: 'ir'`).
- FITS: `INSTRUME = 'IR'`, `FILTER` J/H/K, file `OpenVireo-IR-<date>-<time>-<filter>.fit`, and two 2MASS COMMENT cards. CCD FITS cards are unchanged byte for byte.

## Tests
`src/core/cameraExposure.test.ts` pins three IR cases (J catalog; H catalog with a moving pair; K catalog with a moving pair) against the Python control `exposure_control.py`, a line-by-line port by the same author. It checks composition and draw order, not the IR reading itself: its IR branch shares the author's reading of the mixed owners and offsets. The cases run on the AUTHORED table `tests/fixtures/vizier/authored-nomad-jhk-control.xml`. The test file also covers the IR offsets, the gain and filter refusals and the shared web limit. `src/core/fitsWriter.test.ts` pins the SHA-256 of a CCD FITS file to its C6 value, so IR changes cannot alter CCD bytes. `src/core/objectXLab.test.ts` checks that IR exposures never build an Object X list. `tests/ir-camera.spec.ts` covers the IR choice, J/H/K and gains, the 2MASS credit (also while an IR image is shown after switching back to CCD), static mode making no request, a live K exposure (I/297, SR 0.19), the IR FITS round trip and keyboard use at 320 px. The tests use no recorded response with real J/H/K values yet (the recorded NOMAD fixture has blank J/H/K): one I/297 response with non-blank J/H/K, and a J exposure e2e test on it, are due when C5 records extracts.

## Model and effort
Plan and implementation (06b3143, 86a3959, 81c0d5c): claude-opus-5-5 in the front C session, medium effort, as the coordinator set. Independent review: claude-opus-5-5 subagent at high effort (`analysis/reviews/front-c-review-2.md` in the research root). Review fixes: the same front C session.

## Review 2 resolution
The raw report stays in the research root; these are the changes made in response.
- **M1:** the IR catalog update is now cited as the inherited CCD update 0x522454. The loop 0x51e035..0x51e0d4 is described as inert, and that is marked as an inference (composer comment, this doc, provenance).
- **L1:** the IR note and 2MASS credit show while the selected camera or the image on screen is IR. An e2e check covers it.
- **L2:** "no overlay" is recorded as recovered: PLAUSIBLE for the IR form, recovered for IR preparation. Only the exposure-time limit remains a web adaptation.
- **L3:** the control is no longer called independent, and an H case is pinned. A recorded J/H/K response waits on C5.
- **L4:** the FITS file name takes its camera from `exposure.recipe.camera`. Object X uses the recipe's camera for the filter name. 45 CCD recipes give FITS files, names and draw counts identical to 81c0d5c, and one CCD file hash is now pinned.
- **Info:**
  - The notices say the IR camera reads only NOMAD.
  - IR exposures still draw current Object X asteroids, but never build a list or record pairs.
  - This model and effort note was added.
