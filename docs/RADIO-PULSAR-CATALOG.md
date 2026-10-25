# Radio pulsar catalog codec and source picker (internal)

Status: **internal dependency**. The Pulsar Parameters reference utility (`RADIO-PULSAR-PARAMETERS.md`) passes the codec bytes of a learner-chosen file; the picker is used by Receiver Open and the clock reassociation of the silent receiver monitor (`RADIO-RECEIVER-MONITOR.md`), not as the utility's Open seed (Open only reads the shared buffer those picker runs write). The picker is not a global nearest search: it scans in file order, only the first run within 1 h of RA, without RA wrap. There is still no acquisition or session format. This does not complete Radio I06/I07/N07/E06 and claims no original numerical equivalence. Provenance: `RADIO-PULSAR-CATALOG-PROVENANCE.json`.

Modules (pure TypeScript; no React, network, file I/O or Node APIs):

- `src/core/radioPulsarCatalog.ts`: `parsePulsarCatalog(bytes)` decodes catalog text into a frozen, non-empty record array in file order.
- `src/core/radioPulsarSelect.ts`: `pulsarSeparation`, `selectNearestPulsar` and `associateReceiverSource`, plus `RECEIVER_OPEN_LIMIT` (2) and `CLOCK_REASSOCIATE_LIMIT` (5).

Evidence tags: **[S]** static listing (CLEA_VEO.exe SHA-256 `781bc970…c54c`) · **[A]** accepted repo contract · **[I]** analyst inference · **[D]** documentary/DFM label · **[W]** web policy. There is no original runtime proof.

## Source of the catalog

The original reads `Pulsars.dat` itself, in TRadioLab FormCreate (`0x5647a7`), from a path joined from environment fields (env+0x764, env+0x26c). There is no user file selection. The catalog object is stored at TRadioLab+0x5cd **[S]**. The shipped file (SHA-256 `ba94ee94…ceaa`, 285 692 bytes, 558 rows) stays **outside the repository**. It is not one of the 1279 manifested resources and is not bundled. Only its name, hash, size and source credit appear here and in the provenance, as checks for the optional external test.

## Parser (constructor `0x562234..0x56245f`, row `0x562490..0x562822`) [S]

- The loop runs while not EOF: `Read(buffer, 510)` (`0x404078`), then `ReadLn` (`0x4040f0`), then parse the row, update the RA/Dec bounds (+0x1a/+0x24/+0x2e/+0x38, not ported), then append with `0x492574`.
  - The append inserts after the cursor and moves the cursor to the new node, so list order is file order and duplicates are kept.
- The row parser copies fixed text columns:

  | Field | Text cols (0-based) | Width | Destination |
  |---|---|---|---|
  | `primaryName` | 0 | 12 | +0x00 ShortString[12] |
  | `legacyName` | 12 | 8 | +0x0d ShortString[8] |
  | `ra` | 20 | 16 | +0x16 Extended, value × Single 24 ÷ Single 360 |
  | `dec` | 62 | 16 | +0x20 Extended |
  | `x2a` | 208 | 22 | +0x2a Extended |
  | `x34` | 240 | 16 | +0x34 Extended |
  | `x3e` | 266 | 14 | +0x3e Extended, value + Single 2400000 |
  | `s48` | 336 | 8 | +0x48 Single |
  | `s4c` | 350 | 14 | +0x4c Single |
  | `s50` | 410 | 10 | +0x50 Single |
  | `s54` | 430 | 8 | +0x54 Single |
  | `s58` | 438 | 8 | +0x58 Single |
  | `s5c` | 446 | 8 | +0x5c Single |

- Identifiers are right-trimmed by explicit loops that delete the last character while it equals ASCII 0x20 (`0x562515`, `0x56257d`). Leading spaces stay. `0x40bb20` only converts to AnsiString.
- RA is scaled by `fmul 24` then `fdiv 360`. The epoch adds `2400000` (Single `0x56282c`). This is **not** 2400000.5.
- The cleanup frame is a finally for temporary strings. There is no local rollback for conversion errors.

### Field meaning [D/I]

The record keeps neutral offset names, but TPlsrDataForm1 independently binds the units (DFM labels and the display routine, `pulsar-parameters-contracts.json`):

