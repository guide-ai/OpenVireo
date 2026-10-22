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

This feature branch provides `src/components/WedgeLab.tsx`; Codex owns its separate App integration and route validation. Test the panel directly with the scoped loopback harness:

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
- **RA hours and Dec degrees at −2147483648.** Admitted integer fields are signed 32-bit values (−2147483648 … 2147483647; anything else stays *Spelling not admitted here* with its raw text). The hours and degrees fields reach the d/m/s helper 0x486c40 as a full DWORD (0x57b668 for RA, 0x57b708/0x57b70a for Dec). The helper takes the absolute value with `cdq/xor/sub` (0x486c53…0x486c59) and reads it back with a signed `FILD DWORD` (0x486c5f). The Dec caller applies the same `cdq/xor/sub` first (0x57b72b), which changes nothing the second time. In two's complement, abs(−2³¹) stays −2³¹. The port applies that rule as the pure scalar `wedgeAbsInt32`, so:
  - `-2147483648h0m0s` gives RA −2147483648 h, not +2147483648;
  - `-2147483648°0'0"` gives Dec +2147483648° (sign −1 from 0x485960 times −2³¹), not −2147483648°.

  Every other integer gets its ordinary magnitude. Minutes are never made absolute, so a negative minutes value (including −2³¹) is added as a signed number, as in the original. Sources: the bounded captures `COORDINATOR-review-triage/dms-helper.asm` and `lss-row-parser.asm` (SHA-256 in that directory's `static-receipts.json`). The rule covers only this integer step. The sums use Number (binary64) in the original order ((abs32(d) + m/60) + s/3600) × sign, not 80-bit Extended. Near 2³¹ that keeps about 2⁻²² h of resolution instead of Extended's finer one. The angle of such a point is huge, and Math.sin/Math.cos reduce it differently from x87 FSIN, so neither the value nor the pixel claims FPU parity.
- **V and Z.** Values are exact binary32. Decimal input is rounded correctly to binary32 with BigInt, and inputs within 2⁻⁵⁸ (relative) of a midpoint are flagged, because native 0x40cf60 is not proven to round correctly. z = round₂₄(round₆₄(v/c)) and v = round₂₄(round₆₄(c·z)) model the compiled control word 0x1332. The historical host control word is not witnessed.
- **Angles and pixels.** These use Number arithmetic in the original operation order. Math.sin and Math.cos stand in for FSIN/FCOS, and FISTP Round is treated as nearest-even. Results within 1e-6 px of a .5 tie are flagged as "Rounding tie". No x87, GDI, font or colour equivalence is claimed.
- **Arcs (SVG approximation).** `wedgeFrame` keeps each GDI `Arc` call's recovered integer direction point (`endX`, `endY`), which is the point GDI aims at. GDI stops the arc where the ray from the centre through that point meets the ellipse. An SVG path needs the end on the circle, so the pure core functions `wedgeArcSvgEnd` and `wedgeArcSvgPath` (in `src/core/wedgePlot.ts`) project the direction point onto radius r with atan2/cos/sin. They draw counter-clockwise (sweep-flag 0), take the minor arc, and write 3 decimals. The drawn paths are the same as before this move: the golden strings are checked in Vitest and in the browser. They are not GDI pixels.

## Deliberate differences from the original

- The whole file is validated before the add/clear question and then applied atomically. The original asks first and can be left partial or with an open file.
- Records that can't be read are not plotted. "Points Plotted" counts admitted records, while the original counts every entry. Excluded records are reported under the plot.
- A point whose ellipse lies wholly outside the 550 × 550 area is reported, not drawn; the exact TImage insets are unknown.
- The display colour scheme is the default. The black-and-white scheme is offered as a **Plot colours** choice, whereas the original shows it only while printing. Fonts are approximate. The dashed selection ring and the transparent, enlarged hit areas around small points are new.
- The CSV is a new schema, `openvireo-lss-wedge-points/1`. It records the file name and SHA-256, the line, the raw tokens, the statuses, the exact binary32 decimals and bits, the pixels, the options and this policy. Imported text is formula-neutralized; generated numerals are not. It is not the original save format, because the original's MJD/RA/Dec/V formatting helpers were not recovered.
- Loaded LSS records are the student's own saved measurements. The panel never writes measurements, catalog values, distances or fits anywhere else.
- **Keyboard.** These keyboard rules are this page's own; the original's keyboard behaviour was not recovered:
  - Escape answers a prompt non-destructively: *Cancel* at "Retain Current Data?" and *No* at "Confirm Deletion!". It never deletes, so deleting still needs No and then Yes.
  - After any prompt answer, or after cancelling a read, focus returns to the file input once React has enabled it again. This doesn't happen if the input is hidden or disabled, or if focus has already left the panel. Host inactivity clears any pending focus return.
  - The Options dialog keeps Tab and Shift+Tab inside the dialog. Each radio group has one tab stop: its checked radio.
- **Units and counts.** The table and details show the units `detail.hours` and `detail.degrees` from the presentation catalog, and the prompt and source list show row counts through `rowCount`. The figure text and the native strings are unchanged.
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
- the live status text (`wedgeStatusText`): empty, reading and loaded states, a waiting import question named at both stages through the translatable `awaitingAnswer` and the translated prompt captions, and its removal once answered or while the host disables the panel;
- CSV escaping;
- zero authored render literals in the Wedge components;
- agreement between the provenance record and the code constants.

The standalone Playwright files `tests/wedge-lss.spec.ts`, `tests/wedge-focus.spec.ts` and `tests/wedge-prompt-focus.spec.ts` run only when `OPENVIREO_WEDGE_HARNESS_URL` is set. Together they cover:

- the complete desktop flow, including the persistence warning;
- the refusals;
- a cancelled read that resolves late;
- a 390 px mobile layout;
- host inactivity (harness `?host=1`): hidden during a read that then completes late, busy while "Retain Current Data?" is open, hidden at "Confirm Deletion!", hidden with an options draft, then a reload through the native prompt;
- translated captions (`?lang=es`, placeholder strings only) on the panel, the prompts' Yes/No/Cancel and the options dialog;
- review-fix regressions:
  - the Options tab cycle with grid 1 or 2 committed, Shift+Tab to Cancel, and Escape;
  - Escape and Yes/No/Cancel at both prompt stages, with focus returning to the enabled file input;
  - cancelling a read returns focus to the file input;
  - host inactivity at a prompt never moves focus;
  - the translated units and row-count label;
  - the golden arc paths for all three grids;
- focus and announcement regressions (`tests/wedge-focus.spec.ts`, `tests/wedge-prompt-focus.spec.ts`):
  - a direct read keeps focus deliberately moved to another panel or host control, restores lost focus without scrolling, and two same-turn file events cannot leave a read stuck;
  - Escape handled by an inner control, or pressed outside the panel, does not answer pending consent; Escape without consent still reaches host listeners;
  - a controlled boundary pair: a focused panel control disabled as the question commits counts as lost focus, while a focused host control disabled the same way keeps focus outside the panel;
  - second-read consent keeps deliberate panel or host focus and names the waiting question in the polite status at both stages (Retain, then Confirm Deletion), dropping it after the answer;
  - with focus lost, a normal second load focuses and reveals the consent; a viewport moved during the read is not scrolled back, including when the prompt is far off-screen (the coordinator's control, which fails on both viewports without the `moved` guard);
  - while Options is open, the file input is disabled and the rest of the panel inert; Playwright's file chooser and a raw change event are both refused before any Blob read starts (read-gate counter, no fixed wait). The Options draft, the confirmed rows and Escape cancellation are kept, and a later real load prompts normally. This replaces the earlier "Options Escape with pending consent" case (see below).

All vectors are synthetic, not CLEA observations, and the tests check this contract, not original equivalence. The Vitest suites add the INT_MIN abs32 rows and `wedgeAbsInt32`, plus independent arc-end geometry: a normalised direction vector, the point on the circle and on the ray, and the golden paths. The review-fix harness and its Playwright config (desktop and 390 px mobile projects, strict port 5188) are in `claude-wedge-analysis/review-fixes/`. The final a11y correction uses the same contract from `claude-wedge-analysis/final-a11y-correction/`, on strict port 5194, or 5190 for the coordinator's unchanged control spec.

## Integration notes for the coordinator

- Mount `WedgeLab` (props: `messages`, `idPrefix`, `disabled`, `onWorkspaceChange`) where the LSS exercise belongs. Keep the panel mounted while hidden and pass `disabled` during inactivity or project operations.
- **Translations.** `messages` has type `WedgeMessageOverrides`. Each key takes any subset, and nested groups can be partial. Strings, formatters and fixed-length tuples are widened to plain types, so the coordinator's `intro: 'Datos guardados'` and `statusEmpty: 'Sin datos'` now compile.
  - `messages.native` carries the window caption, the Plot Data and Options... buttons, the native message boxes with their captions, Yes/No/Cancel/OK, and the options-dialog captions. Its English defaults are the verbatim literals of `core/wedgeNativeText.ts`, which stays the untranslated source-evidence record.
  - The text drawn inside the figure ("RA (Hours)", ring labels, "V(km/sec)", "Z(=V/C)", "Points Plotted: ") is recovered drawing geometry and stays native.
  - `WEDGE_MESSAGES` and `WEDGE_NATIVE_CAPTIONS` can move into the shared catalog. This pass does not edit shared i18n files.
  - `awaitingAnswer(caption)` is a translatable formatter for the live-status suffix described under "Consent announcement and Options modality".
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

### Final keyboard correction after separate review

After any direct read succeeds or fails, the file input regains focus once React has enabled it only if focus was lost to the document body or is already on that input. Focus deliberately moved to another panel or host control is retained. Explicit prompt answers and read cancellation return to the file input unless focus moved to the host. These returns use preventScroll, so they do not move the viewport. An Escape already handled by an inner control does not also answer inline import consent. Escape from any enabled control within the panel answers a pending inline import consent non-destructively; it does not act outside the panel or when no consent is pending. These are web accessibility rules, not recovered Windows focus behavior. `detail.degrees` is an attached unit suffix: a word unit includes its desired leading space (for example ` grad`); `detail.hours` is joined with an explicit space. Safari/macOS keyboard preferences were not exercised; browser receipts cover Chromium desktop and mobile.

The same no-focus-theft rule applies when a completed later read opens inline import consent: a deliberate focus on another panel or host control is retained. With focus lost to the body, a normal completed load focuses and reveals the prompt’s default button. If the viewport moved during that read, focus does not scroll it back; an explicit retain→confirm action also preserves scroll. A retain→confirm action can move focus between that prompt’s own buttons. Closing Options returns focus to Options unless focus was already deliberately moved elsewhere (see the next section for why consent can no longer be pending under Options). An already-script-handled (`defaultPrevented`) Escape is respected; native select-popup Escape behaviour outside the tested Chromium is not established.

### Consent announcement and Options modality (correction after the review of 0c3d7b0..4ec4a74)

- **Announcement.** `role="alertdialog"` is not a live region, so a question that appears while focus is deliberately kept elsewhere was silent. The existing polite `role="status"` line now appends `awaitingAnswer(caption)` while consent waits, at both stages. The caption is the translated `native.retainCaption` or `native.deleteCaption`, and the text comes from the pure `wedgeStatusText` in `WedgeMessages.ts`. The suffix appears whenever consent waits (also when the prompt takes focus) and goes once it is answered or while the host disables the panel. It never moves focus. The browser tests inspect DOM focus and live-region text in Chromium; they are not NVDA or VoiceOver runs.
- **Options modality.** While the aria-modal Options dialog is open, the rest of the panel is `inert` and the file input is disabled. `onFile` also refuses a change event that still reaches it by script. Options is itself disabled during a read or pending consent. A read, and so import consent, therefore cannot start under the dialog. The coordinator reports that the native options form was modal. This is a web accessibility boundary; no ShowModal address is cited and no runtime parity is claimed.
- **Superseded case.** The 4ec4a74 test "real options Escape preserves pending consent…" reached consent under Options through a scripted import (`setInputFiles`) on the input that was still enabled behind the backdrop. That test does not show whether pointer, keyboard or assistive-technology users could reach that input: `aria-modal` alone does not reliably hide the background from every screen reader's virtual cursor, and no such run was made. The new `inert` background, the disabled input and the `onFile` guard address this modal accessibility gap. No original Windows evidence about that path is claimed. Because the state is now refused, the test was rewritten (not deleted) to assert the refusal. It keeps the draft, confirmed-row and Escape-cancellation checks, then shows that a later real load prompts normally. The special case in `closeOptions` that focused a pending prompt button was removed. With it went the related review notes about focus escaping the modal, an off-screen focus target on close, and closing Options during a read.
- **Disabled focus is not deliberate.** If focus is on a panel control that the read itself disabled (for example Options right after OK), a fast read could complete before Chromium blurs that control. The prompt then neither took focus nor left it anywhere usable. This was observed in 3 of 6 desktop repeats of the complete flow with this candidate before the guard; whether 4ec4a74 showed it was not measured. Such a control now counts as lost focus. The exemption covers only controls inside the panel (`root.contains(activeElement)` and `:disabled`). A host control outside the panel stays deliberate focus even when it is disabled, so the question never pulls focus in from outside.
  - The browser pair in `tests/wedge-prompt-focus.spec.ts` is a **controlled boundary fixture**, not observed runtime timing. A MutationObserver disables the focused control in the microtask after the commit that inserts the question, which is before Chromium's next focus fixup. Only the blur timing after that is the real browser's.
  - Before the fix, the complete nine-case prompt-focus file ran on two viewports with five repetitions (90 executions): the host case failed 10 of 10 and the other 80 executions passed. After the fix, only the two disabled-focus boundary cases ran on two viewports with twenty repetitions (80 executions), and all 80 passed. These are different populations; the final full owned suite separately passed all 64 executions once. With the whole disabled exemption removed as a mutant, the panel case failed 6 of 6 and the host case passed 6 of 6.
  - A host disabling its own focused control mid-read without such a trigger was not reproduced. No native timing claim is made.
- **Background-import refusal test.** The Options case no longer waits a fixed 200 ms. The Blob read gate counts every `arrayBuffer` read, which `readWedgeLssFile` starts synchronously from the change handler, and holds each read while armed. The test asserts that neither `setInputFiles` nor a raw `change` event raises the count or queues a held read. After Options closes, a real load does raise the count by one (positive control), then prompts, and Escape cancels it. With the `onFile` modal guard removed (`||modal` dropped), each route failed on both viewports. The raw route was also run alone, with the `setInputFiles` line temporarily removed. The source and the spec were then restored.
- **Not changed.** `moved` still compares only window scroll with a snapshot taken at read start. A host scroll container, and scroll clamping caused by the notice clearing at read start, remain untested hypotheses. The current harness and App shell scroll the window. The repeated "usable focus target" checks were not refactored.
- **Known limitation: the rule lives only in React.** "No read or import consent while Options is open" is enforced only by React: the `onFile` guard, the disabled input and `inert`. The pure `requestWedgeLoad`/`beginWedgeRead` still accept a load while `optionsDraft` is set, and `openWedgeOptions` still opens during a read or pending consent. The UI prevents the overlap, but a caller that drives `wedgeWorkspace.ts` directly could reach pending-under-Options, which `closeOptions` no longer handles. Moving the guard into the core (`busy()`/`openWedgeOptions`) with unit coverage is a recommended follow-up. This correction deliberately leaves the core unchanged.

The owned standalone suite includes `tests/wedge-lss.spec.ts`, `tests/wedge-focus.spec.ts` and `tests/wedge-prompt-focus.spec.ts`; all require `OPENVIREO_WEDGE_HARNESS_URL`. The coordinator separately validates actual App navigation in its integration checkout. The standalone feature receipt alone does not establish delivery of an App route.
