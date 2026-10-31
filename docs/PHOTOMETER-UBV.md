# Pleiades UBV observing and saved B−V

> **Front P2 (2026-10-30):** apertures 5–150, the R and I filters, VIREO's sky at large apertures and the superseding 0.9 m / 4 m domain are in [PHOTOMETER-P2.md](PHOTOMETER-P2.md); this page describes the earlier bounded scope, whose contract stays unchanged.

**Three-target follow-up:** [PHOTOMETER-TARGETS.md](PHOTOMETER-TARGETS.md) extends the same verified profile to three original targets with separate saved pairs. The one-target scope below records this earlier increment.

The visual photometer at **http://127.0.0.1:5173/#photometer** now supports **U, B and V**, separate measured sky for each filter, manual notebook entries tagged with their acquired filter, and B−V from an explicitly selected saved B/V pair. No console is required. The same single original target, two complete fields, telescope0 and0.1s integration remain the supported domain.

## Try the feature

For a reproducible new session, keep the initial seed42. If continuing prior work, save it, release the context and use **New seeded session** with42.

1. **Activate Pleiades photometer**. Keep **Photometer filter: V**. At **Sky position**, press **Start integration**; select **Target position** and integrate again. V shows552 photons and9.647121003. **Add notebook entry** starts blank: transcribe your V reading, for example9.647, and confirm.
2. Select **Photometer filter: B**. The previous current reading disappears and the target cannot integrate using V sky. Select **Sky position**, integrate its B sky, then select **Target position** and integrate. The initial sequence gives331 photons and B10.207010255. Confirm your own B transcription, for example10.207.
3. In **B−V from saved observations**, explicitly choose **Saved B reading**(reading4) and **Saved V reading**(reading2), then **Calculate B−V**. **Acquired B−V** is0.559889252, calculated from the photon-derived B and V magnitudes. **Your transcribed B−V** is0.56 for those rounded manual entries. The two sources are labeled separately; neither is filled from catalog color or used to grade the learner.
4. Select **U**, acquire its own sky and target in the same way, and manually record U if desired. After the V/B sequence above, U shows354 photons and10.133643341. An unmeasured U sky cannot be replaced by B or V sky.
5. **Save photometer session**, reload, and **Restore photometer session**. The entire source/sky count history, manual entries and explicitly selected B−V pair replay. The telescope is released: activate and acquire fresh sky for any filter before further target acquisition. Existing saved pairs remain identified historical observations rather than being silently replaced by newer readings.

To test cancellation, open a notebook entry and press **Cancel notebook entry** or Escape: it remains unsaved and cannot become an eligible B/V source. Stop before the sole100ms callback completes creates no reading/draw; Start begins a new integration. Filter and pointing changes are disabled while integrating. Invalid or cancelled/late file reads keep existing confirmed work.

## Original evidence and calibration

