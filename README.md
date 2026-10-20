# OpenVireo

**Open Virtual Educational Observatory.** A React/TypeScript/Vite reconstruction of Project CLEA/VIREO based on recovered behavior. This is a bounded educational reconstruction; original runtime/x87 equivalence and full exercise acceptance remain unverified.

The repository includes the **1279 runtime, test and provenance resources** in [the identity manifest](docs/LOCAL-RESOURCES.json). A checkout supplies its own catalogs, spectra, images, models and reference fixtures. No separate workstation resource directory or original Windows installation is needed to build or run it.

## Install and run

Use Node20.19+ or22.12+ (the Vite dependency's supported ranges) and npm; validation uses Node22.23.2.

```sh
npm ci --ignore-scripts
npm run check:resources
npm run build
npm run dev -- --port 5173
```

Open `http://127.0.0.1:5173/`. Servers bind to loopback. `npm run preview -- --port 5178` serves the compiled build on loopback after building. On the original workstation the existing `clea-web-preview.service` and its5173 URL are retained; this service is not a checkout requirement.

The resource checker compares all listed sizes and SHA-256 before npm build/dev/test, including with npm ignore-scripts enabled. A missing or changed versioned resource produces a bounded diagnostic; restore it from the matching source revision. It downloads, generates and repairs nothing. [Setup and exit codes](docs/LOCAL-SETUP.md).

```sh
npm run test:resources
npm test -- --maxWorkers=4
PLAYWRIGHT_BROWSERS_PATH=.local/browsers npx playwright install chromium
npm run test:e2e -- --workers=2
```

The eleven Node tool contracts run without scientific data or application dependencies. Vitest covers the scientific/state contracts; Playwright covers complete user flows. The browser installation is ordinary test tooling, ignored by Git. E2E starts its own strict loopback5175server by default and refuses reuse of an existing preview. No dependency version changes for resource inclusion.

## Current capabilities

- Observatory, three compiled telescope/site profiles, finder/telescope views, shared UT/tracking preview, held directional movement and confirmed programmed slew.
- Supported star, three Hubble galaxies and pinned sky acquisition through the checked profiles; raw replay, SSP/JSON/CSV, manual spectral alignment and explicit Hubble inputs.
- Fixed-list UBV photometry with16/14/10 telescope-specific target domains, sizes5/10/15, measured skies and manual notebooks/colors. Native model/reference trials and reversible reference exclusions remain distinct from acquired measurements.
- Original classification practices/atlases and supported acquired/imported-spectrum paths. Investigation backups preserve represented observations, manual values and drafts; restoring keeps motors stopped.

Try [movement and slew](docs/TELESCOPE-MOTION.md) or [the three-galaxy Hubble route](docs/MULTI-GALAXY-HUBBLE.md). General fields/options/instruments, original global timing/RNG/x87 behavior and classroom acceptance remain open. The [implementation plan](docs/IMPLEMENTATION-PLAN.md) retains original package criteria and distinguishes partial slices from complete packages.

## Resource provenance and terms

The resources mix unchanged original text spectra/line lists, generated catalog subsets, lossless image conversions, scientific tables, authored contract metadata and synthetic validation fixtures. [Material classes and source credits](docs/RESOURCE-PROVENANCE.json) distinguish them; no uniform public-domain or open license is asserted. Original and derived hashes remain unchanged. Native executables, installers, downloaded archives, secrets, private state and build/dependency/browser caches remain excluded.

Project CLEA, Gettysburg College and NSF support remain credited in [provenance](PROVENANCE.json) and [notices](THIRD_PARTY_NOTICES.txt). The preserved CLEA terms permit noncommercial use and student copies with requested credits, and prohibit for-profit distribution/marketing. The manual credits multiple catalog/image/spectrum authors. NASA hosting alone is not NASA authorship; source-specific matching/terms remain documented uncertainties. Resource inclusion follows the explicit project-owner instruction and does not relicense third-party material. No general authored-code license has been selected.

Captured regression inputs/source packets retain exact producer bytes required by their hashes. The current product, authored UI/code and new exports use OpenVireo. Existing saved-file metadata is migrated before strict proof/replay validation; acquisition identities, counts, seeds/RNG, notes and manual measurements are retained. No catalog answer, Hubble fit or new noise model is supplied to a pupil's record.

Original executable analysis remains outside the application. Static artifacts and analytic/software tests are evidence of the selected port contracts, not an executed original oracle. See [naming validation](docs/PROJECT-NAMING-VALIDATION.md), [A06 review/resolutions](docs/TELESCOPE-MOTION-VALIDATION.md) and [resource-preflight review/resolutions](docs/LOCAL-SETUP-VALIDATION.md).
