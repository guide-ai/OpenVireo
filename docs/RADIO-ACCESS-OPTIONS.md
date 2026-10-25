# Radio configuration and PulsarList1 availability (R-RX7)

R-RX7 ports who may change the radio options and when the original program's `File ▸ Pulsar List...` item (PulsarList1) is available. It is a bounded controller: the Preferences gate, the one ported option (Access Pulsar List), the Radio... child dialog's snapshot and result, the environment copy the radio panel reads, and the item's Enabled/Visible flags. The item's command, PulsarList1Click, is **not delivered**: the web shows a readout of its flags, never a command, even when the flags say enabled.

- Core: `src/core/radioAccessOptions.ts` (pure, imports nothing). Tests: `src/core/radioAccessOptions.test.ts`.
- UI: `src/components/RadioAccessOptions.tsx` (`useRadioAccessHost`), mounted by `RadioTelescopeRoute.tsx`. App flows: `tests/radio-access-options-app.spec.ts`.
- Provenance: [RADIO-ACCESS-OPTIONS-PROVENANCE.json](RADIO-ACCESS-OPTIONS-PROVENANCE.json).

Tags: [S] static disassembly, [D] DFM resource decode, [I] inference, [W] web adaptation (not native behaviour). Tests are evidence of this implementation's contract, not an oracle for the original program. Nothing was executed or emulated.

## Evidence

Artifact SHA-256 `781bc970…2c54c`. Safe derived evidence under `/tmp/clea-static-research/radio-rx7-access-20261025/` (copies `g9-options/` and `g9-ownership/`; `EVIDENCE-PROVENANCE.json` records the source directories, 50 + 36 files and their manifest hashes). The file hashes in the provenance record are quoted from capture receipts, contracts or the coordinator's verification records (`fix1-context/PROVENANCE-VERIFICATION.json`, `fix1-context/TAIL-PROOF-CONFIRMATION.json`); none was computed by the implementer, and no cited proof has a null hash. `environment-preferences.asm` is the Preferences1Click prefix (capture `0x5886ac..0x5888d0`); `environment-preferences-tail.asm` (capture `0x5888ce..0x588a10`, canonical RET `0x5889f8`, data after the RET is not code) is cited separately.

