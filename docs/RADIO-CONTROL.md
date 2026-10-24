# I06 subflow: radio control switch, radio access and panel window

This slice covers one independent part of I06: the original main-window **Radio** control switch (`RadCntrlSw`), how radio telescope access (scope id 3) is granted, and how the radio control-panel window opens, closes and reopens. The panel's Tracking, Slew Rate and Set Coordinates/programmed-slew flow is in [RADIO-ANTENNA.md](RADIO-ANTENNA.md). Beam, receiver and observing modes are still open. I07 (receiver/pulsar signal) and N07 are untouched.

Contracts RC-01…RC-11, with address ranges, observations, inferences and gaps, are in [RADIO-CONTROL-PROVENANCE.json](RADIO-CONTROL-PROVENANCE.json). RC-10 is superseded by RC-11. The pre-activation date dialog (RC-12…RC-17, WEB-DATE-01…04) is in the same file under `dateContracts` and `webAdmissions`; see [File ▸ Set Observation Date/Time, ID](#file--set-observation-datetime-id-before-activation) below. Artifact: VIREO 1.504 `CLEA_VEO.exe`, SHA-256 `781bc970…c54c`.

> **Update (antenna slice):** the evidence-route notes below are historical for RC-01…RC-10. `TRadioLab`'s DFM and method table have since been decoded (see RADIO-ANTENNA-PROVENANCE.json). The diameter and access-option defaults (100 and 0) are recovered as compiled defaults, but the host still supplies them explicitly.

## Evidence route and its limits

- **No REA evidence.** The REA static session (Ghidra `analyze_function` on the radio handlers, `inspect_pe_resources`) required approval in this session and did not run. It was not retried. A read-only VMT/DFM decoder for `TRadioLab` was also not run for the same reason, so `TRadioLab`'s DFM, field table and method names are still unknown.
- **What was used:** the existing derived objdump listing of `.text` (`target.asm`, SHA-256 `164c88c2…24db`, read as text) and the existing decoded `TEnvironment1` DFM and method map. The original binary was not opened, and no code was executed or emulated.
- **Cross-check that ties offsets to controls:** `0x58e7f8` tests the visible byte of exactly seven menu items. The DFM `Window1` menu (`Enabled=False`) has exactly seven `Visible=False` children: OpticalWin, RadioWin, SpectWin, MeasWin, PulsarWin, HRWin and SpRsltsWin. That match identifies `0x4548ac`/`0x4549c8` as `TMenuItem.SetEnabled`/`SetVisible`, `+0x4b8` as `Window1` and `+0x4c0` as `RadioWin`. These are still inferences, recorded as such.

## Recovered behavior (implemented)

| Step | Native | Browser contract |
|---|---|---|
| Start | Scope bytes start at 4 = none (FormCreate). The one-shot first-paint branch leaves `RadCntrlSw` **disabled** while the radio byte is 4. Caption `Off`; IDPnl shows `No Telescope Accessed`. | `INITIAL_RADIO_CONTROL` |
| Exercise | `RadioPulsars1Click` hides OptCntrlSw, shows RadCntrlSw and makes item `+0x454` visible. | `enterRadioPulsarsExercise` |
| Radio access | `Radio1Click` does nothing if the radio byte is already 3. Otherwise it calls scope access with id 3. **Immediate** access happens only when option byte env+0x2e84 ≠ 0 **and** dome byte = 1. Immediate access sets the bytes to 3, enables the switch, sets the IDPnl caption to `IntToStr(diameter)+" Meter Radio Telescope"`, and shows the panel only if the switch is already on. **Otherwise access is deferred:** item `+0x408` is disabled, a busy cursor is set, and the ScopeTimer is armed with interval 1 ms (option byte set) or `Random(8000)` ms. | `selectRadioAccess` |
| Timer | `ScopeTimerTimer` does nothing while dome byte = 3. Otherwise it completes access the same way, except it never shows the panel. | `scopeTimerTick` |
| Switch | Click toggles. In the key handler, only `#13` (Enter) toggles. The switch is disabled for the duration of the change handler. **On:** caption `On`, item `+0x454` disabled, RadioWin visible, Window1 enabled, panel shown. **Off:** caption `Off`, RadioWin hidden, Window1 enabled only if another Window item is visible, item `+0x454` enabled, panel hidden. | `clickRadioSwitch`, `pressRadioSwitchKey` |
| Reentry | `RadioWinClick` sets `WindowState := wsNormal`, then calls `Show`. | `reopenRadioPanel` |
| Cancel | Closing the panel window runs `TRadioLab.FormCloseQuery` `0x5650c0`. Because env+0x3817 is 0 during normal operation, CanClose is False: item `+0x408` is enabled, `RadCntrlSw.SetActive(False)` runs (the OnChange Off branch is inferred), and the form is hidden, not destroyed. This replaces the earlier RC-10 adaptation, which kept the switch on. | `closeRadioPanel(state, env)` (RC-11) |

A missing diameter rejects any transition that must form the caption, and the state stays unchanged (browser atomicity). The original always formats whatever integer it holds.

## Explicit gaps (nothing invented)

- **Diameter (env+0x37ab) and option byte (env+0x2e84):** their sources and defaults are unrecovered. They are explicit scenario inputs and start unset/false. The option byte's dialog control is unresolved; "Fast Scope Change" is only a guess.
- **`Random(8000)` wait:** not reproduced. The UI offers **Deliver scope timer tick now** and says plainly that the original wait is not reproduced. The 1 ms interval (option byte set) runs automatically.
- **Radio request caption literal at `0x58c440`:** not decoded. The UI shows a catalogued description instead.
- **Not modelled:** names of items `+0x408`/`+0x454`, CntrlSwPnl/IDPnl visibility, beep/cursor presentation, title text, and every `TRadioLab` behavior.
- **Space key:** not recovered; the browser ignores it on the switch.
- **Event order:** the native delivery order of TiSwitchLed internal toggling vs. `OnClick` is not established.

## File ▸ Set Observation Date/Time, ID (before activation)

Only the part of the original date dialog that runs **before the radio panel is first shown** is ported. I06 stays partial: the post-activation hook is refused. Evidence: the coordinator's static date-preparation packet under `/tmp/clea-static-research/radio-date-preparation` (typed DFM/VMT metadata and complete instruction listings without bytes, listed with SHA-256 in `DATE-RECOVERY-MANIFEST.json` and `PHASE0-CLOSURE.json`; G1 typed calendar cells in `G1-VERIFIED.json` and `PHASE0-CALENDAR-TYPED-CELLS.json`). No original code was executed or emulated, and no native runtime oracle exists for any vector below.

### Recovered native behavior (static)

| ID | Native | Browser |
|---|---|---|
| RC-12 | `SetDateTime1` (env+0x454) starts `Enabled=False` (DFM `3a7a6a61…e6b3`). Exercise entry `0x58ab9c` only makes it visible; `0x58b098`, `0x5aaaac` and `0x45e524` make no **direct** Date, ID or Enabled writes (`0x45e524` dispatches through root virtual +0x84; its transitive or virtual callees are not proven). Run1Click (`0x58a0ff..0x58a11e`) is the only recovered writer that enables it before activation, after the star-catalog path check (`TABLES\REGIONS.BIN`, CGSC/Program Files path, or OK in `TMountCDROM`; Cancel exits at `0x58a09a`). Not an exhaustive absence proof: unverified SetEnabled calls on env+0x454 at `0x58c982`/`0x58c9c8` (PHASE0-STATIC-XREF-CANDIDATES, beside OpticalWin visibility writes, apparently an optical-switch On/Off pair) are not traced. RC-08 disables it at switch On. | Offered under WEB-DATE-01, which never reads or writes `item454Enabled`: it is `null` until the first switch On, then RC-08 sets it false (On) and true (Off), shown by the panel while the item stays refused (activation reached). |
| RC-13 | Controller `0x58b2ec`: a fresh form on every open (freed at `0x58b439`); the 52-byte date record is copied to the draft, not the ID; Cancel is enabled from the item; OK runs Now/record update/`env+0x382b`, then the radio hook only when Radio1 (env+0x430) is **visible**: `0x58b41a..0x58b424` tests byte +0x3e, written by `0x4549c8` (`menu-setvisible.asm`, SHA-256 `0b67f349…679e`; SetVisible by inference, see RC-02/RC-08); Checked is +0x38, Enabled +0x39. This amends the earlier "checked" reading (`MENU-VISIBILITY-CORRECTION.json`); the original notes and plan stay historical. No runtime change: the hook exits before activation, and no exemption after switch Off is inferred. | Prefill refreshed from the scenario instant at each open; Cancel always enabled. Now₁/Now₂ and `env+0x382b` not modelled. |
| RC-14 | FormActivate `0x4fdc5c`: ID from ShortString `0x5bc1e4` (zero-initialised `.bss`, zero at load; OKBtnClick is the only recovered ID writer, the pointer cell `0x5b5d98` is loaded at eight other unverified sites, no full indirect-alias proof, no historical or startup ID claimed); date `YYYY/MM/DD` and time `hh:mm:ss` from the truncated instant (`0x40370c`); focus on the date field, text selected. OKBtnClick `0x4fdf0c`: the ID is written **before** parsing (empty → `UNKNOWN`, ShortString `0x4fe078`; otherwise up to 18 characters, spaces kept); then date, then time; a parse exception keeps the dialog open with the ID written. Cancel writes nothing. | `confirmRadioDateDialog` follows that order; `cancelRadioDateDialog` writes nothing. |
| RC-15 | StrToDate `0x40e92c` → ScanDate `0x40e3e8`, order YMD, separator `/`: only ASCII spaces skipped; numbers read while the value is below 1000 (leading zeros allowed, `20091/…` fails); after a second `/` the day is required; one optional trailing `/`; the whole text must be consumed; TryEncodeDate checks Y 1…9999, M 1…12 and the Gregorian month tables `0x5ae83c`/`0x5ae854` with IsLeapYear `0x40d17c` (G1). Two-number dates and years of ≤ 2 digits use the host year. The era (`'e'`) and FarEast (`'ddd'`) branches do not apply (G1). | `scanDialogDate`: exact integer port. Host-year forms are refused as **unsupported** as a whole, not guessed; this also covers some forms the native scanner rejects whatever the host year (with two numbers ScanDate `0x40e5c8..0x40e5f3` puts the first in Month, so `2009/06` is always an EConvertError). The host year is never read. |
| RC-16 | Time `0x48647c` with tokenizer `0x48690c`: hours by `:`, minutes by `:`, seconds by space; missing parts are 0; `((s/60)+m)/60+h`, plus 12 h when the remainder is exactly `PM`; no range checks; other remainders ignored. | Same tokenization, restricted to whole-number parts (WEB-DATE-02). |
| RC-17 | Hook `0x565ab0` exits while the TRadioLab activated byte is 0; afterwards it uses the **optical** longitude env+0x2b86. | Only the pre-activation exit is relied on; after activation the item is refused. RadioLongitude env+0x3789 is not substituted. |

### Web admissions (not native claims)

- **WEB-DATE-01, startup gate.** The browser has no Run step. The item is offered from exercise entry, reusing the existing bundled-resource boundary (radio access after exercise selection, RC-02 → RC-03) in place of the catalog/CD-ROM path check, which concerns star-catalog files, not date or ID input. It is available iff the exercise is entered, activation has not been reached, a radio UT is applied and the scenario has not stopped at the range end. *Activation reached* is a sticky latch: the antenna activated, or the panel window was ever shown, including with an unsupported option profile where the web refuses activation (natively showing the form activates it). The latch survives closing the panel (RC-11) and switch Off. Not claimed: Run executed, Windows file availability, the Run callees `0x589bd8`/`0x58edcc`, a value for `item454Enabled`, native startup, modal or GDI timing.
- **WEB-DATE-02, text and numbers.** Printable ASCII only; date and time ≤ 32 characters, ID ≤ 18 (DFM MaxLength). Edits outside these bounds are refused at the field with a message; nothing is truncated or rewritten. Time parts must pass the existing `FLOAT_TEXT` grammar (otherwise *unsupported: spelling*, for example `12:30 PM` or `12:00:00PM`), be plain signed integers without `.` or exponent (otherwise *unsupported: form*, for example `1e1`, whose analytic value would be 10 h) and have magnitude ≤ 1 000 000 (otherwise *unsupported: large*). An unsupported time is a browser refusal, **not** a recovered native parse error. The result is exact integer seconds and must lie in 1900-01-01T00:00:00Z … 2099-12-31T23:59:59Z (otherwise *unsupported: domain*; year `0009` is natively valid but outside this range). The x87 Extended/double path, DecimalSeparator-dependent forms and the cancellation of the Extended at `0x5bc221` (record `0x5bc1f7` + 0x2a; its time-zone role is inferred from analyst notes on `0x487b64`, not established) are not reproduced; no error bound against the native result is claimed.
- **WEB-DATE-03, clock.** OK applies the instant through `applyRadioClockDialogUT` (WEB-CLOCK-01 semantics): applied UT and draft := the ISO text, elapsed time 0, new generation, range-end stop cleared, longitude untouched; a running clock keeps running (re-anchored now), a paused one stays paused, a clock frozen by a project operation stays frozen until it ends. The antenna is not changed: it only reads the new UT at its next clock tick after switch On.
- **WEB-DATE-04, presentation.** The ID lives only in the route state for this browser window. It is not saved, exported, imported from a DAT file or written into records, and nothing reads it. The error-box wording is OpenVireo's (the runtime library's text is not reproduced). Tab order follows the visual layout (ID first; native TabOrder Date, Time, OK, Cancel, ID). No system-menu close. The dialog uses the browser layout at 320 px, 375 px and desktop widths.

