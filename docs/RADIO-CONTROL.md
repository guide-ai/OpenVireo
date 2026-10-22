# I06 subflow: radio control switch, radio access and panel window

This slice covers one independent part of I06: the original main-window **Radio** control switch (`RadCntrlSw`), how radio telescope access (scope id 3) is granted, and how the radio control-panel window opens, closes and reopens. The panel's Tracking, Slew Rate and Set Coordinates/programmed-slew flow is in [RADIO-ANTENNA.md](RADIO-ANTENNA.md). Beam, receiver and observing modes are still open. I07 (receiver/pulsar signal) and N07 are untouched.

Contracts RC-01…RC-11, with address ranges, observations, inferences and gaps, are in [RADIO-CONTROL-PROVENANCE.json](RADIO-CONTROL-PROVENANCE.json). RC-10 is superseded by RC-11. Artifact: VIREO 1.504 `CLEA_VEO.exe`, SHA-256 `781bc970…c54c`.

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
