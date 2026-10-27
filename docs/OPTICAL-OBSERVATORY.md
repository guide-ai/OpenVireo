# Everyday optical observatory (Front B, audit items 2.3–2.7)

Branch `claude/priceless-jones-3ed4fe`, base main 3dedfe4. Plan: `task-2/analysis/front-plans/front-b-optical-observatory.md` (planned at high effort). Implemented by Claude Code (claude-opus-5-5) at medium effort; the B0 static evidence pack was produced by a medium-effort subagent of the same session. Independent high-effort review: pending (coordinator).

Evidence: [OPTICAL-OBSERVATORY-PROVENANCE.json](OPTICAL-OBSERVATORY-PROVENANCE.json) (31 contracts OB-SC/HL/AC/DT/ST/LS/SR). CLEA_VEO.exe SHA-256 781bc970…c54c was extracted to `task-3/front-b-optical-20261027/bin/` and read statically (objdump, saved listings); it was never executed or emulated, and no binary bytes are in the repository.

## Student guide (short)

All of this is on the **Observatory** page, after **Open dome**.

1. **Set the night.** Open *Site clock*, choose **Set Date/Time…**, enter the date (YYYY/MM/DD) and the time in **UT** (HH:MM:SS). Optional: **Site Parameters…** to use your own site for the clocks and horizon; **Site Information…** lists the site in use.
2. **Choose a target from a list.** In *Original hot lists* open an `.HTL` file or load an exercise list. In *Move the telescope* choose **View/Select from List…**, pick a row (Search… helps), then **Slew to Selection**. The coordinate dialog opens with the row's J2000 coordinates; **OK** shows the original confirmation, then **Start programmed slew**.
3. **Or type coordinates.** **Set Coordinates…** takes hours/minutes/seconds and degrees/′/″, J2000.0 or B1950.0 (B1950 is precessed to J2000 before the slew).
4. **Keep a list of your own.** **Add Current Item/Position to List…** adds where the telescope points; save the list from *Original hot lists* (Save HTL). **Print…** in the list window prints the list.
5. **Respect the horizon (optional).** **Optical Simulation Options…** ▸ *Limit Slewing* refuses slews below the horizon, stops manual moves there and turns tracking off when the target sets.
6. **Keep your spectrum.** On *Catalog star exposure*, after pausing, **Save spectrum (.SSP)** or **Print spectrum**.
7. **Save investigation** keeps the options and your site (session v26); **Restore** brings them back.

## Adaptations (one line each)

- Set Coordinates is a web modal; the immediate **Point** button and the decimal RA/Dec boxes remain as labelled web shortcuts.
- The B1950 flag and the stored target are local to the optical observatory (natively shared with the radio lab through one dialog instance).
- The programmed-slew confirmation is the existing web dialog; it shows the decoded native text "Slew Telescope to Target Coordinates?…" and, after a B1950 entry, "(Input B1950.0 Coordinates Precessed to J2000.0.)".
- The hot-list window's List/Selection menus are buttons; Edit, Delete, Undo and Save List stay in the *Original hot lists* editor.
- List rows use the recovered ordinal formatter 0x590248 (number + RA + Dec, as natively for no exercise/Hubble/Pleiades); the ID and remarks are shown in a second decimal line, and Search matches the native row text only.
- The window caption is the exercise-0 caption ("Hot List File: …" / "New Hot List File"); " (Modified)" is not tracked.
- Hot-list Print is a scoped browser print of the caption and rows; the date, names and laboratory table number of the original header are not recovered and not printed.
- Add Current identifies the object only when the telescope points exactly at the selected catalog target (pixel lookup 0x59a0fc not recovered); its kind (Star/Galaxy…) is not known, so Comments start empty.
- A blank Object ID is refused for new rows because the HTL writer requires one (natively "Position added…" is allowed).
- An RA of exactly 24 h is refused in Add/Edit because the HTL codec stores 0 ≤ RA < 24.
- Site Parameters is natively an instructor dialog (Options ▸ Scopes); here students may set it, and it drives only the clocks (local time, LST) and the horizon; acquisitions, profiles and journals keep the compiled site.
- Set Date/Time is the main window's dialog (TUTTimeDlg), offered from the observatory; its Object X ID field is not shown.
- Optical Simulation Options offers only Limit Slewing (default off); every other control is listed "Not available in OpenVireo"; Edit Mode stays off.
- Within the ±1e-9° horizon boundary guard, Limit Slewing refuses (Number cannot settle the Extended comparison).
- Limit Slewing checks run while the browser clock runs (native ClockTimer always runs).
- Spectrum Save is a browser download (no file dialog/overwrite prompt); Print is a scoped browser print. Sky exposure Save/Print stays absent.
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

Vitest: opticalSkyCoords (11), opticalHotList (9), hotListPrint (9), hotListEntry (5), observatorySite (7), slewLimit (5), observatorySession v26 (2), bundledExerciseLists (1). Playwright: optical-sky-coords (2), optical-b1950 (1), optical-hotlist-window (2, incl. 320 px), optical-hotlist-print (2), optical-hotlist-add-current (3), observatory-site-time (2), optical-limit-slewing (2), spectrometer-save-print (2), optical-daily-use (1). Tests are evidence of the chosen contract, not an oracle for the original.

## Not recovered / open

- Object lookup under the pointing (0x59a0fc pixel/tolerance), Print Sky Image content, spectrometer flag +0x3172.
- Whether TStationDlg/TOptionsDlg edits reach a running observatory before the next telescope setup (OB-ST-04).
- Hot-list order: B0 reads the loader 0x5903d8 as appending in file order (comparators without a traced caller), which contradicts the reviewed radio RA-HL-03/04 (RA insertion). The optical window keeps the reviewed radio projection; needs adjudication.
- data/observatory/horizon-provenance.json names +0x27cd as the source of env+0x2e7d; B0 shows +0x27c9 (Limit Slewing). Same default; the data file is outside this front and was not edited.
- Native x87/Extended arithmetic, FloatToStrF and GDI printing are not reproduced (binary64, toFixed, browser print).
