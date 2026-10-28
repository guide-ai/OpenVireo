# Student exercise board (VIREO, 7 exercises)

"Done" follows audit decision 2 ([AUDITORIA-Y-PLAN-2026-10-26.md](AUDITORIA-Y-PLAN-2026-10-26.md) §4–5): a student completes the exercise in the app with a guide, an end-to-end test covers that path, and web adaptations are labelled in one line. Native fidelity of peripheral branches is not a closing requirement. Criteria list student steps only; status and evidence are kept separately and change only after actual test and review results. Nothing here claims native equivalence.

## E01 · Hubble
**Criteria**
1. Acquire galaxy spectra with the telescope and spectrometer.
2. Measure each redshift in the analyser and keep it.
3. Combine your own velocities with distances and fit the Hubble relation yourself.
4. Save and restore the investigation.

**Status** — Scoped web student path complete for the agreed phase-2 minimum of eight galaxies, technically validated and separately reviewed on 2026-10-27. The earlier five plus NGC 7499/7501/7503 can be acquired on the 0.4m telescope; the earlier three retain their other verified profiles. Together with E03–E06, this closes 5 of the 7 agreed web exercise paths. Five of the original thirteen galaxies remain unavailable; this is not closure of all native branches or of the other phase-2 observatory items.

**Evidence** — Existing Hubble guide; audit §3. Phase-1 item 1.12 is technically validated and reviewed (2026-10-27): confirmed analyser z and derived velocity reach own Observational Results, deterministic text/CSV downloads and scoped browser printing; five actual-App cases include acquisition, confirmation/cancel, provenance/status, Unicode labels, Save/fresh Restore and append. Research notes on the necessary analyser/Hubble pages are folded while critical model and identity limits stay visible (1.11). Build/typecheck, 3049 unit tests, 1281 resource hashes and 90 distinct E2E cases passed; desktop/mobile visual inspection and separate high functionality review/closure completed. `tests/own-observation-results.spec.ts` and `src/core/ownObservationResults.test.ts` preserve executable evidence. At that phase-1 checkpoint acquisition covered 3 of 13; E01 was not closed.

Phase-2 B1 is technically validated and separately reviewed (2026-10-27): `tests/hubble-corbor.spec.ts` follows verified original Hubble.HTL loading, exact pointing, both new acquisitions, actual-count analysis, manual redshift, own Hubble results, Save/fresh Restore and continued acquisition. It also covers invalid/cancelled/late loads, unavailable telescope profiles and a 320px path. Build/typecheck, 3073 unit tests across 252 files, 1283 resource identities and 111 distinct actual-App E2E cases passed; after the review’s three confirmed text/provenance/test findings were corrected, build, all unit tests and 27 affected browser cases passed again. Desktop/mobile views were inspected. Numerical/state runtime code stayed identical during that closure. Earlier resource bytes and the earlier three targets’ independently frozen trajectories were preserved. This enables five targets and does not meet the minimum-eight exit criterion.

Phase-2 B2 is technically validated and separately reviewed (2026-10-27): `tests/hubble-pegasus.spec.ts` follows original Hubble.HTL loading and exact catalogue pointing for NGC 7499/7501/7503, acquisition of all eight supported targets, manual z, operator-entered sourced V, the student’s own Hubble fit, Save v25, fresh-context Restore and resumed acquisition. `tests/hubble-guide.spec.ts` covers the self-guided eight-target path and failed-import recovery. Unsupported telescope profiles, cancelled/late loads and 320px keyboard operation are covered. Build/typecheck, 3104 unit tests across 255 files, all 1289 resource identities and 114 distinct actual-App E2E cases passed without skips, retries or flaky cases. After the review’s confirmed guide/provenance metadata corrections, build/typecheck, 3105 unit tests, all resource identities and 19 affected browser cases passed again, including the complete eight-target path; repeated cases are not added to the distinct total. Desktop/mobile views were inspected. Separate high whole-functionality review and closure, with independent finding validation, completed. Four additional private controls checked three independent crop/calibration vectors, fifteen new trajectories and eleven previous target/profile fingerprints against the final scientific payload; they are not original-runtime witnesses. The four student criteria above are unchanged.

**Web adaptations** — CorBor–1/3 use the recovered cached view of the verified CorBor–2 field on 0.4m with browser raster/timing; native GDI/x87/runtime identity is unverified. Pegasus uses the recovered fresh/cached 0.4m field with the HI Peg class-3 false-update branch, and browser raster/timing; no variable light curve is invented. Observational Results in the analyser lists only your confirmed z with a derived v = c z (float32, Number arithmetic) as a browser table with text/CSV downloads and browser printing; no native results file, record layout or printing equivalence is claimed.

## E02 · Large-scale structure (LSS)
**Criteria**
1. Choose a survey field.
2. Acquire many galaxies and record their redshifts.
3. Plot the wedge from your own records and describe the structure.

