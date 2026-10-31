# Front R4: option follow-ups

**Status:** R4.1 and R4.3 implemented on branch `claude/front-r4` (2026-10-31). The other items were split off:
- R4.4 and the light-curve half of R4.5 are Front R4b (merged; `docs/` notes there);
- R4.2 and the HR half of R4.5 are Front R4c (`analysis/front-plans/front-r4c.md`).

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) only; nothing was executed, emulated or sent. No new
resource and no new approval.

**Research:**
- plan: `analysis/front-plans/front-r4.md`;
- dossiers in `analysis/front-r4/`:
  - A: object ID and magnitude, the current object, Add Current;
  - B: Monochrome / Print in Color and the light-curve page;
  - C: the info-list print page, View/Print Parameters, Camera Information;
  - D: the wedge re-plot and Time-Dependent Data.

**Tags:** [D] decoded · [I] inferred · [U] unknown · [W] web adaptation.

## R4.1 Show Object ID / Show Object Mag

**The options** [D]:

| Option | Storage | Compiled |
|---|---|---|
| Show Object ID (ObjIDBox) | record+0x27cd = env+0x2e81 | off |
| Show Object Mag. (spMagBox, Spectrometer tab) | +0x27cc = env+0x2e80 | off |

- Both are live check boxes in Optical Simulation Options and last for the page session (WEB-OPT-R3).
- Nothing turns them off within a session except the student's Options OK or the dialog's Reset, which restores the compiled
  defaults (0x5a21d0 via ResetBtnClick 0x5a6db7) [D].

**Exercise forcing:** VIREO's exercise menus write the exercise byte env+0x383f and force the options on [D]:

| Menu | Address | Code | Show Object ID | Show Object Mag |
|---|---|---|---|---|
| Photometry | 0x58a3a2 | 3 | on | — |
| HR Diagrams | 0x58a54c | 7 | on | — |
| Stellar Spectra | 0x58a70e | 2 | on | on |
| Hubble | 0x58a8d8 | 4 | on | on |
| LSS | 0x58aabe | 5 | on | on |
| Object X | — | 1 | — | — |
| Pulsars | — | 6 | — | — |

**[W]** The web has no exercise menu. Header › Guides stands in for it: opening the Pleiades photometry, Cluster HR,
Classification, Hubble, LSS, Object X or Pulsar guide applies that row and sets the session exercise code. The cluster
database's own guide button counts as the Cluster HR guide (code 7). Each forcing guide says what it turns on. The code is read
only by Add Current's kind remark.

**The current object (0x53cf94 ← 0x53ce8c ← 0x59a0fc)** [D]:
- The pointing is projected onto the instrument field and the nearest object is taken: strictly nearest below 350 px, with the
  first in list order winning ties.
- A galaxy closer than the nearest star wins only inside its radius, otherwise there is no object. When both are close, the
  galaxy wins only if the star's throughput is zero.
- It is refreshed only at photometer and spectrometer activate, camera Save and Add Current. Moving the telescope does not
  refresh it.

`core/currentObject.ts` reuses `core/objectSelection.ts` on the certified field population at the pointing, in the 936-px /
0.75° instrument frame:
- **Point used** [W]: the frame centre. VIREO searches the field of the last field load, which may be off-centre.
- **Search radius** [W]: always the 936-px / 0.75° frame, so 350 px ≈ 16.8′. VIREO scales by the selected instrument's field
  (Obs+0x41c4b7); with the photometer as the instrument 350 px is about 1.1′ (dossier A §2.2 [I]). Add Current can therefore
  name an object farther away than VIREO would.
- **Tie case** [U]: the tie needs the star's throughput, which depends on the instrument. When it cannot be computed, the
  result is typed `unresolved` and readers treat it as no object.
- **No field** [W]: a field that cannot be built (refused tiles, a population reason) gives no object.

