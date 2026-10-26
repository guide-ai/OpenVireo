# Supplied saved PLR measurement rows and recovered Find (web interoperability viewer)

This slice adds a separate, read-only viewer. It opens a file in the layout written by the original pulsar-analysis **Save** command and runs the recovered **Review Find** over that file's exact rows.

- **It is a web addition.** No original reload command for this layout has been established by the recovered evidence.
- **It does not authenticate files.** A file that passes the checks has the expected layout. That does not show that CLEA wrote it.
- **It is separate from the analysis panel.** The current PLR recording, manual cursors, pending readings and recorded measurement list (`src/core/pulsarAnalysis.ts`) are not read or changed. The disabled Find over web-generated Record candidates stays disabled. No acceptance status changes, and D08, N07 and E06 are not claimed complete.

Contracts, addresses and evidence hashes are in [PULSAR-SAVED-ROWS-PROVENANCE.json](PULSAR-SAVED-ROWS-PROVENANCE.json) (`SAVED-FRAMING-01`, `SAVED-ROW-01`, `SAVED-FIND-01`). Artifact: VIREO 1.504 `CLEA_VEO.exe`, SHA-256 `781bc970…c54c`. No original program was executed or emulated.

## Files

| File | Role |
|---|---|
| `src/core/pulsarSavedRows.ts` | Pure admission, Find and workspace transitions |
| `src/core/pulsarSavedRows.test.ts` | Unit contracts with hand-written control files |
| `src/components/PulsarSavedRows.tsx` / `.css` | Self-contained viewer and `mountPulsarSavedRows` |
| `src/components/PulsarSavedRowsMessages.ts` | Scoped English catalog (`savedRows.*`) |
| `tests/pulsar-saved-rows.spec.ts` | Browser flows. They run against an owned harness and skip without `OPENVIREO_PULSAR_SAVED_ROWS_HARNESS_URL`. |

## Recovered file layout (fresh-file branch of the writer `0x56feac`)

Each line is written by `WriteLn`. Payloads are copied by exact length, with no escaping. The terminator is CR LF when TextRec+6 bit 0 is set, otherwise LF. That bit comes from global byte `0x5ae034`, which is not bound here, so either form is admitted when the whole file uses one.

1. `"`*A*`","`*B*`"`: two opaque values, built from `0x40d47c` and the formatter `0x40e07c`.
2. `"Table Number: `*T*`"`: *T* is 0 to 4 bytes. The ShortString append caps the line at 19 bytes, then 20 with the closing quote.
3. A blank line.
4. 0 to 4 lines of the form `"`*name*`"`, with 1 to 40 bytes each. A slot is written only when it is non-empty.
5. A blank line.
6. The exact 151-byte header literal `0x570400`.
7. Every retained list string, in ordinal order. Natively, an empty list is refused before any file is written.

An append save writes rows only, after the existing content. Rows from several saves therefore follow one header. They are admitted as one list in file order.

The web append download (R-RX12, [PULSAR-RESULTS-APPEND.md](PULSAR-RESULTS-APPEND.md)) uses this reader unchanged in two places. It admits a chosen target file, which it never modifies. It then reads back the new file, made of the target's exact bytes followed by the confirmed rows. Its target chooser, read tokens and target are separate from this viewer's file, selection, Find memory and reads.

## Row profile (Record writer `0x570b3c`)

```
"object",freq,gain,ref|"",vert|"",horz|"",start,"comment",points,intervalMs,aperture[,"file"]
```

- The `,"file"` field appears only when header byte `+0x96` is set (`0x570e7e`). Rows therefore have 11 or 12 columns.
- The admitted classes are listed in `SAVED-ROW-01`. Numbers are checked lexically (dot-decimal) and kept verbatim. They are never converted to Number or reformatted.
- A `"` inside a field, or text after a closing quote, makes the field boundaries ambiguous. Such rows are refused.
- Commas inside quoted fields are admitted.

## Refused input

