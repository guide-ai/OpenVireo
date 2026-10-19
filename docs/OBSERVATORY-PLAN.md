# OpenCLEA observatory increment

Historical pre-implementation proposal. Current implemented contracts and limitations are in RECOVERY.md; full scope and estimation assumptions are in IMPLEMENTATION-PLAN.md.

OpenCLEA must open with the observatory experience. Spectral analysis is one instrument in that workflow, not the product's starting point. All product text and project documentation are English. Historical CLEA attribution and original labels in preserved data remain intact.

## Original components identified

The immutable VIREO executable has SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Its Delphi form resources distinguish `TEnvironment1` (dome, telescope choice, access to optical control), `TObsrvtry` (sky display, tracking, NESW motion, finder/telescope view, pointing coordinates, instrument access), `TSkyCoordsDlg` (coordinate entry, J2000/B1950), `THotListForm1` (target list and slew), `TSpectrometer` (acquisition) and `TSpectrumEngine` (measurement). Static form and published-method tables are in the research folder `analysis/observatory`. REA/Ghidra dossiers are being collected separately; method names alone do not prove a state contract.

The original VIREO manual, pages 5–7, describes north up/east left, a 2.5-degree finder and 15-arcminute telescope field, tracking, coordinate entry, hot lists and narrow-field instrument access. Original resources include `NkdEye.dat`, compressed GSC fields, `CLEA_GLX.DAT`, observation `.HTL` lists, `Images/Galaxies/GLIMAGES.LST`, original galaxy bitmaps and saved library spectra. The catalog schemas and drawing projection must be checked against static code before claims of behavioral recovery.

## Proposed implementation

- Start at an observatory landing view with a short beginner sequence: open the dome, explore the sky, choose a target, point the telescope and access an instrument. Avoid mandatory technical input for the first view. Preserve telescope/dome state while returning from instruments.
- Render only original catalog positions. Begin with original hot-list targets and the original naked-eye/catalog records whose layout can be verified. Offer target selection, direct coordinates, finder/telescope fields and directional movement. Present any new chart projection or instantaneous UI transition explicitly as an adaptation if it cannot be recovered.
- Show original galaxy images as identified archival resources, without suggesting that clicking a button simulated a new exposure. Use original image placement/size metadata only where its meaning can be established. Do not invent stellar fields, spectra, random noise, redshifts, distances, exposures or atmospheric effects.
- Connect a selected target to its corresponding original library spectrum where that association is explicit. Label library spectra as original reference data, never newly acquired observations. The existing imported-spectrum analyzer remains available. Measurement recording must distinguish library/reference data from user imports and may remain unavailable for library references.
- Leave unimplemented instruments, acquisition/noise, actual tracking/time/visibility and unproven coordinate transformations explicitly pending. Do not draw controls that silently imply recovered behavior.
- Name product, title, package metadata and UI OpenCLEA; translate errors, help, test expectations and human-authored project documentation. Keep original data intact.

## Validation and limits

Test catalog decoding against independent original text records and valid ranges, coordinate wrap/poles, field orientation/clipping, target selection and instrument return with preserved context. Test a complete first-visit beginner path and existing analyzer import/record/export flows. Build/typecheck and view responsive screens in the user's Brave browser. Use direct local read-only Claude review with Opus 5.5/high effort; validate its findings against evidence. Keep the current loopback user service active. No original software execution, emulation, publication or push is authorized.
