# Cluster HR tools closer to VIREO (Front V2, E05)

Status: implemented on branch `claude/front-v2-cluster-hr` (milestones M1–M7 of the plan; M8 deferred by the coordinator); the coordinator's independent
high-effort review is pending. Plan (high effort, planner subagent, no code in that pass):
`analysis/front-plans/front-v2-cluster-hr.md` in the research root. Recovery notes: `analysis/front-v2-cluster-hr/RECOVERY.md`,
`RECOVERY-help.md`, `RECOVERY-dialogs.md`. Implementation: Claude Code (claude-opus-5-5), medium effort.

Static analysis only: GNU objdump on exact address ranges of CLEA_VEO.exe (SHA-256
781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c) and the form DFMs. Nothing was executed or emulated. Tags:
[D] decoded from the binary, [I] inference, [W] web choice.

## What changed for the student

| VIREO | Web | Tag |
|---|---|---|
| **Help** on the HR form: "Select Help Topic" (HRAnalHlp.LST, 18 rows) and the "Help - <topic>" window (HRAnalHlp.TXT) | **Help** button in the database, own-pairs, photometer and saved-observation HR views; the same rows, Find Topic, Read/Print Topic, Related Topics links, Back, Search Text, Print Topic | original behaviour; window sizes, fonts and the beep are [W] |
| Database plot draws every point on fixed axes, no frame clip, on a 496×506 picture; cluster name and `# of Stars: N` | Same: 30 Dor shows all 609 (3 outside the axes); the 4 points that miss the picture (Cyg OB2 1, Hyades 2, Mel 20 1) are marked "outside VIREO's picture" in the values table | [D] plot; picture size [I] from the DFM |
| ZAMS drawn only through nodes inside the axes; isochrone not tested | Same | [D] |
| Right-click a plotted star → **Possible Cluster Member** | Right-click (or press and hold) the database plot → Possible Cluster Member with RA, Dec, V, B−V in VIREO's formats and the magenta marker; the record chooser stays as the keyboard path | [D]; marker size [W] |
| Possible Cluster Member › Remove from HR Diagram (Edit Mode only), with VIREO's question | Kept as the pupil's own exclusion, with VIREO's question; labelled as an Edit-Mode tool in VIREO | [D] text; availability [W] |
| File › **Print** | Print preview of the recovered page body, portrait or landscape, then a black-on-white copy of the diagram | [D] page body; image [W] |
| File › Load/Plot › **Select Cluster Data…** → "Clusters for Study" | Same window: VIREO's 16 rows with comments, Selection › Plot / double-click, Print; Search does nothing and Save List is disabled, as in VIREO | [D] |
| File › **Display/Print Data** → "CLEA Cluster Data" | Same listing for the loaded cluster (V bank, removed stars starred) with Search, Print, Save Text and Comma Delimit | [D]; downloads [W] |

## Help (M1)

Resources: `public/original/cluster-help/HRAnalHlp.LST` (715 B, `b50c590f…a61537`) and `HRAnalHlp.TXT` (7557 B,
`3a2f0ef2…c956b`), byte-exact from CLEA_Vireo.zip (`program files/CLEA/VIREO/`) under the user approval of 2026-10-28 (AGENTS.md);
manifest, provenance group `public/original/cluster-help` and THIRD_PARTY_NOTICES entry added. `src/io/bundledClusterHelp.ts`
fetches them from this origin and checks size and SHA-256 before parsing.

`src/core/cleaHelp.ts` ports the shared CLEA help viewer (the variable-star help uses the same class):
- **Index** (HelpList load 0x493264, token reader 0x4867fc): each LST line holds two quoted tokens; `begin` adds a separator
  (unless one precedes) and a `-Heading-` row and indents by two spaces; `end` removes the indent and adds a separator; any other
  token 2 is the topic's file. Lines are read into 80 characters, titles kept to 65. The native exception path deletes an
  invalid list file (DeleteFileA 0x4935e1); the web never deletes anything and refuses a blank line (not in the approved file).
