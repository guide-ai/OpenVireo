# Stellar classification: original practice and acquired spectra

Current sampled-intensity extension: [loaded-curve readout](LOADED-FLUX.md) now supports eligible acquired/imported unknowns under a separate identity/grid policy. Earlier numerical-readout exclusions below describe the prior increment;imported/acquired equivalent width and general native photographic behavior remain unavailable.

Current imported-file extension: [CLASSIFICATION-IMPORT.md](CLASSIFICATION-IMPORT.md)
adds bounded SP/SSP visual contexts and full v7; earlier pending/version statements
below are historical for this subset. Imported equivalent width remains disabled.

Current feature-width extension: see [FEATURE-WIDTH.md](FEATURE-WIDTH.md) for the
recovered contract, bounded manual practice implementation and remaining branches.
Earlier quantitative-width pending statements below are historical for this subset.

Current atlas extension: all eight original ATLAS2.LST atlases are now available,
including seven luminosity groups with exact original labels and per-response
reference identity. See [LUMINOSITY-ATLASES.md](LUMINOSITY-ATLASES.md) for the
current numerical/session contract, exact steps and next recovery criterion.
Earlier main-sequence schema4/practice1 remain compatible; luminosity work uses
full schema5/practice2. This supersedes luminosity being listed as pending below.

Comparator: http://127.0.0.1:5173/#classification.
Telescope entry: http://127.0.0.1:5173/#star-exposure.

The existing acquired-star/analyser flow remains the source of raw photon
journals and manual wavelength-shift measurements. Classification now reuses its
replay-verified snapshot instead of importing an unlinked normalized derivative.
The earlier three-practice comparison increment has expanded to all25 original
practice entries and all13 main-sequence standards. No answers or grading were
added. N02/E03 remain partial; this is not a native-runtime equivalence claim.

## Original data and common-domain evidence

VIREO Manual pp24–27 describes the unknown between adjacent standards, optional
difference and a classification-results form. The24 November2008 Classification
of Stellar Spectra manual pp7–10 specifies the25 practices,13 standards,
3900–4500Å window and standard-minus-unknown concept. MS.ATL supplies every atlas
label/file association and order; CLASSIFY.LST supplies all25 practice identities;
SPECLNS.LNL supplies line identities. No CLASSIFY.KEY was read or bundled.

All38 original SP resources are unchanged. Each has2799 finite0–1 samples on the
same3510–7427.2Å printed grid. Source/archive/manual/license SHA-256, paths and
rights limits are in `data/classification/provenance.json`; original resources,
archives and research remain outside source except the selected local runtime
SP copies. The external generator/manifest are under
`/home/dobleuber/Documents/Codex/2026-10-18/task-3/classification-link-recovery/`.
No public redistribution permission is established.

The acquired star is still N0000.DAT@14428, using original A0000049.SP
(SHA-256 a26f5bf43520aa0228c108f9870f06f989e708756021d36c5bc9f507ea702220),
with the already documented source-plus-sky algorithm, template sampling,
normalization and browser raster/timing/seed adaptations. It is not an independent
physical observation or a classification truth reference. Counts and noise alter
feature depths; the atlas and acquired normalized curve are not continuum-matched.
No type is decoded from its catalog index or inferred from its assigned template.

The acquired600-bin printed domain is3700–4698.33Å, covering the full
3900–4500Å comparison interval:361 acquired samples versus429 atlas samples.
The printed grids differ. Thus acquired spectra support visual wavelength-axis
comparison only; the difference option is disabled. No resampling/interpolation,
shift correction, residual score or classification guess fills that gap. Practice
spectra retain the existing identical-grid Number subtraction, clearly labelled
standard minus practice. Domain/migration evidence is recorded in
`data/classification/acquisition-domain.json`. This is static contract evidence,
not execution of an original SSP writer or classifier.

## Try acquisition, measurement and classification together

1. In **Star exposure**, activate the supported field, start and accumulate useful
   counts. **Classify acquired star** pauses and archives the same replay-verified
   packet used by **Analyze acquired star**. Positive counts are required. Short
   exposures can be too noisy for meaningful interpretation; no quality grade is
   inferred from opening the comparator.
2. In the comparator, **Acquired classification provenance** shows committed
   time/RNG/draws, curve SHA and acquisition identity. **Classification source**
   lists archived star snapshots separately from **Original practice library**.
   The curve uses its actual printed wavelengths. Only adjacent standards are
   enabled for acquired data; the disabled difference explains why.
