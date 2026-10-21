# Camera palette validation

Evidence directory: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-palette/`.

- Full regression: **434 E2E passed**, 4 workers, 7.3 minutes, no failed/retried/skipped tests. Includes the five new palette flows and the manual-answer/notebook byte-conservation flow with an applied palette.
- Final affected regression: **23 E2E passed**, 27.5 seconds, after the SVG antialiasing correction and clarification of stored finite range versus web display levels. This also exercises hidden-document draft cancellation. The full434 run preceded those presentation/test-only refinements; it has not been relabeled as a second full run.
- Final unit regression: **1455 passed /153 files**, 8.70 seconds. Four new core contracts cover RGBQUAD layout/clipping/monotonicity, recovered64/127initialization, declared rounding and original FITS pixel/byte retention.
- Standalone TypeScript and actual aggregate `npm run build -- --configLoader runner --outDir /tmp/openvireo-palette-final-build`: passed. Existing main-chunk size advisory remains; no dependency installation or deployment.
- Final resource preflight: **1279/1279** sizes/SHA-256 match. The manifested planning snapshot remains SHA-256 `383490fbb4802789d938613fbfaa9226dd5b69df9fc3486e20f57e5610e1f026`; its manifest entry was not rewritten. Original executable SHA remains unchanged.
- Independent authored-control comparison: **32640 intervals /8355840 palette levels**, no differences against either Python binary64 square-root policy or an integer-square comparison of ideal-real nearest/even rounding. This is not an original program/runtime oracle. Controls, outputs and hashes are outside the source tree.
- Chromium desktop1440 and touch/mobile360 inspected visually. Final gradient bar has no antialiasing seams. Applied display changes retain raw selected pixel48,32 =47, bits`423c0000`, source SHA`068de404deaea11e33334a8aa60ace6e1df08c01bfc6ac0fa2d064980c88809d`, and byte-exact original download. No horizontal page overflow or page errors.

## Retained failures and fixes

Initial affected run:22 passed /1 failed. The new restoration test searched an `aria-label` that the existing input does not have; the real input uses its associated label and id`project-file`. The trace/screenshot/log were retained. Correcting the test selector made the restoration flow pass without a product change, timeout increase, retry or removed assertion.

Visual inspection then identified SVG antialiasing seams between adjacent one-unit palette cells at fractional scale. `shapeRendering="crispEdges"` fixes presentation; numerical output and image pixels do not change. Final desktop/mobile captures were inspected after this correction.

The independent-check harness initially attempted a TypeScript compiler API absent from this project's TypeScript7 package. It was corrected to load copies of the authored TypeScript using Node's type stripping. This did not change product code or execute original instructions.

## Scope

The displayed curve is source-backed; the initial saved-image normalization, Number rounding and modal ownership/cancellation are explicitly declared browser policies. Raw-to-DIB statistics/configuration, source acquisition, calibration and astrometry remain unimplemented. Original binaries/resources were only read/disassembled, not executed or emulated. No remote access, push, deployment or new Claude attempt was made. The already recorded Claude availability denial remains in force.
