# Manual pulse timing guide in Pulsar Analysis (R-RX19)

R-RX19 adds one optional, static disclosure, **Manual timing guide (optional)**, to the recorded-data Pulsar Analysis window ([PULSAR-ANALYSIS.md](PULSAR-ANALYSIS.md)). It explains two manual tasks with the cursors that already exist:

- **Same receiver:** put the shared reference on a pulse you choose and that panel's vertical cursor on a later pulse in the same panel.
- **Different recorded receivers:** keep one reference and put each recorded panel's vertical cursor on a feature you judge to correspond.

The learner decides which features correspond and does any arithmetic outside the product. The guide is **OpenVireo guidance written from the original help's cursor instructions**. It is not a recovered native guide or algorithm, not an accuracy certificate and not a period, delay, dispersion or distance result. It does not say that a difference between panels alone establishes physical dispersion. It does not claim original equivalence. It does not complete N07/E06, and no package letter, acceptance count or the 58/64 inventory changes.

## What the guide says (paraphrased, no help text copied)

- The reference cursor is shared by all panels, and its readout is in seconds from the start of the data. Each panel's vertical cursor gives that panel's time in seconds. The horizontal readout is a relative strength, not a time.
- Properties shows frequencies in MHz and the time between data points in msec. The cursors and the window are in seconds. For the synthetic vector below, Properties shows `10.00` (msec) and the cursors move in steps of 0.01 s at zoom 1.
- Zoom and pan make a position easier to inspect. They add no information to the samples, and a redraw re-quantizes cursor times to the pixel grid (PULSAR-ANALYSIS.md, "Cursors").
- Record stores each pending panel's reference, readings, frequency and an optional comment. A reading equal to 0.0 is stored blank. Review and Export use the confirmed list. Export only requests a browser download and does not confirm that a file was saved.
- **Availability:**
  - When no recorded channel has data points (no data shown, or data without rows), the guide says there is nothing to measure yet.
  - With one recorded receiver, it says that a comparison between receivers needs two, and that panels beyond the highest recorded receiver are not measurements.
  - The count uses `pulsarPanelRecordable`, the same rule as pending and Record, so padding columns never count.

## Implementation boundary

- Presentation only: `src/components/PulsarAnalysis.tsx`, `PulsarAnalysis.css` and the `pulsar.guide.*` keys in `PulsarMessages.ts`.
- It is a native `<details>`/`<summary>` element with its own keyboard semantics. It has no React state, effect, dialog or focus trap.
- It sits inside `.plr-main`, so it is inert while any modal session is open. It enables or disables no control. Read, lease, route and modal guards are unchanged.
- No core, numerical formula, persistent state, file format, runtime or bundled fixture or example, catalog, observation, product debug hook or dependency was added. The synthetic vectors are test-owned (see Acceptance).
- No automatic pulse finding, feature matching, subtraction, period, delay, DM or distance is computed. The cursors never move automatically, and nothing is recorded automatically.

## Provenance

- **Instructional evidence only:** local original help topics, retained in private research and not published. Topic meanings are paraphrased; the help bytes are not copied into this project.
- **Segment hashes:** listed in [PULSAR-MANUAL-TIMING-PROVENANCE.json](PULSAR-MANUAL-TIMING-PROVENANCE.json), from the coordinator's `INPUT-EVIDENCE.json` (copy SHA-256 `617a9ebf…3ae5`).

| Source | Source SHA-256 | Topic | Decoded range | Segment SHA-256 |
|---|---|---|---|---|
| `PULSRHLP.TXT` | `3a6b8e72…77fc` | Measure Received Signals | 15376–16337 | `f422a027…97fb` |
| `PULSRANL.TXT` | `9d1cb3ff…1bf4` | Load Recorded Pulsar Data | 0–503 | `625ee551…a24e` |
| `PULSRANL.TXT` | `9d1cb3ff…1bf4` | View Data Properties | 1025–1732 | `cdf5b1f0…f347` |
| `PULSRANL.TXT` | `9d1cb3ff…1bf4` | Make Measurements | 3216–4338 | `818cc75a…dd73` |
| `PULSRANL.TXT` | `9d1cb3ff…1bf4` | Record Measurements | 4338–5274 | `6b86887d…f55c` |
| `PULSRANL.TXT` | `9d1cb3ff…1bf4` | Save Recorded Measurements | 6057–6748 | `93647b4a…565a` |

- **Artifact:** VIREO 1.504 `CLEA_VEO.exe`, SHA-256 `781bc970…c54c`. It was not executed or emulated. The help is instruction text, not proof of an algorithm or of runtime behavior.
- **Web adaptations:** the keyboard and primary-pointer selectors, and the guide itself, are web adaptations. No native key or gesture is claimed.

## Acceptance (`tests/pulsar-manual-timing-app.spec.ts`, actual App)

