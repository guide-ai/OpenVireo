# Program List modal close ownership

A queued HTML dialog `close` notification from a dismissed Program List could reach the handler after an inline **Next on List** request started. Both operations used the same `base` ref;the closed dialog handler therefore aborted the new request. The inline cancel button disappeared and keyboard focus was lost. This is a browser lifecycle defect,independent of recovered native scientific behavior.

The handler now requires a currently open modal session (`open` React state),a matching active base and an actually closed HTML dialog before cancelling. A notification from an old dismissed modal cannot own an inline request. Explicit modal Escape/cancel,controller cancellation and external closure of a currently open modal continue cancelling their own pending load. No scientific state,source authority,record,format or numerical function changes.

## Reproduction and control

Raw logs,traces and screenshots remain outside source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-csv-export-implementation/`. The original unmodified `native-review-safety.spec.ts` keyboard test failed5/16 on the clean9208bb7 persistent preview and1/16 on the TXT→CSV candidate,under the same Chromium/4worker conditions. The complete candidate regression had407passes/1failure. Neither result was reported as green.

The failure trace contains two A0000014.SP requests;the second begins then aborts immediately after Escape→inline Next. An independent browser diagnostic captures the real previous modal close notification,then replays it after a new gated inline load begins. It cancels the new load on both baseline and candidate. This controlled event replay establishes handler ownership behavior;it alone does not prove every browser task ordering or native VCL equivalence.

A new deterministic desktop1440/mobile360 regression captures/delays that real notification and asserts that the new cancel control remains focused and usable,with source unchanged. It failed before the product fix and passes after. A separate test closes the *current* modal during a gated load and verifies cancellation still works. The existing test retains all assertions and timeouts. The28affected Program List/import/keyboard/DAT-review flows passed in31.7s. The same unchanged original test then passed16/16 in12.5s; the complete post-fix candidate passed411E2E/91files in7.6m with4workers,zero retries/failures/skips. No timeout increase or removed assertion.

## Manual check

At http://127.0.0.1:5173/#classification open **Program List**,press Escape,then immediately activate **Next on List**. During a delayed verified source load,**Cancel program-list load** stays available;activating it preserves the current practice. Reopening Program List and cancelling its own load still works. Browser-local adaptation only;no native execution/emulation or scientific equivalence claim.