**Object X:** VIREO never masks the name [D]. It is hidden only because Show Object ID starts off, and an earlier exercise in
the same session would reveal it.
- **[W] The mask stays on after Reveal.** It covers every ObjectX.HTL row ±2° (plus the lab's hidden target) at all times, so
  after Reveal, or in a session with no Object X activity, nothing near those rows is named. This fails closed, like Edit Mode
  and Field Information; no LSS row or Pleiades target is inside it.
- **[W]** Never naming a hidden target is a web rule (E08). Every reader goes through `shownCurrentObject`, which needs a
  checked `clear` Object X mask state; anything else hides the name and the magnitude.
- `io/currentObjectAt.ts` checks the mask first (the field's farthest corner), so nothing is loaded near an ObjectX.HTL
  position or the hidden target.

| Reader | VIREO rule [D] | Web |
|---|---|---|
| Photometer IDText (0x4ffa30, at Start and Object/Sky changes; the object refreshed at FormActivate 0x4ff909) | `Telescope` until the first update; option off `Unknown`; on and sky or no object `Sky`; on: the name | Photometer bench, `photo-id-text`, clLime on black. [W] The object is 0x59a0fc's pick in the bench target's object field (never the sky field's pick), taken whenever the label is drawn; the target changes only at Activate or with the web's target list. The Object X mask is keyed to that star and fails closed while unknown (`Telescope` is shown then) |
| Photometer recorded name (+0x620, 0x4fffd4) | sky `Sky`; on: the name ≤15, trailing spaces removed; off: `UNKNOWN` / `ObjX-`ID | `photometerRecordedName` (waits for the native photometer Record writer) |
| Camera native Save (0x522c28 → 0x5230dc, 0x5239f8) | on with an object: Name+`-01.FIT` (String[31]) and OBJECT Name (String[68]); otherwise the Object X label | "Save image (VIREO header)" refreshes the current object (`cameraCurrentName`). [W] At the image's centre, not at the telescope pointing when Save is pressed |
| Add Current (0x53f0fc) | ID = the name; remark = Star/Galaxy/Asteroid/QSO only when the exercise code is 0; RA/Dec = the pointing | Slew › Observation Hot List › Add Current; the button says it is looking while the field loads, and disabling the menu aborts the lookup |
| Spectrometer IDText, MagText, Save name, Print (0x50df64, 0x50e00b, 0x50fb1c, 0x510954) | see `core/currentObject.ts` | wired by Front R4d (section below) |
| Multi-Spec | its readers already ported | reads the global options since Front R4d; its two local check boxes are gone |

**Fixed:** Add Current used to pass the selected target's unmasked ID when the pointing equalled it. A hidden Object X target
pointed at exactly showed its real ID; it now prefills nothing (e2e).

## R4d Spectrometer and Multi-Spec readers (2026-10-31)

Plan: `analysis/front-plans/front-r4d.md`.

**What VIREO does** [D] (dossier A §1, show-object-id §1b):
- TSpectrometer.FormActivate 0x50dac4 refreshes the current object and sets the sky flag +0x416 when there is no object or its
  throughput 0x50f338 is exactly 0 (0x50db1a..0x50db2d): a star or QSO more than 0.00028 h in RA or 0.0064° in Dec from the
  pointing, or a galaxy at slit level 0. A sky reading's object is `Sky`, kind 4. 0x50df64 then fills:
  - IDText, visible only with Show Object ID: `Sky`, or the name padded to 13;
  - MagText, visible with Show Object Mag or Edit Mode: V with 2 decimals padded to 6, or '' for a sky reading.
- Save 0x50fb1c: the default name is the name + `.SSP` with the option on (`Sky.SSP` for a sky reading).
- Print 0x510294: a sky reading prints `Reading Sky` whatever the options; an object reading prints the `Object: ` line
  (_PStrNCat, at most 32 characters on the whole line) and the `Apparent Magnitude (V): ` line.
- The .SSP header 0x510090 is **not** an option reader: it always carries the object name and V.

**Web:**
- **`VireoOptionsContext`** carries Show Object ID, Show Object Mag, Edit Mode and the page's gated current-object reader
  (`io/currentObjectAt.ts`).
- **`observatory/SpectrometerReadout.tsx`** (`useSpectrometerObject` + the two boxes) is on:
  - the star route;
  - the galaxy/Hubble route;
  - the sky route (`Sky`, empty magnitude);
  - the LSS acquisition;
  - the field spectrometer (at the prepared pointing);
  - the Object X route (always hidden, never looked up).
- **No lookup with the options off:** the current object is looked up only while a box is visible. With the compiled defaults
  nothing is fetched and nothing is shown.
- **Pending:** while the lookup runs, IDText keeps the DFM caption `Telescope` and Save waits.
- **[W] Refresh:** on route activation and when the route's pointing changes (VIREO: FormActivate).
  - Star, galaxy and LSS look up at the target or row position. The field spectrometer looks up at its prepared pointing.
  - The object is 0x59a0fc's nearest object there, in the 936-px/0.75° frame, as for Add Current.
- **Sky reading** (review 1 M1, Front R4e): the field spectrometer is a sky reading when 0x50f338 gives 0 for the slit object
  the field engine selected (the same 0x59a0fc object). `fieldSpectrometerSkyReading` computes that throughput itself from the
  selection, the frame's slit level and the pointing, because the engine reports `slit-empty` only on the branches that reach
  its own throughput: an invalid or random spectral index, a variable whose values are unavailable and a galaxy spectrum
  mapping return first. Probe: N0730.DAT@570187 (`star-index-invalid`) 0.0005–0.003 h east reads `Sky`, not `N0730-00812`.
  [W] With no selection or no viewport it is not a sky reading, and a throughput at the precision limit falls back to the
  engine's `slit-empty`. The boxes then show `Sky` and an empty magnitude, and nothing is looked up. The sky route is always a sky reading (print `Reading Sky`). The star, galaxy
  and LSS routes point exactly at their target, so their slit is never empty.
- **[W] No object or an unresolved tie:** the Object box shows 13 blanks. VIREO copies the record from the nil pointer at
  0x50df98 and faults, so it has no defined display. The tie stays unresolved because the current-object lookup has no
  throughput; on the field route it only appears where the engine itself resolved the slit object.
- **[W] Live visibility:** the boxes follow the options at once; VIREO sets their visibility at FormShow [I].
- **[W] The routes keep their own labelled web readouts** (the field spectrometer's "nearest object, selected by the slit", the
  route headings). The VIREO boxes are added beside them.
- **Save default name** (`spectrometerDefaultFileName`):
  - Show Object ID on with a named object: `Name.SSP` (`Sky.SSP` for a sky reading); `\ / : * ? " < > |` become `_`, as in
    Multi-Spec, and a name outside printable ASCII keeps the web name.
  - Otherwise the route's web name, unchanged. So the compiled default saves byte-identical names, and the bytes never depend on
    the options.
  - [W] VIREO's off form (`UNKNOWN.SSP` / `ObjX-<ID>.SSP`) is not adopted, because the web names carry the Classify file-name ID.
- **Print:** the printout adds `spectrometerPrintLines` under VIREO's header (`Reading Sky` on a sky reading, with any options).
- **Classify / Analyze hand-off, CSV and JSON sessions:** unchanged. [W] The hand-off keeps the web file names, so Observational
  Data IDs do not move.
- **Multi-Spec:** reads the context's two options. The masked rule is unchanged: Show Object ID is ignored while Object X
  identities could be named.
- **Object X:** every reader goes through `shownCurrentObject`. At each of the 17 ObjectX.HTL targets, with both options on (and
  Edit Mode), nothing is named:
  - the Object box shows "Name hidden during Object X", and the magnitude box and print lines are empty;
  - Save keeps the label, and the header stays masked;
  - the CSV and the Classify ID stay the label.
  - Tests: `io/spectrometerReadoutObjectX.test.ts` and `tests/front-r4d-spectrometer.spec.ts`.

## R4.3 Wedge re-plot after Record Z OK

**What VIREO does** (TSpectrumEngine.RecordZ1Click 0x58383c, LSS branch) [D]. After TLSSRsltsDlg1 OK:
- **Wedge visible** (+0x57, 0x583921): PlotData1Click 0x58100c redraws the whole own list. It does not Show or BringToFront
  the wedge.
- **Neither the wedge nor LSSRsltsForm1 visible:** it shows the "Z Measurement Saved" box (text 0x583b20, caption 0x583bac)
  and enables the LSS Wedge Plot menu item.
- Cancel and the Hubble branch never touch the wedge.

**Web** [W]:
- "Visible" is "the wedge route has been mounted in this page session" (opened, or restored with wedge options).
- Then every OK hands the whole own list to the wedge with replace, without navigating, and the status line says so.
- Otherwise the status line shows the box text verbatim (`LSS_Z_SAVED_BOX`, length byte 0x8b checked) with a web note.
- The results-window exception and the menu enable are not modelled: the results list is on the survey page and the wedge
  route is always reachable.

See docs/LSS-SURVEY.md, docs/WEDGE-PLOT.md and `liveReplotAfterRecordZ` in docs/WEDGE-PLOT-PROVENANCE.json.

## Review 1 fixes (2026-10-31)

- **M1:** the photometer label named the sky field's pick after a Start at Sky (4 of 24 Pleiades targets). It now uses the
  object field's pick; the e2e asserts `N2230-00526` for `N2230.DAT@146960`.
- **M2:** the Object X mask result is keyed to its star and evaluated synchronously once ObjectX.HTL is loaded, so no
  "Name hidden during Object X" flash, and no name under another star's result.
- **M3:** two option-count specs re-pinned (6 → 5 other options, 10 → 12 check boxes).
- **L1–L6:** hint texts, the [W] labels above, guide texts, the cluster database guide button, Add Current feedback, the camera
  rule wired through `cameraCurrentName` (the unwired `cameraFitsObject` copy was dropped).
