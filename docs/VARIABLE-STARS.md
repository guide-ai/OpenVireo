# Variable stars and light curves (Front V, V1–V3)

Status: implemented on branch `claude/front-v-variables-43a775`; independent high-effort review by the coordinator is
pending. Implementation: Claude Code (claude-opus-5-5), medium effort; plan at high effort (Plan subagent) in
`analysis/front-plans/front-v-variable-stars.md` of the research root.

Static analysis only: GNU objdump on exact address ranges of CLEA_VEO.exe (SHA-256
781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c) plus a Delphi 2007 VMT walk; REA had no decompiler
provider configured. Nothing was executed or emulated. Full recovery notes with addresses, annotated listings and the
witness scripts are outside the repository: `/home/dobleuber/Documents/Codex/2026-10-17/task-2/analysis/front-v-variable-stars/`
(`RECOVERY.md`, `dossiers/`, `tools/variable_witness.py`).

## What the student can do

| Step | Web | Original | Tag |
|---|---|---|---|
| 1 | Analysis › **Variable stars**: search CLEA_VStrs.dat by name and/or variability type, press Open | Click a star in the Telescope view, then **GCVS** in the Catalog Object box (shown only for stars with a variable record, Telescope view only) | **adaptation** |
| 2 | **Variable Star Data** window with eleven lines | TVStarListForm1 (same lines) | original |
| 3 | Data › **Display Light Curve...** | same | original |
| 4 | **Simulated Light Curve**: 1.5 cycles from the epoch, VIREO layout and colours | TLtCrvDsplyForm1 | original (fonts differ) |
| 5 | Data › Save Text › **As Displayed...** downloads `<GCVS ID>.TXT` | Save dialog, empty default name, `.TXT` | adaptation (file name, browser download) |
| 6 | Data/File › **Print...** opens a print preview | printer pages with lab table and student names | adaptation |
| 7 | **Help** shows VarTypeHlp.TXT sections | CLEA help viewer via VarTypeHlp.LST | adaptation |

One-line labels shown in the app: the entry adaptation (`variable-adaptation`), "The plot keeps VIREO's layout, colours and
pixel positions; fonts differ.", the Save Text and Print adaptations, and the Help note. A short guide ("How to use this
tool") explains the steps and that the curve is VIREO's simulation, not an observation.

## Resources (V1)

| File | Bytes | SHA-256 |
|---|---|---|
| public/original/variables/CLEA_VStrs.dat | 2,865,524 | 55b7e3c3…dc87de |
| public/original/variables/VarTypeHlp.TXT | 743 | d92f4a14…f445 |

Byte-exact from CLEA_Vireo.zip (58dc02a6…6778b), `program files/CLEA/VIREO/`, under the approvals of 2026-10-26
(CLEA_VStrs.dat) and 2026-10-27 group 1 (VarTypeHlp.TXT) in AGENTS.md. Manifest 1316 → 1318 (`docs/LOCAL-RESOURCES.json`,
`docs/RESOURCE-PROVENANCE.json` new group `public/original/variables`, `THIRD_PARTY_NOTICES.txt`). `totalBytes` in
RESOURCE-PROVENANCE.json was recomputed from the file list (it was 176 bytes low before this change; the per-group byte
totals still carry that older 176-byte difference). VarTypeHlp.LST (the original help index) is not approved and not included.
The catalog appears to derive from the GCVS (Samus et al.); that attribution is an inference and uncertain.
`src/io/bundledVariableStars.ts` fetches both files from this origin, bounded to and checked for size and SHA-256 before
decoding.

## Record (`src/core/variableStars.ts`)

92 bytes, little-endian, 31,147 records sorted by RA: ID ShortString[≤10] @0, RA Double @11, Dec Double @19, type
ShortString[≤11] @27, max flag @38 + max Single @39, min flag @43 + min Single @44, magnitude system ShortString[≤2] @48,
epoch Extended @51, period flag @61 + period Extended @62, M−m/D Word @72, spectrum ShortString[≤17] @74. Offsets are read by
the list fill 0x52ccec and agree with the merge reader `variableMerge.ts` (Front F). 13,189 records have period 0 and 22,868
have no M−m/D.

## List lines (0x52ccec)

Labels from 0x52d168..0x52d2c0. RA and Dec through 0x486ca0 (digits 2 and 1; sign slot, whole part padded to 4, two-digit
minutes, '0'-prefixed seconds). Magnitudes `flag + FloatToStrF(x,2)` with one trailing '0' removed and ')' after a '(' flag;
epoch with 5 decimals and period with 8 decimals, all trailing zeros removed (the '.' stays, e.g. `2445090.`); M−m/D printed as
`word/100` with 2 decimals (so 25 % shows `0.25`, as in VIREO). FormShow rebuilds the list each time the window is shown.

