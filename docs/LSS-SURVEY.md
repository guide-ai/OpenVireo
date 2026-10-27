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

Save/Restore (session v27, `src/io/lssInvestigation.ts`): the investigation file wraps an unchanged v1–v26 base and stores the field, telescope, every record with its exposure journal (seed + events) and shift control, the description and the committed wedge options. Records that come from the same exposure share one stored journal, and each journal's events are one compact string (`s` start, `p` pause, a tick as its milliseconds, `100*600` for repeated ticks; about 4–9 bytes per event even when every tick differs). Bounds: 250 records; 150 000 events over the distinct exposures, refused at Record Z with an inline message; a 4000-character description, validated inline; and the serialized E02 part is capped at 4 MiB, so it leaves at least 12 MiB of the 16 MiB file to the other exercises. An E02 save failure has its own message. Restore replays every journal on its bundled pack, re-derives z and velocity from the control, checks a SHA-256 over those derivatives and rejects the whole file on any mismatch. Not saved: an open Record Z dialog, the current unrecorded exposure and the wedge's plotted points. Restore removes the wedge's own LSS points and sets its options to the file's (or the defaults), so a re-plot never duplicates points. Save and Restore evaluate each (field, row, telescope) once and replay each journal once; Save's self-check reuses the verification of the identical payload.

## Guide
The header button **LSS guide** (`src/LssLabGuide.tsx`, progress in `src/core/lssLab.ts`) lists seven steps: load a list, take a spectrum, record a redshift, repeat (5 different galaxies — distinct selected catalogue galaxies — a guide threshold chosen here and labelled so in the UI, not an original requirement), plot in the wedge, describe, save. Each check is recomputed from the current state; nothing is stored and no redshift is judged. "Save" is checked when the current records were saved or restored.

## Tests
Vitest: lssFields, lssLists, fieldEngine, lssPacks, lssSurvey, lssLab, io/lssInvestigation. Playwright: tests/lss-survey.spec.ts, lss-survey-negative.spec.ts, lss-session.spec.ts, lss-guide.spec.ts.

## Acquirable rows (0.4 m / 0.9 m / 4 m, of 219)
129 / 69 / 130.

Per field on the 0.4 m: F1 13, F2 10, F3 12, F4 8, F5 11, F6 13, F7 20, F8 16, F9 26.

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
QSO merge 0x597f90/0x5987e4, photographic association, variable classes 0–2, the exercise-mode-5 entry, 0x57c918 / TLSSRsltsDlg1 FormActivate and OK, TLSSFieldsForm1 FormShow and LoadSelection1Click (LSSFields.LST is parsed by its evident text format), and the wedge .TXT writer.
