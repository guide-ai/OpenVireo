# Front P2: photometer apertures 5–150, R and I filters, VIREO's sky

**Status:** implemented on branch `claude/front-p2` (2026-10-30).

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) only; nothing was executed, emulated or sent. No new
resource and no new approval.

**Research:** `analysis/front-plans/front-p2.md` and dossiers A–C in `analysis/front-p2/`. Scripts are in
`analysis/front-p2/scripts/`:
- `captures_p2.py`: byte-range SHA-256 of the decoded code;
- `independent_p2.py`: Decimal90 vectors;
- `contracts_p2.py`: builds the two contracts.

**Tags:** [D] decoded · [I] inferred · [W] web adaptation.

## Contracts and data

| File | Content |
|---|---|
| `data/photometry/aperture-domain-contract.json` | dialog, captures, D2 sky rule and thresholds, 0.4 m maximum |
| `data/photometry/ri-contract.json` | R/I captures, formulas, sky literals, and the D1 superseding 0.9 m / 4 m domain |
| `data/photometry/photometer-p2-vectors.json` | independent synthetic vectors: 21 sampled sizes × 5 filters × kinds × telescopes; full-domain maxima; sky thresholds; dossier B's worked example |
| `data/photometry/p2-legacy-identity.json` | exact binary64 means and one seeded draw for every earlier configuration (U/B/V × 5/10/15 × admitted telescopes), recorded from main 2270449 |

The earlier contracts (`aperture-contract.json`, `kpno09-photometer-contract.json`, `mayall-photometer-contract.json`) are
byte-unchanged.

## P2.1 Pleiades rows 3, 5, 10, 12 (documentation and a test)

The zero-period exit 0x51eca7 is documented in docs/VARIABLE-STARS.md. The truth table is tested in
`src/core/variableMerge.test.ts`. No behaviour changes.

## P2.3 Apertures 5–150

**What VIREO does** [D]:
- **Dialog:** TPhotomApForm1 / ApSzScroll, Min 5, Max 150, LargeChange 10, SmallChange 1 [I: VCL default], Default 10.
- **Readout:** the diameter in arc minutes, Precision 3.
- **The size is a radius in field pixels** (0x5404b0). It sets:
  - the source fraction;
  - the neighbour query radius (+0.0025°);
  - the sky area ((size + 0.5) / 10.5)².

**Web:**
- `src/core/photometerAperture.ts`: `PHOTOMETER_APERTURE_RANGE` and a validator for integers 5..150.
- Dialog: a slider (PageUp/PageDown ±10), a number field, a 3-decimal readout, Default 10, and Apply/Cancel.
- The source reaches its full value from size 39 at 0.4 m, and from 23 at 0.9 m and 4 m.
- **[W] Live change:** VIREO applies a change live and Cancel restores the old size. The web applies the change on Apply, as
  before. Porting live changes would write an aperture event to the journal on every slider step (the journal holds at most
  512 events), so it is not small and is left as a follow-up.

**D2 (a): the sky is measured as VIREO measures it.**
- A bundled Pleiades sky now uses the same Start preparation as Front G's tiled fields. Any star light inside the sky aperture
  is counted, and the strict empty-sky check is gone.
- Light first enters a sky aperture at:

