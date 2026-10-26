# Save from the Record arming question (R-RX16, Radio only)

When the main receiver's **Record** finds unsaved data, it asks the recovered question "You have not saved your previously recorded data!" (flags 0x13). Until R-RX15, **Yes** in that question was disabled. R-RX16 enables it as a **web Save owned by the Radio route**:

- **Yes** opens a Radio Save dialog for the current receiver recording. Yes itself chooses, writes and erases nothing.
- **Choose file and save…** is a separate click. It runs the R-RX15 verified Save unchanged: the browser picker, write, close and an exact fresh read-back.
- Only a verified copy continues to the recovered **erase** question (flags 0x41). The erase still needs its own **OK**.
- Every other outcome stays in the dialog with an alert: cancel, refusal, wrong extension, write, close or read-back failure, mismatch, stale data, or an abandoned attempt. **Back to the question** (or Escape) returns to the unsaved question, whose No → erase and Cancel are unchanged.

The data is a **model-generated capture of the receiver simulation, not observed CLEA data**. The two other original Save-Yes paths stay **gated** and are not enabled in this increment:

- the finish Save question (E4) — since R-RX17 enabled separately, see [RADIO-FINISH-SAVE.md](RADIO-FINISH-SAVE.md);
- the Pulsar Analysis Load question (E9).

Radio is not complete. No native Save dialog, wrapper, exception or durability equivalence is claimed.

No CLEA execution, emulation, native dialog or native trace was used. The tests check this implementation's web contract, not the original's behaviour.