All of the following are refused with a visible reason. Nothing is repaired or skipped. A line number and a byte offset are shown only when the failed check records them; none is invented:

- a BOM (byte offset 0, no line), NUL, a byte ≥ 0x80 or another control character (line and byte offset)
- a lone CR, mixed line endings or a missing final line ending (line and byte offset)
- a header line out of place, or a `"` inside the table or name text (line)
- a row outside the profile (line)
- input beyond the WEB limits: too many lines (line); too many rows, or a file over the byte limit (no location)
- an empty file or a read error (no location)

**WEB limits** (these are not native limits): 1 MiB, 2000 rows, 1024 bytes per row, 40 bytes per numeric token and 64 bytes per date/time value.

## Find over the owned rows (`PLR-REVIEW-FIND-STATIC-01`)

- **What is searched.** Find searches the complete row string, including the native file-name and number texts, so a match may span fields.
- **Start row.** From Top starts at row 0. From Cursor starts at selection + 1. There is no wrap. When the row count is ≤ the start, no row is read and the result is a miss.
- **Case.** The query is lowercased in place (A–Z only) and stays lowercase in the dialog's memory. Each row is compared through a separate lowercase copy, so the rows are unchanged. The Case Dependent box is stored but not used.
- **Empty query.** From Top or From Cursor with empty text stores the empty text and the case box, then ends with the selection unchanged.
- **Cancel.** Cancel stores neither the edited text nor the case box.
- **Miss.** The caption is `String Not Found`. The body is `"`*query*`" Not Found.`, shown as text, and the selection is unchanged.

### Browser adaptations (WEB)

- Only printable ASCII search text is accepted, up to 80 characters. Other text is refused in the dialog and nothing is stored.
- Confirming a file selects row 1, as Review's `FormActivate` does.
- Enter in the search text is From Top, following the DFM `Default`.
- Escape or a page close request is Cancel on the Find dialog and OK on the notice.
- Held (repeat) Enter and Escape keys are ignored.
- Tab wraps inside the dialogs. After a click on dialog text that is not a control, Tab and Shift+Tab move to the next or previous control in document order from that text (the policy of the PLR analysis dialogs). This is browser order, not a claimed Windows order.
- When Find reveals a row, the table scrolls within its own region so that the row stops below the sticky column header.
- The rows are a radio group, so browser arrow keys move the selection.
- Each viewer instance has its own Find memory. Natively, the dialog is one application-wide instance.
- Not modelled: the window close button, `OnActivate` re-entry, VCL/Win32 key routing, code pages and GDI rendering.

## User flow and state ownership

1. **Choose a file.** The file is read asynchronously and appears as a candidate (name, bytes, SHA-256, line endings, row counts).
2. **Use or Discard.** The file in use changes only on Use this file. A rejection, read error, Cancel reading, a discarded candidate, or a cancelled or superseded late read leaves the file in use, its selection, the Find memory and the download bytes unchanged. The latest read owns the result.
3. **Read-only display.** Header lines are shown verbatim and not interpreted. Rows are shown as raw field text in a scrollable table, followed by the exact text of the selected row. There are no edit, delete, record or save actions.
4. **Download.** The download is the exact supplied bytes (`savedRowsBytes`), not regenerated CSV.
5. **Lifetime.** Nothing is stored. The workspace exists only in the tab: Save investigation does not include it, an investigation restore does not change it, and reloading the page empties it.

## Host API

```ts
mountPulsarSavedRows(element, { active?, onModalChange?, translate?, idPrefix? })
```

