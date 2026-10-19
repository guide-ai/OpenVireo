# I01/Pleiades: recovered clock, count and sky context

Source follow-up: [PHOTOMETER-SOURCE.md](PHOTOMETER-SOURCE.md) ports the bounded separation/point aperture/known-color UBV scalar chain, adds source-position reader witnesses and narrows the lifecycle/persistence gates. The earlier next-blocker list below is historical for those scalar subcontracts; full field/color association and acquisition remain open.

**Result:** timer/count units and filter/telescope bank bindings are recovered for the pinned VIREO edition. The existing supplied-input reduction API is corrected accordingly. A scientifically backed Pleiades acquisition is **not yet enabled**: source aperture/neighbor/color association and complete lifecycle/result contracts remain open. No new photometer screen, observation, session format or classroom completion is claimed.

## Evidence and reproducibility

Target:`CLEA_VEO.exe`, SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`; original archive:`CLEA_Vireo.zip`, SHA-256 `58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b`. [Context manifest](../data/photometry/context-provenance.json) records21 bounded byte/listing ranges,9 exact scalar/table constants, two RTTI field tables and seven source hashes. Original options DFM bytes were checked against the already retained parsed `TOptionsDlg.json` resource hash; component offsets come from the original VMT field table, not guessed DFM order. Scripts and full captures remain outside source:

`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-acquisition-recovery/`

Previously installed Ghidra12.1.4 is documented under `/home/dobleuber/Documents/Codex/2026-10-17/task-2/tooling/ghidra_12.1.4_PUBLIC`; prior static results and `analysis/hubble-acquisition/dossiers/options-defaults.asm`/`environment-create.asm` were reused. No engine installation, setup diagnosis or native decompilation service was needed: this increment used read-only objdump, PE/RTTI byte decoding and retained original artifacts. No CLEA execution, emulation, Windows or Claude was used.

## Recovered criteria

| Contract | Original evidence | Consequence |
|---|---|---|
| Base count | PHOTO-CONTEXT-08/09/10; `TOptionsDlg.BaseCountEd` at+0x3ec; record+0x279f → environment+0x2e53; default literal1000 at0x5a2a88 | This is **base photon count per callback**, not time. The named edit control is linked by its RTTI field, form hint, read binding0x5a58ba–0x5a58ce and write binding0x5a649a–0x5a64a4. |
| Clock | `PhoTimerEd` at+0x3f0; record+0x27a3 → environment+0x2e57; default100 at0x5a2a92; PHOTO-CONTEXT-17 | Timer wait is in milliseconds. Start divides it by exact Single1000 at0x500a01–0x500a0d, stores the Extended seconds increment at self+0x498, and passes the same integer ms value to TTimer's interval setter0x449004. |
| Per-callback update | PHOTO-CONTEXT-18,0x5014ea–0x501588 | Add the seconds increment to elapsed self+0x48e. Independently multiply source and sky amplitudes by **base count**, draw source then sky through the shared Poisson context, and add base count to int32 self+0x4de. No replacement noise model is inferred. |
| Normalization | Earlier PHOTO-STATIC-05,0x501687–0x5016ba; reset0x500beb | `nativeBaseCountSum = SUM(basePhotonCount over executed callbacks)`. Its rate is divided by the requested integrations×seconds, like the measured count rate. Do not substitute elapsed seconds/ms or infer callback count from browser wall time. |
| Integration choices | PHOTO-CONTEXT-05 and exact Extended table0x5b3a40 | Seconds indices0–3 map to0.1/1/10/100; integration slider index+1 gives1–5. Defaults from FormCreate are V(index2), seconds index1 and3 integrations. FormShow installs the actual seconds value. |
| Filter names | PHOTO-CONTEXT-02/05; labels0x4ff87c and0x4ff88c | Order U,B,V,R,I. The original Include R/I option explicitly labels those colors artificially generated. The prospective bounded scientific domain uses U/B/V only. |
| Sky banks | PHOTO-CONTEXT-01/03/19, original+0x58a table | Three banks×five filters,10 bytes per Extended and50 bytes per bank. FormCreate initializes every entry to exact−1. Observatory+0x6fc is copied into photometer+0x6e7; that raw telescope index selects the bank. |
| Telescope calibration | PHOTO-CONTEXT-14,0x53df2c–0x53df58; Start0x500976–0x500982 | Selected telescope index stores at Observatory+0x6fc. Its stride0x93 record correction is added to the supplied base magnitude and stored as Single at+0x6f0. Photometer prepared zero point adds5 and stores Extended+0x483. The API still requires this explicit prepared value; no observed user profile is inferred from compiled defaults. |
| Missing sky/filter switch | PHOTO-CONTEXT-19/16,0x5008fa–0x500914 and0x501e17→0x50052c | Object start is blocked by a negative current sky entry. Filter changes reset the reading/counters through0x500bcc; this is not evidence that all sky banks are cleared. A sky result stores mean rate divided by aperture factor in its current bank/filter. |
| Aperture | PHOTO-CONTEXT-20/21;0x4fef0c and0x5404b3–0x5404cd | Default control sets raw selector10. Radius is `(selector+0.5)/scopeScale` with scale at Observatory+0x41c4b7; selection/change/cancel affect the native geometry. This does not establish complete scene throughput. Existing area ratio remains `((selector+0.5)/10.5)^2`. |
| Fixed sky colors | PHOTO-CONTEXT-02,0x4ff6aa–0x4ff700; exact constants0x4ff864/0x4ff868 | Native V comes from environment+0x2bc4; B=V+1; U=B+the stored Extended0.33; R=V−1; I=R−the same0.33. These are recovered edition parameters, not a new physical sky model. Exact fractions/hashes are retained. |

The options/environment copy uses the already recovered option-record origin+0x6b4: record+0x279f becomes environment+0x2e53 and record+0x27a3 becomes+0x2e57. The supplied distribution contains no observed VEO_OPTS.INI user settings;1000/100 are compiled defaults only. This is distinct from the spectrometer defaults50/1 at adjacent fields.

For10 executed callbacks with a fixed default profile, the base-count sum is10000 while the nominal clock increment is10×0.1seconds. Those quantities must not be interchanged. The added regression uses explicitly synthetic supplied counts to distinguish the two normalizers by a2.5-magnitude error. No Poisson observation or original runtime result is presented as a fixture. Nominal selected duration, actual callback accumulation and browser wall time remain separate.

## Sky validity and initial domain

PHOTOHLP explicitly requires a separate sky reading for each filter, correct reading mode and no star in or near the aperture. It also requires fresh sky after **any telescope change, including return to a previous telescope**. Static storage shows three banks, but the full telescope-change/reentry invalidation path has not yet been certified. Therefore stored banks do **not** authorize automatic sky reuse; the documented requirement remains an acceptance condition. No speculative reset state machine or photometry persistence was added.

The next candidate domain is the pinned VIREO1.504 default profile, valid selected telescope bank0/1/2, U/B/V, default selector10 and original per-filter source/neighbor data. Exclude no-telescope state4 and unchecked high-bit/index values. Require fresh current-telescope sky, unchanged calibration settings, complete aperture context and explicit PRNG/callback state. Keep standalone Pleiades differences separate. This is a **prospective domain**, not a currently supported observing configuration.

The original `PLEIADES.HTL`/`CLUSTERS.DAT` files are binary. Their filenames, apparent lengths and stale padding/pointers do not establish UBV readers or a valid target. No Pleiades star/galaxy distance/fit is filled from an assumed catalog schema.

## Exact next blockers and required evidence

1. **Aperture source contract:** complete0x500568 through its finite return branches, including geometry0x59a49c, caller scale/seeing, callback/context construction0x55f80c and integrator0x55fa24. The existing spectrometer slit fraction or a newly chosen circular/Gaussian formula is not a substitute.
2. **Neighbor flux/color assembly:** complete0x4ffa30, especially0x4ffd19–0x4ffd52 and neighbor loop0x4ffdbb–0x4ffee0 calling0x5953a0/0x595338. Verify original source record fields+0x29/+0x2d/+0x31, missing-color threshold30 at0x4fffd0, valid identities and all aperture contaminants. Do not assume the displayed nearest object is the only contributing source.
3. **Pleiades data association:** trace the actual native reader and source links for PLEIADES.HTL/CLUSTERS.DAT and their U/B/V values/unknown-color policy. Keep original bytes/hashes. This must produce at least one complete pinned target+field/calibration witness before enabling a reading.
4. **Lifecycle and persistence:** finish telescope-change/reentry fresh-sky behavior, auto/manual sky mode, aperture cancel, partial-integration stop, count conversion/overflow, Record0x501e7c and result replay/rounding. Session v7 currently has no photometry observation fields; adding a guessed record would fabricate validity.

No original execution oracle or x87 equivalence is claimed. Static callback ordering and nominal timer conversion are recovered; exact native precision/exception boundaries remain open. Rights remain local research only. I01/E04 remain unimplemented and N03 partial; global package counts are unchanged. There is no new acquisition feature to test in the browser, so no purported observing steps are offered. Existing regressions are recorded in [PHOTOMETER-CONTEXT-VALIDATION.md](PHOTOMETER-CONTEXT-VALIDATION.md).
