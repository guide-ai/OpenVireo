# I06 subflow: radio telescope control panel — Tracking, Slew Rate, Set Coordinates and programmed slew

This slice recovers one supported user flow inside the original radio control panel (`TRadioLab`, VMT `0x563a08`):

**Tracking → Slew ▸ Set Coordinates… → coordinate entry and validation → confirmation → programmed slew → arrival, or stop/resume/cancel → reopen.**

It sits on top of the main-window switch/access slice ([RADIO-CONTROL.md](RADIO-CONTROL.md)). Contracts RA-01…RA-14 are listed in [RADIO-ANTENNA-PROVENANCE.json](RADIO-ANTENNA-PROVENANCE.json), with address ranges, decoding routes, inferences and gates. Artifact: VIREO 1.504 `CLEA_VEO.exe`, SHA-256 `781bc970…c54c`. No original code was executed or emulated.

I06 is **not** complete. Receivers, pulsar signals, the beam object, the hot list, manual N/S/E/W slewing, sidereal tracking/drift, altitude limits and B1950 precession are not implemented. Nothing here acquires or simulates a signal.

## Evidence route

- **REA, reused:** the `inspect_pe_resources` record `ev_61f426f3…` binds the artifact and RCDATA `TRADIOLAB` (offset 2195716, 12882 bytes, SHA-256 `b87302b1…8288`). The decoder's DFM source matches it exactly. The Ghidra `list_procedures` record `ev_32b7791d…` corroborates helper entry points.
- **REA, fresh:** `inspect-with-objdump … section_headers` completed (exit 0, artifact unchanged). It reproduced the content-addressed record `ev_be75d7d3…` and places the dialog globals in `.bss`.
- **Static decoding:** the existing read-only `decode_radio_metadata.py` decoded `TRadioLab`, `TSkyCoordsDlg` (VMT `0x4f2e88`, found through its `CreateForm` class-ref cell) and `EConvertError`. Class-ref cells are VMT−76, calibrated on `TRadioLab`'s known cell `0x5639bc`.
- **Code:** the existing derived listing `target.asm` was read as text. Bounded direct GNU objdump covered the places where the linear sweep desynchronizes: the `OKBtnClick` except handlers, `SlewTimer2Timer` and the d/m/s split helpers. These are not REA provider results.
- **Meaning only:** original help `PULSRHLP.TXT` (Set Coordinates; Remarks on Slewing).

## Recovered behavior (implemented in `src/core/radioAntenna.ts`)

