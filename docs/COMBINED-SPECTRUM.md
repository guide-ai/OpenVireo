# Combined comparison and wavelength window

The classification laboratory offers **Combined photo and trace**: the upper atlas reference as a photo, the unknown as a photo, and that same unknown as a sampled intensity trace below. The lower atlas reference remains in the selected pair and manual records; choose another rendering to inspect it. The lower numerical readout in combined mode identifies the unknown trace, not an unseen standard. Classification answers and continuum/equivalent-width measurements remain manual.

The [cursor/printed-trace follow-up](COMPARISON-INSPECTION.md) now adds held inspection and retained-window crop zoom for printed traces. The rendering/reset limitations below describe the earlier combined increment;current behavior is documented in that follow-up.

E03 phase1 item1.10 note: the diagnostic marker is now chosen from the full26-row original line table (1.10b), and the manual width tool admits each source's own grid ∩ 3500–7400Å (1.10a, [selected-source width](SELECTED-SOURCE-WIDTH.md)). The "visible diagnostic line" selector wording and the3900–4500 manual-continuum-tool limit below are therefore historical. The reverse trace option (1.10c) is documented in [sampled traces](SAMPLED-INTENSITY-TRACES.md). Recovered contracts, hashes and numerical limits below are unchanged.

## Recovered contracts and bounded adapters

[Provenance](COMBINED-SPECTRUM-PROVENANCE.json) records the original executable SHA-256, addresses, byte-range/listing hashes and constants. It extends [photo provenance](PHOTO-SPECTRUM-PROVENANCE.json), including original CLEA/Gettysburg College source credits, help/license hashes and source-specific rights uncertainty. All original resource bytes remain unchanged. No original execution or new original asset is used.

| Evidence | Contract |
| --- | --- |
|VIREO-COMBINED-VIEW-01,0x508678–0x5088f4|Unknown trace samples500 positions, includes vertex0, divides by its positive visible maximum, multiplies by Single100 and rounds to integer height. Native combined baseline375 maps to125−height in the separate lower pane. Negative overshoot remains data; SVG clips it at the pane boundary.|
|VIREO-COMBINED-VIEW-06/07,0x507b88/0x509424/0x50948c|Combined mode2 paints upper standard photo, unknown photo and unknown trace, clears difference; reverse changes photo flags only. Difference forces trace.|
|VIREO-COMBINED-VIEW-02/03,0x507a08/0x50a6e0/0x50a8c4|Zoom doubles/halves through1,2,4,8,16. Inward endpoints are center±oldWidth/4; outward endpoints center±oldWidth, rounded to integers. The range setter translates an interval at domain boundaries. Outward1× restores the full domain.|
|VIREO-COMBINED-VIEW-03/05,0x50aab4/0x50ac88/0x5078bd|Pan computes low−10%width or high+10%width, rounds that endpoint, clamps at the full-domain boundary and retains width. Pan resets the cached zoom center to the new midpoint. Extended0.1 is projected to Number0.1.|
|VIREO-COMBINED-VIEW-04,0x50ae60|Reset restores zoom1 and the full domain.|

The admitted full interval is3900–4500 Å, already aligned to the native full-domain100Å branch. Generic native range expansion is not exposed. Photos and the combined trace resample500 positions at `minimum+i*(maximum−minimum)/500`; the right endpoint is excluded. Each curve normalizes against its own current positive sampled maximum. No visible-peak normalization is applied to source arrays or numerical readout. Reverse recolors photos and leaves the sampled trace untouched; the separate **Reverse trace displays** option (recovered +496 branch) is documented in [sampled traces](SAMPLED-INTENSITY-TRACES.md).

New web adapters: a selected **visible diagnostic line** supplies the zoom marker, snapped with nearest-even to native display columns1..499; otherwise zoom uses the recovered window/cached-center behavior. Native pointer marker gestures remain pending. Controls operate in photo/combined views; printed-coordinate trace/difference views and the separate manual continuum tool retain3900–4500. Moving to trace or difference resets the window. Render mode, reverse, zoom/pan and horizontal scroll are ephemeral and do not alter session JSON. Same-page restoration preserves ephemeral view settings unless it restores difference; reload starts in trace/full interval.

Manual draft wavelengths are outlined where visible in both unknown panes. They do not supply continuum heights to the peak-scaled trace; the original manual tool remains separate. A missing positive maximum or unsupported grid displays an explicit labelled printed-coordinate trace fallback; it does not pretend to follow the sampled window. Source identity failure closes the pane with an alert, without a potentially wrong fallback.

## Numerical limits

JavaScript Number interpolation/normalization and nearest-even integer conversion are the declared policy. Binary64 near a half-index may choose a different three-point neighborhood than exact-decimal rational arithmetic. Independent rational and Python binary64 results are reported separately in [validation](COMBINED-SPECTRUM-VALIDATION.md). Neither is a native x87/GDI oracle. Unsafe/nonfinite/int32-overflow heights are rejected explicitly; the original zero-maximum division is not emulated. No acquisition, spectrum, continuum, noise, distance or fitted result is invented by these controls.

## Try locally

1. Open http://127.0.0.1:5173/#classification and select **Combined photo and trace** under **Spectrum rendering**. Check that the lower panel identifies the same unknown as the middle panel.
2. Toggle **Reverse photographic grayscale**. Only the photos change; the lower trace stays unchanged. Enter your own type/reason and confirm that display changes do not fill or replace them.
3. With no diagnostic line selected, press **Zoom in ×2**: 3950–4450Å. Pan left: 3900–4400Å. All three panels share the interval. Continue zooming to16×; the inward button disables. **Reset wavelength window** returns 3700–4700Å (the page's range; Front S2 round 3).
4. Select a diagnostic marker, then zoom: the visible marker centers the window until a boundary requires translation. Narrow the browser to360px and scroll a panel horizontally; available sampled panels stay aligned.
5. Acquire a supported star, choose **Classify acquired star**, use combined/zoom, then **Measure this acquired star → Download acquired SSP**. Reimport that exact SSP into classification. The loaded origin label changes, while the corresponding sampled trace stays equal under the same window.
6. Save/restore the complete investigation. Responses, manual drafts, raw acquisitions and exact imported bytes survive. Reload defaults to trace; choose combined/zoom again. A zero spectrum or irregular grid retains explicit fallback; a malformed import leaves the prior investigation intact.

This completes a bounded N02 display increment. Native cursor/photo gestures, full feature tools, native grading/result contracts and full N02/E03 acceptance remain open; the overall implementation plan is not complete.