| Field | Meaning | Unit |
|---|---|---|
| `x2a` | period | seconds |
| `x34` | period derivative | s/s |
| `x3e` | period epoch, caption `PEpoch (MJD)` | stored as the MJD column + 2400000 (native convention), **not** an ordinary JD (MJD + 2400000.5); the display subtracts 2400000 |
| `s48` | sky background temperature | K |
| `s4c` | dispersion measure | pc/cm³ |
| `s50` | pulse width | ms |
| `s54`, `s58`, `s5c` | 400, 600 and 1400 MHz time-averaged flux densities | mJy |

RA is in hours and Dec in degrees **[I, matching TRadioLab +0x5df/+0x5e9 [A]]**. These are **catalog reference values**. They must never populate learner measurements or answers.

## Web admission policy (WEB-PC-01..04) [W]

1. Input limits:
   - Bytes only, at most 1 MiB and 10 000 rows (the row limit is counted on line terminators before any row is decoded).
   - With a 454-byte minimum line, the byte limit binds first for any valid file.
   - An empty input is refused. This also avoids the native nil read in the picker when a Ready catalog has no records.
2. Line handling:
   - Printable ASCII only. Other C0 controls, DEL and a bare CR are refused. Control-Z handling natively depends on a file flag, so it is not claimed.
   - Lines end in LF or CRLF. A final terminator does not start a row.
   - Every line is cut at 510 bytes. A line shorter than 454 bytes (end of the last used column, 446 + 8) is refused.
   - An interior blank line is refused. The native loop has no blank, header or comment skip.
3. Number grammar: `^ *[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)? *$`. That means ASCII decimal with a `.` separator, surrounding spaces only, and no JS hex, `Infinity` or `NaN`.
   - This is not a claim of Delphi `StrToFloat` locale or overflow parity.
   - A non-finite double (after the RA scale or epoch add) is `bad-number`.
   - A finite value that narrows to a non-finite Single (`Math.fround`) is `single-range`.
4. Any refused line rejects the whole file. The error is `{kind, line, field?}`, where `line` is 1-based.

## Picker `0x562830` and separation `0x562950` [S]

- Arguments are Extended RA (hours), Dec (degrees) and limit L. If Ready is 0, the result is nil. The web uses a `null` catalog for this case.
- **Loop 1:** Next until `|RA − rec.ra| < 1 h` (Single `0x56294c`) or at the tail. `setb` counts NaN as inside.
- If nothing matched, the result is nil. Otherwise Prior, then Next, returns to the same record. At the head, Prior gives nil and the following Next gives the head.
- **Loop 2:**
  - Compute `sep` for each record.
  - The record is kept when `L > sep`. `jbe` skips equality and NaN, so on a tie the earlier record wins.
  - The loop exits *after* evaluating a record with `|ΔRA| > 1 h` (`ja`; NaN and equality continue) or at the tail.
  - The record that ends the run is therefore still a candidate. It can only win with a limit above 15.
- Separation: `sqrt(dx² + dy²)`, with `dx = (RA − rec.ra)·15 / cos(Dec·K1)` and `dy = Dec − rec.dec`.
  - `fdivrp st(1),st` at `0x562986`; GNU and LLVM Intel agree. It **divides** by the cosine of the pointing Dec.
  - This is not a great-circle distance and is kept as written.
  - At Dec ±90 the separation is huge unless ΔRA is exactly 0.
- Consequences:
  - Only the first contiguous in-window run in file order is searched.
  - There is no RA wrap at 0/24 h.
  - The supplied original is **not** globally RA-sorted (80 adjacent descents), so the run can miss nearer sources. This is preserved.
