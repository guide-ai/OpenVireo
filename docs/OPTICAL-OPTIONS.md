# Optical Simulation Options (TOptionsDlg)

VIREO's instructor dialog "Optical Simulation Options" (CLEA_VEO.exe 781bc970…c54c, static reading only). OK
(`OKBtnClick` 0x5a6068) copies each control into the options record at Environment1+0x6b4, so env offset = record offset
+ 0x6b4. The defaults routine 0x5a21d0 sets the compiled values. No `VEO_OPTS.INI` ships with VIREO, so students see these
defaults. The research notes are in `analysis/front-r3-options/` and the plan in `analysis/front-plans/front-r3-options.md`.

## Instructor-mode gate (Front T1, 2026-11-06)
VIREO opens this dialog from File › Preferences (Preferences1Click 0x5886ac) only while the gate byte env+0x37d8 is set
(test at 0x5886c9) [D]. A byte search finds 8 sites. Writes: FormCreate clears it (0x587c2d); the Demonstration Mode branch at
start-up (0x587c6a) and Edit Mode in the options apply (0x587f70) and under Preferences OK (0x5887f0) set it; Login1Click
(entry 0x58816c, after "Instructor" and the compiled password at 0x5a316c) writes it once, at 0x5884a1, := (Retain Options
Access? answered Yes), so that one instruction opens or closes it; the question is skipped when Edit Mode is on (0x588468),
and Login also sets RunSep Enabled := gate (0x5884a7). Reads: 0x5886c9; 0x587d57 in 0x587d54, which shows and enables the
Preferences item (env+0x378) when the gate is open and four forms' +0x57 are clear (9 callers); and Login at 0x5884c9 (open →
0x587d54). So the gate controls only File › Preferences. With the gate closed Preferences shows the INSTRUCTOR /
`USER OPTIONS!` box (0x588a84 / 0x588b70, reached at 0x5889a6, MessageBox flags 0x30; the body passes through 0x405ec8 and the
helper 0x486ae0 first, as in the radio port).

In OpenVireo (`src/core/instructorMode.ts`, `src/components/InstructorMode.tsx`; user decisions of 2026-11-06):
- **Closed to students.** The Optical Simulation Options button shows the recovered `USER OPTIONS!` box, word for word, and one
  web line saying that Instructor mode… in the page header opens the options.
- **WEB-TM-01 [W] Instructor mode…** (page header, every route): a confirmation says it is the web form of VIREO's
  Demonstration Mode gate, that it needs no password and is not a lock, that it shows no answers and that it lasts for the page
  only. On opens the gate; a banner "Instructor mode (web): VIREO's Demonstration Mode gate. No password; it is not a lock."
  stays on every route with **Leave**. Only the gate write is ported; Demonstration Mode's DemoBox is live since Front T2 (below), and
  its skipped login has no web counterpart.
- **WEB-TM-02 [W] Leave** closes the gate and puts Edit Mode, Virtual Observatory and (since Front T3) Test Mode back to their
  compiled values (off), so "Edit Mode on ⇒ gate open" holds. VIREO has no such action.
- **One gate.** The radio card's Preferences follows the same gate (docs/RADIO-ACCESS-OPTIONS.md); its own Demonstration
  button is retired. Edit Mode on keeps it open (moved from the radio card).
- **Not ported:** Login, TPasswordDlg and TPasswordDlg1. The web never stores, compares, hashes or exports the compiled
  password (`compiled-password-not-ported` in `src/core/teacherDeferred.ts`).
- **Unchanged:** answer masks, exercise paths (the guides force their options without the dialog), saved investigations and
  the network. The gate itself is never saved; since Front T2 only Demonstration Mode, turned on in the options, is kept in
  the browser (below).

Recovery and evidence: `analysis/front-teacher/t1/RECOVERY.md` in the research root.

## Test Mode (Front T3, 2026-11-06)
TestBox1 (CCD tab; hint `In Test Mode coordinate settings and CCD exposures are instantaneous`) is written by OKBtnClick to
record+0x27c8 (0x5a60cc) = env+0x2e7c; the defaults routine writes 0 (0x5a2ac5) [D]. A byte search for the displacement finds 17
reads of env+0x2e7c, no write, and one read of the same byte through the embedded record (0x53bb00: env+0x6b4+0x27c8 = env+0x2e7c). In OpenVireo (`src/core/testMode.ts`) it is a live
check box of this dialog, so it is reachable only in instructor mode; it is off by default, lasts for the page session, is not
saved by the page, and the dialog's Reset and the banner's Leave turn it off (WEB-T3-01 [W]). Since Front T2 an options file
written by Save Updates carries it (record+0x27c8), and Load brings it back.