- **Find Topic** (0x493c10): the first title from the start row whose trimmed, case-folded text **equals** the query; no wrap;
  miss `"<query>" Not Found.` / `String Not Found`. A heading row answers `Select a Topic Under "<heading>"` (`Topic Heading`);
  a separator beeps (web: a status line).
- **Topic text** (0x59f174, 0x59f84c): the section after the first `*` line that contains the title, up to the next line that
  starts and ends with `*`; rows are `'  ' + line + '  '` between two `' '` rows; lines over 72 characters are wrapped by
  0x487550 (none in this file). Related Topics (0x5a020c): rows after the `RELATED TOPICS` row open the topic with exactly that
  title; 22 of the 26 related rows resolve. A blank row there makes VIREO read through a nil string (an access violation);
  the web ignores it.
- **Back** (0x5a030c) returns to the entry before the last and deletes **that** entry ([A,B,C] → B, [A,C]).
- **Search Text** reuses the shared Find algorithm (rows joined with the next one, `searchRadioHotListRows`).
- **Print Topic** (0x59fe44): date + laboratory line, student lines (not recovered → placeholder), the CLEA exercise title (on
  the page here, unlike the HR print), the caption, the rows; VIREO prints one page only.

## Plot extent and labels (M2)

`src/core/clusterHrPlot.ts`: pixel x = Round((B−V + 0.5)·120) + 80, y = Round((V − 2)·28) + 15 from the stored **Single**
values, Round half-even; exact in binary64. 0x542bf4 has no frame test, so out-of-frame points are drawn (9 of 2,873 across the
16 datasets: 30 Dor 3, Cyg OB2 1, Hyades 2, M 44 1, Mel 20 2); 4 miss the 496×506 picture. ZAMS nodes are kept only inside the
frame (0x543940); the isochrone is not tested (curve nodes are Extended in VIREO, so they are not rounded through Single).

Corrected labels:
- **"Set E(B-V)"** (option +0x2e90, compiled default 1): in database mode VIREO locks the E(B−V) slider at Round(E·100)
  whenever the ZAMS is toggled (0x543a32). For all 16 clusters this equals the contract's preset tick (Vitest). OpenVireo keeps
  the editable catalogue copy (user decision 1.8), now with a note.
- **"Test Mode"** (option +0x2e7c, default 0): the View/Print Parameters distance line appears only in Test Mode (0x543f43).
  The core comment wrongly called it the extinction option; OpenVireo keeps printing it with the extinction-corrected distance,
  with a note.

Frozen results: none of the saved data changes. Drawn counts and texts in `tests/cluster-database-hr.spec.ts` were updated
(30 Dor 606 → 609 drawn). The database view no longer renders the en.json keys `db.hrDrawn`, `db.axes` and `db.frameNote`
(they described a clipped plot); the own-pairs view still uses `ownHr.drawn`. Those three keys are now unused (left for the
coordinator to remove at merge, to keep en.json untouched).

## Right-click selection and Possible Cluster Member (M3)

`src/core/clusterHrSelect.ts`:
- **Bank order** 0x492728 (cursor-sensitive insertion; comparator 0x535a70 on Single V): equal-V runs are not in source order
  (184 adjacent equal pairs in 30 Dor). The V and RA bank orders equal the witness for all 16 datasets.
- **Hit test** 0x544304: over the whole bank, removed stars included; integer d², strict `<` (ties keep the first in bank
  order), 1000 px cap. 2,816 probe pixels (16 datasets × 16 × 11) equal the witness.
- **Possible Cluster Member** 0x5408ac: Cluster Name, RA `FmtSexagesimal(2,'h ','m ','s')`, Dec `(1,'° ',"' ",'"')`, V and B−V
  `FloatToStrF(ffFixed,18,3)` when below 30; ID #, U−B and Spectral Type (text 0x55d4f4) from the derived sidecar below. The
  Edit-Mode LEDs are not shown (VIREO hides them by default).
