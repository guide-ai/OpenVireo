# Imported SP/SSP visual classification

Entry: http://127.0.0.1:5173/#classification → **Import spectrum for comparison**.
An already imported analyser file also has **Compare imported spectrum** when it
meets the comparator's declared domain. This is a bounded N02/E03 source adapter,
not a new spectrum, normalization model, native file-dialog reproduction or an
automatic spectral classifier.

## Data boundary and supported operations

The adapter reuses `io/spectrumFiles.ts` unchanged. Its bounded UTF8 byte decoder,
SHA-256, headerless SP/CSV parser and marker-based SSP parser are the same as the
analyser's. `.ssp` suffix does not select a format: the `*SpHdr* ` marker does.
Existing SSP profile: ASCII, optional magnitude, 600 increasing printed rows,
LF/CRLF; unsupported BOM/codepage/decimal-comma variants still reject. Headerless
UTF8 SP/CSV can retain its original BOM. The parser's original limits of 2 MiB and
50000 samples apply before comparison. No new permissive decoder is introduced.

Native reader `0x55ee14`, the saved-spectrum dossier and the published
classification load-handler identity `0x50829c` provide background/provenance.
The web parser deliberately preserves printed wavelengths rather than the native
reader's endpoint reconstruction. Imported source scopes, archive rules and JSON
state are new web behavior. See [SPECTRUM-SAVE-CONTRACT.md](SPECTRUM-SAVE-CONTRACT.md),
`data/classification/import-provenance.json` and the immutable original hash records.
No original execution, native writer oracle or binary/runtime equivalence follows.

To enter this comparator, a source must span 3900–4500 Å, contain at least two
supplied samples inside that window, and retain finite increasing wavelengths and
all intensities in 0–1. Coverage verifies bounds/points, not signal quality, a
continuum, an isolated spectral line or a stellar identity. An SSP with signed
flux can remain valid in the analyser while being outside this comparator profile.
Flux above one or below zero is not normalized or clipped to make it acceptable.
Invalid/partial/unsupported files keep the previous source, curves, drafts and logs.

The graphs retain parsed supplied points. Lines connect visible supplied samples;
no extra samples, smoothing, noise, redshift correction or wavelength alignment is
introduced. An analyser z/control setting is retained in its own workspace and
does not shift this comparison's file. Standard/unknown subtraction is enabled
only when **every parsed Number wavelength in the entire file**, including row
count and ordering, equals the original printed atlas grid. Endpoints, nominal
step or row count alone are insufficient; no tolerance/interpolation is used.
A window-only subset remains visual-only even if its visible points coincide.
The loader also checks the actual verified upper-standard grid before showing
an imported difference. The subtraction is the already declared Number adaptation,
not an original x87 oracle or a score/best-match search.

`printed-grid.json` is a derived coordinate-only guard, generated from the pinned
original A0000001.SP and checked against all 57 original resources. Its source
hash and derived SHA-256 are retained in the import provenance. Reproduction:
`/home/dobleuber/Documents/Codex/2026-10-18/task-3/classification-import-recovery/prepare_grid.py`.
Original assets remain unchanged; no additional original SP was copied into public.

Equivalent width remains disabled for every import, including a file whose grid
matches an original practice. Original-practice width drafts/records remain
available in their own workspace. Imported loader/continuum/FPU semantics must be
validated separately before extending that numerical tool.

## Identity and non-destructive workflow

The explicit import/compare action assigns the file the role of an unknown for
visual inspection. Its name/header never fills the proposed spectral type or
reasoning. Header coordinates/object/magnitude are unverified file claims and
never create a catalog link, acquisition journal, exposure, RNG state or grade.
Even copying original or acquired file bytes does not grant that imported source
an original-library/acquisition origin in classification.

Each SHA-256 identity gets a separate atlas/pair, manual draft and response log.
Equal bytes select the existing state, preserving the first retained name; an
alias filename does not reset it. Different bytes with the same filename remain
distinct choices, with digest prefixes and full current identity displayed.
There are at most four files and 4 MiB combined exact UTF8 text. The application
never evicts an earlier file to make room. The existing 100-classification limit
is shared across practice, acquired and imported response workspaces.

