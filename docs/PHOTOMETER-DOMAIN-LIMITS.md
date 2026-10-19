# Photometer limits and exercise identity

This increment explains the six existing Mayall exclusions and the scope of the original exercise list. It changes no calibration, numerical kernel, target domain, session event/owner, reading or measurement. The existing 16/14/10 target domains at 0.4m/0.9m/Mayall remain intact. Student transcriptions remain blank and manual.

## What is native, and what belongs to OpenCLEA?

The original VIREO 1.504 executable has SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`.

The complete recovered Poisson routine `0x55f0f4..0x55f325` switches at mean12, uses an Extended cache, checks nonnegative candidates and the exponent cutoff, and returns an Extended count after QWORD truncation. There is no 1e6 mean admission in that complete routine or the recovered photometer callback `0x5014ea..0x50158e`. OpenCLEA’s `poissonDraw` explicitly introduces that per-draw ceiling as a Number/Math protection. This bounded-path result does not establish every option, exception or caller of the original program.

The original photometer *does* enforce a counter ceiling. `0x50158e..0x5015b9` compares the actual source+sky period count against Extended2147483647 at `0x50198c`; `0x501621..0x50163f` checks the cumulative total. Equality is allowed. Overflow calls `0x5019a0`, whose message recommends shorter integration time, fewer integrations or a smaller telescope. The checks precede QWORD conversion through `0x403700` and DWORD period/cumulative stores at `0x501649/0x501658`. Poisson’s int64 conversion and the photometer’s guarded int32 storage must not be conflated.

Thus none of the six exclusions is an astronomical classification or proof that the original can never observe that star. OpenCLEA additionally applies a conservative *whole-profile* admission: each listed Mayall target must fit its declared expected-count domain across U/B/V, sizes5/10/15 and all existing duration/repeat choices. Native overflow checks actual stochastic counts; a preflight based on expected totals and an all-settings target whitelist is a port policy. Actual count, precision, draw-budget, replay and session guards remain active.

## Six retained exclusions

These approximate independent analytic expectations are not observations. The maximum is over all bands/apertures, with the longest series100s×5 =5000 nominal100ms callbacks. Source and sky are summed. Exact Gaussian and recovered finite-quadrature arithmetic can differ at the previously documented small relative scale; none of these six decisions is near that uncertainty.

| Original list label | Largest combined callback mean | Expected longest total | Primary current reason |
|---|---:|---:|---|
|01803-01585 /147993|1.2694004e7|6.3470019e10|Port per-draw mean bound|
|01800-01908 /149142|4.3645442e5|2.1822721e9|All-settings admission / native actual-count ceiling|
|01804-02081 /149656|8.6227594e5|4.3113797e9|All-settings admission / native actual-count ceiling|
|01800-02202 /150112|4.2422497e7|2.1211248e11|Port per-draw mean bound|
|01800-02207 /150975|3.7984526e6|1.8992263e10|Port per-draw mean bound|
|01800-01601 /151125|6.6042331e5|3.3021165e9|All-settings admission / native actual-count ceiling|

Each callback draws source and sky separately; the 1e6 port limit applies to each draw, not their sum. The proof and UI distinguish individual draw maxima from combined callback means, show the band/aperture of the maximum combined mean, and compute its total as combined mean×5000. All six expected longest totals exceed int32. Three also exceed the port’s per-draw ceiling. For the other three, conservative analytic 100s repeat bounds are4/2/3; that does not supply original-runtime acceptance, a stochastic guarantee or a newly implemented route. Their expected single-callback totals are below the original counter ceiling. Reducing duration cannot fix the port’s per-draw mean restriction, and selecting a shorter duration does not bypass the existing whole-profile admission.

The decision here is to retain all six exclusions, clearly attribute their origins and close the explanation. No sampler limit is raised, count is clamped, alternate calibration invented or shorter-series subdomain enabled. A different admission contract would require its own evidence, state and compatibility work. Already admitted smaller telescope profiles remain available.

## A list association is not a membership result

`PLEIADES.HTL`, SHA-256 `f992103946e8f809ac9bb6806fafa6424933ba6e78cfee6fb5740e4ab3b038a2`, contains24 records of86bytes. Reader `0x590424` fixes the stride; `0x591e99..0x591ed5` copies Extended pointings from+0x19/+0x23. The audit independently checks original names and pointings for all16 currently bound catalog associations. Their decoded RA range is3.6883333–3.8323777h and declination23.42114–25.09881°. This position/identity evidence is not a physical membership determination.

Only the name/pointing subset is recovered here; the remaining hotlist schema is not fully decoded. Neither the list’s filename, inclusion, position nor exact GSC association establishes cluster membership, spectral type or stellar history. The UI now says **Measure a listed star**, qualifies the exercise list and repeats that limitation beside manual diagrams. The historical “Pleiades photometry” exercise/navigation name and existing session identifiers remain for compatibility.

The photometer admits only its fixed list. An Observatory selection, the distinct stellar classification field or an imported spectrum cannot become a photometer target or acquire a Pleiades label. The UI explains the separate field selection, and a real browser flow starts the other-field stellar instrument before checking the unchanged exercise target. Foreign-field event injection is rejected without replacing manual work. No catalog membership or classification is supplied to the pupil.

## Evidence and manual checks

`data/photometry/photometer-domain-audit.json` binds original source/license hashes, seven complete static ranges, the Extended ceiling operand, unchanged scientific inputs, six numerical explanations and sixteen list associations. The inspectable `summarize-means.py` recomputes all six explanations from 288 Decimal90 analytic rows across sixteen targets, without taking contract means as inputs. This reuses the previous independent reference and original-operand decoder; matching previous contract values is not a second independent recovery or a native writer/runtime oracle. The newly bound callback input subrange has its own SHA-256 and lies inside the complete timer range. no original program, instruction emulator or new noise model is run. Raw listings/generators remain outside web source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-limits-recovery/`. Local research rights only; public redistribution remains unapproved.

1. Open `http://127.0.0.1:5173/`. Observatory → Mayall → **Use this telescope** → **Pleiades photometry**. Read **Measure a listed star** and the exercise/membership note.
2. Activate. Inspect the disabled options: three name the OpenCLEA mean bound; three name the all-settings count rule. Expand **Six Mayall exclusions in the current OpenCLEA profile** beneath **Why are six Mayall targets unavailable?** to compare the six rows and native/port explanations.
3. Select0.1s: those options remain unavailable. No smaller-time acquisition is silently fabricated. Choose an admitted target, measure V/B sky, acquire Object through each band and manually transcribe both values. Confirm B−V; inspect the membership limitation near both diagrams.
4. Save/reimport the photometer and full investigation. Earlier readings, drafts and pupil values remain; no event or proof owner is changed by opening the evidence panel. Invalid foreign-field imports keep existing work.
5. Activate **Star exposure** for its separate field, then open photometry. The fixed list/default target and its own RA/Dec remain; the Observatory star is not relabeled. On mobile, use the keyboard and the local table scroll; no horizontal page overflow is expected.

[Final review, verification and compatibility evidence](PHOTOMETER-DOMAIN-LIMITS-VALIDATION.md).
