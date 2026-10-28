# Object and field information forms (Front O)

Status: implemented on branch `claude/front-o-info-forms-eb3a61`. Independent review 1 (`analysis/reviews/front-o-review-1.md`, MERGE-AFTER-FIXES) applied: M1 Catalog Object 320 px layout, M2 galaxy z mask, the Object X mask by ObjectX.HTL positions, L1–L11 and the scripted witness reshape.

| Step | Who | Model · effort |
|---|---|---|
| Static recovery A–E | general-purpose subagents | claude-opus-5-5 · default (medium) |
| Plan | Plan subagent, `analysis/front-plans/front-o-info-forms.md` | claude-opus-5-5 · high |
| Implementation | Claude Code session | claude-opus-5-5 · medium |
| Independent review 1 | coordinator (`analysis/reviews/front-o-review-1.md`, raw report kept there) | high |

Order: the plan was written after the recovery notes. Implementation started after the plan and applied its findings:
- the GCVS finding (§0.1);
- the star ID correction (§0.2);
- Object X masking (§0.3);
- the 21 typed reasons.

Two later verifications (RECOVERY-E) changed two parts of the plan:
- the variable list's RA wrap and list order are recovered and implemented, not left typed-unavailable;
- QSO spectral text is `0`.

Evidence is static only: CLEA_VEO.exe `781bc970…c54c`, objdump and DFMs, nothing executed. It lives outside the repository in
`/home/dobleuber/Documents/Codex/2026-10-17/task-2/analysis/front-o-info-forms/`:
- `RECOVERY-A`…`RECOVERY-E`;
- 82 dossiers;
- two Python witnesses.

Every SHA-256 is in [OBJECT-INFO-FORMS-PROVENANCE.json](OBJECT-INFO-FORMS-PROVENANCE.json). Tags: **[D]** decoded,
**[I]** inference, **[W]** web adaptation.

## What VIREO does, and what this site does

In VIREO, Catalog Object and File › Field Information are **instructor tools**:
- They work only in **Edit Mode**, byte env+0x2e7e.
- Edit Mode is off by default (compiled 0 at `0x5a2ad3`).
- It is set only in the Optical Simulation Options dialog, which students reach only through Demonstration Mode or the instructor login.

Naked Eye Star is the one student form: a right-click on the sky seen through the open dome.

| # | Web | Original | Tag |
|---|---|---|---|
| 1 | Slew menu › Optical Simulation Options › **Edit Mode (instructor, VIREO)** › OK. Off by default, not saved, no login. | EditModeBox, OKBtnClick `0x5a60e3`, persisted in VEO_OPTS.INI | W |
| 2 | Telescope view, Edit Mode, certified field: click (or arrow keys + Enter) → lime marker + **Catalog Object** | CRT1MouseUp `0x53cff8`, gate `0x53d4f7`, ShowModal | D (keyboard W) |
| 3 | **File › Field Information › Star Data List** (certified fields) | StarList1Click `0x5404e0` → `0x534e18` | D |
| 4 | **File › Field Information › Variable Stars › All GCVS / VIREO-modeled** (any field) | `0x53dafc` / `0x53db54` → TVarFldLstForm1 | D |
| 5 | List › Search / Print… / Save Text › As Displayed / Comma Delimit / Close | same menus | D; print and save W |
| 6 | Variable list Selection › Get Selection Data → the **Variable stars** page on that record | `0x530130` → TVStarListForm1 | D (page W) |
| 7 | Variable list Selection › Slew to Selection (or double-click / Enter) → Set Coordinates → programmed slew | `0x530180` → ProgrammedSlew | D |
| 8 | Variable list Selection › Add to Current / Start New Hot List | `0x52f5dc` / `0x52f6d4`, record `0x5300f0` | D (modified prompt W) |
| 9 | Open the dome → **Naked-eye sky** → right-click a star (or arrow keys + Enter) → **Naked Eye Star** | TEnvironment1 `0x58d500`/`0x58d53c`, `0x55526c`, TNkdEyeDataForm | D (keyboard W) |

