# N07/E06 subflow: recorded pulsar (.PLR) data analysis

This slice ports the original **Radio Pulsar Data Analysis** window (`TPlsrAnalysisForm1`) for a supplied recording. It covers:

1. Load a `.PLR` file.
2. Show the read-only data properties.
3. Draw the three recorded-channel panels.
4. Move manual per-panel vertical/horizontal cursors and a common reference cursor.
5. Use the source-backed display controls: zoom, display factor, pan, reset.
6. Record measurements into an in-app list, review them, and clear the list.
7. Download the original recording bytes and import them again.

It does **not** receive signals, model receivers or noise, use the pulsar catalog, or compute period, PDot or dispersion. It also does not claim I06, I07, N07 or E06 acceptance. All 64 primary acceptance statuses stay unchanged.

Contracts PLR-READ-01 … PLR-FMT-01, with addresses, sources, inferences and gates, are in [PULSAR-ANALYSIS-PROVENANCE.json](PULSAR-ANALYSIS-PROVENANCE.json). Artifact: VIREO 1.504 `CLEA_VEO.exe`, SHA-256 `781bc970…c54c`.

## Evidence route

- **REA**, used once: `rea-agents 6.5.0 inspect-with-objdump section_headers` gave evidence `ev_be75d7d3…c558ef`. It bound `.text`, `.data` and `.bss`, so `0x5bcca0` (data object), `0x5bccb0` (measurement record) and `0x5bcde0` (measurement list) are `.bss` globals, and `0x5b5be8`, `0x5b5ab8`, `0x5b5720` and `0x5b59d4` are `.data` slots. No Ghidra or IDA provider was configured, and none was set up.
- **Direct bounded GNU objdump** (not REA provider results) recovered four entries that the linear `target.asm` misses: Properties activation `0x571748`, `Record1Click` `0x56ef14`, Review/Clear `0x56f74c` and the formatter wrappers `0x486268`/`0x48634c`. No raw bytes were printed.
- **Independent coordinator extraction** (static PE/TPF0 data; hashes in the provenance file under `coordinatorEvidence`) supplies:
  - the decoded literals, Single constants and `.data` aliases;
  - the self-verified classes `TPlsrAnalysisForm1` (VMT `0x5697b0`, 49 methods), `THdrDisp` (VMT `0x57149c`) and `TMeasListDlg` (`0x5631f8`);
  - the complete DFMs, including the DispBox geometry and `PanTimer`.
- `0x56cf20` is `ZmRSetBtnClick` (display Reset). `Properties1Click` (`0x56d848`) only calls `Show` on the `THdrDisp` form in slot `0x5b59d4`.
- **Review triage captures** (coordinator, bounded GNU objdump): zoom in `0x56cd28`, zoom out `0x56ce24` and redraw `0x56c34c`. They are listed with hashes in the provenance file.
- Help: `PULSRANL.TXT` (SHA-256 `9d1cb3ff…1bf4`), including the "Controls" topic.
- No original program was executed or emulated. Nothing here is a runtime witness.

## Data properties binding

`THdrDisp.FormActivate` (`0x571748`) formats each data-object field into its own published control. The meanings follow those controls' DFM captions and the help topic "View Data Properties".

| Field (data object +4) | Reader | Control (DFM caption) | Shown as | Meaning |
|---|---|---|---|---|
| short[40] | quoted token | IDEd ("Object:") | text | Object identification |
| Extended +0x68 | float token | JDEd ("Data Start:") | ffFixed 8 | Data start time (JD − 2,400,000) |
| word +0x29 | integer token | AprEd ("Aperture:") | IntToStr | Telescope aperture (m) |
| Extended +0x72 | float token | DelTED ("Delta T (MSecs):") | ffFixed 2 of ×Single 1000 | Time interval (msec); stored in seconds |
| 3× Extended +0x2c | float tokens | Freq1..3Ed ("Frequency (MHz):") | ffFixed 2; blank above highest | Frequency (MHz) |
| 3× Extended +0x4a | float tokens, 0 → 1 | Gain1..3Ed ("Relative Gain:") | ffFixed 3; blank above highest | Relative gain |
| byte +0x2b | integer token | — | gates receivers 2 and 3 | Highest recorded receiver index |
| list last index +1 | rows | PointsEd ("# of Data Points:") | IntToStr | Number of data points |
| filename | reader argument | FileNmEd ("File:") | text, or "Data Not Written to File" | File name (web: browser base name; native: full path) |

## Recovered behavior (implemented in `src/core/pulsarAnalysis.ts`)

