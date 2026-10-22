# App integration: supplied saved-row viewer and radio telescope control

**Author handoff record:** a bounded local integration on top of `7c40432` (saved rows `35c757e`, antenna `4cbe843`), preserved in local checkpoint `cbf2758` before the follow-up below. Validation, separate reviews and local preview promotion are recorded separately by the coordinator; this document is not an acceptance receipt. It does not complete any instrument or the project. The original 58-capability inventory and its partial statuses are unchanged.

Everything described here as host behavior is a **WEB adaptation**: route visibility, project-busy suspension, presentation ownership, focus and persistence wording. No new native behavior is claimed and no fresh REA probe or native run was made. The recovered contracts are reused as they are: RA-01…RA-14 ([RADIO-ANTENNA-PROVENANCE.json](RADIO-ANTENNA-PROVENANCE.json)), RC-01…RC-11 ([RADIO-CONTROL-PROVENANCE.json](RADIO-CONTROL-PROVENANCE.json)) and PLR-SAVED-ROWS-01 with SAVED-FRAMING-01, SAVED-ROW-01 and SAVED-FIND-01 ([PULSAR-SAVED-ROWS-PROVENANCE.json](PULSAR-SAVED-ROWS-PROVENANCE.json)). The REA record `ev_61f426…` binds the artifact and its resources only; it is not evidence for any behavior here.

## 1. Saved measurement file viewer (`#pulsar-analysis`)

- **Placement.** A separate disclosure, "Saved measurement file viewer (supplied file)", below the PLR analysis panel. The viewer (`PulsarSavedRows`) is loaded and mounted only when the disclosure is first opened. It then stays mounted, so its state survives closing the disclosure and changing routes.
- **Independence.** The viewer never reads or changes the PLR recording, cursors, pending readings, Record/Review/comment edits or the recorded list. Nothing is copied between them, no measurement is filled in, and no format changes.
- **Activity.** The host passes `active={false}` while the route is hidden, a project operation runs or the disclosure is closed. A running read is then cancelled (its late result is ignored), and an open Find dialog or not-found notice closes. The file in use, its selection, the Find memory and the Find draft are kept, and the dialog is presented again when the viewer is active.
- **Native dialogs stay topmost.** The Find dialog is a native `<dialog>`, so the page is inert while it is shown. A Find session started while another native modal dialog is open (for example the PLR Record dialog, or the Hubble lab guide left open across browser history) waits behind it. The PLR panel is **not** deactivated because a Find session waits; the Find dialog opens when the other dialog closes.
- **Logical session.** `onModalChange` reports the viewer's modal session, open or waiting, not its presentation. The host shows it in the disclosure summary as "Find session open". The API and its unmount cleanup are unchanged.
- **Wording.** A started read replaces an unconfirmed candidate, so a cancel names what is kept instead of "Nothing changed". The disclosure and the viewer say that the workspace is excluded from Save investigation and that a reload empties it. The download is the exact supplied bytes; it is not an edited file and not the output of a native writer.
- **Style.** The App's global table-header style (capitals, 8 px) is overridden for the viewer's table, so the recovered column names keep their case.

## 2. Radio telescope control (`#radio-control`)

- **Route.** A header button "Radio telescope" opens the route `#radio-control`. `src/components/RadioTelescopeRoute.tsx` holds the control, scenario-input and antenna states and mounts the existing controlled `RadioControlPanel`. The 100 ms slew updates therefore re-render only this subtree, not the other instruments. The workspace is lazily loaded on the first visit and then stays mounted.
- **Chosen web scenario** (stated on the route):
  - Telescope options: the recovered compiled defaults (`RADIO_COMPILED_OPTIONS`, RA-03), used by the original when no options file loads. No options file is read, and the current classroom configuration is unknown.
  - Main-window inputs start unsupplied, with the dome state byte at its FormCreate value 0. They are not linked to the observatory dome. The learner chooses **Use compiled defaults** (diameter 100, access option off) or enters values.
  - Access: with the access option off, the original waits a pseudo-random time (`Random(8000)`), which is not reproduced. The learner delivers the access tick by hand (the existing manual delivery). With the option byte set, the existing 1 ms callback is used.
  - Slews: the existing nominal 100 ms browser interval. This is not Windows timer timing.
