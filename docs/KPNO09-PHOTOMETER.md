# KPNO 0.9m photometer observing

**Follow-up,19 October2026:** [Mayall Pleiades photometry](MAYALL-PHOTOMETER.md) now adds a separately bounded ten-target profile. Earlier Mayall gates below describe the dated preceding increment; existing telescope0/1 contracts remain intact.

The existing Pleiades photometer can now acquire through the compiled KPNO 0.9m telescope profile. It supports fourteen verified original targets, U/B/V, aperture sizes 5/10/15 and the existing 0.1/1/10/100 s × 1–5 choices. The 0.4m profile retains all sixteen targets and its original numerical/serialization paths. No catalog value is copied into a student entry.

This is a complete bounded observing flow: select the telescope, activate, measure each filter's sky, select a target, acquire, manually transcribe, explicitly pair B/V, inspect the manual diagram and save/restore. A telescope change requires fresh filter skies, including return to a telescope used previously. Retained readings and manual values keep their original telescope; selection of a new observatory profile does not relabel them. B/V pairing requires the same target, aperture and telescope. No cross-telescope or aperture-loss correction is supplied, so observing settings must be considered when interpreting a manually chosen cluster fit.

The final interface names the telescope on every retained reading, notebook row, color option and manual diagram point. Both diagrams warn if points mix telescope/aperture settings. Each star uses its most recently confirmed pair; replacing it retains all notebook entries and invalidates the earlier fits. Mayall cannot create a new photometer session. [Final validation and independently resolved review findings](KPNO09-PHOTOMETER-VALIDATION.md).

## Recovered calibration and admitted domain

`data/photometry/kpno09-photometer-contract.json` binds the original executable SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`, compiled optical packet, procedure/byte-range hashes, field proofs, help, licenses and explicit browser boundaries.

The record-1 constructor at `0x5a327a..0x5a32cc` stores scope correction 0 and original Single seeing 1.7999999523162842 arcsec. `0x53df4f..0x53df58` adds the correction to the common base magnitude and stores Single 6. `0x500976..0x500982` prepares photometer zero point 11 by adding 5. `0x4ff8db..0x4ff8fb` reads selected-telescope seeing, divides by Single 2 then Single 3600, and stores the prepared width. The existing recovered Gaussian-table, point-fraction and known-color kernels are reused; no new PSF or noise model is introduced.

The explicit 1 arcminute field option × 3 multiplier gives the same 0.05°/936-pixel cached field. Shared field-area/frame instructions at `0x53bed7..0x53befe` and `0x53c53e..0x53c554` use those common options/canvas dimensions rather than telescope index. The unchanged complete-position witnesses cover all three original field packets and auxiliary-catalog absence checks. Real object queries remain central-only and real sky queries empty. Synthetic blend tests do not admit contaminated fields.

Two existing 0.4m targets are withheld in this 0.9m all-duration profile: `N2230.DAT@147993` would have an expected maximum 5000-callback total of about 4.004687e9; `N2230.DAT@150112` additionally exceeds the existing 1e6 Poisson-mean adapter bound. This does not claim that the original program could not observe them at shorter exposures. They remain available at 0.4m; no count, magnitude or mean is clamped. The largest admitted expected 5000-callback total is 1.198331e9. Actual per-callback int32 guards remain necessary and active.

The original PHOTOHLP.TXT, SHA-256 `aaf7f6827f418cf1aa1e2da70185b96ecf96ffd919899d84547a8695afa42d8a`, explicitly requires new skies after any telescope change, even on return. Native three-telescope/five-filter bank addresses are retained in the contract. The web adapter conservatively clears current filter banks on release/change; it does not claim the original internal clear order or VCL reentry behavior.

## State, provenance and compatibility

The inactive-only telescope event retains RNG, consumed callback budget, prior readings, notebook entries and confirmed fits. It clears current/unfinished work and current filter skies. Explicit activation retains an admissible target; otherwise it selects the known default for fresh sky and explains why. No photons are produced before Start. New seeded sessions retain the selected supported telescope. The existing unrestricted observatory selector is used; native Pleiades access lotteries, motor/site/time effects and global setup-RNG order are not reproduced.

Absent telescopeIndex means 0 in old states/readings/work/colors/points. New telescope history requires minimal raw owner 9 with its additional contract proof; the current telescope returning to 0 does not erase its earlier history. Raw owners 1–8 retain their prior default paths and deterministic bytes. Full investigation versions 8–21 embed the new journal in the existing photometry scope, without a new outer owner or trusted cached counts. Every reading, color and derived manual point retains telescope provenance. The UI distinguishes the selected observatory telescope from the owner of retained work, including old files whose telescope field is absent.

## Verification and limits

Independent Decimal90 analytic geometry/flux and modulo-PRNG/Python-lgamma references cover 252 new configurations and 756 draw pairs, including a sky mean above the native product/rejection threshold. A ten-reading, 66-callback 0→1→0 trajectory contrasts mixed durations/apertures, own-duration/reference-area sky reduction and continuous explicit post-setup seed. A separate thirty-reading, fourteen-target B/V sequence supplies independent browser expectations. These are synthetic mathematical fixtures, not original observations or an original-executable oracle.

The actual 527-file pre-change OpenVireo writer was separately captured before integration. Its rich raw8/full21 fixture retains prior manual pairs, both fit kinds and partial work, along with its derived scientific snapshot and writer-source hash. Compatibility checks compare current results and exact bytes against that independent earlier writer.

Original downloads, static listings, generators and validation receipts stay outside web source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-kpno09-recovery/`. Number/Math is not x87 equivalence. Mayall photometry, arbitrary pointing/seeing/fields, the two shorter-exposure 0.9m variants, R/I, missing colors, real blends, native setup/timing/access and full observation-file fidelity remain unadmitted. I01/N03/E04 and all 64 primary package statuses remain unchanged. Local research rights only; no public redistribution is authorized.

## Try locally

1. Open `http://127.0.0.1:5173/`. In Observatory choose **KPNO 0.9m (36") Telescope**, then **Use this telescope** and **Pleiades photometry**.
2. Activate. Verify the selected/retained profile readouts. Keep Sky pointing; choose V and **Start integration**, then B and start again to measure both skies.
3. Choose an enabled target, which moves the bench to Object. Acquire B and V separately. **Add notebook entry** starts blank each time; transcribe the value you read. Explicitly choose the saved B and V readings and calculate B−V.
4. Visit Observatory and select 0.4m, then return and activate. Prior notebook rows retain telescope 1. Object Start remains unavailable until a fresh sky for the current filter is measured. Mixing B/V from different telescopes is rejected even at the same aperture.
5. Save/reimport the photometer JSON and save/restore the full investigation. Stop a partial series and verify its counts/seed restore without fabricating a completed magnitude. Invalid proofs, unsupported telescope indices and cancelled late reads leave prior manual work intact.
6. On mobile, use keyboard target selection and cancel a blank entry with Escape. A new seeded session stays with the selected supported telescope and requires fresh sky.