**List Type Codes** only toggles its own check mark (0x52d334); no reader of the flag exists. **Comma Delimit** is disabled in
the DFM and has no handler.

## Light-curve model (0x51f0f8, 0x51f298, 0x51f33c)

The form always builds a **CepheidTypeObj**, whatever the variability type. bright = max (or min − max when the max flag is
'('); faint = min (or max + min when the min flag is '(', an amplitude). A zero M−m/D word is replaced by **50 in the in-memory
record** (so a later list shows `0.50`; the app models this per record and shows a note). With f = 1 − word/100, A = (faint −
bright)/2 and φ = Frac((t − E)/P) (+1 if negative):

- φ ≤ f: m = faint − A·exp(−φ/f)·(cos(πφ/f) + 1)
- φ > f: m = faint − A·(cos(−π(1 − φ)/(word/100)) + 1)

The result is a Single. There is **no noise** and nothing is fitted. **Unavailable, typed**: `period-zero` (P = 0, 13,189
records: VIREO raises a floating-point exception in the paint handler after drawing the axes, so the app draws the axes and
explains why there is no curve) and `zero-decline-fraction` (M−m/D = 100 %, none in this file). The light curve of an eclipsing
or irregular variable is therefore Cepheid-shaped, exactly as in VIREO; the guide says so.

## Plot (0x52b6f4, 0x52b9cc, 0x52c090)

Box left 75, top 40, right 630, bottom 290 in a 654×336 display. Faint bound: Round(F) + 1 (Frac < 0.5) or + 0.5, minus 0.5
when more than 0.6 below; bright bound symmetric. Magnitude ticks every 0.5 mag (15 px on integers, 10 px otherwise, both
edges) with four 5 px minor ticks; phase axis 0.0–1.5 with labels at each 0.5. Texts: GCVS ID at top left, type right-aligned
at top right, "<system> mag" above the axis, "Phase" centred below. The curve samples every pixel column from the epoch
(step P·1.5/555). Screen colours navy/white/yellow; print white/black.

## Numeric policy

Binary64 Number/Math replace x87 Extended; Singles via Math.fround; Round is half-even (control word 0x1332); Frac is
x − trunc(x). Extended epoch/period are decoded exactly (BigInt) for text and rounded to the nearest binary64 for computing.
FloatToStrF rounds the exact value half away from zero (the Delphi 18-digit decimal stage is not re-derived). This is not x87
equivalence; a pixel may differ at an exact .5 boundary. Text widths are not reproduced: the type label is right-aligned and
"Phase" centred with SVG anchors.

## Evidence

- `src/core/variableStars.test.ts` (61 tests): the bundled bytes equal the manifest and the witness's SHA-256; all 31,147
  records decode with the witness statistics; for 24 witness records (flagged, period 0, M−m/D 0 and ≥ 100, negative Dec,
  del Cep, RR Lyr, omi Cet, HI Peg, bet Per…) the eleven lines, the lines after the M−m/D default, the axis bounds, every one of
  the 556 curve pixels and seven model samples equal the Python witness (`tools/variable_witness.py`: struct + fractions +
  math, written separately); explicit bounds, layout, Save Text bytes, help sections, search and fetch failures.
- `tests/variable-stars.spec.ts` (6 flows): header navigation, type filter, list lines and curve pixels from the witness,
  period-0 notice with axes, the M−m/D default after reopening, Save Text download bytes, Help and print preview, 320 px.
Tests are evidence of the chosen contract, not of original-runtime equivalence.

## Not done (follow-ups)

- **Catalog Object dialog** for arbitrary observatory stars and the GCVS button path (needs the field engine to carry variable
  records; Front F).
- **TVarFldLstForm1** (Field Information › Variable Stars: "All GCVS variables in region" / "VIREO-modeled varibles in region");
  its menu is shown only when options byte +0x2e7e is set, whose default was not traced.
- **Pleiades "mixed-variable-field" stars** (4 of the 8 unavailable): the field merge 0x597ac8 → 0x51ec95 builds
  CepheidTypeObj/LPVTypeObj objects for type classes 0/1/2 and updates their magnitudes with time. Mag(t) is now recovered
  (`lightCurve.ts`), but unblocking needs Front F to port the class → object dispatch 0x51ec95..0x51ee57, LPV Init
  0x520648/0x520b2c, the time-update caller and the instruments' use of the updated magnitude and spectrum (virtuals v2–v6), all
  in Front F files (`variableMerge.ts`, `fieldEngine.ts`). Not done here.
- Printer layout and the CLEA help viewer; saving this page's state with the investigation (not needed: it is a browsing aid).
