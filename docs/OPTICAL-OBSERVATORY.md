# Everyday optical observatory (Front B, audit items 2.3–2.7)

Branch `claude/priceless-jones-3ed4fe`, base main 3dedfe4. Plan: `task-2/analysis/front-plans/front-b-optical-observatory.md` (planned at high effort). Implemented by Claude Code (claude-opus-5-5) at medium effort; the B0 static evidence pack was produced by a medium-effort subagent of the same session. Independent high-effort review 1 (coordinator, 2026-10-27): merge after fixes; report at task-2/analysis/reviews/front-b-review-1.md. Resolution: F1–F10 fixed in follow-up commits (see Review resolution below).

Evidence: [OPTICAL-OBSERVATORY-PROVENANCE.json](OPTICAL-OBSERVATORY-PROVENANCE.json) (31 contracts OB-SC/HL/AC/DT/ST/LS/SR). CLEA_VEO.exe SHA-256 781bc970…c54c was extracted to `task-3/front-b-optical-20261027/bin/` and read statically (objdump, saved listings); it was never executed or emulated, and no binary bytes are in the repository.

## Student guide (short)

All of this is on the **Observatory** page, after **Open dome**.

1. **Set the night.** Open *Site clock*, choose **Set Date/Time…**, enter the date (YYYY/MM/DD) and the time in **UT** (HH:MM:SS). Optional: **Site Parameters…** to use your own site for the clocks and horizon; **Site Information…** lists the site in use.
2. **Choose a target from a list.** In *Original hot lists* open an `.HTL` file or load an exercise list. In *Move the telescope* choose **View/Select from List…**, pick a row (Search… helps), then **Slew to Selection**. The coordinate dialog opens with the row's J2000 coordinates; **OK** shows the original confirmation, then **Start programmed slew**.
3. **Or type coordinates.** **Set Coordinates…** takes hours/minutes/seconds and degrees/′/″, J2000.0 or B1950.0 (B1950 is precessed to J2000 before the slew).
4. **Keep a list of your own.** **Add Current Item/Position to List…** adds where the telescope points; save the list from *Original hot lists* (Save HTL). **Print…** in the list window prints the list.
5. **Respect the horizon (optional).** **Optical Simulation Options…** ▸ *Limit Slewing* refuses slews and Point shortcuts below the horizon, stops manual moves there and turns tracking off when the target sets. With it on, your site override (latitude, horizon) decides when that happens, so it can stop tracking during an exposure.
6. **Keep your spectrum.** On *Catalog star exposure*, after pausing, **Save spectrum (.SSP)** or **Print spectrum**.
7. **Save investigation** keeps the options and your site (session v26); **Restore** brings them back.

## Adaptations (one line each)

