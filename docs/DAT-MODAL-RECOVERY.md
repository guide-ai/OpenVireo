# DAT modal and recovery follow-up

The periodic read-only review of `90c3928..26c09f4` confirmed the previous six corrections and found no new byte-integrity or data-loss problem. Its five reproduced/qualified P3 issues are addressed together here. The sixth shared-escape-predicate suggestion is cleanup, not a present defect; the matching core predicates were retained. Raw report, source audit and independent receipts are outside source in `Documents/Codex/2026-10-18/task-3/claude-delta-26c09f4/`.

## Behavior

- A late DAT import is cancelled when another HTML dialog is already open. It cannot superimpose its replacement review over the Hubble guide or manual-width review, or replace the underlying inspected file while the other dialog is open. Existing file/Undo stay intact, a status explains the cancellation, and focus stays in the other dialog. The completion path and queued replacement-opening path both check. Opening/closing help before completion without an overlap is not claimed to reproduce native VCL ordering.
- A repeated Enter event cannot activate a Cancel control that just received automatic focus during a source load or hash. A fresh Enter press and Escape still cancel deliberately. Tests issue two keyDown events and verify the second is a repeat; no physical OS/hardware repeat claim is made.
- Undo that creates a new record selector focuses the restored row after rendering. Accepting a nonempty replacement or restoring original bytes likewise focuses the new selector; empty views retain file-opener focus.
- When the one-level Undo is exhausted, its disabled label is neutral: **No DAT Undo available**. It no longer names a text edit after a deletion-only operation.
- Restoring original bytes resets the ordinal to the first record and says selection was reset. Native records have no stable row ID, so retaining a shifted ordinal after deletion cannot preserve identity. No guessed matching by object label, coordinates or numeric bytes is added.

These are browser safety/accessibility policies, not native keyboard/modal/pixel/FPU parity. No domain function, numerical metadata, byte layout, type converter, acquisition/integrator, source+sky SUM, notebook persistence or historical JSON/CSV format changed. The core remains unchanged from26c09f4, whose6912independent byte controls passed. No scientific acceptance status is promoted.

## Verification

Five new end-to-end cases cover guide/width modal isolation, repeated Enter through Next/Confirm and hashing, deliberate fresh cancellation, no-op recovery, reset selection, empty→nonempty focus, neutral Undo, source/manual/JSON preservation and mobile literal labels. All56affected flows passed in53.8seconds with four workers. An initial55/56run exposed a harness using a practice already in the existing8-entry cache:there was no pending fetch to gate. An uncached admitted practice now supplies the genuine Confirm wait;no timeout/assertion was removed or increased. Initial logs/traces remain preserved.

Typecheck initially caught a nullable focus target introduced by the row-intent ref;the guard was corrected before browser validation. Full1407unit tests/147files,typecheck/build,1279resource hashes and complete375flow regression passed (6.8minutes,four workers,zero retries/omitted). Desktop/mobile screenshots and an independent no-working-copy late-read byte check accompany the receipt. No original execution/emulation or runtime writer oracle.

## Try locally after validation

At `http://127.0.0.1:5173/#classification`, import the explicitly synthetic `tests/fixtures/observation-results-synthetic.dat`. Delete its rows, Undo the last deletion and check that the restored selector has focus and the unavailable Undo label is neutral. Restore original bytes after deleting the first row:selection resets visibly to the first original row rather than silently using a shifted ordinal. Original and edited downloads remain separate and exact.

For normal keyboard use, Confirm/Next focuses enabled cancellation while loading;holding Enter must not unexpectedly cancel it. Release and press Enter again to cancel deliberately. Slow-read/hash controls used for deterministic error-path tests are authored test gates, not native behavior or new user-facing delay controls. A pending native import encountering the guide/width dialog is cancelled with an explanation;download confirmed DAT edits before reloading as before.

## Next native contract

A separate typed DAT reader has now been recovered at0x549aa8..0x549cff,called by main LoadSavedData1Click. Its Yes retains current data;No asks a second clear confirmation;Cancel closes. Records use sorted insertion by stored time and RA,with cursor-sensitive equal-key placement. This is distinct from the unrelated pulsar CSV append prompt. The next feature must port that ordering and a supported cursor profile with owned supplied records;simple byte concatenation would invent native semantics. Missing source/host metadata still blocks constructing new native records from the web notebook,and CSV/TXT date/locale conversion remains separate. Project partial;no push/deploy/publication in this increment.
