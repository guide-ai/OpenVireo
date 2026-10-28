# QSO List and HST Image Archive (Front O2)

**Status:** implemented on branch `claude/front-o2-qso-hst`.

**Plan:** research root `analysis/front-plans/front-o2-qso-hst.md`.

**Evidence:** `analysis/front-o-info-forms/dossiers/o2-*`. Hashes are in `o2-SHA256SUMS` and in
`docs/QSO-LIST-HST-PROVENANCE.json`.

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) only; nothing was executed, emulated or sent.

**Tags:** [D] read from code or data · [I] inferred · [W] web adaptation.

## What a student can do

- **File › QSO List...** opens *Options for QSO List*:
  - The magnitude limit defaults to 20.00.
  - Without Edit Mode, *Sort Options* is disabled and the list is sorted by magnitude.
- **OK** opens *CLEA QSO Data*. It lists every quasar of CLEA_QSO.DAT with V ≤ the limit:
  - Name, RA and Dec (J2000) and V.
  - Search, Print, Save Text and Selection › Add / Start New Hot List.
- **With Edit Mode on** (Optical Simulation Options, Front O):
  - The sort can be magnitude, Z ascending, Z descending or RA.
  - The list adds the Z, B−V and U−B columns. Colours in parentheses are assigned means.
- **Tools › HST Image Archive...** explains why it is not available (below).

## Recovered contract

### Access [D]
- `File › &QSO List...` (TEnvironment1 QSOList1) is hidden in the DFM. Each Run Exercise handler sets its visibility:
  - hidden in Photometry, HR, Spectra, Hubble and Pulsars;
  - in *The Quest for Object X*, equal to the Edit Mode byte (env+0x2e7e, 0x58ad55);
  - visible in *Virtual Observatory (All Instruments)* (0x58af02).
- So VIREO's students reach the list in the all-instruments observatory, without Edit Mode.
- OpenVireo's optical observatory is that observatory, so the item is always shown there [W].

### Options for QSO List (TQSOListDlg) [D]
- **FormActivate** (0x57836c):
  - A zero limit becomes 20.0, shown with two decimals.
  - Without Edit Mode the sort is reset to *App. Mag (Ascending)* and the group is disabled.
- **OK** (0x578430):
  - Reads the limit with StrToFloat as a Single. There is no range check: the edit's hint `0.00-7.00` is not enforced.
  - A bad number shows `Invalid Magnitude Limit` / `Numeric Error!` and keeps the dialog open.
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
  - After the Object X rule, no listed QSO lies within 2′ of any Hubble.HTL or LSS_Field01..09 target (232 targets,
    checked), so no exercise answer remains in the Z column.
  - Unlike Catalog Object's galaxy z, nothing else needs masking.

## Tools › HST Image Archive [D]
- `HS&T Image Archive...` (TEnvironment1, Tools menu, 0x58e78c) passes the File Options string *HST Newscenter Archive URL*
  (options+0x23cd) to a zero-size `TWebBrowser.Navigate` (0x58ebe0, flags 0x11; [I] open in a new window).
- Its compiled default (0x5a2f00) is **`http://hubblesite.org/newscenter/archive/browse/`**.
- It is a **fixed URL**: no template, coordinates or object name.
- **Web [W]:** the item opens a box with a typed reason (`external-site-not-approved`) showing that URL as text. No link and
  no request; opening external sites is a user decision (docs/EXTERNAL-SERVICES.md).
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
  - File and Tools menus;
  - File › Field Information (Edit Mode) moved here from FieldInformationMenu, same test ids.
- `src/observatory/QsoListWindow.tsx`: lazy loaded.
- `src/observatory/QsoListMessages.ts`.
- `src/io/objectXMask.ts` `objectXOnTarget`.
- Tests:
  - `src/core/qsoList.test.ts`: real-catalogue rows and headers in both modes, sort suffixes and order, tie rule, empty list,
    limit parsing, the Object X set and the Hubble/LSS check;
  - `tests/qso-list.spec.ts`: student path with Search/Save/Print/hot list, Edit Mode sorts and columns, HST box with no
    request, 320 px dark.
- No new resources: CLEA_QSO.DAT, ObjectX.HTL, Hubble.HTL and the LSS lists are already bundled.
