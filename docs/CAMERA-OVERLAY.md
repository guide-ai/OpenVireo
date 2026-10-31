# Bounded CCD post-GDI overlay stage

**Front R1 (2026-10-29):** the overlay's source, gate and rectangle are now recovered (docs/RADIO-CAMERA-R1.md §Overlay).

**Front R2 (2026-10-29), research `analysis/front-r2/A-camera-field-overlay.md` §3:**
- **Stretch mode** [D code, I runtime]: SetStretchBltMode is called only in TBitmap.Draw 0x431714 [D]. It uses HALFTONE for a
  destination of at most 8 bpp that has fewer bits than the source, otherwise COLORONCOLOR [D]. bmpA/bmpB are assumed to be
  screen-compatible DDBs, so HALFTONE is unreachable and the mode is COLORONCOLOR on every display depth [I]. Every compiled
  telescope enlarges (380, 192 or 171 px to 1023 px), so that is plain pixel replication [I]; GDI's replication phase is
  unknown.
- **Sizes** [D]: bmpB is 1024² and the StretchBlt destination is 1023², so column and row 1023 keep bmpB's initial content.
  That content is white (the VCL default fill [I]): a bright L-shaped border on every overlay exposure.
- **Display depth** [I]: at 16 bpp the DDB keeps 5 red bits, so GetPixel returns quantized red; at 24/32 bpp it is exact. A
  port must declare its reference depth.
- **Gate** [D]: form+0x412, set by any non-M31 galaxy in the field list; there is no option byte.

**Front C6 (2026-10-31): ported** (`analysis/front-plans/front-c6.md` §2)
- **Source:**
  - The field engine exports the galaxy layer: `FieldOptions.galaxyLayer` returns the red channel of `paintField`'s 936² raster
    after the galaxies and before the stars (obs+0x550 when 0x53b390 copies it to form+0x40e).
  - The sky view's telescope builds request it (`io/skyFieldBuild.ts`), so the camera uses the field VIREO painted last: the
    loaded anchor, telescope, JD and Object X mask (`observatory/telescopeField.ts`, `camera/cameraOverlayInputs.ts`).
- **Gate and geometry** [D] (`core/cameraOverlaySource.ts`):
  - **Gate:** any galaxy other than NGC 224.
  - **Rect:**
    - w = 312 × CCD width′ / 15.0 (h likewise);
    - left/top = Round(X − w/2)/Round(Y − h/2), with Round half-even;
    - size Round(w) × Round(h);
    - on the 0.4 m at the loaded centre, 380² from (278, 278).
  - **Stretch:** to 1023², with the last column and row white (255 → level 870, 2047 draws).
- **Calibration:**
  - **Index** [D]: the telescope handler stores the selected index in obs+0x6fc (0x58b67d → 0x53df24) and then env+0x3818
    (0x58b682).
  - **Values:** the overlay's factor is therefore the selected telescope's record +0x3c (`scopeFactorMag`). Base magnitude,
    count and seconds come from the CCD record root+0x2d99, the same owners `compiledCameraSourceCalibration` reads for the
    point sources. This settles "index authority not established" below.
- **Composer:** `composeCameraExposure` step 4 applies it in place after the background and before the sources, one draw per
  positive level (`applyCcdOverlayInPlace`, equal to `addCCDOverlay` in `cameraC6.test.ts`). IR has no overlay.
- **Brightness:** VIREO's constants make it faint. Level 870 gives a mean of 0.22 counts in 1 s on the 0.4 m, and 6556 in 300 s
  on the 4 m. A short 0.4 m image looks as empty as VIREO's.