| Reader | VIREO with Test Mode on [D] | OpenVireo |
|---|---|---|
| CCD/IR exposure timer (TCCDCam.ObsTimerTimer 0x512b2c, read 0x512b39; TIRCam.ObsTimerTimer 0x514b5c, read 0x514b69) | Remaining seconds +0x3dc := 0 at the first 1000 ms tick instead of −1, so the exposure ends there. The image and the headers read the requested seconds +0x3e2 (0x5120c7, 0x512107, 0x512466, 0x51277d, 0x512a52), never +0x3dc; the observing date is taken at Go and the timer advances no clock. | The camera reads the option at each tick (`cameraTimerRemaining`). Same image, seed, draws, exposure length and headers; only the wait goes. |
| Multi-Spec SpecTimerTimer (0x52a1c4) | Elapsed +0x3dd := seconds +0x455, remaining +0x3c9 := 0; then the clock display, one S/N tick 0x52a58c and the ≤ 0.01 end test as usual. The S/N tick draws twice (0x55f0f4) from System.Random (RandSeed 0x5ae008), the stream the fibres also use, so VIREO's spectra get a different noise realisation from the same distribution. | `multiSpecTimerStep`: the exposure ends at the first tick; the spectra get the same t = seconds and fibre seeds, so they are identical, because the web's S/N estimate has its own stream [W]; the display-only S/N estimate has one tick. |
| ProgrammedSlew (0x539a1d → 0x539c4c; 0x539ce1 → 0x539cee..0x539e0f) | The no-slew box, the horizon check and the confirmation (with its B1950 note) are skipped; RA/Dec become the target's (0x53caec/0x53cb40 on the target globals), the axes are marked done and +0x64d := 0. +0x655 (hour-angle stamp) := the uninitialised local [ebp-0x18], written only at 0x539ab8 on the non-Test path [D]; effect on later slews/clock [U]; the web keeps a consistent hour angle [W]. | Selected target, coordinate draft and Set Coordinates (also when the hot list opens it) jump to the target at once after the coordinates are entered (instrument release as at a slew start). The immediate Point shortcuts that stand in for ProgrammedSlew (Point telescope, Point to coordinates, HTL Point, Hubble exact centre, the photometer's Point) skip the Limit Slewing check too (review 1 L1); the manual and drive limits (0x539290) keep theirs, and so does the browse pan, whose nearest VIREO analogue is manual motion [W] (closure L1a); a line in the motion card says Test Mode is on. Manual N/S/E/W motion is unchanged, as in VIREO. |
| Dome switches (DomeSw1DownClick 0x58c530, DomeSw1UpClick 0x58c6f0) | From a fully open (closed) dome the travel fraction +0x553 := 0 (1.0), so DomeTimer (80 ms) ends the travel at its first tick; a reversal mid-travel (state 2/3) is not collapsed. | The web dome already opens and closes at once [W]; with Sound Effects on, the end sound follows after 80 ms instead of 98 × 80 ms after every switch, a [W] simplification since VIREO keeps the full travel for a mid-travel reversal. |
| THRDisplayForm1 report helper 0x543d90 (0x543f43) | The `Estimated Cluster Distance` line is printed only in Test Mode. | Printed whenever Test Mode is on, on the database, own-pairs and observation HR reports; off, the web keeps Front V2's student control (the extinction box or the checkbox) [W]. |
| TEnvironment1.FormPaint 0x5899cc | An exercise menu's title screen (+0x54c = 2) keeps TitleTimer at 500 ms instead of 5000 ms; TitleTimerTimer 0x58b2a4 then runs the exercise. | Typed (`exercise-title-screen`): the web has no title screen. |
| Finder field load 0x53bae4 (0x53bb00) | The cached-area test 0x53afb0 is skipped, so the finder field is rebuilt at every load. | Typed (`finder-field-rebuild`) [W]: the same catalog stars; rebuilding at every tracking step would reload the field continuously. |
| USNO-NVO transport 0x59c620 (0x59c6dc, 0x59c765, 0x59c848), 0x59cc88 (0x59ccc5, 0x59ce60), 0x59d808 (0x59d825, 0x59d8f7, 0x59d91a) | A `USNO-NVO Web Service` status window shows `Requesting … Data` / `Searching … Catalog` and is hidden after the parse. | Typed (`usno-nvo-status-window`): the NOFS service is not ported; the camera's VizieR request shows its own status in both modes. |

