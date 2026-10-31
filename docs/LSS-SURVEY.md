# E02 Large-scale structure survey

Route `#lss-survey` (`src/LssSurvey.tsx`). Field names and centres come from the byte-exact LSSFields.LST; the photographic-image gate reads the byte-exact GLIMAGES.LST; the spectrum-mapping gate reads the byte-exact GLXYSP.LST. The student path:
1. Choose a field and a telescope.
2. Load the original LSS_Field0N.HTL. The app checks its size and SHA-256 before parsing it.
3. Read the status of each row.
4. Point at a row and view the telescope field with the slit.
5. Activate, start and pause the exposure in real time.
6. Measure z with the analyser's shift control and the GLXYLNS.LST lines.
7. Record Z: the "Measured Redshift Data" dialog. OK adds one record, or updates the row of an object already recorded (see
   "Re-measuring an object" below); Cancel and Escape change nothing.
8. Look at the results list and save it as CSV.
9. Plot your own records in the wedge (`#lss-wedge`).
10. Write a free-text description (not graded).

Save/Restore (session v27, `src/io/lssInvestigation.ts`): the investigation file wraps an unchanged v1–v26 base and stores the field, telescope, every record with its exposure journal (seed + events) and shift control, the description and the committed wedge options. Records that come from the same exposure share one stored journal, and each journal's events are one compact string (`s` start, `p` pause, a tick as its milliseconds, `100*600` for repeated ticks; about 4–9 bytes per event even when every tick differs). Bounds: 250 records; 150 000 events over the distinct exposures, refused at Record Z with an inline message; a 4000-character description, validated inline; and the serialized E02 part is capped at 4 MiB, so it leaves at least 12 MiB of the 16 MiB file to the other exercises. An E02 save failure has its own message. Restore replays every journal on its bundled pack, re-derives z and velocity from the control, checks a SHA-256 over those derivatives and rejects the whole file on any mismatch. Not saved: an open Record Z dialog, the current unrecorded exposure and the wedge's plotted points. Restore removes the wedge's own LSS points and sets its options to the file's (or the defaults), so a re-plot never duplicates points. Any Restore, including an older v1–v26 file, replaces the wedge state this way: wedge options are saved only inside the E02 part, so a student who used the wedge with supplied `.TXT` files alone gets the default options back (loaded `.TXT` files are kept). Save and Restore evaluate each (field, row, telescope) once and replay each journal once; Save's self-check reuses the verification of the identical payload.

## Guide
The header button **LSS guide** (`src/LssLabGuide.tsx`, progress in `src/core/lssLab.ts`) lists seven steps: load a list, take a spectrum, record a redshift, repeat (5 different galaxies — distinct selected catalogue galaxies — a guide threshold chosen here and labelled so in the UI, not an original requirement), plot in the wedge, describe, save. Each check is recomputed from the current state; nothing is stored and no redshift is judged. "Save" is checked when the current records were saved or restored.

## Tests
Vitest: lssFields, lssLists, fieldEngine, lssPacks, lssSurvey, lssLab, io/lssInvestigation. Playwright: tests/lss-survey.spec.ts, lss-survey-negative.spec.ts, lss-session.spec.ts, lss-guide.spec.ts.

## Acquirable rows (0.4 m / 0.9 m / 4 m, of 219)
196 / 93 / 198 without a clock time (Front F3, the five LSS galaxy photographs, 2026-10-30); 187 / 93 / 189 before them (Front L2,
recovered QSO merge, 2026-10-29); 157 / 86 / 158 under the earlier QSO gate
(Front T, TRUE variable dispatch, 2026-10-28), 140 / 76 / 141 before it, 129 / 69 / 130 before the recovered FALSE dispatch.
More rows are acquirable with the frozen observatory-clock time (below).

Per field on the 0.4 m under the QSO gate (before Front L2): F1 14, F2 14, F3 12, F4 8, F5 12, F6 13, F7 20, F8 20, F9 27.

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
- 8 of these rows were also QSO-gated (F1 r2, F3 r2, F3 r22, F4 r18, F5 r20, F6 r11, F7 r17, F7 r20); Front L2 removes that gate (below).
An independent Python witness (data/variables/lss-true-dispatch-witness.json) gives the same row classes, hit/miss and stars. It is
narrower than the engine (post-cleanup galaxies, no QSO positions in the guard, no FALSE/indeterminate/fault outcomes) and does not
vouch for the OK/mean-bound statuses or the counts, which come from the TypeScript engine only.
The 90 changed M0 LSS entries are listed in data/hubble/existing-target-fingerprints.json (`updates`); no Hubble pair changed.