Binary `CLEA_VEO.exe` SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`; accepted base `a123442658c1a4ada72dc68a5c1bac8c7e1cc2ca`. Tags: [S] static listing (bounded GNU objdump, no REA provider retry), [I] analyst inference, [W] web policy. Listings, hashes and fact ids are in [RADIO-RECORD-SAVE-PROVENANCE.json](RADIO-RECORD-SAVE-PROVENANCE.json).

## Modules

- `src/core/radioRecordSave.ts` (new, pure): the dialog sub-state (an R-RX15 `'save'` session, the attempt token, the abandoned flag) and its steps. It covers open, readiness, begin, started, noticed, failed, abandoned and settled. `radioRecordEraseNote` is the note gate of the erase question (WEB-RX16-04).
- `src/core/pulsarSavedCopy.ts` (the shared R-RX15 Save core): `PULSAR_SAVE_READBACK_MAX_BYTES`, the read-back bound passed to `continuePulsarSave`. It is the same `PLR_MAX_BYTES` of the strict .PLR reader, not a separate number, so the Radio UI does not import the PLR reader.
- `src/core/radioReceiverSession.ts`: the `'save'` prompt kind, the `verified` note on the erase prompt, and three transitions:
  - `openRecordSave` (Yes);
  - `stepRecordSave` (the sub-state);
  - `leaveRecordSave` (Back, or verified → erase).

  While the `'save'` prompt is open, every prompt answer is refused.
- `src/core/pulsarCurrentData.ts`: the shared output claim `output` with `claimPulsarOutput` / `releasePulsarOutput` (WEB-RX16-05). The receipt code (`pulsarWriteClaim`, `recordPulsarWrittenCopy`, `pulsarWrittenCopy`) is unchanged.
- `src/components/RadioReceiverWindows.tsx`: the async owner (attempt tokens, liveness, cleanup) and `RecordSaveBox`. `RecordPromptBox` gains the enabled Yes and the verified erase note, which it shows only while `radioRecordEraseNote` finds the matching current receipt in the committed document.
- `src/components/RadioRecordSaveMessages.ts` (new): the `radioSave.*` texts. The R-RX15/R-RX14 Save texts are reused through `createPulsarTranslator`.
- `src/components/PulsarAnalysis.tsx`: the Analysis Save takes and releases the shared claim. Its Save and raw Download refuse while any owner holds it.
- Reused unchanged: `pulsarSaveBegin`, `pulsarSaveRefusalNotice`, `rawExportOpen`, `rawExportSaveNotice`, `buildPulsarRawExport`, `invokePulsarSavePicker`, `continuePulsarSave`, `browserPulsarSaveSupport`, `pulsarWriteClaim`, `pulsarClaimBytes`, `pulsarClaimReadback`, `recordPulsarWrittenCopy`. No Analysis handler is called from Radio.

## Recovered facts (static)

- **E1 Record arming** [S] `record-button-verified.asm` (SHA-256 `e6884d75…f6f1`), range `0x57581c..0x57594d`:
  - `0x575832..0x57583b` flips the recording byte `0x5bce28`.
  - `0x575849..0x57586c`: the list must be non-empty (`0x492708`) and `+0x97` must be 0.
  - `0x575882`: the unsaved question, flags `0x13`. At `0x57589f..0x5758a9`, Cancel (2) → `0x5758ab` (byte := 0, skip the refresh). Yes (6) → `0x5758b4`. Anything else → `0x5758c0`.
  - `0x5758bb`: Yes calls the Save wrapper `0x56b36c` (EAX = the analysis form `[0x5b5d84]`). Its normal return falls into `0x5758c0`. **No saved flag or return value is tested after the Save.**
  - `0x5758c0..0x5758d3`: a second non-empty check, then the erase question at `0x5758d5` (flags `0x41`). Only OK (1) reaches the clear `0x56a8e0` at `0x5758f7`; anything else clears the byte at `0x5758fe`. `0x575905..0x575923` zero the scratch cells only while the byte is set; `0x575927` refreshes.
  - The frame's exception handler (`push 0x575942` → `0x4056e4`) is not modelled. A normal return after a native I/O exception is **not** established. A cancelled native Save dialog may return normally; the browser's cancel/refusal continuation is web policy (WEB-RX16-04).
- **E4 Finish** [S] `frame-verified.asm` (`d31088cb…9ea4`), range `0x573bbd..0x573dce`:
  - Yes calls `0x56b36c` at `0x573d54`, then jumps `0x573d59` → `0x573d6f`, which only compares the original answer with 7. There is no saved-success test.
  - On the web the committed capture lease is still held during this question, and the verified receipt refuses a held lease. **E4 stays gated in R-RX16.** The lease is not released early to make room for a Save. Since R-RX17 E4 Yes is enabled through a separate, lease-owner-aware recorder; the generic recorder used here is unchanged (see [RADIO-FINISH-SAVE.md](RADIO-FINISH-SAVE.md)).
- **E9 Analysis Load** [S] `analysis-load-prefix-verified.asm` (`17148ae9…df34`) and `analysis-load-after-save.asm` (`0e3a6c35…8aba`), range `0x56af38..0x56b1c8`:
  - Yes calls `0x56b36c` at `0x56afb7`; the normal return reaches `0x56afbc`, as No does. `0x56b00d` is the chooser's virtual call; the reader `0x56a260` runs only at `0x56b093`. No saved-flag or return test comes before the chooser.
  - A web continuation from an asynchronous Save into a file chooser needs its own user-activation design: the chooser must be opened by a fresh user gesture. That design is not made here, and **E9 is not enabled in this increment**. This is not a claim that it is impossible, nor that the native Load contract is unrecovered.

## Web policy

- **WEB-RX16-01 Yes** [W]. In the unsaved question, Yes opens the Radio Save dialog. It is admitted only when the current dataset still has the generation the question was asked for and is a memory capture. Otherwise the byte is cleared with the refresh (Off), nothing is erased, no host request is made and the status is `record-superseded`. Yes does no I/O and calls no picker. It is disabled with a reason when the browser lacks the save file picker (`insecure-context`, `no-api`); No and Cancel stay available. While the dialog is open, the byte stays set and every receiver action, Close, Pulsar List and live options are refused (`record-dialog-open`).
- **WEB-RX16-02 Dialog and Choose** [W]. The dialog shows:
  - the R-RX14 canonical preview: scope, model-origin warning, format, inactive receivers, rounding list or the build refusal;
  - the R-RX15 warnings: "may replace or empty the chosen file", how the verification works, and the extension rule.

  **Choose file and save…** is its own click and is synchronous up to `showSaveFilePicker`. It runs the guards, `pulsarSaveBegin`, the shared claim and then the picker, with no await before the picker. A second click of a double-click (`detail > 1`) is ignored, so a double-click on Yes never reaches the picker.
- **WEB-RX16-03 Receipt** [W]. Only `recordPulsarWrittenCopy` creates the receipt, under unchanged rules: an owned claim, write, close, a bounded fresh exact read-back, still the claimed data, and the name rule. A picker result, a write or a close alone marks nothing. The receipt is historical: it is not live monitoring of the file.
- **WEB-RX16-04 Continuation** [W].
  - Only a verified receipt leaves the dialog. It goes to the erase question with a note: "a verified copy … saved as X … OK still erases …". With no rows left, which cannot happen for a capture the builder accepts, it would arm without an erase, like the native second check.
  - The note appears only while the document's current receipt (`pulsarWrittenCopy`) is for the question's generation, with the noted file name and byte count (`radioRecordEraseNote`). After a dataset change while the question waits (for example a Load in Pulsar Analysis), the plain erase text is shown; Cancel stays the default, because the question was still reached asynchronously; and OK is refused as `record-superseded` (nothing erased, Record off).
  - Cancel, refusals, extension, failures, mismatch, verified-stale and abandoned **stay in the dialog** as alerts. Their texts say that a chosen file may already have been created, emptied or changed.
  - **Back to the question** (also Escape) returns to the unsaved question with the same generation. Its No → erase and Cancel are explicit. Back is inert while an attempt holds the output claim.
  - Nothing erases or arms automatically.
  - This browser continuation is a declared web policy, not the native normal return.
- **WEB-RX16-05 One output attempt** [W]. A shared claim `output = {owner:'analysis'|'radio', token}` lives on the App's current dataset document:
  - It is taken before the picker call and released by that exact owner and token, only after its stream cleanup has settled.
  - A dataset change keeps it, and an older attempt never releases a newer one.
  - The Analysis Save and the Analysis raw Download refuse (`not-ready`) while either owner holds it. So does Radio Choose.
  - This also covers a Radio attempt whose route was hidden but whose stream is still being cleaned up. The Analysis panel's own `exportBusy` does not see such an attempt.
- **WEB-RX16-06 No deadlock** [W]. Radio Save readiness is: no capture lease, no pending analysis read, and no output claim. An open Analysis dialog (`analysis.modal`) is deliberately **not** a condition, because those dialogs stay open on their hidden route. The erase OK still refuses `analysis-busy` (unchanged): the byte goes off, the data and the receipt are kept, and the next Record asks only the erase question.
- **WEB-RX16-07 Gated paths** [W]. E4 Yes (finish Save question) and E9 Yes (Analysis Load question) stay disabled with their reasons. Their lease and user-activation designs are not part of this increment. Since R-RX17, E4 Yes is enabled with its own lease design ([RADIO-FINISH-SAVE.md](RADIO-FINISH-SAVE.md)); E9 Yes stays disabled.
- **WEB-RX16-08 Liveness, focus and layout** [W].
  - Each attempt has a token. It is live only while the token is current, the workspace is mounted, the Radio route is shown and no project operation runs. A foreign modal dialog does not stop it.
  - A hidden route, a project operation or an unmount makes the attempt dead. A dead continuation aborts an open stream and marks nothing, and the claim stays held until that cleanup settles. The dialog shows `abandoned`, and Choose and Back are `aria-disabled` until then.
  - If a foreign modal is open when the receipt is committed, the erase question waits latent and appears when that modal closes.
  - Focus:
    - Entering the dialog focuses Back.
    - Back focuses Cancel in the unsaved question (the existing web default; the native default is Yes).
    - The erase question reached after a verified Save focuses **Cancel**, not the native default OK, because it arrives asynchronously after a separate click. This follows how the question was reached, not whether the note is still shown (WEB-RX16-04).
    - A directly reached erase question keeps OK.
  - Held Enter and Escape repeats are ignored.
  - Every text that can hold a name wraps anywhere; the dialog fits at 1440, 375 and 320 px.

## Gaps and limits

| # | Limit | Effect |
|---|---|---|
| L1 | The native Save wrapper `0x56b36c` (dialog, naming, collision probe, remembered folder) and its delivery are not ported | The browser chooses one file; the R-RX15 web rules apply. |
| L2 | SEH/exception continuation of E1 (`0x575942` → `0x4056e4`) not modelled | Failures stay in the dialog; no native error path is claimed. |
| L3 | E4 and E9 Yes | Gated (WEB-RX16-07). Since R-RX17 only E9 stays gated; E4 → [RADIO-FINISH-SAVE.md](RADIO-FINISH-SAVE.md). |
| L4 | A browser stage that never settles (most plainly a picker promise) | It keeps the shared output claim until that provider promise settles. Since R-RX16 this blocks across routes: a hung Radio attempt keeps its dialog (Choose, Back and Escape inert) and refuses Analysis Save and raw Download (`not-ready`); a hung Analysis attempt refuses Radio Choose (`not-ready`). Hiding the route or a project operation marks the attempt abandoned (logically dead) but does not release the claim. The application forces no timeout and no claim release while the provider promise is unsettled. A browser chooser Cancel that rejects the promise (`AbortError`) settles the attempt and releases its claim; a still-live attempt shows the cancel notice, while an abandoned attempt keeps its abandoned alert. |
| L5 | Physical durability, OS dialog behaviour, x87, GDI, locale | Not claimed; the receipt is historical. |
| L6 | Focus defaults (Cancel in the unsaved question; Cancel after an async verified Save) | Declared web choices that differ from the native defaults. |

## Tests (written; not run by the author; validation is run by the coordinator on a diagnostic-free copy)

- `src/core/pulsarCurrentData.test.ts`:
  - The claim starts empty.
  - Busy, mismatch and bad-input refusals.
  - An older token never releases a newer claim, across owners.
  - The claim survives import, erase and commit, and a receipt can be recorded while it is held.
- `src/core/radioRecordSave.test.ts`:
  - Open refuses another generation and non-memory data; the preview refusals (`No Data`, apostrophe) open with every Choose refused.
  - Readiness refuses a lease, a pending read and a claim of either owner, but **admits an open analysis modal**, while the erase acquire still refuses it.
  - Stale and pending requests are refused.
  - The claim's text equals R-RX15's GOLDEN and the R-RX14 build.
  - Token and abandonment bookkeeping.
  - The note gate `radioRecordEraseNote` with a real receipt: a match returns the same object; no note, another name, byte count or generation, an import, an erase or an in-place sample change give `null`.
- `src/core/pulsarSavedCopy.test.ts`: the shared read-back bound through `continuePulsarSave` with an explicit controlled mock host (no browser, OS picker or physical write): a declared size equal to the strict `PLR_MAX_BYTES` is read; one byte more is refused (`readback-too-large`) before `arrayBuffer`.
- `src/core/radioReceiverSession.test.ts` (unchanged): the existing route audit still refuses any `pulsarRecording` import in `RadioReceiverWindows.tsx`; the Radio UI now passes the shared bound instead.
- `src/core/radioReceiverRecord.test.ts` (world harness):
  - Yes opens the dialog with the byte armed, no host request, and every receiver action and prompt answer refused.
  - A stale Yes ends Record (Off), erases nothing and makes no request.
  - Back is refused while pending (also abandoned), and returns with the same generation afterwards.
  - `verified` without a receipt is refused.
  - Claim → receipt → erase question with the verified note and no acquire; then OK clears and drops the receipt, or Cancel keeps data and receipt and the next press asks only the erase question.
  - A Load while the verified erase question waits: the note gate gives `null` while the prompt keeps `verified` (origin); OK is refused `record-superseded` with the imported data, generation and lease unchanged.
  - No deadlock with `analysis.modal`.
  - Cancelled and mismatched attempts change nothing.
  - At the finish question, `answerRecordSave(…,'yes')` and `openRecordSave` are refused with the committed lease kept (the arming Save is not the finish Save; since R-RX17 the finish Yes is `openFinishSave`).
- `tests/radio-receiver-record-save-app.spec.ts`: the real App with real OPFS handles and an explicitly synthetic picker (`__synthetic`, `assertSynthetic` before every picker click).
  - Happy path: the test's own runtime probe (secure context, the synthetic picker, `FileSystemFileHandle.prototype.createWritable` and `FileSystemWritableFileStream`) before `data-support="ok"` and Yes enabled; Yes calls no picker; Back is focused; the rounding list; one `click` picker call; the stream log; the erase question with the verified note and Cancel focused; the R-RX15 file layout; the Analysis receipt; OK erases.
  - Failures as alerts: cancel with an emptied seed, async and sync refusals, write, close (product abort, stream no longer writable), read-back, tamper, extension and Choose again. Then Back → Cancel keeps the data unsaved, and No → erase stays explicit.
  - A hidden route during a held write: abandoned; Analysis Save and raw Download refused (`not-ready`, the text names the Radio Record question) with no picker call or download; Choose and Back `aria-disabled` and refusing forced mouse clicks (test-owned capture listeners prove delivery to each button; [Playwright `force`](https://playwright.dev/docs/actionability#forcing-actions) can skip actionability checks including the hit-target check), Escape inert; after the release the log ends with abort and Back is enabled again; Analysis Save works after the release.
  - Reverse ownership: the Radio Save dialog is prepared first; an Analysis Save held at its write refuses an ordinary Radio Choose (`not-ready`, no picker call); after the Analysis cleanup (abort) the Radio Save verifies; the Analysis dialog shows `abandoned`.
  - DEFENSIVE HOST INJECTION (not a user-gesture witness: the header is inert while the Radio Save is presented): a restore file set programmatically during a held Radio write makes the attempt `abandoned` with status `busy`; after the release the log ends with abort and nothing is marked. If Playwright refuses the inert input or the Cancel button stays inert, this test is a coverage gap for the coordinator, not a pass.
  - No deadlock with an Analysis Clear question kept open on its hidden route.
  - A Load in Analysis after the Record press makes Yes `record-superseded`.
  - A Load in Analysis while the verified erase question waits: the note is gone, the Cancel-default paragraph, Cancel focus and `data-verified` stay; OK is refused `record-superseded`; the loaded file stays.
  - Keyboard: double-click and held Enter on Yes; Tab wraps; Escape is Back; Enter on Choose; held Enter on the erase Cancel.
  - A synthetic host `<dialog>` during a held read-back.
  - Unsupported API.
  - E9 still disabled; since R-RX17 the finish Save question's Yes is enabled (not pressed there; `tests/radio-receiver-finish-save-app.spec.ts` covers it).
  - Layout at 1440, 375 and 320 with 120-character names, including Range text-line checks and attached offender lists.

  These are web contract checks, not native or OS-dialog witnesses.
- `tests/radio-receiver-record-app.spec.ts`: the old "Yes disabled" check now uses the test's own browser probe (`saveCapable`: secure context, a callable `showSaveFilePicker`, `createWritable`), independent of the product's `data-support`. The product's `data-support` and Yes's enabled state must agree with the probe; either branch is valid. Cancel is still focused and the web-default text is kept.
- `tests/radio-receiver-raw-export-app.spec.ts`: only the old "Yes disabled, not ported" check after a Download changes, to the same probe; the Download still leaves the data unsaved, and the Load Yes stays disabled ("not ported").