- **Supported:** first activation, Tracking, Slew Rate, Set Coordinates with the recovered validation, the web numeric domain and the B1950 gate, confirmation, programmed J2000 slew, stop and resume, arrival, and hidden-panel continuation (RC-11).
- **Not available** (gated, not invented): receivers, the beam, the hot list, manual N/S/E/W slewing, the shared sidereal clock and drift, altitude limits, B1950 precession and any acquisition or signal.
- **Persistence:** temporary. The state is kept while the tab is open, also on other routes. It is not part of Save investigation or of any restore, and a reload resets it.

## 3. Host modality and visibility (WEB policy)

| Condition | Saved-row viewer | Radio panel |
|---|---|---|
| Route hidden | inactive: read cancelled, Find dialog/notice closed and kept | dialog/box not presented, state kept; **timers keep running**, so a slew can arrive in the background without taking focus or making anything inert |
| Project operation (busy) | inactive | not presented; ScopeTimer and SlewTimer2 registrations cancelled; a fresh registration starts afterwards; **no elapsed-time catch-up** |
| Disclosure closed | inactive | — |
| A native modal `<dialog>` of the page is open (About, Hubble lab guide, PLR dialog) | Find waits | dialog/box waits (`useSyncExternalStore` over `dialog:modal`, observed only while a radio dialog or box is pending) and is presented when it closes |
| Radio dialog or box presented | — | App header and investigation toolbar inert (only while **presented**, not while latent); LSS Options' own host inertness is unchanged |

- **Route heading focus.** After a route change the host focuses the route's `h1` unless a native modal dialog is open or a radio dialog/box is presented. On the active, non-busy radio route, a pending surface also suppresses the intermediate heading focus while another tool's native dialog closes and the radio box becomes presented. A hidden/inactive radio route advertises no such pending ownership, so it cannot suppress another tool's heading.
- **Focus on presentation.** The coordinate dialog focuses its first field, and a box focuses its default button. A dialog presented under a pending box takes focus when the box closes (the path used after an OK error box). A box returns focus only to a control of the panel, never when it was removed by a suppression; otherwise Set Coordinates takes focus as after any last box. If the panel window is closed and that control is absent, the live Radio switch is the fallback. A hidden/busy route or a foreign native modal never yields focus to that fallback. Held-key guards, Escape answers and Tab traps are unchanged.
- **Callbacks.** `onModalPresentedChange(presented)` reports presentation, not the logical session: it is called only on change, the latest callback receives it, and an unmount while presenting reports `false`. It is StrictMode-safe. The saved-row `onModalChange` keeps its logical-session semantics.
- **No product debug API** was added. The App flows use only the rendered App, browser history and test-only file-read holds.

## 4. Project save/restore

Save investigation produces the same bytes before and after radio and saved-row work, so no field was added to the investigation format. Restoring that file, a restore error and a cancelled restore all keep both temporary workspaces. The CSV, PLR and investigation JSON formats are unchanged.

## 5. Review follow-ups addressed (`claude-radio-antenna/review-tolerance-feedback-corrections/dispositions.json`)

1. **Tolerance wording (finding 1):** the notes say that the RA difference uses plain hour values with no wrap at 24 h (0 h and 24 h are 24 h apart). The arithmetic is unchanged; a unit regression shows the 24 h target taking the RA step.
2. **Transit note recovery (finding 2):** with the transit note open, the recovery says to choose **Cancel** on it, because its OK opens the slew confirmation. Other boxes say "with OK". Harness regression added.
3. **Predictor (finding 3):** `radioLabTickRefusal` returns `null` while SlewTimer2 is disabled (idle, or paused at the stop question), matching `slewTimerTick`, which answers `slew-timer-idle` first. The option-shape check is kept. This is the only core change. Constants, arithmetic, tolerances, admission and stepping are unchanged, and the panel already required an enabled timer. Unit regression added.
4. **Max-raise advice (finding 4):** for a kept index of 8 or more, the hidden-Tracking recovery leaves out "options whose maximum index exceeds the kept index" and says that no record in the supported web profile can raise it. Harness regression added.
5. **Docs (finding 6):** the rate gate is described as applying on the path to a possible start, which on a transit telescope is before the transit note.
6. **Not changed:** findings 5, 7 and 8 (optional drift refactor, performance, forwarding closure). The malformed restored fixed-step risk remains a caller-state assumption; no native validation is invented.

The false start message "Slew started at the maximum rate." is replaced: a kept index above the current maximum is used unchanged.

## 6. Documentation-only labels (deferred from `f4e336c`)

