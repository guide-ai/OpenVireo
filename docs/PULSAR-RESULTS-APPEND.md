# Append of recorded pulsar measurements to a saved results file (R-RX12)

The Pulsar Analysis **Add recorded measurements to a saved results file (.csv)…** button builds a new file, `pulsar-results-appended.csv`. It contains the exact bytes of a results file the learner chooses, followed by the confirmed measurement rows. The chosen file is **not** changed: a browser page cannot append to it, so the result is a new download. This is a bounded web interoperability feature in the layout of the recovered measurement-list writer's append branch. It is **not** the original Save.

The new rows are the current web analysis measurement rows, including measurements of model-generated receiver recordings (docs/RADIO-RECEIVER-RECORD.md). The file does not certify them as original CLEA observations. No original program was executed or emulated. The tests check this implementation's contract, not native equivalence.

Binary `CLEA_VEO.exe` SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Tags: [S] static evidence, [W] web policy, and analyst inference, which is labelled where it is used. Evidence hashes and addresses are in [PULSAR-RESULTS-APPEND-PROVENANCE.json](PULSAR-RESULTS-APPEND-PROVENANCE.json).

## Evidence and methods

Two separate methods supplied the static evidence:

- **Preserved REA research of R-RX10** (eligible files `result-writer-code-only.asm`, `fresh-open-mode-dispatch.asm`, `fresh-write-newline.asm`). REA was not invoked again for this increment.
- **A bounded static backend capture** of `0x403874..0x403a20` with objdump (receipt `APPEND-CAPTURE-RECEIPT.json`, output SHA-256 `3cc627b9…6701`). The installed REA wrapper cannot capture an address range, so this capture was authorized separately. It is a static disassembly of the same input, not an REA run, not execution and not emulation. The imported API names come from a bounded PE import-identity parse (`APPEND-IMPORT-IDENTITIES.json`).

| ID | Native fact [S] | Here |
| --- | --- | --- |
| NAP-01 | The empty-list refusal `0x56fee4..0x56ff0a` runs before the append branch `0x56ff2d`. | Ported: an empty list is refused first. |
| NAP-02 | With the append flag, `0x4037bc` (mode `0xd7b3`) and IOResult `0x403324`; success jumps to the row loop `0x5702ab` and skips the header. | Ported as layout: no header is written; the target is the prefix. |
| NAP-03 | A failed open falls back to Rewrite `0x4037b0` and a fresh header (`0x56ff50..`). | **Not ported**: the web refuses instead. |
| NAP-04 | Backend `0xd7b3`: CreateFileA (read/write access, share mode 1, disposition 3 = open existing), GetFileSize, seek to max(size − 128, 0), read 128 bytes, scan for byte `0x0e` (`0x403970`). When it is found, a backward seek and SetEndOfFile truncate the file; otherwise the pointer stays at the end. | **Not ported**. No Ctrl-Z claim is made: the listed byte is `0x0e`. |
| NAP-05 | Each retained row string by ordinal, exactly, then WriteLn (`0x5702ab..0x5702e8`). | Ported. |
| NAP-06 | Close `0x403bc8` and the post-write reset `0x56fe6c`. | **Not ported**. |
| NAP-07 | WriteLn `0x40460c` picks CR LF or LF from a runtime flag whose value is unknown. | Replaced by policy WEB-NAP-03. |

**Analyst inference (not an observation).** An admitted target holds only bytes `0x20..0x7E` plus CR/LF, so it contains no `0x0e` and the truncation branch cannot fire. On that domain, native append is consistent with "existing bytes, then rows".

## Web policy

