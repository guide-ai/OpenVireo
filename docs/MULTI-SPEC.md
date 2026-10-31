# Multi-object spectrometer (Front M, audit I03)

Static recovery of CLEA_VEO.exe (SHA-256 781bc970…c54c): TMultSpCntrl ("CLEA Multi-Channel Spectrometer Control"),
TMSpecListForm1 ("Spectra From Multi-channel Spectrometer") and TMSpecDsplyForm1. Nothing was executed or emulated. Plan
and listings: research `analysis/front-plans/front-m-multispec.md`, `analysis/front-m-multispec/` (dossiers, tools);
addresses, evidence ids and tags in `docs/MULTI-SPEC-PROVENANCE.json`. Tags: [D] decoded, [I] inference, [W] web choice.

## How the student reaches it
- VIREO: instrument slider position 3 (Multi-Spec) + Access opens the control form (0x53ce0c) [D]. The web observatory has no
  instrument slider: a **Multi-Spec** card next to the camera with **Access Multi-Spec** stands for it [W], gated like the camera
  (dome open, tracking, telescope view, pointed). The field is the bundled pack at the exact pointing (the Hubble Coma/Boötes
  targets and the LSS rows only); elsewhere, Object X positions included, the form opens with a typed "no field" text. Object X
  fields are reached only in the Object X lab (below).