- **Panels (PLR-GEOM-01).** The DFM paint boxes are 400 × 120, 400 × 125 and 400 × 140 pixels. FormCreate (`0x56a9f8..0x56aa24`) sets the baselines to Height − 1, Height − 1 and Height − 16, which gives **119, 124 and 124**. Every axis, trace and cursor uses its own panel's baseline.
  - At zoom ≥ 1 there are Round(zoom) pixels per sample. At zoom < 1, Round(1/zoom) samples are averaged per pixel, and the first point keeps the native unnormalized sum.
  - The drawn height is `base[ch] − Round(v·gain·factor)`. A missing row draws the baseline.
  - The y-axis runs from base − 100 to base, with ticks every 10 and 50 pixels.
- **Zoom** keeps the window centre. Zoom in changes each edge by ±100·dt/z; zoom out by ±200·dt/z. The range is 0.125 to 8.
  - The native handlers check the bound again after the update (`0x56cd89..0x56cda5`, `0x56ce85..0x56cea1`). So the click that reaches 8 (or 0.125) disables that button at once; no extra click at the bound is needed.
- **Display factor** is halved or doubled within 0.125 to 8. It redraws only its own panel.
- **Pan (PLR-PAN-01).**
  - A left-button press on a pan arrow stores the step ∓rate·dt (rate 1, 10 or 100), runs one tick at once and enables `PanTimer`.
  - `PanTimer` has `Interval` 100 and `Enabled` false in the DFM. Each tick moves the window by the stored step and redraws all panels.
  - Left-button release disables the timer.
  - `TTimer.SetEnabled` (`0x448ff4`) does nothing when the value is unchanged, so pressing again while held keeps the one running timer.
  - There are no native bounds.
  - The pure tick is `pulsarPanTick`. The hold lifecycle is `src/core/pulsarPanHold.ts`, which takes an injected scheduler.
- **Cursors.** Left button: the panel's vertical cursor `t = start + x·dt/zoom` (6 decimals), or the horizontal cursor `(base − y)/(100·gain·factor)` shown as `ffExponent(5,2)`, depending on the mode chosen by clicking a readout. Right button: one reference cursor on all panels.
  - A redraw after zoom or pan re-quantizes cursor times to the pixel grid (ties go to even).
  - The redraw (`0x56c34c`) runs after the panel is repainted. It skips a time or value below 0, and `0x56c6dc` rejects a y outside 0 ≤ y < base. Such a line is gone from the repainted panel, but its stored pixel, value and readout are left as they were. The web models this with per-line visibility:
    - A negative time or value is drawn right after a valid manual click.
    - The next redraw of that panel hides it. The readout and the measurement stay.
    - A projection that becomes valid again is drawn again.
  - MouseUp marks the panel as having an unrecorded measurement, but only when rows exist and the panel is at or below the highest recorded index.
- **Reset** (`ZmRSetBtnClick`) restores the window, zoom, factors, modes, cursors and the measurement record.
- **Load** runs that reset and then opens Properties. The measurement list is kept, but Review and Save are disabled until the next record.
- **Record.** One modal per pending panel. OK appends an entry; a value equal to 0.0 is blank. Cancel skips the panel. Record stays enabled while any panel is pending.
- **Clear.** If the list is unsaved, a prompt appears first, then a Yes/No confirmation.

## Web boundaries (explicit, not native)

- **Strict admission** (`src/core/pulsarRecording.ts`). Every rejection leaves the current analysis unchanged, unlike the native reader's partial mutation.
  - Printable ASCII with CRLF or LF; at most 2 MiB, 65536 rows and 512 characters per line.
  - Headerless files are rejected: the native route keeps whatever metadata was loaded earlier.
  - A blank first line is rejected separately (`blank-first-line`), because this admission requires the apostrophe header on line 1. What the original does with a blank first line is not established: the listing dereferences its first character, and there is no runtime witness, so no native route is claimed. Only a zero-byte file is called empty.
  - Names longer than 40 characters are rejected (no truncation), and so is the native placeholder name `No Data` (it overwrites the interval natively).
  - Decimal integers only; aperture 0–65535; highest index 0–2.
  - Bounded finite decimals; interval > 0; no blank lines or trailing content.
