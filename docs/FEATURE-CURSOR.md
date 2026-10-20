# Manual spectral feature cursor

Current source follow-up: [selected-source equivalent width](SELECTED-SOURCE-WIDTH.md) reuses this manual trace cursor for the actual selected upper/unknown/lower admitted source, with source-specific labels. Practice archives remain unchanged; reference/imported/acquired inputs/results are temporary. The earlier practice-only admission statements below describe the initial slice, not the new calculation boundary.

The classification lab now lets the student mark a practice spectrum's center and continuum shoulders on the curve. It reuses the existing equivalent-width integrator, manual drafts, review dialog, confirmed records and session formats. No line detection, continuum fit, sampled-flux snapping, classification answer or acquired measurement is supplied automatically.

## Try the feature

1. Open http://127.0.0.1:5173/#classification and choose an original **Practice object**. Expand **Mark a feature on the curve** inside **Manual equivalent width**.
2. Choose **Mark center**, then press and release inside the plot near your chosen line center. Its wavelength appears in **Feature center (Å)**. A new center clears the draft shoulders; saved width records stay intact.
3. Choose **Mark continuum shoulder**. Mark a point left of the center and another right of it. The height at each point is your manual continuum intensity, rather than a sampled flux or automatic continuum estimate. The corresponding numeric fields and markers update. The center must be strictly inside 3900–4500 Å; shoulder heights must be positive and at most 1.
4. Select **Calculate equivalent width**. Review the result using the existing tool. **Cancel width measurement** adds no record; **Save width measurement** retains the selected region only if the existing integration converges. The proposed spectral type remains your own input.
5. For keyboard control, Tab to the plot after choosing a tool. Arrows move the preview by 1 Å horizontally or 0.01 vertically; Shift uses 10 Å or 0.1. Enter or Space applies the chosen tool. Preview movement alone never edits a draft. Escape, pointer cancellation, capture loss, blur, hidden tabs, source changes and leaving the plot before release do not apply a pending mark. **Clear cursor preview** preserves committed manual inputs and retains keyboard focus.
6. Numeric fields remain available for precise manual entry. Change practice and return to confirm its own draft is retained. Save the classification session or complete investigation, reload and restore: the same manual inputs and confirmed records return. Use **Recompute this width** to evaluate a retained record against its verified source again.

For a workflow trial, center near 4150 Å and shoulders near 4100/4200 Å with heights near 0.99 form a usable test region. Those are operator-selected test inputs, not prescribed line boundaries or an astronomical answer. Choose appropriate feature/continuum positions yourself.

## Recovered behavior and evidence

The original source is `CLEA_VEO.exe`, SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Existing [feature-width provenance](../data/feature-width/provenance.json) and [recovery documentation](FEATURE-WIDTH.md) bind the manual/help sources, procedure ranges, original byte hashes, callback and integrator.

`CLASSHLP.TXT` lines 54–97 and 192–225 describe held cursor readout and manual center/shoulder selection. Evidence `VIREO-EW-ST-07` covers `0x5094cc–0x5096dc`; `VIREO-EW-ST-08` covers `0x5096dc–0x509f24`. Their existing byte-range and listing hashes were rechecked against the unchanged executable and external captures. The trace branch derives intensity from cursor height, while the separate photo branch samples the spectrum. The shoulder path requires a center and the same spectrum, chooses left/right by position relative to that center, and stores manually selected continuum heights. Original source cleanup and redraw code are separate from this scientific input contract.

This increment admits only the trace/manual-input path for original unknown practices. It does not implement photo/difference/standard/acquired/imported cursor branches. The sampler, equivalent-width callback, strict convergence policy, unsupported-domain rejection and uncertainty limitations are unchanged.

## Browser adaptations

The new pure `core/featureCursor.ts` maps the existing SVG plot frame (x 60–920, y 56–306) to 3900–4500 Å and trace levels 0–1. The DOM layer uses the current SVG screen transform, including scrolling and resize. Narrow screens use a taller plot and readable labels while retaining every plotted sample. Focusing a pointer gesture does not scroll the graph beneath it. Pointer capture is checked again before committing; stale or cancelled gestures cannot update another practice.

Explicit tool buttons, touch/keyboard support, clearing all draft shoulders on a new center, six-decimal draft text and the existing web domain guards are authored policies. Native Win32 integer pixel/zoom behavior, conditional shoulder retention, event ordering, Extended/x87 arithmetic and formatting are not claimed equivalent. Browser input/layout quantization can give slightly different decimal coordinates for an apparently identical pixel. Graphical test tolerances validate this adapter; they are not physical measurement uncertainty.

Cursor preview, mode and gesture state are temporary. Only explicit manual marks update the existing source-bound feature drafts through their validated pure state transition. No new session version, computed width field, scientific policy, original resource, acquisition/RNG state, source-plus-sky rule, Hubble input or classification record is introduced. New markers never create a saved width until the existing review/confirmation is completed.

## Verification and remaining scope

Synthetic core contracts cover independent axis values, margins, finite bounds, left/right classification, six-decimal boundary rejection, keyboard limits and preservation of confirmed records. Browser flows cover actual mouse, touch and keyboard input, all cancellation paths, per-practice retention, width review/recording and exact investigation roundtrip. Existing numerical analytic fixtures and classification/import/acquired workflows remain relevant regression coverage. Desktop and mobile screenshots are inspected separately.

The first browser runs exposed input-coordinate quantization, a lost-capture commit and focus scrolling under the pointer. The corrected implementation retains the raw failure logs outside source and verifies those cases explicitly. No native output oracle or scientific equivalence is inferred from these tests.

The requested native `/review` returned a read-only report for HTL and this increment. [Exact execution, validated dispositions and post-report verification](NATIVE-REVIEW-HTL-CURSOR.md) distinguish the command sent, internal task naming, confirmed fixes and retained design decisions. No second external approval or original-runtime equivalence is claimed. Original credits, licenses and uncertainty remain in the existing provenance and notices. All 1279 manifested resources remain unchanged. N02/E03 and the full acceptance packages remain partial.
