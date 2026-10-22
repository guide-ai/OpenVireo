# N07/E06 subflow: recorded pulsar (.PLR) data analysis

This slice ports the original **Radio Pulsar Data Analysis** window (`TPlsrAnalysisForm1`) for a supplied recording. It covers:

1. Load a `.PLR` file.
2. Show the read-only data properties.
3. Draw the three recorded-channel panels.
4. Move manual per-panel vertical/horizontal cursors and a common reference cursor.
5. Use the source-backed display controls: zoom, display factor, pan, reset.
6. Record measurements into an in-app list, review them in the original working-copy transaction with confirmed Delete and a comment-only Edit (on rows that provably round-trip), and clear the list.
7. Download the original recording bytes and import them again.

It does **not** receive signals, model receivers or noise, use the pulsar catalog, or compute period, PDot or dispersion. It also does not claim I06, I07, N07 or E06 acceptance. All 64 primary acceptance statuses (the 58 functional packages plus the 6 quality items) stay unchanged.

Contracts PLR-READ-01 … PLR-FMT-01, with addresses, sources, inferences and gates, are in [PULSAR-ANALYSIS-PROVENANCE.json](PULSAR-ANALYSIS-PROVENANCE.json). Artifact: VIREO 1.504 `CLEA_VEO.exe`, SHA-256 `781bc970…c54c`.

## Evidence route

- **REA**, used twice:
  - `rea-agents 6.5.0 inspect-with-objdump section_headers` gave evidence `ev_be75d7d3…c558ef`. It bound `.text`, `.data` and `.bss`, so `0x5bcca0` (data object), `0x5bccb0` (measurement record) and `0x5bcde0` (measurement list) are `.bss` globals, and `0x5b5be8`, `0x5b5ab8`, `0x5b5720` and `0x5b59d4` are `.data` slots.
  - The Find recovery ran `inspect-with-objdump disassemble` (evidence `ev_f6d7c186…29e8`). The provider was killed and its output is truncated at `0x4e0d27`. It was used only to confirm that the class-reference slot `0x492800` points to the `TGetSrchStrDlg` VMT `0x49284c`.
  - No Ghidra or IDA provider was configured, and none was set up.
- **Direct bounded GNU objdump** (not REA provider results) recovered four entries that the linear `target.asm` misses: Properties activation `0x571748`, `Record1Click` `0x56ef14`, Review/Clear `0x56f74c` and the formatter wrappers `0x486268`/`0x48634c`. No raw bytes were printed.
- **Independent coordinator extraction** (static PE/TPF0 data; hashes in the provenance file under `coordinatorEvidence`) supplies:
  - the decoded literals, Single constants and `.data` aliases;
  - the self-verified classes `TPlsrAnalysisForm1` (VMT `0x5697b0`, 49 methods), `THdrDisp` (VMT `0x57149c`) and `TMeasListDlg` (`0x5631f8`);
  - the complete DFMs, including the DispBox geometry and `PanTimer`.