- **`active={false}`** makes the viewer inert. It also cancels a running read and closes an open dialog. The status then says that reading the file was cancelled because the viewer was made inactive, and the read's late result is ignored. The file in use, the selection, the Find memory, the Find session and its draft are kept, and the dialog reopens when the viewer becomes active again.
- **Host modals stay on top.** A dialog opens only when no other modal dialog is open.
- **`onModalChange(open)`** reports when the viewer's modal session (open or waiting) starts and ends. It is called only when the value changes: `false` once at mount, then `true`/`false` per session. If the viewer unmounts during a session, it reports `false` as it unmounts. Deactivation keeps the session and reports nothing, and a new callback identity alone reports nothing.
- **App integration.** The App mounts the viewer lazily in a separate disclosure under `#pulsar-analysis`, below the PLR analysis panel ([RADIO-SAVED-ROWS-INTEGRATION.md](RADIO-SAVED-ROWS-INTEGRATION.md)). It passes `active={false}` while the route is hidden, a project operation runs or the disclosure is closed, and shows the logical Find session reported by `onModalChange` in the disclosure summary. It never passes `active={false}` to the PLR panel because a Find session waits. The viewer catalog stays scoped; the disclosure's own texts are `plr.savedRows.*` in `en.json`.
- **Cancel wording.** Starting a read replaces an unconfirmed candidate (`savedRowsBeginRead`), so a cancelled read does not say "Nothing changed": it says that the file in use, its selection and the Find text are unchanged and that a checked file waiting for Use when the read started is not restored.

## Shared UI audit pins

Adding `PulsarSavedRows.tsx` changes two shared UI audit pins.

**Historical author delivery (before commit `8498073`).** The author did not edit either pin. The full unit suite was 2,030 tests: 2,028 passed and these 2 failed:

- `src/i18n/coverage.test.ts` expected 49 audited files; there were 50.
- `src/core/pulsarUiAudit.test.ts` expected `PulsarAnalysis.tsx` to be the only Pulsar TSX.

An owned evidence-only check in the task directory found that the new file adds no direct render site, and that every other site still matches `scientific-literals.json`.

**Committed snapshot `8498073`.** The coordinator corrected both pins after an independent AST verification:

- `coverage.test.ts` expects 50 files.
- `pulsarUiAudit.test.ts` lists both Pulsar TSX files and adds a test of the saved-rows catalog's keys and placeholders.

The recorded full suite for that snapshot is 2,032 tests, all passing. The current pass/fail state is whatever the latest validation run records; this document does not replace it.

## Tests and harness

- **Unit tests:** `src/core/pulsarSavedRows.test.ts`, which the project Vitest include picks up.
- **Browser tests:** owned configs outside the worktree serve `/__saved-rows-harness/` on `127.0.0.1:5306` (strict port). The first set is under `<task>/claude-pulsar-saved-rows/harness/`. The set used for the corrections is under `<task>/claude-pulsar-saved-rows/confirmed-corrections/harness/`.
  - The `?plr=1` variant also mounts the existing analysis workbench, to check that its data stays unchanged.
  - The `?strict=1` variant renders the viewer inside React `StrictMode`.
  - The corrections harness also exposes `__mount()`, so a test can remount the viewer after `unmount()`.
  - Tests run at desktop 1440 × 1050 and touch 375 × 812. The row-reveal test also resizes to 768 × 1024 and 320 × 568.
  - The App integration pass used an owned harness under `<task>/claude-radio-saved-rows-app-integration/harness/` (loopback 127.0.0.1:5279, strict port) with the same host API, and added a distinct-sink test: a replaced `onModalChange` callback receives every later change, including a waiting session and the unmount report, and the replaced one receives nothing more.
- **Actual App flows:** `tests/radio-saved-rows-app.spec.ts` (no harness). The control files are shared through `tests/fixtures/pulsar-saved-rows-controls.ts`.
- **App style note:** the App's global `th` style (capitals, 8 px) is overridden for this table, so the recovered column names keep their case ("Freq (MHz)", not "FREQ (MHZ)").

## Web allocation bound

The byte scanner retains at most 2,009 physical lines: five fixed header lines, up to four identity lines and up to 2,000 measurement rows. It refuses an additional line before allocating its retained line and spans. This web limit can be reported before a later framing error and does not change the admitted layout, original bytes or native behavior claims. A 100,000-byte newline-only control previously allocated about 15 MB of additional Node/V8 heap before rejecting its first header; that is an allocation observation, not a browser out-of-memory result or a native-runtime comparison.
