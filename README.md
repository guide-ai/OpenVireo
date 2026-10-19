# OpenVireo

**Open Virtual Educational Observatory.** A local React/TypeScript/Vite reconstruction of Project CLEA, previously presented as OpenCLEA. Original CLEA/VIREO attribution is retained. This is a bounded reconstruction based on static binary/data evidence, not a complete VIREO port or a claim of original runtime/x87 equivalence.

## Current local capabilities

- Observatory, three compiled telescope/site profiles, finder/telescope views, shared UT/tracking preview, held directional movement and confirmed programmed slew.
- Supported star, three Hubble galaxies and pinned sky acquisition through the checked profiles; raw replay, SSP/JSON/CSV, manual spectral alignment and explicit Hubble inputs.
- Fixed-list UBV photometry with16/14/10 telescope-specific target domains, sizes5/10/15, measured skies and manual notebooks/colors. Native model/reference trials and reversible reference exclusions remain distinct from acquired measurements.
- 25 original classification practices/eight atlases and supported acquired/imported-spectrum paths. Session backups preserve represented observations, student measurements and drafts; restoring never resumes an active motor.

General fields/options/instruments, native global timing/RNG/x87 fidelity, original-runtime differential validation, classroom acceptance and public resource redistribution remain open. The full [implementation plan](docs/IMPLEMENTATION-PLAN.md) and [row-level acceptance assessment](docs/ACCEPTANCE-STATUS.md) distinguish implemented slices from complete packages.

## Local resources are required

The proposed source history deliberately excludes `data/` and `public/original/`: they contain original/derived scientific catalogs, spectra, images, models, byte-bearing evidence and local-only reference data. Their redistribution permissions are unresolved. **A fresh source-only checkout is not a self-contained runnable distribution.** A TypeScript/Vite build and dataset-dependent tests require the matching validated local resource directories first.

On this workstation the resources remain in place. The complete pre-Git tree is backed up outside the repository. [The resource manifest](docs/LOCAL-RESOURCES.json) records relative paths, sizes and SHA-256 without the original payloads. Supply those exact local resources from an authorized private backup or reproduce them with the preserved local research generators; merely downloading an original archive is not a verified generated-resource setup. There is no automatic download, fabricated fallback dataset or public resource upload.

See [first-commit inventory and publication gates](docs/FIRST-COMMIT-INVENTORY.md) before publishing anything to the public destination. No general source license has been chosen here and no third-party rights are granted by this name change.

## Run and verify with local resources

Use the existing installed dependencies or install the versions pinned by `package-lock.json`. No dependency changed for branding/Git preparation.

```sh
npm run dev
npm run build
npm test -- --maxWorkers=4
npm run test:e2e -- --workers=2
```

The existing preview is `http://127.0.0.1:5173/`, managed by transient user unit `clea-web-preview.service`. The folder remains `clea-web` and the service name is unchanged. It survives tool-shell completion but is not enabled at boot. A separate strict-port server must not replace it.

## Try movement and slew

Open [the observatory](http://127.0.0.1:5173/#observatory), open the dome, then use **Move the telescope**. Hold North/East/South/West with pointer, Space or Enter; release to stop. Choose **Slew to selected object**, cancel once, then confirm. **Save investigation** during motion and restore it: the motor stays stopped and existing manual values/counts/RNG are retained. [Exact evidence, limits and steps](docs/TELESCOPE-MOTION.md); [local validation and pending external review](docs/TELESCOPE-MOTION-VALIDATION.md).

## Evidence and compatibility

Scientific functions/state remain pure TypeScript, separate from rendering. Existing session identifiers, numerical policies, raw/full format versions, filenames and historical OpenCLEA provenance are intentionally preserved. Visible branding does not migrate or relabel scientific work. Manual measurements, photometry transcriptions, interpretations and Hubble inputs are never filled from catalog answers.

Original downloads/executables and byte-bearing analysis stay outside this source tree. The old ProgrammedSlew dossier was obtained through REA's MCP using Ghidra; recent closing captures used GNU objdump and Python operand/hash/reference calculations. Unit/browser checks exercise the port and analytic references, not an executed CLEA oracle. No original program, Windows or emulator was run for these increments. Current external-review evidence and resolution status are recorded in [A06 validation](docs/TELESCOPE-MOTION-VALIDATION.md#read-only-review-and-current-resolution-state).

Project CLEA, Gettysburg College and NSF support remain credited in [provenance](PROVENANCE.json) and [third-party notices](THIRD_PARTY_NOTICES.txt). Educational/noncommercial terms do not establish general derived-web redistribution permission. The public GitHub destination is identified; no push or deployment is authorized by its URL alone.