- `0x56cf20` is `ZmRSetBtnClick` (display Reset). `Properties1Click` (`0x56d848`) only calls `Show` on the `THdrDisp` form in slot `0x5b59d4`.
- **Review triage captures** (coordinator, bounded GNU objdump): zoom in `0x56cd28`, zoom out `0x56ce24` and redraw `0x56c34c`. They are listed with hashes in the provenance file.
- **Review dialog captures** (coordinator, bounded GNU objdump plus Delphi VMT/TPF0 decode): the `TMeasListDlg` methods `0x563464..0x5639ff`, `DelBtnClick` from its own entry `0x56388c..0x563955`, the class/method table and the complete `TMEASLISTDLG` DFM. The prepared contract, its 17 synthetic semantic vectors and its browser plan are under `claude-pulsar-analysis/review-transaction-author/contract/`. The REA evidence above is reused for the image section layout and source SHA-256 only; it is not evidence of Review behavior, and no new REA operation was needed.
- **Edit captures** (coordinator, bounded GNU objdump plus Delphi VMT/TPF0 decode; contract `PLR-REVIEW-EDIT-STATIC-01`, hashes in the provenance listings `GNU-EDIT-*` and `EDIT-*`): `EditBtnClick` `0x56373c..0x56385c`, `TMeasForm2` (VMT `0x56fcf0`) `FormActivate` `0x570f6c` and `OkBtnClick` `0x5710d0`, the record-line parser `0x570498..0x570879`, the inherited Cancel entry `0x570b30..0x570b3a` (a direct entry capture; the linear `target.asm` is misaligned there), the RTL string helpers and CatN, and the typed literals. The earlier feasibility report and coordinator triage under `review-edit-preparation/` were read as analysis, not authority. The same REA section evidence is reused for the image layout and source SHA-256 only.
- **Find message helper** (coordinator, direct bounded GNU objdump, not REA; listing `FIND-COORDINATOR-MESSAGE-HELPER`): the complete helper `0x486ae0..0x486b13`, the unique-string return helper `0x4062d4..0x406325` and the typed one-byte NUL AnsiString `0x486b1c`. An older, broader capture of `0x486ae0` runs into the next, unrelated routine; it is kept as history only.
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
| filename | reader argument | FileNmEd ("File:") | text, or "Data Not Written to File" | File name (web: browser name; native: stored reader FileName text, possibly including a path) |

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
- **Review (`src/core/pulsarReview.ts`).** The dialog "Select Measurement Record" is modal (`ShowModal` from `0x56f74c`).
  - Activation (`0x563464`) assigns the confirmed list into the dialog's list box and selects the first row. The web keeps that copy as a frozen working copy of the same entry objects.
  - **Delete** (`0x56388c`) with no selection shows "No Item Selected!" / "Select Item for Deletion." and deletes nothing. Otherwise it asks "Confirm Deletion" / "Delete Selected Item from List?" and deletes only on Yes. The selection then stays at the same ordinal if it is still valid, otherwise it moves to the new last row. Review stays open.
  - **Cancel** (`0x563494`) discards the working copy. Nothing else changes.
  - **Ok** (`0x5634a0`) replaces the confirmed list with the working copy. The caller then marks the list as not saved and enables Save, for any result other than Cancel, even when nothing changed or every row was deleted. This is not Clear: Record, Review, the pending measurements, cursors and readouts are untouched, and an emptied list can still be reviewed.
  - Entries keep their stable sequence numbers and the next record continues the sequence. Duplicate rows keep the identity of the row actually selected. No field or `nativeLineCandidate` is reformatted, escaped or renumbered; only Edit reads the candidate, to check the round trip below.
  - **Edit** (`0x56373c`, `src/core/pulsarReviewEdit.ts`) with no selection shows "No Item Selected!" / "Select Item for Edit." and changes nothing. Otherwise the original opens a new "Measurement Data" form (`TMeasForm2`) on a copy of the selected line. Its activation (`0x570f6c`) parses the line (`0x570498`) into fixed ShortString fields of 40/7/5/9/9/10/14/81/100 bytes (object, frequency, gain, reference, vertical, horizontal, start, comment, the rest of the line); a reading equal to `""` is cleared. OK (`0x5710d0`) reads only the comment control, stores it in 81 bytes and rebuilds the whole line from those fields, writing `"",` for a cleared reading and escaping nothing; the reading fields are read-only and never read back. Cancel (inherited `0x570b30`) is result 2. The caller replaces the row for any result other than 2 and keeps Review open.
  - The web implements exactly that for the comment only, and only for rows that its literal model round-trips unchanged: the stored line and fields are printable ASCII (one byte per character), the object has no `"`, every stored field and the computed tail (points, interval, aperture and quoted file name) fit their byte capacities, the stored line equals the structured record template, and a literal port of the parser/rebuilder over the bound RTL helpers reproduces it byte for byte with every parsed field equal to its structured field. The template is a duplicate of the web Record writer's line, so agreement with it is a self-consistency guard (it fails closed if the two copies ever diverge), not an independent model; only the parser/rebuilder is traced to the editor captures. Commas in the object or comment, and quotes or commas inside the file name (part of the opaque tail), are fine. The tail check uses the browser file name. It does not show that the original's file name text (possibly a host path) fits the native 100-byte tail, which the native parser clips, so it never certified native tail equivalence. Any other row is refused with its reason (characters, quoted object, a named over-long field with its length and capacity, or layout) and nothing changes; Load and Record still admit it. OK keeps the stored prefix and suffix and splices the new comment only when that equals both the literal rebuild and the template. It replaces only that working-copy row with a new entry with the same sequence, panel and other fields; other rows keep their identity. The confirmed list, measurement comments, pending flags, cursors, readouts, the next sequence and the saved/Save flags change only through Review's Ok.
  - **Find** (`0x5634c8`, contract `PLR-REVIEW-FIND-STATIC-01`) is recovered from static captures but is shown disabled in its DFM place. What the original does:
    - It opens one application-wide search dialog (`TGetSrchStrDlg`) titled "Find Record Containing...". The instance lives in the variable `0x5bad7c`: CreateForm stores it through the `.data` alias slot `0x5b5d00`, which holds that variable's address, and callers read `[[0x5b5d00]]`. The DFM's default caption is "Find Help Topic", which suggests that Help uses the same dialog, but no Help caller is bound and no Help behavior is modelled. The dialog has a text box (`MaxLength` 80), a "Case Dependent" box, and the buttons From Top, From Cursor and Cancel.
    - From Top and From Cursor first remember the text and the case flag. If the text is empty they then end the search, so the dialog now remembers an empty text and the new case flag. Cancel ends the search without touching the remembered text or case flag. In both cases the list and the selection are unchanged. Otherwise From Top starts at row 0, and From Cursor starts at the row after the selection.
    - Before searching it lowercases the remembered text in place. Each scanned row is copied to a temporary and the copy is lowercased; the stored rows are not changed. Only `A`–`Z` change, and bytes ≥ 0x80 are left as they are. The "Case Dependent" box is stored but never read here.
    - It searches forward with a byte substring test and does not wrap. The first matching row becomes the selection. Otherwise it shows the "String Not Found" message and the selection stays. The caller builds the text `"<text>" Not Found.` (the text already lowercased) and passes the address of that string to helper `0x486ae0`. The helper appends a NUL if the last byte is not one and returns the data pointer of a unique copy. There is no fixed buffer and no truncation. The caller's flags are `0x40`, and the `Application.MessageBox` wrapper `0x47e09c` may add `0x100000` before calling `MessageBoxA`. The rendered native dialog is not claimed.
    - Which handlers run when the find dialog is closed with its window button, and whether any other VCL path then changes the remembered mode or text, is not established. Only if nothing else changes them would the caller repeat the previous search; the original's behavior here is unknown and not modelled.
  - **Why Find stays disabled.** The complete native search surface cannot be certified from the web's opaque candidates. The original searches the whole stored line. After a load, that line ends with `,"` + the exact `OpenDialog.FileName` text the reader received + `"`: the reader stores it at `+0x9a` and sets `+0x96`, and the Record writer appends it. That text may include a host folder path, but its native content is not bound here, and a browser exposes only the file's name. The number text of the line is not bound to the web formatting either. So, for any row that is scanned, a web non-match is not a native non-match, and a later web match cannot be shown as the original's first match. The one exception is a search with no row to scan: From Top or From Cursor on an empty list, or From Cursor with the last row selected. In that case the original shows "String Not Found" whatever the row text is. That alone does not justify a partial Find. The 13 prepared handwritten vectors were not run, and no Find flow exists. A search over the structured fields only would be a different, invented search, so it is not offered.
  - There is no Undo.

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
  - Keyboard panning is an accessibility adaptation: the native buttons have no OnClick, so the original cannot pan from the keyboard. A step happens on the pan button's native click event when the stored pointer-press suppression flag is clear; a keyboard click starts no timer. Enter usually clicks on keydown and Space on keyup.
  - Enter keydowns marked as repeated (`KeyboardEvent.repeat`) are stopped by the PLR capture handler before they reach the button. The button also latches Enter and Space as held from keydown until the keyup it receives. While Enter is latched, it prevents Enter's click even for a new keydown with `repeat=false`, so not every non-repeated keydown steps. A repeated or latched Space keydown is ignored; Space's click still comes from its keyup.
  - Held keys are forgotten on keyup, when the button loses focus, and on window blur, a hidden page, an inactive host, a load and a modal, because their keyup may never reach the button.
  - These rules depend on the key events the browser delivers. No one-step-per-physical-press guarantee is claimed for physical keyboards, remote-input layers or assistive technology; the stored pointer-press flag can suppress a later click regardless of its source. Pointer cancel and lost capture release the hold but do not clear that flag; a following non-keyboard click may be swallowed. This is an existing web limitation, not a native pointer or assistive-input contract.
