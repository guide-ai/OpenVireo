# Project naming correction — validation and review

The current versioned tree uses OpenVireo for the product, package, component, tests, documentation and own format/policy labels. Published Git history and the physical directory/service are preserved. Original Project CLEA / VIREO attribution remains. The separate A06 arrival change is excluded from this commit.

## Verification

- TypeScript project checking and Vite production build pass.
- Complete Vitest: **1087 passed across 109 files**, zero failed.
- Complete Playwright after the review fixes: **191 passed**, zero failed/skipped/flaky. This run preceded the final precise raw-photometer wire-cap correction from a generic metadata allowance to exactly two bytes; all 26 related unit cases and the compiled-build flows were then rerun successfully.
- Compiled-build Playwright on temporary loopback 5178: **22 passed**, covering title, saved full21 migration/reload/reimport, invalid atomic restore, session exports, SSP interoperability, observatory and all existing motion flows. The server exits after testing.
- Actual compiled-build desktop/360px mobile screenshots were opened and inspected after restoring full21: readable controls and product title, no horizontal overflow, page errors or external requests. The first capture launch used an unset browser-path environment and failed before opening Chromium; the corrected launch used the already installed local browser. Both logs are retained.
- Five new acquisition identity regressions fail against the pre-fix migration and pass after correction. The stored star, all three galaxies, manual measurement origin/file/CSV, classification and archive references retain their identities. Existing scientific checks and manual-only pupil inputs remain.
- A valid earlier raw journal at exactly 131072 bytes re-exports at 131074 bytes and preserves every note, reading, event and RNG value. Excess payload is rejected. Prototype, immutable-resource caching, bounded errors and prior test-port configuration have regression coverage.
- The original captured snapshot hashes remain checked independently. All five P01 scientific CSV hashes remain unchanged; its exact session regression hash changes to `434efd838daf39e6f04cab29249c395fc281e4889bda217d0467664effdf197c` for the current header. The exact hash is additionally asserted in the P01 tests.

The final source/resource audit and visual receipts are kept outside source under the 18 October task-3 `naming-correction/` evidence directory. Current documentation uses portable references for historical private screenshot/report filenames; no physical renaming or alteration of those original artifacts is claimed.

## External review and local dispositions

Native `/code-review` completed against the full actual Git worktree with effective `claude-opus-5-5` in initialization, 89 assistant messages and final model usage, configured effort high, 89 visible Read/Glob/Grep calls and exit0. Provider-internal effort telemetry is unavailable. One request to grep a forbidden original-byte-bearing provenance file was denied; no retry or alternate read of those bytes occurred. The audit is explicit about eight E2E expected-header files changed during review; runtime/core/IO were unchanged until the report completed. The report is not an immutable review of every later fix.

The unmodified report, stream and audit remain separate from `code-review/dispositions.json` in the external evidence directory. No second external sign-off on the fixes is claimed.

| Item | Local disposition |
| --- | --- |
| 1, 10: acquired identities | Confirmed. Source-bound hash representation preserves IDs, filenames and all links while exports carry current metadata. Five failing-before/passing-after regressions. |
| 2: size boundaries | Confirmed. Actual producer growth receives bounded wire credit; the scientific/text payload budget is unchanged. Exact-boundary and excess-byte tests. |
| 3: traversal failures | Confirmed. Existing typed reader errors cover metadata depth/node limits. |
| 4: missing acquisition fixture coverage | Confirmed. Added star, all galaxies and linked investigation regression coverage. |
| 5: identity documentation | Confirmed. Derived identities and the hash-only representation are documented. |
| 6: repeated projection | Root/base investigation layers project once; scalar dispatch avoids tree work. Independent subjournal readers retain their bounded validation; no performance benchmark is claimed. |
| 7: duplicated resource copies | Shared WeakMap projection for immutable module resources; mutable parsed files remain uncached. |
| 8: null prototype | Confirmed and preserved with explicit property definitions. |
| 9: prior test-port setting | Recognized through the bounded known-producer signature alias; explicit current setting wins. |

Native `/security-review` returned exit0 but **zero turns, empty result, no assistant/model usage and no tool calls**. It performed no assessment; the reason is unknown. The dedicated full-project security/import/data-flow fallback was **denied before process creation** by automatic approval review, which cited the earlier no-Claude instruction. It was not retried or routed through another disclosure path. No security approval is claimed. The completed general code review did inspect imports/data flow and found the independently corrected identity defect. The denied action concerns that external review only; local verification and the user's authorized source-code publication can proceed.

No scientific model, photon/RNG behavior, native resource byte/hash, format version or original-runtime equivalence claim is introduced. The public source checkout still requires the excluded validated local resource pack. No original/derived resource publication or deployment is included.