| Step | Original | Browser contract |
|---|---|---|
| Options | The settings loader `0x5a802c` falls back to compiled defaults `0x5a8ec4` when no options file loads. The defaults are: not transit, limits off, maximum rate index 5, rate base 50, instant slew off, latitude Extended ≈ 0.6707 rad, dish 100 m, access option 0. | `RADIO_COMPILED_OPTIONS`, `RADIO_COMPILED_ENVIRONMENT` (typed inputs, not hidden authority) |
| First show | `FormActivate` runs once. It disables N/S/E/W, Rate and Receiver, and enables Slew only for transit. It shows Tracking/E/W unless transit, sets rate index 4 (500″ per tick), RA 0, and Dec = latitude×180/π. | `activateRadioLab` |
| Tracking | `DriveBtnClick` toggles tracking. On: enables N/S/E/W, Slew, Rate and Receiver. Off: disables them again, and Slew stays enabled only for transit. | `toggleTracking` |
| Slew Rate | Up only while index < maximum; down only while index > 1. Rate = 10^(index−3) × rate base. | `changeSlewRate` |
| Set Coordinates | During a slew, SlewTimer2 is turned off and a Yes/No stop question appears. Otherwise, stored coordinates that are both 0 are seeded from the pointing, and the dialog opens modally. | `openSetCoordinates` |
| Dialog prefill | `FormActivate` splits the values into d/m/s with second→minute carry. RA seconds use ffFixed 2 and Dec seconds ffFixed 1. Dec degrees are shown as `IntToStr(sign×deg)`, so a Dec in (−1°, 0°) shows `0` without its minus. | `skyCoordsFieldsFor` |
| OK | RA = (h + m/60) + s/3600 must lie in [0, 24]; otherwise an error box appears over the open dialog. Dec = (d + m·sign/60) + s·sign/3600 must lie in [−90, 90]. For d = 0 the sign comes from a `-` in the text. RA errors are reported first. `EConvertError` gives the same error. | `confirmSkyCoords`, `parseSkyCoords`; evaluated exactly inside the web numeric domain below |
| Cancel | `bkCancel`: nothing is stored and nothing moves. | `cancelSkyCoords` (Escape) |
| Slew start | An exact match with the pointing gives the "no slew needed" warning. Transit shows an OK/Cancel note first. Then a Yes/No confirmation. On Yes, the start loop raises the index to the options maximum when the index is lower (a higher kept index stays), and stores the index, the rate and the Dec step rate×≈1/3600. This also happens with the instant option; the telescope then jumps straight to the target without using the rate. Otherwise N/S/E/W and Rate are disabled and SlewTimer2 starts. | `answerNotice` |
| SlewTimer2 | The slew runs Dec first, then RA. RA takes the short way (Δ negated when \|Δ\| > 12 h). The RA step is rate×≈1/3600/15, computed once at the Dec→RA switch. Arrival uses the inclusive comparisons and the [0, 12) h crossing window. An initial \|ΔRA\| ≤ ≈1e−5 h finishes in that same switch callback without snapping: the RA step is stored but never added. Completion re-enables N/S/E/W and Rate and shows an information box. | `slewTimerTick` (100 ms nominal) |
| Stop | Yes in the stop question: slewing off, the position stays where it is, controls are re-enabled. No: SlewTimer2 resumes. | `answerNotice('stop-slew')` |
| Close/reopen | `FormCloseQuery` refuses to close: the switch goes Off and the window is hidden (RC-11). The form keeps its state and timers, so a slew finishes while the window is hidden. Reopen by switching On. | `closeRadioPanel(state, env)` |

Original quirks are kept on purpose:

- **Lost Dec minus:** the Dec minus is lost for −1° < Dec < 0° when the dialog is re-opened.
- **Tracking off mid-slew:** turning Tracking off during a slew hides Set Coordinates, so that slew cannot be stopped. On arrival the slew still re-enables N/S/E/W while Tracking stays off.
- **Rate stays raised:** a programmed slew leaves the rate index at the options maximum, or at a higher index kept from earlier options (the start loop only raises it). The panel's start message therefore names "the rate shown under Slew Rate", not "the maximum rate".
- **No 24 h wrap in the display:** the dialog's RA display shows 23:59:59.996 h as `24 0 0.00`.

## Explicit gates (nothing invented)

- **Sidereal clock (RA-13):** `ClockTimerTimer` makes RA drift (RA = LST − HA) whenever tracking is off and no slew is running. Without the shared observation clock the RA readout stays fixed. Right after the first show it is 0 h, which in the original is replaced by LST at the first clock tick. A slew itself is unaffected.
- **Altitude limits (RA-12):** with `limitsEnabled` the coordinates are stored, but the slew stops at `limits-require-clock`. HA needs LST from the clock.
- **B1950.0:** precession routines `0x4b9f44`/`0x4b9f64` are not recovered. OK reports a gate and keeps the dialog open.
- **Options owners:** the INI loader `0x5a829c`, `TRadioOptsDlg` and classroom files can change every option. Only the compiled defaults are recovered, and the supplied distribution has no `VEO_OPTS.INI`.
- **Literals:** message-box texts, status texts, the ClockLbl captions and the RateLbl table are not decoded; the UI uses OpenVireo wording and says so. A probe script was prepared for them, but running it was denied in this session.
- **Not modelled:** manual N/S/E/W press-and-hold (`SlewTimer` `0x565e58`), Receiver, hot list, beam/sky object `0x561e88`, LED digit rendering, HA tracking at `+0x5d5`, the non-first `FormActivate` path, and Windows timer/message-loop timing.
- **Numerics:** binary64 only. Extended constants are rounded once. `StrToFloat` is a strict web grammar with `.` as the decimal separator and an exponent of at most two digits. Coordinate entry follows the web numeric domain below. Arrival can differ from x87 by one callback at exact boundaries; no tolerance is added.

