# Mayall Pleiades photometry

> **Front P2 (2026-10-30):** apertures 5–150, the R and I filters, VIREO's sky at large apertures and the superseding 0.9 m / 4 m domain are in [PHOTOMETER-P2.md](PHOTOMETER-P2.md); this page describes the earlier bounded scope, whose contract stays unchanged.

**Domain clarification:** [Native versus port limits and exercise identity](PHOTOMETER-DOMAIN-LIMITS.md) explains the six exclusions and supersedes any unqualified membership wording below. The original list is an exercise/association source, not a membership classifier; all existing numerical and session contracts remain unchanged.

The original compiled Mayall profile now admits ten complete Pleiades object/sky fields in U/B/V with aperture sizes 5/10/15 and the existing 0.1/1/10/100 s × 1–5 integrations. Existing 0.4m sixteen-target and KPNO 0.9m fourteen-target domains remain unchanged. Student transcriptions start blank. Colors, diagrams and fits use the pupil’s explicit entries and confirmations.

## Recovered contract and limits

`data/photometry/mayall-photometer-contract.json` binds original VIREO1.504 executable SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`, the unchanged compiled optical packet, instruction/range hashes, full-field proofs and licenses. Record2 starts at `0x5a3379`; `0x5a33bb..0x5a33c2` stores Single correction3, and `0x5a33c2..0x5a33c9` stores Single seeing1.7999999523162842 arcsec. Selected common base6+correction3 is stored Single9 at `0x53df4f..0x53df5e`. The photometer adds Single5 and stores Extended14 at `0x500976..0x500988`. This is its photometric zero, distinct from the previously admitted spectral zero9. No collecting-area or nominal-diameter scaling is substituted.

`0x4ff8db..0x4ff901` reads selected Single seeing, divides by Single2, stores/reloads Extended, then divides by Single3600 and stores Extended. The prepared width is 0.0002499999933772617 degrees. Shared field/canvas instructions are independent of telescope index; the explicit1arcmin×3 option and936-pixel field retain the previously proved complete positions. All admitted real object queries contain only the selected central source; sky queries are empty. Runtime decoded-profile and central-only guards reject a changed admitted configuration. Existing source-fraction, Poisson and measured-sky reduction kernels are unchanged. Source and sky are summed before reduction.

The bounded all-duration adapter withholds six previous targets. 147993,150112 and150975 exceed the existing1e6 Poisson-mean limit;149142,149656 and151125 exceed the expected int32 total over5000 callbacks. The largest admitted expected5000-callback total is1.900902216e9. Actual per-callback overflow checks remain active. These limits do not claim that shorter exposures are impossible in the original. A session still has100000 callbacks,256 events and128KiB; the complete sample is not promised at all maximum-duration settings within a single journal. No values are clamped or automatically reseeded.

## Lifecycle, manual work and portable sessions

Telescope changes are inactive-only and require new per-filter skies, including return through0→1→2→1→0. They retain consumed RNG/budget, prior readings, notebook entries and confirmed fits, while clearing unfinished/current work. Activation also creates a fresh sky context. If the former target is not admitted, activation explains the switch to the known default before Start. A new seeded session retains the selected profile.

Each reading/color/manual point retains its telescope and aperture. Matching B/V requires the same target, telescope and aperture. Diagrams show per-point settings and warn if stars mix settings; no correction for aperture losses or combining telescopes is supplied. Reconfirming a star’s pair replaces its plotted pair and invalidates fits, while all notebook entries remain.

A history that records a change to telescope2 requires raw owner10 with its additional contract proof, including a new seeded Mayall selection before any activation or reading. Returning to0/1 cannot erase that recorded selection. This follows the earlier raw9 selection-history rule; events are not rewritten to describe only the telescope of final readings. All earlier raw1–9 keep their minimal owners, default arithmetic and deterministic bytes. Raw10 nests in every existing full investigation8–21; no new outer version or cached trusted count is introduced. Restore replays strict bounded events, retains explicit manual work, stops activity and requires activation/fresh skies.

`mayall-photometer-literals.json` supplies supplemental individual Single-operand hashes and complete seven-byte store hashes; it strengthens the original evidence while retaining the released raw10 contract hash. The mathematical reference generator independently decodes the original calibration operands. A maximum-duration reference additionally uses the recovered finite quadrature in Decimal90: the exact analytic Gaussian differs by about4.33e−9 relatively, enough to move thirteen integer counts over5000 callbacks. The finite-quadrature reference matches the 1,900,918,544-count maximum-series reading and seed3746665876. Its earlier analytic diagnostic is preserved; neither is an original-runtime oracle.

Independent Decimal90 analytic geometry/flux and modulo-PRNG/Python-lgamma fixtures cover180 configurations/540 draw pairs. A separate16-reading,128-callback trajectory spans all three telescopes, and a22-reading ten-star B/V sequence supplies browser expectations. A captured actual541-file pre-change OpenVireo writer supplies raw9/full21 bytes plus prior telescope0/1 manual pairs, both fits and partial-work snapshot. These are independent mathematical/earlier-writer checks, not original observations or an executing-original oracle. Number/Math is not x87 equivalence.

Native Pleiades access lotteries, setup/global RNG ordering, site/time/motor effects, VCL reentry, arbitrary pointing/seeing/fields, real blends, R/I, missing colors, native observation-file fidelity and uncertainty remain unadmitted. Original sources and research stay outside web source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-mayall-recovery/`. Local research rights only; no public redistribution. I01/N03/E04 and all64 primary statuses remain unchanged.

[Final verification and independently resolved review findings](MAYALL-PHOTOMETER-VALIDATION.md).

## Try locally

1. Open `http://127.0.0.1:5173/`. Observatory → **KPNO 4m (158\") Mayall Telescope** → **Use this telescope** → **Pleiades photometry**.
2. Activate. Check Mayall, zero14 and seeing1.8arcsec. In Sky pointing acquire V, then B.
3. Choose one of ten enabled targets, acquire B and V separately, and manually transcribe each reading. Select the saved pair and **Calculate B−V**. Confirm a visual model fit only after choosing at least two manual pairs.
4. Save/reimport the photometer JSON and save/restore the investigation. Stop a partial series and verify that it restores without a completed magnitude.
5. Change to0.9m or0.4m and activate. Earlier rows retain named origins, while object Start requires fresh sky. Cross-telescope pairs are rejected. Selecting an earlier profile’s target that is withheld at Mayall produces an explicit reset notice on Mayall activation.
6. On mobile, select targets with the keyboard, cancel an empty entry with Escape, and use a new seed. The new session stays with Mayall and requires new skies.
