# E02 Large-scale structure survey

Route `#lss-survey` (`src/LssSurvey.tsx`). Field names and centres come from the byte-exact LSSFields.LST; the photographic-image gate reads the byte-exact GLIMAGES.LST; the spectrum-mapping gate reads the byte-exact GLXYSP.LST. The student path:
1. Choose a field and a telescope.
2. Load the original LSS_Field0N.HTL. The app checks its size and SHA-256 before parsing it.
3. Read the status of each row.
4. Point at a row and view the telescope field with the slit.
5. Activate, start and pause the exposure in real time.
6. Measure z with the analyser's shift control and the GLXYLNS.LST lines.
7. Record Z: the "Measured Redshift Data" dialog. OK adds one record; Cancel and Escape add nothing.
8. Look at the results list and save it as CSV.
9. Plot your own records in the wedge (`#lss-wedge`).
10. Write a free-text description (not graded).

Save/Restore (session v27, `src/io/lssInvestigation.ts`): the investigation file wraps an unchanged v1–v26 base and stores the field, telescope, every record with its exposure journal (seed + events) and shift control, the description and the committed wedge options. Records that come from the same exposure share one stored journal, and each journal's events are one compact string (`s` start, `p` pause, a tick as its milliseconds, `100*600` for repeated ticks; about 4–9 bytes per event even when every tick differs). Bounds: 250 records; 150 000 events over the distinct exposures, refused at Record Z with an inline message; a 4000-character description, validated inline; and the serialized E02 part is capped at 4 MiB, so it leaves at least 12 MiB of the 16 MiB file to the other exercises. An E02 save failure has its own message. Restore replays every journal on its bundled pack, re-derives z and velocity from the control, checks a SHA-256 over those derivatives and rejects the whole file on any mismatch. Not saved: an open Record Z dialog, the current unrecorded exposure and the wedge's plotted points. Restore removes the wedge's own LSS points and sets its options to the file's (or the defaults), so a re-plot never duplicates points. Any Restore, including an older v1–v26 file, replaces the wedge state this way: wedge options are saved only inside the E02 part, so a student who used the wedge with supplied `.TXT` files alone gets the default options back (loaded `.TXT` files are kept). Save and Restore evaluate each (field, row, telescope) once and replay each journal once; Save's self-check reuses the verification of the identical payload.

## Guide
The header button **LSS guide** (`src/LssLabGuide.tsx`, progress in `src/core/lssLab.ts`) lists seven steps: load a list, take a spectrum, record a redshift, repeat (5 different galaxies — distinct selected catalogue galaxies — a guide threshold chosen here and labelled so in the UI, not an original requirement), plot in the wedge, describe, save. Each check is recomputed from the current state; nothing is stored and no redshift is judged. "Save" is checked when the current records were saved or restored.

## Tests
Vitest: lssFields, lssLists, fieldEngine, lssPacks, lssSurvey, lssLab, io/lssInvestigation. Playwright: tests/lss-survey.spec.ts, lss-survey-negative.spec.ts, lss-session.spec.ts, lss-guide.spec.ts.

## Acquirable rows (0.4 m / 0.9 m / 4 m, of 219)
157 / 86 / 158 without a clock time (Front T, TRUE variable dispatch, 2026-10-28); 140 / 76 / 141 before it, 129 / 69 / 130 before
the recovered FALSE dispatch. Five more rows are acquirable with the frozen observatory-clock time (below).

Per field on the 0.4 m: F1 14, F2 14, F3 12, F4 8, F5 12, F6 13, F7 20, F8 20, F9 27.

Variables (2026-10-28, coordinator decision): every CLEA_VStrs.dat variable whose time update the dispatch 0x51ec48 returns
false without side effects (period 0, word 0 unless class 1, or class 3) takes the false-merge branch, one after another in
the stage's (RA, Dec) order (0x492728 under 0x4bc950; fieldEngine.ts `variableDispatch: 'recovered'`, now the default). Eleven rows became acquirable (F1R6, F2R12, F2R15,
F2R17, F2R25, F5R20, F8R1, F8R2, F8R3, F8R24, F9R22); F2R16, F3R5, F4R3 and F4R5 now stay unavailable only for the QSO merge.
The 45 changed M0 entries are listed in data/hubble/existing-target-fingerprints.json (`updates`). Rows with a variable of
another class keep the typed variable-merge reason.