[UBV contract](../data/photometry/ubv-contract.json) pins seven byte/listing captures, two exact sky offsets, four calibration constants, supporting source/license/earlier-provenance hashes and the unchanged complete-field fixture SHA-256. Raw artifacts are outside source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-ubv-recovery/`. Existing whole-file population proofs and exact target Single UBV values are reused; no catalog census is inferred from the small preview list.

| Native branch | Recovered behavior |
|---|---|
|0x4ffbd7–0x4ffd52|Native Single V/B−V/U−B source fields prepare B=V+(B−V) and U=B+(U−B), followed by the already ported point aperture and ordered neighbor fold. The selected original target has known colors; no missing-color fallback is invented.|
|0x4ff6aa–0x4ff700|Sky V is the compiled supplied16; B=V+Single1 and U=B+stored Extended0.33. Its exact0.33 value is12174851088648304067/36893488147419103232. Number projection yields16/17/17.33. These are recovered edition parameters, not new physical sky colors.|
|0x500976–0x5009f3|The telescope's base/correction is prepared before filter-indexed amplitude selection: Single6+(−2)=4, then common photometer offset5 gives9 for U/B/V. Exact scalar addresses are0x5a2a06,0x5a31c1 and0x500ac0; compiled V sky16 is0x5a2a10. No guessed independent band zero points are introduced.|
|0x501e04–0x501e17→0x50052c→0x500bcc|Changing filter stores its index and resets the current reading/counters. It does not clear all other filter sky entries. Filter indices are U0/B1/V2.|
|0x5008e0–0x500914;0x501831–0x50186d|Object acquisition gates against the current telescope/filter's sky; completed sky stores only that entry after reference-aperture normalization. A measured V sky cannot calibrate B or U.|

Source Poisson is drawn first, then sky, and the counts are added;1000 base photons and100ms timer units remain separate. The native zero-aperture magnitude30 source leakage is preserved in every sky filter. The original Gaussian table/interpolation, Single source values, explicit PRNG policy, telescope seeing and aperture are unchanged. Number/Math are adaptations, not original Extended/x87 execution equivalence.

Independent references reuse the prior90-digit analytic aperture fraction, then calculate exact-Single/Extended UBV source/sky flux with Decimal90 and integer-modulo PRNG/Python lgamma Poisson references. Three sequential V/B/U seeds verify component counts, draws, final states and Decimal-reduced magnitudes. The initial acquired B−V differs from catalog color because it uses the independently drawn measurements; catalog color never substitutes for either acquired reading.

## State, saved pairs and learner entries

Within one active context, each filter has its own sky bank. Changing filter clears the current result and selects that bank; a return to V may reuse V sky only while that same context remains active. Release, hiding the tab, navigation, save or restore clears **all** current-context banks. Reactivation starts fresh. This retains the existing conservative web context boundary; broader native telescope switching is still not implemented.

Every completed reading retains its filter, target identity, context and exact sky-reading link. A color pair must refer to **confirmed notebook entries backed by available acquired object readings**, B and V respectively, for the same pinned original target. Manual strings alone, sky rows, wrong filters, unknown IDs, missing/nonpositive measurements or another target cannot supply the pair. Pair selection is explicit and saved; the app does not pick newest rows automatically. A restored V observation may be paired with a later B observation after fresh B sky, because the target and fixed calibration profile remain the same.

The readonly acquired color is `acquired B magnitude − acquired V magnitude`. The separately labeled manual color is `your confirmed B transcription − your confirmed V transcription`, using the already recovered student-manual B−V relation. A typo remains the user's transcription; the app does not overwrite it, substitute catalog answers, infer extinction/temperature/distance or award a grade. Manual fields always start blank. Cancel has no notebook mutation. The previously documented distinction from native pre-modal Record mutation remains explicit.

## File compatibility and limits

V-only histories still emit the original **photometer version1** with its original marker and byte ordering. A retained v1 fixture round-trips exactly and replays its original seed/counts/manual value. A history containing filter/color events uses **version2**, its UBV policy and a required UBV-contract SHA-256. A v1 file cannot smuggle new filter/color events under the old marker. Version2 rejects missing/altered proofs, unknown cache/calibration/color fields and invalid event/reading associations. Derived counts and B−V are recomputed from events rather than trusted from a file.

Both formats retain128KiB/256-event bounds, safe terminal event capacity,500-character notes, atomic/cancellable file restoration and released-context saves. Analysis/investigation v7, prior SSP/classification/Hubble sessions and prior V-only observing behavior remain compatible and separate. No backend, dependency, service configuration or infrastructure change was required.

Remaining scope: other targets/telescopes/fields, generated clusters, R/I(which native labels artificial), original report/modal/file fidelity, additional photometric transformations and full exercise/classroom acceptance remain open. I01/N03/E04 remain partial; no complete package or binary equivalence is claimed. Original files/license/hashes are preserved for authorized local research only. No Windows/original execution/microemulation, Claude, installation, publication, push or original-resource upload occurred. [Validation](PHOTOMETER-UBV-VALIDATION.md) records actual-repository checks.
