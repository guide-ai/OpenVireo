# Web trace audition R-RX13 (Radio route)

Each receiver card has a **Trace audition (web)** group. After a stopped sweep has finished, one press plays that window's stored display trace once as a short sound (at most 1 s). This is a **web sonification of the stored trace, not the original receiver sound.** The native audio path (`0x57724c`/`0x576c28`/`0x576b04`, `waveOut*`), the options sound fields (`+0x91e`, `+0x922`, `+0x93f`) and `+0x42f` are not used; `+0x42f` stays `false`. Anomaly PRE-01 is neither repaired nor reproduced, so [WEB-RX-AUDIO-01](RADIO-RECEIVER-MONITOR.md) still holds: the original receiver audio stays excluded. No native sampling, timing, device, waveform, pitch or loudness equivalence is claimed. Tests check this implementation's contract only; nothing claims that a sound was heard on real hardware.

The audition is independent of the science model, the Radio Simulation Options sound fields and Save investigation. It reads a snapshot and never changes the bank, profile, trace store, random stream, marks, recording or session (no path calls `stepSession`). Nothing is saved, exported or restored.

Binary `CLEA_VEO.exe` SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Evidence tags: [S] static listing, [I] analyst inference, [W] web policy. The ported contracts it reads, with their recovered listing hashes and addresses, are in [RADIO-RECEIVER-AUDITION-PROVENANCE.json](RADIO-RECEIVER-AUDITION-PROVENANCE.json). No fresh static recovery, provider output or original input was used: it relies only on the R-RX2 trace contracts already ported in `radioReceiver.ts` and `radioReceiverDisplay.ts` ([RADIO-RECEIVER-MONITOR.md](RADIO-RECEIVER-MONITOR.md)).

## Modules

| File | Role |
|---|---|
| `src/core/radioReceiverAudition.ts` | Pure: snapshot and refusals, PCM mapping, generation-lease reducer, invalidation check. Type-only imports of the ported store; no React, DOM, host API or i18n. |
| `src/components/receiverAuditionHost.ts` | The only module that touches `AudioContext`. Injected dependencies (constructor, timers); synchronous start inside the gesture; ownership and retirement. |
| `src/components/RadioReceiverWindows.tsx` | Workspace owner (lease state, lazy host, effects) and the per-card audition group. |

## What it reads (evidence)

- **Trace store RXD-01/02** [S]. 400 Word rows (`maxIndex` 399) and `lastX`. The main store is zeroed at Receive start (source refresh `0x574ba4`, reset call `0x574c0c`); channel stores are never reset.
- **FRAME row and append** [S] (`0x573790`, append `0x5721a8`). Row = Word(0x6e − Round(signal · displayGain)) with a non-negative signal. With a cached display gain g ≥ 0 (including −0, since 110 − (−0) = 110) the row is ≤ 110, and g = 0 gives a flat 110. With g < 0 every positive signal gives a row above 110, drawn downward from the baseline; the audition refuses that domain (below). A row that is not an Int32 is not stored: the trace keeps `null` at that index [W, ported append]. The display gain of each frame is already in its row: a mid-sweep Vert. Gain or Freq change is part of the stored data, and the current Vert. Gain is never applied again.
- **Main index 0 is never written by a frame** [I, from the ported FRAME order]. The refresh sets position 400; the first frame wraps to 0 before any store, and later frames increment before they append. The main's row 0 therefore holds the reset zero, which Paint replays as a move to (0, 0), not a sample. Channels copy the main's position after its wrap, so they write row 0.
- **The sign of the cached display gain** [I, ported `formCreate`/`stepVertical` only]. FormCreate caches `sensitivity` = the live Gain (`+0x924`) and `displayGain` (`+0x565`) = Vert. Gain · sensitivity; Vert. Gain steps ×2 or ÷2 within [0.125, 8] and recompute it from the same sensitivity. So the sign of a receiver's display gain is fixed for its life and every row in its store used a gain of that sign. A later live options copy changes only the bank's options; a channel added afterwards caches the new Gain in its own FormCreate. The audition therefore reads the receiver's cached `displayGain`, never the live options.
- **Words above 110** [I, for a cached display gain ≥ 0 only]. In that domain they can only be a negative row truncated to a Word: the signal was above the top of the display. They play at full level and are counted as clipped. Rows with Round(signal · g) in [65536k, 65536k + 110], k ≥ 1, alias back into 0..110 and cannot be detected. A negative display gain is refused, not sonified; no signed waveform is modelled.
- **Replay range RXD-03** [S] (`0x572a20`) and the **title-change lastX reset** [S] (`0x572f8c`). The audition follows the store's replay range, not the canvas bitmap: after a title change erases `lastX`, the canvas can still show the old trace, but the audition refuses it. The canvas's finish point at x = 400 and, after a wrap, its move to (0, row) are both drawn from the position-400 sample, which is not stored and never used ([I], ported `receiverFrameOps`). A channel's stored row 0 is a separate sample and is in its range.

