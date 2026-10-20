# Normalized sampled difference preview

The optional **Show normalized sampled difference preview** control adds a read-only curve below the three comparison panes. It uses the selected upper standard and the actual unknown source. It does not select a classification, measure a feature, change the comparison mode or write a result. Manual reasoning, continuum/width drafts, recorded answers, acquisition counts and session/CSV formats retain their existing contracts.

This is the next bounded N02 display slice after [sampled intensity traces](SAMPLED-INTENSITY-TRACES.md). Native difference replaces a lower pane in its mode; the supplemental fourth pane is a declared web presentation choice. The existing printed-point difference remains available separately. All64 primary acceptance statuses are unchanged; N02/E03 remain partial.

## Recovered arithmetic and geometry

[Provenance](SAMPLED-DIFFERENCE-PROVENANCE.json) records the executable SHA-256, exact byte/listing hashes, addresses, evidence IDs, original credits and source-specific rights uncertainty. Read-only disassembly of `CLEA_VEO.exe` at `0x509068` supplies the two loops and difference path. FormPaint at `0x5080f0..0x508111` supplies the same upper reference index to its trace and difference. FormShow at `0x507814..0x507b80` establishes the three vertical pane bounds. The `0x403700` conversion helper and the Single constants1/100 are recorded separately. SEH/string cleanup through `0x5093b5` was distinguished from the following constant pool.

For the displayed wavelength window, both admitted source probes use the existing recovered500-position sampling contract: `minimum + i*(maximum-minimum)/500`, `i=0..499`; the right endpoint is excluded. Each curve has its own positive visible maximum initialized at zero. At each position:

```
D = standardIntensity/standardPeak - unknownIntensity/unknownPeak
height = roundNearestEven(100*D)
unclippedLocalY = 75 - height
localY = max(0, unclippedLocalY)
```

Subtract the unrounded normalized values before the single pixel conversion. Subtracting separately rounded trace heights changes the contract. Native lower top/bottom are250/375 and the difference baseline is375−50=325, giving local zero75 in a125px pane. Positive D moves upward: the top corresponds to+0.75 and the bottom to−0.50, subject to pixel rounding. This asymmetric display scale is not an uncertainty estimate or a residual of unscaled source intensities.

The first point uses MoveTo. Later points use LineTo when the current or preceding local Y is above zero; otherwise MoveTo breaks runs of two top-clipped points. The recovered routine clamps the top and has no bottom clamp. The core retains out-of-pane bottom Y; the SVG125px frame clips it as an explicit browser adapter. No GDI clipping equivalence is claimed. Photo reverse flags do not change this trace; general native trace inversion/options remain outside this slice.

## Admission and state boundaries

Both sources must retain the same complete original printed grid (2799 wavelengths,3510..7427.2Å), under the existing exact-grid rule. The display window is normally3900..4500Å. A visual import on another grid and the supported acquired star are still excluded from difference admission. An uploaded original standard can be compared as an unknown, but retains its imported identity, exact bytes/hash and blank manual answer.

`prepareSampledDifference` requires an upper original-standard role, the actual unknown role, and matching source IDs/SHA associations between the retained spectrum and prepared probe. The IO boundary owns actual byte hashing, reparsing and acquired replay. The renderer samples these bound probes directly rather than accepting unrelated cached samples. Source association failure closes with an alert. Zero/nonpositive peaks, unsupported sampling or unsafe integer output retain a labelled **full printed-point difference** fallback; no normalized curve is invented. The fallback remains3900..4500Å even after zoom. Malformed import rejection preserves existing work.

The checkbox is a transient display preference and never serialized. A fresh page starts unchecked; restoring an investigation does not read this preference from the file and can retain the current page's request. On a source outside admission, a requested preview disappears and its domain explanation remains; it can be unchecked. Changing window, source or atlas recomputes from the actual admitted pair. Shared horizontal scrolling keeps the fourth curve aligned on narrow screens. The supplemental SVG is read-only, with no derived cursor, continuum or measurement tool.

The pure core uses JavaScript binary64 Number, explicit nearest-even rounding and integer guards (`VIREO-sampled-difference-Number-v1`). [Validation](SAMPLED-DIFFERENCE-VALIDATION.md) reports independent staged-Number checks and differences from an ideal rational calculation. Neither establishes native x87, original global state, VCL event or GDI equivalence. Original CLEA was not executed. This normalization is display-only; the source-plus-sky exposure buffer still uses addition.

## Try it locally

1. Open `http://127.0.0.1:5173/#classification`; wait for the original practice and standards to load.
2. Enter a **Proposed spectral type** and your own **Features and reasoning**. Check **Show normalized sampled difference preview** below the comparison panes. The new caption identifies the upper standard and unknown; the horizontal zero line is at75px.
3. Choose **Sampled intensity traces** under **Spectrum rendering**, then **Zoom in ×2**. All four panes share4050–4350Å and horizontal scrolling on a narrow screen. The new preview remains separate from **Comparison display** and its record mode.
4. Change **Spectral atlas** or the selected standard. Inspect the resulting source-specific curve; no answer is filled. Read4200Å with the existing numerical readout: raw sampled source flux retains its existing meaning.
5. Optionally import an exact original reference SP as the unknown. Comparing it to the same upper reference gives a flat zero curve while retaining imported authority. A different-grid SP leaves the preview disabled; a full-grid zero spectrum uses the labelled full printed fallback.
6. Save the complete investigation before and after changing display options: the JSON is unchanged. **Review classification**, cancel, then review and explicitly confirm your own response. CSV retains the chosen comparison mode and manual text. Restore the saved investigation after reload; enable the preview again explicitly.

Use the supported star acquisition route to verify that acquired spectra remain available for their existing manual comparison, but are excluded from this exact-grid difference. No acquisition, fit, noise model, class answer or grade was added.
