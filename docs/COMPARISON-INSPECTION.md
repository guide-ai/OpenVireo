# Comparison cursor and printed trace window

The classification comparison panes now support held cursor inspection. Press and hold the primary pointer, move, then release: the readout and wavelength marker remain. Hover alone does nothing. A photo reports the retained spectrum's sampled relative intensity at X, independent of Y, photo grayscale, reverse and visible-peak scaling. A trace reports a manually selected **display ordinate**, never a source flux inferred from the curve. Nothing fills answers, continuum shoulders, widths or scientific records.

## Evidence and adapters

[Source/range/hash dossier](COMPARISON-INSPECTION-PROVENANCE.json) extends the existing CLEA/Gettysburg College credits, source-help/license hashes and rights uncertainty. The executable SHA-256 is781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c;all1279manifested resource bytes are unchanged. Static captures remain outside source in task-3/inspection-recovery. No original execution, emulator, new resource or runtime oracle is used.

| Evidence | Contract |
| --- | --- |
|VIREO-CURSOR-VIEW-01,0x5094cc/0x509530/0x50956c|Left down reads;move reads only while held;release clears hold and repaints while retaining readout/marker. Right-button/manual-shoulder branches are separate and remain in the existing dedicated tool.|
|VIREO-CURSOR-VIEW-02/03,0x5096dc/0x509eac|Frame-relative X maps through minimum+column×viewportStep. Photo reads the actual selected pane's source via0x55dfe0;trace uses Y/Single100;difference has a separate0.5offset branch.|
|VIREO-CURSOR-VIEW-04,0x508b88|Native standard traces resample500points and scale to a visible positive maximum/100pixel amplitude. The existing printed-coordinate browser trace instead retains its raw points/0–1axis;its new window is explicitly a crop adapter,not a claim to implement that native trace renderer.|

Screen coordinates pass through the current SVG screen transform, including resize and horizontal scroll, to500logical columns. Photo X selects the painted cell with floor;trace X and Y use nearest-even integer conversion. Rejection outside the surface,touch capture and cancellation guards are browser policies. Photo intensity comes from the same IO-verified original/acquired/imported preparation as numerical readout. It is not normalized or changed by the photograph. Combined-trace ordinate uses(125−y)/100;printed-trace ordinate uses(250−y)/250 matching the retained0–1axis. Their labels distinguish these scales and retain source SHA/window. The difference curve has no cursor surface;the other two panes remain inspectable.

Arrows or keypad2/4/6/8 preview one logical column/pixel. A retained cursor or selected diagnostic marker supplies the horizontal starting point;otherwise the first right step starts at column1. Enter/Space retains;Escape cancels. This explicit preview/commit keyboard lifecycle is a web adapter,not native event-order equivalence. The retained marker takes priority over a diagnostic line for zoom;selecting a diagnostic line clears the cursor. Out-of-window/zero-column markers follow the existing bounded viewport policy.

Touch scrolling is the default;touch inspection requires the explicit checkbox above the panes. Mouse/keyboard inspection remains available. Sampled ordinate ticks are hidden when the display window changes its normalization;the stored readout still names its original window.

Preview/retained readings and markers are ephemeral. Cancellation,escape,blur,lost capture,leaving the surface,hidden tabs,source/layout changes and investigation preparation cannot commit pending work. Clearing the cursor invalidates a held gesture. Cursor state is absent from JSON/CSV. Same-page restoration and source changes clear pending work;reload starts without a cursor.

The [sampled-trace follow-up](SAMPLED-INTENSITY-TRACES.md) adds a distinct500-position/visible-maximum display for all three sources;the printed trace description below retains its original meaning.

## Printed trace zoom

The existing1–16×,10%pan and reset controls now operate on printed trace and difference views as well as photo/combined. All actual comparison panes share the wavelength interval;switching rendering or difference retains that window. Printed traces keep every retained sample within it,without interpolation,visible-peak normalization or automatic endpoints. Curves,manual overlays and selected wavelength are clipped to the plot frame. Sparse imports can have no points inside a narrow window;no missing spectrum is invented. Labelled photo fallbacks and the separate manual continuum tool retain their full3900–4500Åcoordinates.

The inherited Number/nearest-even viewport and half-index interpolation uncertainties remain documented in [combined validation](COMBINED-SPECTRUM-VALIDATION.md). The port is not established as x87/Win32/GDI equivalent.

## Try locally

1. Open http://127.0.0.1:5173/#classification and choose **Grayscale photo**. Hold/move/release in the unknown photo;**Comparison cursor readout** shows sampled flux/source/window/SHA. Repeat at the same X and another Y,then reverse:the sampled intensity stays the same.
2. Press **Zoom in ×2**. The retained wavelength centers the window where admitted. Choose **Printed-coordinate traces**:the same window remains. Hold at different heights to see **cursor display ordinate**. This is your cursor height,not an automatic flux measurement. A short horizontal tick indicates that ordinate.
3. Choose **Combined photo and trace**. Its unknown photo reports sampled flux;the lower trace reports its display ordinate. The shared wavelength marker follows the current reading. Tab to a surface,use arrows/keypad and Enter/Space;Escape cancels a preview and preserves the last retained reading.
4. Return to trace,clear the cursor and diagnostic line,reset,then zoom:4050–4350Å. Pan left:4020–4320Å. All three trace axes and retained-point crops move together. Your manual continuum tool stays full-domain.
5. Cancel a held gesture with Escape or by leaving the pane before release;the prior retained reading stays. Change source:the old cursor clears. Save/reload/restore an investigation or reimport an acquired SSP:manual work and exact bytes survive,but temporary cursor state is not restored. On360px screens,touch swipes scroll normally. Enable **Enable touch cursor inspection (otherwise swipe to scroll)** above the panes before touch inspection;the photo scroll viewport and keyboard/touch mapping remain aligned.

[Final local verification and review resolutions](COMPARISON-INSPECTION-VALIDATION.md) record the completed tests and the separate authorization blocker.

Broader native shoulder/context actions,cursor formatting/event fidelity and complete classification grading/results remain partial. This increment does not complete N02/E03 or the whole implementation plan.