### Lifecycle (browser)

- Enter in a field chooses OK, Escape chooses Cancel; held Enter/Escape are ignored; Tab is trapped. After a refused OK the error box is a separate top layer and the dialog is inert behind it: Enter or Escape closes only the box, focus returns to the control that chose OK, and the next Escape cancels the dialog. The box shows the stored ID ("written when OK was pressed; Cancel keeps it").
- The dialog is presented only while the route is active, no project operation runs and no native modal `<dialog>` of the page is open; hidden, it keeps its fields and comes back with focus on the date field. The route reports *panel presented or date dialog presented* to the App (whose header becomes inert) and marks `data-modal-pending`. The panel's own report reaches the route one commit late, so the route gates it with the same active/busy inputs: a stale report left by hiding the route or starting a project operation is cleared synchronously in that commit, before the App's route-focus effect reads it. While it is open, the scenario, clock and File cards and the whole panel are inert. Timers are not affected.
- Focus returns to the menu item when the dialog closes, or to the Radio UT field when the item is no longer available (the range-end gate closed while the dialog was open; Cancel and the gate-closed OK write no ID or UT). A suppression, a hidden or busy route or a native modal moves no focus.
- In the App every route change cancels a running project operation and the route is inert while one runs, so busy suppression has no normal App path; it is defensive and was checked only with a controlled route host, not by `tests/radio-date-app.spec.ts`.

