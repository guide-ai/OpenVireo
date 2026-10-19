# Recovered point aperture and known-color neighbor preparation

Delivered in pure TypeScript:`src/core/photometerSource.ts`. This advances the numerical portions of0x500568 and0x4ffa30 without adding an observing UI or generating observations. The supplied scene/identity and known-color domain is explicit; I01/E04 remain unimplemented as observing flows. Existing count normalization,1000 base photons per callback and100ms timer defaults are unchanged and remain separate quantities. Session v7 is unchanged.

## New recovered contracts

The pinned target is VIREO1.504 `CLEA_VEO.exe`, SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`; archive SHA-256 `58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b`. [Manifest](../data/photometry/source-provenance.json) records19 bounded byte/listing ranges,19 exact constants/immediates, source/license hashes, callback linkage, scope and uncertainty. Raw originals, static captures, reader witness and reproduction scripts remain outside source:

`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-source-recovery/`

| Evidence | Recovered behavior and port |
|---|---|
| PHOTO-SOURCE-19,0x59a49c–0x59a52f | Flat native separation: absolute RA difference, wrap above12h using24h, multiply15×cos(pointing declination), combine with declination difference by sqrt(sum of squares). Original object coordinates are Double; pointing is Extended. `photometerSeparation` accepts explicit hours/degrees and applies the declared Number projection. No spherical-distance model was substituted. |
| PHOTO-SOURCE-01,0x50059f–0x500668 | For the defined point branch(types0/2/3), prepared radius r, separation d and width s produce `I((r−d)/s)−I(−(r+d)/s)`. Tracking ESP through each12-byte argument push establishes these signs; interpreting the shifted stack offsets as unchanged would reverse the contract. `photometerPointFraction` accepts supplied nonnegative r/d and positive s in matching units. It does not select a target or prepare a telescope. |
| PHOTO-SOURCE-07/04 and original method pointer0x55cc34→0x55cc40→0x55f7d4 | The scalar density is `exp(−x²/2)/sqrt(stored2π)`. Native startup initializes its normalization; the photometer constructs the table with10 subdivisions per unit and Extended tolerance1e−7. This is a recovered edition model, not a new circular aperture or PSF. |
| PHOTO-SOURCE-04/05,0x55f80c and0x55f5b8 |101 table entries, index0 initialized to0, then integrals from−5 to successive0.1-spaced points through+5. Trapezoid refinement and `(4*T−previousT)/3`, strict relative1e−7 convergence, at most10 iterations. The Number port rejects nonconvergence; native construction does not enforce that guard. |
| PHOTO-SOURCE-06,0x55f91c/0x55fa24 | Lookup below−5 returns0, above+5 returns1; interior values interpolate linearly. The inclusive+5 path can request table101 after allocating entries0–100. The port withholds that endpoint and any Number index rounded to100. It does not replace the lookup with erf or silently clamp the unsafe endpoint. |
| PHOTO-SOURCE-03,0x5953a0 | Admitted fraction f>0 changes magnitude to `m−2.5log10(f)`. Native f≤0 returns literal30. The public bounded helper rejects negative/out-of-range fractions; f=0 preserves the30 sentinel. That sentinel is not an observed magnitude or physical zero-flux claim. |
| PHOTO-SOURCE-03,0x595338 | Combine `near−2.5log10(1+10^((far−near)/−2.5))`. Caller puts attenuated neighbor near and accumulated current magnitude far. The port keeps this expression/order and rejects Number overflow/underflow; no stable log-sum rewrite silently changes it. |
| PHOTO-SOURCE-02,0x4ffbd7–0x4ffd52 and0x4ffdbb–0x4ffee0 | Native Single V/+0x29, B−V/+0x2d, U−B/+0x31 prepare B=V+(B−V), U=B+(U−B). Central light is attenuated, then each positive-admission neighbor is attenuated and added in flux by the helper pair. Zero-admission neighbors are skipped. The port accepts an already selected, complete, ordered neighbor list distinct from the central source; it does not invent that list. |

`prepareKnownColorPhotometerUbv` requires a positive central fraction and known colors below the native missing-color threshold30. Native central missing-color branches clone V/B, whereas the neighbor loop reads its colors directly; those broader branches are **not** certified by supplying a guessed default color. The bounded port rejects them. Raw input colors are projected to native Single before addition. R/I, the image/galaxy branch, missing central admission and unresolved source-list identities remain outside this slice. The10,000-neighbor bound is a new adapter limit.

## Numerical policy and independent checks

Number/Math replace Extended/x87 within the declared slice; no original runtime equivalence is claimed. The native table constructor repeatedly adds Extended0.1. This port uses explicit index coordinates `−5+i/10` rather than inventing the exact x87 accumulation trajectory. Native stored2π is recorded exactly in the manifest; Number uses Math.PI. These choices are declared adaptations, not new astronomical formulas.

The normal table starts at−5: `I(0)` is slightly below0.5. It is not a modern full-tail CDF. Above+5 it jumps to1; the original truncation/lookup policy is retained. Off-grid interpolation matters and is preserved. The unsafe+5 lookup is an explicit unavailable boundary.

[Independent vectors](../data/photometry/source-vectors.json) use90-digit Decimal power-series Gaussian antiderivatives followed by the recovered0.1 interpolation. UBV references independently sum linear flux before taking magnitudes. They are synthetic analytic checks, never acquired CLEA observations. Tests cover every safe knot, off-grid interpolation, signed aperture cases, tails/unsafe endpoint, RA wrap/exact flat-distance cases, known-color blending, Single projection, missing colors, skipped neighbors, invalid inputs and overflow. Comparison tolerance1e−7 is a local analytic verification threshold, not an original uncertainty estimate.

From the repository, verify the delivered core with:

```sh
npm test -- src/core/photometerSource.test.ts
```

There is no new photometer route or observing procedure to try at the persistent preview. Existing acquisition/classification/Hubble flows retain their prior contracts; no catalog answer is written into a learner measurement.

## Reader progress: original positions, not photometry

The retained `reader-witness.json` contains complete source-name/position witnesses for **24 PLEIADES.HTL records** and **16 CLUSTERS.DAT records** with whole-file/per-record hashes and exact rational representations of the stored coordinates. Reader widths are backed by original calls, not inferred from divisibility:

- HTL0x590424 passes0x56(86 bytes) to the native file reader.0x591e99–0x591ed3 copies Extended fields+0x19/+0x23 into slew coordinates. First entry:`01799-01442`, stored coordinates3.6883333 and23.96667.
- Cluster list creation0x531520 uses0x66(102-byte records); file open0x532832 uses the same width.0x532639–0x532653 copies Double fields+0x19/+0x21, consumed by parameter form0x53058b/0x5305f4. The source contains `M 45 (Pleiades)` among the16 cluster entries.

Pascal name lengths are honored; stale string padding and unused bytes are not interpreted as fields. These are positioning subsets only: epoch/full schema, UBV values, generated-cluster associations and aperture contaminants are not established by reading a target list. No generic browser HTL importer or new original file copy is added.

## Lifecycle/persistence progress and next exact gate

Follow-up: [PHOTOMETER-FIELD.md](PHOTOMETER-FIELD.md) now implements the complete compact target/two-field association and numerical replay for a declared1′ profile. It also identifies the exact neighbor margin0.0025° and Cancel target THRDisplayForm1. The broader domains and lifecycle gates below remain open.

The Stop handler0x500b58 disables PhotoTimer and calls0x501abc to unlock controls. It does **not** invoke the completed-integration reducer or Record; stopping a partial integration must not fabricate a completed photometric result. Exact partial-buffer/reentry policy remains separate.

Record0x501e7c first looks up/creates a collection entry through0x54a73c, fills coordinate/band fields and invokes modal review at0x501f94. The modal result controls self+0x6b0 at0x501fab. This is not evidence of a native disk writer or cancel rollback: mutation precedes the dialog. No speculative atomic v7 photometry schema was added.

The following original prerequisites apply beyond the newly supported fixed field:

1. Trace the neighbor producer0x59ac54 and match actual Pleiades source IDs to native V/B−V/U−B records or the applicable generated-cluster path. The fixed compact Pleiades field is now established; broader fields and generated-cluster associations still need completeness/order/central exclusion and actual prepared width/aperture scale. Source positions alone cannot supply colors or observations.
2. Complete telescope-change/reentry fresh-sky implementation and partial-stop state. The manual's requirement for fresh sky after a telescope change remains enforced as an acceptance condition; three stored banks alone do not authorize reuse.
3. Follow0x54a73c and the modal review/commit/cancel branches to the actual observation save/load routines before creating a replay/session contract. Native zero/sentinel behavior and formatting remain open.

I01/E04 are not declared complete. No Windows, original execution/microemulation, Claude, installation, remote push, publication or asset upload was used. Local rights/provenance remain retained. [Verification](PHOTOMETER-SOURCE-VALIDATION.md) records actual-repository regression results and artifacts.