- Set Coordinates is a web modal; the immediate **Point** button and the decimal RA/Dec boxes remain as labelled web shortcuts.
- The B1950 flag and the stored target are local to the optical observatory (natively shared with the radio lab through one dialog instance).
- The programmed-slew confirmation is the existing web dialog; it shows the decoded native text "Slew Telescope to Target Coordinates?…" and, after a B1950 entry, "(Input B1950.0 Coordinates Precessed to J2000.0.)".
- The hot-list window's List/Selection menus are buttons. Edit Selection, Delete Selection and Undo Edit/Delete (Front P, THotListForm1 0x591488 / 0x59172c / 0x5918d0) change the shared list: Edit with no row shows "Please select an entry, using the left mouse button." (No Selection!), Delete asks "Delete Highlighted Entry from List?", Undo reverses the window's last Edit or Delete (one level; a deleted row returns to its file position, natively it is re-inserted by RA). Save List stays in the *Original hot lists* editor.
- List rows use the recovered ordinal formatter 0x590248 (number + RA + Dec, as natively for no exercise/Hubble/Pleiades); the ID and remarks are shown in a second decimal line, and Search matches the native row text only.
- The window caption is the exercise-0 caption ("Hot List File: …" / "New Hot List File"); " (Modified)" is not tracked.
- Hot-list Print is a scoped browser print of the caption and rows; the date, names and laboratory table number of the original header are not recovered and not printed.
- Add Current proposes the selected target's original catalog ID only when the telescope points exactly at it (the nearest-object rule 0x59a0fc is recovered in src/core/objectSelection.ts and used by the instruments, but Add Current does not run it: that needs the field objects at an arbitrary pointing; web keys such as FILE@offset are not proposed); its kind (Star/Galaxy…) is not known, so Comments start empty.
- A blank Object ID is allowed for Add Current ("Position added…", as natively); the list editor's Add/Edit keeps OpenVireo's non-blank ID rule (docs/HTL-CONTRACT.md §4).
- An RA of exactly 24 h is refused in Add/Edit because the HTL codec stores 0 ≤ RA < 24.
- Site Parameters is natively an instructor dialog (Options ▸ Scopes); here students may set it, and it drives only the clocks (local time, LST) and the horizon; acquisitions, profiles and journals keep the compiled site.
- Set Date/Time is the main window's dialog (TUTTimeDlg), offered from the observatory; its Object X ID field is not shown.
- Optical Simulation Options offers only Limit Slewing (default off); the other original options are listed as text (Fast Slewing with its compiled checked state), not available in OpenVireo; Edit Mode stays off.
- View/Select and Add Current are disabled while the telescope moves. During a programmed slew, Set Coordinates asks "Terminate Current Slew?" (Slew Suspended, Yes/No, OB-SC-02; Front P): Yes stops the slew, No lets it continue, and the dialog never opens. VIREO suspends the slew while it asks; the web slew keeps moving (the question closes if it arrives). During manual N/S/E/W motion Set Coordinates stays disabled.
- With Limit Slewing on, the immediate web pointing shortcuts (Point telescope, Point to coordinates, pan, HTL Point, Hubble exact centre) are refused below the horizon with the native box; instrument Activate jumps to a fixed acquisition field are not checked.
- The list window shows rows in native RA order (OB-HL-03). The HTL editor keeps file order; since Front P, Add Current (and the QSO and variable lists' Add Selection) places the record after the last file row with RA ≤ its RA, so a list in RA order is saved in RA order (natively 0x590588 inserts into the RA-ordered list; the native tie order follows the cursor history and is not modelled). The editor's own Add still appends.
- Within the ±1e-9° horizon boundary guard, Limit Slewing refuses (Number cannot settle the Extended comparison).
- Limit Slewing checks run while the browser clock runs (native ClockTimer always runs).
- Spectrum Save is a browser download (no file dialog/overwrite prompt); Print is a scoped browser print. Sky exposure Save stays absent. File › Print Sky Image... (Front P) is a web print of the sky view with the date and pointing; VIREO's header and footer contents are not recovered.
- The hot-list window's popup menu (right-click or the context-menu key; Front P) offers the same Slew to Selection, Edit Selection, Delete Selection and Undo Edit/Delete.
- Session v26 wraps an unchanged v1–25 base outermost and is written only when an option or a site override differs from the defaults; a file without v26 restores the compiled defaults.

## Milestones and contracts

| Milestone | Contracts | Code |
|---|---|---|
| B0 evidence | all | docs/OPTICAL-OBSERVATORY-PROVENANCE.json |
| B1 Set Coordinates | OB-SC-01, -04, -06; RA-08/09 | src/core/opticalSkyCoords.ts, src/observatory/OpticalSkyCoordsDialog.tsx, OpticalSlewMenu.tsx, TelescopeMotion.tsx |
| B2 B1950 | OB-SC-06/07; RA-EP-01..03 | src/core/opticalSkyCoords.ts |
| B3 Hot-list window | OB-HL-01..03, ordinalFormatter0x590248; RA-HL-03..09 | src/core/opticalHotList.ts, src/observatory/OpticalHotListWindow.tsx |
| B4 Print | RA-HL-10 (ported parked candidate) | src/core/hotListPrint.ts, src/observatory/HotListPrintPreview.tsx |
| B5 Add Current, h/m/s entry | OB-AC-01..04 | src/core/hotListEntry.ts, src/observatory/HotListEntryDialog.tsx, src/HotListEditor.tsx, src/io/bundledHotList.ts (BUNDLED_EXERCISE_HOT_LISTS) |
| B6 Date/time, site | OB-DT-01, OB-ST-01..03 | src/core/observatorySite.ts, observatoryDateTime.ts, siteClock.ts/horizon.ts (optional site), src/observatory/SiteDialogs.tsx, SiteClock.tsx, RunningClock.tsx |
| B7 Limit Slewing | OB-LS-01..05, OB-SC-05 | src/core/opticalOptions.ts, slewLimit.ts, src/useObservatoryClock.ts, src/observatory/OpticalOptionsDialog.tsx |
| B8 Spectrum Save/Print | OB-SR-01; docs/SPECTRUM-SAVE-CONTRACT.md | src/observatory/SpectrumSavePrint.tsx (mounted in StarExposure.tsx) |
| B10 Persistence, guide | — | src/io/analysisSession.ts (v26), SpectrumInstrument.tsx (prepare/restore hooks), this document |

B9 (applying the spectral range to new acquisitions) is out of this round.

## Tests

Vitest: opticalSkyCoords (11), opticalHotList (9), hotListPrint (9), hotListEntry (7), observatorySite (8), slewLimit (5), observatorySession v26 (5), bundledExerciseLists (1). Playwright: optical-sky-coords (2), optical-b1950 (1), optical-hotlist-window (2, incl. 320 px), optical-hotlist-print (2), optical-hotlist-add-current (4), observatory-site-time (3), optical-limit-slewing (4), spectrometer-save-print (2), optical-daily-use (1). Tests are evidence of the chosen contract, not an oracle for the original.

## Not recovered / open

- Add Current's use of the object lookup 0x59a0fc at arbitrary pointings (the rule itself is recovered), Print Sky Image header/footer content, spectrometer flag +0x3172.
- Whether TStationDlg/TOptionsDlg edits reach a running observatory before the next telescope setup (OB-ST-04).
- Native x87/Extended arithmetic, FloatToStrF and GDI printing are not reproduced (binary64, toFixed, browser print).

## Review resolution (review 1)

The raw report stays at `task-2/analysis/reviews/front-b-review-1.md`; this is the resolution only.

- F1 −0 site values broke Save: zeros normalized in the station parse; the v26 reader decodes the session number codec. Tests: Greenwich West, equator South, typed "-0", Save/Restore e2e.
- F2 Point shortcuts bypassed Limit Slewing: guarded with the native "Cannot Perform Slew" box (e2e RA 0, Dec −80).
- F3 stale texts: horizon enforcement line follows the option, the horizon readout names an active override; approved en.json keys updated.
- F4 hot-list order: provenance corrected to RA insertion via VMT 0x58f3d8 slot +4 = 0x590398; editor file-order append labelled.
- F5 Site Information: 0x486ca0 sign slot to width 4, one decimal for aperture/focal length; exact assertions.
- F6 Add Current no longer proposes web keys (original catalog ID or empty).
- F7 blank ID allowed for Add Current only; label names the editor rule.
- F8 other options listed as text with Fast Slewing's compiled state.
- F9 exact longitude/latitude/horizon bounds; crafted just-over-π files rejected.
- F10 "Terminate Current Slew?" adaptation listed. INFO items: guide line, window comment, v26-over-v23 test.
- Adjudication 2: data/observatory/horizon-provenance.json corrected to +0x27c9 in its own commit.
- Minor notes (after merge): a refused Point (Limit Slewing) is checked before any target or hot-list selection, so the card and pointing stay exactly as they were; the horizon-provenance caveat and scope now describe the ported opt-in guard; Add Current keeps ID whitespace exactly as typed (THOVerifyDlg.OKBtnClick 0x4f8898 copies IDEd through @LStrToString 0x4060cc with a length cap only, no Trim), so a whitespace-only ID is stored as typed and reported as "Object … added" — the list editor's Add/Edit keeps its non-blank rule.