**Status** — Scoped web student path complete, technically validated and separately reviewed on 2026-10-27 (independent review, two fix rounds and closure: research root `analysis/reviews/front-a-review-1.md`). With E01 and E03–E06 this closes 6 of the 7 agreed web exercise paths; E08 Object X remains. Acquirable rows of the 219 in the nine original lists: 129 on the 0.4 m, 69 on the 0.9 m, 130 on the 4 m. The rest show a typed reason (variable star classes 0–2, QSO in the field, galaxy image beyond the bounded raster, photograph in the field, brightness limit). This is not closure of every native branch.

**Evidence** — Merge `4800b36`. Build/typecheck, 1312 resource identities, the LSS, field-engine, wedge and session Vitest suites, and `tests/lss-survey.spec.ts`, `tests/lss-survey-negative.spec.ts`, `tests/lss-session.spec.ts` and `tests/lss-guide.spec.ts` passed: field choice, acquisition under a controlled clock, Record Z OK/Cancel/Escape, five distinct galaxies, results CSV, own records in the wedge, description, Save v27 and fresh-context Restore that continues observing, tamper/budget rejection, 320px keyboard. The engine reproduces the existing Hubble fields exactly, and the bounded packs are byte-equal to N2230/N3000 under the 2026-10-27 approvals. See `docs/FIELD-ENGINE.md` and `docs/LSS-SURVEY.md`.

**Web adaptations** — The survey route does not go through the observatory (no dome, slew, horizon/time check or tracking); students choose among the three verified telescopes because the exercise-mode telescope entry is not recovered; a fresh field per pointing (native cache/pan history not reproduced); a dedicated measurement panel on the analyser's shift/measure contract; Record Z shows fixed field-centre RA/Dec and a computed velocity, and takes JD at Record Z; own records go to the wedge directly instead of through the native `.TXT` writer; the five-galaxy guide threshold is a web choice; Number arithmetic, not x87.

## E03 · Stellar classification
**Criteria**
- S1. Load and verify an original practice spectrum (any of the 25).
- S2. Compare it with adjacent atlas standards (atlas, pair, Previous/Next, or Standard − practice).
- S3. Mark a line from the full spectral line table on every pane.
- S4. Measure an equivalent width anywhere in the selected spectrum's allowed interval (its own grid ∩ 3500–7400 Å). The tool must cover this interval; using it is optional for the learner.
- S5. Enter your own type and reasoning, review it (Cancel/Escape keep the draft), and record it. Nothing is graded.
- S6. Save the investigation, reload, and Restore it in a fresh context with the same classification, line and width.
- S7. View the sampled/combined traces reversed with Reverse trace displays (view-only).

**Status** — Scoped web student path complete, technically validated and reviewed on 2026-10-27 (guide 1.6 and tools 1.10a/b/c). Together with E01, E04, E05 and E06 this closes 5 of the 7 agreed web exercise paths. Phase-1 item 1.12 now delivers confirmed analyser redshift results, and item 1.11 folds technical notes on the necessary analyser/Hubble pages; other contexts remain outside that bounded change. This status does not close every native classification branch.

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
**Criteria** (follow the original manual, OBJXlab; user decision 2026-10-27)
1. Receive a target as an identifier and coordinates only; its identity stays hidden until revealed.
2. Observe it with the instruments that can tell the types apart: CCD images at different times, spectra, and the radio telescope.
3. Decide whether it is a star, galaxy, QSO, pulsar or asteroid, and justify the decision with your own observations.
4. For an asteroid: measure its positions on several images, derive its motion, and describe its orbit.
5. Save and restore the investigation.
6. All five object types in ObjectX.HTL can be investigated; E08 does not close on a subset.

**Status** — Not closed. Asteroid and pulsar investigations work with hidden identity (merges `66a4f38`, `9af0d29`, `121c835`, `724418a`, `0c8bbdf`; independent reviews and closures in the research root `analysis/reviews/front-c-review-1.md` and `front-x-review-1.md`): the CCD camera on CDS/VizieR, orbit files and the recovered ephemeris (ObjX_MPC.CMO.sav by default), the measuring tool with blink and residuals, the radio hand-off, v28 Save/Restore and the guide. Still missing: star, galaxy and QSO spectra at the target coordinates (field-engine front: QSO merge, photographic association, own spectra, star templates), then an end-to-end hidden-identity check for each of those three types. Camera static extracts are still pending because CDS has not answered.

**Evidence** — `tests/object-x-path.spec.ts`, `object-x-identity.spec.ts`, `object-x-radio.spec.ts`, `object-x-camera.spec.ts`, `object-x-measure.spec.ts`, `object-x-static-replay.spec.ts`, `camera-exposure.spec.ts` and the Object X/camera Vitest suites. No closure claimed.