### Still blocked

- Set Date/Time, ID after activation (hook RC-17: optical longitude env+0x2b86, the Extended at `0x5bc221` (record `0x5bc1f7` + 0x2a; time-zone role inferred, not established), host Now and env+0x382b are not recovered as values).
- Native Run/startup, exact GDI/modal timing, FPU/Extended parity or error bound, historical ID metadata, ID persistence or consumers.

## Component interface

```ts
import RadioControlPanel,{RadioControlWorkbench,mountRadioWorkbench} from './components/RadioControlPanel';
<RadioControlPanel
  state={RadioControlState}                 // controlled; start from INITIAL_RADIO_CONTROL
  environment={RadioEnvironment}            // {domeByte:0|1|2|3, accessOptionByte, dishDiameterMeters:number|null, otherWindowItemsVisible}
  onTransition={t=>setState(t.state)}       // called only when t.changed
  onEnvironmentChange={setEnv}              // optional: shows scenario inputs
  translate={radioTranslator}               // optional; default English catalog (src/components/RadioMessages.ts)
  autoScopeTimer                            // default true: delivers recovered 1 ms ticks
/>
```

The pure core in `src/core/radioControl.ts` does not import React or i18n. Transitions return `{state,outcome,changed,steps}`, where `steps` are RC IDs.