3. Browse **Standard pair** and optional original line markers. Write **Proposed
   spectral type** and **Features and reasoning** yourself. **Review classification**
   opens a confirmation. Cancel/Escape leaves the draft, and **Save classification**
   records the manual interpretation. Repeat if useful; no answer or mark appears.
4. **Measure this acquired star** opens the existing analyser on that exact packet.
   Configure a step, align and save a measurement manually. **Classify acquired
   star** in its provenance panel returns to the same classification workspace.
   Reopening an identical packet preserves its comparison/draft/records. A new
   packet starts a separate acquired workspace. Saved measurements remain linked
   by acquisition ID and curve hash; neither classification nor a source change
   manufactures or overwrites measured z.
5. Switch **Classification source** to **Original practice library** and choose any
   of25 originals. Practice progress and each acquired workspace are independent
   across routes and source switches. Changing the practice object still clears
   only that current unsaved practice answer after successful loading, as the
   earlier UI did; prior recorded practice responses remain. Source failures or
   leaving during a load keep the previous committed workspace.
6. **Restore this acquisition in the telescope** returns its raw snapshot,
   deactivated, to the existing exposure controls. Activate explicitly to resume.
   Other archived classification work stays intact. Stellar measurements and
   classification responses never enter the Hubble dataset.

## One complete investigation and compatible practice files

**Save complete investigation** in classification, or **Save session** in the
analyser, stores the raw acquisition archive, current analyser controls, linked
measurements, Hubble inputs, practice progress and all acquired classification
workspaces in one analysis-session JSON. Version4 is emitted when classification
has work to preserve. Unused classification retains the existing v2/v3 output;
v1/v2/v3 inputs remain readable. Restoring a complete old investigation initializes
its absent classification workspace empty and replaces the whole investigation,
as explicitly stated in the UI. Save current work first if replacing it.

Reload and **Restore complete investigation** (or analyser **Restore session**) to
continue. Replay and all source/workspace links are checked before atomic
replacement; the current comparison originals are hash-verified or reused from
the bounded immutable verified cache. Imported cached curves, unsupported acquired
differences, dangling IDs, galaxy links, changed inventory and invalid raw journals
are rejected. Saving validates/replays structure but does not need a new network
read of the original atlas; restoring checks comparison sources before commitment.
**Cancel pending save/restore** prevents a late asynchronous result from replacing
work. Cancelling the file picker does nothing to the investigation.

The previous **Save classification session** version1 practice-only format still
works. Its dedicated restore and both unified restore entry points merge only the
practice workspace, retaining acquisitions, measurements and acquired responses.
The old three-object inventory fingerprint is accepted only when its original
atlas/line list and first-three mappings still match and all referenced IDs belong
to those three objects. Its immutable inventory is retained as
`legacy-v1-inventory.json`. A legacy fingerprint cannot assert a new practice or
an acquired snapshot. New practice-only files cover all25. Single-target exposure
journals still restore in the exposure tool; arbitrary SSP/CSV files cannot assert
an acquired classification origin by name or header.

The archive remains limited to8 snapshots/24000 archived events; classification
has100 responses total across workspaces. Full analysis JSON retains its16MiB
bound; practice-only JSON retains1MiB. The response log shows the active workspace.
**Export classification CSV** exports that log, including source file/hash,
reference pair and inventory. Acquired schema2 adds source kind and acquisition
ID with a no-resampling/manual policy. Existing practice CSV schema1 is retained.
CSV is not a replay backup. No JSON includes a hidden expected classification.

## Remaining acceptance

Arbitrary imported-spectrum classification, equivalent-width/
intensity tools, broader instrument configurations, native result/grade files,
full historical exercise outcomes and educator evaluation remain open. The
manual/data support the teaching workflow, not native machine-code/state/format
fidelity. Number, printed-grid retention, SVG, per-source drafts and JSON/CSV are
explicit web adaptations; native x87/GDI/runtime equivalence remains unverified.
Original resources/hashes and the source-plus-sky policy were preserved. No
Windows/CLEA execution/emulation, Claude, installation, push, remote repository,
public upload or deployment was used.

## Current local verification

TypeScript/build,226 Vitest tests and47 Playwright flows passed; desktop/mobile
were visually inspected. Exact checks, corrections and remaining validation:
[CLASSIFICATION-CONTINUITY-VALIDATION.md](CLASSIFICATION-CONTINUITY-VALIDATION.md).