The radio dialog's own TestModeBox (TRadiOptsDlg, record+0x940 → env+0x37d5; readers 0x564561 and the radio slew 0x566fa6) is a
separate option of the radio options front (T11b) and stays typed (`radio-test-mode` in `src/core/teacherDeferred.ts`). Recovery
and excerpts: `analysis/front-teacher/t3/RECOVERY.md` in the research root.

## Options persistence: Demonstration Mode, Save Updates, options files (Front T2, 2026-11-06)
VIREO keeps its options in `VEO_OPTS.INI` [D]. FormCreate creates the options object with version `1.504` and that name
(0x5879b3 → 0x5a1a08). The object reads the file from the user folder, then from the program folder, and falls back to the compiled
defaults 0x5a21d0; after any load it clears "Administrator" (0x5a1fc7). The reader 0x5a3534 and the writer 0x5a4644 move the
same 107 fields (OptsRec, size 0x27dd, CopyRecord typeinfo [0x5a094c]) with record size 1: 8506 bytes. The reader first
checks the version: 0x5a183c cuts both strings two characters after the dot, so `1.504` accepts `1.50…`. On a mismatch it
shows `Options File … is obsolete.` (`Version Error`) and deletes the file. After the last field Eof must hold (`EOF Not
Reached!`). Any read error shows `Options File … is Invalid.` (`File Error`) and deletes the file. Save Updates (File ›
Preferences, and the question `Save Option Changes?` after OK) writes through 0x5a4644. Before writing, it warns with
`Edit Mode is Set!…` (Yes/No) or, otherwise, the Virtual Observatory box (OK/Cancel). DemoBox is stored inverted, as
record+0x27c6 "login required" (compiled 1). At start-up 0 opens the instructor gate (0x587c50..0x587c73).

In OpenVireo (`src/io/optionsFile.ts`, `src/io/demonstrationModeStorage.ts`):
- **WEB-DM-01 [W] Demonstration Mode** is a check box of this dialog, so only instructor mode reaches it. Off by default, OK
  stores it in this browser's local storage (`openvireo.demonstrationMode`); off removes the key. While it is on, every page
  load in that browser opens instructor mode without the confirmation, as FormCreate opens the gate, and the banner says so.
  It is not a lock: anyone using that browser gets instructor mode. Leave closes the gate for that page only; unticking it is
  the only way to stop it. Storage that is missing or blocked reads as off. Students who never enter instructor mode keep empty
  storage.
- **WEB-OF-01 [W] Save Updates.** VIREO asks `Save Option Changes?` (flags 0x24) after every OK of this dialog (0x588770 tests ModalResult = mrOK; call at 0x588785 →
  0x58ed74 → 0x58ee6c). OpenVireo's plain OK is that OK answered No, and Save Updates is the Yes: it applies the options as OK does, shows the writer's Edit Mode or Virtual Observatory warning
  when either is on, and downloads `VEO_OPTS.json`. It is a web format, not VEO_OPTS.INI: 18 fields of the native record are
  install paths and addresses built from VIREO's own folder at run time, and the rest of its parameter block belongs to the
  parameter fronts T6–T8, so a web-written native file would have to invent them. The file holds the 17 applied options
  (Demonstration Mode, Test Mode, Limit Slewing, Edit Mode, Virtual Observatory, the R3 options and, since Front T4, Set E(B-V)
  and Detect Sky), the other options at
  their compiled values under `notApplied`, and a **zero-length password**.
