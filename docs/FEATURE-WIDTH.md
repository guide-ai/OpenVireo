# Recovered spectral intensity and equivalent width

Current imported-file extension: [CLASSIFICATION-IMPORT.md](CLASSIFICATION-IMPORT.md)
adds bounded SP/SSP visual contexts and full v7; earlier pending/version statements
below are historical for this subset. Imported equivalent width remains disabled.

Try http://127.0.0.1:5173/#classification → **Manual equivalent width**.
This increment implements a bounded, declared Number adaptation for the unknown
original practice spectrum. It does not reproduce the full native mouse/photo/
standard/acquired-spectrum tool or claim x87/runtime equivalence.

## Evidence chain recovered before the port

The existing Delphi class/method inventory and PE resource metadata identify
`TSpClassify.LineEquivalentWidth1Click`, `TEqvWdthCntrl` and their event bindings.
Previously exported decompilation dossiers primarily cover the separate redshift
engine. New work uses read-only, bounded `objdump` listings of the existing pinned
binary; no original execution, emulation, installation or new REA setup was needed.

Target: `CLEA_VEO.exe`, SHA-256
`781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`.
Original source archive: `CLEA_Vireo.zip`, SHA-256
`58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b`.
The target, manual/help/license files and all originals remain outside web source.
Range hashes, method/resource bindings, evidence IDs and exact constants are in
`data/feature-width/provenance.json`. Full captures and reproduction scripts:
`/home/dobleuber/Documents/Codex/2026-10-18/task-3/feature-width-recovery/`.

| Native evidence | Recovered meaning |
| --- | --- |
| CLASSHLP.TXT lines 54–97 | Holding left mouse reads wavelength/intensity; release retains a marker. Trace intensity comes from cursor Y, photo intensity from the sampled spectrum. |
| CLASSHLP.TXT lines 192–225; Vireo Manual p.25/Figure13 | Manually mark an approximate center, then two shoulders on the same spectrum; shoulder cursor heights represent the continuum. OK calculates and displays center/shoulder values and width. |
| `0x5096dc–0x509959`, `0x509eac–0x509f20` | Choose the spectrum panel from Y, subtract the left plot margin from X, compute wavelength from visible origin/scale. Trace intensity is `(panelBaselineY − cursorY)/100`; photo mode samples the selected native spectrum at that wavelength. Difference-display readout has a separate offset branch. |
| `0x509994–0x509b15`, `0x509c50–0x509cf4` | A center must exist before shoulders. A shoulder must be on that same spectrum and within the screen interval. X left of the center replaces the left shoulder, otherwise the right; each continuum level is selected manually. Moving the center can invalidate previous shoulders. |
| `0x50b06c–0x50b181` | Reject when neither usable unknown nor standards exist; reset shoulders, force trace display, save the existing center wavelength, show/create the measurement control. |
| `0x5065f4–0x506662`, `0x506664–0x506a65` | Enable measurement mode; reject missing marker coordinates or unresolved source selection; select unknown/upper/lower source, construct the numerical integrand, sample the center, integrate and show results. The instruction control closes after computation; SEH/string cleanup is separate from numerical return. |
| `0x506bd4–0x506c1d` | Cancel clears the measurement flag and four shoulder-marker coordinates, repaints and hides the control. It does not generate a numerical measurement. |
| `0x55cc24 → 0x55cc30 → 0x55f744` | Constructor descriptor binds the integration callback to the equivalent-width integrand, rather than an unrelated adjacent Gaussian routine. |
| `0x55f6a4–0x55f742`, `0x55f744–0x55f7a6` | Construct linear continuum slope from manual shoulder coordinates; callback computes `1 − sampledFlux/continuum`. |
| `0x55f448–0x55f69b` | Refine trapezoids, Richardson extrapolation, strict relative convergence and bounded iteration count, described below. |
| `0x55df2c–0x55e13c`, `0x55ef64–0x55f05e` | Original endpoint-grid construction/headerless SP loading and nearest-even/quadratic sampling, already ported separately in the acquisition core. |

The literal pools/padding within bounded captures are not additional procedures.
The embedded form payload hashes were checked against their original byte ranges:
TEQVWDTHCNTRL `b5acd38c8021a676254eb89ff96093d069e4b9b16f485d6fdfca783507969a52`;
TSPCLASSIFY `56f394786cab668bb4a420a410359118935471d8f1aac529ac2b06a5150dd308`.

## Numerical contract and limits

For manual shoulders `(L, CL)` and `(R, CR)`:

```
C(lambda) = CL + (lambda − L) * (CR − CL)/(R − L)
g(lambda) = 1 − F(lambda)/C(lambda)
W = integral from L to R of g(lambda) d(lambda)       [Å]
```

This formula is recovered from the callback, not substituted from a textbook.
The original constructs an Extended relative tolerance approximating `1e-4`
(exact original fraction in provenance) and a maximum of 20 refinements.
It starts with endpoint trapezoid `T1`, adds successively halved midpoint grids,
and forms `Sj = (4*Tj − T(j−1))/3`. The first previous trapezoid and extrapolate
are the original negative-1e30 sentinel. Success is the strict comparison
`abs(Sj − S(j−1)) < abs(S(j−1))*tolerance`. No minimum absolute tolerance is used.
A zero residual consequently exhausts all 20 refinements (524289 evaluations).
Signed negative widths are not clipped into absorption or used for grading.

