# Multi-object spectrometer (Front M, audit I03)

Static recovery of CLEA_VEO.exe (SHA-256 781bc970…c54c): TMultSpCntrl ("CLEA Multi-Channel Spectrometer Control"),
TMSpecListForm1 ("Spectra From Multi-channel Spectrometer") and TMSpecDsplyForm1. Nothing was executed or emulated. Plan
and listings: research `analysis/front-plans/front-m-multispec.md`, `analysis/front-m-multispec/` (dossiers, tools);
addresses, evidence ids and tags in `docs/MULTI-SPEC-PROVENANCE.json`. Tags: [D] decoded, [I] inference, [W] web choice.

## How the student reaches it
- VIREO: instrument slider position 3 (Multi-Spec) + Access opens the control form (0x53ce0c) [D]. The web observatory has no
  instrument slider: a **Multi-Spec** card next to the camera with **Access Multi-Spec** stands for it [W], gated like the camera
  (dome open, tracking, telescope view, pointed). The field is the bundled pack at the exact pointing (Hubble Coma/Boötes, LSS
  rows, Object X rows); elsewhere the form opens with a typed "no field" text.
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
  telescope draws (D3). Against the field engine's mean bound of 12 this changes, at 60 s: on the 0.4 m every ready object fibre
  (436 galaxies, 5 QSOs, 1463 stars) is drawn instead of mean-bound; on the 0.9 m the same object fibres (1898; 6 bright stars stay
  typed) and all 162 sky fibres; the 4 m is unchanged. Means above 10⁶ stay typed.
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
Before the reveal, in an Object X field or any field within 2.375° of an Object X position: Information shows `ObjX-<ID>` for a
fibre within 0.25° of the target and "Name hidden during Object X" otherwise; V and the Edit Mode lines are dropped; every failure
shows one neutral text (the native boxes name the kind); Show Object ID is ignored for list items, captions, .SSP names and Save
All entries. Lab rows whose neighbours lie within 2.375° stay masked after the reveal.

## Typed (not ported or indeterminate)
`spectrum-template-unapproved` (a jspect2 template outside the approvals), `star-template-none` (nil lookup),
`star-template-random` (index 0: the native random pick needs all 132 templates), `galaxy-lookup`, `spectrum-mapping` (own galaxy
spectrum not bundled), `galaxy-spectrum`, `qso-spectrum`, `object-type` (types ≥ 5), the Front T variable reasons,
`multispec-mean-bound` (> 10⁶), `negative-mean`, `precision` (u = 0.5), `zero-maximum` (nothing to save), the photographic-image
field gate, pointings without a pack; Print Selection Field and Help (0-byte help files).

## Resources
The 67 jspect2 templates approved on 2026-10-28 (AGENTS.md) are bundled byte-exact in `public/original/spectra/jspect2/`; each
SHA-256, JSPEC2.SPI index and the field packs whose stars need it are in `data/multispec/template-requirements.json` (Multi-Spec
selects any star in view, so "require" covers every star of those fields). With the 48 earlier templates, 115 are available.

## Tests
Vitest: multiSpecSpectrum (fibres equal the independent Python witness `data/multispec/witness.json`: LCG, Poisson incl. the
rejection branch and its draw order, grid, templates, QSO), multiSpec (state machine), multiSpecSelect, multiSpecFormat (.SSP
bytes, names, Information/Print with and without the mask), io/multiSpec, fieldEngineView (the view equals evaluateField's
population, scene and viewport for LSS, Hubble and Object X pointings). Playwright: tests/multispec.spec.ts (Edit Mode flow,
the Virtual Observatory gate, 320 px dark), tests/multispec-objectx.spec.ts (no identity in the DOM, Information, .SSP names or
zip entries before the reveal).
