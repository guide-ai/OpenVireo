# OpenCLEA

A local browser reconstruction of the CLEA educational observatory, built with React, TypeScript and Vite. Start in the observatory, explore original catalog fields, point to a target and reach the spectrum analyzer through that flow.

This is a preview, not a complete VIREO port. Original catalog positions and projection arithmetic are recovered; immediate pointing and discrete browsing are web adaptations. Exposure acquisition, synthesis/noise, tracking/time/horizon behavior, photometry, cameras, radio and complete exercise outcomes remain pending. Library images and spectra are original references, not observations acquired by the browser.

## First visit

Open **http://127.0.0.1:5173/** on this computer.

1. Click **Open dome ↗**.
2. In **Target**, choose **M82 · NGC 3034**.
3. Click **Point telescope ↗**. The readout becomes RA **9.93000 h**, Dec **69.68333°**.
4. Click **Switch to telescope view ↗**. The original M82 library image appears.
5. Click **Open spectrum analyzer ↗** to inspect `NGC3034.SP` as an original reference. Its flux is rescaled only for display; original samples are unchanged.
6. Click **← Return to observatory**. Target, pointing and dome state are preserved. Choose another target, switch back to **Finder · 2.5°**, or browse with **North/East/South/West**.

These steps require no technical settings and are covered by browser tests. They do not simulate a new exposure. Acquisition will be added after its scientific contracts are recovered and validated.

## Measure an imported spectrum

The analyzer accepts UTF-8 text with positive, strictly increasing wavelength in Å and intensity already normalized from 0 to 1. Two columns may be separated by spaces or commas; optional CSV header: `wavelength,intensity`. Limits: 2 MiB, 2–50,000 samples and at least one sample in 3650–7000 Å. Imports are not silently sorted or normalized.

Choose a line list, import a spectrum, explicitly set **z step per tick**, align the lines, confirm a measurement and export CSV. The step is an analyst parameter because original acquisition calibration is pending. Local step limit: (0,1]; control position: −100…100. Recentering and fine/coarse changes preserve z; **New adjustment** sets z=0 and invalidates the step. Selecting the already active factor is a no-op. A library reference alone cannot be recorded as an observation. Recording also checks the stored float32 domain, rejecting a value rounded to z=−1.

CSV **schema 2** uses English column identifiers, decimal points, CRLF and explicit numerical policy independently of display locale. It includes source name/SHA-256, Number z, float32 z/bits and control state. The log is RAM-only: export before closing. This is a new interchange format, not native CLEA compatibility.

## Run and verify

```sh
cd /home/dobleuber/Projects/personal/clea-web
npm ci --ignore-scripts
npm run dev
npm run build
npm test
npm run test:e2e
```

The existing preview is managed by transient user unit `clea-web-preview.service`, listening only on `127.0.0.1:5173`. It survives tool-shell completion; it is not enabled for boot/login. Inspect with `systemctl --user status clea-web-preview.service` or stop with `systemctl --user stop clea-web-preview.service`. Do not launch a second server on the strict port. The test browser is already installed under `.local/browsers`.

Node 22.23.2 and exact dependencies are recorded in the lockfile. No backend, accounts, external runtime services, public deployment or push is required. See [the full implementation plan](docs/IMPLEMENTATION-PLAN.md) for scope, capability count, gates and effort assumptions.

## Evidence, language and rights

The scientific core is separate from React. `src/i18n/en.json` contains stable English UI/help keys; `Intl` handles presentation numbers. No language selector or additional translation is implemented. Scientific file formats remain stable independently of future locales.

Original downloads, executables and analysis stay outside this project under `/tmp/clea-static-research` and `/home/dobleuber/Documents/Codex/2026-10-17/task-2`. No original executable was run. Root `PROVENANCE.json` documents initial spectral contracts; `data/sky/PROVENANCE.json` identifies catalog/image/reference derivatives. See [recovery](docs/RECOVERY.md), [validation](docs/VALIDATION.md) and [review results](docs/REVIEW-RESULT.md).

Original CLEA resources are credited to Gettysburg College/NSF and their respective sources. Educational/noncommercial terms do not establish general permission for web redistribution. Public release permission remains unresolved. `THIRD_PARTY_NOTICES.txt` does not relicense original assets.

The reviewed observatory release uses 864 coordinate tiles, exact packed-record preservation and a bounded cache. It was checked separately before applying and then rechecked on the served project: build, 20 unit tests and 11 browser flows pass. Original-executable fidelity and the complete observation cycle remain unvalidated.

The next Hubble increment adds explicit-state random draws, quadratic spectrum sampling, recovered Poisson/log-gamma, centered RGB slit sampling, magnitude calibration and a transactional 600-bin supplied-mean exposure reducer. See [Hubble recovery and integration gates](docs/HUBBLE-RECOVERY.md) and `data/hubble/PROVENANCE.json`. These are not connected to an exposure button or included as a completed Hubble exercise. The original x87 tangent midpoint remains an explicit precision gate. One authorized retry of Claude `/code-review` completed with Opus 5.5/high; local corrections and slit/calibration work followed it and were verified independently.
