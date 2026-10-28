# QSO List and HST Image Archive (Front O2)

**Status:** implemented on branch `claude/front-o2-qso-hst`. Review 1 (`analysis/reviews/front-o2-review-1.md`, MERGE-AFTER-FIXES) is applied: M1 Virtual Observatory gate, M2, L1–L3, I1, I3, I4, and the user's HST decision of 2026-10-28.

**Plan:** research root `analysis/front-plans/front-o2-qso-hst.md`.

**Evidence:** `analysis/front-o-info-forms/dossiers/o2-*`. Hashes are in `o2-SHA256SUMS` and in
`docs/QSO-LIST-HST-PROVENANCE.json`.

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) only; nothing was executed, emulated or sent.

**Tags:** [D] read from code or data · [I] inferred · [W] web adaptation.

## What a student can do

- **Virtual Observatory (instructor, VIREO)** in Optical Simulation Options shows **File › QSO List...**. It is off by
  default and not saved, as in VIREO (below).
- **File › QSO List...** opens *Options for QSO List*:
  - The magnitude limit defaults to 20.00.
  - Without Edit Mode, *Sort Options* is disabled and the list is sorted by magnitude.
- **OK** opens *CLEA QSO Data*. It lists every quasar of CLEA_QSO.DAT with V ≤ the limit:
  - Name, RA and Dec (J2000) and V.
  - Search, Print, Save Text and Selection › Add / Start New Hot List.
- **With Edit Mode on** (Optical Simulation Options, Front O):
  - The sort can be magnitude, Z ascending, Z descending or RA.
  - The list adds the Z, B−V and U−B columns. Colours in parentheses are assigned means.
- **Tools › HST Image Archive...** is an external link to the current Hubble image archive page (below).

## Recovered contract

### Access [D]
- `File › &QSO List...` (TEnvironment1 QSOList1) is hidden in the DFM. Each Run Exercise handler sets its visibility:
  - hidden in Photometry, HR, Spectra, Hubble and Pulsars;
  - in *The Quest for Object X*, equal to the Edit Mode byte (env+0x2e7e, 0x58ad55);
  - visible in *Virtual Observatory (All Instruments)* (0x58af02).
- *Virtual Observatory (All Instruments)* (TEnvironment1 VirtualObservatoryAllInstruments1, +0x49c) is enabled only from
  options byte +0x27d5 (TMenuItem.SetEnabled 0x4548ac at 0x587f91 and 0x588898). That byte is the Options checkbox
  **VObsBox** (caption `Virtual Observatory`, hint `Enables Virtual Observatory (read-only access to all data)`; shown at
  0x5a5ab9, stored by OK at 0x5a620e, **compiled default 0** at 0x5a2b59).
- The Options dialog (Preferences1Click 0x5886ac) is instructor-gated: without env+0x37d8 it shows the
  `INSTRUCTOR := …` / `USER OPTIONS!` box (0x588a84 / 0x588b70). [I] env+0x37d8 is the instructor access flag (set at
  0x587c6a, 0x587f70, 0x5884a1, 0x5887f0). No options file ships in the VIREO folder.
- **So, in a default VIREO, no student sees File › QSO List.** It appears after an instructor turns on Virtual Observatory
  (then Run Exercise › Virtual Observatory), or with Edit Mode on before Object X; LSS leaves the item as it was.
- **Web [W]:** OpenVireo has no Run Exercise modes. The *Virtual Observatory (instructor, VIREO)* box in Optical Simulation
  Options stands for VObsBox plus the run item: off by default, not saved, no session change, no instructor login. Its only
  effect is to show File › QSO List. The Edit Mode route through Object X is not modelled; Edit Mode keeps its own effects
  inside the list (Sort, Z and colours).
- The File menu is hidden when it has no item (Edit Mode and Virtual Observatory both off). File and Tools are disabled only
  while a project is read or written: VIREO's main menu does not depend on the dome or on motion (review 1 L1).

