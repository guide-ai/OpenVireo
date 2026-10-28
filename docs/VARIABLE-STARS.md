# Variable stars and light curves (Front V, V1–V3)

Status: implemented on branch `claude/front-v-variables-43a775`; the coordinator's high-effort review 1
(`analysis/reviews/front-v-review-1.md`) was applied: print page body (M1), the M−m/D note (M2), type bound 10 (L1), blank
type filter (L2), menu focus (L3), guide wording (L4), manifest scope (L5), table amplitude (L6), no mutation without Init
(L7), the `non-finite` test and the pinned witness hash. Implementation: Claude Code (claude-opus-5-5), medium effort. Plan: Plan subagent (claude-opus-5-5, high effort) in
`analysis/front-plans/front-v-variable-stars.md` of the research root. Honest note on order: the plan was launched first, but
the first drafts were written in parallel from the recovery notes; the plan's findings (section 0) were applied afterwards:
the two-stage FloatToStrF, signed M−m/D, inverted axes, the two extra typed faults, the Phase position, the print header
(caption removed), the session core and the epoch wording.

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
| 6 | Data/File › **Print...** opens a print preview of the page body (see Print) | printer pages | adaptation (date format, placeholder for the student/lab text, landscape layout, no fonts) |
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
ShortString[≤10] @27 (11 bytes up to the max flag; PStrNCat max 27 = 17 + 10 at 0x52ce11), max flag @38 + max Single @39, min flag @43 + min Single @44, magnitude system ShortString[≤2] @48,
epoch Extended @51, period flag @61 + period Extended @62, M−m/D signed int16 @72 (`fild WORD`), spectrum ShortString[≤17] @74. Offsets are read by
the list fill 0x52ccec and agree with the merge reader `variableMerge.ts` (Front F). 13,189 records have period 0 and 22,868
have no M−m/D.

## List lines (0x52ccec)

Labels from 0x52d168..0x52d2c0. RA and Dec through 0x486ca0 (digits 2 and 1; sign slot, whole part padded to 4, two-digit
minutes, '0'-prefixed seconds). Magnitudes `flag + FloatToStrF(x,2)` with one trailing '0' removed and ')' after a '(' flag;
epoch with 5 decimals and period with 8 decimals, all trailing zeros removed (the '.' stays, e.g. `2445090.`); M−m/D printed as
`word/100` with 2 decimals (so 25 % shows `0.25`, as in VIREO). FormShow rebuilds the list each time the window is shown.

**List Type Codes** only toggles its own check mark (0x52d334); no reader of the flag exists. **Comma Delimit** is disabled in
the DFM and has no handler.

FloatToStrF follows FloatToDecimal 0x40cbb5 [D]: 18 significant digits (ties to even), then half up at the requested
decimals. This differs from exact rounding for 5 periods (TZ Aur, TT Lyn, AE UMa, BV Del, BP Peg end in …62, not …61). The
web scaling to 18 digits is exact; the x87 scaling error (about 1 ulp) is not reproduced.

## Print (list 0x52d58c → 0x52d5e8, light curve 0x52c1cc)

The text `CLEA Exercise "VIREO - The VIRtual Educational Observatory" - ` + a VIREO string is stored in
`Printer.Title` (+0x18, read by BeginDoc 0x4430cc for StartDocA): it names the print job and is **never drawn on the page**,
so the preview does not show it. The page body, in order:

1. `DateTimeToStr(Now)` + `     Laboratory Table Number (Not Recorded)` (this site has no lab table). Date and time are
   shown in the browser's format [W]. Light curve: always (0x52c346..0x52c3b8), lab table from global+0x5fa+0xa4.