## Web policies

- **WEB-RX-AUDITION-01 (mapping)** [W]. Defined only for a cached display gain g ≥ 0 (WEB-RX-AUDITION-02 refuses g < 0). Over the n stored columns of the range, in a fixed order:
  1. Integer level `a = 110 − w` for a Word w ≤ 110, or `a = 110` (full level) for w > 110, which is counted in `clippedHigh`. A row of 0, the top of the display, is full level without being clipped.
  2. Mean removal on exact integers: `c = (n·a − Σa) / (110·n)`, one binary64 division, so |c| < 1 and a flat trace is exactly 0.
  3. Hold each column for 20 samples at 8000 Hz (2.5 ms per column; no relation to H, whose simulated seconds per column are H/400). L = 20n.
  4. Fade `min(1, k/80, (L−1−k)/80)`.
  5. `s = (0.2·c)·fade`, clamped to ±0.2, then `Math.fround` (−0 written as 0).

  There is no normalisation. The result is at most 8000 samples (1.0 s): 7980 samples (997.5 ms) for a full main sweep and 8000 (1000 ms) for a full channel. A flat trace plays silence, with a status that says so. The browser resamples to its output rate. Output level depends on the operating system, and no loudness claim is made.
- **WEB-RX-AUDITION-02 (range and refusals)** [W on the [S]/[I] store facts above]. The range is main 1..lastX and channel 0..lastX; rows after lastX are never read, and a partial range (lastX < 399) is allowed. Refusals, in order:
  - no receiver;
  - a negative cached display gain (`negative-gain`), or a missing or non-finite one (`invalid-trace`). It holds for the receiver's whole life, so it comes before every temporary reason. +0 and −0 are admitted and play silence;
  - receiving;
  - the main timer still enabled (a pending stop finishing its sweep, or a persistent tick error);
  - lastX = 0 (never received, or erased by a title change);
  - a malformed store (lastX > maxIndex, lastX ≥ rows, a non-integer);
  - fewer than 2 columns (a main with lastX = 1);
  - a `null` row, with its column (`missing-row`). It is never filled in. On the ported paths a `null` inside the range comes only from a frame whose row was not an Int32, so nothing was stored (for example a very large Gain): Add Channel is refused while the timer runs, Receive start zeroes the main's rows and channels fill contiguously from row 0 [I, ported paths only]. The UI text stays neutral about the cause and does not promise that receiving again helps;
  - a row that is not an integer Word 0..65535, with its column.