- **WEB-NAP-01** Only a target that the strict `admitSavedRows` profile (docs/PULSAR-SAVED-ROWS.md) admits is accepted. It is never repaired, rewritten or overwritten. Static evidence covers only the writer listing (NAP-01..06) and the `0xd7b3` backend `0x403874..0x403a20`. In those listings, the only step that depends on an existing file's contents is the scan of the last 128 bytes (NAP-04). When it finds a byte `0x0e`, the file is truncated there, not appended to as it is. The excluded raw Save caller may check more, and native behaviour on files outside the strict profile is unknown. Here such files are refused. A source object that the reader did not create (a spread, clone or fabricated copy) is refused as unowned.
- **WEB-NAP-02** The output is the target's exact byte prefix followed by the exact stored confirmed rows. The metadata and old rows are lexically admitted by the strict reader (lines and field boundaries), never interpreted, rebuilt, reformatted or deduplicated. An empty `"",""` date/time pair in the target is therefore valid, and the fresh export's header rules are not used.
- **WEB-NAP-03** New rows use the target's own line ending. Natively the unknown flag decides, which could mix endings. Combined rows are at most 2000 and combined bytes at most 1 MiB, both checked before the output is allocated. The new rows are lexically admitted by the strict reader (lines and field boundaries), never interpreted, rebuilt, reformatted or deduplicated; no number is converted.
- **WEB-NAP-04** The result is a NEW download with the fixed name `pulsar-results-appended.csv` (`text/csv`), never derived from the target's name. The target's browser basename is shown only as text, and no path is used. A download request does not mean a file was saved. The list stays marked as not saved (Clear still asks), and Save stays disabled. No pending reading, comment, cursor, list entry, Review copy, dataset, viewer state or storage changes. "Undo" in AP-32 means state preservation: this route has no Undo control.
- **WEB-NAP-05** The dialog session is described under Dialog below.
- **WEB-NAP-06** The shared guards are described under Dialog below.

## Modules

- `src/core/pulsarResultsAppend.ts`: the pure contract (no React, DOM, clock, locale or storage).
  - `buildResultsAppend` is the lexical layer and `appendPulsarResults` adds the stored rows and field agreement.
  - The dialog session: `resultsAppendOpen`, `resultsAppendBeginRead`, `resultsAppendCancelRead`, `resultsAppendReadFinished`, `resultsAppendRequest`, `resultsAppendDownloadFailed`.
  - It reuses the reader of `src/core/pulsarSavedRows.ts` and the field agreement `resultsExportAgreement` of `src/core/pulsarResultsExport.ts`. Neither file is changed.
- `src/components/PulsarAnalysis.tsx`, `PulsarAnalysis.css`, `PulsarMessages.ts`: the button, the modal dialog, its texts and the extended shared guards.

## Build steps

Every step fails closed and produces no bytes:

1. An empty list is refused (`no-rows`).
2. The target's owned bytes are taken from the reader's private store. An unknown source is refused (`target-unowned`).
3. Those bytes are admitted again. The line ending, length, lines and rows must be the same as the source's (`profile`).
4. Each new row must be a string, not empty, printable ASCII and at most 1024 characters. A failure carries the row's position among the new rows.
5. Old plus new rows must be at most 2000 (`too-many-rows`, with old and added counts). The total size must be at most 1 MiB (`too-large`).
6. One new `Uint8Array` is allocated: the prefix, then each row followed by the target's line ending.
7. The result is read back strictly:
   - every prefix byte must be equal;
   - the old lines and rows must be text-equal;
   - the new rows must equal the input;
   - every `"` in a new row must be a field delimiter;
   - each new row must agree with its structured fields (the R-RX10 rule, with ordinals counted among the new rows).

## Dialog

- **Opener and modality.** The button follows Export and has the same enabled state and opening conditions. The dialog is a native `<dialog>` opened with `showModal()`, with focus on the file chooser. While it is open:
  - the panel is a modal session: the main region is inert and analysis actions are refused (`blocked-modal`);
  - the original-bytes download does nothing, and a PLR delivered to the Load chooser is refused unread;
  - newer data waits, and the shared dataset sees the panel as busy, so receiver Record is refused even while the route is hidden.
