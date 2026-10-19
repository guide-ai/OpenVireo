# Validation

Validation establishes the chosen browser contracts and traceability. It does not establish original numerical or functional equivalence: CLEA has not been executed as an oracle.

## Current checks

- TypeScript/build: passes.
- Vitest: 53 tests pass across the spectral/sky core, supplied-mean exposure and calibration, bounded galaxy preparation, raster-table stages and shared numerical policy. These are adapter/static-data checks, not original-run observations.
- Playwright: 11 flows pass, including the full beginner observatory path, original M82 image/reference loading, instrument return with context, coordinate rejection, RA wrap-area browsing and mobile overflow check, plus imported-spectrum control/record/export regressions.
- Original source/derived hashes and RGB-preserving image conversion are recorded in `data/sky/PROVENANCE.json`.
- Browser screenshots: `.local/qa/openclea-observatory-desktop.png` and `openclea-observatory-mobile.png`; Brave is independently inspected through CUA. A screenshot does not certify science.

## Meaningful scenarios

Spectral scenarios preserve original list wavelengths/template grid, use independent binary-fraction arithmetic vectors, signed IMUL behavior, rebase/factor/no-op semantics, known float32 rounding intervals, signed zero and nine-significant-digit float32 round trips. Physical-line parser errors, malformed values/duplicate wavelengths, CSV formula escaping and complete exported state/hash are checked. The one-sample absorption regression retains the feature that earlier subsampling erased.

Sky scenarios check original projection orientation and use of object declination, exact ±12-hour ties, zero-hour wrap, field clipping, polar tile selection, pole reflection and direct-coordinate bounds. The GSC reader preserves original packed coordinates and storage conversion points, without trusting the spurious intermediate single casts in pseudocode. Synthetic vectors remain explicitly test inputs, not catalog observations. The first-visit browser path uses original M82 resources without numerical settings and verifies that library references cannot be recorded as a new observation.

English text uses stable keys; presentation numbers use `Intl` with en-US. Scientific imports use decimal points independently; schema-2 CSV uses stable English identifiers, CRLF and an explicit numerical policy. Library flux can exceed one and is retained, while user import still requires normalized 0–1 intensity.

## Pending equivalence

No approved original-oracle recordings, stochastic equivalence result, tracking/horizon/time comparison or complete exercise acceptance result exists. Future verification must pin artifact/version/data/options, reconstruct ABI/FPU contracts and conversion points, then compare agreed outputs with routine-specific criteria. See `IMPLEMENTATION-PLAN.md` for gates and scope. Never infer a complete port from passing adapter tests or plausible plots.

## Initial observatory release validation

The candidate was built/tested separately on 127.0.0.1:5174 with existing dependencies and no installation. Only after build, 20 unit tests and 11 browser flows passed were its runtime/test/data hashes matched to the staged release and copied to the named project. Changed files and the 24 retired generated RA-only tiles have a rollback copy recorded in the research release receipt. The project on 5173 then passed the same build, 20 unit tests and 11 browser flows.

Additional regressions cover selected-target versus actual-pointing reference access, panning away, unchanged coordinate resubmission, near-24-hour input precision, East/West passage across 0 hours, explicit first-visit step progression, mobile navigation visibility, the stored float32 z=−1 boundary, library display-scale labels and a polar transfer budget below 100,000 bytes. The measured polar tile payload is 65,109 bytes for 2,573 retained records. Exact retile preservation was checked for all 2,369,926 records.

Brave was separately inspected through CUA on the served URL: initial step 2 after opening, M82 pointing 9.93000 h / 69.68333°, original image loaded at width 376, library spectrum/scale labels, no visible alerts, and return to the observatory with context preserved. The live tab is kept open. These checks remain browser-contract evidence, not original-executable equivalence.


## Galaxy review follow-up

The authorized route-only Claude `/code-review` completed with effective Opus5.5 and configured high effort after one retry supported by the user's literal authorization. Raw findings and independent dispositions are separate in the research audit and docs/REVIEW-RESULT.md. Subsequent fixes are locally verified; the report is not immutable approval of later edits.

The follow-up adds error-class assertions for interpolation and shifted-endpoint overflow, SHA-256 checks before reading the three original SP fixtures, all100 default half-index channels per matched spectrum in independent Fraction vectors, and one shared nearest-even policy for signed ties. Static assembly confirms the inclusive100Å boundary loop, Extended step storage, index multiplication and source-amplitude multiplication. Eleven raster/grid constants and three previously omitted Go/Stop/timer dossiers are now linked, giving71 canonical function contracts. Native GDI fidelity remains unmeasured.
