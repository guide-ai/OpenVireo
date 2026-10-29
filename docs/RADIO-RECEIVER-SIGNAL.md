# Radio receiver signal chain R-RX1 (internal core, no UI)

Status: **internal pure-TypeScript dependency**. It ports the receiver scientific state of VIREO 1.504 `CLEA_VEO.exe` (SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`) from static listings only: the pulsar profile owner, the receiver calibration caches, the shared source buffer `TRadioLab+0x5f7` and its receiver aliases, both constructor paths, a radio-private random stream, the per-frame signal and the timer batch with its sweep/stop lifecycle. Nothing was executed or emulated.

There is no UI, recording, PLR writer, audio, cadence policy, session/CSV/PLR format change, resource change or dependency. No acquisition is enabled and no observation is produced. The increment does **not** close I06, I07, N07 or E06 and does not change the 58-capability counts.

Correction to the plan introduction: I06 is **not** done. The antenna has accepted subflows, but I06 and all of Radio remain partial. Since R-RX6 the Pulsar Parameters Open reads this core's shared buffer through the session and writes nothing, and the window mirrors the shared list cursor (`RADIO-PULSAR-PARAMETERS.md`, PP-05/PP-11); the session action `overwriteReceiverSourceBuffer` models PulsarList1Click and is tested (PP-10, G9). R-RX7 shows the menu item's availability flags as a readout; R-RX8 delivers PulsarList1Click as `File ▸ Pulsar List...` under that web history (`RADIO-ACCESS-OPTIONS.md` WEB-ACC-LIST-01, `RADIO-PULSAR-PARAMETERS.md` WEB-PP-LIST-04). This core itself is unchanged.

Provenance, hashes, cells and tags: `RADIO-RECEIVER-SIGNAL-PROVENANCE.json`. Tags: **[S]** static listing, **[I]** analyst inference, **[D]** resource/DFM data, **[W]** web policy.

## Modules

- `src/core/radioRandom.ts`: radio-private stream, Randomize sites, Poisson draws through `acquisition.poissonDraw`, bounded ledger, shared refusal type.
- `src/core/radioThermal.ts`: thermal record `0x55de04` and Planck kernel `0x55de7c`, Extended decoding helpers.
- `src/core/radioPulsarProfile.ts`: profile owner `0x562a70`, build `0x562b24`, flux `0x5629d8`/`0x562a04`, dispersion `0x5631c0`, sampling `0x562fb0`/`0x562ff4`.
- `src/core/radioReceiver.ts`: the receiver bank and its transitions.

Accepted modules are imported, not changed: `acquisition.ts` (LCG, Poisson), `photometerSource.ts` (pulse integral table and lookup), `numericPolicy.ts`, `hotList.ts` (exact Extended decode), `radioPulsarSelect.ts` (picker), `radioPulsarCatalog.ts` (record type).

## Recovered findings recorded here

1. **Signal frequency multiplier is 1e9 [S].** Signal `0x57409a` multiplies `+0x529` (MHz) by Single `0x57416c` = 1e9 (cell `87de9f55…`) before the Planck kernel. The beam uses a separate Single `0x5736a8` = 1e6 (cell `b1d4fbb2…`). Both literals are kept as stored; the odd 1e9 is not textbook-corrected. The earlier RS-10 note (×1e6) is superseded. Plausibility only [I]: at the defaults the background mean is about 0.8–6 counts per sample. The old thermal holdouts at f·1e6 are primitive ν inputs only; the receiver mean is checked against the new 1e9 controls.
2. **Background constant [S].** K = Int32 `+0x928` / Extended `0x5726b0` (≈1e-10), so 5e10 with the compiled default 5.
3. **Beam and search scalars [S].** `0x5736e8` = 0.5 (positive `+0x92c`), `0x57370c` = 3 (σ multiplier otherwise), `0x5736ac` = 366e6, `0x5736b0` ≈ 57.2957…, `0x5736bc` ≈ 1.17741.
4. **FormCreate batch [S].** `0x5726e8` = 16, `0x5726ec` = 24 (not 40): batch = 1 at H = 16, else Round(24/H).
5. **No-source identifier [S].** ShortString `0x574dd8`, length 20, `No Object Identified` (cell `cdf89e4d…`).
6. **Children share the profile [S]** (`0x57235d..0x572368`) and never run the source refresh (`0x574bbb`), so a child's sky record stays at the compiled 50 K.
7. **In-source [S]**: pointer `+0x4a2` set and `+0x405 > +0x51f` strictly (`0x5737f3..0x573816`); children copy the master flag.
8. **Stop runs repeatedly [S/I].** A pending stop never clears `+0x42d` and the timer batch loop always finishes; frames after the finish column run again and still draw background.
9. **List clear leaves stale data [S/I].** PulsarList1Click `0x567f80` writes only `+0x5f7[0]` on a miss; the next in-source master frame sees a name mismatch and rebuilds from the stale record under an empty name. Static reading, not a runtime witness.
10. **Clock reassociation guard [S]**: `0x565715..0x56571d` skips the block while `[[0x5b5b44]]` is nil.
11. **Frame order inside `0x573790` [S]**: the master's coupling refresh writes position := N inside its own frame, so that frame ends the sweep.
12. **Uninitialised local [S/I].** On the non-recording finish path, `0x573d6f` compares the local `[ebp-0x1c]` with 7 without writing it first. Not ported; no runtime defect is asserted.

## Transitions (radioReceiver.ts)

Every transition returns `{ok:true, bank, events, frames} | {ok:false, error:{kind, detail}}`. Outputs are deep-frozen, inputs are never mutated, refusals are atomic (the input bank and its random stream are unchanged).

| Transition | Native | Notes |
|---|---|---|
| `createRadioReceiverBank(options)` | — | Empty bank. `options` null stands for `0x5bce04` = nil. |
| `openMainReceiver` | Rcvr1Btn `0x567958` | FormCreate when the main slot is empty, then the picker with limit 2. Hit copies the record into the buffer, attaches the main pointer and writes the offset; miss detaches the pointer, clears only the name and keeps the offset. Children are not touched. |
| `addReceiverChannel` | `0x574e90` | Slot 1 then 2; the child's FormCreate (Randomize) runs first, then the master's pointer and offset are copied. |
| `activateReceiver` | `0x5728dc` | `0x5b584c+5` false [W]. A child copies the master's `+0x584` and `+0x56f`; then the beam. |
| `toggleReceive` | `0x5745f8` | Start: clear `+0x42d`, snapshot `+0x579`, source refresh, stamp `+0x499` := `now` (Time `0x40d448` at `0x57499b`; `now` is the caller-supplied stand-in, see the timer section), enable the timer. Stop: `+0x42d` := 1 only. Children follow in slot order. |
| `receiverTimerTick`, `receiverTimerGate` | `0x574ad4` | Gate, H = 16 alternation, batch loop main → slot 1 → slot 2. |
| `stepHorizontal`, `stepVertical` | `0x574518`/`0x574588`, `0x574470`/`0x5744c4` | H halves above 0.5 / doubles below 16 (master propagates); gain halves above 0.125 / doubles below 8, `+0x565` recomputed. At a limit the outcome is `at-limit` (the beep is not reproduced). |
| `reassociateReceiverOnClock` | `0x565723..0x5657cb` | Skipped without a main; else the picker with limit 5 on the main only. |
| `overwriteSourceBufferFromPulsarList` | `0x567f80` | Overwrites or clears `+0x5f7` only; no receiver field, no refresh. The session action `overwriteReceiverSourceBuffer` (R-RX6, WEB-PP-LIST-03) wraps it; since R-RX8 `File ▸ Pulsar List...` calls it under the web menu history (WEB-PP-LIST-04), while the menu item's classroom availability stays unproven (`RADIO-PULSAR-PARAMETERS.md` G9). |
| `copyLiveRadioOptions` | OA-03 live copy | Replaces the live options view; existing caches unchanged. R-RX9 caller: `copyReceiverLiveOptions` (session) after a Preferences close under a numeric authority, refused under a box, Record dialog or capture lease (WEB-RSO-PROJ-01, [RADIO-SIMULATION-OPTIONS.md](RADIO-SIMULATION-OPTIONS.md)). |
| `queryCloseReceiver`, `closeReceiver` | `0x5727e8`, `0x5726f0` | Slot 1 with slot 2 present is refused with the recovered literals. Main close: timer off, profile freed, children closed slot 2 then 1, slot cleared, `0x53a` sent synchronously (`send-0x53a`; handler not ported). Buffer and random stream stay. |

### FormCreate `0x5721d8` [S]

Frequency 600 MHz, step 100 at index 5, vertical gain 1, H = 4 with snapshot 4, sweep width N = Display1.Width − 1 = 400 ([D] DFM width 401; later geometry writers not ported), batch 6, `+0x498` = 1, offset +0.0, search radius 0, receiving false. The main receiver creates the profile owner; a child aliases it. Randomize at `0x572376`. Caches from the options record at creation time: `+0x40f` = Single `+0x924`, `+0x55b` = K, `+0x484` = thermal(`+0x930`), `+0x547` = (`+0x916`/100)², `+0x565` = `+0x53d`·`+0x40f`. Sky record `+0x470` = thermal(Extended 50). A nil options record takes the error path `0x572441`: refused as `options-missing`. Audio `+0x42f` is false [W].

Fields FormCreate does not write (position `+0x3e9`, interval `+0x419`, beam `+0x3f1`/`+0x3fb`, spatial `+0x551`, name `+0x4a6`, in-source `+0x583`, stop `+0x42d`, tick `+0x499`) are `null` until a ported path writes them. No native initial value is claimed for them.

### Source buffer [S/W]

`sourceBuffer.record` is null until the first genuine full copy; no initial buffer contents are claimed or defaulted from the catalog [W]. A miss or list clear writes only the length byte: the web keeps the stale record with `primaryName: ''` and sets `primaryNameCleared`. Receivers hold only `sourceAttached` (the pointer to the single buffer) and read through it, so the alias and live-versus-cached semantics are preserved:

- **Coupling compares the primary name only** (`0x573f78..0x573f91`). A same-name overwrite with different numbers does not rebuild the profile or the sky record; the next Receive refresh uses the new numbers.
- A different or cleared name rebuilds from the aliased (possibly stale) record, only when the master is in source and attached.
- A reassociation miss detaches the pointer; the stale offset and sky record remain until an actual refresh. There is no automatic 50 K reset at detach.

### Beam (display refresh `0x573141..0x5732ed`) [S]

With the **live** options: if f ≠ 0 (and ordered) and `+0x916` ≠ 0, radius = ((366e6/(f·1e6))/D)·57.2957…, σ = radius/1.17741, `+0x405` = 0.5·`+0x92c` when `+0x92c` > 0, else 3·σ. Otherwise the beam fields keep their values. Label formatting (`0x486f4c`, `0x486268`) is not ported.

### Source refresh `0x574ba4` (main only) [S]

position := N; dt = H/N into `+0x419`; batch := 1 at H = 16 else Round(24/H); build the profile with the JD [W: supplied by the caller from the radio clock scenario, WEB-PP-CLK-01 policy; never the host clock]. Hit: copy the name (≤ 20 characters) to `+0x4a6`, sky record := thermal(`s48`), G = 1 if live `+0x92c` > 0, else exp(−(o/σ)²/2). Miss: the literal identifier, sky := 50 K, G := 0. Then the master's pointer and offset are copied to the children.

### Profile build `0x562b24` [S]

- The first build allocates and Randomizes (`0x562ba0`) **before** the null-source test, so a null-source first build still needs a seed.
- Null source: 2000 zero samples, N = cursor = 2000; period, start, D, R, flux, normalization and branch keep their previous (possibly stale) values.
- Otherwise, in order: δ = (J − x3e)·86400; P = x2a + x34·δ; phase = Frac(δ/(x2a + (x34·δ)/2)) (signed, toward zero); start = (J − 2400000) + ((0.5 − phase)·P)/86400; resolved := dt < 0.3P; w = (0.001·s50)/2.35482 unless Extended 0.1 ≥ s50, else the immediate (≈1e-4/2.35482); norm = flux(400) floored to the immediate ≈1e-5 when below the Extended 1e-5 cell (NaN is kept); D = s4c·4150; R = 1/400².
- Loop with t₀ = P/2, t += dt (repeated addition), x = t/P. Resolved: fold frac > 0.5 by −1; z = frac·P/w; area = L(z) − L(z_prev) (z_prev from 0, updated every iteration; the lookup runs even when the gate fails); draw Poisson(norm·area) when |frac| ≤ 0.3, else store 0. Unresolved: n = Round(x − c_prev), draw Poisson(norm·n), c_prev := Round(x). Samples are stored as Single.
- N = Round(Trunc(2000·dt/P)·P/dt), cursor := N.

### Sampling [S]

Next (`0x562fb0`): cursor += 1, back to 1 above N, then current. Current (`0x562ff4`): exactly Single 400 (or unordered) returns the raw Single at the cursor; otherwise index = cursor + Round(((R − 1/f²)·D)/dt) wrapped into 1..N and value = (flux(f)·sample)/norm. The signal path does not call the interpolation routine `0x563098`.

### Signal `0x573f5c` and frame `0x573790` [S]

- Source term only when in source. Master: rebuild if `+0x4a6` ≠ the name behind the pointer, then the next sample. Child: copy the master's offset (`0x573fc1`), then the current sample. G is recomputed with the receiver's own σ and the live `+0x92c`; term = (s·A)·G.
- Every frame: mean = (B₄₈₄(ν)·A + B₄₇₀(ν))·(H·K) with ν = f·1e9, then one background Poisson draw. Result = source + background when > 0, else 0. **Sum then positive clamp; nothing is subtracted.**
- Frame: the master increments its Word position, a child copies it; display row = 110 − Round(signal·`+0x565`) (`null` outside int32, with no clamp). At position ≥ N: a pending stop runs the finish (timer off for the main); otherwise position := 0. Labels, display painting and the record cell are not ported.

### Timer `0x574ad4` [S/W]

Proceed unless Extended 3.5e-7 > now − last (`0x574ae9..0x574afb`; a backward clock is therefore gated). An unset `+0x499` admits the tick [W]. At H = 16, `+0x498` xor 1 and batch = (`+0x498` & 0x7f) + 1 (1, 2, 1, …). The batch count is read once; each iteration runs the main frame, slot 1, slot 2. The loop finishes the batch even after the finish disables the timer.

**Time basis [S].** The timer calls `0x40d448` at `0x574add`; Receive start calls it at `0x57499b` and stores the Double at `+0x499` (`0x5749a0`); an admitted tick stores the new value at `0x574b04`. `0x40d448` is Time, not Now: it calls thunk `0x4083f4` (IAT `0x620fd0` → `kernel32.GetLocalTime`, TIME-IMPORT-IDENTITY.json) and passes only hour, minute, second and millisecond to EncodeTime `0x40d0e0` / TryEncodeTime `0x40d070`, which returns a Double fraction of the local day. The denominator is Single `0x40d0dc` = 86400000 (`fdiv DWORD [0x40d0dc]` at `0x40d0c1`; cell SHA-256 `b07d28ae36d93fdf9c3eb5c71d982cab6d987d4d2ee2d0669372afa10f914937`, extracted directly from the immutable PE section, `analysis/radio-receiver-midnight-20261024/TIME-DIVISOR-AND-MIDNIGHT-CONTROLS.json`, 2026-10-24T06:48:15.647995+00:00). TryEncodeTime admits only integer ms of day 0..D−1 (D = 86400000), so the largest Time value is (D−1)/D. It is distinct from the DateTime Now routine `0x40d47c`. The ported `+0x499` writers are Receive start and the admitted tick.

**Supplied `now` [W].** `now` is a caller-supplied stand-in for Time `0x40d448`, used as given: no wrapping, no host or monotonic clock selection and no cadence. Two caller choices:

- A native-like replay supplies local time-of-day fractions and inherits the backward/midnight gate (regression-tested: after a stamp at 0.99999, ticks at 0.00001, 0.5, 0.99999 and 0.99999 + 3e-7 are gated with stream, profile and stamp unchanged).
- A caller supplying a monotonic day scalar instead (as the synthetic test helper does) takes an explicit web deviation with no native authority.

**Midnight [S/I, conditional].** Assume a fixed stored stamp, the admitted Time domain above, and no other writer resetting `+0x499`. Under those assumptions every tick returns early until a Time value exceeds the stamp by at least 3.5e-7 day (≈ 30.24 ms). Two cases follow:

- **Stamp ≤ D−32 ms (before 23:59:59.969):** a later Time value of stamp + 31 ms or more passes the gate. Natively that requires a same-day or next-day time of day at or after that point.
- **Stamp in the final 31 ms of the local day (D−31..D−1, 23:59:59.969..23:59:59.999):** even the maximal Time (D−1)/D is at most 30 ms later, so no Time value passes the gate. No Time-only recovery is inferred without another reset of the stamp.

These cases are arithmetic over the known predicate and Time encoding. They are not an observed native stall and not a prediction about how often such stamps occur. The full set of `+0x499` writers is "not exhaustively proven" (RX-TIMER-GATING). The scheduler, timer resolution, host clock changes, time zone/DST and x87 evaluation are unknown. Rounding is far inside the 0.24/0.76 ms margins. In the web, closing the main receiver is the existing exit (regression-tested); no new midnight handling is added. No historical or runtime claim is made.

## Random stream [W/S]

One radio-private stream. Randomize sites (`receiver-create-0x572376`, `profile-allocate-0x562ba0`) require a caller-supplied uint32 standing for the QPC low DWORD or GetTickCount; nothing defaults, and no host clock or ambient random source is read. Children reseed the shared stream; a constructor reseeds even when a stream exists; the first allocation reseeds even for a null source; reopening after a main close creates a new owner and reseeds again.

Order inside this ported core: main FormCreate Randomize; child FormCreate Randomize; at Receive, first-allocation Randomize then the per-sample profile draws; then, per batch iteration, the master frame (a coupling rebuild draws first, then its background), slot 1 background, slot 2 background.

**This ordering claim is restricted to the ported pure core.** Full GUI, callback and global RNG reachability (P3) is **not** proved: the native draw interleaving with omitted callbacks (display owner, layout, formatters, `0x561e88`, `0x56588c`) and other global consumers (optical labs) is unknown. Exact native counters and seeds are unknown.

The ledger keeps at most 256 events (profile builds are one aggregated event) and counts all events and uniforms.

## Numeric policy and refusals [W]

- Binary64 for Extended; `Math.fround` for Single stores; Extended cells projected once (exact decode through `decodeHtlExtended`, or the nearest binary64 of the exact decimal expansion). Width Single(0.1) projects to 0.10000000149… and is above the native Extended 0.1 cell. Round = `roundNearestEven` (the compiled control word, as WEB-PP-NUM-01), Trunc = `Math.trunc`, Frac = x − trunc(x) (signed), Exp = `Math.exp`. No x87 parity.
- Refusals (atomic, no clamping). Every refusal is a **[W] bounded web admission limit**. None claims a native error, dialog, exception or loop outcome. The "Native basis" column says only what static evidence supports:

| Kind | Condition | Native basis |
|---|---|---|
| `options-missing` / `options-domain` | No options record / `+0x916` not an integer 0..10000, `+0x928` not int32, a Single field not finite or not Single-representable | `options-missing`: native-sourced, error path `0x572441` (aftermath not ported). `options-domain`: web type/resource limit. |
| `clock-required` | No finite JD for a refresh, or no finite `now` | Web type limit. |
| `profile-period` | P not finite or ≤ 0, or a non-finite phase ratio; dt not finite or ≤ 0 | Native outcome not established; depends on the unknown FPU control word. |
| `profile-active-count` | N < 1 or N > 2000 | Static support at N = 0: the wrap loops at `0x563047..0x563061` never end. N > 2000 would read past the buffer. |
| `profile-not-built` / `profile-normalization-domain` | Sampling before a build / norm not finite or 0 off 400 MHz | Native outcome not established. |
| `integral-boundary` / `integral-domain` | z exactly +5 (the native index-101 read), or z = 5 − 2⁻⁵⁰ where binary64 (z + 5)·10 rounds to 100 / non-finite z | Static support only at exactly z = +5 (the index-101 read). The z = 5 − 2⁻⁵⁰ case is a web binary64 projection edge of the accepted helper (regression-tested); whether native reaches the read for such inputs depends on Extended evaluation and the lookup's own conversion, which are not established. |
| `poisson-mean-domain` | Mean NaN, infinite or > 1e6. | Front R1: 0x55f0f4 has no mean guard [D]. A finite negative mean (a negative area when 0.2P ≤ dt < 0.3P) now follows the native product branch: g = Exp(−mean) > 1, so the draw returns 0 after one uniform (`poissonDraw(…,'native')`, radio only). The remaining refusals are browser limits [W]. |
| `random-budget` / `poisson-numeric` | Draw budget / rejection-branch numeric guard of the existing helper | Web resource limits. |
| `randomize-seed-required` | A Randomize site without a supplied seed | Web limit (the native seed is the QPC/GetTickCount value). |
| `thermal-domain` | T not finite or ≤ 0, ν ≤ 0, exponent outside [1e-6, 700] | Binary64 limits only. Extended `exp` does not overflow at 700, and the 1e-6 floor guards against binary64 cancellation [arithmetic]. |
| `beam-not-prepared` | σ unset or 0 when the spatial factor needs it (Receive before any activation) | Native outcome not established: it depends on the unknown FPU control word, and the native σ before activation is not established. |
| `sample-shift-domain` | \|shift\| beyond int32 headroom | Web type limit. |
| `receiver-unavailable` | No main/slot; Add while the timer runs or with both slots used; Mode while a stop is pending **and** the timer still runs; horizontal step while the timer runs | The native control is disabled (RC-REC-09); no direct-callback guard is claimed. |
| `close-refused` | Slot 1 close while slot 2 exists | Native-sourced: close query `0x5727e8` literals; the message box is not shown. |

**Coupling refusal [W].** When a coupling rebuild hits `poisson-mean-domain`, every tick refuses atomically. Stop is accepted but cannot reach the sweep finish, and Mode, Add and the horizontal step stay refused. Closing the main receiver recovers (regression-tested: buffer and random stream kept, slots, profile and timer cleared). A reassociation miss or restoring the old buffer name are inferred exits. They follow from the existing name-compare and in-source contracts and are not separately tested here. This is the approved bounded choice, not a newly alleged native defect. An abort/recovery policy is a prerequisite before any UI.

The coordinator's own external diagnosis (`PROFILE-WEB-DOMAIN-REPORT.json`, 2026-10-24T06:12:03.820Z; JD 2451545, dt 0.01, explicit row seeds) admitted 519 resolved and 34 unresolved rows and refused 5 as `poisson-mean-domain`. Those 5 had a negative first-sample area; since Front R1 (2026-10-29) they take the native negative-mean branch above and are no longer refused. This is an observation of this web port, not a native oracle. No rows are embedded.

Gates are bounded web admission where the native UI disables the control (RC-REC-09); no native direct-callback guard is claimed. After the finish disables the timer, a new Receive is admitted and clears the stale `+0x42d`. Options are kept distinct as supplied, cached (per receiver at FormCreate) and live (`bank.options`). Original host, locale, JD owners, Randomize counters and callbacks stay explicit unknowns.

## Tests

- `radioThermal.test.ts`: cell decoding, the 1e9 signal-literal controls and background at A = 1, H = 4, K = 5e10; primitive-ν holdouts; domain refusals.
- `radioRandom.test.ts`: the three independent Poisson/LCG control sequences, seed requirement, mid-session reseed, atomic mean refusal, ledger bound and freezing.
- `radioPulsarProfile.test.ts`: nearest-binary64 cells, constructor fields, the 12 scalar controls (period, signed phase, start, branch, N, normalization, including the Pdot, dt = 0.3P, N = 0, Single(0.1) and flux ≤ 0 cases), phase fold holdouts, flux and delay holdouts, the 14-row wrap table, raw 400 MHz path, null-source and first-allocation Randomize, resolved gating by integer residues, unresolved ties-to-even, negative-mean, +5 and period refusals, the null-build `resolved: null` pin, the z = 5 − 2⁻⁵⁰ binary64 projection edge (one ulp wide), freezing.
- `radioReceiver.test.ts`: defaults and caches, options refusals, child alias/reseed/caches, live beam, 1e9 background mean control, sum-then-clamp, strict in-source with children, same-name / different-name / cleared-name coupling, reassociation, timer gate including a backward clock, the native-like time-of-day midnight replay (gated, stream/profile/stamp unchanged), the k/D Time-fraction boundary (stamp D−32 admitted at the maximal Time, D−31 blocked, ticks across midnight gated, main-close exit) and the six independent N1 vectors. Gate algebra only; not a runtime or recovery-time witness; H = 16 alternation, sweep entry/reset, stop with the remaining batch and restart, JD refusal atomicity, coupling `poisson-mean-domain` atomicity with Stop unable to finish and main-close recovery, Add/steps/close cascade and reopen, deep freezing and an import boundary.
- `radioPulsarProfile.original.test.ts` (optional, `OPENVIREO_PULSARS_DAT`, skipped by name when unset, SHA-256 checked): independently counted input domains, N = 0 rows per H from `periodGreaterThan5H`, and a full build at dt = 0.01 with a synthetic scenario JD 2451545.0 asserting invariants and bounded refusal kinds only (no aggregate refusal counts are hardcoded beyond the independent N = 0 count). No rows are embedded.

The controls are independent math checks, not a native oracle; the lifecycle tests check this implementation's contract against the cited listings.

## Gaps (not done)

Ported since by R-RX2 ([RADIO-RECEIVER-MONITOR.md](RADIO-RECEIVER-MONITOR.md)): the display owner `0x5720cc`/`0x572130`/`0x5721a8`/`0x5721c4`, Paint `0x572a20` (called at Receive start), the parameter refresh text and the beam formatter `0x486f4c`, the Freq and Freq Incr. handlers with the `0x572e24` annotation, the UI time basis (WEB-RX-TIME-01), the 40 ms cadence (WEB-RX-CAD-01), the seed policy (WEB-RX-SEED-01) and the coupling-refusal policy (WEB-RX-ERR-01). Corrections there: `+0x583` is also written by every parameter refresh (F4, so Activate sets it); Add Channel with no empty slot creates nothing instead of being refused; the close event is `send-0x53a` (synchronous dispatch, recipient not modelled).

- Layout `0x574fa4`, Resize state propagation and window states; `+0x423`; the `0x57724c`/`0x576c28` audio effects (anomaly PRE-01).
- Record, Identify/Properties, Save writer `0x56b36c`, the `0x5bcca0` list (1600 vs 1601), result-7 handoff; audio (`+0x42f`, `0x5b584c`); the `0x53a` handler's effect.
- Pulsar Parameters integration with the shared buffer and the shared list cursor: done by R-RX6 within the ported flows as a read-only Open and the mirrored cursor (`RADIO-PULSAR-PARAMETERS.md` PP-05/PP-11; WEB-RX-PP-01 superseded). Still open there: the PulsarList1 menu item's classroom availability (PulsarList1 availability, G9; PulsarList1Click is delivered by R-RX8 only under the web menu history, WEB-PP-LIST-04), and cursor movers that are not ported.
- The TRadiOptsDlg dialog, the 982-byte settings reader, Reset/Cancel/WM_CLOSE and options `0x91e`/`0x939`/`0x93f`.
- P3 (full callback/global RNG reachability), historical CW/FPU, Randomize counters, host OS predicate, locale, JD/offset owners (`0x5bad48`), native exception aftermath of the refusals.
- Other `+0x499` writers, Windows timer/message scheduling, host time changes and time zone/DST; the native σ before activation (the generic InitInstance zero-fill `0x404f1c` is recovered, but its link to receiver creation is not closed; the web refuses unset or zero σ); the native outcome at z = 5 − 2⁻⁵⁰.

## Review resolution (2026-10-24)

Source: `analysis/radio-receiver-signal-20261024-review/review.txt`; findings independently verified in `analysis/radio-receiver-signal-fixes-20261024/VERIFIED-REVIEW-FINDINGS.json` (2026-10-24T06:21:30.830Z). Corrections applied in this delta, comments, tests and documentation only (no runtime, API, guard or error-detail change):

- **F1 (time basis):** `now` and `+0x499` are relabelled as Time `0x40d448` (local time-of-day fraction), not Now `0x40d47c`. The native-like versus monotonic caller choices are stated under [W], the midnight case is a conditional [S/I], and a midnight replay regression was added.
- **F2 (`resolved` comment):** the field is null until the first non-null-source build, and a null-source build keeps the previous value. The behaviour already matched; the comment was corrected and the null-build test now pins `resolved: null`.
- **F3 (refusal basis):** all refusals are [W], with a per-kind native basis. Static hazard support is claimed only for N = 0 and exactly z = +5.
- **Nits:** the spatial-factor σ comment no longer claims unowned or zero memory; the `RadioRandomCursor` export note was corrected; the z = 5 − 2⁻⁵⁰ edge and coupling-refusal recovery regressions were added.
- **Not adopted:** the review's InitInstance zero-σ claim. No InitInstance source was independently recovered, so no native initial σ is claimed. (Later R-RX2 recovery: generic `0x404f1c`, `runtime-init-instance.asm` SHA-256 `f041bdb1cacec85660922fcdc29daaab2ecf2531ce0fe85b9fec7d9eeb1de543`, copied from `RECOVERY-PROVENANCE.json`, not recomputed; the receiver creation link is still not closed, so it remains not adopted and no native initial σ is claimed.)
- **N1 (final-review wording):** source `analysis/radio-receiver-signal-fixes-20261024-review/review.txt`; controls in `analysis/radio-receiver-midnight-20261024/` (`TIME-DIVISOR-AND-MIDNIGHT-CONTROLS.json` SHA-256 `f6d28d8811446da54692ba226ef8cf8ce610352d4ac095219fb5ad97d0a91063`, `MIDNIGHT-N1-VERIFICATION.json` 2026-10-24T06:49:29.997Z, SHA-256 `fccd1e835a652b75f740cee8be63e5ef85c973d5f8248a474eed1d271c451902`; digests from `MIDNIGHT-INPUT-HASHES.json`, 2026-10-24T06:54:24.434404+00:00, copied, not recomputed). The universal "about 24 h" recovery wording is replaced by the conditional gate statement, including the final-31 ms case, and the `0x40d0dc` divisor now has its own cell hash. Docs and a test only; no runtime, API, guard or error-detail change.

The first internal R-RX1 acceptance is recorded by the coordinator at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/radio-receiver-signal-validation/RADIO-RECEIVER-SIGNAL-LOCAL-ACCEPTANCE.json` (2026-10-24T07:09:49Z). The R-RX2 changes to this module are pending their own review. This section does not assert that the module or the project is done.