- **WEB-RX-AUDITION-03 (lease)** [W]. A pure generation reducer with at most one active lease (`starting` → `playing`). A press on the active card stops it (`user`). A press on another card stops the active lease (`replaced`) before the new start in the same gesture. A refusal is a notice only. An event of any other generation returns the same state object, so a late event can neither overwrite a newer status nor start anything.
  - **Stops.** Each of these ends the lease with its cause and never resumes or replays it: a project operation (`busy`), route hidden, a surface over the cards (antenna, date, Pulsar Parameters, Radio configuration, the close box or a Record dialog) or a foreign modal `<dialog>` (`modal`), page hidden or `pagehide`, and `receiver-changed`.
  - **Priority.** busy > route-hidden > modal > document-hidden > receiver-changed. An unmount stops the host directly.
  - **receiver-changed.** The slot is empty, its trace store is another object (Receive, a title-change erase, close and re-create), the timer is on, it is receiving, Vert. Gain, Freq or Horz. Secs changed, or its cached display gain is outside the admitted domain (a defensive branch, unreachable on the ported paths). Mark placement and drag, window moves and other slots keep the store object, so they do not stop it. Align, mark Clear, activation and the other paths that run the main's parameter refresh keep it only while the main title is unchanged: after Pulsar List or a clock reassociation left the title out of date, they erase `lastX` through new store objects and the audition stops.
  - **Closed card.** A closed card's audition status disappears with the card; the existing close status suffices.
