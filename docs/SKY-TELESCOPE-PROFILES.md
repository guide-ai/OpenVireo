# Sky acquisition through the three compiled telescopes

19 October 2026. The fixed sky exposure at RA 00:30:00, Dec +00:00:00 now produces calibrated counts with the 0.4m, KPNO 0.9m and Mayall profiles. This is an operational acquisition increment. Source contribution is exactly zero in this admitted field; it does not measure a star, subtract a sky observation or supply a learner redshift.

## Recovered contract and independent evidence

`data/hubble/sky-telescope-provenance.json` binds the original executable (SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`), retained License.rtf/Copyright.txt, five raw assembly ranges, existing field/calibration packets and independent vectors. Original files and analysis remain outside web source. Local research does not authorize public redistribution.

Selected telescope 0x58ba88–0x58bf10 and field parameters 0x53c500–0x53c9d4 bind correction −2/0/3 to native zero points 4/6/9. Reset 0x50df64–0x50e314 prepares magnitude19 sky, Go 0x50f484–0x50f618 skips source preparation in sky mode, and timer 0x50f76c–0x50fa93 accumulates 600 sky channels with multiplier50. Source and sky are added when both exist; sky mode has no source draws, including no draws for invented zero source means.

The independent Python reference reads whole original catalog bands, checks all132 admitted stars and nearest-source order, and proves every source fails the strict angular cut. A nonnull selected source remains available for the native reset metadata copy. Thus no unverified new raster is needed for this exact zero-source field. Decimal100 calibrations and exact integer LCG/low-mean Poisson generate15 trajectories, each checking all600 bins, draws and final seed. The reference imports no production TypeScript and executes no original CLEA code.

| Profile | Zero | Sky mean per channel before time multiplier | Seed1 /100ms total | RNG draws | Final seed |
|---|---:|---:|---:|---:|---:|
| 0.4m | 4 | 0.000001 | 6 | 606 | 3049030739 |
| KPNO0.9m | 6 | 0.00000630957344480193 | 21 | 621 | 2535765786 |
| Mayall | 9 | 0.0001 | 288 | 888 | 2018340905 |

Counts in this table are deterministic browser validation vectors, not observations acquired by original CLEA. Even at the1000ms callback bound the largest mean is5, below the recovered low-mean branch threshold12. Existing photon/RNG kernels and explicit per-segment browser seeds are retained. JS power and Python binary64 reference differ by one ULP for the Mayall mean: an initially exact admission check failed ten tests, then was corrected to a relative4EPS calibration admission guard. The production photon formula was unchanged, and full600-channel vectors still pass. This guard is a browser policy, not an x87 error bound or original equivalence.

## Export, restoration and isolation

Each telescope has an independent sky count/time/RNG bank. Profile changes release the active controller and retain each bank. Raw sky JSON remains version1 for0.4m; version2 for the other profiles requires its telescope index, domain, configuration SHA and scientific proof. Cross-profile files are rejected without replacing confirmed work. Counts and means are reconstructed by replay, never trusted from imported cached arrays. CSV retains the old0.4m schema and uses schema2 with bound telescope/configuration metadata for the new profiles.

Full investigation18 registers `sky09`, `sky4m` and the strict sky-profile proof with observing policy8, only after the new scope is visited. Earlier1–17 readers/writers retain their scopes; restoring an old absent scope preserves the two new banks, whereas an explicit empty18 clears them. Restoration is stopped/deactivated. If no running clock has been created, saving this scope creates a stopped anchor from applied UT/current pointing; it does not use wall time or start a clock. Existing 16MiB investigation,2MiB raw-file,24000 global-event and12000 segment-event budgets and archive capacities are unchanged. Manual measurements and existing stellar/galaxy records remain independent.

## Try the feature

1. Open http://127.0.0.1:5173/#observatory. Inspect/select **KPNO0.9m** using **Telescope profile to inspect or select** and **Use this telescope**.
2. Open **Sky exposure**, select **Activate supported sky field**, then **Start sky exposure** and **Pause exposure**. The displayed profile and calibration follow the selected telescope; the count chart now contains this telescope’s sky acquisition.
3. Save **sky counts CSV** and **sky session JSON**. Reset counts, then restore that JSON: the same counts/time/RNG return deactivated. A raw file from another telescope is rejected while current counts remain.
4. Return to **Observatory**, choose Mayall, acquire sky, then switch back: the KPNO bank is retained. Repeat with0.4m.
5. Save **investigation**, reload the page and restore it. All represented banks and manual measurements return together, stopped. Cancel a file selection or pending restore to retain current work.

The100ms table is reproduced with Playwright’s controlled clock, not a promise that a human mouse click lasts exactly100ms. Browser flows cover all profiles, raw/CSV, strict malformed/cross-profile rejection, old17 preservation, full18 reimport, pending-restore cancellation, manual stellar measurement retention, mobile keyboard use, unsafe clock-gap rollback and reset/seed replay.

## Limits

Only this pinned sky field and compiled fallback configuration are admitted. Arbitrary recentering, cache reload and active focus/reentry/global RNG order remain open; see [the native reentry audit](SPECTRAL-REENTRY-AUDIT.md). No moving photons, refreshed stellar means, native event-loop equivalence or package completion is claimed. I02/I08/I10/P02 stay partial with unchanged original criteria/counts.