### Options for QSO List (TQSOListDlg) [D]
- **FormActivate** (0x57836c):
  - A zero limit becomes 20.0, shown with two decimals.
  - Without Edit Mode the sort is reset to *App. Mag (Ascending)* and the group is disabled.
- **OK** (0x578430):
  - Reads the limit with StrToFloat as a Single. There is no range check: the edit's hint `0.00-7.00` is not enforced.
  - A bad number shows `Invalid Magnitude Limit` / `Numeric Error!` (MB_ICONERROR) inside the except block, sets
    ModalResult := 0 and leaves through `_DoneExcept` (0x405840), not Abort. Execution continues and stores the sort
    (0x5784b4..0x5784c4); the limit keeps its old value. The dialog stays open. The web does the same.
  - The limit and sort are process globals; the web keeps them for the page session [W].

### The list (builder 0x5776f0, row 0x577df0) [D]
- **Reading:** records are read in file order. A record is kept when V is not greater than the limit, so V equal to the
  limit is kept.
- **Sorting:** each kept record is placed with VIREO's sorted-cursor insert (0x492728, the same rule as the variable list), so
  ties follow read order, not a stable sort. Comparators:
  - V (0x578314);
  - z ascending (0x578324) or descending (0x578334);
  - RA, then Dec (0x578344).
- **Title:** `<n> QSOs to magnitude <faintest V listed>, sorted by ` + `magnitude.` | `Z(ascending).` | `Z(descending).`.
  - The RA sort appends nothing.
  - With no rows, the faintest V is VIREO's starting value, `-2.00`.
- **Header lines:**
  - `Positions are J2000.0`;
  - Edit Mode only: `"(...)" indicates an assigned mean color.`;
  - a blank line;
  - the column header (with or without Z);
  - the units line, whose `d` is overwritten with `°`.
- **Row:**
  - the catalogue name padded to 18;
  - RA `hh mm ss.s`;
  - Dec `±dd mm ss`;
  - Edit Mode only: z (3 decimals);
  - V (2 decimals);
  - Edit Mode only: B−V and U−B with sign, in parentheses when assigned.
- **Without Edit Mode the original never shows z or colours.**

### The window (TQSORptForm1, a TObjctListForm1) [D]
- It is the Star Data List's window class (docs/OBJECT-INFO-FORMS.md) with Get Selection Data and its separator hidden.
- Double-click does nothing. Comma Delimit stays disabled.
- **There is no Slew.**
- Save Text proposes `QSO Data.TXT`.
- *Add Selection to Current Hot List* uses the selected row of the current sort. The hot-list record gets:
  - the raw name (cut to 24);
  - RA and Dec;
  - no remarks: the original leaves that field uninitialised, so the web writes none [W].
- **Hot-list row [W] (review 1 L3):** FormatforHotList (0x578548) indexes the list of the *current sort global*, not the
  displayed one. The global changes after the list is built when FormActivate resets it to 0 without Edit Mode (0x578392,
  even if the dialog is then cancelled) or on the invalid-limit path. The builder clears all four lists and fills only the
  selected one, so VIREO can then index a cleared or different list ([I] an index error or a wrong row). The web always
  adds the displayed row.
- Print without Edit Mode takes the student branch: the date line ends with `     Laboratory Table Number ` and the number,
  or `(Not Recorded)`. This site records neither a table number nor names, so it prints `(Not Recorded)` and omits the
  name lines [W].

## Web rules for exercise answers

- **Object X [W]:**
  - Rows within 0.25° (`OBJECT_X_ON_TARGET_DEGREES`) of an ObjectX.HTL position, or of the lab's hidden target, are not
    listed, in either mode. In VIREO the list is hidden during the Object X exercise unless Edit Mode is on.
  - Today exactly three records are withheld: **3C 273.0, HE 0353-3919 and HS 1603+3820** (checked over all 2269).
  - The count and faintest V describe the listed rows. A neutral note says rows near Object X targets are withheld, without
    a count.
  - If ObjectX.HTL cannot be read, the list is not shown (typed reason).
