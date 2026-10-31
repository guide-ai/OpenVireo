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
- Nothing turns them off within a session except the student's Options OK [D].

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
Classification, Hubble, LSS, Object X or Pulsar guide applies that row and sets the session exercise code. The code is read
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
- **Tie case** [U]: the tie needs the star's throughput, which depends on the instrument. When it cannot be computed, the
  result is typed `unresolved` and readers treat it as no object.
- **No field** [W]: a field that cannot be built (refused tiles, a population reason) gives no object.

**Object X:** VIREO never masks the name [D]. It is hidden only because Show Object ID starts off, and an earlier exercise in
the same session would reveal it.
- **[W]** Never naming a hidden target is a web rule (E08). Every reader goes through `shownCurrentObject`, which needs a
  checked `clear` Object X mask state; anything else hides the name and the magnitude.
- `io/currentObjectAt.ts` checks the mask first (the field's farthest corner), so nothing is loaded near an ObjectX.HTL
  position or the hidden target.

| Reader | VIREO rule [D] | Web |
|---|---|---|
| Photometer IDText (0x4ffa30, at Start and Object/Sky changes) | `Telescope` until the first update; option off `Unknown`; on and sky or no object `Sky`; on: the name | Photometer bench, `photo-id-text`, clLime on black |
| Photometer recorded name (+0x620, 0x4fffd4) | sky `Sky`; on: the name ≤15, trailing spaces removed; off: `UNKNOWN` / `ObjX-`ID | `photometerRecordedName` (waits for the native photometer Record writer) |
| Camera native Save (0x522c28 → 0x5230dc, 0x5239f8) | on with an object: Name+`-01.FIT` (String[31]) and OBJECT Name (String[68]); otherwise the Object X label | "Save as VIREO FITS" refreshes the current object at the image's pointing |
| Add Current (0x53f0fc) | ID = the name; remark = Star/Galaxy/Asteroid/QSO only when the exercise code is 0; RA/Dec = the pointing | Slew › Observation Hot List › Add Current |
| Spectrometer IDText, MagText, Save name, Print (0x50df64, 0x50e00b, 0x50fb1c, 0x510954) | see `core/currentObject.ts` | rules tested; **wiring waits for G4c**, whose files are frozen for this front |
| Multi-Spec | already ported with local check boxes | binding to the global options waits for G4b/G4c |

**Fixed:** Add Current used to pass the selected target's unmasked ID when the pointing equalled it. A hidden Object X target
pointed at exactly showed its real ID; it now prefills nothing (e2e).

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
