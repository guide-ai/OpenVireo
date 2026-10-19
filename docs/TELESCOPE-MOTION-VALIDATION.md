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

## Read-only review and current resolution state

Native `/code-review` completed directly on the actual project after explicit human approval of the Anthropic/source/derived-data scope. The two earlier pre-execution denials are retained in the external evidence records; neither was bypassed. No public GitHub push or original program execution occurred.

`claude-opus-5-5` is verified in the initialization,53 assistant messages andthe final model-usage keys. CLI effort was`high`; the native task confirms its high-effort/eight-inline-angle preset. Provider-internal effort telemetry is unavailable. The result reports success/exit0/no permission denials. The reviewer used53 visible Read/Glob/Grep calls; the visible-path audit found no forbidden binary/RTF/private path request. All570 source/data snapshot hashes remained unchanged during review. Native pending-diff `/security-review` was not claimed for the clean local branch with no upstream; the full direct read-only security/import/data-flow fallback was included.

Raw report,stream,launch andaudit are preserved separately at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/claude-a06-motion-review/`. `review.txt` is the unedited report; `audit.json` records model/tools/paths/source identity. It contains nine observations requiring local contrast,not nine accepted defects.

Confirmed for correction: an admitted tiny westward RA crossing can emit24h; rejected/no-op preflight can pause the clock/release work; invalid targets can open confirmation; motion withdrawal can display a misleading clock-limit alert; dome closure pauses the clock inconsistently; connected-domain literals duplicate the pure policy. Half-turn reference withdrawal tests are being completed. The reported3East/3West example did not reproduce over the checked admitted rates/views; a different valid just-below-step RA input reproduces the same domain defect. The guarded nudge-and-return arrival is a real declared unsupported precision case; it is not permission to invent an epsilon snap/native callback count. The performance allegation has no demonstrated>1000ms stall and is not a confirmed defect.

Resolution/testing is in progress. The external review ran; full A06/native/runtime acceptance remains partial. Final correction counts andfinding dispositions will be recorded here after verification.

## REA usage

A06 and the recent photometer-domain clarification used saved REA/Ghidra evidence plus GNU`objdump` and Python PE/operand/hash/Fraction/Decimal inspection. No fresh REA MCP engine/target analysis was invoked for these increments. The latest availability receipt inspected is18October2026,14:22UTC (`evidence/rea-independent-availability-20261018/` under the earlier research root): initialize,tools/list,binary_session, no target opened or analysis run. Historical actual analysis is preserved separately in `analysis/observatory/REA-SNAPSHOT.json`. Current post-reboot REA engine health was not tested. These distinctions are recorded in `REA-STATUS-RESUMPTION.json`.
