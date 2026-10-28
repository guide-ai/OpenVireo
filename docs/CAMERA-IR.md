# IR camera (front C6)

**Observatory → CCD camera card → Camera: IR camera (J, H, K)** takes near-infrared images of the tracked field. It uses the same window, exposure controls, catalog source choice, Save image (FITS) and Saved images round trip as the [CCD camera](CAMERA-EXPOSURE.md). Evidence: `docs/CAMERA-IR-PROVENANCE.json` (NATIVE-CAMERA-IR-C6-01, static reading of CLEA_VEO.exe 781bc970…c54c).

## Catalog
The original IR window asks **NOMAD**, the CCD's service, with J, H or K selected (0x51dfda; filter positions 0/1/2 → NOMAD selectors 3/4/5). The web reads NOMAD (VizieR I/297) `Jmag`/`Hmag`/`Kmag`. There is no 2MASS query; the `xena.harvard.edu/…/tmpsc.html` string is only the Help ▸ 2MASS link. NOMAD's J/H/K come from 2MASS, so IR images credit it: *This work uses data from the Two Micron All Sky Survey (2MASS; Skrutskie et al. 2006, AJ 131, 1163), a joint project of the University of Massachusetts and IPAC/Caltech, funded by NASA and the NSF.*

The IR search radius (1.5 × half of the larger field side) is 0.19° on the 0.4 m, 0.10° on the 0.9 m and 0.09° on the 4 m telescope, inside the 0.23° bundled CCD extracts. Hosts, live mode and refusals are as for the CCD.

## Recovered model (what differs from the CCD)
- Detector: 512 × 512 pixels of 40 µm, 32-bit A/D, well 250 000 e⁻, liquid nitrogen; gains 1, 2, 4, 8 e⁻/ADU. Seeing jitter on (IR record byte +0x5a = 1, store 0x5a2c48).
- Same order as the CCD: moving objects first (2 draws each, no bounds test), then catalog rows (2 draws + inclusive bounds), background (one draw per pixel), sources in list order, then well/gain/A-D.
- Background uses the **CCD** read noise, dark current and bias (0x51e4f3 reads the CCD record), and the source calibration uses the **CCD** pixel size (shared 0x52455c). These mixed owners are recovered, not web choices.
- No NF −0.25 adjustment.
- Moving objects (Object X asteroids) get the IR offsets of 0x51e110: J m − 1.13, H (m − 1.13) − 0.29, K ((m − 1.13) − 0.29) − 0.07, stored as Single.
- Final stage uses the IR well and A/D.

## Web adaptations
- **ir-like-ccd**: the IR window's exposure-time limit and any overlay option are not recovered. The IR camera uses the CCD's 60-minute web limit and offers no overlay. The card says so under the IR camera, and `src/core/cameraExposure.test.ts` and `tests/ir-camera.spec.ts` test it.
- One card with a camera choice instead of two windows. Changing camera resets the filter to the first position; gain 2 is kept (both cameras offer it).
- IR images are not passed to the Object X investigation (`onImage` receives CCD images only), so Object X replay and its session version are unchanged.
- FITS: `INSTRUME = 'IR'`, `FILTER` J/H/K, file `OpenVireo-IR-<date>-<time>-<filter>.fit`, and two 2MASS COMMENT cards. CCD FITS cards are unchanged byte for byte.

## Tests
`src/core/cameraExposure.test.ts` pins two IR cases (J catalog; K catalog with a moving pair) against the independent Python control (`exposure_control.py`) on the AUTHORED table `tests/fixtures/vizier/authored-nomad-jhk-control.xml`. It also covers the IR offsets, the gain and filter refusals and the shared web limit. `tests/ir-camera.spec.ts` covers the IR choice, J/H/K and gains, the 2MASS credit, static mode making no request, a live K exposure (I/297, SR 0.19), the IR FITS round trip and keyboard use at 320 px.
