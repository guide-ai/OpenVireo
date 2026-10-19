# Telescope acquisition: dependency inventory and first static closure

18 October 2026 continuity update: the supported star now passes directly from the observatory through acquisition, stellar line alignment, linked measurements and replayable analysis-session restoration. Raw counts/time/RNG remain preserved, and stellar results are excluded from Hubble. See [STELLAR-ANALYSIS-CONTINUITY.md](STELLAR-ANALYSIS-CONTINUITY.md) for exact verified test steps.

18 October 2026 update: A second bounded route now acquires source-plus-sky counts for one original catalog star, at `#star-exposure`. Full128-star population, native stellar raster/crop/slit, exact original spectral-index binding and calibrated means are demonstrated. See [STAR-EXPOSURE.md](STAR-EXPOSURE.md). Other object configurations remain disabled.

Status: 18 October 2026. A bounded sky background exposure is enabled at
`#sky-exposure`; other object configurations remain disabled. See
[SKY-EXPOSURE.md](SKY-EXPOSURE.md) for calibration, lifecycle, saving and limits.
The catalog transformation below remains evidence for the complete field.
Source binary: CLEA_VEO.exe, SHA-256
781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c.

## Short dependency inventory

| Stage | Existing contracts | Exact open dependency |
| --- | --- | --- |
| Original ordered population | Compact single-band read trace, admission, magnitude limits; **merge-nearest pruning + one-galaxy cleanup now ported** | One pinned fresh-Hubble fallback field is now complete: see PINNED-NATIVE-FIELD.md. Other pointings/options/history still require a general ordered builder and dynamic stages; navigation data cannot supply it. |
| Native image and slit | Native projection/nearest arbitration, stellar profile/painter, crop, slit RGB arithmetic and stellar/galaxy throughput branches | For the supported sky route, the native resource/field-table frame is traced and all source admission cuts fail without pixels. Object-bearing fields still need actual galaxy/image transforms and crop-cache state. Source PNG/SVG previews do not provide this image. |
| Calibrated means | Source-library preparation, supplied-minor galaxy correction, telescope zero point and source/sky amplitudes | Sky19, zero4 and elapsed multiplier50 are connected in the fixed sky route. Object sources still require a verified selection, slit and type-specific source. No brightness or amplitude placeholder is admissible. |
| Instrument lifecycle | Pure transactional 600-bin source-plus-sky exposure reducer and bounded save codec | Fixed-field sky activation, reset, Go/timer, pause/cancel and labelled CSV/JSON saving are wired with explicit browser timing/seed policies. Other configurations remain disabled. Number/x87 equivalence remains unvalidated. |

The first bounded route is now **sky only**: all132 admitted stars fail a
native angular cut, so throughput is zero without supplying detector pixels.
The native frame yields a non-null selected record before reset. An empty
navigation field or a missing source alone would not justify this route.
The fixed scientific population is independent of the reduced navigation UI.

## Closed stage: native merge pruning and the galaxy caller

`src/core/catalogMerge.ts` ports:

- **0x59a49c:** local wrapped RA/Dec distance, query-declination cosine and
  original degrees-to-radians constant. Number/Math geometry is an adapter,
  not a great-circle substitution or a native x87 result.
- **0x59a2e0:** ordered first/second minima, Single magnitude compatibility,
  at most one runner deletion, original saved positional index and separate
  returned winner identity. It does not sort or globally deduplicate.
- **0x5980cc, one galaxy:** strict distance×3600<30, then resolve the old saved
  position. Delete that non-type3 star; for type3, delete the galaxy exactly
  when Single magnitude difference<1, otherwise retain both.

The previous merge diagnostic left a shifted index as unresolved. The separate
index audit proved the local normal-return lookup semantics: list+4 is the last
valid index, and GetAt resolves the old position. The adapter preserves that
behavior. It neither repairs the index nor claims an original runtime bug.
An out-of-range lookup is null; the caller's subsequent native dereference
outcome remains unobserved. The adapter throws `native-null-lookup` atomically,
with no guessed record or partial final population.

