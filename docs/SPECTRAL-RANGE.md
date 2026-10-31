# Spectrometer wavelength range (Front S, S1)

VIREO's spectrometer has File › Preferences › Spectral Range…, which opens **TSpecRangeDlg** ("Spectrometer Wavelength
Range"). OpenVireo ports that dialog and applies it to the catalogue star route (`#star-exposure`). The rules were recovered
by static reading of CLEA_VEO.exe (SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`); nothing was
executed or emulated. Research note: `analysis/front-s-spectroscopy/RE-spectral-range.md`. No equivalence with the original
program is claimed.

Code: `src/core/spectralRange.ts` (pure rules), `src/SpectralRangeDialog.tsx`, `src/core/starExposure.ts` /
`starTelescope.ts` (range-aware star configuration and policy), `src/io/starSession.ts`, `src/core/exposureSpectrum.ts`.
Tests: `src/core/spectralRange.test.ts`, `tests/spectral-range.spec.ts`.

## The dialog

- Two sliders: λ = 3500 + 100·position. The minimum runs 3500–7300 Å and the maximum 3600–7400 Å; moving one pushes the
  other so that the range stays at least 100 Å wide (0x50ccb8, 0x50ce1c). The values show one decimal. There are no error
  messages.
- **&Default** restores the configured range, compiled 3700–4700 Å (hint "Sets optimal range for stellar
  classification."). **&Cancel** keeps the range. **&OK** applies it.
- With an exposure that has counts, VIREO first warns **"You will lose the current spectrum if you change the spectral range
  now!"** (caption **"Spectrometer Will Clear!"**, OK/Cancel). VIREO shows it only when the spectrum has not been saved; the
  web does not track saving, so it shows it whenever the exposure has counts [W].
- OK reinitialises the spectrometer (0x5110b0): the current spectrum is discarded and a fresh exposure on the new range
  starts (activate it again to integrate).
- [W] The range is applied on OK only. VIREO's maximum slider also writes the range while it moves; that edge case is not
  ported.

## What the range changes

- The grid has 600 bins from the minimum: λ_i = min + i·(max − min)/600 (0x50ec98, Go 0x50f4f9). The default range gives
  exactly the earlier grid (3700 + i·1000/600).
- The star's template (A0000049.SP) is sampled on that grid with the recovered sampler 0x55dfe0. Below the template's first
  wavelength (3510 Å) the sampler returns 0 with no random draw, so those bins get sky counts only, as in VIREO.
- The field, slit and amplitudes do not read the range, so they stay the verified ones; only the source means change.
- The saved .SSP rows start at the minimum with step (max − min)/600 (Save 0x50fb1c); the header does not record the range.
- An exposure on a non-default range carries `#R<min>-<max>` after its telescope policy, in the state and in a saved star
  session. The default range leaves the policy unchanged, so earlier states, sessions and acquisitions are byte-identical.
- Every one of the 780 ranges the dialog can produce stays under the verified source-mean bound on all three telescopes
  (tested); a range that did not would be refused with a typed message.
- The measuring engine starts from the range a spectrum was acquired with (docs/SPECTRUM-ENGINE-VIEW.md).

## Verification

An independent Python witness (`analysis/front-s-spectroscopy/tools/star_range_witness.py`, SHA-256
`2121e97d12619c517e2997b5082c6bb3d62b486b52ee64e33ce8485daaf3eb1e`) reads the bundled original A0000049.SP and samples it on
3700–4700, 4000–5000, 3500–7400, 3600–3700, 6400–7400 and 3500–3600 Å. Its output (`src/core/starRange.witness.json`) must
equal the TypeScript source values byte for byte (little-endian doubles), zero tails included. The default range also keeps
every earlier star vector. The witness is a second implementation of the same reading, not an x87 or runtime oracle.

## One range for the spectrometer routes (Front S2, round 1)

VIREO keeps one active range for the whole program. All 78 instructions that touch the range read or write two pairs of
Singles, configured and active. Only start-up, the options file, options apply and this dialog write the active pair; no
exercise mode does. No VEO_OPTS.INI ships, so a fresh VIREO acquires at 3700–4700 Å everywhere. The study is in
`analysis/front-plans/front-s2-range.md`.

The web now keeps that one range for the page (`OpenVireo`, not saved). The opener is on the catalogue star route, the sky
route, the Object X spectrometer and the field spectrometer (`SpectralRangeRow.tsx`). OK on any of them changes the shared
range and starts that route's spectrometer again (0x5110b0). [W] Another route's existing exposure keeps the range it was taken
on, and its next new exposure uses the shared range.

**Where a non-default range can be observed** (`core/spectralRangeCoverage.ts`), only where an independent witness covers it
[W]:

| Route or source | Non-default range |
|---|---|
| Star sources (the catalogue star, field-spectrometer stars) | Yes. `jspect2_range_witness.py` (SHA-256 `5db1a16e…0cac`) samples every bundled jspect2 template on the six S1 anchor ranges; `src/core/jspect2Range.witness.json` must equal the TypeScript sampler byte for byte. The mean bound is still checked per range. |
| Sky | Yes. The sky branch of the source setup 0x50df64 (0x50e20d..0x50e2de) reads no range and Go skips the per-bin source loop for the sky (0x50f4da); the function's QSO branch (0x50e7b0) does read it. The mean is one constant per bin, so the counts are the same on every range; only the bin wavelengths change. |
| Field-spectrometer galaxies and QSOs | No: "not yet verified for this spectrum". |
| Object X, before and after the reveal | No. The refusal is the same text for every target, so it never tells the type. |
| Multi-Spec (reads the range, has no opener) | No. Access is refused with a note. |
| Hubble and LSS routes | Round 2: VIREO's default 3700–4700 Å, and the former web range 4000–5000 Å. Other ranges are refused. |

**Policies.** A non-default range appends `#R<min>-<max>` to the sky and field-spectrometer policies, as for the star. A sky
session on another range keeps its domain's `options: 'compiled-fallback-unmodified'`; its policy states the range. At the
default every policy, session and file keeps its bytes.

**Restore [W]** (VIREO has no restore):
- A restored session file makes its range the page's range.
- An investigation restore takes the one range all its exposures share; otherwise it uses 3700–4700.

## Hubble and LSS at VIREO's default (Front S2, round 2)

D1 is reversed: new Hubble and LSS exposures use VIREO's 3700–4700 Å. Where the shifted template starts above 3700 Å, the blue
bins are VIREO's start-time continuation (0x55e97c). They are drawn from the exposure's random state at each Go, and the
mean bound is checked against their deterministic upper bound (`core/fieldContinuation.ts` `galaxySourceValues`, shared with
the field engine).

**Policies.**
- New exposures carry `#R3700-4700` (galaxy, cached, Pegasus, UM-I, engine and LSS policies).
- A policy without a mark means 4000–5000 Å, so every older session, investigation and record restores and re-saves
  byte-identically.
- The galaxy session's domain records the exposure's interval. The galaxy and LSS .SSP rows start at the interval's minimum.

**What students see.**
- E01: all 13 Hubble.HTL targets stay acquirable on the same telescopes. K and H are in view for every target; the two Boötes
  targets (z ≈ 0.13) lose the G band.
- E02: 196/93/198 rows on both intervals, with no row changing outcome. K, H and G are in view on every acquirable row (at
  4000–5000 Å, 70 rows lacked K and 32 had only the G band).
- H0 does not read the range.
- Proofs: `src/core/galaxyRange.test.ts`.

**Witness.** `analysis/front-s2-range/tools/galaxy_range_witness.py` reuses the Decimal continuum, Fraction sampler and integer
LCG of `analysis/continuum-recovery/generate_vectors.py`. It covers the 13 Hubble targets and 24 LSS galaxies sampled across z
(`src/core/galaxyRange.witness.json`); the TypeScript continuation values must equal it to 1e-9.

**Fingerprints.** v2 fingerprints are in `src/core/galaxyRange.fingerprints.json`, and the dated change log in
`docs/RANGE-FINGERPRINTS-2026-10-31.md` lists every changed entry. The v1 fingerprints stay as the anchor for unmarked
policies.

## Web adaptations

- **Classify [W].** In VIREO, Classify shares the one range. Here it still keeps its own display range (CLASSIFICATION-RANGE.md),
  until round 3 of Front S2.
- **One range for every telescope.** The star route has one instance per telescope (Kitt Peak 0.4 m, 0.9 m, Mayall 4 m). Since
  Front S2 they share the page's range, as VIREO does (Front S had kept one per telescope [W]). The page's range persists until the dialog changes it. Restoring a single
  session file, or returning to a star from the analyser, makes that exposure's range the page's range; an investigation
  restore takes the one range all its sky, star and field-spectrum exposures share, otherwise 3700–4700 Å [W]
  (`tests/spectral-range.spec.ts`).
- The Options box "Allow User Change" that enables the menu item is not modelled; the item is always available.