- **Numbers** are parsed with `Number()` and formatted with `toFixed`/`toExponential` (half away from zero, `'.'` separator, rounded zero without `-`). Round uses the shared `roundNearestEven`. Nothing here is x87 Extended parity.
  - Number overflows earlier than Extended. For example, an admitted gain of 1e-320 makes every horizontal value on that panel ±Infinity. Such a placement, or a record entry with a non-finite field, is refused with a visible status. The previous measurement and the loaded bytes are kept. No zero is substituted, no lower gain limit is invented and no arithmetic is reordered.
  - A MouseUp whose own placement is refused still makes the last accepted value recordable if that same gesture previously placed a valid cursor. A completely refused gesture keeps the prior pending state and creates no blank entry. Confirming a record for a panel forgets that panel's accepted placement, so a refused click while another button is still held does not make the recorded value pending again; the drag latches are kept. This extra gesture bookkeeping is a web Number-domain policy, not a recovered x87 rule. A y that `0x56c6dc` rejects as out of range is the native rule and still marks the panel pending.
  - A later accepted placement replaces the "Not taken" status, including when it stores the same value again. The decision is the pure TypeScript `pulsarAnnouncement` policy; React only translates and presents it. File rejections stay in their own alert.
  - A finite stored value can still overflow the redraw product. With gain 1e-309, y = 123 on panel 2 stores 1e307, and the redraw computes 1e307·100 before gain and factor bring it back to y = 123. That is not the native out-of-range rejection, so the zoom, pan, pan tick or factor change is refused as a whole with a visible status. The display, cursors and measurements stay as they were, with no partial re-quantization.
- **Rendering limits.** The recovered geometry is drawn as SVG, with each viewBox 400 × Height native pixels and pixel centres on integer coordinates. GDI pen and LineTo end-pixel rules, anti-aliasing, fonts and label positions are not reproduced, and no runtime pixel parity is claimed. Pointer input is clamped to integer client pixels [0,399] × [0,Height−1].
- **Pan lifecycle.**
  - The browser interval is 100 ms. Its cadence is not claimed equal to Windows WM_TIMER resolution or coalescing.
  - A hold also stops on pointer cancel, pointer-capture loss, window blur, a hidden page, an inactive host, a committed load, an opened modal and unmount.
  - The click event that follows a pointer press does not step again.
  - Enter/Space on a pan button steps once per physical press. Holding the key does not repeat (auto-repeated keydowns are ignored), and no timer starts. This is an accessibility adaptation: the native buttons have no OnClick, so the original cannot pan from the keyboard.
  - Held keys are forgotten on window blur, a hidden page, an inactive host, a load and a modal, because their keyup may never reach the button.
- **Input adaptations.**
  - The primary button or touch can be switched to the reference cursor.
  - Arrow keys act as one click per press, starting from a line drawn on a client pixel (0 ≤ x < 400). A vertical or reference line that is not drawn there (none yet, hidden by a redraw, or off the client after a zoom) uses a fixed web edge origin: pixel 0. A hidden horizontal line uses row base − 1. Shift+←/→ moves the reference cursor.
  - Pointer cancel, lost pointer capture and an inactive host clear the drag latches, so a later move needs a new press. This is a web boundary, not a native MouseUp: it places no cursor, marks no panel pending, and keeps the cursors, the measurement and the confirmed list.
  - Pointer ownership: only the primary pointer whose press set a drag latch drives it. A non-primary touch, and the cancellation or capture loss of any pointer other than the owner, is ignored, so cancelling a second finger does not end the first finger's drag. Native left/right mouse handling is unchanged; no multi-touch behavior is modelled.
  - No beep.
- **Modal dialogs.** The record and clear prompts are native `<dialog>` elements opened with `showModal()`. The browser top layer makes the rest of the page inert and keeps focus inside, with no page-level key trap. Tab and Shift+Tab wrap between the dialog's first and last controls through a handler on the dialog element itself, so keys in any other dialog never reach it. A host modal opened on top stays topmost and keyboard-navigable. Escape cancels, the default button is Cancel/No, an unconfirmed comment draft stays in the open dialog, and focus returns to Record or Clear. A dialog opens only while the panel is active and rendered and no other native modal is open. Nonmodal `dialog.show()` banners do not block it. A bounded observer while a modal session is pending detects conditional DOM removal as well as native close/open changes, so queued dialogs can resume even when a host removes a modal without calling `close()`. Tab from non-focusable dialog text keeps the native relative order: text between controls (the comment help and remaining-panels text) leads forward to the next control and backward to the previous one, and only text before the first or after the last control wraps. This is web behavior, not VCL modal parity.
- **Host activity.** `active={false}` makes the panel inert. Hosts that hide the panel with CSS or an inert ancestor must pass `active={false}` for that whole interval; arbitrary ancestor styles are not observed. It cancels an in-flight read, so a late read is discarded, and it stops a held pan. It closes an open record or clear dialog but keeps the record session, its draft and the clear stage, which reopen when the panel is active again. The loaded bytes and confirmed measurements are kept.
- **Measurement storage.** Measurements live in this window's state only. A visible note says they are not part of Save investigation and that refreshing or closing the page discards them. No session schema or notebook changes.
- **Gated features.**
  - The native **CSV save** is gated: its header stamps the host date and time plus login names, browser-clock defaults are forbidden, and its header literals are not decoded.
  - **Review** is read-only: the original `TMeasListDlg` has Find/Edit/Delete handlers. Static recovery now establishes the outer working-copy/Cancel/OK transaction and confirmed deletion/selection order, but these actions are not implemented in this slice. Comment-editor and quoted-line details require a safe round-trip subset; Find remains unbound.
  - Each entry keeps an internal `nativeLineCandidate` built from the decoded record-line literals. It is opaque. It is **not** a validatable or exportable native CSV line: names are wrapped in `"` without escaping, so an admitted object or file name containing an unescaped `"` can make its fields ambiguous. A comma inside a fully quoted field alone is not evidence of ambiguity; no native CSV reader or writer is enabled by this precision. Nothing reads it. Review shows the structured fields, which keep such names verbatim, and valid names are not rejected to make the candidate parseable.
  - The Clear prompt therefore offers "continue without saving" or Cancel, with no Save.