- **Load options file…** reads that JSON file or a native `VEO_OPTS.INI` with VIREO's checks (version rule, length/Eof) and its
  box texts. VIREO reads its file only at start-up, so here a file fills the dialog, as Reset does: OK applies it and Cancel
  discards it. The password field of an imported file (JSON `password`, native +0x27b0..+0x27c0) is never read. "Administrator"
  is cleared. Values OpenVireo does not apply are listed with their reason and not applied: Restrict Scope Access (a later
  instructor version; Detect Sky and Set E(B−V) are applied since Front T4); Compute Magnitudes, Include R and I and Plot HR (fixed here); Sound Effects
  (OpenVireo's own switch); Write Log File; the Lab Table Number (undecided, its value is not shown); and the native parameter
  block. Saving again writes VIREO's compiled values for those listed items, and the load notice says so (review 1 L2). A native
  Fast Slewing byte other than 3 or 4 is noted with its rate index, which VIREO's ProgrammedSlew would pass straight to the
  rate slider (0x539cbf); the box shows ticked only for 4 (review 1 L1). Error boxes show the file's name where VIREO shows its
  full path; `Read beyond end of file` is inferred (Delphi run-time text). Unlike VIREO, OpenVireo never deletes a file it could
  not read.

Recovery and evidence: `analysis/front-teacher/t2/RECOVERY.md` in the research root.

## Set E(B-V) and Detect Sky (Front T4, 2026-11-06)
Both are check boxes of the dialog's Photometer tab (DFM `SetEBmVBox`, caption `Set E(B-V)`, hint `Set E(B-V) to correct value
for ZAMS fitting.`; `DtctSkyBox`, caption `Detect Sky ` with VIREO's trailing space, hint `Auto-detect sky.`). OKBtnClick writes
record+0x27dc (0x5a62af) = env+0x2e90 and record+0x27cf (0x5a6184) = env+0x2e83; the defaults routine writes 1 (0x5a2a55) and 0
(0x5a2af6) [D]. A byte search finds one reader of each displacement. In OpenVireo (`src/core/photometerTabOptions.ts`) both are
live in the Photometer tab, so they are reachable only in instructor mode. They last for the page session, Reset returns them to
the compiled values, and **Leave keeps them** [W]: VIREO keeps its options after the instructor finishes, and these two set up the
students' lab (unlike Test Mode, an instructor power). Save Updates writes them and Load applies them (web or native file); a web
file written before T4 keeps them under `notApplied` and is read from there.

| Option | VIREO [D] | OpenVireo |
|---|---|---|
| Set E(B-V) (compiled **on**) | The only reader is THRDisplayForm1.ShowZAMS1Click 0x543968 (0x543a39), also run by Clear1Click 0x542244 when the ZAMS is checked (it toggles Checked, so Clear hides the ZAMS; the gate runs on every toggle). After the ZAMS toggle enables the E(B−V) slider with it, the gate 0x543a32–0x543a75 runs when the option is set and the form is in database mode (+0x40c, set to 1 by Plot 0x5465ce and cleared by MeasuredData1Click 0x542edb): slider := Round(Single E(B−V) of the cluster record [0x5b5c30 → 0x5bca0c]+0x2d × Single 100.0) and **slider disabled**. So, by default, a database cluster's ZAMS is always fitted with the catalogue E(B−V) and the student cannot move it. Off, the slider follows the ZAMS and keeps its position; nothing is copied. | On (default): the database HR's E(B−V) field and slider are **read-only**; Load (and Select Cluster Data… Plot) still prefill a new notebook with the catalogue value, which is the gate's value for all 16 clusters (Vitest), and **Use catalog E(B−V)** applies it to a notebook restored from a file, begun with the option off, or created by Retry [W: VIREO has no saved notebooks]. Off: no prefill and no catalogue button, the field and slider are free (the pre-T4 manual route). The own-observation and native-DAT HR routes are never preset: MeasuredData1Click clears database mode, as in VIREO [D]. |
| Detect Sky (compiled off) | The only reader, 0x53804d, is in TObsrvtry's initialisation 0x537f08 (from FormPaint 0x538226 after FormActivate 0x537978 marks it pending with the panel inactive, and from ScopeTimerTimer 0x58b838 at 0x58b9bf when a requested telescope is granted, the Request Time path of Front T5), which copies the byte into the photometer form at +0x6b1 (0x53805c). Its only reader is TPhotometer.FormActivate 0x4ff8b0 (0x4ff94c): on, Sky (+0x41c) := (selected object's aperture fraction from 0x500568 = 0), and RdngGrp and RdngSlider are disabled (TControl.SetEnabled 0x45de44); off, Sky := (slider at Sky) or fraction = 0 and both are enabled. Then +0x41d := 0 and the slider is set to +0x41c, firing OnPositionChange 0x5021cc (+0x41d := 1) only when it moves. | On: at a telescope pointing (the free photometer) the Object/Sky choice is locked and each activation (Activate, Use pointing) is followed by the slider move FormActivate makes, an ordinary `point` event, so sessions replay unchanged and the "Reading Sky!" question cannot arise. On a pinned PLEIADES.HTL target the web's Object/Sky choice moves the telescope (web route), so it stays; Start at its sky position is refused, with a typed note, wherever the star still has light in the aperture, since VIREO would read Object there [W]. VIREO latches the option when the observatory starts or a requested telescope is granted; here the next activation reads it, and the lock follows what that activation read, in both directions [W]. |

Recovery and excerpts: `analysis/front-teacher/t4/RECOVERY.md` in the research root.

## In OpenVireo
The dialog opens from the telescope-motion card, in instructor mode. These controls are live:

| Option | Compiled | Effect here | Evidence |
|---|---|---|---|
| Limit Slewing | off | Horizon guard (OB-LS-01) | +0x27c9 |
| Edit Mode, Virtual Observatory | off | Fronts O and O2 | +0x27ca, +0x27d5 |
| Test Mode | off | Front T3 (above): exposures, Multi-Spec and programmed slews without the wait; the HR distance line | +0x27c8 = env+0x2e7c |
| Demonstration Mode | off | Front T2 (above): kept in this browser; on, every page load opens instructor mode | +0x27c6 (inverted); FormCreate 0x587c50 |
| Set E(B-V) (Photometer tab) | on | Front T4 (above): a database cluster's E(B−V) is the catalogue value, read-only | +0x27dc = env+0x2e90; ShowZAMS1Click 0x543a39 |
| Detect Sky (Photometer tab) | off | Front T4 (above): the photometer decides Object or Sky at each activation | +0x27cf = env+0x2e83 → TPhotometer+0x6b1; FormActivate 0x4ff94c |
| Fast Slewing | on | Programmed slews run at rate index 4; off gives index 3, half as fast. | +0x27af := 4/3; ProgrammedSlew 0x5399e8 sets RateSlider.Position at 0x539cbf |
| Fast Scope Change | off | On, a telescope change with the dome open keeps it open, with no dome sound. | +0x27d0 = env+0x2e84; 0x58b554 needs the option on and the dome open (+0x552 = 1) |
| Compute Rdshft Vel. | off | The LSS Measured Redshift Data dialog and, since Front H2, the Hubble Observational Data dialog open with the velocity filled in: Single(c·z), ffExponent 4. The Hubble dialog fills it only when z ≠ 0. OK still applies the 1 % check. | +0x27d4 = env+0x2e88; TLSSRsltsDlg1.FormActivate 0x57cbcb; TObsRsltsDlg1.FormActivate 0x54aedb |
| Infrared Camera | on | Off, the camera card offers only the CCD camera, and the dialog hides the IR tab. | +0x27d3 = env+0x2e87; TObsrvtry FormActivate 0x537a13, InstSliderClick 0x53e194, IRBoxMouseUp 0x5a7324 |
| Monochrome Displays | off | On, the LSS wedge plot and the HR diagram are drawn black and white when they are next shown; the light curve follows it from its next print. | +0x27da = env+0x2e8e; TWedgePlot FormShow 0x580e1a |
| Print in Color | off | On, Print Wedge Plot prints in colour; off, it prints black and white. | +0x27d9 = env+0x2e8d; Print1Click 0x580fba (flag = option XOR 1) |
| Show Object ID | off | On, the object under the pointing is named in the photometer label (IDText), the spectrometer's Object box, Save default name (`Name.SSP`) and printout, the Multi-Spec list items, captions and file names, and the camera's native FITS file name and OBJECT card. Off: `Unknown` and the Object X label; the spectrometer hides its Object box and keeps its web file names [W] (Front R4d). An empty slit (throughput 0x50f338 = 0) is a sky reading: `Sky`, no magnitude, print `Reading Sky`. The Pleiades, Cluster HR, Classification, Hubble and LSS guides turn it on. Add Current proposes the nearest object's name whether it is on or off ([D] 0x53f145). Front R4, docs/FRONT-R4-OPTIONS.md. | +0x27cd = env+0x2e81; 0x4ffa30, 0x5230dc, 0x5239f8; forcing 0x58a3a2, 0x58a54c, 0x58a70e, 0x58a8d8, 0x58aabe |
| Show Object Mag. | off | On (or Edit Mode), the spectrometer shows the object's V in its App. Mag (V) box and printout, and Multi-Spec in Information and Print; the Classification, Hubble and LSS guides turn it on (Front R4d). | +0x27cc = env+0x2e80; 0x50e00b, 0x510954, 0x528032, 0x528bb8 |
| Time-Dependent Data | off | Off, Record Z on an already recorded object updates its row, in the LSS survey (Front L3, docs/LSS-SURVEY.md) and for Hubble galaxy measurements (Front H2, docs/HUBBLE-VELOCITY.md), and re-classifying an object edits its result (Front R4c); on, every Record Z or classification adds a row. | +0x27d8 = env+0x2e8c; 0x57c918, 0x54a73c (core/recordReuse.ts) |
| Allow User Change (Spectrometer tab) | on | Checked, Spectral Range… is offered on every spectrometer route; unchecked, it is disabled with a note and the current range stays (Front S3). [W] the openers follow the option at once (the dialog is on another page, so the next show reads it). | +0x27d7 = env+0x2e8b; compiled 0x5a2a32; read by TSpectrometer FormShow 0x50d9d5 and TSpClassify FormShow 0x507945 |

The dialog also shows the General, Photometer, Spectrometer, CCD and IR tab values **read-only** (except the Photometer tab's
Set E(B-V) and Detect Sky, live since Front T4), formatted as FormActivate 0x5a56e0 writes them. Editing them would invalidate the certified field, photometer, spectrometer and camera
contracts built on those values.

**Web adaptations [W]:**
- **WEB-OPT-R3:** the options last for the page session and are not saved by the page, as Edit Mode is. Since Front T1 they
  open only in instructor mode (above); before, they were open to anyone. Since Front T2 Save Updates writes them to an options
  file that the instructor keeps and loads again.
- **Wedge plot:** it takes Monochrome Displays when the option changes, and its own scheme choice can switch it meanwhile.
- **Fast Scope Change:** the original's slow path is not reproduced. That path shows "Accessing <scope>" with an hourglass
  for Random(8000) ms, then the "Telescope Successfully Accessed" message, then resets to the finder view. Here the change
  is applied at once.

## Ported in later fronts, and not ported (with the reason)
- **Time-Dependent Data** for the classification results (Front R4c, 0x50b1dc → 0x54a73c): the option replaces the
  Observation Results window's own "append" checkbox. Off (compiled), Open reuses the current object's first result; on, each
  confirmation adds a row.
  - [W] "The same object" stays the same retained spectrum (practice star, loaded file or acquisition) rather than VIREO's
    exact ID.
  - The notebook's `mode` field is kept as read and is written only when the option changes, so restored notebooks re-export
    unchanged.
- **Time-Dependent Data for the photometer** (Record 0x501e7c): the rule is pure `src/core/photometerRecord.ts`:
  - off: a band slot changes only for a nonzero reading, RA/Dec are filled only when zero, and the first time is kept;
  - on: a new row each time.

  Front P3 wires it: the photometer's **Record/Review** reads the option at Record and writes the photometer results list
  (docs/PHOTOMETER-RECORD.md). The web notebook entry beside it keeps one entry per reading and does not read the option.
- **Write Log File** — not ported (+0x27d6, off): it appends login, component and logout records to CLEALOG.LOG. A web page cannot write
  that file.
- **Monochrome Displays and Print in Color** for the light curve (Front R4b, `src/core/lightCurveScheme.ts`): VIREO creates
  the light-curve window once per run and writes its colour flag only in Print (0x52c1cc). So the light curve is drawn in
  colour until its first print whatever Monochrome Displays says; the print uses black on white unless Print in Color is
  checked; afterwards the window keeps the Monochrome Displays value read at that print, also after closing and reopening it,
  until the next print. Cancelling VIREO's print dialog writes nothing (0x52c1dc); here the print preview plays that dialog,
  so only its Print… sets the flag, and closing it without printing changes nothing. OpenVireo does the same for the page
  session.
- **Monochrome Displays and Print in Color** for the HR diagram (Front R4c, `src/core/hrScheme.ts`), on the database, own-pairs
  and native-DAT routes:
  - The form reads Monochrome Displays every time it is shown (FormShow 0x542175). Here that is when its route or disclosure is
    shown again.
  - The schemes:
    - colour: navy background, yellow axes and labels, white point outlines, lime ZAMS, fuchsia isochrone and marker;
    - B&W: white background, black axes, labels, outlines and curves, grey marker.
  - Print (0x542f44) prints in colour only with Print in Color, then the window takes Monochrome Displays again. Cancelling
    the print preview writes nothing (0x542fc5).
  - The photometer route's own web plot is not VIREO's form and keeps its colours.
- Not ported: Restrict Scope Access, Administrator and the remaining photometer check boxes keep their compiled state and are
  listed as text. Test Mode is live since Front T3, Demonstration Mode since Front T2, and Set E(B-V) and Detect Sky since
  Front T4 (above).
