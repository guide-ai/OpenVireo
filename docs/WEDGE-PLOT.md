# LSS wedge plot (N06/E02, bounded)

This increment ports one complete, source-backed piece of the VIREO Large-Scale Structure exercise: **load saved LSS redshift data → choose the original wedge-plot options → plot → inspect and export**. It is not the whole of N06 or E02. Field selection, acquisition, spectrum measuring, group Auto Plot, printing and the original save format stay open.

Reference `CLEA_VEO.exe`, SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. The program was never run. Evidence ID `VIREO-LSS-WEDGE-STATIC-2026-10-21`. Addresses, constants, literals and hashes are in [WEDGE-PLOT-PROVENANCE.json](WEDGE-PLOT-PROVENANCE.json).

## What the original does (recovered)

- **Menu.** Main-menu "LSS &Wedge Plot" (`LSSWedgePlot1Click` 0x58d4f0) shows the `TWedgePlot` form. `FormCreate` 0x580dc0 sets a 550 × 550 client.
- **Drawing.** `FormPaint` 0x580ed4 draws the grid (0x581610), then the points (0x581bc8). The apex is at (445, 510) and the outer radius is 480 px. The 12h spoke is vertical and 16h lies 60° to the left. A point sits at θ = (RA − 12h)·15° and r = 100·z·120 px, which puts z = 0.04 on the outer arc. Point centres are (445 − Round(r sin θ), 510 − Round(r cos θ)). Points are ellipses of ± size px, open (`bsClear`) or filled. The original does not clip RA or z.
- **Grid types** (`GridGrp`): *Velocity* draws rings at 4000/8000/12000 km/s (160 px apart) labelled "V(km/sec)". *Red Shift (Z)* draws rings at 0.01…0.04 (120 px) labelled "Z(=V/C)". *No Grid* draws only the 12h and 16h spokes and the outer arc. Every type writes "RA (Hours)" at (150, 50) and "Points Plotted: n" at (50, 460).
- **Options** (`TWdgPltOptsForm1`): the defaults (0x5803e0) are Velocity grid, size 1, Open, Auto Plot off and a 5-minute interval. Size is 1–5 and style is Open/Filled. OK commits and Cancel discards.
- **Colours.** Codex independently recovered the eight TColor literals at .data 0x5b4acc…0x5b4ae8 (`COORDINATOR-colors-and-results.json`, with a SHA-256 for each dword). Flag `TWedgePlot+0x394` chooses between two schemes:
  - *Display:* navy background, yellow grid and text, white own points, green group points.
  - *Black-and-white:* white, black, black and grey. Print switches to this scheme while capturing.

  The literals are exact. The flag's value on a historical host is not known: `FormShow` copies it from Env+0x2e8e, and Print uses Env+0x2e8d. The original help says the display is normally in colour.
- **Global aliases.** These were recovered from static storage:
  - Options pointer 0x5b5c98 holds 0x5bced4, the options record.
  - Results-form global 0x5b5504 holds 0x5bcec8.

  Both are static-storage values, not runtime object values.
- **Results owner.** Codex independently bound `LSSRsltsForm1` (`COORDINATOR-results-owner-binding.json`): VMT 0x57a77c, a 10-method table, instance size 0x480, and parent `TInfoListForm1` (VMT 0x59d9ec). This class owns the plotted lists. `FormCreate` 0x57ad2c creates lists +0x44a and +0x464 with 90-byte records.
  - `LSSRsltsForm1` has no DFM of its own. Its form is the base `TInfoListForm1` DFM (`COORDINATOR-results-base-dfm.json`), whose `ListBox1` has no initial items, so the first load never asks to retain data.
  - `TLSSRsltsDlg1` and `TObsRsltsDlg1` are per-record dialogs, not the list owner (`COORDINATOR-results-owner-dfm.json`).
- **Plot Data** (0x58100c) repaints, or shows "No data to plot" when no data are loaded.
- **Load Saved Data** for the LSS exercise (0x5891ef, exercise byte 5) accepts only `.TXT`. Loader 0x57bfb4 requires a first line that starts with `Object ID` and contains `RA`. If the header also contains `Z`, it reads Z and derives V = c·Z; otherwise it reads V and derives Z = V/c. c is the Extended 299792.458 km/s, and both values are stored as Single. If data are already loaded, it asks "Retain Current Data?" Yes adds; No asks "Confirm Deletion!" and Yes replaces; Cancel keeps the current data.
- **Row parser** 0x57b488 reads the following, in order:
  - the first 11 characters as the object ID;
  - an MJD token;
  - RA as `HHhMMmSS.Ss`;
  - Dec as `DD°MM'SS"`;
  - V or Z;
  - one comment token, cut to 36 characters.

  A field that fails to convert is stored as 0. The original completes the MJD token with a prefix taken from the date of the session that loads the file. That prefix is not in the file and cannot be reconstructed. The port keeps the raw MJD text exactly as saved and builds no historical date prefix or MJD value. It is not a full loader for native record metadata.