## Numeric admission of coordinate entry (web domain, not original behavior)

The original `OKBtnClick` computes RA = (h + m/60) + s/3600 and Dec = (d + m·sign/60) + s·sign/3600 in x87 Extended, then checks only the final sums against [0, 24] and [−90, 90]. Native accepts signed and noncanonical components (for example 25 h −60 min, or 5° 90′) and has no limit on any single field. This port keeps that: there are no per-field ranges, RA is checked before Dec, and the Dec sign rule is unchanged (Sign(d), or −1 when d is exactly zero and its text contains `-`, read through `Pos` at `0x40640c`).

The earlier candidate added the parsed binary64 fields in the native order. An independent check showed what that does with large components. The entry 9007199254740993 h, −540431955284459520 min, 3600 s is exactly 2 h, but it was admitted as 1 h. The same entry with −540431955284459580 min and 0 s is exactly 0 h, but it was rejected as a range error. And `24.000000000000001` h was admitted as 24. The earlier formula also rejects 0.7 h −41 min −60 s, which is exactly 0 h. No blanket disclaimer makes hour-scale errors acceptable, so the browser now uses this explicit domain (`SKY_COORDS_WEB_DOMAIN`, `admitCoordinate`):

1. **Exact value.** Each field that passes the strict grammar is read as an exact decimal. R = a + sign·(b/60 + c/3600) is formed as an exact rational, and S = |a| + |b|/60 + |c|/3600.
2. **Error bound.** Each term of the formula passes through at most four roundings: parse, divide and two additions. So any evaluation that rounds each of them to 53 or more bits stays within γ₄·S < E = 2⁻⁵⁰·S of R. Binary64 does this, and so does Extended if its `StrToFloat` is faithful; that is an assumption, not verified.
3. **Range error (original box).** If R is outside the range by more than E, the original error box appears (`ra-invalid`/`dec-invalid`). Every such evaluation would agree, so this is the native range check, not a guess.
4. **Cancellation (browser box).** Otherwise, if S > 10⁶ (hours for RA, degrees for Dec), the entry is refused as `ra-unsupported`/`dec-unsupported` with reason `cancellation`. Large components that cancel are where finite-precision results become hour-scale wrong, so the browser does not pick one result.
5. **Precision (browser box).** Otherwise, if R is outside the range by at most E, the entry is refused with reason `precision`. It sits closer to the bound than finite arithmetic can resolve: native would probably round it onto the bound and accept it, while exact algebra says it is out of range. Neither verdict is claimed.
6. **Accepted.** Otherwise R is in range and is stored as the nearest binary64 (ties to even). The bounds 0, ±90 and 24 are representable and rounding is monotone, so the stored value is finite and never moved across a bound. Nothing is clamped.

**Why material cancellation is ruled out.** Inside the domain S ≤ 10⁶, so E ≤ 2⁻⁵⁰·10⁶ ≈ 8.9·10⁻¹⁰ of the unit. That is 3.2 µs of time or 4.8·10⁻⁵″ for RA, and 3.2·10⁻⁶″ for Dec. Any faithful evaluation of the original formula agrees with the exact value to within this bound. That is far below the dialog resolution (0.01 s, 0.1″) and the ≈10⁻⁵ h arrival tolerance. Ordinary sexagesimal, signed and noncanonical entries have S of a few hundred at most.

**Remaining conversion error.** The stored value is within half an ulp of the exact value: at most 1.8·10⁻¹⁵ h for RA and 7.1·10⁻¹⁵° for Dec. Compared with the earlier binary64 accumulation it differs by at most E (generated checks in `radioAntenna.test.ts`).

