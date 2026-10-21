# DAT and Program List review corrections

The authorized periodic native Claude `/review` inspected the completed `cdfc73b..90c3928` delta using Opus5.5/high configured, with direct read access to the actual safe repository source. Its30Read/Grep/Glob calls left1909tracked files unchanged. It ran no tests, Git, browser, original executable or publication. The raw report, actual coverage and independent dispositions remain outside source in `Documents/Codex/2026-10-18/task-3/claude-delta-90c3928/`. This is a browser correctness review, not original scientific acceptance.

## Corrected reproduced behavior

- Imported non-printable bytes display as escapes, for example a single byte0x01 as `\x01`. Previously editing a different character in the same field could write those four literal characters without a specific warning. Each affected object/remarks field is now locked independently until the user explicitly enables full replacement. The warning explains the distinction. Opt-out resets that field's draft; Cancel/no-op/unrelated field edits preserve its original bytes. Detection examines owned raw bytes rather than matching literal backslash text. A field containing actual printable `\x01` stays editable. No native parser, type converter or byte layout changes.
- Opening observation-notebook results now cancels an outstanding DAT read. A late completion cannot stack a replacement modal over the notebook or replace its underlying file. The working copy, prior Undo and notebook data are retained.
- Cancelling original-byte restoration returns focus to its Restore button. Imported-file replacement returns to the file opener. Invalid reads and accepted empty files return focus to the enabled opener even when the previous record selector was removed.
- Program List Confirm/Next put focus on enabled cancellation while a verified source load is pending. Failure returns to the selection/origin and cancellation retains the list cursor and manual work. The original reproduction showed transient BODY focus; after failure Confirm already regained focus in this browser. We do not claim permanent focus loss was demonstrated or attribute it to a timing timeout.
- Stored type code0 now has the explicit empty-text label in the editor. Conversion semantics and codes are unchanged.

These are declared web safety/accessibility policies. No native GDI/callback/FPU, pixel or original-dialog equivalence is asserted. Private ownership, stale base/context/read tickets, atomic hashing, original/edited downloads, one exact Undo, deletion/reimport and the manual scientific workflows remain intact. No JSON/CSV/notebook/storage schema changes.

## Qualified recommendations

The reported permanent export block after atlas failure did not reproduce: the atlas load is atomic and leaves the previous ready context; the edited download re-enables. The failed assertion expecting permanent disabling is retained as counterevidence. Transient busy disabling is real; no persistent data loss was shown.

Unmatched type text mapping to0 is the recovered converter policy, with explicit replacement and a code preview; it is not a grade. An explicitly edited copy can intentionally retain a prior Undo even if its bytes now match the original. Collapsing it would discard recovery. Suggested hash/storage cleanup was not a demonstrated incorrect digest or leak. These contracts were preserved.

## Try locally after validation

Open `http://127.0.0.1:5173/#classification` and import a DAT with non-printable object/remarks bytes. **Edit selected DAT text fields** shows a locked affected field and explains its escapes. Leave it locked to preserve its bytes, or enable **Explicitly replace escaped DAT object bytes** / **Explicitly replace escaped DAT remarks bytes**, replace the text and confirm. Reopening or opting out does not retain consent. Download original and edited copies separately; Undo restores the prior bytes. The repository's standard synthetic fixture contains printable fields and therefore does not need these extra controls.

With any edited DAT, choose **Restore original DAT bytes**, then Escape or **Keep current DAT file**: focus returns to Restore. Invalid/empty DAT reads retain a useful file-opener focus. Use keyboard Enter on Program List Confirm/Next with a slow/failed resource to verify enabled Cancel focus and preserved source/list position. Opening the notebook during a pending DAT read cancels that read.

## Validation and limits

Six new browser regressions and three pure-core contracts cover opaque versus literal escapes, per-field consent/opt-out/cancel, long escape displays, source/tail preservation, dialog isolation, empty/invalid read focus, Restore origin, Confirm/Next error/cancel focus, type0 and mobile literal text. Scoped48E2Epassed in2.0minutes; unit1407tests/147files, typecheck/build,1279resource hashes and desktop/mobile inspection passed. Complete370flow regression passed in6.7minutes with four workers,zero retries and no skips;the local hash-verified HTL input was not added or publicly uploaded.

Independent Python controls were repeated:5328field-write vectors plus1584record-deletion vectors,6912passed. The legacy checker placed5328vectors in one test and exceeded its default5second test limit under simultaneous validation; that failed log is retained. Vectors were split into individual tests with all assertions and timeout unchanged, then6912passed in10.73seconds. These controls establish the declared byte contract, not an original runtime oracle.

Native new-row metadata/time authority, full numerical/velocity validation, native reader/writer interoperability oracle, append/merge routing and original formatted CSV/print paths remain pending. All64primary acceptance statuses remain unchanged; OpenVireo is not complete. No GitHub access, push or deployment in this increment.
