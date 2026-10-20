# Q06 packaging and resource verification

Resource inclusion is now explicit:all1279files in LOCAL-RESOURCES.json are regular versioned files with their original sizes/SHA-256. This supersedes the initial source-only/private-pack packaging boundary. Resource classes,source-specific credits,uncertainties and preserved path metadata are recorded in RESOURCE-PROVENANCE.json. No single open/public-domain license or original-runtime equivalence is asserted.

## Verification snapshots

| Snapshot | What actually ran |
| --- | --- |
| 18344d6,initial source-only Q06 | Four Node tool cases,1202Vitest,build and15browser flows with the existing local pack. These are historical baseline receipts,not clean-clone proof. |
| 602abd3,Q06 corrections | Nine Node cases,1202Vitest,TypeScript/Vite and15browser flows through corrected npm entrypoints/default server configuration. Aliased CLI andignore-scripts bypasses reproduced before fixing. |
| 5713cfe,all resources included | Fresh independent Git clone,no alternates/resource links and initially no dependencies. npm ci with a fresh temporary cache and install scripts disabled passed. Build/typecheck,1202Vitest/110files,nine Node cases and27compiled-build browser flows passed. All dependencies/resources resolved inside that clone. Desktop1440/mobile360screenshots were opened and inspected:M82image376px andNGC3034.SP loaded locally,no page errors,horizontal overflow or external app requests. |

The first custom clone browser harness used an external output directory;26flows passed andP01's hardcoded cwd artifact write failed ENOENT. The corrected run used checkout/test-results,matching the repository default;27passed with no code/assertion changes. Both logs are retained. Browser binaries were ordinary existing Playwright test tooling;application data/dependencies came from the clone. These observations do not prove native CLEA fidelity.

The post-review follow-up adds11Node contracts covering real CLI aliases,all4npm commands with ignore-scripts and a positively checked sentinel engine,FIFO,resource links,portable ASCII names,manifest diagnostics,stream/close errors andprogrammer-error propagation. It isolates default E2E on strict5175without server reuse and decodes browser paths withfileURLToPath. The follow-up TypeScript/Vite build and1202Vitest contracts pass;space-path/browser verification is recorded separately when completed;the earlier snapshot counts are not relabelled.

## Native reviews and local dispositions

The original Q06 native/code-review completed after an explicitly authorized single retry on18344d6:effectiveOpus5.5 in final usage,26Read/Glob/Grep calls,419snapshotfiles unchanged,configured effort high,exit0. Ten observations were independently fixed in602abd3. Raw report/stream/audit and resolutions remain separate outside source under task-3/resource-readiness/code-review andq06-fixes. Initial pre-execution denials remain preserved. No security-fallback retry occurred.

The resource-inclusive native/code-review then completed on5713cfe:effectiveOpus5.5,62Read/Glob/Grep calls,1700snapshotfiles matching the committed tree,configured effort high,exit0. It could not inspect protected original-byte/binary resources or execute Git/build/browser tools;the independent hash/clone checks supply that evidence. Raw report/audit and local dispositions are separate under task-3/resource-inclusion/code-review. Provider-internal effort telemetry is unavailable. No second external sign-off on post-report fixes is claimed.

| Resource-inclusive report item | Local resolution |
| --- | --- |
| 1. Existing server reuse | Default test port5175;reuseExistingServer=false andstrictViteport prevent testing the persistent5173checkout by mistake. Earlier custom clone checks already used explicit5178andno reuse. |
| 2. Resource symlinks | Reject resource roots,below-root directory components andleaf links. A final-component NOFOLLOW flag andNONBLOCK/fstat guard file-type swaps;this is not a hostile-filesystem transaction/lock. Project-directory aliases remain supported. |
| 3. Encoded browser path | fileURLToPath supports spaces/non-ASCII checkout directories. |
| 4. Error contracts | ERR_* programmer errors propagate;real filesystem failures retain codes;stream/close failures close the owned descriptor andcannot silently pass. |
| 5,8. Path portability claims | Manifest relative paths use the safeASCII subset actually used by all1279files,with case-duplicate/device/control/trailing-dot-space rejection. No universal Unicode filesystem fold is claimed. Checkout directory names are a separate decoded path. |
| 6. Ambiguous verification prose | Explicit snapshot matrix above,with actual fresh install/build/unit/browser/visual evidence. |
| 7. Slow npm startup |30second command budgets;the3second FIFO timeout is specifically a no-hang check. Prior EPERM was sandbox process denial,not scientific/timing failure. |
| 9. Notice/scope inconsistency | AGENTS/REVIEW/notices now record the actual inclusion/public-Git scope while retaining source-specific terms anduncertainty. This does not manufacture legal clearance. |
| 10. Metadata privacy |61resource JSON files contain workstation/research/capture paths as provenance text. Their filenames andbounded credential scan are recorded in RESOURCE-PROVENANCE.json;no runtime consumer resolves those metadata paths. Exact bytes are retained under the explicit all1279instruction. |

All original resource hashes and scientific models/counts/RNG/manual pupil values are unchanged. No native executable,installer/archive,private tooling,credential/cache or generated dist is included. No deployment,new backend or original execution is introduced. A raw review is evidence for its named snapshot,not approval of later edits or of universal rights.
