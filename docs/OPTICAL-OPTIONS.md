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
| Monochrome Displays | off | On, the LSS wedge plot is drawn black and white when it is next shown. | +0x27da = env+0x2e8e; TWedgePlot FormShow 0x580e1a |
| Print in Color | off | On, Print Wedge Plot prints in colour; off, it prints black and white. | +0x27d9 = env+0x2e8d; Print1Click 0x580fba (flag = option XOR 1) |
| Show Object ID | off | On, the object under the pointing is named in the photometer label (IDText), in the camera's native FITS file name and OBJECT card, and Add Current proposes it. Off: `Unknown` and the Object X label. The Pleiades, Cluster HR, Classification, Hubble and LSS guides turn it on. Front R4, docs/FRONT-R4-OPTIONS.md. | +0x27cd = env+0x2e81; 0x4ffa30, 0x5230dc, 0x5239f8; forcing 0x58a3a2, 0x58a54c, 0x58a70e, 0x58a8d8, 0x58aabe |
| Show Object Mag. | off | On (or Edit Mode), the spectrometer shows the object's V; the Classification, Hubble and LSS guides turn it on. Its spectrometer display waits for the spectrometer front (below). | +0x27cc = env+0x2e80; 0x50e00b, 0x510954 |
| Time-Dependent Data | off | Off, Record Z on an already recorded object updates its row, in the LSS survey (Front L3, docs/LSS-SURVEY.md) and for Hubble galaxy measurements (Front H2, docs/HUBBLE-VELOCITY.md); on, every Record Z adds a row. | +0x27d8 = env+0x2e8c; 0x57c918, 0x54a73c (core/recordReuse.ts) |

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
- **Show Object ID / Show Object Mag in the single spectrometer and Multi-Spec** (Front R4): the spectrometer's Object and
  magnitude boxes, its Save/Print names and Multi-Spec's binding to the global options wait until the spectrometer front
  (G4b/G4c) is merged. The rules are ready and tested in `core/currentObject.ts`; Multi-Spec keeps its own two check boxes.
- **Time-Dependent Data** for the photometer and classification results (0x54a73c): the Observational Results window keeps
  its own "append" choice; the option above changes the LSS survey.
- **Write Log File** (+0x27d6, off) appends login, component and logout records to CLEALOG.LOG. A web page cannot write
  that file.
- **Monochrome Displays and Print in Color** also apply to the original's light curve and HR diagram windows. Those are not
  covered yet.
- Demonstration, Test, Restrict Scope Access, Administrator and the photometer/spectrometer check boxes keep their
  compiled state and are listed as text.