- **Input adaptations.**
  - The primary button or touch can be switched to the reference cursor.
  - Arrow keys act as one click per press, starting from a line drawn on a client pixel (0 ≤ x < 400). A vertical or reference line that is not drawn there (none yet, hidden by a redraw, or off the client after a zoom) uses a fixed web edge origin: pixel 0. A hidden horizontal line uses row base − 1. Shift+←/→ moves the reference cursor.
  - Pointer cancel, lost pointer capture and an inactive host clear the drag latches, so a later move needs a new press. This is a web boundary, not a native MouseUp: it places no cursor, marks no panel pending, and keeps the cursors, the measurement and the confirmed list.
  - Pointer ownership: only the primary pointer whose press set a drag latch drives it. A non-primary touch, and the cancellation or capture loss of any pointer other than the owner, is ignored, so cancelling a second finger does not end the first finger's drag. Native left/right mouse handling is unchanged; no multi-touch behavior is modelled.
  - No beep.
- **Modal dialogs.** The record and clear prompts are native `<dialog>` elements opened with `showModal()`. The browser top layer makes the rest of the page inert and keeps focus inside, with no page-level key trap. Tab and Shift+Tab wrap between the dialog's first and last controls through a handler on the dialog element itself, so keys in any other dialog never reach it. A host modal opened on top stays topmost and keyboard-navigable. A fresh Escape is Cancel/No; Escape keydowns marked `repeat=true` are prevented and ignored in this shared dialog handler, including Record, Clear, Review and its inline layers. With several pending Record panels, one held Escape skips only the current panel; another fresh Escape can skip the next. The guard leaves Escape propagation intact and uses no global latch. It does not classify fresh keyup/keydown pairs as repeats. The default button is Cancel/No, an unconfirmed comment draft stays in the open dialog, and focus returns to Record or Clear. A dialog opens only while the panel is active and rendered and no other native modal is open. Nonmodal `dialog.show()` banners do not block it. A bounded observer while a modal session is pending detects conditional DOM removal as well as native close/open changes, so queued dialogs can resume even when a host removes a modal without calling `close()`. Tab from non-focusable dialog text keeps the native relative order: text between controls (the comment help and remaining-panels text) leads forward to the next control and backward to the previous one, and only text before the first or after the last control wraps. This is web behavior, not VCL modal parity.
- **Pending-read gate (web policy).** The browser reads a chosen file asynchronously: first its contents, then its SHA-256. The native Load reads synchronously, so no event-order parity is claimed.
  - While a read is pending, Record, Review and Clear are disabled, so no modal can open. The core refuses a load while a modal is open, and that refusal would drop the chosen file.
  - The gate only ever disables. Each button otherwise keeps its own enabled state, and a successful load still disables Record and Review until the next placement or record (PLR-LOAD-01).
  - The read completes and loads the chosen file, keeping the confirmed list. Cancel reading or a read error lifts the gate and leaves the current analysis unchanged.
  - The epoch, active and late-read guards are unchanged. Nothing is queued or retried.
  - The file input is disabled while a modal is open, so no read can start behind one. The core's `blocked-modal` refusal of a load remains as a fallback; no current control reaches it during a read.