## Try it (tested manual steps)

The panel `src/components/WedgeLab.tsx` is not mounted in `App` yet; Codex owns that integration. Until then, use the scoped harness, which serves only on loopback:

1. From the worktree, run `node node_modules/vite/bin/vite.js --config /home/dobleuber/Documents/Codex/2026-10-18/task-3/claude-wedge-analysis/harness/vite.config.mjs`. It serves http://127.0.0.1:5186/__wedge-harness/ with strict port 5186.
2. Click **Plot Data**. The notice reads "LSS Wedge Plot No data to plot".
3. Prepare a small `.txt` in ANSI with CR LF. Its first line is the original header `Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments`. Rows follow it, for example `SYN-001       4321.5000 13h30m00.0s +29°30'00" 6000.0 note`, where the object field is 11 characters. Choose the file with **Load saved LSS data**. The notice reads `Saved observations file "…" loaded.`, the table lists the rows and the wedge shows the points. This example plots at pixel (353, 288).
4. Click a point or a row's number button. **Selected record** shows the saved line, the RA/Dec conversions, the exact binary32 V and Z with their bits, the angle, the radius and the pixel.
5. Open **Options...**. Choose *Red Shift (Z)*, size 3 and *Filled*, then click **OK**. The rings change to 0.01…0.04 and the points grow. Cancel or Esc discards a change.
6. Load another file. **Retain Current Data?** appears: Yes adds; No then Yes replaces; No then No, or Cancel, keeps the current data and reports "Data was not loaded."
7. Click **Download plotted data (CSV)**.

## Browser admission and numerical policy

- **Accepted input.** Files of at most 512 KiB, at most 2000 data lines, at most 1024 bytes per line, and at most 10 000 records in total. Bytes must be printable ASCII or the degree byte 0xB0, with LF or CR LF line endings. Everything else is refused and current data are kept. That covers UTF-8 "°", tabs, lone CR, and a blank line after the header (the original faults on an empty line partway through a load). A Z value whose c·Z overflows binary32 is also refused, because the original raises an unhandled fault outside its try block.
- **Decimal separator.** You choose `.` or `,` explicitly. The choice is recorded per file because the original's `DecimalSeparator` depends on the host.
- **Field statuses.** Numeric fields use a strict decimal/integer grammar. *Empty field* is a definite native zero-fill. *Spelling not admitted here* means the original might parse the text differently. Neither is plotted, and both are listed with their raw text. When a V/Z spelling is not admitted, the comment is left unknown, because the original's token consumption depends on whether that conversion succeeds.
- **"−0°".** The original drops the minus sign of `-00°…` (0x485960 tests for x < 0). The port reproduces that and flags it. Dec is never used by the plot.
- **V and Z.** Values are exact binary32. Decimal input is rounded correctly to binary32 with BigInt, and inputs within 2⁻⁵⁸ (relative) of a midpoint are flagged, because native 0x40cf60 is not proven to round correctly. z = round₂₄(round₆₄(v/c)) and v = round₂₄(round₆₄(c·z)) model the compiled control word 0x1332. The historical host control word is not witnessed.
- **Angles and pixels.** These use Number arithmetic in the original operation order. Math.sin and Math.cos stand in for FSIN/FCOS, and FISTP Round is treated as nearest-even. Results within 1e-6 px of a .5 tie are flagged as "Rounding tie". No x87, GDI, font or colour equivalence is claimed.

## Deliberate differences from the original

- The whole file is validated before the add/clear question and then applied atomically. The original asks first and can be left partial or with an open file.
- Records that can't be read are not plotted. "Points Plotted" counts admitted records, while the original counts every entry. Excluded records are reported under the plot.
- A point whose ellipse lies wholly outside the 550 × 550 area is reported, not drawn; the exact TImage insets are unknown.
- The display colour scheme is the default. The black-and-white scheme is offered as a **Plot colours** choice, whereas the original shows it only while printing. Fonts are approximate. The dashed selection ring and the transparent, enlarged hit areas around small points are new.
- The CSV is a new schema, `openvireo-lss-wedge-points/1`. It records the file name and SHA-256, the line, the raw tokens, the statuses, the exact binary32 decimals and bits, the pixels, the options and this policy. Imported text is formula-neutralized; generated numerals are not. It is not the original save format, because the original's MJD/RA/Dec/V formatting helpers were not recovered.
- Loaded LSS records are the student's own saved measurements. The panel never writes measurements, catalog values, distances or fits anywhere else.
- **Local workspace only.** The panel states in the window that its workspace belongs to the open window. Loaded files, the plot, options and selection are not part of Save investigation and are discarded on reload or close; the source `.TXT` files can be loaded again. This pass adds no persistence format.
- **Host inactivity** has no original counterpart. When the host passes `disabled` (a hidden route that stays mounted, or a project operation), every control is disabled and three things are dropped before paint:
  - an in-flight read: it is aborted and its token no longer matches, so a late completion or failure changes nothing;
  - a validated import still waiting at "Retain Current Data?" or "Confirm Deletion!";
  - an unsaved Options draft.

  A notice says the file was not added. Confirmed records, receipts, committed options, the separator and the selection are kept. A stale Yes/No/OK can therefore never commit after re-enabling.