Time (Front T, recovered 0x487bcc; adaptation): VIREO reads the variable stage's time from the observatory clock, host Now + the user's offset (0x5384b0, 0x58b2ec), which is not deterministic. The web freezes the observatory-clock JD (siteClock/clockDrive) when the list's fields are built, shows it in the list caption, stores it per record and saves it in the v30 investigation wrapper (`lssFieldJds`), so a restore replays the same magnitudes. Without a clock time, or from a file older than v30, a row whose field needs the time stays unavailable (`variable-time-required`) and a record on such a row does not restore.

Own records hand over to the wedge at pixel level: the plotted pixel fields equal those of the equivalent Z-column text row for all 219 rows (lssSurvey.test.ts); the angle may differ by about 1e-14 degrees.

Three rows select a coincident neighbour by the nearest rule (12550+2749 → NGC 4842, 15384+2831W/S → 15384+2831E). They are shown as such.

## Adaptations (one line each)
- The telescope is the student's choice among the three verified profiles; the exercise-mode-5 telescope entry is not recovered.
- Each pointing builds a fresh field centred on the HTL coordinates; there is no cache pan.
- The raster is the nearest-centre browser raster, not Windows pixel identity.
- Front S2 (2026-10-31): the range is VIREO's default 3700–4700 Å (the page's one spectrometer range), so Ca K and H are in view on every acquirable row; where the shifted template starts above 3700 Å the blue bins are VIREO's start-time continuation (0x55e97c). The acquirable rows are unchanged (196/93/198). 4000–5000 Å, the earlier web range, is also witnessed; a record saved before S2 carries no range mark and keeps it. Other ranges are refused [W]. The template is GLXYTMPL.SP, except the galaxies with their own GLXYSP.LST spectrum: NGC 4670 (NGC4670.SP) and NGC 4889 (NGC4889.SP) are observed with it (Front L2). A listed spectrum that is not bundled keeps the typed `spectrum-mapping` reason (lssExposure.ts).
- Pointing a row goes straight to its fresh field: no dome, slew, horizon/time check or tracking.
- Measured Redshift Data (Front L2): see below. RA/Dec are read-only h m s / d m s boxes (the original discards edits to them); Cancel adds nothing (the original inserts the record before the dialog opens, 0x57c918, and Cancel never removes it), and on a reused row it changes nothing (the original keeps the new z, RA and Dec with the old velocity; the web keeps every row inside the 1 % rule restore checks) [W]; JD is read when Record Z is clicked.
- Measurement uses a dedicated panel on the analyser's recovered shift-control contract.
- Record Z follows the recovered LSS branch; 0x57c918 (find-or-add) and the dialog bodies are recovered (Front L2, below).
- Records go to the wedge directly with their exact values. The native .TXT writer 0x57af74 is ported for Save Data (.TXT) (Front L2, below).
- Results are saved in an OpenVireo CSV format.
- Stars come from bounded GSC read witnesses (`data/lss`); arithmetic uses Number, not x87.

## Not recovered
Photographic association, variable classes 0–2 whose dispatch reaches a light curve, the exercise-mode-5 entry, and TLSSFieldsForm1 FormShow and LoadSelection1Click (LSSFields.LST is parsed by its evident text format). The QSO merge, TLSSRsltsDlg1 (0x57c918, FormActivate, OK) and the .TXT writer 0x57af74 are ported by Front L2 (below).

## Front L2 (2026-10-29; plan analysis/front-plans/front-l2-lss.md)
Static reading of CLEA_VEO.exe only; addresses, evidence ids and SHA-256 in [LSS-L2-PROVENANCE.json](LSS-L2-PROVENANCE.json); research `analysis/front-l2-lss/` (rsltsdlg-txt-findings.md, rgndlg-findings.md, dossiers
with SHA-256). This section supersedes the "Not recovered" list above for the items it names.
- **QSO merge.** LSS rows run the recovered QSO merge (0x5987e4/0x597f90, `qsoMerge.ts`) on the bundled CLEA_QSO.DAT, as the
  Hubble engine fields do. 35 rows (105 row/telescope entries) were QSO-gated; exactly those entries change in
  `data/hubble/existing-target-fingerprints.json` (`updates`, 2026-10-29), nothing else. 23 of them (F4R2, NGC 4889, among them) become
  acquirable on the 0.4 and 4 m and stay mean-bound on the 0.9 m; F3R1 (NGC 4670) only on the 4 m; F1R15, F3R23, F4R11, F5R13, F7R21, F8R10 become acquirable on all three and
  F8R11 selects a neighbour; F3R5, F6R17, F7R18 are stamp-bound and F6R12 needs the clock time.