- **Download** returns the exact loaded bytes. It is not the native PLR writer (`0x56a518`), and no header is ever synthesized.

## Resolved by independent extraction

The following were resolved by independent static extraction; they are static evidence only:
- the requested literals, the Single constants 0, 400, 8, 0.125, 100 and 1000, and the `.data` aliases;
- the redraw threshold Single `0x56c440` = 0.0, by a direct source-hash-bound static data decode (`COORDINATOR-correction-triage/static-data-decode.json`). This narrows that one constant only; it is not runtime FPU parity;
- the `THdrDisp` class, its methods and fields, and the DFM captions;
- the binding of the analysis-form methods;
- the DispBox heights and baselines;
- `PanTimer.Interval` (100 ms);
- the help "Controls" topic.

## Open gates (exact missing evidence)

1. Implement the statically recovered working-copy Review transaction and confirmed deletion (`0x563464`, `0x563494`, `0x5634a0`, `0x56388c..0x563955`). Bind Find/search context and safe comment-line round trip before enabling those actions; no Undo rule is invented. The coordinator map is `radio-help-followup/plr-static/NEXT-REVIEW-WORKFLOW.json` under the evidence root, with source/capture hashes and limits.
2. The CSV writer `0x56feac`: its header literals and the host date/time and login authority.
3. Delphi ReadLn/Eof edge cases, and the StrToFloat language and locale.
4. A native PLR writer witness, or an independent original PLR file. All fixtures are synthetic, so the tests check this implementation contract and are not an oracle for the original.
5. The remaining f32 constants still read only from listing encodings (listed in the provenance file).
6. Runtime witnesses for GDI pixels, WM_TIMER cadence and x87 rounding.

## Component interface

```tsx
import PulsarAnalysis,{mountPulsarWorkbench} from './components/PulsarAnalysis';
<PulsarAnalysis translate={createPulsarTranslator(catalog)} idPrefix="plr-" active={routeVisible && !hostBusy} />
const workbench = mountPulsarWorkbench(element); workbench.render({ active: false }); workbench.unmount();
```

This feature branch supplies the self-contained panel; its separate App route integration and navigation tests are owned by the coordinator. `idPrefix` prefixes every element id, Review included, so several panels can share a page. `PulsarMessages.ts` holds the `pulsar.*` English catalog. The core imports neither React nor i18n.

## Tests and harness

- Unit tests: `node node_modules/vitest/vitest.mjs run --config <evidence>/harness/vitest.config.mjs` runs `src/core/pulsar*.test.ts`.
- Browser tests: `node node_modules/@playwright/test/cli.js test -c <evidence>/harness/playwright.pulsar.config.mjs` serves the harness on loopback `127.0.0.1:5185` (strict port) at `/__pulsar-harness/` and runs `tests/pulsar-analysis.spec.ts`. The spec skips without `OPENVIREO_PULSAR_HARNESS_URL`.
- `<evidence>/harness/playwright.pulsar.mobile.config.mjs` runs the same spec at a 390 × 844 touch viewport.
- `<evidence>` = `/home/dobleuber/Documents/Codex/2026-10-18/task-3/claude-pulsar-analysis`.

The compiled `TMEASFORM` comment control has `MaxLength=80`; the `shortstring[81]` copy capacity is not the manual entry limit. OpenVireo validates the 80-character boundary while preserving an invalid editable draft and earlier confirmed rows; it does not claim identical VCL text-entry behavior. The decoded resource hash and field binding are in `COORDINATOR-correction-triage/manual-comment-dfm.json`.