**How it differs from native admission.**
- The browser refuses entries the original program evaluates: S > 10⁶ with cancellation, and entries outside the range by less than E.
- The browser accepts every exactly in-range entry. The original program might reject one when its own rounding lands just outside a bound; for example, it might reject 0.7 h −41 min −60 s.
- Native x87 results are not reproduced, and no parity is claimed. The refusal is a browser message box (`antenna.notice.webDomain`), not an original message.
- As with every OK error, the draft fields, the open dialog, the stored target and the pointing do not change.

## Held keys in the dialog and message boxes (browser policy)

Before this correction, holding Enter in a coordinate field cascaded through several steps by key auto-repeat: OK, then Yes on the confirmation (the slew started), then Set Coordinates on the restored focus (the stop question), then Yes (stopped), then the dialog reopened. Holding Escape on an error box closed the box and then cancelled the dialog, discarding the edits. Both were reproduced with Playwright on the unchanged panel; the failing baseline report is in the correction evidence folder. The panel now ignores auto-repeated Enter/Escape (`KeyboardEvent.repeat`) inside the dialog and the message boxes, so only a fresh key press acts there. This is a browser input policy, not recovered behavior: how the original Windows dialogs treat key repeat is not established.

`answerNotice(state, options, kind, answer)` refuses an answer meant for a box of another kind. It does not tell apart two successive boxes of the same kind. The panel always passes the kind of the box it renders, and a stale click cannot reach an unmounted box, so no same-kind late answer was found apart from the held-key cascade.

## Component interface

```ts
import RadioControlPanel,{RadioControlWorkbench,mountRadioWorkbench} from './components/RadioControlPanel';
import {INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS} from './core/radioAntenna';
<RadioControlPanel
  state={radioControlState} environment={env} onTransition={t=>setState(t.state)}
  antenna={radioLabState}                      // start from INITIAL_RADIO_LAB; activates on first show
  onAntennaTransition={t=>setAntenna(t.state)} // called only when t.changed
  antennaOptions={RADIO_COMPILED_OPTIONS}      // host values must also satisfy the supported WEB option profile
  antennaTranslate={createRadioAntennaTranslator(catalog)} // optional scoped catalog
  autoScopeTimer                               // default true: nominal 1 ms callbacks when fast access is enabled
  autoSlewTimer                                // default true: nominal 100 ms browser registration
  active                                       // default true (WEB host adapter, see "App integration")
  hostBusy                                     // default false
  onModalPresentedChange={presented=>…}        // optional
/>
```

Transitions return `{state,outcome,changed,steps}`, where `steps` are RA/RC contract IDs. While the dialog or a message box is open, other user actions return `modal-open`. ScopeTimer callbacks are separate from user actions and can complete access while the antenna dialog remains open. Each message answer names the kind of box it answers (`answerNotice(state,options,kind,answer)`), so an answer aimed at another kind of box, or at no open box, changes nothing. Same-kind boxes are not told apart; see "Held keys" above. Each tick carries the run token (`slewTimerTick(state,options,run)`), so late callbacks from an earlier slew change nothing.

The English strings are in `src/components/RadioAntennaMessages.ts`. It is a scoped catalog with the same rules as the shared ones (complete keys, identical placeholders, values inserted as text). The route's own texts (`radioRoute.*`) and the corrected `radio.*` keys are in the shared `en.json`.

## App integration (WEB host adapter)

