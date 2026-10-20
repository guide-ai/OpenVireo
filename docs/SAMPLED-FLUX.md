# Manual original-spectrum intensity readout

The classification laboratory can read relative intensity at an explicitly entered wavelength from the original upper standard, practice unknown or lower standard. The student still chooses the source and wavelength. The readout does not set a continuum, feature width, spectral type, reason or acquired measurement. It is temporary inspection state; investigation JSON and existing session versions are unchanged.

## Recovered contract and provenance

Evidence `VIREO-EW-ST-08` is the static cursor callback range `[0x5096dc,0x509f24)` in `CLEA_VEO.exe`, SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. The range SHA-256 is `a7b8cd5b7624cfa1a0d334dfdd030289a1394b72a8f6763286f0c127681010c1`; the retained listing SHA-256 is `b685d6612d8fa453644afb2c8c18f687200568891a6410aed9368671d7e14d5b`. See `data/feature-width/provenance.json` and external `task-3/feature-width-recovery/cursor-shoulders.asm`.

The sampled branch at `0x5097e4` selects lower standard (list index +1, call at `0x50983d`), unknown (pointer +0x4bf, call at `0x509876`) or upper standard (current list index, call at `0x5098c5`). Each calls sampler `0x55dfe0`. The returned Extended value is stored as Double at `0x5098d6`, before display via `0x4fe49c`. This is distinct from the trace-height branch at `0x5097a8`. The native photographic renderer and native mouse-coordinate mapping are not implemented by this increment.

The existing pure `uniformSpectrum`/`sampleUniformSpectrum` implementation supplies the endpoint-reconstructed grid (reader `0x55df2c`), nearest-even index, 1e-5 grid snap and quadratic finite-difference interpolation. Original printed interior wavelengths remain unchanged on the comparison plots. This readout uses endpoints/(row count−1), as the recovered numerical path does. Finite negative or above-one interpolation results are returned without clipping or normalization. Units are original file relative intensity, not photon counts or calibrated radiance.

`SPECTRUM_PROBE_POLICY` is `VIREO-original-flux-Number-v1`. JavaScript Number/Math adaptation does not prove x87 or native runtime equivalence. Decimal entry in 3900–4500 Å, a 24-character bound, nine-significant-digit display and explicit Read/Clear controls replace native pixel input. The immutable result retains unformatted Number, source ID and original SHA-256. Byte verification is performed by the existing library loader; the core additionally checks registered identity, SHA, row count and endpoints. An uploaded original file remains an imported unknown and cannot acquire original-practice authority from its filename/header/hash.

The admitted sources are 25 practice identities and 38 reference identities across eight atlases, referring to 57 unique already-versioned files. Their exact URLs, SHA-256, rows and domains remain in `data/classification/`; source credits and rights uncertainties remain in `docs/LOCAL-RESOURCES.json` and the classification provenance. No new original resource is added. Acquired/imported unknown flux remains unavailable in this tool; explicit original upper/lower inspection remains available alongside it.

## Verification and limits

External `task-3/sampled-flux-recovery/recover.py` checks the native range SHA and original file hashes, then independently evaluates exact rational three-node Lagrange polynomials. `original-flux-vectors.json` contains 456 unique vectors across 57 files. The separate actual-core verifier performs 504 comparisons across all 63 identities, with maximum absolute error `1.2601031329495527e-14` (tolerance 1e-10). These are independent static/algorithm comparisons, not observations from original CLEA execution. Nine representative values are retained in unit tests along with malformed inputs, source/hash/grid mismatches, endpoint reconstruction, zero and signed overshoot contracts.

Final validation before review: 1247 unit contracts in 114 files, TypeScript/Vite build and 23 relevant browser flows pass. The mobile card was visually inspected at 360px with readable controls and no horizontal overflow. The initial new-flow run had one incorrect test file-input label; correcting that selector yielded all five new flows passing. A restricted default-sandbox browser launch could not start its loopback server; the authorized local browser run passed.

Browser flows cover all three positions, source/atlas/practice changes, invalid input, imported and acquired provenance gates, exact full-session preservation, reload/restore, keyboard and narrow-screen use. Scientific acquisition, equivalent-width integration and manual response rules remain unchanged. N02/E03 and all 64 primary package acceptance statuses remain unchanged.

## Try the feature

1. Open http://127.0.0.1:5173/#classification and find **Read original spectral intensity**. Keep the original practice unknown selected in **Original spectrum to inspect**.
2. Enter `3900` in **Read wavelength (Å)** and click **Read sampled flux**. For the first practice, expect approximately `0.648665918`, with the original source file named below it. Expand the method details to inspect its SHA-256 and numerical policy.
3. Choose the upper standard, enter `4101.74` and read again. In the initial main-sequence pair (`A0000001.SP`), expect approximately `0.451400903`. Select the lower standard to inspect its own independent file. Change atlas or practice: the old result disappears until explicitly read again.
4. Enter `3899` or `1e3`: expect an error and no new result. **Clear intensity readout** removes only this temporary result. Your proposed type, reason and feature draft remain intact.
5. Import an SP/SSP or use **Classify acquired star** after a positive exposure. Its unknown readout is unavailable; select an original upper/lower standard explicitly to inspect that reference. Save/reload/restore your investigation to confirm student work and raw acquired data remain intact; temporary intensity readings are not restored.