In [PULSAR-ANALYSIS.md](PULSAR-ANALYSIS.md), the properties table now says "list last index at object-base +0x84, then +1". The filename row no longer says "unlike the +4-relative rows above". No formula or address value changed. Both labels are disclosed for separate review.

## 7. Remaining original contracts (not covered here)

The sidereal clock (RA-13) and altitude limits (RA-12) need a shared clock. B1950 precession (`0x4b9f44`/`0x4b9f64`) is not recovered. Also not covered: manual N/S/E/W slewing, Receiver, the beam and hot list, the options loader and `TRadioOptsDlg`, the access-option dialog control, decoded message-box and status literals, the RateLbl table, and an original reload command for the saved-row layout. Whether the observatory dome is the `[+0x552]` byte is not established.

## 8. Post-review web follow-up

A separate Claude source review of the host integration identified two focus observations. Coordinator App probes reproduced both on desktop and touch 375: leaving saved-row Find for an arrived radio box briefly focused the route heading before OK, and OK after a hidden-panel arrival left focus on the document body. The coordinator implemented the bounded web corrections above after the assigned Claude correction author stopped with HTTP 429 before making edits. This authorship record does not replace a separate final Claude review.

The same follow-up puts the complete saved-row summary/session composition (including separator and order) in the catalog and names project save/restore read cancellation and candidate replacement in the disclosure help. Native-modal observation runs only when radio presentation can be active, avoiding a body-wide subscription for a hidden/busy pending box. Numerical cores, formats and original resources do not change.

The no-catch-up test uses a controlled browser clock after lazy tools have loaded: six periods while busy deliver zero ticks; cancellation starts a fresh interval, with zero ticks at 99 ms and exactly one at 100 ms. Other flows retain real-clock coverage. Actual App regressions cover both focus cases, held radio Enter/Escape and the hidden-busy 1 ms access callback. These are browser lifecycle checks, not original Windows timing or native focus equivalence. An additional coordinator probe found that returning focus to the main Radio switch let a held Enter from the arrival box toggle it. The switch now uses the same WEB repeated-key guard as the dialog and Set Coordinates return trigger; the underlying single-character control core is unchanged. The regression asserts after each repeated key, then releases it and verifies a fresh Enter still toggles. Paired repeats checked only at their end could hide two toggles. This is a browser safety policy, not a recovered native auto-repeat rule.

Optional catalog cleanup, a general modal registry and future options-loader wording are not part of this follow-up.

## 9. Tests

- Unit (Vitest): the predictor and tolerance regressions are in `src/core/radioAntenna.test.ts`. The audited TSX count is 51 (`RadioTelescopeRoute.tsx` adds no direct render literals).
- Actual App (Playwright, desktop 1440 × 1050 and touch 375 × 812): `tests/radio-saved-rows-app.spec.ts`. The navigation reachability list in `tests/recorded-analysis-navigation.spec.ts` includes the new header button.
- Standalone contracts (owned harness, skipped without it): `tests/pulsar-saved-rows.spec.ts` (with a distinct-sink callback test), `tests/radio-control.spec.ts`, `tests/radio-antenna.spec.ts` and `tests/radio-antenna-lifecycle.spec.ts`.

Tests check the chosen web contract; they are not an oracle for the original program.

## 10. Manual steps (local preview, after promotion)

1. Open **Radio data**. Load a `.plr` recording, place a cursor and record a measurement with a comment.
2. Open **Saved measurement file viewer (supplied file)**. Choose a saved measurement file, check its identity and choose **Use this file**.
3. Use **Find…** with From Top, From Cursor and Cancel. Note that Case Dependent is remembered but not used. Download the original file.
4. Open **Find…**, type text, press the browser Back and Forward buttons, and see the dialog return with your text. Close the disclosure while a file is being read, and see the read cancelled.
5. Open **Radio telescope**. Read the chosen scenario, then choose **Exercise**, **Use compiled defaults**, **Telescope access: Radio**, **Deliver scope timer tick now** and switch **Radio** on.
6. Choose **Tracking** and **Slew ▸ Set Coordinates…**. Try 25 h (error) and B1950.0 (gate), then Cancel. Enter 0 h 30 m 0 s, +35° and confirm with Yes.
7. While the telescope slews, open **Observatory**: nothing takes focus. Return to **Radio telescope**: the arrival box is shown.
8. Start a slew, choose Set Coordinates (stop question), then No to resume or Yes to stop.
9. Return to **Radio data**: the recorded measurement and its comment are unchanged. **Save investigation** behaves as before. A page reload empties both temporary workspaces.