- **Remove from HR Diagram** 0x540b90: `Are you sure you want to remove this star from the HR diagram?` … `(Restore via
  "File"->"Restore Removed Points")`, caption `Verify Removal from Plot`; Yes applies the existing exclusion, hides the marker and
  leaves the window open. Exit/Escape close the window (FormClose hides the marker; the web keeps the chosen record).
- The right click writes the existing `picked` field through `chooseClusterPoint`, exactly like the record chooser, so the
  investigation formats are unchanged.
- Touch: iOS Safari fires no `contextmenu` on a long press, so a touch held still for 500 ms (moving more than 10 px cancels
  it, so scrolling still works) picks the same star [W]; a `contextmenu` that Android may send afterwards is ignored. The
  record chooser stays the keyboard path.
- **Add to Hot List** 0x540ccc (M7): the shared "Add/Edit Hot List Entry" dialog (`HotListEntryDialog`, imported) prefilled
  with ID := the star's catalogue ID, remarks := the cluster name (40 characters), RA/Dec := the star's; OK appends to the
  page's shared observation hot list (`appendAddCurrentEntry`, 0x590588) and shows `Object <ID> added to Observation List.`
  The hot list is passed to the cluster view by one prop in `src/OpenVireo.tsx` (coordinator decision Q2).

## Print (M4)

`src/core/clusterHrPrint.ts` (0x542fc8): the print-job title `CLEA Cluster Exercise - …` is assigned after BeginDoc and is not
page text. Page body: date + `     Laboratory Table Number (Not Recorded)`; student lines (placeholder); if the ZAMS is shown and
V−Mv ≠ 0, `Fit of Zero-Age Main Sequence:`, `V - Mv = ` F2 and `E(B-V) = ` F2 at x0+150; `Color-Magnitude Diagram`; then
portrait: the image; landscape: `(Screen Image Printed on Next Page)` at x 700, a page break, `<student 1> - Page 2`, the image.
VIREO prints a capture of its whole window (GetFormImage); the preview prints a black-on-white copy of OpenVireo's diagram [W].
The existing "Print this report" (View/Print Parameters) is unchanged; its note now says that VIREO's own report page
(TInfoListForm1 0x59e4c0) is not reproduced.

## Derived cluster data (approval of 2026-10-28)

`analysis/front-v2-cluster-hr/tools/cluster_sidecar.py` reads CLEA_Vireo.zip as data and writes:
- `data/clusters/cluster-comments.json`: only the 16 comment strings of CLUSTERS.DAT (ShortString[40] at +0x3d; 1632 B,
  `bec9dfb5…45ff2`), matched to the contract by name, RA, Dec and E(B−V). Not the file, not its distance or age columns.
- `data/clusters/cluster-reference-detail.json`: for each of the 2,873 published points, `[native ID, U−B Int16, flag bits,
  spectral code]` from its 27-byte compact GSC record (ID = band + `-` + the 5-character name, reader 0x59b125; flags byte
  +0x14 bits 1/2/4/8 → spectral/luminosity/B−V/U−B assigned; code Int32 +8), with the source band hashes. Every record
  reproduces its published RA, Dec, V and B−V exactly; no new record is published.
Both are in LOCAL-RESOURCES.json, the RESOURCE-PROVENANCE group `data/clusters` and THIRD_PARTY_NOTICES.txt.
`src/io/clusterDetail.ts` loads them lazily and validates every entry.

## Select Cluster Data and Display/Print Data (M5, M6)

- `src/core/clusterList.ts` (TClstrListForm2, fill 0x545de8, row 0x546094): RA order (0x492728 on Double RA), four instruction
  lines, header and units (° at the recovered column), rows `name(25) hh mm ss.s   ±dd mm ss    Diam(4)    comment`; empty list
  text; the no-selection Plot box. Plot loads the dataset through the existing Load path. VIREO's Plot also rebuilds the bank,
  so removed points come back; the web keeps the pupil's per-dataset exclusions (labelled). Print uses the list page body
  (date + laboratory line, student placeholder, caption, lines; the job title is not page text).
