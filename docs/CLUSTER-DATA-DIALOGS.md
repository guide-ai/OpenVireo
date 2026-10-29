# Cluster Data dialogs (Front K)

**Status:** implemented on branch `claude/front-k-cluster-dialogs` (2026-10-29).

**Plan:** research root `analysis/front-plans/front-k-cluster-dialogs.md`.

**Recovery:**
- Front V2 `analysis/front-v2-cluster-hr/RECOVERY-dialogs.md` (§2, §4, §5) and `RECOVERY.md` §4;
- Front O `RECOVERY-B` §5.

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) only; nothing was executed, emulated or sent.

**Tags:** [D] decoded · [I] inferred · [W] web adaptation.

**Data rule:**
- **Used:** the published cluster contract (name, RA, Dec, Diam, E(B−V)), the 16 approved comments and the reference-detail
  sidecar.
- **Never read or shown:** the CLUSTERS.DAT (B−V)o, distance, distance modulus and age columns.
- **Guard:** a research-side script (`analysis/front-k-cluster-dialogs/tools/no_distance_guard.py`) found none of those 64
  values, formatted as VIREO's Edit Mode list would, in the built site, `data/clusters` or the new sources (0 of 352 checks).

## What a student can do

- **Observatory › File › Cluster Data...** opens *Cluster Data Parameters*.
  - VIREO shows the item in its photometry, HR-diagram and all-instruments modes. This site has no modes, so it is always there
    [W].
- **The dialog** (FormActivate 0x535a90) [D]:
  - The name, RA (h, m, s with 2 decimals) and Dec (d, m, s with 1 decimal; −0°xx′ shows `0`) come from the current record.
  - The diameter is shown with 1 decimal, and the limit with 1 decimal (a zero limit becomes 20.0).
  - **Type of Listing / Sort By** are enabled only in Edit Mode. Otherwise they are Student (Finding List) and RA.
  - **Use Telescope Coordinates** is enabled only with the dome open and tracking on. [I] VIREO tests TObsrvtry +0x649 and
    +0x64b, "panel active and drive on". It copies the pointing in the same formats and makes the edits read-only.
- **OK** (0x535e0c) checks, in VIREO's order and with its literals (`Input Error!`):
  - `Diameter is Invalid!`, `Magnitude Limit is Invalid!`;
  - `Right Ascension is Invalid!` (0–24 inclusive), `Declination is Invalid!` (a zero degree takes its sign from a `-` in the
    text);
  - then name, RA, Dec and Diam are stored, and a zero diameter answers `Cluster Diameter is Zero!`.
- **File › View/Select Cluster from List** opens *Clusters for Study* (TClstrListForm1).
  - It shows the recovered lines and the 16 rows (student columns equal the Python witness).
  - Double-click or **Selection › Get Selection Data** copies the row into the dialog. The dialog re-reads the record, so Type
    and Sort return to the record's values [I, FormActivate re-runs].
  - **Add Selection / Start New Hot List** add the cluster centre with its comment as remarks. The right-click popup offers the
    same, only on a selected data row; the right-click does not move the selection.
  - **List › Print** is a print preview.
  - In **Edit Mode** the list adds the E(B−V) column. VIREO's MS TO, Dist, (V−Mv) and Age columns are not published, so they
    are omitted and a note says so [W].
- **File › Add Cluster to List** validates and inserts the cluster by RA (name, RA, Dec, Diam only).
  - The list is then modified, and closing it asks `Cluster List not Saved!`.
  - Save List is a typed reason, because it writes whole records including unpublished values [W].
- **OK → CLEA Cluster Data** (TClstrRptForm1, 0x534680 with AL = 1).
  - It lists the query's stars for the 16 published cluster fields when the dialog's centre and diameter are those of a cluster
    (as Get Selection Data leaves them).
  - **Type 0** (Instructor): the V / B−V / U−B range lines, the notes and the photometry columns.
  - **Type 1** (Student finding list): ID, RA and Dec.
  - **Sort:** the V bank (0x535a70) or RA bank (0x535a80), filled by 0x492728.
  - **Stars:** those with V ≤ the limit.
  - **Selection:** Add Selection to Current Hot List, Start New Hot List with Selection, and Create New Hot List of Entire List
    (stem = name cut before `(`; `All stars from cluster … placed in Hot List`).
  - Search, Print, Save Text and Comma Delimit as the other list windows.
  - Any other centre, diameter or limit above the field gets a typed reason: VIREO searches its full Guide Star Catalog, which
    is not published.

## Why the dialog route is exact for the 16 clusters

**The query** (0x534254) [D]:
- the compact reader over the 1.1·Diam rectangle with V ≤ limit;
- then tangent distance·60 ≤ Diam (0x59a49c);
- then a known B−V (flag +0x3b clear).

**The re-parsed centre:** the dialog re-parses the centre from its rounded text (RA seconds to 0.01, Dec seconds to 0.1), which
moves it by up to about 0.05″. The published banks' closest radial margin is about 0.0056″ (Pleiades).

**The census:** a research-side census (`analysis/front-k-cluster-dialogs/tools/dialog_census.py`) re-ran that predicate at every
cluster's dialog key over the full compact band. For all 16, the admitted set equals the published bank, and no record in any
rectangle is fainter than 25.

**The certificate:** `data/clusters/cluster-dialog-certificate.json`. It holds:
- the keys, counts, booleans, band hashes and the census tool hash;
- no GSC record and no catalogue distance or age.

The web admits a dialog result only when its parsed key equals a certified key exactly; Vitest recomputes all 16 keys. A limit
below 25 filters the certified bank by V ≤ limit.

## Not in this front (follow-ups)

- **Observation-mode Display/Print Data** (RsltsListForm1 "Recorded Results - …", rows 0x547264 → 0x548c64 / 0x5486a8):
  - Decoded so far [D]: ID padded to 12, then the stored time (record+0x10) through the date object (0x487b64, DecodeDate
    0x40d400) and 0x488188 with 6 decimals, cut from character 4 to 11 characters.
  - Still needed: whether 0x488188 adds the global 0x5bad48 (the offset the TXT reader subtracts), and the coordinate and
    photometry fields.
- **Observation-mode right-click** (hit test 0x544428 → TObsRsltsDlg1 "Observational Data", modal): the web has no fill of
  that dialog for a DAT record yet. V2 found no remove/restore in that mode.
- **Instructor editing tools:** TClstrPrmForm1 and the list's Edit/Delete/Undo (Edit Mode). Not recovered; nothing shipped.

## Code and tests

- **Code:**
  - `src/core/clusterDialog.ts`: pure dialog, validation, key, study list and report;
  - `src/clusterdata/ClusterDataWindow.tsx` (lazy, from the observatory File menu) and `ClusterDataMessages.ts`;
  - `data/clusters/cluster-dialog-certificate.json`.
- **Vitest** (`src/core/clusterDialog.test.ts`):
  - fill and validation literals;
  - certificate keys equal the web keys;
  - student lines equal the witness;
  - Edit Mode columns cut;
  - Add to List;
  - report Type and Sort.
- **Playwright** (`tests/cluster-data-dialogs.spec.ts`):
  - student path list → OK → finding list → hot list;
  - refusals and validation;
  - the Edit Mode Instructor/V report for M 67 (506 stars);
  - Add to List → unsaved question → Save List reason;
  - no distance texts on screen.