Two native behaviors require explicit limits rather than invented replacements:

- At `0x55f794` the out-of-domain sampler callback invokes the recovered RTL
  Random function `0x4035e4`. This web subset rejects all out-of-domain regions;
  it does not introduce noise or consume the acquisition PRNG.
- At `0x55f64e–0x55f68e`, the previous extrapolate is overwritten before the
  final error subtraction. For finite values the resulting stored field is zero.
  The port reports the actual pre-update delta as a convergence diagnostic and
  never presents it, or the original overwritten field, as measurement uncertainty.

The feature path reconstructs `(maximum − minimum)/(rows − 1)` from the original
SP endpoints, then uses the already recovered sampler. This is distinct from the
comparison/difference plots, which retain printed coordinates without resampling.
No new continuum fitting, normalization, smoothing, line detection or automatic
shoulder placement is introduced. The shown curve intensity at the entered center
is computed by the source sampler, not claimed to be the original cursor-Y reading.

The bounded web domain is an original unknown practice, `3900 <= L < center < R
<= 4500 Å`, with both manually selected continuum heights finite and in `(0,1]`.
Positive endpoints keep this linear continuum positive throughout the region.
Singular/reversed/unsupported domains reject before computation. Nonconverged
values are visibly provisional and cannot be recorded. Numeric decimal inputs,
SVG overlay, these guards, Number arithmetic and nine-significant-figure display
are web adaptations. Original Extended/x87 decisions, decimal formatting and
pixel/zoom geometry are not certified by tests or static disassembly.

## Manual work and portable state

Drafts retain all five strings separately for each of the 25 practice identities,
including incomplete text. A confirmed record stores only center/shoulder inputs
and a practice identity bound by the fixed source inventory fingerprint. Derived
widths are never trusted from JSON. Select the same practice and **Recompute this
width** to evaluate a record again after source hash verification. Up to 20 width
records and 25 drafts are allowed; extra properties, forged computed values,
unknown identities, invalid regions and policy mismatches reject atomically.

Feature work uses practice session v3/full investigation v6 and explicit
`VIREO-EW-Number-v1` policy. Legacy v1–v2 practice and v1–v5 full sessions remain
readable; unchanged work retains the earlier output version. Older schemas may
not smuggle feature properties. Practice-only import merges only that workspace;
full restore replaces the investigation after validation. Raw acquisitions,
manual analyser measurements, Hubble work and acquired classification remain
separate and are retained by the existing joint-session mechanism. No feature
record becomes a redshift, classification answer, luminosity or Hubble point.
Classification CSV remains classification-only; JSON is the width backup.

## Exact steps to try

1. Open the URL and choose an original **Practice object**. In **Manual equivalent
   width**, enter a center and both shoulder wavelengths/continuum intensities.
   For a UI/persistence smoke test, use center 4150, left 4100, right 4200 and both
   intensities 1. These are trial inputs, not prescribed physical line boundaries.
2. Inspect the dashed continuum and center over the unknown spectrum. Set a
   continuum to 0, calculate and confirm rejection leaves prior work intact; set
   it back to 1. For science, choose a feature and continuum from your own analysis.
3. **Calculate equivalent width** opens a result review. **Cancel width measurement**
   or Escape adds no row and keeps inputs. Calculate again and **Save width
   measurement** to retain the manual region. The proposed classification is not filled.
4. Change practice object, type a partial region, then return: each region draft
   is retained. Changing practice still resets the existing classification answer
   draft by its prior rule, avoiding transfer of an answer between different stars.
   Saved width/classification records remain retained.
5. **Save classification session** or **Save complete investigation**, reload,
   restore and use **Recompute this width** on the same practice. A malformed or
   cancelled restore keeps prior drafts/records and acquisition/measurement links.
6. The acquired-star screen explicitly marks its equivalent-width path as not
   enabled. Existing comparison, classification and analyser/raw replay still work.

## Remaining recovery and independent next package

Recovered formula, source callback and finite happy path permit this bounded
practice-only implementation. Full native cursor/photo/difference/standard
behavior, zoom/pan geometry, original result/formatting files, unsafe FPU branches,
acquired/imported sources and native convergence-boundary witnesses remain open.
No native output oracle, original execution or original numerical equivalence is
claimed. Astronomy-educator acceptance and isolated-line selection quality remain
outside the static evidence. N02/E03 are still partial.

An independent implementable N02 package is an explicit local SP/SSP import link
from the already accepted analyser parser to visual classification. It can retain
exact imported bytes, source name/hash and manual role without inventing a star
class, resampling, expected answer or width value. Its own session/archive bounds
and restored provenance must be verified; it does not require the unresolved
native cursor/photo/error branches. It is a next package, not delivered here.

No Windows/CLEA execution, emulation, Claude, installation, push, remote repository,
public upload or deployment. Original license scope remains local research only.