- **Redshift:**
  - z appears only in Edit Mode, as in VIREO.
  - No exercise answer is a QSO redshift: every E01/E02 answer is a galaxy z, and E02 rows with a QSO in the field are
    typed unavailable. The E08 QSO targets are withheld. For the record, the nearest QSO to any of the 232 Hubble.HTL and
    LSS_Field01..09 targets is KUV 13060+2839, 3.78′ from NGC 4983 (LSS_Field04; tested).
  - Unlike Catalog Object's galaxy z, nothing else needs masking.

## Tools › HST Image Archive [D]
- `HS&T Image Archive...` (TEnvironment1, Tools menu, 0x58e78c) passes the File Options string *HST Newscenter Archive URL*
  (options+0x23cd) to a zero-size `TWebBrowser.Navigate` (0x58ebe0, flags 0x11; [I] open in a new window).
- Its compiled default (0x5a2f00) is **`http://hubblesite.org/newscenter/archive/browse/`**.
- It is a **fixed URL**: no template, coordinates or object name.
- **Web [W], user decision of 2026-10-28 (AGENTS.md):** the Tools item is a plain external link, opened in a new tab only
  when clicked (`target="_blank"`, `rel="noopener noreferrer"`). Nothing is sent and nothing is fetched before the click.
- **Address check, 2026-10-28** (one GET per address from a shell, not from the app):
  - `http://hubblesite.org/newscenter/archive/browse/`: port 80 refused the connection. Over https it redirects to
    `https://science.nasa.gov/mission/hubble/`, the mission home page, not an archive.
  - `https://hubblesite.org/resource-gallery/images` redirects (two steps) to
    `https://science.nasa.gov/mission/hubble/multimedia/hubble-images/` ("Hubble Images - NASA Science"), the current
    equivalent of the image archive. **The link uses this hubblesite.org address**; its final page is on science.nasa.gov
    because NASA serves hubblesite.org from there.
- A note under the link names the original address.
- **THSTImgDlg is not ported.**
  - *Search HST Image Archive*: field center, locator (*Position* / *Object Name*), name.
  - It is created at startup (0x5ad43c) but never shown: no menu or code reads its form variable or class.
  - Its OK only validates RA/Dec (`Right Ascension is Invalid!`, `Declination is Invalid!`) and writes `RA, Dec` to the
    console.
  - Its disabled timer would show a `StSci-MAST Web Service` / `Waiting for Data Download` box and write
    `TestImageList.csv`.
  - No MAST URL exists anywhere in the executable.
  - [I] an unfinished prototype.

## Code and tests

- `src/core/qsoList.ts`: pure options, builder, row and hot-list fields.
- `src/core/observatoryMenuLiterals.ts`: menu captions without heavy imports.
- `src/observatory/ObservatoryFileMenu.tsx`:
  - File (Field Information in Edit Mode, same test ids as Front O; QSO List with Virtual Observatory) and Tools (HST link);
  - disabled only while a project is busy (`fieldInfo.busy`, one line in OpenVireo.tsx).
- `src/observatory/OpticalOptionsDialog.tsx`: the Virtual Observatory box.
- `src/observatory/QsoListWindow.tsx`: lazy loaded.
- `src/observatory/QsoListMessages.ts`.
- `src/io/objectXMask.ts` `objectXOnTarget`.
- Tests:
  - `src/core/qsoList.test.ts`: real-catalogue rows and headers in both modes, sort suffixes and order, tie rule, empty list,
    limit parsing, the Object X set and the nearest QSO–target distance;
  - `tests/qso-list.spec.ts`: the Virtual Observatory gate (and the menu with the dome closed), student path with
    Search/Save/Print/hot list, Edit Mode sorts and columns and the invalid-limit sort store, the HST link (href, target,
    rel, no request before the click, no opener), fail closed without ObjectX.HTL, 320 px dark.
- No new resources: CLEA_QSO.DAT, ObjectX.HTL, Hubble.HTL and the LSS lists are already bundled.
