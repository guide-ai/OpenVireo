# A06 validation — implemented slice and reviewed corrections

The held-direction and programmed-slew coordinate slice is implemented in the actual project and available at `http://127.0.0.1:5173/#observatory`. The whole A06 package remains partial. All64 primary acceptance statuses/criteria and the16 runtime-witness overlay memberships remain unchanged. See [behavior, limits and exact manual steps](TELESCOPE-MOTION.md).

## Actual-project verification

Final corrected actual-project verification, 19 October 2026:

- `npm run build`: passed, including TypeScript project checks.
- `vitest run --maxWorkers=4`: **1068 passed /106 files; 0 failed**. This includes the prior1058 contracts and ten new motion regression contracts; no earlier assertion was removed.
- Complete Playwright suite with no test filters, two workers: **190 passed, 0 failed, 0 skipped, 0 flaky**, in309540.891ms. This supersedes the earlier185/186 run and isolated3/3 follow-up; those historical results are not relabeled as a complete pass.
- Corrected compiled Vite build on temporary loopback5176: **17 passed, 0 failed, 0 skipped**, covering all ten motion flows plus the seven observatory/P01 flows. The earlier20-flow production run remains historical evidence for its earlier snapshot.
- Regression reproduction before correction: branding assertions **2 failed/5 passed**; canonical RA boundary **1 failed/61 passed**; four new motion browser flows **4 failed**. After correction, branding **7/7**, motion/browser **10/10**, and motion/session unit subset **69/69** passed. The complete final suites above include the corrected cases.
- Direct persistent-preview smoke and desktop/360px mobile images cover held movement/release, Cancel, explicit Stop, completed programmed arrival and the retained precision-withdrawal message. No page errors or horizontal overflow; images were opened for visual inspection.

Final logs and JSON statistics are outside web source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/claude-a06-motion-review/`: `final-correction-build.log`, `final-correction-unit.log`, `final-complete-browser.log/json`, `corrected-production.log/json`, before/after regression logs and `corrected-visual.json/png`. Earlier A06 evidence remains in the neighboring `a06-motion-recovery/`; no historical failure record was replaced.

## Native evidence and preservation

The contract SHA-256 is `d28bdc96af0d9c67e2600a5a3dbed38d6b542875d9bc01582b4fb32052c670d6`. After reboot the official VIREO archive was recovered, matched its prior318073706-byte receipt/SHA, and was retained outside web source. All A06 original source/license hashes,20 complete PE procedure/producer ranges and the17628-byte DFM resource were revalidated (`native-revalidation-after-reboot.json`). No original program was executed. Original byte-bearing scripts/listings remain outside web source.

The independent Python reference computes54 rational recurrences from verified operands; these are synthetic analytic vectors, not observed CLEA trajectories, FPU execution or a native oracle. The Number32EPS withdrawal is a declared guard, not an x87 error estimate. Native VCL cadence/modal scheduling/options, moving-source photons, general source/cache reentry and full pole scope remain open. UT advances while motor coordinates own pointing; native untracked-drift interleaving is not claimed.

At the567-file integration snapshot,548 prior baseline files were unchanged. All131 prior core files,54/55 prior IO files and162/163 prior data files hash-matched; the only intended prior IO change is optional outer22 in `analysisSession.ts`, and the only prior data change is explanatory remaining-scope text in `acceptance-status.json`. Dependencies and scientific acquisition kernels remain unchanged. Session22 stores strict multiplier preferences only; existing owners retain pointing/UT, pupil values, acquired counts and RNG. Final preservation/manifests and original-witness recovery are recorded alongside this document’s evidence.

## Read-only review and current resolution state

Native `/code-review` completed directly on the actual project after explicit human approval of the Anthropic/source/derived-data scope. The two earlier pre-execution denials are retained in the external evidence records; neither was bypassed. No public GitHub push or original program execution occurred.

`claude-opus-5-5` is verified in the initialization,53 assistant messages andthe final model-usage keys. CLI effort was`high`; the native task confirms its high-effort/eight-inline-angle preset. Provider-internal effort telemetry is unavailable. The result reports success/exit0/no permission denials. The reviewer used53 visible Read/Glob/Grep calls; the visible-path audit found no forbidden binary/RTF/private path request. All570 source/data snapshot hashes remained unchanged during review. Native pending-diff `/security-review` was not claimed for the clean local branch with no upstream; the full direct read-only security/import/data-flow fallback was included.

Raw report,stream,launch andaudit are preserved separately at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/claude-a06-motion-review/`. `review.txt` is the unedited report; `audit.json` records model/tools/paths/source identity. It contains nine observations requiring local contrast,not nine accepted defects.

