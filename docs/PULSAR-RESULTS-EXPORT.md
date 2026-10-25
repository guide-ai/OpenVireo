# Export of recorded pulsar measurements (R-RX10)

The Pulsar Analysis **Export recorded measurements (.csv)…** button writes the confirmed measurement list into a new file, `pulsar-results.csv`, with a header the learner types. It is a bounded web interoperability download in the layout of the recovered measurement-list writer. It is **not** the original Save.

The rows are the current web analysis measurement rows, including measurements made on model-generated receiver recordings (docs/RADIO-RECEIVER-RECORD.md). The file does not certify them as original CLEA observations, and nothing in it was produced by CLEA. No original program was executed or emulated; the contracts below come from already-recovered static listings and decoded literals, and the tests check this implementation's contract, not native equivalence.

Binary `CLEA_VEO.exe` SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Tags: [S] static listing, [W] web policy. Evidence paths, hashes and addresses are in [PULSAR-RESULTS-EXPORT-PROVENANCE.json](PULSAR-RESULTS-EXPORT-PROVENANCE.json).

## Modules

- `src/core/pulsarResultsExport.ts`: pure contract (no React, DOM, clock, locale or storage). `buildResultsExport` (lexical layer), `exportPulsarResults` (stored rows plus field agreement), the dialog session (`resultsExportOpen`, `resultsExportEdit`, `resultsExportRequest`, `resultsExportDownloadFailed`). It reuses the strict reader of `src/core/pulsarSavedRows.ts`, which is unchanged.
- `src/components/PulsarAnalysis.tsx`, `PulsarAnalysis.css`, `PulsarMessages.ts`: the button, the modal dialog and its texts.

## File layout

Recovered statically [S] from the fresh-file branch of `0x56feac`:

| Line | Content | Evidence |
| --- | --- | --- |
| 1 | `"` date `","` time `"` | NWE-02 order `0x57000b..0x570032` (the native values come from the host clock; here they are typed) |
| 2 | `"Table Number: ` table `"` | NWE-05, ShortString `0x5703e4` (15 bytes), caps 19 and 20, so at most 4 table bytes |
| 3 | blank | `0x5700c2` |
| 4 .. 3+k | `"` name `"` for each non-empty name, in slot order | NWE-06, slots +0/+0x29/+0x52/+0x7b, at most 40 bytes |
| 4+k | blank | `0x57026f` |
| 5+k | the 151-byte column header `0x570400` | NWE-06 |
| 6+k .. | the confirmed rows, by ordinal, verbatim | NWE-07 `0x5702ab..0x5702e8` |

The first row is physical line 6 + k, where k (0..4) is the number of non-empty name lines; it is row ordinal 0 (the first confirmed measurement). A refusal names the measurement by its visible number (`#` in Review), not by a line. An empty list is refused before anything is built (NWE-01). Text is copied at exact length with no escaping (NWE-08).

## Web policy

- **WEB-NWE-01** A fresh-format download of confirmed web rows under a strict lexical profile. Not native Save, not the raw PLR recording writer, no append, no historical equivalence.
- **WEB-NWE-02** Every header text is typed: date text and time text (required), table (optional) and four name lines (optional). All start empty. Nothing is taken from `Date`, `Intl`, the browser or host locale, a login, the catalog or a classroom file, and no default is guessed.
- **WEB-NWE-03** Printable ASCII `0x20..0x7E` only; a `"` in a header text is refused; table at most 4, names at most 40, date and time at most 64 characters. Nothing is trimmed, truncated, escaped or repaired: a name of only spaces is written as it is, and anything that does not fit is refused with its reason and position. Every line, the last included, ends with CR LF; this is a declared web choice, because the native WriteLn picks CR LF or LF from a runtime flag (`0x40460c`, TextRec+6 bit 0) whose value is unknown. The download name is always `pulsar-results.csv` (media type `text/csv`).
- **WEB-NWE-04** A download request is not proof that a file was saved. The list stays marked as not saved (Clear still asks about unsaved measurements); Save stays disabled; no pending reading, comment, cursor, list entry, Review copy, dataset, Undo or storage changes. The native close and post-write reset `0x56fe6c` are not ported. Native Save, append, the analysis Load prompt's Yes and the receiver raw capture Save Yes stay gated.
- **WEB-NWE-05** Only the confirmed list is exported, in list order with duplicates; unrecorded readings and Review's staged working copy are not.

### Row profile

Each row is the entry's stored row text, verbatim, built by the existing web Record writer. No number is parsed, formatted or recomputed. Before any byte is produced, in order:

1. each header field: required (date, time), printable ASCII, no `"`, length;
2. the list: at least 1 and at most 2000 rows;
3. each row: not empty, printable ASCII (this refuses a non-ASCII file name), at most 1024 characters;
4. the total size: at most 1 MiB;
5. assembly into a new `Uint8Array`;
6. the strict saved-rows reader (`admitSavedRows`) must admit the bytes; a row error is reported with its ordinal;
7. the admitted rows must equal the input texts and the header must read back unchanged; every `"` in a row must be a field delimiter; and each row must agree with the entry's structured fields: 11 columns without a file name, 12 with one; object, comment and file name as the quoted texts; a blank reference, vertical or horizontal reading as `""`, otherwise its exact text; the other values as their exact texts.

