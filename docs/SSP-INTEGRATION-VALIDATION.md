# SSP integration verification — 18 October 2026

Completed on `/home/dobleuber/Projects/personal/clea-web`, served by the existing
`clea-web-preview.service` at http://127.0.0.1:5173/. Service readback confirmed
active/running and Vite `--host 127.0.0.1 --port 5173 --strictPort`.

- `npm run build`: passed, including TypeScript project typecheck. Vite retains
  its large-chunk warning for the pre-existing scientific-data dependency path;
  the initial JS is about 458 kB (the first candidate's eager loading regression
  was corrected before applying). Acquisition helpers stay dynamically loaded.
- `npm test`: **210 passed**, 35 files (baseline 194).
- `npm run test:e2e -- --workers=2`: **39 passed**, 34.0 s (baseline 37), against
  the persistent local preview. No new runtime page errors in the SSP flow.
- Desktop and 320 px mobile browser screenshots visually inspected:
  [external browser-evidence record], [external browser-evidence record], and
  the acquired CorBor mobile view [external browser-evidence record].
  Imported metadata render as plain text; controls and buttons fit without
  horizontal overflow. In-app browser tooling was unavailable; Playwright
  screenshots of the actual local preview supplied the visual verification.

New meaningful contracts cover all three galaxy IDs and the star, bound header
fields, unchanged curve identity/body, source-plus-sky totals, signed data,
optional magnitude, exact source byte/hash/session restoration, tampering,
malformed headers/rows, bad grids, encoding, nonfinite/underflow/out-of-profile
numbers and extension-independent dispatch. The core codec's existing independent
synthetic vectors and zero-maximum rejection tests continue to pass.

The added real browser flow covers export, header/body/file suffix, reimport,
zero/unconfigured manual controls, no acquired provenance inferred, cancelled
file chooser, cancelled/saved measurement, invalid import atomicity, imported
session restoration, exact source download, raw archive restoration, repeat SSP
export and deactivated telescope counts. Mobile checks escaped markup, absent
magnitude, signed plotting, error preservation and width.

An initial candidate test failed because it used an invented download-button
label; the selector was corrected to the existing `Download analysis spectrum`.
No application defect or ignored test remains from that failure. The sandbox
blocked loopback listen for the isolated candidate test; the approved loopback
run and final persistent-preview run passed. No auto-review denial occurred.

The recovered codec and immutable evidence/manifests remain unchanged. SSP
contains no raw count scale, time/RNG, measured z or authenticated provenance.
The native reader's endpoint reconstruction differs from this parser's retained
printed wavelengths. ASCII/dot-decimal only; x87/RTL byte identity has no native
writer oracle. No original CLEA execution, Windows/emulation, REA installation,
Claude review, new dependencies, push, public upload or deployment occurred.
Existing external-review restrictions and original-data license limits remain.
See [SPECTRUM-SAVE-CONTRACT.md](SPECTRUM-SAVE-CONTRACT.md#try-the-feature) for exact
feature test steps and evidence addresses/hashes.