1. The App mounts `RadioControlPanel` with lifted states in `src/components/RadioTelescopeRoute.tsx` under the `#radio-control` route; see [RADIO-SAVED-ROWS-INTEGRATION.md](RADIO-SAVED-ROWS-INTEGRATION.md). No session, persistence or scientific schema is changed and nothing is saved.
2. Host props (all WEB, defaults keep the standalone behavior): `active` (false while the route is hidden: the dialog and boxes are not presented and take no focus, their state is kept; timers keep running, so a hidden slew arrives), `hostBusy` (a project operation: no presentation, and both timer registrations are cancelled; a fresh registration starts afterwards, with no elapsed-time catch-up) and `onModalPresentedChange(presented)` (true only while a dialog or box is actually presented; a native modal `<dialog>` of the page stays topmost and the radio surface waits for it to close).
3. `closeRadioPanel` takes `(state, environment)` and returns `panel-hidden-switch-off` (RC-11), whose wording is in the antenna catalog.
4. The stale shared texts `radio.scope`, `radio.panel.gap`, `radio.outcome.panel-closed` and `radio.env.diameterHelp` were corrected (compiled 100 known, current classroom configuration unknown). `radio.scope`, `radio.panel.gap` and `radio.outcome.panel-closed` remain unrendered keys of the radio catalog.
5. `radioLabTickRefusal` reports no refusal while SlewTimer2 is disabled (idle, or paused at the stop question): no callback is pending there, and `slewTimerTick` answers `slew-timer-idle` before any profile or rate check. The option shape is still checked. This tightened the exported predictor only; `slewTimerTick`, the constants, tolerances and stepping are unchanged.
6. Clock integration (RA-13) is still the next step needed to show the original RA readout after the first clock tick and to admit limits.

## Demo and tests

- Unit: `node node_modules/vitest/vitest.mjs run src/core/radioAntenna.test.ts src/core/radioControl.test.ts` (an owned config keeps caches outside the repo).
- Browser, standalone panel contract: the radio specs need an owned harness through `OPENVIREO_RADIO_HARNESS_URL`. The integration pass used `<task>/claude-radio-saved-rows-app-integration/config/playwright.harness.config.mjs` (loopback 127.0.0.1:5279, strict port), whose page exposes `window.__radioHarness` and the query options `?transit=1`, `?instant=1`, `?limits=1`, `?manualTick=1`, `?rateBase=`, `?maxRateIndex=`, `?latitude=` and `?synthetic=scope-modal`. The earlier 5266 harness under `<task>/claude-radio-antenna/harness/` is historical.
- Browser, actual App: `tests/radio-saved-rows-app.spec.ts` (no harness).
- Manual demo (App route **Radio telescope**, `#radio-control`):
  1. Choose **Exercise**, then **Use compiled defaults**, then **Telescope access: Radio**.
  2. Choose **Deliver scope timer tick now**, then switch **Radio** On.
  3. Choose **Tracking**, then **Slew ▸ Set Coordinates...**.
  4. Type `25` in Hours and press OK: an error box appears and the dialog stays open.
  5. Enter 1 h 0 m 0 s, +30° 0′ 0″ and press Enter, then Yes. The slew runs and an arrival box appears.
  6. Start another slew and choose Set Coordinates during it, then No (resume) or Yes (stop).
  7. Close the panel window during a slew. The switch turns Off and the slew finishes hidden; switch On to see the result.

Tests check the implementation contract chosen here. They are not an oracle for the original runtime.

The browser repeat guard also covers the Set Coordinates button that receives focus when a message closes. Independently reproduced before that extension: holding the Yes confirmation opened a stop question and paused the slew without a new press. A fresh press still opens the stop question. This is a browser input policy, not a native Windows timing claim.

## Browser timer ownership and option profile

These are explicit web policies, not recovered Windows timing or native options validation. `radioTimer.ts` owns a periodic registration, reads the latest committed input on delivery, suppresses duplicate delivery from the same uncommitted input, and ignores callbacks after cancellation. Tracking/rate changes do not restart its cadence. Pause, completion, unmount, unsupported host options, or a Dec→RA switch callback that would take its RA step from an unsupported stored rate (`radioLabTickRefusal`, see below) end the registration; hiding the panel leaves it running. Motion then names which of the two browser limits suspended the slew. The component additionally checks the latest enabled/run ownership before handling a callback, including the gap between a React commit and passive-effect cleanup, so an ending timer cannot overwrite its completion result. Browser scheduling can coalesce deliveries; this is not one guaranteed native tick per elapsed 100 ms.