One-line adaptations shown in the app:
- **Edit Mode note:** no login, not saved, and only the click and Field Information follow it.
- **Catalog Object:** shows values but does not edit them, and hides galaxy redshifts (`instructor-value-masked`, see below).
- **Print:** a preview of the page body. Date in the browser's format; layout and fonts differ.
- **Save Text:** a download.
- **Start New Hot List:** asks whenever the list has rows; Yes downloads the list.
- **Naked-eye sky:** discs instead of star sprites, and no dome shutters drawn. On touch screens a tap moves the cursor and **Show star at cursor** picks (iOS fires no `contextmenu` on long press).

None of Edit Mode's other effects are applied:
- hot-list row format, editing and Save Updated List;
- Limit Slewing disabled;
- the Preferences gate;
- Database Update;
- other forms' print branches.

`OpticalOptions` keeps exactly `{limitSlewing}`; the session stays v29.

## Tiers: where complete records exist

The Telescope view on this site draws a preview of the star catalogue (position and V only, `data/sky/PROVENANCE.json`).
Complete records, with IDs, colours, flags, spectral codes, galaxies and QSOs, exist only where the field engine
(`src/core/fieldEngine.ts`, read-only) can rebuild the field exactly.

That means a pointing that is **exactly** a listed pointing of a bundled pack (`packCovers`), loaded by
`src/io/fieldInfoPacks.ts`:
- the four pinned snapshot fields: 36773, 36747, 54876 and NGC 7501;
- the Hubble engine packs: Coma (2 pointings) and Boötes;
- the nine LSS survey packs.

The test sweep (`src/io/fieldInfoPacks.test.ts`, on main c7ba82c) certifies 195 of 227 pack pointings. The 32 Boötes-area pointings stay `population: variable-merge`, because their variable update is not modelled.

Object X packs are excluded:
- Web Edit Mode has no password, so these forms would reveal hidden E08 identities.
- The engine does not model asteroids in those fields.

Masks (`object-x-hidden`, `src/io/objectXMask.ts`), applied whether or not the Object X lab holds a target; a failed read of the hash-checked ObjectX.HTL masks everything:
- **Catalog Object and the Star Data List:** within 2° (`OBJECT_X_HIDE_DEGREES`, the finder field) of any ObjectX.HTL position or the lab's hidden target.
- **Variable Stars list (closure N2):** only when one of its own rows lies within 0.25° (`OBJECT_X_ON_TARGET_DEGREES`) of such a position. The risk is a listed variable that an Object X camera or spectrometer image would contain. Half the largest camera field diagonal (0.4 m) is about 0.2°, and the spectrometer field is smaller. In CLEA_VStrs.dat only AQ CVn (near the ObjectX.HTL star N3000-01915) is that close, so the list is masked only in fields that contain it, instead of across a 7.6° area.

**Galaxy redshift mask (review 1 M2) [W].** Web Edit Mode has no instructor login, so Catalog Object hides a galaxy's catalogue z (`instructor-value-masked`). That z is the answer of the Hubble and LSS exercises (E01/E02); VIREO keeps it behind the login. V, morphology, colours and size stay visible. `fieldInfoPacks.test.ts` checks every certified pointing: no galaxy z appears in the dialog fields or in the Star Data List lines and CSV. The e2e flow at 36773 checks the page text, Search (the z text is not found), Save Text, CSV and the Print preview (closure N3).

Options used:
- QSO merge when the area needs it;
- photograph renames (GLIMAGES.LST) without bitmaps;
- the recovered variable dispatch, as in the exercises.

Elsewhere, Catalog Object and the Star Data List are `field-not-certified`; there is no partial dialog. In the Finder view,
Catalog Object is `finder-catalog-unavailable`, because the FSC finder catalogue is not bundled. The Variable Stars list works anywhere, because CLEA_VStrs.dat is whole-sky.

