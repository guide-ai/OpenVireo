# Final well, gain and A/D conversion

`src/core/cameraFinal.ts` adds the final mathematical phase after the [background](CAMERA-BACKGROUND.md) and [point additions](CAMERA-POINT-STAGE.md). It does not enable an exposure, authenticate sources, create native headers or change saved investigations. Both inputs and validation frames are explicit and synthetic.

[NATIVE-CAMERA-FINAL-01](CAMERA-FINAL-PROVENANCE.json) pins five complete procedures and three typed constants to executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Complete readonly listings and independent controls are retained in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-final/`. Original credits and uncertainties remain in the source inventory. No original bytes or resources have been changed.

## Recovered order

CCD `0x521b3b..0x521c1a` reads its configuration record at root+`0x2d99`; IR `0x51e60a..0x51e6da` reads its own record at root+`0x2df4`. Each final loop caps the raw Single pixel at Int32 well depth, divides by that camera's gain, caps the result at `2^adBits`, and stores Single. The power helper `0x4270c0..0x427142` takes Single base2 and an integral Single exponent; the accepted1..32 range follows its integer exponent branch exactly. The cap is **2^bits**, with no subtraction of1. There is no lower clamp or FISTP integer conversion in this final loop.

The port preserves fractional pixels, negative values and signed zero. For example, raw1025 at gain2 becomes512.5; raw65537 at gain1/16bits becomes65536. Well clipping happens before division. A final Single store can round an Int32 well maximum upward; no additional post-store cap is invented.

The compiled factory exposes CCD well320000/16bits with gains1/2/5, and IR well250000/32bits with gains1/2/4/8. These are explicit compiled fallback records, not an inference of live instructor settings or a loaded instrument's current configuration. The caller must bind the same actual gain/context throughout the complete pipeline when that controller is implemented.

## Admission and ownership

This pure TypeScript phase accepts a finite Single plane from the background, point or extended stage. It copies pixels and parameters, retains the exact pre-source histogram, consumes no random draws and returns a distinct `well-gain-adc-only` phase. It rejects already converted planes, supplied FITS phase claims, sparse/nonfinite/non-Single pixels, unsupported dimensions and invalid parameters atomically. It does not recompute native statistics from clipped output.

The explicit mathematical parameter domain is positive Int32 well, gains1/2/4/5/8 and integral bits1..32. Dimensions are bounded to1..1024 per axis. These are web admission limits, not recovered native validation for arbitrary instructor input. Number division followed by `Math.fround` declares the rounding policy; it does not establish native Extended/x87 exception/control-word equivalence.

## Controls and reproduction

Fourteen new unit contracts cover both compiled records, exact boundaries, well-before-gain order, fractions, negatives, signed zero, immutable phase transitions, prevention of repeated conversion and atomic invalid-input rejection. An independent exact-rational formula and integer IEEE32 nearest/even encoder produce864 scalar bit controls across nine parameter groups. A separate1024² synthetic background/final plane yields SHA256 `2fb9b0d25a5edbd086a70eaf38ec193499810982e43ebaba0bb137d3cb597640` with its original histogram retained and zero new draws. Node and Chromium agree. These controls are not an original output oracle or historical RNG witness.

Run `node node_modules/vitest/vitest.mjs run src/core/cameraFinal.test.ts`. Independent controls: `python /home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-final/control.py`, then `node --experimental-transform-types /home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-final/check.mjs`. The full-plane/control browser script is `browser-check.mjs` in that directory, using an existing loopback Vite server via `OPENVIREO_FINAL_URL`.

The persistent preview remains http://127.0.0.1:5173/#observatory. Open **CCD / IR preparation reference**, inspect a different telescope, cancel or apply it, and save/reload the investigation; this internal phase adds no exposure control. Catalog producer pairing authority, optional CCD overlay, witnessed NOMAD request/cache/catalog authority, complete random draw prefix and observing/cancel/save lifecycle remain open. Completion of this numerical phase does not complete the CCD/IR acceptance packages.