| Fact | Tag | Address / evidence |
|---|---|---|
| Preferences1Click enters only when the gate env+0x37d8 ≠ 0; otherwise it shows the INSTRUCTOR message `0x588a84` with caption `USER OPTIONS!` `0x588b70` | [S] | gate test `0x5886c9` (`je 0x5889a6`) in `environment-preferences.asm` (prefix); box `0x5889a6..0x5889cb` (call `0x47e09c`) in `environment-preferences-tail.asm`; `GATE-MESSAGE-AND-XREF-CORRECTION.json` |
| FormCreate writes gate := 0 (`0x587c2d`); only when env+0x2e7a (OptsRec+0x27c6) is 0, the Demonstration Mode branch (DemoBox shows NOT 27c6), it writes gate := 1 (`0x587c6a`) and calls `0x587dbc` | [S] | `environment-create-full.asm` |
| Edit Mode raises the gate only through `0x587dbc` or at Preferences OK (`0x5887e7..0x58880c`), which already needs the gate; no recovered path clears it; Login `0x5884a3`/`0x5884cb` not captured | [S] | ownership contract `accessGating` |
| The gate env+0x37d8 is separate from AccessPulsarList env+0x37d6 and from the panel's access option byte env+0x2e84 | [S] | `INDEPENDENT-CHECKS.json` |
| Preferences seeds alias `0x61ff0c` with env+0x2e91 (RadiOptsObj) at `0x58870e..0x58871a`; the Radio child works on that same object (no clone) | [S] | `environment-preferences.asm`, ownership contract `rootBinding` |
| RadiOptsBtnClick `0x5a6f58` creates a new TRadiOptsDlg (`0x5a6f67`), runs ShowModal, assigns env+0x37d9 := (ModalResult = 1) at `0x5a6f9c` and frees the dialog | [S] | `options-radio-child-button.asm` |
| Child FormActivate `0x5a9138` snapshots the 2370-byte record at Self+0x3e8 and sets Checked from record+0x941 (`0x5a9240..0x5a924f`) | [S] | `radio-options-activate.asm` |
| Child OK `0x5a9428` stores Checked to record+0x941 at `0x5a954f` before the numeric validation; on failure ModalResult := 0 at `0x5a9723`, the written flags stay | [S] | `radio-options-ok.asm` |
| What follows a numeric failure is open: FormActivate `0x5a9138` has no first-activation guard and the failure box `0x5a9719 → 0x47e09c` is not identified; if returning from it reactivates the child, the form re-snapshots and a later Cancel would not undo the flag | [I] | `radio-options-ok.asm`, `radio-options-activate.asm` |
| Child Cancel `0x5a9940..0x5a995e` copies the snapshot back over the whole record | [S] | `radio-options-cancel.asm` |
| Preferences return copies the root record to env+0x2e95 at `0x588751..0x588767` before the ModalResult test at `0x588770`; only result 1 enters `0x58ed74` (save confirmation); any other result jumps to `0x588998` and the procedure returns at RET `0x5889f8` | [S] | copy, test `0x588770` and call `0x58ed74` in `environment-preferences.asm` (prefix); `0x588998` and RET `0x5889f8` in `environment-preferences-tail.asm` |
| Parent Cancel `0x5a6d04` restores only the optical record (10205 bytes, env+0x6b4..0x2e91) | [S] | `OPTICAL-RECORD-BOUNDARY.json` |
| Compiled fallback record+0x941 := 0 at `0x5a90ad` (defaults `0x5a8ec4`), used only when no settings file loads; env copy at `0x587a20..0x587a36` | [S] | `radio-options-defaults-bounded.asm`, `G9-RECOVERED-CONTRACT.json` |
| PulsarList1 DFM: Enabled = False, Visible = False; first TRadioLab FormActivate (guard +0x4d5) enables (`0x56459c..0x5645a4`) and shows (`0x5645a9..0x5645b1`) it when env+0x37d6 ≠ 0; Receiver Open disables it (`0x567a6e..0x567a76`) under the same condition, after the hit and miss paths converge at `0x567a44` | [D/S] | `PULSAR-LIST-AVAILABILITY-CONTRACTS.json`, `correction-open-main-canonical.asm` |
| Receiver main close sends 0x53a by direct dispatch (`0x572769..0x572790` → `0x40516c`) to Application+0x44 | [S] | `MESSAGE-ROUTE-PROOF.json`, `receiver-close.asm` |
| On the captured startup path the main form is TEnvironment1 (CreateForm assigns Application+0x44 only while it is zero), whose class chain has no 0x53a handler | [S] | `MESSAGE-ROUTE-PROOF.json`, `application-createform.asm` |
| TRadioLab's 0x53a handler `0x567af8` sets PulsarList1.Enabled := True when env+0x37d6 ≠ 0 (`0x567b0e..0x567b16`), then DefaultHandler; it never writes Visible | [S] | `radio-close-message53a-handler.asm` |
| Captions: TOptionsDlg `Optical Simulation Options`, `&Radio...`, `&OK`, `&Cancel`; TRadiOptsDlg `Radio Simulation Options`, `Access Pulsar List`, `&OK`, `&Cancel` | [D] | `PREFERENCES-GATE-UI.json`, `RADIO-OPTIONS-RESOURCE.json` |

## Contract (core)

`RadioAccessState`: `gate` (env+0x37d8), `root` (RadiOptsObj+4, interpreted only as `accessPulsarList`), `env` (env+0x2e95 copy; env+0x37d6 is `env.accessPulsarList`), `lastChildOk` (env+0x37d9, `null` = startup value not recovered), `refusal`, `parent`/`child` (snapshot + Checked), `menu` (Enabled, Visible, first-activation guard mirror) and `closeRecipient` [W]. Every transition returns a frozen state; refusals return the same object.

| # | Function | Effect |
|---|---|---|
| T0 | `createRadioAccessState()` | gate closed (FormCreate), root and env from the compiled fallback, DFM menu flags, `lastChildOk` null. A supplied record (tests only) is copied and frozen: extra properties are kept uninterpreted and no missing native field is added. |
| T1 | `applyDemonstrationGate` | [W] scenario: the gate write of the Demonstration branch (`0x587c6a`) for this session. Refused while a surface is open; idempotent; nothing closes it. |
| T2 | `openPreferences(s, host)` | Web guards first (`inactive`, `busy`, `modal`, `receiver-box`): no native step, nothing changed. Then the gate: closed → the USER OPTIONS! box; open → the parent. |
| T3 | `dismissUserOptions` | Closes the box. |
| T4 | `openRadioOptions` | Child on the same object: snapshot = root (the same reference), Checked = root.accessPulsarList. |
| T5 | `editAccessPulsarList` | Checked only. |
| T6 | `okRadioOptions(s, 'not-ported')` | root.accessPulsarList := Checked (other properties kept), child closed, `lastChildOk` := true. env unchanged. |
| T6′ | `okRadioOptions(s, 'failed')` | Core-only model of the numeric failure: the flag write stays, the child stays open, `lastChildOk` unchanged. No UI produces it. Chosen contract assuming no FormActivate between the failure and a later Cancel [I] (see Gaps). |
| T7 | `cancelRadioOptions` | root := snapshot (whole record, the same object), child closed, `lastChildOk` := false. |
| T8 | `closePreferences(s, 'ok'|'cancel')` | env := root in both cases; the parent closes. `ok` reports `save: 'not-ported'`. `lastChildOk` keeps the last child return (`0x5a6f9c`), before the unported save confirmation. |
| T9 | `radioLabFirstActivation` | Once: if env is on, Enabled and Visible := true. Later calls change nothing. |
| T10 | `receiverOpened` | If env is on, Enabled := false. |
| T11 | `receiverCloseMessage` | Recipient TEnvironment1 (default): nothing. [W] Recipient TRadioLab: if env is on, Enabled := true; Visible untouched. |
| T12 | `setCloseRecipient` | [W] recipient only. |

