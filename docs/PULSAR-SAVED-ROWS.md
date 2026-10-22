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

## Row profile (Record writer `0x570b3c`)

```
"object",freq,gain,ref|"",vert|"",horz|"",start,"comment",points,intervalMs,aperture[,"file"]
```

- The `,"file"` field appears only when header byte `+0x96` is set (`0x570e7e`). Rows therefore have 11 or 12 columns.
- The admitted classes are listed in `SAVED-ROW-01`. Numbers are checked lexically (dot-decimal) and kept verbatim. They are never converted to Number or reformatted.
- A `"` inside a field, or text after a closing quote, makes the field boundaries ambiguous. Such rows are refused.
- Commas inside quoted fields are admitted.

## Refused input

All of the following are refused with a visible reason, line number and byte offset. Nothing is repaired or skipped:

- a BOM, NUL, a byte ≥ 0x80 or another control character
- a lone CR, mixed line endings or a missing final line ending
- a header line out of place, or a `"` inside the table or name text
- a row outside the profile
- input beyond the WEB limits

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
- Tab wraps inside the dialogs. The rows are a radio group, so browser arrow keys move the selection.
- Each viewer instance has its own Find memory. Natively, the dialog is one application-wide instance.
- Not modelled: the window close button, `OnActivate` re-entry, VCL/Win32 key routing, code pages and GDI rendering.

## User flow and state ownership

1. **Choose a file.** The file is read asynchronously and appears as a candidate (name, bytes, SHA-256, line endings, row counts).
2. **Use or Discard.** The file in use changes only on Use this file. A rejection, read error, Cancel reading, a discarded candidate, or a cancelled or superseded late read leaves the file in use, its selection, the Find memory and the download bytes unchanged. The latest read owns the result.
3. **Read-only display.** Header lines are shown verbatim and not interpreted. Rows are shown as raw field text in a scrollable table, followed by the exact text of the selected row. There are no edit, delete, record or save actions.
4. **Download.** The download is the exact supplied bytes (`savedRowsBytes`), not regenerated CSV.
5. **Lifetime.** Nothing is stored. The workspace exists only in the tab.

## Host API

```ts
mountPulsarSavedRows(element, { active?, onModalChange?, translate?, idPrefix? })
```

- **`active={false}`** makes the viewer inert. It also cancels a running read and closes an open dialog. The Find session and its draft are kept, and the dialog reopens when the viewer becomes active again.
- **Host modals stay on top.** A dialog opens only when no other modal dialog is open.
- **`onModalChange(open)`** reports when the viewer's modal session starts and ends.
- **Integration is not done here.** Mounting the viewer in `App` and adding the catalog to `en.json` are left to the coordinator.

## Expected integration dependency

Adding `PulsarSavedRows.tsx` changes the shared UI audit:

- `src/i18n/coverage.test.ts` expects 49 audited files; there are now 50.
- `src/core/pulsarUiAudit.test.ts` expects `PulsarAnalysis.tsx` to be the only Pulsar TSX.

Both pins fail until the coordinator updates them during integration. They were neither edited nor skipped. An owned evidence-only check in the task directory confirms two things: the new file adds no direct render site, and every other site still matches `scientific-literals.json`.

## Tests and harness

- **Unit tests:** `src/core/pulsarSavedRows.test.ts`, which the project Vitest include picks up.
- **Browser tests:** the owned configs under `<task>/claude-pulsar-saved-rows/harness/` serve `/__saved-rows-harness/` on `127.0.0.1:5306` (strict port). The `?plr=1` variant also mounts the existing analysis workbench, to check that its data stays unchanged. Tests run at desktop 1440 × 1050 and touch 375 × 812.

## Web allocation bound

The byte scanner retains at most 2,009 physical lines: five fixed header lines, up to four identity lines and up to 2,000 measurement rows. It refuses an additional line before allocating its retained line and spans. This web limit can be reported before a later framing error and does not change the admitted layout, original bytes or native behavior claims. A 100,000-byte newline-only control previously allocated about 15 MB of additional Node/V8 heap before rejecting its first header; that is an allocation observation, not a browser out-of-memory result or a native-runtime comparison.