2. The student/lab ShortStrings at global+0x5fa: the first always, three more only when set (light curve
   0x52c3c3..0x52c470; list 0x52d798..0x52d840). Their contents come from elsewhere in VIREO and are **not recovered**;
   one labelled placeholder line stands in.

   **List print exception.** The list print sets [form+0x3b3] := options[+0x2e7e] xor 1 (0x52d656..0x52d662; options
   +0x6b4+0x27ca). When options +0x2e7e is set, [form+0x3b3] is 0: the date prints without the laboratory suffix
   (0x52d73a), all four student/lab strings are skipped (0x52d798), and the job title ends `Database Modification`. When it
   is clear, the suffix uses the lab table at options +0x6b4+0x27c1, else `(Not Recorded)`. This is the same untraced
   options byte that gates TVarFldLstForm1, so its default is unknown; the preview shows the clear-flag branch [W].
3. List print only: the window caption `Variable Star Data`.
4. The eleven list lines.
5. Light curve only, VIREO's landscape branch (0x52c4fd..0x52c571): `(Screen Image Printed on Next Page)`, a page break,
   then `<first student/lab string> - Page 2` (placeholder + ` - Page 2`). Then, in both orientations, the literal
   `CLEA Exercise "VIREO - The VIRtual Educational Observatory"` (0x52c848, no dash) and the plot in black on white.

Not reproduced: the portrait branch (plot on the same page), page layout and fonts, and the option (options +0x2e8d) that
lets VIREO print in screen colours; the preview always prints black on white [W]. The first reading (and plan finding 8)
put the job title on the page; review 1 corrected it, and the closure check (N1) added the list-print exception.

## Light-curve model (0x51f0f8, 0x51f298, 0x51f33c)

The form always builds a **CepheidTypeObj**, whatever the variability type. bright = max (or min − max when the max flag is
'('); faint = min (or max + min when the min flag is '(', an amplitude). A zero M−m/D word is replaced by **50 in the in-memory
record** (so a later list shows `0.50`; the app models this per record and shows a note only when the list on screen was
rebuilt from the 50, never right after Display). When the axis range is zero, SetRecord divides by it (0x52b940) before
Init (0x52b991), so the word stays 0; the session skips the mutation then (synthetic test). With f = 1 − word/100, A = (faint −
bright)/2 and φ = Frac((t − E)/P) (+1 if negative):

- φ ≤ f: m = faint − A·exp(−φ/f)·(cos(πφ/f) + 1)
- φ > f: m = faint − A·(cos(−π(1 − φ)/(word/100)) + 1)

The result is a Single. There is **no noise** and nothing is fitted. **Unavailable, typed**: `period-zero` (P = 0, 13,189
records: VIREO raises a floating-point exception in the paint handler after drawing the axes, so the app draws the axes and
explains why there is no curve), `zero-decline-fraction` (M−m/D = 100 %), `axis-range-zero` (equal axis bounds: no window)
and `magnitude-system-empty` (fault after the magnitude axis); the last three occur in no bundled record (synthetic tests).
`non-finite` is a defensive reason for a non-finite model value (synthetic test).
VIREO draws the catalog epoch as maximum light (phase 0) for every type, though for eclipsing binaries the GCVS epoch is a
minimum. The light curve of an eclipsing
or irregular variable is therefore Cepheid-shaped, exactly as in VIREO; the guide says so.

## Plot (0x52b6f4, 0x52b9cc, 0x52c090)

Box left 75, top 40, right 630, bottom 290 in a 654×336 display. Faint bound: Round(F) + 1 (Frac < 0.5) or + 0.5, minus 0.5
when more than 0.6 below; bright bound symmetric. Magnitude ticks every 0.5 mag (15 px on integers, 10 px otherwise, both
edges) with four 5 px minor ticks; phase axis 0.0–1.5 with labels at each 0.5. Texts: GCVS ID at top left, type right-aligned
at top right, "<system> mag" above the axis, "Phase" centred below. The curve samples every pixel column from the epoch
(step P·1.5/555). Screen colours navy/white/yellow; print white/black. 155 records (min 0.0, blank flag) have an inverted
range: no magnitude ticks, swapped labels, and a curve that leaves the box (no clipping, as in the TImage). "Phase" is
centred at x = 352 ((left+right) sar 1).

## Numeric policy

