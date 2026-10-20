# Local setup and resource integrity

The repository now includes all1279resources in `LOCAL-RESOURCES.json`;the earlier source-only packaging boundary is superseded by the explicit inclusion instruction. Catalogs,spectra,images,models and authored fixtures are regular versioned files,not links to a private workstation. Source-specific credits/uncertainties are in [RESOURCE-PROVENANCE.json](RESOURCE-PROVENANCE.json);inclusion does not assign one universal license.

## Install and verify

Use Node20.19+ or22.12+ with npm (tested with22.23.2):

```sh
npm ci --ignore-scripts
npm run check:resources
npm run build
npm run dev -- --port 5173
```

The browser URL is `http://127.0.0.1:5173/`. A compiled build can be served with `npm run preview -- --port 5178`. Both bind to loopback. Use an unused port when the existing persistent5173preview is running;do not replace that service.

The checker resolves its CLI path through filesystem aliases,validates every manifest path/size/hash field before resource IO,and streams at most8files concurrently. One nonblocking descriptor binds each file's type/size check and SHA stream;it is closed on success/failure. Results retain manifest order. This is a point-in-time identity check,not a filesystem lock,signature,license or original-runtime oracle.

All four npm build/dev/test/test:e2e entries call it directly,including with ignore-scripts enabled. Default Playwright starts local Vite directly after the E2E check,so it does not rehash the pack through a nested npm hook. Direct engine commands are advanced explicit bypasses of this npm admission step.

Exit0 means all listed files match. Exit1 identifies missing,non-file,unreadable or mismatched resources,with root-link and filesystem-code diagnostics. Exit2 identifies unavailable/malformed manifests or typed entry/field errors. Diagnostics list at most20resource issues plus a remaining count. Invalid values/file contents are never echoed. Restore altered/missing files from the matching source revision;the checker does not download,generate,copy or repair them.

## Tests

```sh
npm run test:resources
npm test -- --maxWorkers=4
PLAYWRIGHT_BROWSERS_PATH=.local/browsers npx playwright install chromium
npm run test:e2e -- --workers=2
```

Nine Node tool contracts use synthetic temporary files and real child processes,including alias/ignore-scripts/sentinel-engine/FIFO and filesystem-error cases. Scientific/state contracts use Vitest;complete workflows use Playwright. Browser caches,dependencies,build output and private tooling remain ignored. The supported observing sample,counts/RNG and pupil-manual controls are unchanged by packaging.

[Exact validation/review status](LOCAL-SETUP-VALIDATION.md) separates the original source-only snapshot,the corrected preflight and the resource-inclusive clone checks. No deployment,new backend,new dependency version,original execution or emulator is introduced.
