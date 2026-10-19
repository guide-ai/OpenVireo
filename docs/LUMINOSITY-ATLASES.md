# Original luminosity atlases with manual MK responses

Current feature-width extension: see [FEATURE-WIDTH.md](FEATURE-WIDTH.md) for the
recovered contract, bounded manual practice implementation and remaining branches.
Earlier quantitative-width pending statements below are historical for this subset.

Entry: http://127.0.0.1:5173/#classification → **Spectral atlas**.
The existing 25-practice/acquired-star comparator is extended rather than replaced.
The main-sequence path and its old outputs remain compatible. This is a bounded
N02/E03 reference-comparison feature, not a generic label picker or a recovered
native luminosity estimator.

## Direct original associations

ATLAS2.LST names eight original ATL files. MS.ATL supplies 13 main-sequence
entries. The seven additional lists supply 25 luminosity entries in this order:

| Original atlas | Exact labels in order | File |
| --- | --- | --- |
| Luminosity near O8 | O8 I; O8.5 III; O8 V | O8_LUM.ATL |
| Luminosity near B2 | B2 I; B2 II; B2 III; B1.5 V | B2_LUM.ATL |
| Luminosity at A3 | A3 I; A3 III; A3 V | A3_LUM.ATL |
| Luminosity at F5 | F5 I; F5 II; F5 III; F5 V | F5_LUM.ATL |
| Luminosity at G2 | G2 I; G2 III; G2 IV; G2 V | G2_LUM.ATL |
| Luminosity at K0 | K0 I; K0 III; K0 V | K0_LUM.ATL |
| Luminosity near M2 | M2 I; M3 II; M3 III; M1 V | M2_LUM.ATL |

Labels, memberships, case-insensitive original filenames and row order were
read directly from the immutable text files, including terminal DOS EOF bytes.
The numeric 0 between label/file is retained in the external witness and left
uninterpreted; no unsupported nonzero branch is invented. Nearby subtypes are
not renamed to O8/B2/M2 or treated as constant-temperature controls. Several
files are reused across practices/main-sequence/luminosity entries; those aliases
remain distinct memberships, not independent new stars or duplicate observations.

There are 38 atlas memberships across 8 atlases plus 25 practice memberships,
using 57 unique SP resources (19 new local runtime copies). Every SP has 2799
finite 0–1 samples and the same printed 3510–7427.2 Å grid. All existing 38 copies
remain unchanged. SHA-256/source/archive/license/manual records and original
atlas/file/label witnesses are in `data/classification/provenance.json` and
external `/home/dobleuber/Documents/Codex/2026-10-18/task-3/luminosity-recovery/`.
No CLASSIFY.KEY was read or bundled. Original archives/manuals/analysis remain
outside the web tree; selected SP copies serve only through the loopback preview.

## Manual and numerical contract

VIREO Manual pp 24–27 describes temperature/luminosity atlas comparison, adjacent
standards and the results form. Original CLASSHLP.TXT, **Load Standard Spectra**,
recommends the main sequence before luminosity. The 2008 Classification student
manual p 3 introduces MK luminosity numerals and optional luminosity exploration;
pp 7–10 describe the 3900–4500 Å practice view and difference concept. The exact
manual PDFs and help/list bytes are hash-bound in the manifest.

The learner first estimates temperature class from main-sequence patterns and
then chooses a relevant original near-type atlas. A proposed MK type and the
features/reasoning are entered manually. Changing atlas resets only the pair to
its first adjacent entries; it retains the draft answer and the existing log.
Each saved response captures its own atlas ID and pair. Later browsing does not
reinterpret that record using the current atlas. No proposal is filled from a
catalog index, template name, selected standard or a grading key.

The only comparison formula remains the declared Number adaptation
`D(lambda) = I_standard(lambda) - I_practice(lambda)` at identical printed
wavelengths. All newly added originals pass that same-grid guard. There is no
new continuum normalization, resampling, smoothing, fitting or automatic score.
The relative-flux height is not an absolute luminosity or distance measurement.
No radius, temperature, absolute-magnitude or luminosity formula is added.

Acquired-star data retain their actual 600-bin source-plus-sky curve and
replay/measurement links. They cover 3900–4500 Å but their printed grid differs
from the atlas, so acquired differences stay disabled for every atlas. The
assigned A0000049.SP template remains explicit and is not an independent
classifier truth reference. Manual luminosity exploration does not certify the
physical class or native-runtime fidelity of that bounded simulated source.