- **Review dialog (web rules, not native parity).**
  - Review uses the same native `<dialog>`/`showModal()` protocol as the record and clear prompts. Its two MessageBoxes are an inline alert section of the same dialog; the list and buttons are inert while one is open, and Tab stays within the open layer.
  - An empty working copy has selection "none" (`null`). For a non-empty list the first row is selected, as the source does.
  - Escape and a close request act one layer at a time: No on the delete question, dismiss on the notice, otherwise outer Cancel. Natively `CnclBtn` has no Cancel property, a Yes/No MessageBox has no Escape answer, and the window close button is not modelled.
  - Escape keydowns marked as repeated are prevented and ignored by the dialog's own keydown handler. A held Escape therefore closes only the layer it started in: the editor, question or notice closes on the first keydown, and the repeats that then reach Review do not cancel it or discard its working copy. After the key is released, a new Escape closes the next layer. This is a web keyboard policy that relies on `KeyboardEvent.repeat`, with no window listener or latch, and it does not stop the event's propagation. Pointer, Tab, Enter and close-request behavior is unchanged. It is not a native Escape model.
  - The delete question focuses No. The native flags `0x24` make Yes the default button; the web asks for an explicit Yes instead. Focus returns to Delete when the question or notice closes, and to the Review button when Review closes.
  - Initial focus is the selected row, or Cancel when the list is empty. Rows are a radio group (browser arrow keys, which wrap). Tab follows the document order (the "Measurements" scroll region, the selected row, Edit, Delete, Ok, Cancel), not the native TabOrder, and the `&` accelerators are not implemented. The scroll region is a named Tab stop inside the dialog's Tab wrap, so arrow keys there scroll the wide table without changing the selected row; it leaves the Tab order while the inner question, notice or comment editor is open.
  - The scroll container is a named `region` inside the dialog, replacing an earlier `group`. The row radios share one `name` and have no separate group container. This is a web adaptation: no assistive-technology testing or parity is claimed. The region stays a Tab stop even when the table fits without horizontal overflow, which adds one stop per Tab cycle; this is the documented keyboard policy and does not depend on overflow.
  - Review follows the pending-read gate above.
  - Whether the original re-runs its OnActivate handler (re-assigning the confirmed list over a staged deletion) when the dialog is reactivated after the delete MessageBox is a VCL runtime question these captures do not answer. The web keeps the staged copy.
  - **Edit layer.** The comment editor is an inline layer of the same Review dialog, not a second window: heading "Measurement Data", the object as its group caption, JD/frequency/gain as text, the three readings as read-only fields outside the Tab order (DFM `ReadOnly`, `TabStop` false), the comment input and OK/Cancel, with the decoded TMEASFORM captions. The list and buttons are inert while it is open and every other Review action is refused. Focus starts in the comment and returns to Edit when the layer closes; Tab wraps inside it. Enter in the comment is OK (DFM `OkBtn.Default`); Escape cancels one layer at a time (editor, then Review), and a held Escape closes only one layer (see above). Enter keydowns marked as repeated are ignored by the PLR component capture handler before a control handler or native button activation. This covers Record's next-panel handoff, Review and its notices, Clear and the editor, so a repeated event cannot confirm the next panel or operate a newly focused control. A fresh press after release, Space and pointer or touch activation are unchanged. The guard is stateless and has no window listener: it relies on `KeyboardEvent.repeat`. Input layers that emit new keyup/keydown pairs with `repeat=false` are treated as fresh commands; native, remote-input and assistive-technology event parity are not claimed. This is a web keyboard policy, not a native behavior. The comment follows the record dialog's rules: up to 80 printable ASCII characters without `"` (DFM `MaxLength` 80; the 81-byte storage is separate), and an invalid draft stays visible and uncommitted. Only explicit OK and Cancel exist: no native window close button or other result code is modelled. An inactive host closes Review and keeps the editor with its draft for reentry; no session or reload persistence is added.
  - **Edit is not original-equivalent.** The editor keeps the working copy and the row captured when it opened. Natively, Review's OnActivate (`0x563464`: reload the shared list, select row 0) might run again when the nested form closes, before the caller re-reads the selection and writes the line; the original would then drop staged changes and overwrite row 0. Re-activation of the editor itself would also re-run its own activation and reset the comment. Neither is witnessed, and neither is reproduced. The inherited DFM binding of `TMeasForm2` (no own resource) is the Delphi expectation, not a runtime witness. Agreement of the literal parse/rebuild and of the duplicated web template with a candidate the web Record writer built is self-consistency. It is not evidence of the native Record writer, CSV output or VCL/code-page behavior, and the synthetic test vectors are not a native oracle either.
  - Download of the original recording bytes stays outside the dialog and is unchanged.
