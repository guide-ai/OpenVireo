# Luminosity atlas increment validation — 18 October 2026

Implemented in `/home/dobleuber/Projects/personal/clea-web` and served by the
existing `clea-web-preview.service` at http://127.0.0.1:5173/#classification.
The service was confirmed active/running and listening only on 127.0.0.1:5173.

## Delivered contract

Seven original luminosity tables join the original main-sequence table. The
ATLAS2.LST order, 38 atlas memberships and exact mixed-nearby-type labels remain
explicit. Together with 25 practices they use 57 unique SP files, 19 newly copied
local resources. The previous 38 copies are unchanged. All 159543 printed sample
rows are finite 0–1 on the identical 2799-point 3510–7427.2 Å grid. No grading key was
read or copied. Source hashes, original paths, manual pages and license scope are
in `data/classification/provenance.json`; the external source/association witness
and generator remain outside the web source under
`/home/dobleuber/Documents/Codex/2026-10-18/task-3/luminosity-recovery/`.

The student's draft and recorded answer remain manual. Each record binds its
own atlas/pair; later browsing cannot change that meaning. Failed verification,
invalid restoration and cancelled/late source loads retain prior work. Keyboard
focus returns to a source-load control after its disabled interval only when
focus fell to the document body; another deliberate focus target is respected.

Full investigation v5/practice v2 bind new atlas context. Unchanged main-sequence
outputs retain v4/v1 and the old inventory fingerprint; old three-practice files
retain their guarded migration. New CSV schema 3 carries each recorded atlas
identity/file/hash. Existing main-only CSV1/2 stay compatible. Full restoration
retains raw replay, manual measurement bits, practice/acquired drafts and records;
practice restoration merges only its workspace. Classification never supplies
Hubble measurements, distance inputs or fitting points.

## Verification on the actual repository

- `npm run build`: passed (`tsc -b` plus Vite). The existing large-chunk advisory
  remains; no new dependency or server/backend was introduced.
- `npm test`: 39 files, 231 tests passed (1.52 s).
- `npm run test:e2e -- --workers=2`: 50 tests passed (52.6 s) against the persistent
  loopback preview. This includes the existing Hubble, multi-galaxy, SSP roundtrip,
  stellar acquisition, manual measurement and old classification flows.
- Three new browser flows cover all seven groups and pair boundaries, mixed
  labels, retained drafts/focus, difference for same-grid practice, review cancel
  then save, recorded-context CSV, navigation/reload, practice/full restoration,
  source SHA failure, delayed source cancellation, invalid-atlas restore, and
  acquired-star mobile comparison with manual measurement/full replay/raw restore.
- Five new Vitest contracts cover all 57 source hashes/grids, original labels,
  record-bound CSV, per-atlas pair/schema validation, guarded old/new practice
  serialization and v5 raw/measurement replay with acquired-difference rejection.
- A separate read-only audit rehashed 74 immutable source/manual/license/list
  files and compared all 57 runtime SP copies byte-for-byte with originals.
- Desktop 1440 px and mobile 320 px real browser screenshots were visually inspected:
  plots and selectors are readable, selected atlas/pair and recorded context are
  visible, mobile controls and source identities wrap without horizontal overflow.
  Copies: `.local/qa/openclea-luminosity-desktop.png` and
  `.local/qa/openclea-luminosity-mobile.png`.

The isolated candidate initially exposed an obsolete main-only CSV fingerprint
assertion after the inventory expansion, two focus assertions and one existing
help-copy assertion. Main-only exports deliberately retain the old fingerprint;
that assertion was corrected to the legacy contract. The helper sentence was
retained. The focus defect came from temporarily disabling the focused select;
a post-commit guarded focus restoration fixed it. An initial requestAnimationFrame
attempt still lost focus in one fast atlas load and was replaced by a layout
effect tied to the busy transition. All nine affected classification browser
flows then passed together; the complete 50-test integration passed afterward.

## Scientific and review limits

The original lists establish associations, not physical classification truth.
Difference remains the declared Number adaptation `I_standard - I_practice` on
identical printed wavelengths. No native classifier, x87/runtime or binary-output
equivalence is claimed. The acquired source retains its actual 600-bin summed
source-plus-sky curve; its grid differs, so difference is disabled for every atlas.
No luminosity, radius, absolute-magnitude, temperature or distance formula is added.

Original execution, Windows/emulation, Claude, installs, remote repository/push,
publication and uploads were not used. The user explicitly prohibited Claude for
this increment; this is not a new external/Claude review. Tests and local static
review do not replace a native oracle or astronomy-educator acceptance. N02/E03
remain partial in the implementation plan.

The next quantitative criterion is recovery of the native feature/equivalent-width
contract: source hash plus address/range, continuum and selection rules, sampling/
integration and units, error/cancel behavior, then independent grid/continuum
vectors. Manual area definitions alone are insufficient. Imported-spectrum
classification and native result/grade contracts are also still open. No denied,
pending or uncertain tool action remains for this delivered package.

## Supporting artifacts

`/home/dobleuber/Documents/Codex/2026-10-18/task-3/luminosity-integration/` contains
pre-change backups, before/after SHA-256 manifest, unchanged-source hashes,
source-validation receipt, verification receipt and a code/documentation patch.
The patch excludes original SP bytes and screenshots; the manifest identifies
all 19 new local SP copies. Existing unrelated source/scientific contracts and
prior-increment receipts are preserved. Step-by-step usage is in
[LUMINOSITY-ATLASES.md](LUMINOSITY-ATLASES.md).
