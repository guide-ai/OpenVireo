# Hubble analysis interface

Local analyzer route: http://127.0.0.1:5173/#spectrum → **Hubble diagram & distances**.
The English interface connects the previously verified pure distance and summary
contracts to an input table, diagram, source evidence, CSV and session JSON.
It does not enable acquisition, execute CLEA or claim an original experiment.

## Source choices

The initial recipe is empty. Select either:

- **Distributed workbook:** Hubble Data.xls, Sheet1!J2 = −21.0, F/G distance
  formulas and H16 = AVERAGE(H2:H14). Plot points only. No line is fitted to
  this mean; the original workbook has no persisted trendline.
- **VIREO targets + student manual:** Vireo Manual.pdf recommends M = −21.4
  for 13 named targets. The separate 24 November 2008 student manual pp. 11–12
  prescribes linear XY fitting with intercept fixed to zero. The existing
  unweighted sum(Dv)/sum(D²) helper is the mathematical implementation of this
  prescription, not a recovered native VIREO regression. The UI requires at
  least two complete rows to draw the fit; this is a new presentation rule.

The earlier standalone M = −22.0 is a distinct edition/model and is not offered
with either summary. Formula and complete artifact hashes are visible in the
interface and exported with the chosen recipe. The original evidence remains
in `data/hubble/hubble-distance-provenance.json` and
`docs/HUBBLE-DISTANCE-RECIPES.md`.

## Inputs and provenance

**Saved measurements** link by measurement ID. Velocity is the existing
Number c × saved Single z → Single stored velocity contract; identity, SHA,
z bits and numerical policy remain in CSV/session. Apparent V and its source
must be entered explicitly. A source claim is not independently verified by
the application. No magnitude or distance is inferred from redshift or a label.
For M = −21.4 the operator must identify a designated target explicitly.

**Documented inputs** require an object label, finite decimal km/s velocity,
velocity source, apparent V and magnitude source. Changing a magnitude or documented velocity clears
its source to avoid retaining a citation for an edited value. Changing an
operator object label clears the explicit target identification. These rows are
operator inputs, never acquisitions. Signed and zero velocities are supported.

**Original workbook example** loads only into an empty Hubble workspace and
is read-only. Its 13 z and V inputs come from Sheet1!D2:D14/C2:C14; z is
original Double, not reconstructed from velocity. Velocity is recomputed with
original Double I2 = 299792.458 without Single narrowing. CB-2 (54876) precedes
CB-1 (54875), preserving the sheet rather than hot-list order. The identity
mapping and recovery-source hash are in `data/hubble/workbook-examples.json`.
Examples do not enter the measurement log or observation state. Examples and
working rows cannot be mixed; clear the Hubble workspace to switch datasets.

Every row must be complete for a summary or graph. No incomplete row is
silently dropped. Finite/range guards use existing helpers; strict decimal
input also rejects textual nonzero values that underflow to Number zero.
The UI caps the workspace at 200 rows; no statistical suitability, uncertainty,
weights, free-intercept regression, R², original Excel arithmetic or x87
numerical equivalence is claimed.

## Persistence and export

Session version 2 stores recipe and input drafts, source claims and linked
measurement/example identity. It never stores a trusted cached distance or
summary. Restore rejects unknown fields, invalid IDs/targets, dangling or
duplicate measurement links, duplicate example rows and mixed datasets, and
commits the complete state atomically. Incomplete numeric drafts remain
portable. Strict version 1 sessions migrate to an empty Hubble workspace.
Existing file size, source-text hash verification and measurement re-derivation
remain in force. Sources and old-file digests are identity claims rather than
proof that historical observations were re-verified.

The separate Hubble CSV includes raw drafts, incomplete-row status, row origin,
source claims/hashes, recipe/M/method, precision policy, derived distances and
summary status. Text fields are CSV escaped and formula-neutralized. It is a
new browser analysis export, not original CLEA observation bytes or a session
backup. Saving/restoring never requires a server or external upload.

## Validation and restrictions

Vitest covers independent Decimal90 worksheet/manual results, recipe changes,
unequal-distance method discrimination, original CB order, precision separation,
incomplete/source/target guards, range failures, CSV text handling, schema/link
bounds, v1 migration and v2 roundtrips. Playwright covers all three input routes,
repeated export/restore/add, atomic rejection, keyboard focus, mobile at 390 and
320 CSS pixels, and graph/table output. Screenshots are retained with the
verification receipt. Original examples give mean ≈86.61395485 for M = −21.0;
reanalyzing them with M = −21.4 and the manual origin recipe gives
≈52.49829194. These are distinct sourced calculations, not new acquisitions.

Native Claude code/security reviews remain blocked/pending from earlier
permission denials. No retry, alternate external review, permission change,
manual upload request, Windows execution, public deployment or push was made.
