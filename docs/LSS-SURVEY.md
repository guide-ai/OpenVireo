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

Session persistence (M6, session v27) is not done yet.

## Acquirable rows (0.4 m / 0.9 m / 4 m, of 219)
129 / 69 / 130.

Per field on the 0.4 m: F1 13, F2 10, F3 12, F4 8, F5 11, F6 13, F7 20, F8 16, F9 26.

Three rows select a coincident neighbour by the nearest rule (12550+2749 → NGC 4842, 15384+2831W/S → 15384+2831E). They are shown as such.

## Adaptations (one line each)
- The telescope is the student's choice among the three verified profiles; the exercise-mode-5 telescope entry is not recovered.
- Each pointing builds a fresh field centred on the HTL coordinates; there is no cache pan.
- The raster is the nearest-centre browser raster, not Windows pixel identity.
- The range is fixed at 4000–5000 Å with the GLXYTMPL.SP template. Galaxies with their own GLXYSP.LST spectrum (NGC 4670, NGC 4889) stay unavailable; both are also QSO-gated, so NGC4670.SP is not wired yet.
- Measurement uses a dedicated panel on the analyser's recovered shift-control contract.
- Record Z follows the recovered LSS branch, but the creation function 0x57c918 and the dialog bodies are not recovered.
- Records go to the wedge directly with their exact values, not through the native .TXT writer 0x57af74.
- Results are saved in an OpenVireo CSV format.
- Stars come from bounded GSC read witnesses (`data/lss`); arithmetic uses Number, not x87.

## Not recovered
QSO merge 0x597f90/0x5987e4, photographic association, variable classes 0–2, the exercise-mode-5 entry, 0x57c918 / TLSSRsltsDlg1 FormActivate and OK, TLSSFieldsForm1 FormShow and LoadSelection1Click (LSSFields.LST is parsed by its evident text format), and the wedge .TXT writer.