- **Limits:**

  | Caller | Location | Limit |
  |---|---|---|
  | Rcvr1Btn (name per plan) | `0x567958` | Extended 2.0 [S], push at `0x5679c4..0x5679ce`, call at `0x5679d6` (`correction-open-main-canonical.asm`) |
  | ClocktimerTimer block | `0x56574b..0x56575d` | Extended 5.0 [S] |
  | TRadioLab.PulsarList1Click [S/I] | `0x567f80..0x568023`, calling at `0x567fbf` | Extended 2.0 [S] |

  In the captured prefix `0x567f80..0x567fd9`, no instruction writes a receiver field. The prefix overwrites TRadioLab+0x5f7 (`0x567fd5`, 96 bytes) or clears it (`0x567fd9`), and receiver+0x4a2 may point at that buffer **[S]**. Coupling `0x573f78..0x573f91` compares receiver+0x4a6 with the name behind that pointer and calls refresh `0x574ba4`, which reads through the pointer (`0x574c83..0x574ca2`). This only matters if the method runs on the same instance while a receiver holds that pointer. It is a static reading, not a reproduced run.

  **Full procedure [S]** (`source-alias-pulsar-list-click-canonical.asm`, `0x567f80..0x568023`, ends in `ret`):
  - Both paths join at `0x567fe0`.
  - If the form variable slot `[[0x5b56b0]]` is nil, the procedure calls `0x474408` with the class reference read from `0x5686d0` and stores the result in that slot. Otherwise it reuses the existing form.
  - It then calls `0x476f40` (edx = 0) and `0x47a010` on that form.
  - The three callees are unidentified, so no receiver side-effect claim is made for the whole method.

  **[I]** `0x5686d0` = TPlsrDataForm1 VMT `0x56871c` − 0x4c (`pulsar-parameters-form-and-vmt.json`).

  **Identity [S/I]:**
  - **[S]** A single method-table entry at `0x5641ed` (table `0x563f6b`, 43 entries) names `PulsarList1Click` → `0x567f80`.
  - **[I]** A Delphi metadata layout, calibrated empirically on the known class TPlsrDataForm1 (offsets −52/−44/−76, self pointer verified), binds that table to `TRadioLab`.
  - This is static identity only. Which component event delivers the call, and when, is not shown. No G2 source or derivative was used.

## Receiver association (`0x56575d..0x5657c4`) [S]

- **Hit:**
  - receiver+0x4a2 := &TRadioLab+0x5f7, then `rep movs` copies the 96-byte record into that single shared buffer (`0x565766..0x565787`; `0x5679df..0x567a00` in the open caller). The receiver holds a pointer, not its own copy.
  - receiver+0x51f..+0x528 gets catalog+0x42, the separation.
  - **[W]** Web: `{source: owned frozen snapshot, offset: separation}`. The shared-buffer alias is not modelled.
- **Miss:**
  - receiver+0x4a2 is set to nil and the first byte of +0x5f7 to 0.
  - **+0x51f is not written.**
  - **[W]** Web: `{source: null, offset: <previous offset>}`.
- **Initial offset:**
  - **[S]** TRcvr_Form1 FormCreate `0x5721d8` (VMT `0x571a6c`, DFM `OnCreate=FormCreate`) zeroes, on its normal path, the 10-byte Extended at receiver+0x51f..+0x528 (`0x572392..0x5723a0`), i.e. +0.0. Before that, if byte `0x5bce00` = 0xff it calls the unidentified `0x450100` and `0x405c88` (`0x5721dc..0x572201`, possibly a raise), and it sets `0x5bce00` := 0xff at `0x572230`. The receiver-open caller creates the form when the form variable slot `[[0x5b5b44]]` is nil, before it calls the picker (`0x56795d..0x5679d6`).
  - **[I]** The class pointer `0x571a20` is VMT−0x4c.
  - **[W]** The initial `offset: null` is a separate web sentinel meaning "never associated". It has no consumer and is not migrated to 0.
- **[W]** The catalog stays immutable. Each call returns new frozen objects.

## Numeric policy [W]

- Extended values are JS doubles. Single cells and fields go through `Math.fround`.
- K1 (Extended `0x5629c8` = 0.017453292519943295769139146242365789873929315945133566856384277343750) is used as its nearest double, 0.017453292519943295.
- `Math.cos` and `Math.sqrt` stand in for x87 `fcos`/`fsqrt`. Results near a boundary (window = 1 h, sep = L) may differ from x87. No x87 equivalence is claimed.
- The order of operations follows the listing: ×24 then ÷360, and (ΔRA·15)/cos.

## Tests