- **Host activity.** `active={false}` makes the panel inert. Hosts that hide the panel with CSS or an inert ancestor must pass `active={false}` for that whole interval; arbitrary ancestor styles are not observed. It cancels an in-flight read, so a late read is discarded, and it stops a held pan. It closes an open record, clear or Review dialog but keeps the record session, its draft, the clear stage and the Review working copy, selection and inner question, which reopen when the panel is active again. The loaded bytes and confirmed measurements are kept.
- **Measurement storage.** Measurements live in this window's state only. A visible note says they are not part of Save investigation and that refreshing or closing the page discards them. No session schema or notebook changes.
- **Gated features.**
  - The native **CSV save** is gated: its header stamps the host date and time plus login names, browser-clock defaults are forbidden, and its header literals are not decoded.
  - **Review Find** is disabled. Its behavior is recovered, but the line it searches contains native file name and number text that the web does not have (see above). **Edit** changes only the comment, only on the proven round-trip subset above. There is no Undo.
  - Each entry keeps an internal `nativeLineCandidate` built from the decoded record-line literals. It is opaque. It is **not** a validatable or exportable native CSV line: names are wrapped in `"` without escaping, so an admitted object or file name containing an unescaped `"` can make its fields ambiguous. A comma inside a fully quoted field alone is not evidence of ambiguity; no native CSV reader or writer is enabled by this precision. Only Edit reads it, through the round-trip check, and an edited candidate stays internal. Review shows the structured fields, which keep such names verbatim, and valid names are not rejected to make the candidate parseable.
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

1. Review Find: the dialog, search, casefold and messages are recovered (`PLR-REVIEW-FIND-STATIC-01`). Enabling it needs the exact stored line bytes, including the x87 number text and the exact native `OpenDialog.FileName` text, which may be a host path. The dialog's handle state at the Load call and the file name text that Execute stores are not bound, and a browser does not supply either. No Undo rule is invented. The coordinator map is `radio-help-followup/plr-static/NEXT-REVIEW-WORKFLOW.json` under the evidence root, with source/capture hashes and limits. Whether OnActivate re-fires after the delete MessageBox or the nested Edit form, which row the original then overwrites, and the selection after its write need VCL runtime evidence. Edit of other fields or of rows outside the round-trip subset is not offered.
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