- `src/core/clusterReport.ts` (TClstrRptForm1 0x534680 with the HR route's Type of Listing 0 and Sort By V): header lines
  (name; star count; V, B−V and U−B ranges with `+` above 0 and the U−B count, from 0x5359a4/0x5359e4 over every star), notes,
  the column header, then one row per star in V-bank order (Front O's `fieldStarRow`, 0x5354e8) with `*` after the ID of a
  star the pupil excluded. Search, Print, Save Text (`<cluster>.TXT`) and Comma Delimit (`<cluster>.CSV`, 0x552ad8) come from
  Front O's list window; its Selection menu is empty because VIREO hides it from the HR route (AL = 0).

## Evidence

- `src/core/cleaHelp.test.ts` (14): bundled bytes/manifest/witness hashes; the 18 rows and kinds; token/indent/separator rules;
  Find/Read; every topic's row count, Related Topics row and link targets equal `help-witness.json`; wrapping; history; Search
  Text; Print Topic order; fetch failures.
- `src/core/clusterHrPlot.test.ts` (5): out-of-frame and off-picture points for all 16 datasets; Round half-even on Singles;
  ZAMS/isochrone node rules; the "Set E(B-V)" gate arithmetic for all 16.
- `src/core/clusterHrSelect.test.ts` (5): V/RA bank digests, 2,816 hit probes, synthetic cursor rules, ties, cap, member fields.
- `src/core/clusterHrPrint.test.ts` (3): portrait/landscape page bodies and the ZAMS-block gate.
- `src/core/clusterReport.test.ts` (4): the sidecar covers exactly the 2,873 points; for all 16 datasets header lines 0–3
  equal the witness, the U−B line equals a separate Python Decimal computation (`tools/cluster_report_check.py`), every row
  formats and converts to CSV; removed-star marking; flag decoding.
- `src/core/clusterList.test.ts` (3): the 16 rows equal the witness's student-mode rows with Form2's spacing; negative
  declination; empty list.
- Witnesses: `tools/help_witness.py` (SHA-256 `64fb755f…9e073a9e`) and `tools/hr_witness.py`
  (`bf571685…aa3b85c`), pinned by the tests. They are the planner's second reading of the same disassembly: they check the port,
  not the reading. Compact derived fixtures (`src/core/cleaHelp.witness.json`, `src/core/clusterHr.witness.json`) hold the
  expected values and SHA-256 digests; no original bytes other than the approved help files.
- Playwright: `tests/cluster-hr-help.spec.ts` (help flows, tampered file, 320 px dark; Hyades off-picture marking),
  `tests/cluster-hr-select.spec.ts` (right click, Remove question, removed-star hit, 320 px dark),
  `tests/cluster-hr-print.spec.ts` (page body, layouts, print scope), `tests/cluster-hr-data.spec.ts` (Clusters for Study,
  Plot, list print; CLEA Cluster Data lines and text download; member ID/U−B/Sp; excluded star starred; Add to Hot List into
  the observatory hot list; touch long press without contextmenu), plus the updated
  `tests/cluster-database-hr.spec.ts`.

## Not done (follow-ups)

- Observation-mode Display/Print Data needs the RsltsListForm1 row writer 0x5486a8 (not recovered).
- The Cluster Data dialog and its list (TClstrDlgForm1, TClstrListForm1: centre coordinates, Use Telescope Coordinates, Type of
  Listing, Sort By, View/Select, Add Cluster to List, the hot-list rows) — plan milestone M8, not done: its finding list for an
  arbitrary centre needs GSC data that is not published, and Use Telescope Coordinates needs the observatory pointing.
- Right-click in the saved-observation (DAT) view opens VIREO's "Observational Data" dialog; not ported.
- VIREO's report page for View/Print Parameters (0x59e4c0) and TClstrPrmForm1 (Edit Cluster Parameters, out of scope).
- No original-runtime equivalence is claimed; fonts, GDI pixels and x87 evaluation are not reproduced.
