# Receiver Align (R-RX5)

Align arranges the receiver **windows**, never signals. CLEA_VEO.exe (VIREO 1.504) SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Static evidence only (listings and RTTI/VMT metadata of the research directory `/tmp/clea-static-research/radio-rx5-align-20261025`, `CONTRACTS.json` AL-INIT..AL-RECEIVE, and the R-RX4 receiver-record listings); no original runtime, OS event or emulation witness. Provenance and hashes: `RADIO-RECEIVER-ALIGN-PROVENANCE.json`. Acceptance claim: none; no capability or status is promoted.

| Module | Role |
|---|---|
| `src/core/radioReceiver.ts` | Align `0x5bce08` and guard `0x5bce09` in the bank, AlignDisp `+0x3bc` on the main, the layout `0x574fa4`, `toggleReceiverAlign` (`0x575034`), `receiverWindowMoved` (message 3, `0x57296c`) and the layout calls in Activate, Add, Receive and the main frame finish (pure). |
| `src/core/radioReceiverArrangement.ts` | WEB card order of the windows (pure). |
| `src/core/radioReceiverSession.ts` | `arrangement` in the session, reconciled at every commit; `toggleReceiverAlignment`, `moveReceiverWindow`, `receiverWindowMoveAvailability`; Align availability. |
| `src/components/RadioReceiverWindows.tsx` | Cards in arrangement order (keyed by slot), the live Align button and notes, the per-card Window position group, focus restore and lease capture release. |

## Ported contracts

- **AL-INIT** [S] (`0x572614`/`0x57261b`). Every FormCreate (Open of a new main, Add of a child) writes Align := 1 and guard := 0 before the R-RX4 record disarm (`0x572622`). FormCreate does not refresh, so AlignDisp keeps its previous caption. [W] Before any FormCreate the pair is false/false; no window exists to show it.
- **AlignDisp** [S] (refresh `0x572f8c`, `0x573082..0x5730b6`). Only on the main (`index == 0`): `+0x3bc` := `'Yes'` (`0x573650`) or `'No'` (`0x57365c`) from `0x5bce08`. The card shows the stored caption (`''` before the first refresh [W]); children never write it.
- **AL-LAYOUT** [S] (`0x574fa4..0x575032`). Acts only when Align is on and the guard is clear. Visits slot 2 then slot 1; each present child with WindowState `+0x273` = wsNormal gets Left := main.Left (`0x475190` → `0x47aa68`) and Top := main.Top + main.ClientHeight · slot (`0x4751b0`, `0x45d8d4` → `0x47aaa4`), then `0x47a010` and WindowState := wsNormal (`0x476f40`). Then guard := 1 and `0x47a010` on the main. Emitted as `window-placed{cause:'layout'}`.
- **AL-TOGGLE** [S] (`0x575034..0x57507e`). Align xor 1; the refresh `0x572f8c` of the main always runs; when now on, WindowState := wsNormal for slots 1 and 2, then the layout. Off never repositions. Emits `align-toggled`.
- **AL-MOVE** [S/I] (TRcvr_Form1 VMT `0x571a6c` dynamic message 3 → `0x57296c`; inherited `0x46444c`). Align off: guard := 0 and return. Align on: with the guard clear on a child, the `+0x4a1` suppression or `0x408c44(0x30)` (neither ported); then, only when slot 1 exists, slots 2 then 1 are placed again (`window-placed{cause:'move'}`); the guard is not written. Reading message 3 as WM_MOVE is a platform convention, not an executed witness.
- **AL-ADD** [S] (`0x574e90..0x574fa0`). The new child is placed below the main whatever Align is (`0x574f14..0x574f55`, `window-placed{cause:'add'}`), then slot 2 disables Add, then the layout (`0x574f97`). The add-nothing path also runs the layout (`0x574eaf` → `0x574f95`).
- **AL-ACTIVATE** [S] (`0x5728dc..0x57296a`, with `0x5b584c+5` false as in R-RX2 [W]). A child copies `+0x584`/`+0x56f` and clears the guard (`0x572944`); the main runs the layout (`0x57294f`); then the refresh. The drag-flag reset at `0x57295b` is unchanged by this increment.
- **AL-RECEIVE** [S] (`0x57471b`; `0x573b86..0x573b91`). Receive start on the main runs the layout after Paint and the snapshot and before the source refresh `0x574ba4`; Stop has none. The main's frame finish runs it after the sweep finish and before the record finish `0x573bbd`. No samples, time or marks are aligned.
- **Align while receiving** [S]. The receiving helper `0x575c6c` does not touch Align, so the button stays enabled in every timer and record state.

None of these transitions reads a clock, catalog or random stream. A toggle runs only the recovered refresh (aperture/beam, title, `+0x583`, AlignDisp, RcrdDisp and the title-change lastX reset).

## Web policies

