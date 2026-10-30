# Front K2: remaining forms and prints

**Status:** merged into main from branch `claude/front-k2` (2026-10-30).

**Plan:** research root `analysis/front-plans/front-k2.md`. **Recovery dossiers** (`analysis/front-k2/`):
- A: `A-recorded-results-rows.md`;
- B: `B-obs-mode-click.md`;
- C: `C-print-headers.md`;
- D: `D-multispec-help-line-click.md`.

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) only; nothing was executed, emulated or sent.

**Tags:** [D] decoded · [I] inferred · [W] web adaptation.

**Options.** Where a VIREO option matters, the web uses VIREO's compiled default [D]. The defaults are written at
0x5a29e2..0x5a2b0b into the options record env+0x6b4:
- magnitudes (+0x2e7f) = 1;
- R and I (+0x2e82) = 1;
- Edit Mode (+0x2e7e) = 0;
- table number (+0x2e75) empty;
- Finder Field 2.5°;
- Instr. Field 15.0′.

OpenVireo has no log-in, so there are no student names and no table number.

## 1. Observation-mode File › Display/Print Data ("Recorded Results")

**What VIREO does** [D]:
- In observation mode, Display/Print Data (0x542f1c) only shows RsltsListForm1.
- The list is filled when saved data are read (DAT reader 0x549aa8, refresh 0x549c4a..0x549cb6):
  - the header 0x54708c, with the filter labels chosen by the first record's kind;
  - then one row per record of the sorted list, written by 0x5486a8.

**Row format** (exercise ≠ 4):

| Field | Format |
|---|---|
| ID | 11 characters + space |
| Time | `Copy(FloatToStrF(time + 2415018.5, ffFixed, 18, 6), 4, 11)` |
| RA | 0x486ca0, 1 decimal |
| Dec | 0x486ca0, 0 decimals, then a space |
| Filters | 3 or 5. Counts: 1 decimal, padded to 10. Magnitudes: 3 decimals, padded to 7. A zero value prints as blanks |
| Z | ffExponent(4, 2), padded to 12, or 12 blanks |
| Sp | padded to 13 |
| Comments | as stored |

**Quirks kept:**
- An ID `Sky` (with magnitudes on) repeats the previous row, or is empty when it comes first. The reader reuses its output
  string.
- A record of kind ≥ 2 repeats the Dec text in each filter column, and its header has no filter labels.

**Time offset.** 0x5bad48 = 1721424.5 + 693594 = 2415018.5. That is the initialiser at 0x5ac748, for any computer date before
2173 [I].

**Comma Delimit** (review 1 M1) is VIREO's own writer 0x5472e0 [D]:
- Header: `Object ID,MJD(Days),RA,,,Dec,,,U,B,V,` + `R,I,` + `Z,Spectrum,Comments`.
- For every line after the header: commas at columns 12, 24, 28, 31, 36, 41, 44 and 47, then one per filter (step 7 with the
  magnitudes option, 10 without), then +12 (Z) and +13 (Sp).
- All spaces before the last comma are deleted, and the comments follow. The file is `Observations.CSV`.
- A line shorter than that layout (an empty `Sky` line, a kind ≥ 2 line) would make VIREO write past the string; the web refuses
  it with the line number [I].

**Code:**
- `src/core/recordedResults.ts`. The time sum is exact Extended arithmetic, and FloatToStrF goes through the ported
  FloatToDecimal.
- `src/clusters/RecordedResultsWindow.tsx`: the shared list window with Search, Print preview, Save Text
  (`Observations.TXT`) and Comma Delimit.

**[W] web adaptations:**
- The list follows every change of the loaded records. VIREO writes it when it reads the data.
- Like VIREO (0x549cba Show), the window opens when a file is added or replaces the list; Display/Print Data reopens it.
- The caption assumes the exercise byte is 0, 1, 3 or 7 [I]; the cluster route has no exercise byte.
- RA and Dec are split in binary64 (VIREO splits them in Extended).
- A value VIREO's FPU would reject, or a spectral code the port cannot format, blocks the list with a typed reason.

**Own photometer pairs.** On that route, Display/Print Data stays disabled, with the reason that those pairs are not native
records.

## 2. Observation-mode right-click → "Observational Data"

**What VIREO does** [D]:
- **Click:** a right-button press and release on the plot in observation mode (0x543bfc) runs the hit test 0x544428 over the
  list.
  - Records with V = 0, then B = 0, are skipped.
  - Each record's pixel is the drawn one.
  - The distance is computed as an int32 square sum with wrap, then Sqrt.
  - The nearest record within 1000 px wins; on a tie, the first in the list.
- **Marker:** the hit is marked with a magenta ellipse ±3. Cancel clears it; OK keeps it.
- **Dialog:** TObsRsltsDlg1 "Observational Data". FormActivate (0x54a91c) fills it:
  - JD: `time + 2415018.5`, 6 decimals;
  - RA: `HHh MMm SS.SSs`;
  - Dec: `±DD° MM' SS.S"`;
  - U–I: padded to 10, with 1 decimal (counts) or 3 (magnitudes);
  - Z and Vel: exponent format;
  - any zero value: an empty box;
  - R and I: shown (option default 1).
- **OK** (0x54b02c) stores the remarks and the re-parsed Sp type in the record.

