# Student exercise board (VIREO, 7 exercises)

"Done" follows audit decision 2 ([AUDITORIA-Y-PLAN-2026-10-26.md](AUDITORIA-Y-PLAN-2026-10-26.md) §4–5): a student completes the exercise in the app with a guide, an end-to-end test covers that path, and web adaptations are labelled in one line. Native fidelity of peripheral branches is not a closing requirement. Criteria list student steps only; status and evidence are kept separately and change only after actual test and review results. Nothing here claims native equivalence.

## E01 · Hubble
**Criteria**
1. Acquire galaxy spectra with the telescope and spectrometer.
2. Measure each redshift in the analyser and keep it.
3. Combine your own velocities with distances and fit the Hubble relation yourself.
4. Save and restore the investigation.

**Status** — Not closed. Five of the original 13 galaxies can be acquired: the earlier three on their verified profiles, plus CorBor–1 and CorBor–3 on the 0.4m profile. The explicit phase-2 minimum remains eight; the agreed exercise count stays 4/7.

**Evidence** — Existing Hubble guide; audit §3. Phase-1 item 1.12 is technically validated and reviewed (2026-10-27): confirmed analyser z and derived velocity reach own Observational Results, deterministic text/CSV downloads and scoped browser printing; five actual-App cases include acquisition, confirmation/cancel, provenance/status, Unicode labels, Save/fresh Restore and append. Research notes on the necessary analyser/Hubble pages are folded while critical model and identity limits stay visible (1.11). Build/typecheck, 3049 unit tests, 1281 resource hashes and 90 distinct E2E cases passed; desktop/mobile visual inspection and separate high functionality review/closure completed. `tests/own-observation-results.spec.ts` and `src/core/ownObservationResults.test.ts` preserve executable evidence. At that phase-1 checkpoint acquisition covered 3 of 13; E01 was not closed.

Phase-2 B1 is technically validated and separately reviewed (2026-10-27): `tests/hubble-corbor.spec.ts` follows verified original Hubble.HTL loading, exact pointing, both new acquisitions, actual-count analysis, manual redshift, own Hubble results, Save/fresh Restore and continued acquisition. It also covers invalid/cancelled/late loads, unavailable telescope profiles and a 320px path. Build/typecheck, 3073 unit tests across 252 files, 1283 resource identities and 111 distinct actual-App E2E cases passed; after the review’s three confirmed text/provenance/test findings were corrected, build, all unit tests and 27 affected browser cases passed again. Desktop/mobile views were inspected. Numerical/state runtime code stayed identical during that closure. Earlier resource bytes and the earlier three targets’ independently frozen trajectories were preserved. This enables five targets and does not meet the minimum-eight exit criterion.

**Web adaptations** — CorBor–1/3 use the recovered cached view of the verified CorBor–2 field on 0.4m with browser raster/timing; native GDI/x87/runtime identity is unverified. Observational Results in the analyser lists only your confirmed z with a derived v = c z (float32, Number arithmetic) as a browser table with text/CSV downloads and browser printing; no native results file, record layout or printing equivalence is claimed.

## E02 · Large-scale structure (LSS)
**Criteria**
1. Choose a survey field.
2. Acquire many galaxies and record their redshifts.
3. Plot the wedge from your own records and describe the structure.

**Status** — Not closed. Field selection and multi-galaxy acquisition are missing (audit §3); phase 3 work.

**Evidence** — The wedge only plots a supplied `.TXT`. No closure claimed.

## E03 · Stellar classification
**Criteria**
- S1. Load and verify an original practice spectrum (any of the 25).
- S2. Compare it with adjacent atlas standards (atlas, pair, Previous/Next, or Standard − practice).
- S3. Mark a line from the full spectral line table on every pane.
- S4. Measure an equivalent width anywhere in the selected spectrum's allowed interval (its own grid ∩ 3500–7400 Å). The tool must cover this interval; using it is optional for the learner.
- S5. Enter your own type and reasoning, review it (Cancel/Escape keep the draft), and record it. Nothing is graded.
- S6. Save the investigation, reload, and Restore it in a fresh context with the same classification, line and width.
- S7. View the sampled/combined traces reversed with Reverse trace displays (view-only).