- **WEB-RX-ALIGN-ARR-01 (placement).** The workspace is one column at every width, so a window's only position is its rank. `window-placed` moves the child directly below the main, after any contiguous run of lower-numbered children: visiting 2 then 1 always yields `[0,1,2]`, `[0,1]`, `[0,2]` or `[0]`. Native overlap (ClientHeight ≠ Height, field `0x4c`), 2-D coordinates, off-screen positions and multiple monitors are not represented. The order is reconciled at every committed session transition (closed windows leave; a new main goes on top; any child not placed is appended defensively).
- **WEB-RX-ALIGN-MOVE-01.** Each card has a Window position group with Move up and Move down (labels "Move up: Receiver n window" and "Move down: Receiver n window", so each accessible name starts with the visible text, WCAG 2.2 SC 2.5.3, https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html; no screen reader or voice-control test was run; `aria-disabled` at a column edge, held Enter ignored). They are the only web counterpart of the native input whose response differs between Align on and off: the pressed card swaps with its neighbour and receives one message-3 delivery; under Align on (slot 1 present) the column re-stacks at once. No dragging and no window-state controls exist.
- **WEB-RX-ALIGN-NOREMOUNT.** Cards are keyed by slot in one parent, so a reorder moves the same component instances: no Paint, no overlay reset, canvas bitmaps kept. Focus returns to the pressed control after the move (a moved DOM node loses focus in browsers).
- **WEB-RX-ALIGN-LABEL-01 (stale caption).** After Off and then Add, the child FormCreate turns Align on and the column re-stacks, but the main's AlignDisp keeps `No` until the main's next refresh (for example a Vert. Gain step). The card says so in a note. This is the web activation order (the child's activation follows Add's layout, existing [I] order); it is **not** a native runtime guarantee: if the final `0x47a010` on the main triggered its FormActivate, the native indicator could show `Yes` sooner. The Add status states the FormCreate reset [S] separately from the stale indicator, which is the web order [W]; whether the original refreshes it sooner is not established.
- **WEB-RX-ALIGN-ACT-01.** The `0x47a010` activation at the end of the layout is not followed (its transitive effects are not closed). Activation by clicking or focusing a card is not reproduced. The child's activation after Add leaves the guard clear.
- **WEB-RX-ALIGN-WS-01.** No minimized or maximized card state: the wsNormal writes are identity, AL-RESIZE `0x575080` (main wsMinimized → both children minimized, Align := 0, refresh) is not ported because nothing on the web reaches it, and the ShowWindow table `[1,6,3]` is unused. A hidden route, a hidden tab or a viewport resize is not a minimize and changes nothing.
- **Modality and leases.** The close box and the Record prompts/finish dialogs block Align and Move (session refusal) and make the cards inert. A mark lease ends first (WEB-MARK-CANCEL, marks kept) and its pointer capture is released. Actions need the shown route and no project operation.
- **WEB-RX-ALIGN-CLOSE-01 (close box after a reorder).** FormCloseQuery refuses closing slot 1 while slot 2 exists: by slot, not by card position. The box shows the native caption and text verbatim, plus a web note [W] naming the highest open receiver (derived from the open slots, never from the card order) to close first, wherever its card is in the column. The note is also part of the dialog's accessible description. The closing logic is unchanged.
- **Persistence.** Align and the order live for the page only: not in Save investigation, reload resets them.
- **Audio.** The beep is not reproduced (silent route).

## Invariants checked by Vitest

- I1: the order is a permutation of the open slots after every transition.
- I2: Align on implies the stacked order.
- I3: Align and Move never change `random`, `profile`, `sourceBuffer`, traces, marks, `recording` (rows by reference), `record`, `seed.used`, `canvases` or `markOverlays`, except the documented refresh effects (title and the title-change lastX reset) and ending a lease.
- I4: a set guard implies no Align-off move since the last acting layout.

## Tests

- `radioReceiverArrangement.test.ts`: placement, idempotence, swaps and edges, reconciliation, object identity.
- `radioReceiver.test.ts` (R-RX5 AL-*): initial values, toggle both ways and the guard, layout with 0..2 children, move off/on, Add placement and add-nothing, activation, Receive start and frame-finish order, the stale caption, science invariance.
- `radioReceiverSession.test.ts`: availability, box/dialog refusals, lease end, edge/input refusals, Off → Add reset, close/re-add, main close/reopen, toggling while capturing, and a seeded operation sequence checking I1–I4.
- `tests/radio-receiver-align-app.spec.ts` (actual App, synthetic in-test catalog, browser clock control): on/off with 0, 1 and 2 children, snap-back, reorder without remount, Add reset and the stale note, close/re-add and main reopen, Receive/Stop/Record with the finish dialogs, close box and its web note after a reorder (text, accessible description, Escape, focus, order kept), the Move label-in-name check, a touch mark drag (one Chromium CDP touch point; active capture confirmed by `gotpointercapture` after the first move) ended by a dispatched `click` on Align, which releases the active capture (`lostpointercapture`) before the finger lifts, plus a pending-capture check on a Move-ended drag with no move (`hasPointerCapture` true before the Move and false after it, no new `gotpointercapture`; which mechanism releases it is not asserted); synthetic browser input, not a real second finger, OS multitouch or assistive-technology coverage; hidden route, project operation, keyboard and held keys, viewports 320/375/1440, Save investigation bytes and reload.

The tests check the chosen web contract; they are not an oracle of the original. No native pixel, geometry, focus, GDI or event-order parity is claimed.

## Remaining

Window states and AL-RESIZE; the ShowWindow table; the `0x47a010` transitive effects; the `+0x4a1` writer and the beep; native window geometry; the Save wrapper `0x56b36c`; audio; the other R-RX2..R-RX4 remaining items.