Binary64 Number/Math replace x87 Extended; Singles via Math.fround; Round is half-even (control word 0x1332); Frac is
x − trunc(x). Extended epoch/period are decoded exactly (BigInt) for text and rounded to the nearest binary64 for computing.
FloatToStrF as above. This is not x87
equivalence; a pixel may differ at an exact .5 boundary. Text widths are not reproduced: the type label is right-aligned and
"Phase" centred with SVG anchors.

## Evidence

- `src/core/variableStars.test.ts` (89 tests): the bundled bytes equal the manifest and the witness's SHA-256; all 31,147
  records decode with the witness statistics; SHA-256 digests of **every record's eleven lines** (before and after the M−m/D
  default) and of **every record's whole plot** (bounds, labels, ticks, all curve pixels or the typed fault) equal the
  witness's; the 5 FloatToDecimal policy records; inverted ranges and the synthetic faults; for 35 witness records (flagged, period 0, M−m/D 0 and ≥ 100, negative Dec,
  del Cep, RR Lyr, omi Cet, HI Peg, bet Per…) the eleven lines, the lines after the M−m/D default, the axis bounds, every one of
  the 556 curve pixels and seven model samples equal the Python witness (`tools/variable_witness.py`: struct + fractions +
  math, written separately); explicit bounds, layout, Save Text bytes, help sections, search and fetch failures.
- `src/core/variableStarSession.test.ts` (4 tests): window transitions, the in-memory M−m/D mutation sequence and its absence
  when SetRecord faults before Init.
- `tests/variable-stars.spec.ts` (8 flows): header navigation, type filter, list lines and curve pixels from the witness,
  period-0 notice with axes, the M−m/D default after reopening (and no note before), Save Text download bytes, Help and both
  print previews (no job title on the page), the blank-type filter, Escape focus, inverted range, dark-theme panel colours,
  320 px.
- The witness is a second implementation of the same reading of the binary, so it checks the port, not the reading (review
  1 found a reading error both shared: the type bound); it cannot check x87, FloatToDecimal scaling or GDI behaviour. Its
  SHA-256 is recorded in `variableStars.controls.json` (`source.witnessSha256`) and pinned by the test:
  `8efffbbf8dd153190b586d56131b6679441944e328ce64f0aa5d741da63982ca` (review-1 version
  `12a7eeb3e50032532b0f7d8779dd51a74fbba1c72b852179710e0b8622bbc4bd`; the change is the type bound, the signed word and
  the self-hash; its output is otherwise identical).
Tests are evidence of the chosen contract, not of original-runtime equivalence.

## Not done (follow-ups)

- **Catalog Object dialog** for arbitrary observatory stars and the GCVS button path (needs the field engine to carry variable
  records; Front F).
- **TVarFldLstForm1** (Field Information › Variable Stars: "All GCVS variables in region" / "VIREO-modeled varibles in region");
  its menu is shown only when options byte +0x2e7e is set, whose default was not traced.
- **Pleiades "mixed-variable-field" stars** (PLEIADES.HTL rows 3, 5, 10, 12): every GCVS record within 12′ of those
  pointings is class 3 (UV, BY, UV+BY, RS:) with period 0 and M−m/D 0 (e.g. V0855 Tau, V0641 Tau). The block is therefore
  the untraced zero-period/zero-word branch of 0x51ec95, which `variableMerge.ts` rejects as `dispatch-unsupported` — not
  Mag(t). Needed (Front F files only): trace that branch (and whether it reaches 0x51ee57); extend
  `nativeVariableFalseMerge`; witness the four fields from CLEA_VStrs.dat (Front V's `bundledVariableStars.ts` and
  `decodeVariableStarRecord` can be reused read-only); run them through `fieldEngine.ts`; then admit the rows. If the branch
  calls Mag, P = 0 faults in the original too and the photometer must refuse with a typed reason. Not done here.
- Printer layout, the portrait print branch, the student/lab print strings and the CLEA help viewer; saving this page's state with the investigation (not needed: it is a browsing aid).