**Code:**
- `src/core/clusterNativeHrSelect.ts`;
- `editClusterNativeHrRecord` in `src/core/clusterNativeObservationHr.ts`;
- `src/clusters/ObservationalDataDialog.tsx`;
- `src/components/ClusterNativeObservationHr.tsx` (right-click, touch long press).

**[W] web adaptations:**
- **A miss does nothing.** VIREO uses an uninitialised index there, so the result can't be pinned.
- **A wrapped negative sum** (where VIREO's Sqrt raises) shows a typed message.
- **Velocity is read-only.** VIREO stores a typed velocity before checking it against c·Z. With Z = 0 (every photometer record)
  it always shows "Velocity Error!".
- **Escape** acts as Cancel. Focus returns to the chart or to the row button that opened the dialog.
- **A touch held for 500 ms** acts as the right click.
- **Keyboard:** each plotted row of the records table has an "Observational Data…" button that opens the same dialog and marker.
- **While another file is read or under review** the dialog does not open.
- **Click mapping:** the click maps to the SVG's pixel grid with Math.floor (VIREO gets integer image pixels).
- **RA and Dec** are split in binary64 (VIREO splits them in Extended).
- **Kind ≥ 2 records:** VIREO leaves the label and the photometry boxes from the previous activation; the web keeps them from
  the previous dialog on this page, starting from the DFM's "Observed Magnitudes" and empty boxes.

## 3. Print headers and footers

**Print Sky Image / Multi-Spec Print Selection Field** (0x53f934; 0x52a78c calls it) [D]:
- **Header** (0x58e860):
  - the date + `'     VIREO - The VIRtual Educational Observatory'`;
  - the table-number line, only when one is set (never in the web; this header has no "(Not Recorded)");
  - then the student name line, blank here.
- **Image:** colour-inverted (cmNotSrcCopy).
- **Footer** (0x53fe14):
  - Coordinates of Field Center;
  - Right Ascension (1 decimal);
  - Declination (0 decimals);
  - Field Size: 2.5 Degrees (finder) or 15.0 Arc Minutes;
  - Telescope (the telescope's name);
  - Instrument: Finder, or Multi-Object Spectrometer for Print Selection Field.

**Code:** `src/core/printSkyText.ts`, plus `WebPrintPreview` (`nativeHeader`, `footer`, `invert`).

**[W] web adaptations:**
- The observatory's telescope view has no single instrument choice in OpenVireo, so its Instrument line says so.
- Multi-Spec prints its own field picture; VIREO prints the observatory image.
- The date uses the browser's format. VIREO uses the Windows ShortDateFormat and LongTimeFormat, which cannot be pinned.

**Hot list › Print** (0x59103c / 0x591098) [D]:
- Line 1: the date, plus `'     Laboratory Table Number (Not Recorded)'` when Edit Mode is off.
- When Edit Mode is off: the blank student-name line.
- Then the caption and the rows.

**Code:** `hotListPrintHeader` in `src/core/hotListPrint.ts`. The `spoolTitle` literal is corrected: 'Text' was the TextHeight
sample, and the predicate is PrintDialog1.Execute.

## 4. Multi-Spec Help: nothing to port

TMultSpCntrl.Help1Click 0x52a88c opens the shared help list, but FormShow enables it only when its options name is non-empty.
That name is empty by default (0x5a2878), and no MltSpHlp literal exists. OpenVireo already shows Help disabled with that
reason (docs/CLEA-HELP.md).

## 5. Spectral Line Table click → classification cursor

**What VIREO does** [D]:
- ListBox1Click 0x50586c sends the line's wavelength to TSpClassify 0x508240.
- 0x508240 stores the wavelength and draws the cursor at column `Round((λ−λ0)/disp)`. The readout shows that column's
  wavelength.
- The list then selects the row nearest the cursor (0x5058b8: bound 1000 Å, first on a tie). For example, Fe I 4143.878
  selects He I 4143.76.
- Zoom and pan recompute the column from the stored wavelength.
- Every click runs the reselection, so a second click on Fe I 4143.878 selects He I 4143.76 again.

**Code:**
- `nearestSpectralLine` in `src/help/spectralLines.ts`;
- `SpectralLineTable` (`onLineSelect`, `cursorWavelength`);
- the `lineCursor` state in `ClassificationLab`, feeding the existing marker through `visibleViewportMarker`.

**[W] web adaptations:**
- The intensity readout is not shown for a line cursor.
- A line outside the view shows a "no cursor" note.
- Column 500 is not drawn.

## Tests

- **Vitest:**
  - `src/core/recordedResults.test.ts`;
  - `src/core/clusterNativeHrSelect.test.ts`;
  - `src/core/printSkyText.test.ts`;
  - `src/core/hotListPrint.test.ts` (K2.3);
  - `src/help/spectralLines.test.ts` (K2.5).
- **Playwright:**
  - `tests/cluster-k2-observation.spec.ts`;
  - `tests/front-p-polish.spec.ts` (Print Sky);
  - `tests/multispec-objectx.spec.ts`;
  - `tests/optical-hotlist-print.spec.ts`;
  - `tests/clea-help.spec.ts` (K2.5).
- The worked examples are synthetic records. No original-runtime equivalence is claimed.

## Model and effort

| Step | Model | Effort |
|---|---|---|
| Plan and the four recovery dossiers | Claude Opus 5.5 | high |
| Implementation and tests | Claude Opus 5.5 | medium |
| Review | coordinator | high |
