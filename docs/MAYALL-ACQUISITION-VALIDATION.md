# Mayall acquisition validation

Validated locally on 2026-10-19. This increment admits the compiled Mayall telescope for the one verified star and three verified Hubble galaxies. I02, I08 and P02 remain partial; their original acceptance criteria and the 64-package status inventory are unchanged. Only those three package progress/evidence entries changed.

## Delivered behavior

- Independent Mayall stellar and three-galaxy journals, reconstructed fields/slits, original zero point 9 and paint shift 3. No area-based replacement calibration.
- Manual analysis and Hubble entry from those acquired spectra, with profile-specific raw CSV/JSON, existing normalized SSP export/reimport, and stopped restoration. No catalog measurement or magnitude is inserted for the student.
- Full investigation v14 preserves all twelve current acquired target/profile kinds and manual measurement rows. Its archive bound is twelve; old versions retain eight. Existing replay/event/file limits remain unchanged. Missing Mayall scopes in old backups preserve stopped current work; explicit empty v14 replaces them.
- The existing rejection sampler is exercised at means above 12. Its unresolved exact-midpoint precision guard pauses and rolls back the whole interval, with an explanation and an explicit user-controlled seed reset.

## Checks

`npm run build` runs TypeScript project checking and Vite production compilation. `npm test` passes **441 tests in 64 files**. `npm run test:e2e` passes **96 complete browser flows** against the persistent loopback preview, including the prior 92 flows and four new Mayall flows. The separate staging copy also passes all 441/96 checks. Vite retains its chunk-size advisory; compilation succeeds.

The new tests check twenty independent 600-bin count/RNG trajectories, four full-field reconstructions, calibration and slit values, both Poisson branches, the singular precision rollback, strict raw-v3 profile/proof matching and full-v14 restoration. Session tests round-trip all twelve acquired kinds with exact manual Single values and archive IDs; they reject missing/corrupt/cross-profile slots and a thirteenth archive while preserving old eight-archive limits.

Browser flows acquire all three Mayall galaxies with a single committed 1000 ms interval, enter redshift and Hubble inputs manually, save/reload v14, export SSP and restore stopped archived work. Other flows preserve 0.4 m/0.9 m/Mayall star segments, reject wrong-profile imports and damaged proofs, cancel a pending restore without overwriting later choices, preserve Mayall work under a legacy v13 restore, and recover explicitly from the precision guard at mobile width 320 px. Captures of desktop acquisition, manual Hubble results, mobile precision error and mobile resumed restoration were inspected visually for usable controls, readable messages and layout.

## Evidence and integrity

[Mayall provenance](../data/hubble/mayall-provenance.json) has SHA-256 `6a1e6fd5f8b876967adfc0f549e0e95036ceaf9f3a1f51aa1d02f14842ab118b`. It pins 18 original/license files, five raw disassembly ranges and the independent mathematical reference script. All were rehashed. The prior 84 scientific data/proof files and production scalar acquisition/photons/exposure kernels remain unchanged. The 352-file pre-integration inventory was checked before copying; no concurrent edit was overwritten. Backups and an exact unified patch are retained outside the source.

External evidence directories:

- `/home/dobleuber/Documents/Codex/2026-10-18/task-3/mayall-recovery/`: original addresses, static field recovery, independent Decimal100 reference and numerical vectors.
- `/home/dobleuber/Documents/Codex/2026-10-18/task-3/mayall-integration/`: baseline, backups, patch, integration/verification receipts, stage and final check logs, and visual evidence.
- [external browser-evidence record]: retained screenshots from the actual repository browser run.

An exploratory product-only Mayall reference crossed the native threshold of 12; it was replaced with the recovered rejection-branch reference before the admitted vectors and implementation were validated. No original binary was executed and no native writer/runtime oracle was created. Independent mathematics and browser self-consistency are not proof of native x87/GDI/runtime equivalence. Browser RNG/time and galaxy scaling adapters remain declared. See [feature steps and scientific limits](MAYALL-ACQUISITION.md).

The persistent service remains loopback-only at `http://127.0.0.1:5173/`. No original file, Windows process, emulator, installer, Claude review, remote repository, public upload/deployment or purchase was used. There is no remaining integration blocker for this bounded feature; other instruments/targets and native global time/site/tracking lifecycle remain open.
