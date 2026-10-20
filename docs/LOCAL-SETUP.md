# Local resource preflight

This bounded Q06 increment makes source-only setup failures explicit before Vite or dataset-dependent tests. It does not supply the missing resource pack or make the public checkout self-contained. No scientific or acceptance criterion changes.

## Check a source checkout

With Node available, run either command; no installed application dependencies are required for the check:

```sh
node scripts/check-resources.mjs
npm run check:resources
```

The checker reads the revision's `docs/LOCAL-RESOURCES.json`, validates every relative resource path before resource IO, then streams each file to verify its byte length and SHA-256. It reports counts and up to20 issue paths. It never prints source contents, downloads, generates, copies or repairs files. Local worktrees may link to an authorized existing private resource directory; the target contents receive the same byte checks. The manifest establishes expected identity only, not authenticity, original-runtime equivalence or redistribution permission.

Exit0 means all listed files match. Exit1 means missing, unreadable, non-file or mismatched resources. Exit2 means invalid/unavailable manifest or unsupported command arguments. A source-only checkout intentionally exits1 with a clear private-pack requirement before compilation; it does not fail later on hundreds of unresolved JSON imports.

## Supply and verify authorized local data

1. Obtain the matching `data/` and `public/original/` directories from an authorized private backup, or use the preserved local research generators outside the source tree. This utility provides no acquisition or download route. An original archive alone is not the complete generated web pack.
2. Run the check again. The current manifest has1279 files; require **1279/1279** before building. A hash mismatch should be investigated against the preserved source receipts, not replaced with a new expected hash to silence the checker.
3. Use installed dependencies or `npm ci` with the pinned lockfile, then run:

```sh
npm run build
npm test -- --maxWorkers=4
npm run test:e2e -- --workers=2
```

`prebuild`, `predev`, `pretest` and `pretest:e2e` run the same read-only preflight. `npm run test:resources` runs four synthetic checker contracts without the scientific pack or application dependencies. Scientific/state contracts continue to use Vitest; complete application flows use Playwright. `npm run dev` binds to loopback as before. Keep the existing persistent5173 preview service unchanged; use a different loopback port for temporary checks.

## Publication boundary

All1279 resource payloads remain excluded by Git. The public source is useful for inspection and development with the authorized local pack; it is not yet a runnable public observatory distribution. Q05 rights clearance, a general authored-code license decision and release/classroom acceptance remain open. No resource upload, deployment, service or new dependency is introduced. The public identity manifest contains paths, sizes and hashes only.


[Exact validation and review status](LOCAL-SETUP-VALIDATION.md) distinguish local checks, the denied external review and publication status.