`radioLabProfileIssues` separately checks a shape-valid host option record: initial latitude must produce finite Dec within [-90, 90] degrees, and reachable rate indices 1 through max(4, configured maximum) must yield finite positive advancing Dec/RA steps with RA step < 6 hours. The browser refuses unsupported options without clamping or replacing state. A changed unsupported profile suspends motion; restoring a supported profile resumes it. Under unsupported options, Tracking, the Slew Rate buttons, opening the coordinate dialog, its OK and the confirmation's Yes are refused. An open coordinate dialog can still be cancelled, and a running slew can still be stopped through Slew ▸ Set Coordinates… only while that menu item is enabled: on a non-transit telescope it is disabled while Tracking is off, and Tracking cannot be turned on until supported options return, so Stop is unreachable in that state. The original INI/dialog validation and current classroom options are not established. These controls do not authorize acquisitions or supply the observation clock.

The option record alone does not cover the panel state. After the first FormActivate (index 4, rate computed from the options then current), the original recomputes the rate only in RateSpin and in the start loop, and the start loop only raises the index to the options maximum. So an index set under earlier options can be kept above max(4, maximum). Example: options A (maximum 6, base 50) are switched to B (maximum 4, base 3241), and RateDown then gives index 5 with rate 324100, an RA step of about 6.002 h.

A rate is checked only where a step that moves the telescope comes from it, with the live options deciding the branch and the coordinates deciding whether an RA step is taken. The native consumers, from the derived listings behind RA-10/RA-11, are:

- The start loop (0x566f6b) raises the index to the options maximum when it is lower and writes the rate and the Dec step from it (0x566f8a). This runs before the instantSlew branch too, so an instant start can recompute and store the index, the rate and the step although none of them moves the pointing.
- The callback reads the stored rate once, at the Dec→RA switch of a non-transit telescope (0x5674ff..0x56750f): d = target RA − pointing RA (negated when |d| > 12 h), +0x53e := Extended 0x5678d0 (≈1e−5 h) ≥ |d|, step := Sign(d) × rate × ≈1/3600 / 15. When +0x53e is set, the same callback completes: the RA step is stored in +0x525 but never added, and RA is not snapped.
- The Dec and RA phases add the fixed step +0x525.
- A transit telescope goes from Dec straight to phase 3.
- instantSlew writes the pointing at once (0x566fb3).

The tolerance, the arithmetic and its order are the existing ones (`slewTimerTick` and the gates share `raSwitchSeparation`/`raSwitchFinishes`); nothing is snapped, clamped or added. The Dec phase does not change RA in this slice (manual N/S/E/W and the sidereal clock are not modelled), so the separation at the switch is the one between the current pointing and the target, re-evaluated from the latest state.

`radioLabRateIssues(state, options)` therefore reports:

- `stored`: during the Dec phase of a non-transit slew whose switch takes the RA step (|d| above the tolerance), the rate that step is computed from. Dec callbacks keep running. Only the switch callback is refused with `rate-unsupported` (`radioLabTickRefusal`), and from then on the panel registers no interval. The RA phase, transit slews and switches within the tolerance never add a step from the stored rate, so nothing is reported or suspended there. The host may switch the transit option between phases; the switch decides from the options live when it runs.
- `start`: the rate after the start loop, for the coordinates the next start would use: inside the open dialog, the draft when it is a valid J2000 entry whose OK reaches the confirmation; in the slew confirmation (or the transit note before it), the committed target; otherwise no coordinates are chosen yet, and the note says which coordinates it covers. With instantSlew nothing is checked. On a transit telescope, or when the switch would finish within the tolerance (for example a Declination-only slew), only the Dec step is checked (finite, positive, changing every in-range Dec). Otherwise the full criteria apply, because the same rate gives the RA step at the switch. OK and Yes are refused for those coordinates, and each is checked against the options live at that answer.
- `down`/`up`: a RateSpin press during that same Dec phase, which would store the rate the switch takes its RA step from. That press is refused. These are not listed while a dialog or box is open, because every press returns `modal-open` there.

