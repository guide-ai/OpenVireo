# Object and field information forms (Front O)

Status: implemented on branch `claude/front-o-info-forms-eb3a61`; awaiting the coordinator's independent high-effort review.

| Step | Who | Model · effort |
|---|---|---|
| Static recovery A–E | general-purpose subagents | claude-opus-5-5 · default (medium) |
| Plan | Plan subagent, `analysis/front-plans/front-o-info-forms.md` | claude-opus-5-5 · high |
| Implementation | Claude Code session | claude-opus-5-5 · medium |
| Independent review | coordinator | pending |

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
- **Catalog Object:** shows values but does not edit them.
- **Print:** a preview of the page body. Date in the browser's format; layout and fonts differ.
- **Save Text:** a download.
- **Start New Hot List:** asks whenever the list has rows; Yes downloads the list.
- **Naked-eye sky:** discs instead of star sprites, and no dome shutters drawn.

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

The test sweep certifies 193 of 227 pack pointings. The 34 Boötes-area pointings stay `population: variable-merge`, because their variable update is not modelled.

Object X packs are excluded:
- Web Edit Mode has no password, so these forms would reveal hidden E08 identities.
- The engine does not model asteroids in those fields.

Both lists and the layer are masked (`object-x-hidden`) near an unrevealed target.

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
  - z as `FloatToStrF(ffExponent,4,2)`, e.g. `4.899E-02`;
  - Size `major[xminor]` with 1 decimal.
- **Field, LED and colour table:** FormActivate `0x56005c`, then the Telescope view pass. Assigned values light the LED red
  (yellow is never shown, [D]). TypeEd is magenta for non-stellar objects.
- **GCVS:** enabled only for a type-0 star carrying a variable record (`0x56034e`). The engine ports only the false variable merge, so no certified star carries one, and the button is disabled with `gcvs-no-variable-record`. The working path from the observatory to the variable data is item 6 above. GCVS turns on once the true-dispatch merge (+0x5b) is ported. That is a separate, later front, after Front F's follow-ups merge (coordinator decision 2026-10-28). The route prop (`openRequest`) is already wired for it.
- **Not ported:**
  - **Update** (`update-master-catalog`): `0x59a54c` rewrites `GSC\<band>.DAT`.
  - **OK write-back** (`record-edit-unavailable`).
- **Typed record faults:**
  - `galaxy-colour-residue`: T 17–19 or above 20.
  - `galaxy-type-fault`: a barred type whose base has no S or I, or T outside −7..20 (37 records have T = −9).
  - `spectral-code-unformattable`: codes the ported formatter cannot render. `0x55d4f4` never raises; the ported `formatObservationType` agrees for valid codes. Witness examples it rejects: 999, −60405000, 5000000, 21503000.

## Star Data List (FO-SL)

The original form is TFieldRptForm1 < TClstrRptForm1 < TObjctListForm1 (RECOVERY-B).
- **Caption:** `CLEA Star Field Data`.
- **Content:** 19 header lines, then one row per NewGSC object (stars and QSOs) in collection order.
- **Row format** `0x5354e8`: `+` inserted on B−V/U−B, `* ` for assigned values, `*`/`#` class flags. A rounded negative zero prints `+0.00`.
- **Comma Delimit** is enabled: header lines, two literals, then the column-to-comma transform.
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
- **Sky:** built when the dome opens, then frozen (`DomeSw1UpClick`; no clock rebuild). Built from:
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
- **Witness data:** `data/fieldinfo/info-witness.json`, a derived manifest entry produced by `tools/info_witness.py` (SHA-256 `f2aeb514…a08`).
- **Playwright:** `tests/object-info-forms.spec.ts`:
  - Edit Mode off parity;
  - Catalog Object by click and keyboard;
  - Star Data List search, save, CSV, print and disabled hot-list items;
  - Variable list: add, start new, slew, Get Selection Data;
  - modeled and uncertified reasons;
  - Naked Eye Star at 320 px in dark mode.

The witnesses are second implementations of the same reading. They check the port, not the reading, and are not runtime oracles.

## Not done

- The original Telescope display's click offsets (view offsets E[+0x41c439/+0x6a6]); the web assumes a fresh unpanned field.
- The FSC finder catalogue (Finder-view Catalog Object).
- The true variable merge (GCVS button), which belongs to Front F.
- The popup menus (right-click on list rows). Their items are the Selection menu's.
- Window auto-sizing.
- The printed lab/student lines of non-Edit-Mode printing (unreachable here).
- The dome shutter and rib drawing, and StretchBlt resampling.
- TInfoListForm1: it is a base class. In the telescope window its only direct instance is Site Information (`Current Site & Telescope Parameters`); its descendants (results lists) are covered by other fronts. No field list uses it (RECOVERY-B §7).
