# Camera filter and catalog authority

The preparation reference now shows the original lookup catalog/band for each compiled filter position. `src/core/cameraCatalogReference.ts` also supplies an immutable discrete mapping and a NOMAD-band guard. This does not apply a camera filter, issue a request, certify a source or start an exposure.

| Camera | Filter position | Catalog | Selector | Lookup band |
|---|---|---|---|---|
| CCD | NF /0 | NOMAD |2|R|
| CCD | B /1 | NOMAD |0|B|
| CCD | V /2 | NOMAD |1|V|
| CCD | R /3 | NOMAD |2|R|
| CCD | I /4 | USNO-B1 |2|I2|
| IR | J /0 | NOMAD |3|J|
| IR | H /1 | NOMAD |4|H|
| IR | K /2 | NOMAD |5|K|

[NATIVE-CAMERA-FILTER-CATALOG-AUTHORITY-01](CAMERA-FILTER-CATALOG-PROVENANCE.json) pins three complete procedures, the five-entry CCD jump table and its target listings, and six typed ShortStrings to executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Derived evidence and capture script remain in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-filter-authority/`. No original execution, microemulation, live REA or network service was used. Original source credits/uncertainties remain in [the inventory](FITS-IMAGE-PROVENANCE.json); original resources are unchanged.

CCD selection initially writes catalog mode0 at `0x5223a9`, but the typed position4 branch at `0x5223ee` **overrides it with mode1** and selector2. Initialization `0x59c45c..0x59c5de` supplies USNO-B1's B2/R2/I2 labels for that mode. The earlier pipeline documentation generalized the initial NOMAD write and omitted this override; [that description is corrected](CAMERA-PIPELINE-AUTHORITY.md). NF position0 follows selector2/R rather than adding an invented clear-band magnitude. IR positions0..2 explicitly choose NOMAD selectors3..5 at `0x51dfe6`, `0x51dfec`, `0x51dff2`.

The current [decimal NOMAD reader](CAMERA-NOMAD-ROWS.md) has no I column. `nomadBandForCameraFilter('ccd',4)` therefore rejects with the separate USNO-B1 I2 requirement. It cannot silently use NOMAD R/V or invent an I magnitude. Invalid camera/position inputs also reject instead of clamping to a supported filter. The preparation display shows reference lookup names; it adds no selected filter, gain or request fields to persistence/export formats and does not alter an imported image's metadata/calibration.

Twelve unit contracts check all eight recovered mappings, NF and I exceptions, invalid inputs, immutability and consistency with compiled filter positions under all applied telescopes. Existing camera E2E flows now verify both lookup rows through draft/apply/cancel/restoration, independent manual/notebook/FITS data and mobile keyboard use. Initial desktop/mobile inspection caught a new layout defect: the long lookup row collapsed the mobile label column although horizontal overflow stayed false. The lookup value now spans its own row, and a mobile label-width assertion covers that defect. Initial screenshots are retained; no assertion was removed.

To try it, open http://127.0.0.1:5173/#observatory and expand **CCD / IR preparation reference** under **Optical telescope**. Read **Catalog lookup bands by filter (reference)**: CCD includes `I: USNO-B1 I2`; IR includes J/H/K from NOMAD. Change the telescope draft and cancel; apply a different telescope and restore a saved investigation. The reference map stays the same while nominal fields follow only applied optics. At320–360px the labels and lookup text remain readable; Enter toggles the summary. There is no new exposure action.

Reproduce the core with `node node_modules/vitest/vitest.mjs run src/core/cameraCatalogReference.test.ts`, and the complete UI checks with `tests/camera-preparation.spec.ts`. Run the evidence `capture.py`, `browser-check.mjs` and the existing reference visual helper on a local preview. These establish the discrete source mapping and declared web guard, not a live selection, real catalog response, numerical acquisition or native GDI/x87 parity. USNO-B1 response/row handling for CCD I, complete request/cache/field-time authority, projection/random order, overlay and output still require their own bounded contracts. The 58-feature inventory remains partial.