Cancelling the real file chooser does nothing. **Cancel spectrum import** or
navigation invalidates a pending local read/reference load; a late completion
cannot append a file or replace a newer source. Existing acquisitions, their
raw replay journals, measurements, Hubble work, classifications and practice
width work remain retained. No auto-persistence/backend/IndexedDB was added.

**Open this imported file in analyser** uses the shared verified source. If that
same file is already active, existing analyser controls and measurements stay.
Otherwise the file becomes the current analyser input with explicit fresh manual
controls; older log rows/archives remain. The analyser's existing exact-match
acquisition rule remains: unambiguous raw-byte matches can select an already
archived snapshot, while ambiguous matches reject rather than invent provenance.
The imported classification state itself is retained as a separate file context.

## JSON, CSV and restore

Full investigation v7 is emitted whenever imported classification files exist,
even if the current view is practice/acquired. It binds the unchanged original
inventory fingerprint plus `OpenCLEA-visual-import-v1`. Each imported source stores
only name, SHA-256 and exact text, alongside its manual input state. Samples,
header metadata, grids and computed results are not accepted as cached authority.
Restore repeats byte bounds, hash, parsing, coverage, grid/mode and source/log
link checks before a single investigation replacement. Duplicate files, mismatched
IDs, forged samples, invalid widths or old-schema smuggling reject atomically.

Full v1–v6 and practice-only v1–v3 remain readable. Work without imported files
keeps its earlier output version. Practice-only restore merges only practice and
retains file/acquired work; its save buttons appear only for the practice scope.
**Save complete investigation** backs up all imported files and their responses.
The 16 MiB whole-session bound remains; failed/cancelled saves/restores never
remove archived work. Reloading without a saved JSON still loses unsaved work.

Imported classification CSV is schema4 and explicitly identifies source file,
SHA-256/kind/identity, recorded atlas/hash and the student's response. Legacy
practice/acquired CSV schemas1–3 retain their format. CSV formula-like strings
are escaped; imported names, header text and proposals are rendered as text.
CSV does not back up file bytes or all workspaces. **Download exact imported
spectrum** returns the retained bytes, including supported BOM/line endings.

## Exact steps to try

1. In the analyser, import a normalized SP covering the interval and select
   **Compare imported spectrum**; or use **Import spectrum for comparison** here.
   The new file begins with an empty proposed type/reason. Its header is not an answer.
2. Inspect **Imported unknown spectrum**, SHA-256, sample count and range. With
   a nonmatching grid, **Standard − unknown** is disabled. A full original-grid
   file enables it; changing atlas does not interpolate or shift the file.
3. Enter **Proposed spectral type** and **Features and reasoning**, then review.
   Cancel adds no row; save records your own interpretation and chosen atlas/pair.
4. Import another file, return through **Classification source**, then reimport
   the first bytes under another name. Its draft/log remain and no duplicate is added.
   Try an invalid/partial file or cancel a selection/read: the prior state remains.
5. **Download exact imported spectrum** and **Export classification CSV**. Save
   the complete investigation, reload, restore it and return to each source.
   Raw acquisition/measurement links and practice-width drafts also survive.
6. Use **Open this imported file in analyser** to inspect/measure the retained
   file, then **Compare imported spectrum** to return to the same manual response.

## Remaining scope

This bounded file link is implemented. N02/E03 remain partial: native cursor/Y
intensity/photo/zoom behavior, broader imported flux/locale/codepage profiles,
standalone/native result/grade files, imported/acquired equivalent widths and
astronomy-educator acceptance remain open. No physical class validation or native
x87 equivalence is claimed. A concrete next feature is the manual wavelength/
trace-intensity cursor from the already documented `0x5096dc` contract, with
explicit SVG mapping and source-bound portable state; photo sampling stays separate.

No Windows/CLEA execution/emulation, Claude, installation, remote repository/push,
public upload or deployment. Original license scope remains local research only.
