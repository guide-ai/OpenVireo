# Front P — polish and small fixes

**Status:** implemented on branch `claude/front-p-polish` (2026-10-29); review 1 (`analysis/reviews/front-p-review-1.md`, MERGE-AFTER-FIXES) applied after merging main d87d42e (Fronts V2 and M).

**Plan:** research root `analysis/front-plans/front-p-polish.md`; sources: gap inventory `analysis/gap-inventory-2026-10-29.md`
§2(a), §3.2 and §5.

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) and its DFM resources only; nothing was executed,
emulated or sent.

**Resources:** one new bundled file, **Pulsars.HTL** (approved 2026-10-26; recorded in docs/LOCAL-RESOURCES.json,
docs/RESOURCE-PROVENANCE.json and THIRD_PARTY_NOTICES.txt).

**Tags:** [D] read from code or data · [I] inferred · [W] web adaptation.

## What changed for a student

| Item | Where | Evidence and adaptation |
|---|---|---|
| **Bundled Pulsars.HTL** | Radio telescope › Slew › Hot List › *Load bundled Pulsars.HTL* | Byte-exact `program files/CLEA/VIREO/Pulsars.HTL` (688 bytes, 8 records, SHA-256 `9dfba548…a439`), fetched from this origin and checked for size and SHA-256 before parsing. [W]: VIREO opens it from its file dialog. Same read gates, cancel causes and commit as *Load Hot List...*. |
| **About** | Observatory › *What works in this version* | TAboutBox DFM captions [D]: "Contemporary Laboratory Experiences in Astronomy", "VIREO - The VIRtual Educational Observatory", "Version 0.5", "Copyright © 1999-2011 CLEA", "All Rights Reserved". The logo is not approved, so it is omitted. Then [W] what the site is, what works, credits and the licence basis. The stale "three-galaxy" and "Redistribution permissions are pending" texts are gone. |
| **Print Sky Image...** | Observatory › File | PrintSkyImage1Click 0x53f934 (OB-SR-03): VIREO prints a header (0x58e860), the image (0x53f9e4, scale 1.5) and a footer (0x53fe14), whose contents are not decoded. [W]: a print preview of the sky view as shown, with the date, the view and the J2000 pointing. File is now always shown, as in VIREO. |
| **Print Wedge Plot...** | LSS data (`#lss-wedge`) | DFM `Print1` [D]. Print1Click 0x580f88 sets TWedgePlot+0x394 := Env+0x2e8d XOR 1 (0x580fba–0x580fc3), so VIREO prints in the scheme opposite to that setting, whose default is not recovered. [W]: the preview always renders the black-and-white `WEDGE_COLOUR_SCHEMES[1]`, without selection highlighting. |
| **Print Window...** | Pulsar analysis toolbar | TPlsrAnalysisForm1 `PrintScreen1` ("Print &Window...", PrintScreen1Click 0x56d9d8) [D]; its printer drawing is not decoded. [W]: a snapshot of both panels with their readouts, made inert. |
| **Results Editors** | Header group *Results Editors* | TEnvironment1 Tools › Results Editors [D]. [W] aliases: *Observational Results* opens the analyzer's own observational results; *Pulsar Results* opens the pulsar saved measurements. |
| **Comparison Spectrum › Clear** | Spectrum analyzer, beside the comparison list | *Clear comparison* removes the comparison lines and their table rows. The list shows "None (cleared)" until one is chosen. [W]: not saved, since the session keeps the chosen list. |
| **"Terminate Current Slew?"** | Observatory › Set Coordinates during a programmed slew | OB-SC-02 (0x5393f2..0x5394f8) [D]: "Slew Suspended" / "Terminate Current Slew?", Yes/No; the coordinates dialog never opens. Yes stops the slew; No lets it continue. [W]: VIREO suspends the slew while asking, but the browser slew keeps moving (the question closes if it arrives). Manual motion keeps Set Coordinates disabled. |
| **Field Size (Arc Min)** | CCD/IR camera window | TCCDCam/TIRCam GroupBox1 with WdDsply/HtDsply [D]; FormShow 0x512058..0x51208a loads the observatory Singles +0x6ce/+0x6d2 (IR +0x6d6/+0x6da). The values are `cameraPreparationReference` for the applied telescope. [W]: shown with 2 decimals (display precision not in the DFM). |
| **RA-ordered add** | Add Current; QSO and variable lists' *Add Selection to Current Hot List* | 0x590588 inserts into the RA-ordered linked list through 0x492728, comparator 0x590398 [D]. [W]: the file-order list gets the record after the last row with RA ≤ its RA (top if none), compared on the exact Extended bytes. A list in RA order stays in RA order. The native tie order (cursor history) is not modelled. The editor's own *Add HTL target* still appends. |
| **Hot-list window Edit/Delete/Undo and popup** | Optical *Select Object for Observation* window (buttons and right-click menu) | THotListForm1 [D]: EditSelectedLine1Click 0x591488 (no row: "Please select an entry, using the left mouse button." / "No Selection!"; else THOVerifyDlg edits the row in place); DeleteSelectedLine1Click 0x59172c ("Delete Highlighted Entry from List?" Yes/No, removes the row); UndoEditDelete1Click 0x5918d0 (one level: restores the edit in place or re-inserts the deleted row through 0x492728, then disables both Undo items). PopupMenu items mirror Slew/Edit/Delete/Undo. [W]: the shared file-order list is changed; Undo restores the previous list (a deleted row returns to its file position, not by RA); Undo is enabled only while the list is the one the window's last Edit/Delete produced; Delete with no row selected shows the same No Selection box (VIREO does not check). "Confirm" is Delphi's mtConfirmation caption [I]. |
| **`#spectrometer`** | Header › Spectrometer | The source-profile preview (M82/Coma1/Coma2, "Exposure acquisition is pending") was obsolete and is retired. The route is now an index of the verified spectrometer routes: star and galaxy exposure, LSS survey, Object X, the analyzer and Classification. The preparation seed stays in the saved-investigation schema for compatibility and is no longer shown. |
| **Radio state captions** | Radio control panel, recovered state | TEnvironment1 field table [D] (reader checked against +0x49c VirtualObservatoryAllInstruments1): +0x408 = `Telescope1` ("Tele&scopes"), +0x454 = `SetDateTime1` ("Set Observation &Date/Time, ID..."). |