**Status** — Scoped web student path complete, technically validated and reviewed on 2026-10-27 (guide 1.6 and tools 1.10a/b/c). Together with E04, E05 and E06 this closes 4 of the 7 agreed web exercise paths. Phase-1 item 1.12 now delivers confirmed analyser redshift results, and item 1.11 folds technical notes on the necessary analyser/Hubble pages; other contexts remain outside that bounded change. This status does not close every native classification branch.

**Evidence** — Build/typecheck passed; 3039 unit tests across 246 files and all 1281 resource size/SHA checks passed. All 13 actual-App guide/reverse-trace cases passed, including all 25 practice loads, a wide equivalent width, keyboard/source changes, errors/cancellation and exact Save/fresh-context Restore; 141 affected browser regressions and two desktop/mobile visual cases passed without skips or retries. Three independent analytic/default-output probes passed on the earlier identical numerical runtime. Separate Opus 5.5 high whole-functionality review and closure review completed; both confirmed guide defects were independently reproduced and corrected before closure. Executable evidence: `tests/classification-guide.spec.ts`, `tests/classification-reverse-trace.spec.ts`, `src/core/classificationLab.test.ts`, `src/core/sampledTraceReverse.test.ts` and the width/cursor tests. No native-runtime equivalence or answer grading is claimed.

**Web adaptations**
- The guide, its checklist and the line table are web presentation.
- Equivalent width is limited to the recovered 3500–7400 Å Range envelope and the source's own grid; nothing is extrapolated.
- The web checkbox directly exposes the recovered sampled-trace inversion; native option-dialog delivery and browser pixels are not reproduced.

## E04 · Pleiades photometry
**Criteria**
1. Load the Pleiades list and point the telescope at an admitted star.
2. Activate the photometer and measure B and V.
3. Record readings in the notebook and form B−V pairs.
4. Cover the agreed 16 admitted stars (plan item 1.7), not all 24.
5. Fit the cluster sequence manually and estimate the distance.
6. Save and restore the investigation.

**Status** — Scoped web path complete (16 admitted stars).

**Evidence** — `b1db397` plus QA3: all 16 transcribed B/V pairs, manual fit, Save and fresh-context Restore.

**Web adaptations** — 8 of the 24 stars stay unmeasurable in this profile; the guide is web presentation.

## E05 · Cluster HR diagrams
**Criteria**
1. Plot a reference cluster from the database and fit it.
2. Plot your own Pleiades B/V pairs in Data from Observations.
3. Fit and compare both sequences yourself.

**Status** — Scoped web path complete (database reference path and own-B/V bridge).

**Evidence** — 10 reference HR tests plus 8 own-B/V bridge tests; separate whole/closure review at `8147472`.

**Web adaptations** — Browser axes and Number arithmetic stand in for native GDI/x87 drawing.

## E06 · Pulsars
**Criteria**
1. Start the pulsar exercise with the original catalog.
2. Follow all eight steps of the Pulsars guide, recording at two frequencies.
3. Compare the delay with the dispersion measure and the period with P (plan item 1.4).
4. Save and restore the investigation in a fresh context.

**Status** — Scoped web path complete.

**Evidence** — `29e9bfa`: eight-step guide plus fresh-context Save/Restore; 16 student tests passed.

**Web adaptations** — The guide is web presentation; browser timing is not a native timing witness.

## E08 · Object X
**Criteria**
1. Image the field with the CCD camera.
2. Measure positions over several nights.
3. Identify the moving object and describe its orbit.

**Status** — Not closed. CCD, astrometry and data files are missing (audit §3); phase 3 work.

**Evidence** — None. No closure claimed.