Owned frozen records, unique source-identity IDs, a 200,000-record bound and
numeric/domain errors are new browser protections. Near the Number projections
of original Extended initial/gap thresholds or the 30-arcsecond cutoff, an
8×EPSILON support guard raises `precision-required`. This is a conservative
exclusion, not a measured x87 error bound or a new physical tolerance. Exact
supplied Number ties retain first-entry order; that does not establish all
original Extended geometry ties. Complete source hashes, constants and evidence
paths are in `data/hubble/catalog-merge-provenance.json`.

## Evidence and checks

`data/hubble/catalog-merge-witnesses.json` pins two original galaxy queries and
all 384 GSC raw records read by their 40 binary-search probes and 353 sequential
visits (some probes overlap visits). It retains per-record and whole-original
file hashes, slice hashes and the independent index-audit predictions.

For each supplied rectangle, tests run the existing compact read order and
admission from original packed bytes, calculate the local Number distance,
compare the decisive distances with independent Decimal90 values, and perform
pruning plus the galaxy caller. The independently predicted surviving order is:

| Query | Returned winner | Runner removed | Record resolved/deleted by caller | Final GSC identities |
| --- | --- | --- | --- | --- |
| Original galaxy763, catalog0:182 | 18226 | 18225 | 18271 | 18142,18145,18161,18163,18184,18209,18217,18226 |
| Original galaxy828, catalog0:201 | 18822 | 18819 | 18898 | 18801,18822 |

The pinned earlier-stage checks have no admitted variables/QSOs and one galaxy
for each supplied rectangle. They are entry-state witnesses, not native
sessions: actual FOV/options/band creation and optional dynamic context are not
certified. A synthetic query projection checks that surviving records feed the
existing strict pixel-nearest helper; it does not attest a full native scene.
Additional cases cover a runner after the winner, ties, sole/no candidates,
pruning without a winner, strict magnitude compatibility, type3 alternatives,
stale-index type3 handling, null lookup, boundaries, ownership and bad inputs.

## Later closure and exact next obstacle

[One pinned native field](PINNED-NATIVE-FIELD.md) now closes the original area,
full region/band selection, all relevant catalog checks and final ordered
population for a fresh direct-Hubble fallback configuration at RA0.5h/Dec0.
It contains132 original stars, including119 fainter than the navigation cutoff;
variables/QSOs/galaxies are absent by complete source-file searches. The dynamic
context is absent on the bounded fresh mode4 path, not assumed empty after a
prior general/solar-system session. The actual Hubble.HTL load is preserved as
a separate UI hot list, not misclassified as an options file or population.

For that field, every candidate fails a native stellar angular cut. The
native resource312×312, multiplier3 and Delphi field table now close the
936×936 frame. Selection returns a real off-slit record before reset, and the
calibrated sky route connects activation→reset→Go/timer→pause/cancel→CSV/JSON.
[SKY-EXPOSURE.md](SKY-EXPOSURE.md) records the exact procedure addresses,
recovered constants and explicit browser adaptation policies.

Object-bearing fields still need their actual native raster/calibrated slit;
other pointings/options/history still need general population/time handling.
No original execution/emulation, external review/permission retry, Windows,
publication, push or unrelated-project changes were performed.

## First bounded Hubble galaxy

[GALAXY-ACQUISITION.md](GALAXY-ACQUISITION.md) now documents the complete36773/UM-I2 acquisition → analyser → manual measurement → Hubble/saved replay path. Its114-star/six-galaxy original field, matched/fallback comparison, source interval and explicitly adapted nearest-center raster are separately pinned. This closes only that domain; earlier general object-field/GDI limitations remain for other configurations. Star and galaxy archives retain different provenance and Hubble eligibility.

## Three acquired galaxies and manual origin fit

[MULTI-GALAXY-HUBBLE.md](MULTI-GALAXY-HUBBLE.md) extends the supported set to 36747/UM-I1,36773/UM-I2 and54876/CorBor2. Each retains a separately pinned original field, adapted slit calibration and replay policy. Multiple archived measurements can now yield a manual-source Hubble origin fit; repeated measurements of the same acquired target cannot count as independent targets. Original V-reference cells are documented without preloading student redshifts.