- **Export and Append.** Each excludes the other, and they share one output claim.
- **Choosing a target.**
  - A cancelled picker or an empty selection changes nothing.
  - Any other selection clears the current target at once, before the 1 MiB pre-read check or any other refusal, and supersedes a running read.
  - The read sequence is: the contents, the strict reader, then the SHA-256 of the owned bytes. Each read has a unique token, so a superseded, cancelled, closed or other-session result is ignored.
  - An accepted selection while Download has focus moves focus to the chooser before Download is disabled (at the start of the selection, so also for a synchronous oversize refusal). Otherwise neither a selection nor its completion moves focus: the chooser stays enabled during a read. The one exception: if focus was on Cancel reading, which the result removes, it moves to the chooser.
  - An explicit Cancel reading writes "Reading cancelled. No results file is chosen." to the dialog's own `role="status"` region (the main status is inert behind the modal dialog). A new selection or closing the dialog removes it; a host cancellation (hidden route) leaves none. Only the DOM exposure is tested; real screen-reader output is not claimed.
  - The dialog shows the target's name, bytes, SHA-256, line ending and row count, and the old, added and total counts. Duplicates are kept.
  - Each reader error code has its own message.
- **Download.**
  - It is disabled without a target or during a read.
  - When the request runs, the core checks, in order: `not-ready` (another dialog, a PLR read or a capture lease), `stale` (list object or dataset generation changed), `reading`, `no-target`.
  - The output claim is taken before `URL.createObjectURL`, and the link is created inside the dialog.
  - A requested download ends the session at once, so repeated clicks and held Enter add nothing. Focus returns to the button.
  - The status names the counts and says the chosen file was not changed. It never says "saved".
  - If the browser throws, the claim is released and the target is kept for one retry.
- **Foreign modal.** While another native modal is open, Download, target changes, Cancel reading and Cancel do nothing.
- **Hidden route.** The native dialog closes and the session and its owned target stay (they are an owned copy, not a live `File`). A pending read is cancelled and its late result ignored. Returning reopens the dialog with focus on the chooser.
- **Persistence.** None.

## Acceptance mapping

The full mapping of AP-01..AP-33 to tests is the `acceptance` object of the provenance file. In short:

| Area | Unit tests (`src/core/pulsarResultsAppend.test.ts`) | App tests (`tests/pulsar-results-append-app.spec.ts`) |
| --- | --- | --- |
| Golden prefixes (AP-01, AP-02) | LF/CRLF target, output and prefix SHA-256 | prefix SHA-256 and suffix in both endings |
| Rows (AP-03..08, AP-33) | order, duplicates, 11/12 columns, edge spellings, ownership, empty list, row refusals | control with duplicates, counts |
| Targets and bounds (AP-09..16) | every refused class, unowned sources, 2000-row and 1 MiB boundaries, no header builder | rejection reasons, Download stays disabled, no URL |
| Fresh export (AP-17) | R-RX10 golden SHA-256 | existing export spec unchanged |
| Isolation (AP-18, AP-31, AP-32) | — | PLR, plot, list, pending reading, Review, viewer, Find, storage; reopen in viewer |
| Transactions (AP-19..28) | session tokens, clear-on-select, reading, stale, failure | cancel picker, held reads, hidden route, lease, foreign modal, reentry, failure, repeats |
| Keyboard and layout (AP-29, AP-30) | — | Tab wrap, Escape, focus, 1440/390/375/320 screenshots |

These tests check this implementation's web contract. The reader agreeing with the builder is self-consistency, not a native oracle. The golden files are synthetic and independent of the product code. They are not CLEA output.

## Limits

- Not ported: the rewrite fallback, the `0x0e` truncation, in-place modification, the close, the post-write reset, the saved byte `0x5db`, and any confirmation that a file reached the filesystem.
- The line-ending match is a web policy, and the native flag remains unknown. Native behaviour outside the strict profile and any check of the excluded caller are unknown and not modelled.
- Not proved: real screen-reader output and a real operating-system drag and drop (the App tests use a synthetic File change).
- The row text is web-generated: no x87 or code-page parity is claimed.
- The raw Save wrapper stays excluded and gated. This does not complete Radio, native Save or audio PRE-01.