## Try the feature

1. Open the URL, choose a **Practice object** and compare **Main Sequence** first.
   In **Spectral atlas**, choose for example **Luminosity at G2**. The initial
   pair is G2 I/G2 III; the last pair is G2 IV/G2 V. The selector remains focused
   after a verified load. Previous/Next do not wrap.
2. Compare other groups if appropriate. **Luminosity near O8** visibly keeps
   O8.5 III, **near B2** keeps B1.5 V, and **near M2** keeps its M1/M2/M3 labels.
   Select **Standard − practice** if useful; no best-match score is reported.
3. Write **Proposed spectral type** and **Features and reasoning**. **Review
   classification** shows the original atlas and pair before confirmation.
   Cancel/Escape leaves the draft and adds no row. **Save classification** records
   your own interpretation; repeat after more comparison if needed.
4. Change atlas again. The saved log still names the original comparison atlas.
   **Export classification CSV** includes each recorded atlas name/ID/file/hash
   when luminosity is present (schema 3), not the atlas currently being browsed.
5. **Save complete investigation**, reload and **Restore complete investigation**
   restore atlas, pair, draft/log, raw archives and analyser/Hubble state together.
   **Save classification session** remains a practice-only export and can be
   restored/merged through either compatible restore entry point.
6. From **Star exposure**, acquire useful counts and **Classify acquired star**.
   Choose a luminosity atlas and make a cautious manual proposal. Difference is
   still disabled. **Measure this acquired star** and return to classification
   without losing its atlas/draft/records. Full restore preserves the acquired
   journal and manual measurement bits. Raw telescope restoration is deactivated.
7. A failed source/hash or cancelled load keeps the previous atlas/curve/draft.
   Invalid atlas IDs, pairs or inventory in a session reject atomically. Pending
   save/restore cancellation and the earlier size/archive/record bounds remain.

## Session and CSV compatibility

Modern state/records require an explicit atlas ID, validated against original
membership/pair bounds. Luminosity work uses full investigation schema 5 or
practice-only schema 2 and the expanded inventory fingerprint. This applies even
when only an older saved row uses luminosity and the current view is Main
Sequence; no reference context is dropped during export.

Unchanged main-sequence work deliberately keeps full schema 4/practice schema 1
and omits the new atlas field, with the previous full 25-practice inventory
fingerprint. Legacy reads default that known format's comparison context to Main
Sequence; they preserve the student's proposal verbatim and do not assume a V
answer. Old three-practice inventory files also remain supported under their
existing prefix checks. The immutable previous full inventory is retained as
`legacy-main-inventory.json`. Both original main standards and practices/line
identities must still match before accepting those old fingerprints. A legacy
file cannot smuggle a luminosity atlas field or use its fingerprint to assert
new memberships. Analysis v1–v3 support is unchanged.

Practice-only restoration merges that workspace and retains acquired responses
and measurements. Full restoration replaces the complete investigation after
schema, replay/link and current-source validation. Schema 3 classification CSV
adds atlas identity/file columns and uses the recorded table's SHA-256; legacy
main-only CSV schemas 1/2 remain unchanged in meaning. CSV remains an export,
not a backup. Existing 100-response,8-snapshot,16MiB full/1MiB practice limits stay.

## Acceptance boundary and next criterion

The eight original atlases, all associations and guarded reference comparison
are usable. Native form/window behavior, x87/GDI arithmetic, original result/
grade files, full instrument/standalone branches, physical class validation and
astronomy-educator evaluation remain open. No original execution or original
classifier oracle was used; static data and tests do not establish equivalence.

The next quantitative package is **spectral feature measurement/equivalent
width**. The manuals give a continuum-relative area definition and user-selected
center/shoulders, but that alone does not establish the native continuum,
selection, sampling/integration, units/conversion or cancellation/error branches.
Require an immutable source/range/hash dossier and independent grid/continuum
vectors before enabling a quantitative width or automated diagnostic. A generic
integrator or a physical luminosity model must not fill that recovery gap. The
current next-step criterion is therefore a concrete recovered measurement
contract, not another label/answer UI or an assumption that classification is done.

No Windows/CLEA execution/emulation, Claude, installation, remote repository/push,
public upload or deployment. Original licenses are not expanded; research-only
rights and existing review restrictions remain.