| Sizes | Targets |
|---|---|
| 25 | N2230.DAT@146960 (01799-00526): neighbour N2230-00002 |
| 41 | N2230.DAT@152292 |
| 91 | N2230.DAT@149698 |
| 128 | N2230.DAT@148468 |
| 148 | the other 20 targets (the target star's own wing) |

- No sky aperture holds light at sizes up to 24, so every earlier reading is unchanged.
- **VIREO's sky-replace question** (Start 0x4ffa30) depends on the selected star's light in the sky aperture. It now appears from
  the size where that light first enters. With the 0.4 m that is the sizes above. With the 0.9 m and 4 m it is 41, 56, 106 or
  144 for the same four targets and never for the other 20.
  `src/core/photometerP2.test.ts` checks this: all 864 earlier configurations, E04's included, are byte-identical in means,
  magnitudes and seeded draws.
- **The zero-central path, now ported (no longer a typed reason).** With no light from the selected star, VIREO starts every
  slot at the literal 30 and then adds neighbour light (0x4ffd17, 0x4ffdbb) [D]. Front G had typed this case as
  `photometer-central-unadmitted` for tiled fields. That reason is removed, and the decoded path is ported for both bundled
  and tiled fields (`preparePhotometerBands`).

**Cache:**
- The integration configuration cache keeps its earlier size and drops its oldest entry instead of refusing.
- The bundled Pleiades fields are built once.

## P2.2 R and I

**What VIREO does** [D]: Start 0x4ffa30 fills five slots from the star's V, B−V and U−B:
- R = V − (B−V);
- I = (V + (B−V)) − (U−B).

| Item | Rule |
|---|---|
| Neighbour light | U, B and V only; R and I hold the selected star alone |
| Sky | R = V_sky − 1.0 = 15; I = R − 0.33 = 14.67 |
| Zero point | one for all five filters |
| Filter order | the slider "U, B, V, R, I", opening on V |
| Include R and I option | keeps its compiled default, on [W] |

The stellar I uses B rather than R. That is ported as decoded; whether it was intended cannot be known statically.

**Worked example** (dossier B: N2230.DAT@145877, 0.4 m, size 10):

| Filter | Source mean | Sky mean |
|---|---|---|
| R | 828.807 | 3.981 |
| I | 345.504 | 5.395 |

## D1 (a): the 0.9 m and 4 m domain over U..I and sizes 5..150

`photometerMaximumMean` now covers every selectable filter and size. Its `'legacy'` scope still reproduces the earlier
contracts. The superseding domain is in `ri-contract.json`.

| Telescope | Change |
|---|---|
| 0.9 m | no change |
| 4 m (Mayall) | three targets become excluded (below) |

| Target | New reason | Largest mean, at |
|---|---|---|
| N2230.DAT@144496 | `all-duration-count-domain` | 667,927, R at size 150 |
| N2230.DAT@150246 | `Poisson-mean-bound` | 1,100,380, R at size 150 |
| N2230.DAT@152989 | `all-duration-count-domain` | 491,049, R at size 150 |

- **At 0.4 m** the largest mean is 424,715, for η Tau (N2230.DAT@150112, U at size 150). Over 5,000 callbacks that is
  2,123,576,299, still under the int32 guard.
- **[W] Saved files.** Target and telescope events keep the earlier admission, so every recorded history replays exactly. A
  live Start of one of the three targets with the 4 m is refused, and the bench says why. A history saved before P2 that read
  them still reopens with the same counts.
- **First size over each limit, per filter** (checked in `photometerP2.test.ts`; every other filter stays within both limits):

| Target | Over the 32-bit count (×5,000 callbacks) | Over the 1,000,000 draw limit |
|---|---|---|
| N2230.DAT@144496 | R at every size | never |
| N2230.DAT@150246 | R at every size | R from size 11 |
| N2230.DAT@152989 | R from size 75, I from size 100 | never |

- **What the student sees.** These texts give the 4 m as seven targets and nine exclusions, and name the three new ones with these reasons:
  - Supported observing limits (`ph.limits`);
  - the domain evidence: title, hint, numbers, an "Excluded since" column, and the table built from `ri-contract.json`;
  - the Pleiades guide;
  - `docs/STUDENT-EXERCISES.md`.
  The hot list no longer calls the three targets measurable on the 4 m. Its admission is the earlier one minus
  `photometerFullDomainExclusion`.

## Journal

| Owner | When | Policy | Header adds |
|---|---|---|---|
| 13 | a size outside 5/10/15 | `OpenVireo-photometer-aperture-domain-v13` | `apertureDomainContractSHA256` |
| 14 | an R or I filter event | `OpenVireo-photometer-R-I-v14` | `riContractSHA256` |

- An older owner cannot carry a new size or filter, because its header no longer matches.
- Older files read as before.

## Tests

- **Vitest:**
  - `src/core/photometerP2.test.ts`: contracts, the domain, the vectors, the D2 thresholds, byte identity, D1, owners 13/14;
  - `src/core/variableMerge.test.ts` (P2.1);
  - the updated photometer suites.
- **Playwright:**
  - `tests/photometer-p2.spec.ts`: size 150 through the slider and the number field, an R reading, an owner-14 round trip,
    360 px;
  - `tests/photometer-aperture.spec.ts`.
- The vectors are synthetic. No original-runtime equivalence is claimed.

## Model and effort

| Step | Model | Effort |
|---|---|---|
| Plan and dossiers | Claude Opus 5.5 | high |
| Implementation | Claude Opus 5.5 | medium |
| Review | coordinator | high |