- **WEB-RX-AUDITION-04 (host)** [W].
  - **Admission.** The host is created at the first admitted press. A press is refused with no host call while the route is hidden, during a project operation, under a surface over the cards, under a foreign modal `<dialog>`, or while the page is hidden.
  - **Synchronous start in the gesture.** Construct a context with no options (a throw is `create`), `createBuffer(1, L, 8000)` plus `copyToChannel` (`buffer`), `createBufferSource` plus `connect(destination)` (`connect`), the `onended` and `onstatechange` handlers, then `start()` (`start`). Each failure releases what was created. A running context is `playing`. Otherwise the host calls `resume()` once (a throw is `resume`) and the lease stays `starting`.
  - **Timers.**
    - The 2000 ms resume timeout starts at the gesture. A rejected resume, a resolve that does not leave the context running, the timeout, or an `ended` before running are all `blocked` (never `finished`).
    - The end guard (duration + 1000 ms) starts only once the context actually runs.
    - A statechange to running while pending promotes the lease. Any other statechange of an owned running context (suspended, interrupted, closed, or an unreadable state) stops it once as `interrupted`.
  - **After an await.** Async callbacks never create a context or start a source. A `running` event is applied only after the workspace re-checks the latest route, modal state and session.
  - **Stop.** Generation-checked. It clears the timers, detaches both handlers (so the close's own statechange cannot recurse), then calls `stop` (only if started), `disconnect` and `close`, each best effort.
  - **Retirement.** There is at most one owned context and at most one retiring (closing) context, never both.
    - A press while a close is pending is refused with "still being released" and is never queued; the user presses again.
    - A context whose state reads `closed` counts as settled.
    - Settlement is matched by identity, so a stale close callback cannot clear a newer record.
    - A close that throws, rejects or settles with the state not `closed` (or unreadable) leaves a permanent cleanup-failed guard: no further context is constructed until reload.
    - A broken host API's effects cannot be guaranteed. The host only stops, disconnects and closes as far as the API allows.
  - **Retained data.** One buffer of at most 8000 samples per lease.
  - **Not used.** Microphone, network, storage, worker threads, randomness and direct clock reads (the host only schedules its two declared timers through the injected `setTimeout`).
- **UI and keyboard** [W].
  - **Placement.** The group comes after the window-position group (Tab order: … Move up, Move down, then the audition button), before the card status line.
  - **Button.** One toggle button, "Audition trace" or "Stop sound", whose accessible name includes the receiver number. It is `aria-disabled`, never `disabled`, while idle and unavailable, so a focused button keeps focus when Receive starts, and a press announces the reason. Held Enter or Escape is ignored. The audition never calls `focus()`.
  - **Notes.** The help note, a reason note and a polite status line wrap on narrow screens.
  - **Catalog notes.** `note.silent` now says that the original sound is not reproduced and that this separate audition is a sonification. `note.unavailable` lists "the original sound and volume".

## Remaining items and limits

- The native receiver audio and PRE-01, the options sound fields and volume, and any audio parity.
- Aliasing of very large signals into 0..110 is undetectable.
- A negative Gain is refused rather than sonified, and no signed waveform model exists. The web options parser (WEB-RSO-NUM-01) admits a negative Gain; whether the native Gain editor or runtime does is **not established**.
- Whether headless or real browsers deliver `ended` without an output device is not established; the end guard covers it.
- Browser autoplay policies vary; a refused resume is reported as blocked.
- The caller Save `0x56b36c` (the native Save routine) and the original PRE-01 repair are outside this increment and this correction.

## Tests

- `src/core/radioReceiverAudition.test.ts`:
  - Hand-written vectors V1–V14: a flat main sweep is silent with 7980 samples and 997.5 ms; channel [110, 0] gives −k/800 then (39 − k)/800; clipped words and the 110/111 boundary; main index 0 excluded; missing and invalid rows; no-trace, too-short and malformed stores; receiving, finishing and tick-error refusals; the 8000-sample maximum; a partial range; peak and zero ends; determinism and frozen inputs and outputs; the current Vert. Gain not applied. Every mock slot carries `sensitivity` and the cached `displayGain`.
  - V15–V16: a negative cached display gain is `negative-gain` before receiving, finishing and lastX = 0, and a press starts nothing; +0 and −0 are admitted and silent; a missing or non-finite display gain is `invalid-trace`.
  - The ported session store: refusals while receiving and finishing, main 1..399 and channel 0..399 after the finish, and snapshot-only reads.
  - Ported sessions created with Gain −1 and −1000 (rows above 110; `negative-gain` while receiving, finishing and done), 0 and −0 (every row 110, silent 7980/8000 samples), and 1e30 (`missing-row` at the first `null` column found in the range, nothing played). A live Gain change does not reclassify an existing receiver; a channel added after a live sign change caches its own gain (mixed signs in one bank).
  - A title left out of date by Pulsar List: Pulsar List alone keeps the stores; Align or mark Clear then erases them through new store objects, ends the lease (`receiver-changed`) and leaves `no-trace`; Align without a stale title keeps them. A [W] contract over ported transitions, not native evidence.
  - The reducer: toggle, replace, stale events returning the same object, refusals, failures, and each invalidation cause with its priority, including the defensive display gain branch.
  - A core import audit.
- `src/components/receiverAuditionHost.test.ts` (fake contexts and timers, deterministic, no device):
  - Call order and buffer arguments; every failure branch releases what it created.
  - The resume timeout starts at the gesture and the end guard only after running.
  - Late resume after stop; `ended` before running is blocked; statechange promotion and interruption without recursion.
  - Play-stop-play with a deferred close; replacement; rejected and throwing closes leaving the cleanup-failed guard; stale close settlement; browser dependency lookup.
- `src/core/radioReceiverSession.test.ts`: the receiver source audit covers the core, and `AudioContext` is reached only through the host, which has no other host surface.
- `tests/radio-receiver-audition-app.spec.ts` (actual App, test-only init-script instrumentation, browser clock control):
  - No context until an admitted press; refusals while receiving or finishing; the main buffer at 8000 Hz with 7980 samples; Stop with focus kept.
  - Save bytes, next seed, sweep position, mark readouts and canvas pixels unchanged.
  - A channel that never received is refused.
  - A receiver created with Gain −1 is refused with the negative-gain reason and no context; a later live Gain of 1E30 keeps it refused, and a channel added then reports a missing stored value after its sweep, with no context and no page error.
  - Dispatched `ended`; the end guard; a pending close refusing the next press; replacement order; closing the main window.
  - Held, late, timed-out and rejected resumes; the constructor, buffer, connect and start failures; a rejecting close leaving the cleanup-failed guard, with no page error; an unsupported browser.
  - Stops on route hide (no replay), page hidden, a project operation, a foreign `<dialog>`, the close box, the Record prompt, a Vert. Gain step, a channel close and Mode. Ordinary DOM updates do not stop it.
  - One real `AudioContext` call-through path: running or suspended while playing, and `closed` after Stop. No audibility claim.
  - Viewports 1440, 375 and 320; Tab after Move down; held Enter plays once; reload clears the state.
  - The existing "no sound" check in `radio-simulation-options-app.spec.ts` is unchanged.