- **Own spectra.** NGC4670.SP is bundled byte-exact (27616 bytes, SHA-256 228149e9…170a, CLEA_Vireo.zip
  `program files/CLEA/VIREO/Spectra/Galaxies/`, user approval of 2026-10-27, group 1). NGC 4670 (F3 row 1) is acquirable on
  the 4 m (mean-bound on the 0.4/0.9 m); NGC 4889 (F4 row 2) on the 0.4 and 4 m. Saved investigations v27–v30 restore
  unchanged: every row that was not QSO-gated evaluates byte-identically.
- **Save / Print spectrum.** The LSS and galaxy routes offer Save spectrum (.SSP) and Print spectrum with the recovered writer
  (Save 0x50fb1c, header 0x510090; docs/SPECTRUM-SAVE-CONTRACT.md). LSS header: the selected catalogue galaxy, the row's HTL
  coordinates and that galaxy's catalogue magnitude.
- **Measured Redshift Data** (TLSSRsltsDlg1; FormActivate 0x57cab8, OK 0x57cd80; coordinator decision of 2026-10-29). The
  dialog shows JD (6 decimals), RA h m s.ss and Dec ±d m s.s, and z as its 4-significant-digit text (`2.345E-02`). The student
  types the velocity: it is blank on open unless the row is reused (its earlier velocity, Front L3) or Compute Rdshft Vel. is
  on (c·z, Front R3); the option is off by default. OK stores z re-read from that
  text and the typed velocity (both Single); a velocity that does not convert shows "Velocity is incorrect or missing! You must
  supply a valid velocity for plotting." (Velocity Error!), one more than 1 % from c·z shows "Velocity calculation is
  invalid!", and the dialog stays open [D]. [W] within 1e-12 of the 1 % limit the velocity is refused, as on the Hubble route.
  [W] With z = 0 the web shows "Velocity calculation is invalid!"; natively the division by zero raises an x87 exception that
  reaches the program's default error box.
  Session: records made this way are listed in a v31 wrapper (`lssNativeDialogIds`, policy `openvireo-lss-dialog-v31`) around
  the unchanged v27–v30 layers; restore checks their stored z against the replayed z's 4-digit text and their velocity against
  the 1 % rule. Records from v27–v30 files keep the c·z rule and restore exactly as before.
- **Save Data (.TXT).** The native LSS results writer 0x57af74 with row 0x57b8e4 (`core/lssResultsTxt.ts`): header
  `Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments`, then per record Copy(ID,1,11) padded to 12, the JD
  text without its first 3 characters, RA h m s (1 decimal), Dec ° ' " (0 decimals), V as `d.dddE+dd ` (the number then a
  space, left-padded to 12 columns; blank when 0) and the remarks, CR LF, Windows-1252; default name `LSS_Redshifts.TXT`. The
  wedge's Load Saved Data reads it back with V and the first word of the remarks (tested). [W] browser download, remarks cut
  to 36, rows in the order they were recorded (natively the list's sorted (time, RA) order; they differ only if the site
  clock was moved backwards).
- **LSS Galaxy Data (instructor).** File › "LSS Galaxy Data..." is visible natively only when the LSS exercise starts with Edit
  Mode on (LargeScaleStructure1Click 0x58aad3 is the only Visible writer). The web shows it in `#lss-survey` while Edit Mode is
  on. TLSSRgnDlg (FormShow 0x5853f4, OK 0x585510): six bounds with the native texts, "Parameters contain non-numeric data!" /
  "Parameters are inconsistant!" (original spelling) in "Input Error!"; 0x584d0c lists every CLEA_GLX.DAT galaxy with
  Zmin ≤ z ≤ Zmax, RAmin ≤ RA ≤ RAmax, DecMin ≤ Dec ≤ DecMax (inclusive, z first), the Retain / Confirm prompts and the
  "Search Results" summary. Natively the rows go into the observation results list with velocity unwritten; the web lists
  them in their own table [W] with Save Data (.TXT) (velocity column blank, `LSS_Galaxy_Data.TXT`); they are not saved with
  the investigation. Catalogue redshifts are the E02 answers, so the table's z and the summary's "Range in Z" show
  "hidden (instructor value)" (as Catalog Object masks z) and the rows are not handed to the wedge, which would plot them by
  z [W, coordinator decision of 2026-10-29]. [W] For the same reason the Z bounds are disabled while z is masked, with the note
  "Z range uses the masked catalogue redshift": they are not applied, so only the RA and Dec bounds select (applying the native
  z filter would reveal z through the found counts). The .TXT carries no z column and no velocity. Counts per box remain visible.
- Not ported: Auto Plot and the group results file 0x57c710. (Wedge Print is ported by Front P; docs/WEDGE-PLOT.md.)


