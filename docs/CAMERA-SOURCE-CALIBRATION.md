# Compiled camera source peak and width reference

`src/core/cameraSourceCalibration.ts` now connects explicit stored magnitude, filter and duration to the recovered source peak/sigma calculations and the existing point-source numerical stage. This is a compiled fallback reference, not live options, a measured calibration, authenticated catalog data or an enabled exposure.

[NATIVE-CAMERA-SOURCE-CALIBRATION-01](CAMERA-SOURCE-CALIBRATION-PROVENANCE.json) pins seven complete procedures, three typed constants and six checked compiled calibration stores to executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Derived listings, independent Decimal95 controls and browser receipts remain in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-source-calibration/`. No native execution, CPU emulation or REA analysis was used. Original resource bytes/credits remain unchanged.

## Source owners and order

Shared initializer `0x52455c..0x5245c4` uses the **CCD** record's pixel sizes for both CCD and IR callers. Point/extended addition also reads the CCD calibration at root+0x2d99. The factory preserves these owners; the IR frame still has its own512×512 dimensions while source width uses CCD24µm pixels, rather than replacing them with IR40µm pixels. This does not establish an original bug or justify repairing the mixed ownership.

The explicitly selected compiled optical record provides focal length, seeing and scope magnitude factor. The typed source scale constant is Extended206.2648:

```
pixelScaleX = (Extended206.2648 * CCDpixelWidthMicrons) / opticalFocalLengthMM
pixelScaleY = (Extended206.2648 * CCDpixelHeightMicrons) / opticalFocalLengthMM
sigmaX = opticalSeeingArcsec / pixelScaleX
sigmaY = opticalSeeingArcsec / pixelScaleY
```

These are the native numerical width parameters in pixels. No Gaussian FWHM divisor, modern replacement conversion constant or total-flux normalization is inserted.

CCD preparation `0x521a8d..0x521aac` subtracts Single0.25 from the stored Single magnitude only at filter position0 (NF), retaining the intermediate as Extended. Other CCD filters and IR pass the stored magnitude unchanged. This preserves the [lookup map](CAMERA-FILTER-CATALOG.md): NF queries NOMAD R but its caller adjusts that magnitude before the peak expression; CCD I remains the separate USNO-B1 I2 route and is not certified by a NOMAD reader.

The compiled CCD base stores are magnitude10, count1000 and base exposure10seconds. Source point calibration `0x5245ed..0x524640` computes:

```
effectiveMagnitude = storedSingleMagnitude - (CCD NF ? Single0.25 : 0)
delta = (CCDbaseMagnitude - effectiveMagnitude) + opticalScopeMagnitudeFactor
referencePeak = CCDbaseCount / Power(Extended10, -delta / Single2.5)
pointExposureScale = integerSeconds / CCDbaseSeconds
```

Reference peak and sigma do not change with duration. The point kernel's support also remains independent of duration. Its recovered Gaussian amplitude and time-squared cross remain unchanged. The extended kernel continues to take the explicit duration/base-duration ratio and applies its geometric scale internally; this new adapter returns **point** parameters and does not claim new extended-duration expression-order parity. Base Count alone does not authorize an extra photon/electron unit or a fitted photometric calibration.

## Admission and ownership

Camera kind, compiled optical index and filter position are explicit. Magnitude must already be a finite Single within±50; no catalog value or missing magnitude is filled or silently rounded. Positive Int32 seconds, peak0..1e12, exposureScale≤1e6 and positive finite sigma≤1024 are bounded web admission rules, not native editor/overflow equivalence. The reference and nested lookup are immutable, and point adaptation requires the actual factory-produced reference; JSON reconstruction or relabelled object spread rejects. Continuous pixel coordinates are explicit and remain unrounded until the existing point kernel's declared geometry conversion.

Number projections of the typed Extended constant, Math.pow and source arithmetic order are the declared policy. No x87 power, Extended rounding/control-word or exception parity is asserted. The factory neither sets a live filter/gain nor authenticates source position, catalog response, observing time, seed or applied instrument/configuration. It does not read an imported image's WCS or calibration.

## Verification and reproduction

Seven unit contracts check360 independent Decimal95 scenarios covering eight filter routes, three optical records, five stored magnitudes and three durations; NF behavior, shared CCD/IR source widths, immutable ownership, input rejection and the background→point→final numerical chain. Maximum observed relative error is `9.469130453160781e−16` for reference peak and `1.5835759619990266e−16` for sigma. These are measured examples under the declared policy, not universal/native bounds.

Two independent Decimal95 analytic footprints with integer IEEE32 stores control synthetic CCD1024² and IR512² planes through calibrated point addition and final conversion. They compare1719/2599ordered visits and every stored pixel through SHA256, while retaining the initial background histogram. The expected raw/final hashes are `e71d787834d4634d0607a76f08dadd0a9d5d2ccf3fa1521ef9115986f641df26` and `fe61ccbb02810ff961d8170fcc89e4c7558a0bdcb9c9c06dbff98334ff727251`. These are synthetic constant-background/supplied-uniform controls, not acquired images or a historical RNG/output oracle.

The first browser and E2E attempt failed before application load with ERR_CONNECTION_REFUSED on work preview5176. Listener and scoped Node/Vite checks confirmed no work server; one loopback server was restored at the same strict port. The first diagnostic substring also matched its own command text, so the recorded follow-up checks executable/script argv positions. Failed logs/traces are retained. No product assertion or timeout was changed; the persistent5173service was not restarted.

Run `node node_modules/vitest/vitest.mjs run src/core/cameraSourceCalibration.test.ts`. The committed controls are explicitly synthetic. Evidence reproduction uses `capture.py`, `control.py`, `full-control.py`, `node check.mjs` and `browser-check.mjs` against an existing local preview. The browser compares the actual Vite modules, both full synthetic planes and investigation downloads before/after.

The normal preview remains http://127.0.0.1:5173/#observatory with the compiled CCD/IR field/filter reference. This increment exposes no new calibration/exposure control and changes no manual answer, notebook/Undo/session/export format, original resource or58-feature completion count. Actual query/cache/response/field-time authority, global RNG context, live calibration/overlay owners and complete observing/output admission remain separate unfinished contracts.
