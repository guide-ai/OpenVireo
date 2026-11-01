# Optical Simulation Options (TOptionsDlg)

VIREO's instructor dialog "Optical Simulation Options" (CLEA_VEO.exe 781bc970…c54c, static reading only). OK
(`OKBtnClick` 0x5a6068) copies each control into the options record at Environment1+0x6b4, so env offset = record offset
+ 0x6b4. The defaults routine 0x5a21d0 sets the compiled values. No `VEO_OPTS.INI` ships with VIREO, so students see these
defaults. The research notes are in `analysis/front-r3-options/` and the plan in `analysis/front-plans/front-r3-options.md`.

## In OpenVireo
The dialog opens from the telescope-motion card. These controls are live:

| Option | Compiled | Effect here | Evidence |
|---|---|---|---|
| Limit Slewing | off | Horizon guard (OB-LS-01) | +0x27c9 |
| Edit Mode, Virtual Observatory | off | Fronts O and O2 | +0x27ca, +0x27d5 |
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

The dialog also shows the General, Photometer, Spectrometer, CCD and IR tab values **read-only**, formatted as
FormActivate 0x5a56e0 writes them. Editing them would invalidate the certified field, photometer, spectrometer and camera
contracts built on those values.

**Web adaptations [W]:**
- **WEB-OPT-R3:** the options are open to anyone, last for the page session and are not saved, as Edit Mode is.
- **Wedge plot:** it takes Monochrome Displays when the option changes, and its own scheme choice can switch it meanwhile.
- **Fast Scope Change:** the original's slow path is not reproduced. That path shows "Accessing <scope>" with an hourglass
  for Random(8000) ms, then the "Telescope Successfully Accessed" message, then resets to the finder view. Here the change
  is applied at once.

## Not ported, with the reason
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
- **Write Log File** (+0x27d6, off) appends login, component and logout records to CLEALOG.LOG. A web page cannot write
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
- Demonstration, Test, Restrict Scope Access, Administrator and the photometer/spectrometer check boxes keep their
  compiled state and are listed as text.