- Clicks select objects only when VIREO arms them (0x53cfab..0x53cfe4) [D]: **Edit Mode**, or exercise mode **0** ("Access All
  Instruments") or **1** (Object X), in the Telescope view. Mode 0 is reachable only through the instructor **Virtual
  Observatory** option (Front O2: VObsBox, options+0x27d5, default off, not persisted; one page state shared with File › QSO
  List) [W]. In LSS (mode 5) the form opens but clicks select nothing, as recovered (the audit's "needed for LSS" is not
  supported by the binary).
- Object X lab: a "Multi-object spectrometer" section on the lab's field, always armed (mode 1), with its own telescope choice.

## Recovered behaviour [D]
- Selection: the nearer of the nearest star and nearest galaxy (galaxy wins ties); beyond 10 px a "Sky" fibre; only a 1 px
  duplicate check (no count, magnitude or type limit); right-click removes a fibre unless its spectrum was taken; a rebuilt field
  (slew) clears the selection.
- Control form: Init (exposure minutes, Round(x·60) seconds), Go, Stop (premature-stop question), 1 s ticks, default 1.00 min,
  S/N estimate for the faintest object.
- Spectra (not the single-object pipeline in a loop): 400 channels 3700–4700 Å; one Poisson draw per bin at Stop with mean
  50 000 × seconds × flux, object then sky in each bin; the RNG reseeded per fibre; full flux, no slit fraction, no sky
  subtraction; S/N = √(mean counts per channel). Stars: JSPEC2.SPI templates; galaxies: 0x55e55c/0x55e97c with the
  surface-brightness magnitude (own GLXYSP spectra where bundled); QSOs: QSOSpect.dat.
- Poisson: the large-mean rejection branch (0x55f0f4..0x55f324) is recovered and checked by the independent witness, so every
  telescope draws (D3); a fibre with any bin mean above 10⁶ stays typed `multispec-mean-bound`. Against the field engine's
  spectrometer bound (12 on the 0.4/0.9 m), at 60 s, counted by the research harness
  `analysis/front-m-multispec/tools/multispec_d3_counts.test.ts.txt` (SHA-256 097a8283…0626; output
  `multispec-d3-counts.json`, 1c355fa4…d8ef; recorded in `docs/MULTI-SPEC-PROVENANCE.json` `d3Counts`). Basis: every LSS row in
  its own pack, the 4 Hubble Coma/Boötes targets and the 11 Object X spectroscopy rows (234 fields, 30 gated: 204 views per
  telescope); object fibres are the stars, QSOs and galaxies whose centre is in the 312² crop and that a click there selects,
  counted per distinct catalogue object; one sky fibre per view.
  - 0.4 m: newly drawn 348 galaxies, 7 QSOs and 1691 stars; one star stays typed `multispec-mean-bound` (V = 4.5, N2230-01405
    in lss-field-08); one star was already within the bound; sky fibres are within the bound on both rules (204).
  - 0.9 m: newly drawn 348 galaxies, 7 QSOs, 1689 stars and all 204 sky fibres; 4 stars stay typed `multispec-mean-bound`
    (N2230-01732, N2230-01473, N2230-01405, N3000-00556; 5 star–pack pairs, N2230-01732 being in lss-field-03 and Coma).
  - 4 m: unchanged (its field bound is already 10⁶; 45 distinct stars are typed).
  - Typed on every telescope, unrelated to D3: 2 stars `star-template-none`, 1 galaxy `spectrum-mapping`.
  - The observatory itself builds 218 distinct pointings (188 views + 30 gated, plus the 11 lab rows): the same per-object
    totals, as the harness's 'reachable' basis shows.
- List items "  (n)  " (left-padded) with "*" when saved; Scan (1–5 s); Save All, Clear All, Open/Close All; display
  Information, Save, Print. Files: `MSpec_<n>.SSP` (or the object name when Show Object ID is on): 400 lines
  "wavelength(2 decimals) normalised counts(6 decimals)", CRLF, no header.

## Web choices [W]
- D4 Save All: one uncompressed (STORE) .zip of the byte-exact .SSP files. D5: no Test Mode. D6: no new session version (the
  selection and spectra are browsing state). D7: 3700–4700 Å as recovered. D8: Sky fibres show RA/Dec/V "not recorded".
- Save is a browser download; the native folder, base-name and overwrite dialogs are not ported. A telescope change remounts the
  instrument (VIREO disables the Telescope menu while the form is open).
- The Edit Mode galaxy "Z:" line shows "hidden (instructor value)", as Catalog Object masks the catalogue z (no instructor login).

## Hidden identity (E08)
Before the reveal, in an Object X field or any field within 2.375° of an Object X position: Information shows `ObjX-<ID>` only for
the fibre that is the target (its record is the one a click at the target's own projected position selects, i.e. within the
native 10 px) [W], and "Name hidden during Object X" for every other non-sky fibre, Object X neighbours included; V and the Edit Mode lines are dropped; every failure
shows one neutral text (the native boxes name the kind); Show Object ID is ignored for list items, captions, .SSP names and Save
All entries. Lab rows whose neighbours lie within 2.375° stay masked after the reveal.

## Typed (not ported or indeterminate)
`star-template-none` (nil lookup), `star-template-random` (index 0: the native random pick; all 132 templates are bundled
since 2026-10-30, but the pick itself is not ported), `galaxy-lookup`, `spectrum-mapping` (own galaxy
spectrum not bundled), `galaxy-spectrum`, `qso-spectrum`, `object-type` (types ≥ 5), the Front T variable reasons,
`multispec-mean-bound` (> 10⁶), `negative-mean`, `precision` (u = 0.5), `zero-maximum` (nothing to save), the photographic-image
field gate, pointings without a pack; Help (0-byte help files). Print Selection Field works (Front P): it runs Print Sky Image
(header 0x58e860, footer 0x53fe14) on the Multi-Spec telescope display. The display's own Print starts with the same header (Front H2).

## Resources
The 67 jspect2 templates approved on 2026-10-28 (AGENTS.md) are bundled byte-exact in `public/original/spectra/jspect2/`; each
SHA-256, JSPEC2.SPI index and the field packs whose stars need it are in `data/multispec/template-requirements.json` (Multi-Spec
selects any star in view, so "require" covers every star of those fields). The 17 remaining templates JSPEC2.SPI names were
approved on 2026-10-30 for stars at any pointing (Front G) and are bundled in the same folder. With the 48 earlier templates,
all 132 that JSPEC2.SPI names are available, so a named template is never missing (a context without one is an input error).

## Tests
Vitest: multiSpecSpectrum (fibres equal the independent Python witness `data/multispec/witness.json`: LCG, Poisson incl. the
rejection branch and its draw order, grid, templates, QSO), multiSpec (state machine), multiSpecSelect, multiSpecFormat (.SSP
bytes, names, Information/Print with and without the mask), io/multiSpec, fieldEngineView (the view equals evaluateField's
population, scene and viewport for LSS (default and QSO merge), Hubble and Object X pointings). Playwright: tests/multispec.spec.ts (Edit Mode flow,
the Virtual Observatory gate, 320 px dark), tests/multispec-objectx.spec.ts (no identity in the DOM, Information, .SSP names or
zip entries before the reveal; only the target fibre reads ObjX-<ID>, neighbour stars read the neutral name; a galaxy target
with a photograph and an Object X neighbour, row 3/4, which stays masked after the reveal).
