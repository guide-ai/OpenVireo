# Acquired-star classification continuity verification — 18 October 2026

Entries: http://127.0.0.1:5173/#star-exposure and
http://127.0.0.1:5173/#classification. The existing preview service was confirmed
active/running, Vite bound to127.0.0.1:5173 with strictPort. Settings unchanged.

- TypeScript/build (`npm run build`): passed on final code. The existing large
  scientific-data chunk warning remains; no dependency/service was added.
- Vitest (`npm test`): **226 passed in38 files** (baseline222). Numerical core and
  session tests passed after the new domain/link/migration checks.
- Final complete Playwright (`npm run test:e2e -- --workers=2`): **47 passed in
  46.2s** (baseline44). Final build/browser run followed the UI-only focus fix.
- Actual persistent-preview desktop and320px mobile screenshots visually checked:
  [external browser-evidence record] and
  [external browser-evidence record]. No horizontal overflow
  or page errors in the new complete continuity flow; keyboard pair selection
  keeps focus after loading.

The shared-domain evidence is3900–4500Å,361 acquired printed bins versus429
atlas samples. The acquired full domain3700–4698.33Å covers it, but the600/2799
printed grids differ. Tests require coverage, reject incomplete/nonfinite domains,
reject a pointwise difference on those grids and keep the acquired mode restricted
to visual brackets. No new interpolation, continuum correction, classification
answer, grading, noise or source model was added. The one source's A0000049.SP
input is explicit and cannot certify a physical type or independent correctness.

New unit/I/O checks cover archive-only source identity and curve hashes, missing/
galaxy/mismatched links, forbidden acquired difference, separate practice/acquired
drafts and records, CSV source tracing, replayed v4 raw data + Single measurement
bits + both classification workspaces, altered journals/inventory/selection, and
legacy practice fingerprint restrictions. Existing scientific/session tests remain
passing. The complete38 original SP hash/grid test now covers25 practices plus13
standards,106362 samples, with no key/expected-type data. All38 installed files
were independently byte-compared with their unchanged original local sources;
the previous16 are unchanged and22 new selected local runtime assets were added.

Three new real E2E flows cover direct telescope classification with positive-count
gate, same-packet analyser measurement and return, manual confirm/cancel/repeat,
retained practice drafts, separate new-snapshot workspaces, acquired difference
unavailability, all25 practice choices, one v4 save/reload/restore, corrupted mode
atomic rejection, legacy practice merge without losing acquired records/measurement,
CSV acquisition identity, raw telescope restoration, cancelled pending restore
and suppressed late completion, mobile and retained keyboard focus. Existing six
classification paths and all Hubble/acquisition/SSP flows remain passing. Inputs
called operator proposals or selected z positions are workflow fixtures, not
physical classifications, measured answers or original-runtime reference values.

An initial cancellation test selected the same notice text in a visible classifier
and hidden analyser; it was corrected to select the visible status region. Visual
review then found focus moving to the heading after pair changes. Focus is now
set on route entry only; a regression assertion plus the final complete E2E run
verified the fix. No failure was ignored or converted to a scientific assumption.

Complete analysis v4 is used only when classification has progress. Existing
analysis v1–v3 remain readable and unused-classification v2/v3 output is retained.
Practice-only v1 is accepted by dedicated and unified restore entry points. Its
old three-object fingerprint is accepted only against the retained immutable old
atlas/line/prefix mappings and only for those three IDs. Complete-file restoration
replaces the investigation; practice-only restoration merges just that workspace.
No stored curve or classification-completion flag bypasses replay/link checks.
Pending-file cancellation prevents late state replacement. Current originals are
hash-checked/reused from the immutable bounded cache on restore; saving a valid
backup does not need fresh atlas network access. Bounds remain8 archived snapshots,
24000 archived events,100 total classification responses,16MiB full/1MiB practice
JSON. Classification responses and stellar measurements stay excluded from Hubble.

Evidence: `data/classification/{catalog,provenance,legacy-v1-inventory,acquisition-domain}.json`,
external `classification-link-recovery/{generate.py,original-source-manifest.json,domain-and-migration.json}`,
and prior `data/hubble/star-exposure-provenance.json`. The existing core star
acquisition, source template, raw-counter policy, journal replay, normalized body
and measurement arithmetic files were unchanged. Original downloads/analysis
remain outside source; selected SP assets serve only through the loopback preview.
The code/docs patch omits unchanged original SP bytes; the full manifest includes
each installed asset hash and all changed paths.

Open: broader acquisition configurations, luminosity atlases, arbitrary imported
classification spectra, equivalent-width/intensity tools, native result/grade
formats, educator evaluation, native x87/GDI/runtime equivalence and release/rights
acceptance. Original data/manuals justify the bounded workflow; no native classifier
or SSP writer oracle was available. No Windows/CLEA execution/emulation, Claude,
installation, remote repository/push, public upload or deployment. No auto-review
rejection or remaining execution blocker occurred. Existing external-review
restrictions remain; N02/E03 are still partial.