The tests use test-owned SYNTHETIC `.PLR` text: `'SYNTHETIC TIMING',40,2`, 400/600/800 MHz, gains 1.000, start `60000.50000000`, dt 0.01 s, 400 zero rows. Hand-placed peaks of 50 sit at rows 50/150/250 (ch1), 70/170/270 (ch2) and 90/190/290 (ch3). There are also a one-channel variant and a zero-row variant. These are handmade vectors, not CLEA data or model output.

Expected values are hand-written literals, not product-core results. The mouse helper scrolls each plot into view and clicks pixel centres (the viewBox starts at −0.5). References avoid pixel 0, because a 0.0 reading is stored blank.

1. **Properties:** interval `10.00` msec, 400.00/600.00/800.00 MHz, three recorded receivers, and peaks drawn at their own columns.
2. **Same channel:**
   - The reference at 0.500000 s uses the right button.
   - The ch1 vertical at 1.500000 s uses the left button and then one Right arrow press.
   - Record shows frequency `400.00`, gain `1.000`, the start and the comment. Review stores the blank horizontal reading.
3. **Two channels:** one reference and ch1/ch2 verticals at 1.500000/1.700000 s give two Record dialogs. Review cells and the exported CSV are exact, with typed metadata, the header line, interval `10.00` msec and the file name.
4. **Guide toggle:** opening and closing leave the plot markup, readouts, pending flags, count, SHA, disabled controls and storage unchanged.
5. **Zoom and Reset:** zoom in re-quantizes, hiding the out-of-window reference line while keeping its readout. Zoom out restores the window. Reset clears cursors and pending and keeps the list.
6. **Availability:**
   - No data, one channel and zero rows each give an honest availability text.
   - Padding panels never become pending, and Record stays disabled.
   - The guide changes no disabled control.
7. **Input paths and layout:**
   - The keyboard path is Tab to the summary, then Enter.
   - The touch path uses primary-as-reference, then primary-as-panel, then a keyboard Record.
   - There is no overflow at 1440 and 320, with screenshots for visual inspection.
8. **Cancel paths:** Review Cancel and Export Cancel keep the list. The guide does not present a download as a saved file, and the main region is inert under Review.

The tests were written but not run by the implementer. Codex runs typecheck, build, unit and browser tests on a frozen, enumerated copy, and checks the 1279 resource hashes.

Adaptation: the receiver’s displayed Record indicator follows the actual arming flag immediately, including after Add; the recovered cached label remains unchanged in the core.

## Student pulsar exercise (Phase 1 items 1.1–1.4, 1.6 and the Radio part of 1.11)

- **Start pulsar exercise** (Radio route, `src/core/pulsarExerciseStart.ts`): one pure snapshot that runs only the existing transitions (exercise, compiled inputs, access, the manual access tick, Radio switch, activation, Tracking, UT, compiled longitude) and skips every step already reached. It reads no host clock, random source or catalog; a refusal commits nothing and names its step. Adaptation (one line): the scenario UT `2000-01-01T12:00:00` is a declared web choice, applied only while no UT is applied and the UT field is empty. A kept Tracking that is off (the panel was already active) is reported as an incomplete setup that names the Tracking control, never as success.
- **Bundled catalog** (`src/io/bundledPulsarCatalog.ts`): after Start, and only while no catalog is loaded, the same-origin `public/original/radio/Pulsars.dat` (285692 bytes, SHA-256 `ba94ee94…eaa`, second user approval of 2026-10-26) is fetched, checked for exact size and SHA-256 before parsing, and committed through the existing reference-read token. A cancel, hidden route, project operation or unmount discards a late result; a failed check shows a retry and the file selector stays available. Manual activation without Start does not fetch it.
- **Pulsar guide** (header, `src/PulsarLabGuide.tsx`, `src/core/pulsarLab.ts`): eight steps whose marks are recomputed from the current state. Period and delay marks mean rows were recorded (a same-recording row with reference and vertical; for the delay the same reference at two or more recorded frequencies); the guide never judges correctness. The delay comparison quotes the existing model relation `delay[s] = 4150·DM·(1/f_low² − 1/f_high²)` (`src/core/radioPulsarProfile.ts`), not a new oracle. While a capture exists, the next step skips pointing and channels: closing receivers un-checks them but does not send the learner back, setup and catalog still lead (as after a page reload), and Clear still resets period and delay.
- **Not complete:** Save investigation does not yet hold the Radio capture and the confirmed measurements (item 1.5, next stage). E06 is not declared complete.
- **Research notes:** the Radio route's scenario list and clock limits are collapsed under *Research notes*; the persistence note, gates and refusals stay visible.
- **Acceptance:** `tests/pulsar-exercise-guide-app.spec.ts` (Start, guide, bundled catalog, original 0332+5434 / 0329+54 at 400/500 MHz) and the synthetic `tests/radio-pulsar-timing-journey-app.spec.ts`, which now sets up through Start. Written, not run, by the implementer.