## Stale texts corrected (inventory §5)

- **UI strings:**
  - `sky.limitHelp`, `sky.noAcquisition`, `spectrum.adaptationsHelp`, `optical.acquisitionLimit`: the thirteen Hubble.HTL
    galaxies, not "three-galaxy".
  - `sky.pendingInstruments`: the current incomplete items.
  - `spectrum.licenseHelp`: the approvals.
  - `pleiadesPoint.telescope` and `htl.exerciseTelescope`: 24 PLEIADES.HTL stars on the 0.4 m.
  - `db.boundary`: VIREO has no autoscaling.
- **Docs:**
  - STUDENT-EXERCISES E04 adaptations;
  - OPTICAL-OBSERVATORY.md and its provenance: 0x59a0fc is recovered (objectSelection.ts) but not used by Add Current;
  - WIDTH-COORDINATE-GUARD.md: admission is the source grid ∩ 3500–7400 Å;
  - LSS-SURVEY.md: the QSO merge is ported, and LSS still uses the gate until Front L2;
  - WEDGE-PLOT.md: survey, acquisition, hand-over, saved options and Print.

## Added by review 1

| Item | Evidence and adaptation |
|---|---|
| **Popup of the list windows** (Star Data List, variable list, QSO list, cluster lists) | TObjctListForm1 MouseUp 0x5523ec–0x5525fa [D]: PopupMenu1 pops only when ItemIndex is a data row and Selection is visible; the right-click does not move the selection. [W]: right-click or the context-menu key; the items are the form's Selection items, with the same typed reasons. |
| **Site Information** | TObsrvtry.Site1Click 0x53ea42 creates a TInfoListForm1 with Edit1, Search1 and SaveasText1 hidden, shown modally [D], so its List menu keeps Print... and Close. [W]: Print is a print preview of the date, caption and lines. The base TInfoListForm1 never shows its popup (ListBox1MouseUp 0x59ed90 only stores the button), so there is none. |
| **Cluster HR guide** | Header › Exercise guides › *Cluster HR guide* opens the E05 guide in `#cluster-database` [W]. |
| **Multi-Spec Print Selection Field** | TMultSpCntrl.PrintSelectionField1Click 0x52a78c only calls TObsrvtry.PrintSkyImage1Click 0x53f934 [D], so it opens the same web Print Sky Image. |
| **Multi-Spec texts** | `sky.pendingInstruments` no longer lists the multi-object spectrometer; About › What works and the `#spectrometer` index name Multi-Spec. |
| **Terminate focus** | Focus returns to Set Coordinates after Yes or No, and when the slew ends while the question is open. |

## Not in this front

- NGC4670.SP: Front L2; the Compute Rdshft Vel. option: Front R.
- Not decoded (b): the Print Sky header and footer, the Pulsar PrintScreen1Click drawing.
- TInfoListForm1 line editing: abstract in the base class and hidden for Site Information, so nothing to port.

## Model and effort

| Step | Model | Effort |
|---|---|---|
| Gap inventory and plan | Claude Opus 5.5 | high |
| Implementation and tests | Claude Opus 5.5 | medium |
| Review 1 | coordinator session (model recorded in its review) | high |
| Review 1 fixes | Claude Opus 5.5 | medium |

## Code and tests

- `src/polish/`:
  - `PolishMessages.ts`: texts and DFM literals;
  - `AboutDialog`, `WebPrintPreview`, `PrintSkyImage`, `ResultsEditorsNav`, `TerminateSlewBox`, `programmedSlew` (context),
    `CameraFieldSize`, `PopupMenu`, `polish.css`.
- `src/core/hotListEntry.ts`: `raOrderedInsertIndex`, `addHtlRowRaOrdered`, Add Current through the same rule.
- `src/io/bundledHotList.ts`: `BUNDLED_PULSARS_HOT_LIST`.
- **Vitest:**
  - `src/io/bundledPulsarsHotList.test.ts`: identity, manifest, 8 rows, refusals;
  - `src/core/hotListEntry.test.ts`: RA placement, ties, unsorted files, Undo.
- **Playwright:**
  - `tests/front-p-polish.spec.ts`: every item above;
  - updated `spectrometer.spec.ts`, `editing-workspace.spec.ts`, `qso-list.spec.ts`, `object-info-forms.spec.ts`,
    `recorded-analysis-navigation.spec.ts`.