OK keeps the original order for everything that never starts motion: the option-record check (`radioLabProfileIssues`) still comes before parsing, as before, but the state-context rate check now follows the parse, web-domain and B1950 results. Invalid text gets its own error or browser box, B1950 its gate, an entry equal to the pointing stores the coordinates and gives the no-slew warning, and with limits enabled the coordinates are stored and the clock gate is reported (no clock or altitude authority is assumed). Only an OK that is on the path to a possible start with an unsupported rate for its coordinates is refused, and then nothing is stored: the draft, the stored target and the pointing are kept. "On the path to a possible start" means that OK would go on to the slew confirmation, or, on a transit telescope, first to the transit note whose OK leads to that confirmation; the gate applies before the transit note, not only immediately before the confirmation.

RateSpin presses in the RA phase, on a transit slew, before a switch within the tolerance, and without a slew keep the native arithmetic and are applied. This lets the user step through an unsupported index to a supported one, so a kept or restored rate stays recoverable through the next start's gate. Recovery from a halted switch: stop the slew with Slew ▸ Set Coordinates… while that menu item is enabled, press to a supported rate while the Slew Rate buttons are enabled, or have the host turn the transit option on. Inside the coordinate dialog or a message box the reason says to close it first (Cancel on the dialog, No on the confirmation, Cancel on the transit note, or OK on any other box), because the Slew Rate and Tracking buttons behind it return `modal-open`. The transit note is named separately: its OK does not release the buttons but opens the slew confirmation.

The RA tolerance compares the plain hour values. There is no circular wrap: a pointing at 0 h and a target at 24 h are 24 h apart for this check (|d| > 12 h only negates d), so such a slew takes the RA step from the rate. The notes say so in their wording; the arithmetic is unchanged.

Constraints that remain:

- `trackingVisible` is set at the first FormActivate from the transit option then current and never changes, so a panel that first initialized as a transit telescope has no Tracking button whatever the live options are. Its Slew Rate buttons stay disabled until a programmed slew ends or is stopped. Until then a refused start can proceed under options whose maximum exceeds the kept index (the start loop then recomputes the rate) or with instantSlew; when only the RA step fails under live non-transit options, also with the transit option on again or with coordinates within the tolerance of the pointing RA. Under the web profile no supported record has a maximum above 8, so for a kept index of 8 or more the maximum route is unavailable: the panel then leaves that alternative out and says that raising the options maximum cannot help (it checks the most permissive record, rate base 1, at maximum index + 1 with `isSupportedRadioLabProfile`; presentation only).
- The fixed step +0x525 is not re-checked for a host-supplied state. Review finding 2 (conditional, from source reading) noted that a synthetic `patchAntenna` state with a malformed rate and a zero or negative step, which the earlier rate guard happened to stop, now runs its Dec callbacks without progress or away from the target. No supported UI, import or restoration path producing such a state was demonstrated, so no native step validation is invented; callers that restore antenna state are assumed to supply a step written by `startSlew`.

The panel shows a slew-rate limit note and marks a suspended slew in Motion, naming the cause. When OK or Yes is refused, the open dialog or confirmation box lists the reason for the coordinates it would use. Nothing is clamped or recomputed. These are web policies, not native validation. The whole-option-record profile (`radioLabProfileIssues`) stays a conservative web policy, unchanged by this gate.

Independent Chromium controls did not reproduce the review's suggested Enter cascade after arrival: actual focus was BODY, and held Enter did not change Tracking or the radio switch. That hypothesis is not a confirmed fixed defect; regressions preserve the observed behavior without forcing a new focus target. The coordinator did reproduce timer starvation on Tracking changes and late callbacks replacing the final status; before/after reports remain outside source in `radio-antenna-independent/quota-preservation/`.