At a certified pointing in Edit Mode, the Telescope view shows the engine's own field in an overlay
(`EditModeFieldLayer`), so the click and the lists use the field the view shows. Its drawing style is [W].

## Catalog Object (FO-CO)

- **Star record** (NewGSC reader `0x59ad98`, RECOVERY-E §1):
  - ID `band-name`, e.g. `N2230-01167` (RECOVERY-A's region form was corrected).
  - RA/Dec; V, B−V, U−B as Int16/1000.
  - Flags from record byte +0x14.
  - Spectral code from Int32 +8.
  - No GCVS record.
- **QSO record:** type 3, code 99, z at +0x35.
- **Galaxy record:**
  - colours and code from the morphology T;
  - type text from `0x596820`, with bar, luminosity and ring bytes +0x23..+0x25 (`0x598f10..0x598f22`);
  - z as `FloatToStrF(ffExponent,4,2)` (port tested, e.g. `4.899E-02`), masked in the web dialog (above);
  - Size `major[xminor]` with 1 decimal.
- **Field, LED and colour table:** FormActivate `0x56005c`, then the Telescope view pass. Assigned values light the LED red
  (yellow is never shown, [D]). TypeEd is magenta for non-stellar objects.
- **GCVS:** enabled only for a type-0 star carrying a variable record (`0x56034e`). The engine ports only the false variable merge, so no certified star carries one, and the button is disabled with `gcvs-no-variable-record`. The working path from the observatory to the variable data is item 6 above. GCVS turns on once the true-dispatch merge (+0x5b) is ported. That is a separate, later front, after Front F's follow-ups merge (coordinator decision 2026-10-28). The route prop (`openRequest`) is already wired for it.
- **Not ported:**
  - **Update** (`update-master-catalog`): `0x59a54c` rewrites `GSC\<band>.DAT`.
  - **OK write-back** (`record-edit-unavailable`).
- **Typed record faults:**
  - `galaxy-colour-residue`: T 17–19 or above 20.
  - `galaxy-type-fault`: a barred type whose base has no S or I, or T outside −9..20. The table at `0x5b51df + 31·T` starts at T = −9: `QSO/AGN` at `0x5b50c8` (37 CLEA_GLX.DAT records) and T = −8 `''` (review 1 L1).
  - `spectral-code-unformattable`: codes the ported formatter cannot render. `0x55d4f4` never raises; the ported `formatObservationType` agrees for valid codes. Witness examples it rejects: 999, −60405000, 5000000, 21503000.

## Star Data List (FO-SL)

The original form is TFieldRptForm1 < TClstrRptForm1 < TObjctListForm1 (RECOVERY-B).
- **Caption:** `CLEA Star Field Data`.
- **Content:** 19 header lines, then one row per NewGSC object (stars and QSOs) in collection order.
- **Row format** `0x5354e8`: `+` inserted on B−V/U−B, `* ` for assigned values, `*`/`#` class flags. A rounded negative zero prints `+0.00`.
- **Comma Delimit** is enabled: header lines, two literals (`0x5530c8` units line `,Hr,Mn,Sec,°,',''`, two apostrophes, review 1 L2), then the column-to-comma transform.
- **Save names:** `CLEA_Field1.TXT` / `.CSV`.
- **Selection menu:** Add / Start New / Create New Hot List of Entire List are shown disabled with `starlist-hotlist-cluster-bank`. FormatforHotList `0x552a7c` reads the cluster bank `0x5bca88`/`0x5bcaa4`, not the selected field row. This is a probable original defect:
  - with an empty bank the code dereferences nil;
  - with a loaded bank it adds an unrelated cluster star.
- Get Selection Data is hidden and double-click does nothing, as in the original.

## Variable Stars in field (FO-VF)

- **Area:** pointing ± Field Creation Factor 3 × (2.5°/2 finder | 15′/120 instrument). RA half-width H/(15 cos Dec), wrapped into [0, 24).
- **Limits:** V ≤ 14 (finder) / 20 (instrument).
- **Predicate** `0x59848c`: inclusive, and 0.0 passes.
- **Order:** the field list is a sorted cursor insert on (RA, Dec) (comparator `0x4bc950`, insert `0x492728`). A wrapping area is read in two passes (`0x597ac8`). Exact duplicates keep the cursor order, e.g. UY Dra / T Dra.
- **Lines and row:** header literal `Name          Rt. Ascension    Declination   Max   Min  Type`. Flag characters are not shown.
- **VIREO-modeled:** typed `modeled-uninitialised`. Its admission reads stack bytes the fill never writes (`0x52fbd7..0x52fc2d`), so the original's list cannot be reproduced. Only the headers show.
- **Comma Delimit:** disabled, as in VIREO. Its handler only shows the "not available" message.
- **Save name:** `Variable_Stars.TXT` [W]. The original dialog starts with an empty stem.

## Naked Eye Star (FO-NE)

- **File:** NkdEye.dat (bundled byte-exact; approved by the user on 2026-10-28). 2887 records of 20 bytes each: Double RA in hours, Double Dec in degrees, Single V. The Bright Star Catalogue origin is an inference.
- **Sky:** built when the dome opens, then frozen (`DomeSw1UpClick`; no clock rebuild). VIREO also rebuilds it when the optical control switch goes off (`OptCntrlSwChange 0x58c9e7`); that switch has no web counterpart, so close and reopen the dome to redraw (review 1 L10). Built from:
  - the effective site;
  - the observatory clock;
  - the telescope pointing. The centre azimuth is the telescope's; RA exactly 0 means south or north.
- **Geometry (RECOVERY-D):**
  - GAST with nutation (Meeus polynomial; this differs from `localSiderealHours` by about 1 s).
  - Altitude and azimuth.
  - Visibility ±30° in altitude, 20° in scaled azimuth. The wrap is applied after the cos scaling, which drops most stars just west of south; this is kept.
  - Projection W 240, H 262; display 240×305.
- **Pick:** right button, strictly below 10 px, with the click not rescaled (as natively). Marker at (Round x, Round 1.01·y).
- **Form:** RA/Dec read-only; V Mag editable and never saved.

## Typed reasons

All appear in the UI with a one-line explanation (`src/observatory/FieldInfoMessages.ts`):
- field-not-certified
- finder-catalog-unavailable
- object-x-hidden
- asteroids-not-modelled
- population:<engine reason>
- gcvs-no-variable-record
- gcvs-merge-unmodelled
- record-edit-unavailable
- update-master-catalog
- galaxy-colour-residue
- galaxy-type-fault
- spectral-code-unformattable
- csv-row-short
- starlist-hotlist-cluster-bank
- modeled-uninitialised
- polar-area
- variable-csv-not-available
- naked-eye-geometry-unrecovered (not reached; the geometry is recovered)
- naked-eye-file
- loading
- load-error

## Numerical policy

Arithmetic uses Number (binary64) with half-even Round. FloatToStrF ffFixed comes from the Front V port; ffExponent uses `toExponential`. x87 Extended equivalence is not claimed. Threshold cases may differ: 350 px, 10 px, visibility edges, half-way roundings.

## Evidence and tests

- **Vitest:**
  - `variableFieldList`, `nakedEye`, `nakedEyeSky` (four witness vectors);
  - `nativeListFormat` (parity with the existing 1/2-decimal ports; 0-decimal case; Edit Mode defaults);
  - `fieldInfoWitness`: twelve variable lists, ten GSC rows, synthetic rows, spectral/ffExponent/ffFixed tables, CSV, Catalog Object view and pick rule.
- **Witness data:** `data/fieldinfo/info-witness.json`, a derived manifest entry produced by `tools/info_witness.py` (SHA-256 `f2aeb514…a08`, output `a9fc1097…c61`) and reshaped byte-identically by `tools/reshape_info_witness.py` (SHA-256 `2f8a6795…ce1f`).
- **Playwright:** `tests/object-info-forms.spec.ts`:
  - Edit Mode off parity;
  - Catalog Object by click and keyboard;
  - Star Data List search, save, CSV, print and disabled hot-list items;
  - Variable list: add, start new, slew, Get Selection Data;
  - modeled and uncertified reasons;
  - Naked Eye Star at 320 px in dark mode.

The witnesses are second implementations of the same reading. They check the port, not the reading, and are not runtime oracles.

## Review 1 resolution

The raw report is `analysis/reviews/front-o-review-1.md` (verdict MERGE-AFTER-FIXES; no blocking defect, no Object X leak).

| Finding | Resolution |
|---|---|
| M1 Catalog Object breaks at 320 px | One grid row per field; the LED wraps under its row on phones. New 320 px dark e2e checks every value box fits unclipped. |
| M2 galaxy z visible without a login | z masked (`instructor-value-masked`) in the web dialog; Edit Mode note and this doc say so. Vitest sweep over all certified pointings and e2e (page text, Search, Save Text, CSV, Print) check that no z appears. |
| Object X mask only with the lab's target | Masked by every ObjectX.HTL position (`io/objectXMask.ts`), fail closed; e2e points at NGC 2403 without opening the route. |
| L1 T −9/−8 | Table bound −9..20: `QSO/AGN`, `''`. RECOVERY-A erratum. |
| L2 CSV units literal | `,Hr,Mn,Sec,°,',''` (0x5530c8, 17 bytes), pinned in Vitest and e2e. |
| L3 focus | The sky svg is refocused when Catalog Object or Naked Eye Star closes (both checked in e2e). |
| L4 iOS long press | Tap moves the cursor; **Show star at cursor** picks [W]; touch e2e. |
| L5/L6 smoke test and tally | `src/io/fieldInfoPacks.test.ts` pins 195 ready / 32 variable-merge on main c7ba82c. |
| L7 TInfoListForm1 wording | Corrected (13 direct sites; Site Information only in the telescope window). |
| L8 keyboard pick | e2e asserts `N5230-00237`, pinned in `fieldInfoPacks.test.ts`. |
| L9 | VARIABLE-STARS.md: "a later true-dispatch front". |
| L10 | Naked-eye rebuild on the optical control switch documented. |
| L11 | Slew to Selection refills an open Set Coordinates dialog. |
| Witness reshape | Scripted (`tools/reshape_info_witness.py`), byte-identical, hashes above. |

**Closure follow-ups (N1–N3, L9):**
- N1: Naked Eye Star uses label and value rows.
- N2: Variable Stars mask radius 0.25° on its own rows.
- N3: e2e for Search and Print z-masking and for focus after Naked Eye Star closes.
- L9: "a later true-dispatch front".

## Not done

- The original Telescope display's click offsets (view offsets E[+0x41c439/+0x6a6]); the web assumes a fresh unpanned field.
- The FSC finder catalogue (Finder-view Catalog Object).
- The true variable merge (GCVS button), for a later true-dispatch front.
- The popup menus (right-click on list rows). Their items are the Selection menu's.
- Window auto-sizing.
- The printed lab/student lines of non-Edit-Mode printing (unreachable here).
- The dome shutter and rib drawing, and StretchBlt resampling.
- TInfoListForm1 is not a field list. It is instantiated directly at 13 sites (camera information, file-merge and database conversion reports, Site Information) and has five descendants (results lists, spectrum and cluster parameter windows; RECOVERY-B §7). In the telescope window only Site Information (`Current Site & Telescope Parameters`) uses it; it is not part of this front (review 1 L7).