## Re-measuring an object: Time-Dependent Data (Front L3, 2026-10-30)

Record Z calls the list's find-or-add 0x57c918 [D]. With the Time-Dependent Data option off (env+0x2e8c = 0, VIREO's compiled
default 0x5a2a39), it scans the records first to last and reuses the first whose stored ID (ShortString[15]) equals the measured
object's ID exactly and case-sensitively (LStrCmp 0x406258). A longer ID never matches its own truncated copy. The reused row
keeps its first time (+0x10) and its list position. Record Z writes the new z, RA and Dec into it, and the dialog
(FormActivate 0x57cab8) opens with the row's earlier velocity (ffExponent 4) and remarks. With the option on, every Record Z
adds a row.

- **Here:** the default is the same reuse.
  - A reused row also takes the new exposure: journal, control, field, row, telescope and frozen field JD.
  - The dialog says it updates the earlier row. OK applies the usual 1 % check, so after a changed z the student types a new
    velocity.
  - Cancel leaves the row unchanged [W].
- **Wedge:** once a row that was already plotted is reused, the next "Plot my records in the wedge" replaces the wedge's own
  points with the whole list, as OK's PlotData re-plots the whole list natively.
- **Files:** they keep the v27–v31 format.
  - Older files whose rows repeat an object (made when every OK appended) restore unchanged and are never merged. The next
    Record Z reuses the first of them.
  - The option belongs to Optical Simulation Options and lasts for the page session only, like the others ported there.
- **Re-pinned 2026-10-30:**
  - `tests/lss-guide.spec.ts` (five Record Z on one galaxy now give 1 record, so the totals are 5 records of 5 galaxies,
    no longer 9);
  - the `src/core/lssSurvey.test.ts` record-limit and event-budget cases, which fill the list with one object and now
    run with Time-Dependent Data on.

## Photographed galaxies (Front F3, 2026-10-30)
The user approved on 2026-10-30 the five galaxy photographs GLIMAGES.LST associates with LSS rows: NGC4150.BMP, NGC4274.BMP,
NGC4278.BMP, NGC4314.BMP and NGC4793.BMP, byte-exact in `public/original/images/` (`src/core/approvedPhotographs.ts`). The LSS
inputs pass them, with the Object X four, through the field engine's `photographs` option (association 0x598ed2..0x599128, draw
0x597290; `photographDraw.ts`); the field engine is unchanged. The 9 rows that were `photographic-image` (F1R9 NGC 4150, F1R19
NGC 4253, F1R22 NGC 4274, F2R1 NGC 4278, F2R2 NGC 4283, F2R4 NGC 4286, F2R5 NGC 4308, F2R7 NGC 4314, F3R8 NGC 4793) are now
available on the 0.4 m and 4 m, each selecting its own galaxy, and `mean-bound` on the 0.9 m (the web guard in
`FIELD_CALIBRATIONS`, which waits for the field-engine owner). Measurement: analysis/front-f3/lss-photographs-measure.tsv.

## LSS stars are not acquired [W] (Front S, decision D5, 2026-10-29)

When the nearest catalogue object in an LSS row's slit is a star, the row stays unavailable (`star-selected`): the survey
acquires galaxy spectra only. VIREO would give that star's spectrum there (z ≈ 0), through the same star path the Object X
and catalogue-star routes use. Turning it on would change E02's available-row counts (196/93/198 since Front F3) and the LSS fixtures, so it
is a separate follow-up. LSS galaxy spectra can be classified through Save .SSP and Classify's import (docs/CLASSIFICATION-IMPORT.md).

**Measured 2026-10-30 (Front L3).** All 219 rows were evaluated on the three telescopes (657 evaluations), with the field
engine's star path enabled through JSPEC2.SPI. The 18 rows that need a clock time were also evaluated at four JDs.
- **No evaluation selects a star:**
  - 72 of the 657 evaluations end before any slit selection: photographic-image 27 and stamp-bound 45 (before Front F3; the 27 photographic-image evaluations
    now select their own galaxy or are mean-bound).
  - In every other evaluation the selected object is a galaxy: the row's own galaxy or a neighbouring galaxy. This includes
    the 18 rows that need a clock time, evaluated at four JDs.
  - No QSO is selected either.
- **The counts:** they stayed 187/93/189 (196/93/198 after Front F3), and no star template is needed (measurement:
  analysis/front-plans/front-l3-star-measure.txt).
- **Free pointing:** VIREO reaches a star in the strip only by pointing the observatory freely. Recording such a star into the
  LSS list would take Record Z from the general spectrometer in LSS mode, a cross-front follow-up.