TRUE dispatch (Front T, 2026-10-28; plan analysis/front-plans/front-t-true-dispatch.md, `variableDispatch.ts`): a variable whose
dispatch returns true (classes 0/1/2, period ≠ 0, word ≠ 0 or class 1) modifies the star at the saved index (hit, < 30″) or is
inserted after the RA cursor walk (miss), with the model's V, colours and spectral code at the field's time. 22 TRUE variables
lie in 30 LSS rows:
- 17 rows become acquirable without a time, because every modified or inserted star's 99×99 stamp misses the 312² crop and no
  galaxy is within the merge guard: F1 r17, r20; F2 r9, r23; F3 r16, r17, r21; F4 r0, r3, r22; F5 r18, r21, r23; F6 r5, r9,
  r10; F8 r19 (0-based row indices).
- 5 rows need the time (a variable star is in view): F1 r19, F3 r18, F6 r7, F6 r8, F8 r21. Without it they are
  `variable-time-required`.
- 8 rows stay QSO-gated: F1 r2, F3 r2, F3 r22, F4 r18, F5 r20, F6 r11, F7 r17, F7 r20.
An independent Python witness (data/variables/lss-true-dispatch-witness.json) gives the same classes, hit/miss and stars.
The 90 changed M0 LSS entries are listed in data/hubble/existing-target-fingerprints.json (`updates`); no Hubble pair changed.

Time (Front T, recovered 0x487bcc; adaptation): VIREO reads the variable stage's time from the observatory clock, host Now + the user's offset (0x5384b0, 0x58b2ec), which is not deterministic. The web freezes the observatory-clock JD (siteClock/clockDrive) when the list's fields are built, shows it in the list caption, stores it per record and saves it in the v30 investigation wrapper (`lssFieldJds`), so a restore replays the same magnitudes. Without a clock time, or from a file older than v30, a row whose field needs the time stays unavailable (`variable-time-required`) and a record on such a row does not restore.

Own records hand over to the wedge at pixel level: the plotted pixel fields equal those of the equivalent Z-column text row for all 219 rows (lssSurvey.test.ts); the angle may differ by about 1e-14 degrees.

Three rows select a coincident neighbour by the nearest rule (12550+2749 → NGC 4842, 15384+2831W/S → 15384+2831E). They are shown as such.

## Adaptations (one line each)
- The telescope is the student's choice among the three verified profiles; the exercise-mode-5 telescope entry is not recovered.
- Each pointing builds a fresh field centred on the HTL coordinates; there is no cache pan.
- The raster is the nearest-centre browser raster, not Windows pixel identity.
- The range is fixed at 4000–5000 Å with the GLXYTMPL.SP template. Galaxies with their own GLXYSP.LST spectrum (NGC 4670, NGC 4889) stay unavailable. Both are QSO-gated first, so NGC4670.SP stays unwired: no reachable path could use it. The spectrum-mapping gate (in lssExposure.ts, not the engine: any other engine consumer must apply it too) and the `mapped==[]` assertion in lssPacks.test.ts are kept as a tripwire for when the QSO merge is ported.
- Pointing a row goes straight to its fresh field: no dome, slew, horizon/time check or tracking.
- Measured Redshift Data: Object is read-only as in the original; RA/Dec are decimal and fixed; velocity is computed as c·z (original edits RA/Dec h m s and velocity); JD is read when Record Z is clicked.
- Measurement uses a dedicated panel on the analyser's recovered shift-control contract.
- Record Z follows the recovered LSS branch, but the creation function 0x57c918 and the dialog bodies are not recovered.
- Records go to the wedge directly with their exact values, not through the native .TXT writer 0x57af74.
- Results are saved in an OpenVireo CSV format.
- Stars come from bounded GSC read witnesses (`data/lss`); arithmetic uses Number, not x87.

## Not recovered
QSO merge 0x597f90/0x5987e4, photographic association, variable classes 0–2 whose dispatch reaches a light curve, the exercise-mode-5 entry, 0x57c918 / TLSSRsltsDlg1 FormActivate and OK, TLSSFieldsForm1 FormShow and LoadSelection1Click (LSSFields.LST is parsed by its evident text format), and the wedge .TXT writer.
