# A06 inclusive stored-coordinate arrival refinement

The programmed return after40 manual callbacks now completes. This bounded follow-up removes only the port-added32EPS rejection around the zero arrival boundary. It retains the original inclusive crossing operators evaluated on stored JavaScript Number candidates and targets. It adds no tolerance snap, delayed alternate trajectory, higher-precision runtime, simulated FPU or moving-source acquisition. The native procedure uses Extended stores; binary64 results and callback counts are explicitly a web contract, not original x87/VCL equivalence.

## Static provenance and comparison contract

The unchanged native contract is `data/observatory/telescope-motion-contract.json`, SHA-256 `d28bdc96af0d9c67e2600a5a3dbed38d6b542875d9bc01582b4fb32052c670d6`. Original VIREO1.504 PE SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`; program-timer range `0x5395cc..0x5399df` exclusive, byte SHA-256 `25b9a97db496ffc8d05e7f5105b5287a285219097313d1baf251e0c3c453e8f0`, listing SHA-256 `a54bfba2f1e3d2d4f56d75fe059b852d870be5b86483414fb1fda906b8a25b9c`. All were rechecked locally without original execution or new downloads/copies. Original license/copyright identity remains in the base contract and notices; no additional redistribution rights are inferred.

| Evidence | Original static path | Resulting operator |
| --- | --- | --- |
| A06-ARR-01 | `0x53972c..0x539774`: positive Dec candidate TBYTE store/reload before comparison; JA skips while target>candidate | Snap to target when candidate>=target. Equality is included. |
| A06-ARR-02 | `0x539776..0x5397be`: negative Dec TBYTE candidate; JB skips while target<candidate | Snap when candidate<=target, including equality. |
| A06-ARR-03 | `0x539802..0x539869`: positive RA candidate stored before candidate-target; Single0/12 comparisons, JB/JAE skips | Accept directional cross in `[0,12)`, before RA normalization. |
| A06-ARR-04 | `0x5398a3..0x53990a`: negative RA stored candidate, target-candidate | Same inclusive lower/exclusive upper window. |
| A06-ARR-05 | `0x539632..0x53970d`: both axis flags checked at callback entry | Completion cleanup is the next callback after both flags become done. |

Research root: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/a06-arrival-refinement/`. `arrival-evidence.json` binds stores/operators and the preserved base hashes. Original byte listings remain in the preceding external research directory. New `arrival-reference.py` is a separate Python binary64 evaluator sharing the port contract operand and operator order; its64 synthetic vectors and generator SHA are retained in `tests/fixtures/telescope-arrival-number-reference.json`. They cross-check the declared Number policy across languages; shared operator/operand mistakes can pass both implementations. They omit setup/no-op guards, which have separate tests, and are not original observations or a native oracle. The fixture binds the unchanged native contract SHA and pinned external generator SHA in a unit assertion. The54 earlier exact-rational reference vectors and their independent generator remain unchanged; their four half-turn withdrawals are still asserted.

## What changed and what is still withheld

The earlier near-zero check could reject an exactly representable equality or a small positive/negative remainder before testing the recovered inclusive operator. The port now tests the stored Number candidate directly. A target one representable value beyond an un-crossed candidate is not snapped early. RA normalization and the original before-wrap arrival ordering are retained. No callback count is chosen in advance or taken from a catalog.

At finder/default4×,40 North callbacks from RA0.5/Dec0 produce Dec0.2222222222222223 in binary64. The first return callback leaves positive Dec5.551115123125783e−17 and does not finish the Dec axis. The second crosses and copies exact target0; the third performs cleanup. This demonstrates why replacing the guard with an epsilon snap would be a different behavior. Native Extended arithmetic may produce a different trajectory/callback count; it has not been run or emulated.

Setup near the initial Extended1e−5h tolerance, unresolved12h subtraction and connected±85°/clock/batch limits can still withdraw a request or batch. The retained RA upper-window check is defensive: it is not reachable from the admitted shorter-path constructor; its pure test deliberately uses a hand-built state. Mathematical pole uncertainty belongs to the separately tested unconnected recurrence; the connected±85° limit excludes it. Direction/axis admission, manual multiplier, rates, optical inputs, measured spectra, source-plus-sky counts, photon/RNG and pupil entries are unchanged. A06 remains partial; native timing/options/global reentry and classroom acceptance remain open.

No session schema/version/proof is changed: outer22 stores only stopped prior pointing/clock owners plus strict rateIndex. It contains no active arrival algorithm, command, flags or callback count. Earlier snapshots are restored stopped; changing runtime arrival admission does not reinterpret their saved measurements. The unchanged1–21 base/22 proof and existing raw photometer formats remain validated. This follow-up does not change import schemas. The proof packet precision sentence predates the narrower arrival admission; A06-ARR-01..05 here amend its runtime scope without changing its immutable hash.

## Exact manual steps

1. Open `http://127.0.0.1:5173/#observatory`, open the dome, expand **Enter coordinates**, enter RA0.5 and Dec0, then **Point to coordinates**. Keep **Finder · 2.5°** and **Manual motion multiplier 4×**.
2. Expand **Observatory clock & spectral tracking** and turn tracking on. Focus **North** and hold Space for about800ms, then release. Exact40-callback reproduction uses the controlled Playwright clock; human timing need not hit exactly40.
3. Keep draft0.5/0, select **Slew to coordinate draft**, first **Cancel slew** and verify unchanged pointing. Select it again and **Start programmed slew**. It now finishes at0.5/0 and the shared clock can continue. Timing details show committed web callbacks, not native timer evidence.
4. **Save investigation**, reload, **Restore investigation JSON**, then save again. It restores stopped with the same multiplier/pointing and retains observations. The browser regression also rejects a running-field edit atomically without replacing confirmed work.
5. RA25/Dec86 still reject before confirmation; a draft offset of1e−5h from the current RA can still be withheld by the initial-tolerance guard. These retained boundaries are separate from the corrected arrival.

Current review and exact final verification are maintained only in [A06 validation](TELESCOPE-MOTION-VALIDATION.md#read-only-review-and-current-resolution-state). After explicit human authorization, one retry of the same native review completed successfully with effective Opus5.5/high and 33 read-only calls. All eight observations and their independent resolutions are recorded in the validation document; no second external sign-off on post-report changes is claimed.
