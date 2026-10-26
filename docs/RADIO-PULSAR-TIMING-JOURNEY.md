# Radio pulsar-timing learner journey (R-RX24, test and documentation only)

R-RX24 adds one connected App test, `tests/radio-pulsar-timing-journey-app.spec.ts`. It joins functions that already exist into the path a learner follows: point the telescope, capture three frequencies, measure a period and an inter-frequency delay by hand, record the readings, save the capture with verification, and load it back. **No product, core or UI code changed.** The increment does not close the Radio module and claims no native equivalence. I06, I07, N07 and E06 stay partial, and no acceptance count changes.

The data is synthetic. The catalog row is test data, not an original row. The capture is model output of the receiver simulation, not an observation. The expected period and delays are exact fractions derived in the test from the synthetic parameters; the test imports no product scientific function.

## Synthetic source (test-owned)

| Field | Value | Note |
|---|---|---|
| Names | `SYNTHETIC24` / `SYNTH001` | Fit the 12- and 8-column name fields; obviously synthetic |
| RA, Dec | raw `0.25`°, `38.4`° | Decoded 0.25 × 24/360 = 1/60 h = 0h01m00s, +38°24′00″ |
| Period, Pdot | `0.49` s, `0.0` | Reference catalog value; 49 samples of dt = 4 s / 400 |
| DM | `10.0` | D = 41500 |
| Width | `12.5` ms | The pulse centre falls in the middle of a sample |
| Fluxes 400/600/1400 | `1000.0` mJy each | Equal heights at every frequency; centre sample ≈ 3.8 × each neighbour |

## Steps (actual App, fake clock, seed 1)

1. Exercise, compiled defaults, access, timer, switch, Tracking on, catalog, UT `2026-10-24T12:00:00` and the longitude.
2. Set Coordinates `0 1 0 / 38 24 0` → Yes → slew complete. The pointing readout (`antenna-ra` `data-ra-hours`, `antenna-dec` `data-dec-degrees`) must lie within 0.05° of the decoded source. The receiver heading must say `Pulsar SYNTH001`, and after Receive the profile source must be `SYNTHETIC24`. The row is not moved onto the default pointing.
3. Add twice before Record (Add clears the recording byte). Set slot 0 to 400.00 MHz and slot 2 to 800.00 MHz; slot 1 stays at 600.00 MHz. H stays at 4.0.
4. Record → Receive → 600 ms → Stop → sweep finish → Identify (`SYNTH001`) → Properties (10.00 msec, aperture 100, 400/600/800, at least 392 points) → No.
5. **Download capture as .PLR** (a download, not a save). In Node, for each channel: peaks at ≥ half the channel maximum, exactly 49 rows apart, and centre/neighbour ≥ 2.5. Every 400 MHz pulse must have its 600 MHz counterpart 14 rows earlier and its 800 MHz counterpart 19 rows earlier. The result is attached as JSON. A failure here is a finding about the fixture, noise or phase; the checks are not to be loosened.
6. Manual period: reference cursor on a 400 MHz pulse `a ≥ 1`, vertical cursor on `a + 294` → Record.
7. Manual delay: vertical cursors on `b = a + 49` (ch1), `b − 14` (ch2) and `b − 19` (ch3) → three Record dialogs. Review shows 4 rows with a blank File cell.
8. Load → Yes → Save → a planned write failure (`write-failed`). The reference, the three vertical readouts, the count and the Review rows are unchanged. Cancel ends the flow (existing behaviour); the capture stays unsaved.
9. Load → Yes → Save as `rrx24-journey.PLR`. The stream log must be create/write/close/getFile, the Load choice opens, and the OPFS bytes equal the step-5 download.
10. Choose → the dedicated chooser receives those bytes. Check the name, SHA-256, byte count, original-bytes download, Properties and the kept list. The same pixels then give rows 5–8, identical to rows 1–4 except the comment and the File cell.
11. `page.reload()`: the tab state is gone and the file is still in the test's OPFS. Load it through the ordinary Load (same SHA-256), then redo the period reading; it equals the earlier row.

The desktop test (1440 × 1050) uses the mouse. The mobile test (320 × 568, touch) runs the same journey: taps with primary-as-reference and then primary-as-panel, ArrowRight or Shift+ArrowRight to step the tapped cursor onto the exact pixel (at most two presses), and Record from the keyboard. Both tests check for no page overflow and attach screenshots at Properties, the panels, the Record dialog, the Save dialog and the Load choice. Storage keys must be unchanged.

## Goldens and tolerances

| Quantity | Golden | Tolerance |
|---|---|---|
| One reading | pixel × 0.01 s, 6 decimals | Exact (one pixel per sample at zoom 1, window start 0) |
| Period | 294 samples = 2.940000 s → measured 0.490 s, equal to the catalog reference | Exact; a one-sample miss would be a finding |
| Delay 400−600 | Round(2075/144) = 14 samples = 0.140000 s (continuous 83/576 = 0.144097 s) | Exact against the rounded shift; < 0.005 s from the continuous value |
| Delay 400−800 | Round(1245/64) = 19 samples = 0.190000 s (continuous 249/1280 = 0.194531 s) | Same |
| Start | 8-decimal Properties text | Identical in memory, the reloaded file and the page reload |
| Saved file | download = OPFS = reloaded bytes, same SHA-256 | Exact |

Higher frequencies arrive earlier: the 600 and 800 MHz channels read the profile ahead by the rounded shift.

## Limits

- The capture, the catalog row and the goldens are synthetic, so they test this implementation's contract and say nothing about original CLEA output. No x87, RNG, timer or GDI parity is claimed.
- The Node peak finder only checks the downloaded bytes and chooses where the manual cursors go; the App has no automatic pulse finder and none is added.
- The Save picker is a test shim over real OPFS handles of the test origin. The Load chooser is Playwright's intercepted chooser. No native dialog, OS chooser, user file or durability is witnessed.
- A retry inside the same Load-after-Save Save dialog after a failure is not exercised; the test uses Cancel and a new Load → Yes.
- Edition comparison, other Radio contracts and E06 as a whole stay open.

Validation (build, unit tests, this spec and the reused regression specs) is run by the coordinator on an isolated copy; this document does not claim it passed.