- **Web adaptations** [W]:
  - nearest-centre replication ⌊(d + ½)·n/1023⌋ (GDI's phase is not specified);
  - a 24/32-bpp display;
  - the pointing is projected with the field's own projection.
- **Typed** (the exposure is made without the overlay, and the details say why):
  - near an Object X target (the field stays masked);
  - a field that cannot be built;
  - no telescope load;
  - NGC 224 in the field (its routine 0x53b848 is not ported);
  - a source rect beyond the 936² field (a drift of about 278 px or more; GDI's out-of-bitmap copy is not recovered);
  - an unpainted galaxy.

`src/core/cameraOverlay.ts` now ports the numerical addition performed after the native CCD overlay bitmap has been drawn/resampled. It accepts an explicitly supplied row-major snapshot of GetPixel's low bytes and explicit calibration values. It does not read a bitmap/FITS image, reproduce GDI scaling, infer an overlay from an imported image or enable an exposure.

[NATIVE-CCD-POST-GDI-OVERLAY-01](CAMERA-OVERLAY-PROVENANCE.json) pins four complete procedures, five typed Single constants, the GetPixel import/IAT identity and the source's constructed Extended10 power base to executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Derived captures/controls remain in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-overlay/`. This is static recovery; no original execution, emulation or REA analysis produced it. Original resources/credits remain unchanged.

## Actual input and formula

CCD preparation `0x52154c..0x521c65` gates this branch on CCD form+0x412, builds/draws VCL bitmaps and then loops over GetPixel values. The checked wrapper `0x42cea8..0x42cece` calls import stub0x4086f4 → IAT0x620e44 → GetPixel. The loop takes **only the low byte** (the red component of COLORREF), not an average, luminance, FITS float or grayscale pixel inferred from a viewer. Native GDI clipping, copy/stretch and error-color behavior are outside this input contract.

For each byte r it computes `level = r * Single4 - Single150`. Only strict positive levels are processed:37 skips and38 produces2. Calibration follows the recovered operation order:

```
delta = (CCDbaseMagnitude - Single22) + overlayOpticalMagnitudeFactor
referenceScale = CCDbaseCount / Power(Extended10, -delta / Single2.5)
exposureScale = exposureSeconds / CCDbaseExposureSeconds
mean = (exposureScale * referenceScale) * level
newPixel = Single(oldPixel + cameraScalarJitter(mean, suppliedUniform))
```

The [scalar helper](CAMERA-BACKGROUND.md) is the recovered uniform square-root-dependent spread. A Gaussian/Poisson distribution or a new count/electron unit is not substituted. Every positive level consumes one uniform, even when mean is zero; skipped levels consume none. Traversal is row-major. Single storage occurs after each addition, before point/extended sources and final well/gain/A-D conversion. The pre-overlay background histogram is retained as the same owned object rather than recomputed from the final image.

The CCD calibration record is root+0x6b4+0x26e5. This overlay's optical factor comes through index **root+0x3818**, distinct from observatory+0x6fc in field initialization. Front C6 established that index's authority: the telescope handler writes it together with obs+0x6fc (0x58b67d/0x58b682), so it is the selected telescope. `ccdOverlayScale` still takes the values explicitly; the composer passes the selected telescope's and the compiled CCD record's. Base Count alone does not prove an extra photon/electron unit.

## Bounded admission and phase ownership

The plan accepts1..1024 per axis, exactly width×height integer low bytes0..255 and bounded nonnegative explicit scales. The optional scale helper requires finite Single magnitude/factor inputs within±50, nonnegative Int32 count, positive Int32 exposure/base seconds, referenceScale≤1e12 and exposureScale≤1e6. These are web admission bounds, not recovered native instructor-editor validation. Number/Math.pow/sqrt plus explicit Single stores are declared policy, not original Extended/power/FPU parity.

Plans retain immutable raster/scales/visit indices/means and actual factory ownership. Reconstruction or object spread cannot relabel a plan. Applying a plan requires the raw background phase, matching dimensions and finite Single pixels; it rejects a repeated overlay, converted/imported phases, wrong uniform counts or late invalid values atomically. The new internal `ccd-overlay-before-sources` phase is accepted by the existing point, extended and final numerical stages. No persisted image/session/notebook format is extended, and no IR overlay route is added to the application.

Fourteen unit contracts include ten independent Decimal95/IEEE32 controls:1554 pixel comparisons and1317 supplied draws, all256 byte values in16×16 synthetic rasters, both zero/positive backgrounds, low/fractional/zero count scales, threshold boundaries and all-skipped data. Integration tests retain histogram identity through point/extended/final stages and check immutable data, bad inputs and repeat/forged-plan rejection. These are synthetic post-GDI snapshots, not native-rendered/original images or a binary oracle.

The first recovery listing began before the known parent entry and the initial boundary check assumed only C3 rather than accepting the scalar helper's C2 cleanup return. Both were corrected against the already pinned complete parent ranges before admission. Initial typecheck also caught an unused test import, which was removed; initial evidence/logs remain separate. No assertion or source behavior was removed to pass validation.

Run `node node_modules/vitest/vitest.mjs run src/core/cameraOverlay.test.ts`. Reproduce with evidence `capture.py`, `control.py`, `node check.mjs` and `browser-check.mjs` on an existing local preview. The browser also controls a synthetic1024×1024 constant low-byte raster through raw overlay and final conversion, with an independently computed little-endian Float32 SHA256 and unchanged investigation export. It is not a GDI resampling/equivalence test.

Before Front C6 no overlay was applied in the application. Since C6 every CCD exposure at a field with a galaxy adds it (see the C6 section above). The GDI replication phase, the display depth and the out-of-field copy remain unrecovered. Manual answers, notebook/Undo/session/export formats, original bytes/hashes and58-feature completion counts are preserved.
