# Classification wavelength range

**Set classification wavelength range** applies3500–7400Å endpoints in100Å steps, at least100Å apart. The applied full range bounds existing zoom/pan/reset, printed/photo/combined/sampled displays, optional normalized difference and numerical source-flux inspection. This closes the fixed display-window restriction for admitted sources. It adds no spectrum, extrapolation, acquisition, fitted continuum or answer.

The [remaining contract map](CLASSIFICATION-REMAINING-CONTRACTS.md) records open N02/E03 gates. Primary statuses and manual equivalent-width admission remain unchanged. Range/draft preferences are transient; JSON/CSV schemas, classifications, manual measurements and raw acquisitions are unchanged.

## Original contract and browser adapters

[Provenance](CLASSIFICATION-RANGE-PROVENANCE.json) pins `CLEA_VEO.exe` SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`, byte/listing hashes, evidence IDs, Single constants, range-dialog resource/event binding and source help/license hashes. Captures remain outside web source in `task-3/classification-range-recovery`; no original execution occurred.

| Evidence | Recovered contract |
|---|---|
| CLASSHLP.TXT245–254 | Spectral Range3500..7400Å, endpoint sliders, Default and warning about exceeding source coverage. |
| VIREO-CLASS-RANGE-01, `0x50b898..0x50b8a5` | Published classification handler shows `TSpecRangeDlg`. Following metadata is not instruction evidence. |
| VIREO-CLASS-RANGE-02, `0x50c994..0x50ccb8` | Activation snapshots current Single range to Extended fields. Default reads configured defaults. Cancel restores the snapshot/repaints. OK computes3500+100×scroll position, writes Single fields and hides. Cleanup/literal pools are distinguished. |
| VIREO-CLASS-RANGE-03, `0x50ccb8..0x50cf78` | Scroll handlers enforce100Å separation, update labels/current fields and redraw. Constants3500/100 have exact hashes. |
| VIREO-CLASS-RANGE-04/05, `0x507a08` / `0x507814` | Full bounds/geometry establish500-position sampling; zoom/pan use selected bounds and nearest-even integer endpoints. |

The browser uses explicit **Apply display range** rather than live global writes while moving sliders. **Default display range** fills3900–4500 in the draft; Apply confirms. **Cancel range changes** or Escape within the draft restores applied endpoints. Invalid/reversed/non100-step input rejects instead of automatically moving the other slider. Instructor defaults/options, native callback ordering, x87 and GDI fidelity remain open.

Apply starts at1× and clears cursor preview/retained readings rather than relabelling them. Zoom goes to16×; pan uses rounded10% endpoints; **Reset wavelength window** returns to the applied full range. Numeric flux entry uses that full range even while zoomed, with actual source/authority checks. Default read-only core APIs still use3900–4500 unless explicitly supplied a range. Manual equivalent width remains original-practice-only within3900–4500Å.

Historical admission note: the preceding manual-width sentence describes the earlier slice. [Selected-source width](SELECTED-SOURCE-WIDTH.md) supersedes the original-practice-only restriction, and phase-1 item 1.10 admits each selected source’s own grid intersected with 3500–7400 Å; the default display range and native-runtime uncertainty above are unchanged.

## Source and persistence boundaries

Actual rows/hashes, recovered endpoint/quadratic sampler and500 positions with excluded right endpoint are retained. Visible-maximum scales keep their separate display meanings. Imported bytes remain imported; acquired counts/seeds and source-plus-sky addition do not change.

Original library files begin at3510Å. Thus3500–7400 is a valid display choice whose sampled photo/trace requests unavailable data. It shows a labelled printed-point fallback over the **applied full range**, drawing only retained points. It never calls native out-of-source Random, invents flux at3500 or borrows coverage from another pane.3600–7400 is covered by the current original library. A limited3900–4500 import retains its old admission rule but needs its own broader-view fallback; references remain independently usable. Irregular grids/zero peaks retain explicit fallbacks; source association failures remain alerts without misleading substitution.

A stable memoized full-range fallback preserves viewport identity through cursor updates. Fallback trace Y is a manually selected display ordinate, even over a blank area; it is not an observation or source-flux value. Actual numerical source sampling there still rejects.

A fresh page/reload starts3900–4500. Restore does not read display preferences from a file and can retain the current page's range. Source/atlas changes retain the preference while rechecking coverage. No session version or recorded scientific field is added.

## Try it locally

1. Open `http://127.0.0.1:5173/#classification`. Enter your own proposed type/reason or partial width draft and save the complete investigation.
2. Open **Set classification wavelength range** below zoom. Enter minimum4000, maximum7000 and **Apply display range**. Output shows4000–7000Å at1×.
3. Read6563 in **Read wavelength (Å)** using **Read sampled flux**; inspect its actual source. Choose **Sampled intensity traces** and optionally **Show normalized sampled difference preview**. No answer is filled.
4. Without a marker, **Zoom in ×2** shows4750–6250Å. Pan/reset: reset returns4000–7000. Source inspection uses the displayed window; trace Y remains a manually chosen ordinate.
5. Edit the range and Cancel/Escape: the view stays intact. Try4001/7000 and Apply for rejection. **Default display range** changes the draft only; Apply returns3900–4500.
6. In Photo mode apply3500/7400: expect labelled retained-point fallbacks. Numeric3500 rejects. Apply3600/7400 to recover original-library photos. Limited imported/acquired sources can need independent fallbacks.
7. On mobile inspect wrapped controls/shared horizontal scrolling. Save again: display changes preserve JSON bytes. Reload/restore returns manual work/exact imported bytes with fresh default display preferences.

[Validation](CLASSIFICATION-RANGE-VALIDATION.md) records checks, precision limits, failures and review hold. No push, deployment, original execution or additional original-resource upload.
