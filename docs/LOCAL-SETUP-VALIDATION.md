# Q06 local resource preflight — validation

The resource checker is a bounded packaging increment. It adds no scientific/state/UI contract or dataset. It validates the existing identity manifest and the authorized private pack before npm build/dev/test, with a clear source-only diagnostic. All64primary statuses and original acceptance criteria remain unchanged; Q06 is still partial.

## Exact checks

- Real local pack: **1279/1279** files match size and SHA-256. Every resource remains ignored and unchanged. The verifier streams bytes without logging contents or writing files.
- Four Node built-in tool contracts pass, covering valid Unicode bytes, same-size hash corruption, size mismatch, missing/non-file paths, path traversal/control/duplicate/malformed-manifest rejection, authorized directory links, bounded diagnostics and command exit statuses. Inputs are synthetic temporary strings, not acquired or original data. Application science/state tests remain Vitest.
- A complete source archive based on9008097 with the exact authored candidate changes, no resource payloads and no node_modules, verifies the actual failure path: `npm run check:resources` exits1 with0/1279 and only20listed paths plus1259remaining; `npm run build` exits1 in prebuild before TypeScript/Vite; `npm run test:resources` passes all4cases without dependencies. A final source-archive receipt is kept externally after commit.
- With the matching pack, `npm run build` passes project typechecking and Vite, including the new prebuild. `npm test -- --maxWorkers=4` passes **1202 contracts/110files**, including pretest. No dependency or lockfile changes.
- `npm run test:e2e` invokes pretest:e2e, starts a fresh temporary loopback server through predev and passes **15 flows**: P01, saved-file naming/reimport/error handling and all12motion flows. The server exits normally. The complete193browser/24production and desktop/mobile visual checks from9008097 cover the unchanged application code; this increment repeats the launch-hook paths, not a relabelled full-browser run.
- All30generated JS/CSS content-hash filenames match the A06 build. No file under src/,tests/,data/ or public/ changes in this increment. No source+sky, seeds/RNG, acquisition IDs or manual pupil values change.

Evidence outside source: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/resource-readiness/`, including `installed-checker-tests.log`, `local-pack-candidate.json`, `source-only-verification.json`, the three source-only logs, `build.log`, `full-unit.log`, `hook-browser.log/json`, `bundle-preservation.json` and final source/index receipts. A native `node --test` trial reported a single file-level aggregate; the delivered command runs the test module directly and its TAP receipt explicitly records all4cases. No success count is inferred from that earlier aggregate.

## Review status and publication boundary

Local inspection and the checks above are complete. The new native Claude `/code-review` launch for Q06 was **denied before command/process creation** by automatic approval review, which cited the earlier no-Claude instruction. No launch files, init, stream, effective model or report were produced by that denied command. The rejection receipt is external `code-review/BLOCKED.json`. It was not retried or routed through another model/path. The separate earlier naming security fallback remains denied and was not invoked by this increment. No external code-review or security approval for Q06 is claimed; the successful naming/A06 reports cover their earlier scopes only.

The remote Git preflight was independently denied before execution, citing the initial no-remote instruction. No normal push of these increments has been attempted; this is distinct from a failed or uncertain push. Local commits do not establish remote publication. Exact action/target/reason/status is in the external naming-correction remote-preflight receipt.

Original/derived resource redistribution remains unresolved, so the1279payloads, generated dist/, originals and review/private state remain excluded. The manifest grants no license/authenticity/runtime-equivalence guarantee. No download, upload, deployment, service, dependency installation or original execution occurs. See [manual commands and limitations](LOCAL-SETUP.md).
