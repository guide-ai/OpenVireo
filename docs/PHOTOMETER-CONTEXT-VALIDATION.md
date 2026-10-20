# I01/Pleiades context validation — 18 October 2026

Delivered: clock/base-count and filter/telescope/sky context recovery, a correction to the supplied-input reduction API's terminology, and an explicit prospective domain with acquisition still gated. No photometry acquisition route, new observation, v7 field or legacy result compatibility is claimed.

## Evidence checks

- Pinned VIREO target/archive and seven evidence-file SHA-256 values matched. Options DFM original bytes match the retained parsed resource source hash.
-21 bounded byte-range/listing captures,9 exact constants and the original RTTI field tables(144 TOptionsDlg fields and42 TPhotometer fields) retained outside web source. Only named finite branches were interpreted; linear disassembly's data/alignment bytes are not treated as executed instructions.
- BaseCountEd+0x3ec connects to record+0x279f/environment+0x2e53, default1000 per callback. PhoTimerEd+0x3f0 connects to record+0x27a3/environment+0x2e57, default100ms. Both directions of option binding, the ms/1000 conversion and native timer setter were traced. Prior environment-copy/default dossiers were reused.
- Clock accumulation and base-count accumulation are separate fields. Filter order/defaults, three sky banks,−1 initial sentinel, object-start sky gate, filter-reset behavior, telescope index and zero-point preparation were traced. Fixed native sky-color offsets were decoded, including exact stored Extended0.33; no replacement sky-color model was introduced.
- The existing analytic fixtures have identical values after renaming only nativeElapsedUnits→nativeBaseCountSum and referenceUnitRate→baseCountRate. Their standalone Fraction/70-digit Decimal generator reproduces the updated file byte-for-byte.
- One added algebraic regression distinguishes base-count normalization from elapsed milliseconds by a2.5-magnitude error for explicitly synthetic supplied counts. It is not an original observation or execution oracle. The finite scalar arithmetic and existing domain guards remain unchanged.

## Actual repository checks

`npm run build` passed TypeScript and Vite. The existing large-chunk advisory remains; UI build chunk names are unchanged. `npm test` passed43 files/257 tests. `npm run test:e2e` passed all57 in22.5seconds, including acquired SSP export/reimport, manual cancel/save, invalid and late imports/restores, full v7/older sessions, classification width/luminosity, supported star and three-galaxy Hubble flows.

SHA checks cover200 existing source/data/test/config/dependency files:195 unchanged; the five changed are the two photometryReduction files, reduction provenance/vectors and planning status. All existing session/IO/UI and other scientific implementation files, all prior E2E files and dependencies remain unchanged. No backend, Worker, IndexedDB or installation was added.

Current-run desktop/mobile classification screenshots were visually inspected for retained curves, controls, source identities, error messages and responsive layout. Retained copies:[external browser-evidence record]/[external browser-evidence record]. The persistent `clea-web-preview.service` is active and listens only on127.0.0.1:5173. These are regression screenshots; they do not demonstrate a photometer UI.

## Remaining acceptance gates

[PHOTOMETER-CONTEXT-RECOVERY.md](PHOTOMETER-CONTEXT-RECOVERY.md) lists the next exact recovery chain: aperture fraction0x500568 with context/integrator0x55f80c/0x55fa24 and geometry0x59a49c; neighboring-source/color composition0x4ffa30 with0x5953a0/0x595338; actual Pleiades/cluster readers and complete field identity; telescope-change/reentry fresh-sky implementation; partial stop/count conversion/Record0x501e7c and a backed replay contract. Native sky banks do not prove that the manual's fresh-sky-after-every-telescope-change requirement is implemented by a known reset path.

I01/E04 remain unimplemented, N03 partial and all global package counts unchanged. No new observing steps are supplied because no new acquisition feature is enabled. Original runtime/x87 equivalence, classroom acceptance and redistribution permissions remain unestablished. No original execution/microemulation, Windows, Claude, new engine installation, remote operation, push, publication or upload occurred. No action was denied by automatic approval review; no tool operation remains pending/uncertain.

Backups, changed-file hashes, source-validation, unchanged-source proof, verification and complete code/document patch:`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-context-integration/`. Static evidence, manifest/scripts and analytic generator:`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-acquisition-recovery/`.