## Controls

The Vitest suites are `src/core/wedgeNumeric|wedgeLssText|wedgePlot|wedgeWorkspace|wedgeUiAudit|wedgeProvenance.test.ts` and `src/components/WedgeMessages.test.ts`. They cover:

- IEEE encodings, a tie and a double-rounding discriminator;
- the c decimal, the overflow path and signed zero;
- the header gate and admission refusals;
- the token helper rules;
- the hand-derived grid and point pixels, and the TColor → RGB mapping;
- the add/clear/cancel, late, cancelled, failed and capacity transitions;
- options draft and commit;
- host suspension during a read (including late completion and failure), at either prompt stage and during an options draft, followed by re-enabling;
- translated overrides of strings, nested groups, tuples and formatters. This includes the coordinator's TS2322 reproduction, which `tsc` compiles from this test file, and `@ts-expect-error` guards against over-widening. It also covers the native captions staying verbatim, malformed untyped overrides being ignored, and server-rendered panel and options dialog captions;
- CSV escaping;
- zero authored render literals in the Wedge components;
- agreement between the provenance record and the code constants.

The Playwright file `tests/wedge-lss.spec.ts` runs only when `OPENVIREO_WEDGE_HARNESS_URL` is set. It covers:

- the complete desktop flow, including the persistence warning;
- the refusals;
- a cancelled read that resolves late;
- a 390 px mobile layout;
- host inactivity (harness `?host=1`): hidden during a read that then completes late, busy while "Retain Current Data?" is open, hidden at "Confirm Deletion!", hidden with an options draft, then a reload through the native prompt;
- translated captions (`?lang=es`, placeholder strings only) on the panel, the prompts' Yes/No/Cancel and the options dialog. All vectors are synthetic, not CLEA observations, and the tests check this contract, not original equivalence.

## Integration notes for the coordinator

- Mount `WedgeLab` (props: `messages`, `idPrefix`, `disabled`, `onWorkspaceChange`) where the LSS exercise belongs. Keep the panel mounted while hidden and pass `disabled` during inactivity or project operations.
- **Translations.** `messages` has type `WedgeMessageOverrides`. Each key takes any subset, and nested groups can be partial. Strings, formatters and fixed-length tuples are widened to plain types, so the coordinator's `intro: 'Datos guardados'` and `statusEmpty: 'Sin datos'` now compile.
  - `messages.native` carries the window caption, the Plot Data and Options... buttons, the native message boxes with their captions, Yes/No/Cancel/OK, and the options-dialog captions. Its English defaults are the verbatim literals of `core/wedgeNativeText.ts`, which stays the untranslated source-evidence record.
  - The text drawn inside the figure ("RA (Hours)", ring labels, "V(km/sec)", "Z(=V/C)", "Points Plotted: ") is recovered drawing geometry and stays native.
  - `WEDGE_MESSAGES` and `WEDGE_NATIVE_CAPTIONS` can move into the shared catalog. This pass does not edit shared i18n files.
- `src/i18n/coverage.test.ts` hard-codes 45 audited `.tsx` files. The three Wedge components add **no** render sites (guarded by `wedgeUiAudit.test.ts`). The count must become 48; this pass adds no `.tsx` file.
- **Resolved by the coordinator's independent extractions:**
  - the exact colour dwords;
  - the aliases 0x5b5c98 → 0x5bced4 and 0x5b5504 → 0x5bcec8;
  - the results owner `LSSRsltsForm1`, whose base `TInfoListForm1` DFM has an empty initial ListBox.
- **Still unknown:**
  - the historical host's active print/colour flag (Env+0x2e8e and Env+0x2e8d);
  - GDI and font pixel equivalence;
  - the historical host FPU control word and DecimalSeparator;
  - the MJD date prefix. The raw text is kept and no value is constructed.