## Integration notes for the coordinator

1. The `radio.*` keys are already integrated in `src/i18n/en.json`, with regenerated parameter types. The optional scoped catalog adapter reuses the shared translator.
2. The reviewed UI coverage pin is45:43 prior files plus the radio and observation-HR panels. Both new panels use the shared presentation catalog.
3. `RadioControlPanel` is mounted in the App under the `#radio-control` route (see [RADIO-SAVED-ROWS-INTEGRATION.md](RADIO-SAVED-ROWS-INTEGRATION.md)). The dome byte is **not** taken from the observatory dome: whether the observatory state is the same `[+0x552]` concept is not established, so the route keeps the explicit scenario inputs, starting from the FormCreate value 0. No session schema is changed and no state is persisted.

## Demo and tests

- Unit: `npx vitest run src/core/radioControl.test.ts`
- Browser (loopback 127.0.0.1:5181, strict port; check first that nothing is listening): `node node_modules/@playwright/test/cli.js test -c /home/dobleuber/Documents/Codex/2026-10-18/task-3/claude-parallel-approved/radio/harness/playwright.config.mjs`. The harness page is `http://127.0.0.1:5181/__radio-harness/`.
- Manual demo on the harness:
  1. Choose **Exercise: Radio Astronomy of Pulsars**.
  2. Apply diameter `40`.
  3. Choose **Telescope access: Radio**. With the defaults, access is deferred.
  4. Choose **Deliver scope timer tick now**.
  5. Focus the switch and press Enter; the panel window opens.
  6. Choose **Window: Radio Telescope Control Panel** (the window is shown again), then close the panel: the switch turns Off and the Window item disappears.
  7. Click the switch on to reopen the panel, then off again.

The current harness is the antenna harness on 127.0.0.1:5266 (see RADIO-ANTENNA.md); the 5181 harness above is historical.

Tests check the implementation contract chosen here. They are not an oracle for the original runtime.

Integration note: authored messages are in the shared English catalog and the presentation adapter is under src/components/RadioMessages.ts. The numerical/state core has no presentation imports. The panel is mounted in the App route `#radio-control` by the bounded host integration (local, pending separate review and promotion); the standalone specs above still run against an owned harness, and the App flows are in `tests/radio-saved-rows-app.spec.ts`.
