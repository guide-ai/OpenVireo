# A06 validation — implemented slice; external review pending

The held-direction and programmed-slew coordinate slice is implemented in the actual project and available at `http://127.0.0.1:5173/#observatory`. The whole A06 package remains partial. All64 primary acceptance statuses/criteria and the16 runtime-witness overlay memberships remain unchanged. See [behavior, limits and exact manual steps](TELESCOPE-MOTION.md).

## Actual-project verification

- `npm run build`: passed, including TypeScript project checks.
- `vitest run --maxWorkers=4`: **1058 tests /106 files passed**. The new motion core/session contracts add59 tests to the999 baseline. An earlier staging run at default high concurrency timed out two pre-existing heavy unit cases; no timeout was increased. The constrained final actual-project run passed.
- Complete default Playwright run: **185/186 passed**; the existing mobile60s galaxy exposure/keyboard-analysis case reached its30s test timeout. The full `galaxy-analysis.spec.ts` was then run with `--workers=1`: **3/3 passed**, including that mobile case in13.2s. No product/test code or timeouts changed. This is not reported as a single all-green186-test invocation. Resource contention is plausible, not proved as the cause.
- All **6 new motion flows passed** in the full actual-project run: held keyboard/pointer and captured release outside; rate/view differences; cancel and programmed wrap; partial save/reload22 with unchanged spectral counts/RNG; invalid proofs/running fields/downgrades; legacy continuity; gaps/hidden tabs; explicit Stop and direct hash navigation; exact-target no-slew.
- Compiled Vite build on temporary loopback5176: **20/20 passed**, covering all6 new flows plus existing instrument control, shared clock, Mayall photometry and SSP interoperability. The temporary server exited; persistent5173 was not replaced by this check.
- Direct persistent-preview visual smoke: desktop and360px mobile confirmation, actual moving-pointing/status, Stop and Cancel. No page errors or horizontal overflow. Manual8× remained8× while the program used its fixed temporary native rate. Screenshots were opened and inspected.

Evidence directory: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/a06-motion-recovery/`. Relevant logs are `final-build.log`, `final-unit.log`, `final-browser.log`, `initial-browser-timeout.md`, `final-galaxy-followup.log`, `production-browser.log` and `final-visuals/visual-smoke.json`; before-reboot staging checks remain separately labeled.

## Native evidence and preservation

The contract SHA-256 is `d28bdc96af0d9c67e2600a5a3dbed38d6b542875d9bc01582b4fb32052c670d6`. After reboot the official VIREO archive was recovered, matched its prior318073706-byte receipt/SHA, and was retained outside web source. All A06 original source/license hashes,20 complete PE procedure/producer ranges and the17628-byte DFM resource were revalidated (`native-revalidation-after-reboot.json`). No original program was executed. Original byte-bearing scripts/listings remain outside web source.

The independent Python reference computes54 rational recurrences from verified operands; these are synthetic analytic vectors, not observed CLEA trajectories, FPU execution or a native oracle. The Number32EPS withdrawal is a declared guard, not an x87 error estimate. Native VCL cadence/modal scheduling/options, moving-source photons, general source/cache reentry and full pole scope remain open. UT advances while motor coordinates own pointing; native untracked-drift interleaving is not claimed.

At the567-file integration snapshot,548 prior baseline files were unchanged. All131 prior core files,54/55 prior IO files and162/163 prior data files hash-matched; the only intended prior IO change is optional outer22 in `analysisSession.ts`, and the only prior data change is explanatory remaining-scope text in `acceptance-status.json`. Dependencies and scientific acquisition kernels remain unchanged. Session22 stores strict multiplier preferences only; existing owners retain pointing/UT, pupil values, acquired counts and RNG. Final preservation/manifests and original-witness recovery are recorded alongside this document’s evidence.

## Read-only review gate

The native Claude launch was prepared for the full actual project and safe research with `claude-opus-5-5 --effort high`, Read/Glob/Grep only, excluding credentials and original bytes. The installed native `/security-review` was inspected statically and requires a Git repository; this project has no`.git`. A direct read-only security/import/data-flow fallback was requested in the prepared review prompt.

**Automatic permission review denied the launch before execution**, citing the earlier human instruction “no Claude in this increment.” The parent’s later request for authorized review did not satisfy that approval decision. There is no stream, assistant output, effective-model verification, review report or completed Claude review for A06. No retry/workaround occurred. The prepared configuration is not evidence of actual model use. Exact action/target/reason/status are in `../claude-a06-motion-review/BLOCKED.json` under the evidence root. Explicit human authorization overriding the earlier restriction has been requested and is pending. Previous completed reviews belong to earlier increments.

Local source/data-flow inspection covered strict22 parsing before base restoration, old-writer compatibility, clock/motor ownership, atomic rejected batches, cancellation/release paths, blocked moving acquisition and unchanged retained photons/RNG. No confirmed product defect was found in those checks; the clock/motor preview policy was clarified in the feature document. This does not replace the blocked external review. Do not mark this review gate or the full A06 package complete, and do not start another feature as though it were closed.

## REA usage

A06 and the recent photometer-domain clarification used saved REA/Ghidra evidence plus GNU`objdump` and Python PE/operand/hash/Fraction/Decimal inspection. No fresh REA MCP engine/target analysis was invoked for these increments. The latest availability receipt inspected is18October2026,14:22UTC (`evidence/rea-independent-availability-20261018/` under the earlier research root): initialize,tools/list,binary_session, no target opened or analysis run. Historical actual analysis is preserved separately in `analysis/observatory/REA-SNAPSHOT.json`. Current post-reboot REA engine health was not tested. These distinctions are recorded in `REA-STATUS-RESUMPTION.json`.