Consequences kept from the original: Radio OK then outer Cancel keeps the change and applies it to env; Radio Cancel restores the whole object; OK then a reopened Cancel keeps the record but sets the last result to 0 (assignment, not a sticky OR); the panel reads env, so a root change not yet copied is not seen; the item's visibility is decided once, at the first activation.

## Web policies [W]

- **WEB-ACC-GATE-01 Gate scenario.** "Apply the Demonstration Mode gate for this session" applies only the recovered gate write. It is labelled as a web scenario, not the original Demonstration Mode (its other effects, `0x54c`, the `+0x80` call and `0x587dbc`'s menu writes are not ported). No Edit Mode, login, administrator, credential or classroom configuration is offered or read. Reloading the page is the only way back.
- **WEB-ACC-FORM-01 Partial forms.** The parent shows only Radio..., OK and Cancel; the child only Access Pulsar List, OK and Cancel. Both say what is not ported. Web OK leaves every numeric value untouched; the original OK re-parses the numeric fields from their text (possible rounding, error box, dialog kept open), which is not ported. No settings file is loaded or written; OK's save confirmation is not ported and the status says so.
- **WEB-ACC-PRES-01 Presentation.** The USER OPTIONS! box and the dialogs are application-modal over every radio card, presented only on the active route outside a project operation and with no foreign native `<dialog>`; they yield, keeping their state, to an antenna surface or a pending receiver close box/Record dialog that arrives meanwhile (pending, not only presented: a Record dialog that became pending behind an antenna box keeps the configuration unpresented when that box closes, so the Record dialog takes focus alone; the configuration returns after it). The other radio cards stay behind an open configuration, presented or not; the control panel (and so an antenna box that took over) is behind it only while it is presented. Handler-time admission [W]: card actions (the gate scenario and the close recipient) are refused while this card's own box or dialog exists; card and dialog actions are both refused while a surface with priority exists now (latest antenna state, receiver close box/Record dialog, date dialog, Pulsar Parameters) or a foreign native `<dialog>` is open. A refused action changes nothing and leaves the status unchanged; committed antenna/receiver events are not gated. Escape is Cancel (box: OK) and stops there (it never reaches the parent or the card); held Enter/Escape are ignored; Tab is trapped; Enter activates the focused button only. There is no X-close (its native outcome, possibly mrCancel without the restore, is not established).
- **WEB-ACC-FOCUS-01 Focus.** The opener → the parent's Radio... button → the checkbox; on close focus returns to Radio..., then to the opener, or to the card heading when the opener cannot take focus. A suppression (hidden route, project operation, foreign dialog, an arriving antenna or receiver surface) moves no focus; presented again, the surface takes focus the same way and keeps its state.
- **WEB-ACC-MENU-01 Readout.** The card shows the item's state (hidden; hidden with Enabled set; shown and enabled; shown and disabled), the raw flags, whether the first activation already happened, the last menu event and "Command not delivered". The first activation is the antenna's committed `activated` outcome (RA-04, the same guarded block); option edits, route hide/show and panel close/reopen do not re-run it. The interactive texts use plain labels; the native fields behind them are: Preferences gate = env+0x37d8; Access Pulsar List option = record+0x941 (RadiOptsObj); panel's copy = env+0x37d6 (in env+0x2e95); last Radio... result = env+0x37d9; the File ▸ Pulsar List... item = PulsarList1 (command PulsarList1Click, not delivered); main form = TEnvironment1; radio panel = TRadioLab; close message = 0x53a; first-activation guard = TRadioLab+0x4d5.
- **WEB-ACC-HOOK-01 Receiver events.** The receiver workspace calls `onReceiverOpened` only after a committed Open whose picker ran (source hit or miss), also when reopening the existing main window, and `onMainCloseMessage` only after a committed main close whose events include `send-0x53a` (not for a refused close, the close box or the absence of receivers). Refused web guards run no native handler and call nothing. The receiver core, session, events, source buffer, cursor and Record logic are unchanged.
- **WEB-ACC-ROUTE-01 Close recipient.** Default: the main form TEnvironment1, the chosen scenario taken from the captured startup route (not an observed native delivery), which has no 0x53a handler, so nothing changes. "TRadioLab" is an explicit web adaptation applying the recovered handler; it never re-enables automatically and is not shown to happen in the original. DefaultHandler and window-procedure effects are not modelled.
- **WEB-ACC-SAVE-01 Session only.** Nothing is part of Save investigation, storage or any export; reload resets the gate, values, last result, menu flags and recipient.

## Unchanged

PulsarList1Click and `overwriteReceiverSourceBuffer` stay without a UI caller (WEB-PP-LIST-03). Pulsar Parameters Open, Find/Next/Prev, the shared buffer and cursor, receiver signal/RNG/profile, Record/PLR/JSON/CSV/notebook, the Limit Slewing scenario of the control panel, the panel's access option byte env+0x2e84, the radio clock and the 1279 resources are untouched.

## Gaps

- The startup (FormCreate) value of env+0x37d9 is not recovered: the last result shows as unknown until the first Radio... return. Afterwards it is the last child return (`0x5a6f9c`), read before the unported save confirmation (`0x58ed74`); the native No branch and the reassignment from env+0x550 after the save (`0x58ef6f`) are not modelled.
- T6′ reactivation [I]: child FormActivate `0x5a9138` has no first-activation guard and the failure box `0x5a9719 → 0x47e09c` is not identified. If returning from it reactivates the child, the form re-snapshots and a later Cancel would not undo the flag. The core test is the chosen core-only contract with no intervening activation; no numeric flow is implemented.
- The native Escape routing and the X-close outcome; the numeric OK round-trip, its error domains and the `0x93b` normalisation.
- The other Demonstration Mode effects, the compiled Demo/Edit defaults and the Login branch.
- The runtime main form lifetime, VCL delivery and DefaultHandler/window-procedure effects.
- Whether Preferences1 has its own availability rules, and its caption (the web label says so).
- The exact place of the Receiver Open disable relative to the open handler's failure paths beyond the hit/miss convergence.
- Non-canonical byte values of the access flag cannot occur (no loader). Parent ResetBtnClick (`0x5a6dbc` → `0x5a8ec4`) is not ported.
- The classroom or historical value of env+0x37d6 (G9 remains partially open; [RADIO-PULSAR-PARAMETERS.md](RADIO-PULSAR-PARAMETERS.md)).

## Tests

- `src/core/radioAccessOptions.test.ts` (synthetic): T0 values and frozen literals; closed gate refusal and dismissal; web guards before the native test; the Demonstration gate is idempotent and has no closing export; same-reference child snapshot; OK writes root not env; whole-record Cancel restore of a supplied record with extra properties (`Object.is`), including after a modelled numeric failure (the chosen T6′ contract with no intervening FormActivate [I]); invalid records rejected; Radio OK + outer Cancel applies; last result as assignment both ways; env copied without a child; reentry refusals return the same object; menu first activation off/on with history, Receiver Open disable, TEnvironment1 vs TRadioLab close, access off at Open/close, a hidden item enabled by the TRadioLab close, env vs root; frozen outputs and no imports; strict provenance (every cited proof has a 64-hex hash and a receipt, the separate Preferences tail proof, a prefix range without the RET).
- `tests/radio-access-options-app.spec.ts` (actual App, synthetic catalog): written for the coordinator's run; see the file for the flows (refusal box, full nested flow, receiver hit/miss/reopen/refusal, both close recipients, history, keyboard and focus, inert cards, held keys, an antenna box over the yielded dialogs or USER OPTIONS! box dismissed by mouse and keyboard (no inert ancestor), Record finish and the configuration both pending behind an antenna box (the Record dialog takes focus first, the draft returns after it), programmatic card actions refused behind a foreign `<dialog>` and behind the card's own box or dialog, widths 1440/390/375/320, and A/B preservation of the receiver source name, title, sweep, canvas pixels, seed count, Pulsar Parameters cursor, Record properties and Save investigation bytes).