- **`radioPulsarCatalog.test.ts`** (synthetic):
  - column offsets with filler in the gaps, the trim rule, the RA, epoch and Single conversions, and the decimal grammar;
  - lines of 454, 506 and 510 bytes, and the cut above 510;
  - LF, CRLF, mixed endings and a missing final terminator;
  - file order and duplicates;
  - every refusal kind, and frozen fresh objects;
  - the 13 column descriptors are frozen: 26 `Reflect.set` writes to start and width, using fixed snapshot targets 62/20, are all rejected and a later parse is unchanged; a `@ts-expect-error` guard covers the type.
- **`radioPulsarSelect.test.ts`** (synthetic):
  - a source-level linked-list reference built from Reset `0x492628`, Next `0x492634`, Prior `0x492668`, AtTail `0x49271c` and insert-after-current `0x492574`;
  - the reference is checked against the array port for: head and tail matches, no match, an ignored second run, the evaluated run-ending record, |ΔRA| = 1 h, sep = L, ties and duplicates, NaN, 0/24 h, Dec ±90, null and empty catalogs, and 400 pseudo-random catalogs;
  - the reducer: hit, miss that keeps the offset, and fresh frozen objects.
  - The reference is not an x86/x87 interpreter or a native oracle.
- **`radioPulsarCatalog.original.test.ts`** (external, optional):
  - It runs only when `OPENVIREO_PULSARS_DAT` points at the shipped file. When unset, the suite is reported as skipped by name.
  - A supplied path that is unreadable, or whose SHA-256 differs, **fails**; it is not skipped.
  - It checks:
    - SHA-256 and size;
    - the line profile: 557 lines of 510 bytes, 1 of 506, all CRLF;
    - 558 records, 557 distinct primary IDs, `1927+18` at indices 452/454, and 6138 finite values;
    - 80 RA descents matching `ORIGINAL-CATALOG-CONTROLS.json` (zero-based, later row);
    - spot rows 0, 452 and 557 field by field against their text columns.
  - The expected values come from a Python Decimal source-content control, not from a native run.
  - The test embeds no rows.

## Gates for a later UI increment (not done)

- Message literals `0x564d08`, `0x564d40` and `0x564d44`, shown after a failed load.
- What `0x47df9c` does (possibly Terminate).
- Who frees the catalog.
- The env+0x764/+0x26c path binding.
- Event delivery to `TRadioLab.PulsarList1Click` `0x567f80` (static identity only; R-RX6 models it as a session action with no UI caller, and the menu item's initial DFM state and conditional enable/show are recovered but not its runtime availability: `RADIO-PULSAR-PARAMETERS.md` PP-10, PulsarList1 availability, G9), and its unidentified callees `0x474408` and `0x47a010` (`0x476f40` is the WindowState setter).
- The initial-offset contract and the +0x51f readers `0x5737fc`, `0x57403f` and `0x574ceb` are now modelled in the internal receiver core (`RADIO-RECEIVER-SIGNAL.md`: FormCreate +0.0, in-source test, spatial factor). The reader `0x573367` (label display) is not ported. `associateReceiverSource` above stays as the earlier, unused web helper with its `null` sentinel; the receiver core does not use it.
- The +0x4a2 alias, the single +0x5f7 buffer, the PulsarList1Click overwrite and clear, the coupling refresh and the slave copies `0x573fc1` and `0x574d7f` are modelled in that core; R-RX6 does not deliver the PulsarList overwrite/clear through the UI (the Pulsar Parameters Open only reads the buffer) and mirrors the picker's end cursor (`pulsarPickerCursor`, PP-11) in that window. Still open: form lifetime, the menu item's runtime availability (G9), and the picker's catalog+0x42 zeroing (`0x56285c..0x562864`), which no ported code observes.
- Catalog consumer at `0x567aa5` (not ported). The TPlsrDataForm1 browser (`0x568c76..`, AtHead/AtTail, no wrap) is ported as a reference utility with a web file chooser, read tokens, cancellation, keyboard and mobile criteria: see `RADIO-PULSAR-PARAMETERS.md`. The native load failure box and quit request above remain unported.
- Ghidra P-code for `0x562950` was not obtained. The operand direction rests on the two disassemblers.