Every failure refuses the whole export and produces no bytes. Under every field cap of the reader the largest admissible row is 753 bytes (42 + 9 × 40 + 83 + 257 + 11 commas), so a 1024-byte row is always refused by the profile; the 1024 row bound and 1 MiB total remain separate web bounds.

### Dialog

- **Opener.** Export is enabled only with at least one confirmed measurement, while the panel is shown and active, with no other dialog, no pending file read, no drag, no receiver capture lease and no newer data waiting. Each condition is checked again from the latest state when the click runs.
- **Modal.** The dialog is a native `<dialog>` opened with `showModal()`, like Record, Clear and Review. While it is open the panel is a modal session: the main region is inert, every analysis action is refused unchanged (`blocked-modal`), the original-bytes download does nothing, a file delivered to the chooser is refused before it is read, newer data waits, and the panel reports itself busy to the shared dataset, so the receiver's Record is refused (`analysis-busy`) even while this route is hidden.
- **Fields.** Seven labelled text inputs with no autofill or spelling help. Invalid text within 256 characters stays visible and editable, with `aria-invalid` and a reason; an empty required field is marked after the first Download. An edit longer than 256 characters is **not taken**: the field keeps its previous text, shows a refusal, and Download stays refused until that same field is edited again within bounds (editing another field does not clear it). There is no HTML `maxLength`.
- **Download.** Enter in any field or the Download button. The snapshot taken when the dialog opened must still be the live confirmed list and dataset generation; otherwise the request is refused as stale. The artifact link is created inside the open dialog. A requested download ends the session at once, so a second request in the same task (or the repeats of a held Enter) produces no second artifact. The request is claimed before any browser call (Blob URL, link click): a Download, edit or Cancel reentered synchronously from inside those calls does nothing and the in-flight snapshot is kept. Focus returns to Export and the status says the download was requested, not saved. If the browser throws, the claim is released, the temporary link and URL are removed, and the dialog stays with its draft and an alert; a new Download retries. No timer, queue or storage serializes requests.
- **Foreign modal.** While another native modal dialog (for example a host one) is open, Download, edits and Cancel on this dialog do nothing when forced from script: the session, its draft and the focus owner stay. This is checked when each action runs. When that dialog closes, the export dialog works again.
- **Cancel.** Cancel, Escape (one layer; a held Escape does not repeat) or a close request closes it without a download; focus returns to Export.
- **Hidden route.** Leaving the route closes the native dialog and keeps the session and its draft; a scripted Download while hidden does nothing. Returning reopens it with focus on the date field.
- **Persistence.** None. The draft lives only in the open dialog; it is not in Save investigation or storage, and a reload discards it.

## Tests

- `src/core/pulsarResultsExport.test.ts`: the golden file (510 bytes, 10 lines, SHA-256 `a51b30e9544a7fb274149ee97b5e0586d180c4aa16a0b69a959378380c28cf8f`, text embedded by hand from `INDEPENDENT-EXPECTED-EXPORT.json`, SHA-256 `2c69cffa83ba8673a6b8fbe13008a8f1aa933b085ddc1623d019568a38679c5e`); 11/12 columns, duplicates and order; name slots; table, name and date/time bounds; quote, control and non-ASCII refusals with positions; empty list; ambiguous quotes, injections, decimal commas, bad exponents, column counts, blank and non-ASCII rows with ordinals for 0..4 names; field disagreement; the 753-byte maximum row, a profile-invalid 1024-byte row, a 1025-byte row, 2000/2001 rows and more than 1 MiB; frozen inputs and fresh bytes; rows recorded by the web core from a memory capture (11 columns) and a file (12 columns, with non-ASCII and quoted file names refused); a 256-character browser file name, which the existing PLR admission already stores as 255 characters, exported unchanged as that confirmed row; a directly supplied stored row whose file field exceeds 255 characters, refused without truncation or repair; the dialog session, including the oversize latch regression; the provenance file.
- `tests/pulsar-results-export-app.spec.ts` (actual App): an imported 12-column flow with exact bytes, CR LF, pending readings, the saved state, the original bytes and the saved-row viewer reading the file; Escape and Cancel, invalid drafts, the oversize latch, repeated requests, held Enter and a synthetic browser error; scripted stale Download, edit and Cancel while a foreign native modal owns focus (no URL request, draft and focus kept), with a positive control after it closes; a synthetic Download and Cancel reentered synchronously inside `URL.createObjectURL` (one URL request; the native download count is not tested) and a synthetic error at that boundary releasing the claim for one retry; blocking behind Record, Review, Clear and a read, script clicks and a delivered file while open, hidden route, 1440/390/375/320 widths; a receiver memory capture → Identify → Properties → No → manual Record → 11-column export, the receiver Record refused while a hidden export is open, and the gated Yes buttons.

These tests check this implementation's web contract. The reader agreeing with the builder is self-consistency, not a native oracle.

## Limits

- Not ported: the host clock and locale formats (NWE-02, NWE-03), the stored identity values (NWE-04), append mode and its open-error dialog, the close and post-write reset `0x56fe6c` (NWE-10), the saved byte `0x5db`, and any confirmation that a file reached the filesystem.
- CR LF is a policy; the native newline flag remains unknown.
- The row text is web-generated: no x87 or code-page parity is claimed, and the file name is the browser file name, not the native stored file-name text.
- The raw Save wrapper `0x56b36c` stays excluded and gated. This does not complete Radio, N07, E06, native Save or audio PRE-01.
