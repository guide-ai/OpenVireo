# Bounded camera source projection

`src/core/cameraProjection.ts` now constructs a compiled CCD/IR projection reference and projects explicitly supplied coordinates with exactly two supplied uniform draws. This is an internal numerical stage. It does not create a real observing context, retrieve a catalog, choose a seed, issue an exposure, add sources to pixels or change saved image/session formats.

[NATIVE-CAMERA-PROJECTION-01](CAMERA-PROJECTION-PROVENANCE.json) pins six complete procedures and eight typed Single/Extended constants to executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Original CCD/IR initialization is `0x5220f4..0x522294` / `0x51dd10..0x51deb0`; projection/jitter is `0x522560..0x522683`, inclusive bounds `0x522698..0x522716`. The checked helpers `0x4036ac` and `0x4036bc` execute native fcos and fsin respectively. Static captures and independent Decimal controls stay in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-projection/`; no original execution, emulation or REA analysis was used.

## Reference owners and geometry

The factory takes an explicit compiled camera kind, optical index, pointing RA hours/DEC degrees and seeing-enabled boolean. It uses that camera's own compiled width/height/pixel sizes and the selected optical record's focal length/seeing. It does not infer any of these from FITS headers, a pending telescope draft, a supplied candidate or live instructor settings. The three compiled optical references can be inspected mathematically without enabling the acquisition policies of other instruments.

The source converts RA as `(hours * Single15) * Extended radiansPerDegree` and DEC as `degrees * same constant`. Half-plane extents are `(pixelCount * pixelSizeMicrons * Extended0.001) / (Single2 * focalLengthMM)`. X origin is negative half-width; Y origin positive half-height. X step is positive and Y step negative. The transform yields continuous Double/Number pixel positions; it does not round to integer centers or clamp to a raster index.

Projection field geometry/seeing flag use each camera's own record. This is separate from the recovered shared CCD calibration reads in background/point/extended source stages; those owners are not silently replaced.

## Jitter and projection order

The routine always consumes **two** local uniforms: RA first, then DEC, including when seeing is disabled and the jitter width is zero. Its jitter is uniform, not a replacement Gaussian/Poisson model:

```
seeingWidthRadians = enabled ? Extended0.1 * opticalSeeingArcsec / Extended206264.8 : 0
jitteredRA  = sourceRAhours * 15 * radiansPerDegree + (uRA  - 0.5) * seeingWidthRadians
jitteredDEC = sourceDECdegrees * radiansPerDegree  + (uDEC - 0.5) * seeingWidthRadians
```

The typed206264.8 literal and source0.1 factor are retained rather than replaced with a modern conversion constant or a guessed full seeing width. The source's arithmetic then forms:

```
D = cos(DEC0)*cos(DEC)*cos(RA-RA0) + sin(DEC0)*sin(DEC)
X = -cos(DEC)*sin(RA-RA0) / D
Y = -(sin(DEC0)*cos(DEC)*cos(RA-RA0) - cos(DEC0)*sin(DEC)) / D
```

The standalone bounds helper uses inclusive±half-width/height. It has no `D>0` front-hemisphere test. An isolated antipodal helper input can therefore pass these rectangular comparisons; the port retains this behavior and does **not** claim that the earlier actual field/catalog selection admits that source. Pixels are returned only when this helper accepts the projected point. Global RNG state/call prefix and the source list must still be bound before any observing use.

## Admission and independent controls

The numerical policy uses Number projections of the typed Extended constants, Math.sin/cos and source expression order. It is not x87 precision, native argument reduction or FPU exception parity. Explicit web bounds admit pointing RA0..24/DEC±90 and source RA±48/DEC±180; nonfinite values and nonfinite projection results reject. An otherwise valid decimal candidate outside these bounds is unsupported at this later stage rather than repaired or silently assigned a different position. Every local uniform must be finite in[0,1), with exactly two values. A missing pair, seed or seeing flag is never filled.

Factory-produced context identity, frozen scalar geometry and immutable results prevent JSON/object-spread relabelling of the reference owner. Inputs are unchanged. This ownership guard does not authenticate live instrument/configuration, response bytes, field/time or catalog provenance.

Six unit contracts include294 synthetic comparisons against an independent Decimal85 direction-vector/west/north dot-product construction, all six compiled camera/optical combinations, three pointings, inside/outside offsets, enabled/disabled seeing, two uniform pairs and isolated antipodes. The measured maximum differences are `7.73686670285656e−16` in plane coordinates, `2.220446049250313e−16` in D, `2.9115199140505865e−10` pixels and `2.117582368135751e−22` radians in seeing width. These are observed controls, not universal/native error bounds or acquired data. Edge tests separately pin inclusive bounds, continuous pixel direction, two draws with zero seeing, immutable ownership and invalid-input rejection.

Run `node node_modules/vitest/vitest.mjs run src/core/cameraProjection.test.ts`. The committed controls are explicitly synthetic; `capture.py`, `control.py`, `node check.mjs` and the evidence `browser-check.mjs` reproduce the static/numerical checks. Browser verification uses the actual Vite module and compares investigation downloads before/after. No additional dependency, network service or native executable is invoked.

The preview remains http://127.0.0.1:5173/#observatory with the existing compiled filter/field reference. No projection/exposure action is added to the UI. The [ordered NOMAD list](CAMERA-NOMAD-SOURCE-LISTS.md) and [filter authority](CAMERA-FILTER-CATALOG.md) still require actual request/cache/field-time binding; CCD I additionally needs USNO-B1 I2 handling. Full source integration/random prefix, optional CCD overlay and original-byte observing/output/cancellation admission remain incomplete. No manual answers, notebook/Undo/session/export formats, original resources or58-feature completion counts change.