Independent disposition of all nine report observations:

| Report item | Validated result and resolution |
| --- | --- |
| 1. RA normalization | Confirmed for a valid just-below-step starting RA: a west callback rounded to24h. Canonicalize that wrapped boundary to0h, with pure and browser regressions. The review's specific three-East/three-West example did not reproduce across200 rate/view combinations; it is not claimed as the witness. |
| 2. Nudge/return arrival | Reproduced after40 default4× manual north callbacks. The arrival comparison remains deliberately withheld by the declared Number guard. A regression now asserts withdrawal. No epsilon snap or native completion callback is invented; use the separate explicit Point shortcut when this boundary is encountered. This remains a usability/scientific admission limit. |
| 3. Withdrawal notice | Confirmed misleading clock-limit alert. A motion error now reports motion withdrawal without a false clock-limit alert. Conservatively pausing the clock remains the documented browser policy. |
| 4. Start preflight | Confirmed rejected/no-op side effects. Pure admission validates the sampled pointing before pausing or releasing confirmed work; exact no-op returns without adding motion session scope. Regression checks the continuing clock and save owner. |
| 5. Impossible confirmation | Confirmed. Out-of-domain coordinate drafts show a local error before opening the modal. RA25 and Dec86 flows retain the running clock. |
| 6. Dome release | Confirmed timing-dependent clock pause. Dome closure now releases the motor consistently; a valid shared clock may continue. |
| 7. Duplicated pole policy | Confirmed. Connected admission and atomic batch enforcement are pure TypeScript helpers reading the proof's maximum declination, with a clock-policy equality test. Mathematical native pole recurrences remain separately testable. |
| 8. Half-turn coverage | Confirmed coverage gap. All four reference half-turn cases now explicitly assert withdrawal, retaining all previous tests. Every one of the54 independent reference vectors has a matched recurrence or declared-withdrawal assertion. |
| 9. Performance | Unconfirmed hardware hypothesis: no measured>1000ms stall was supplied or reproduced. No Worker, IndexedDB, callback folding or scientific change was introduced. Low-end hardware/native scheduling acceptance remains open. |

The five subsequently reported local-commit issues were also corrected separately: exact title/description E2E assertions, explicit historical session-identifier explanation, OpenVireo PresentationError text, a single current review-status source here linked from the review log/inventory, and a complete final E2E invocation with exact outcomes. Legacy serialized identifiers, versions and policy hashes remain unchanged.

One optional test-cleanup action was denied before execution by automatic review because it could weaken existing assertions. It was discarded; all old assertions and selectors were retained and the missing cases were added independently. That denial is not a remaining blocker (`rejected-optional-test-cleanup.json`).

These corrections follow the immutable external report and were independently verified locally; no second Claude sign-off is claimed. Full A06/native/runtime acceptance remains partial. No original execution, remote push, public resource upload or new feature was included in this correction package.

## REA usage

A06 and the recent photometer-domain clarification used saved REA/Ghidra evidence plus GNU`objdump` and Python PE/operand/hash/Fraction/Decimal inspection. No fresh REA MCP engine/target analysis was invoked for these increments. The latest availability receipt inspected is18October2026,14:22UTC (`evidence/rea-independent-availability-20261018/` under the earlier research root): initialize,tools/list,binary_session, no target opened or analysis run. Historical actual analysis is preserved separately in `analysis/observatory/REA-SNAPSHOT.json`. Current post-reboot REA engine health was not tested. These distinctions are recorded in `REA-STATUS-RESUMPTION.json`.
