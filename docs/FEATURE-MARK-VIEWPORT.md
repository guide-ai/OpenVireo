# Manual feature window

The separate source-bound **Mark a feature on the curve** tool now supports zoom, pan and reset before and after manual center/shoulder selection. Its visible interval drives both the printed curve crop and the wavelength read from a pointer or keyboard mark. It uses the existing recovered interval policy within3900–4500Å. The main comparison window remains independent.

This completes the local zoom→manual marking→calculation→cancel/record→restore workflow. It does not close full native marker lifecycle or shared photographic-pane geometry. [Validation](FEATURE-MARK-VIEWPORT-VALIDATION.md) and [static provenance](FEATURE-MARK-VIEWPORT-PROVENANCE.json) preserve those boundaries.

## Try locally

1. Open `http://127.0.0.1:5173/#classification`, choose a practice or admitted width source, and expand **Mark a feature on the curve**.
2. Under **Manual measurement window**, press **Zoom in ×2**. With no marked center, the interval is4050–4350Å. Choose **Mark center** and mark your own approximate feature center. Zoom again to inspect its neighborhood. The visible marked center supplies the existing column-snapped zoom anchor; an outside/boundary mark uses the existing midpoint/cached-center fallback.
3. With **Mark center** selected, right-click one shoulder on each side. Alternatively choose **Mark continuum shoulder** and use the primary button, touch, or keyboard. The chosen height remains your manual continuum level. Read and adjust all values in the numeric fields.
4. Press **Calculate equivalent width**, inspect the source/result, then **Cancel width measurement**. Calculate again and save a converged original-practice result. Other admitted sources use **Close width result** and keep temporary work only, as before.
5. Pan until marks leave the window. Their numeric values and confirmed records remain. **Reset wavelength window** returns the applied range (3700–4700Å by default since Front S2 round 3) and shows retained in-range marks again. Changing this display never changes the integrated region or result.
6. Save the complete investigation, reload, and restore it. The manual region/confirmed original-practice record is restored; the tool window starts at1×. The window is not serialized. Reimporting exactly the same source hash preserves the existing temporary-source context; switching to another source resets that tool/window and cancels held input.
7. On a360px viewport, zoom to16×, focus the plot and use arrows (Shift moves farther). Enter/Space applies the selected tool; Escape cancels. Touch marks use the same displayed wavelength scale. A view action during a held gesture cancels that preview.

For a reproducible workflow trial, manually use center4150Å, shoulders4100/4200Å and heights0.99. These are validation inputs, not a proposed astronomical continuum or classification answer. All measurement admission remains3900–4500Å even if the main comparison displays another range.

## Evidence and adapter policy

The unchanged original executable SHA-256 is `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Seven fresh end-exclusive captures cover zoom-in `[0x50a6e0,0x50a8c4)`, zoom-out `[0x50a8c4,0x50aab4)`, pan-left `[0x50aab4,0x50ac88)`, pan-right `[0x50ac88,0x50ae60)`, reset `[0x50ae60,0x50afa8)`, the paint calls `[0x5081e4,0x5081f2)` and shoulder paint `[0x509dc0,0x509eac)`. Byte-range/listing hashes and original resource credits are in the provenance file. Existing `classificationViewport` recovery supplies the interval setter, rounding and zoom-anchor policy; no new scientific spectrum model is introduced.

Native active-measurement zoom/reset reproject stored Extended shoulder wavelengths into screen coordinates. Pan projects both shoulder coordinates only when the whole interval fits; otherwise both X flags clear. Those instructions do not erase the stored Extended wavelength/continuum values. Redraw calls center painting/revalidation before shoulder painting. Therefore treating pan as deletion of scientific inputs would not follow that evidence.

The browser instead retains its existing explicit numeric drafts, uses continuous SVG projection, and clips each outside mark independently. This is an authored display adapter, **not** a port of the full native paired-pan clearing, positive-X sentinel, center-paint revalidation or500-column integer marker state. Their combined ordering and shared/photo Y geometry remain open. Reset/re-entry/native focus behavior is not claimed equivalent. No speculative pixel flags or new persistent marker state have been added.

The interval is ephemeral and bound to the selected source component. All view actions clear pointer capture and keyboard preview; a held transaction also checks exact viewport identity on release. Source/draft/tool/button/geometry guards remain. The keyboard retains its declared1/10Å and0.01/0.1height increments, clamped to the visible interval. Mobile uses three wavelength labels for legibility. Printed points are cropped without resampling, continuum fitting or source-peak normalization.

No width integrator, sampler, acquisition/count/seed, classification answer/grade, original resource or JSON/CSV format changes. Number/SVG/six-decimal input remains distinct from x87/GDI and native scalar formatting. The earlier independent width residual limit remains; zoom adds no scientific precision guarantee. N02/E03 and all64 primary acceptance statuses stay unchanged. External review is not attempted under the parent hold; no push or deployment.
