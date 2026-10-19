# Supplied-input photometer reduction — N03 partial

[Point-source follow-up](PHOTOMETER-SOURCE.md) adds bounded separation, aperture and known-color UBV neighbor preparation. It creates no acquisition and preserves the base-count/time distinction described below.

Context follow-up: [PHOTOMETER-CONTEXT-RECOVERY.md](PHOTOMETER-CONTEXT-RECOVERY.md) resolves the clock/count distinction and filter/telescope bank bindings. The API now names the normalizer `nativeBaseCountSum` and its rate `baseCountRate`; the earlier `nativeElapsedUnits`/`referenceUnitRate` labels were misleading. Arithmetic and existing v7 investigations are unchanged.

The next optical slice is a pure TypeScript **post-integration reduction**, not an operational aperture photometer. It accepts already supplied integer counts, integration settings, native base-count sum, normalized sky and prepared zero point. It creates no observations or random samples, provides no default calibration and changes no React route or session schema. I01/E04 remain unimplemented; the existing v7 classification and Hubble flows remain intact.

## Original evidence and declared adaptation

Pinned VIREO1.504 target `CLEA_VEO.exe` SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`; archive `CLEA_Vireo.zip` SHA-256 `58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b`. [Range/constant/source manifest](../data/photometry/reduction-provenance.json) includes evidence IDs, raw range/listing hashes, manual/license hashes and field mappings. Original downloads, static assembly and reproduction scripts remain outside web source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometry-reduction-recovery/`. No binary execution or microemulation was used.

| Evidence | Meaning used |
|---|---|
| PHOTO-STATIC-01,0x500acc–0x500b02 | Aperture factor `((selector+0.5)/10.5)^2`; exact Single/Extended constants0x500b04/0x500b08. Selector units are deliberately unnamed. |
| PHOTO-STATIC-02/03 | Start context and reset; prepared zero point stored at self+0x483. No calibration inferred from the upstream +5 constant. |
| PHOTO-STATIC-04/05,0x501687–0x5016ba | Integration duration `T = integrations × secondsPerIntegration`; mean rate `totalCount/T`; base count rate `nativeBaseCountSum/T`. |
| 0x501582–0x501588 | self+0x4de accumulates raw global+0x2e53. This is BaseCountEd counts per callback, not elapsed time. Timer seconds use env+0x2e57/1000 separately. |
| 0x5016cc–0x5016de,PHOTO-STATIC-08 | Native displayed object SNR is `sqrt(totalCount)`; it is not a newly inferred background-noise formula. |
| 0x5016e5–0x5017b6,PHOTO-STATIC-07 | Normalized prior sky multiplied by aperture factor; net=`meanRate−scaledSky`; magnitude=`preparedZeroPoint−2.5 log10(net/baseCountRate)` for positive net. Missing/negative sky or nonpositive net have no usable magnitude. Native zero magnitude is an unavailable/sentinel boundary. |
| 0x501831–0x501874 | Sky reference rate=`meanRate/apertureFactor`, stored per native filter/bank. This pure API leaves correct bank/telescope binding to a future recovered caller. |
| 0x50198c/0x50199c | Exact count cap2147483647 and magnitude factor2.5. API accepts already converted integer counts; the prior native floating→integer conversion is not ported. |
| PHOTOHLP.TXT | Sky-before-object/filter workflow; changing aperture scales sky; telescope changes require new sky; integrations0.1/1/10/100seconds,1–5 repeats. |
| Pleiades2008 student PDF, PDF pages4/10 | Supplied `B−V = B magnitude − V magnitude`. Standalone student exercise and VIREO kernel are distinct editions. |

The subtraction above belongs to **photometer reduction**. Existing spectrometer source+sky buffers still **sum** source and sky. Nothing in this increment changes that acquisition or SSP export contract.

`src/core/photometryReduction.ts` exports `reducePhotometerSky`, `reducePhotometerObject`, `photometerApertureFactor` and `photometricBMinusV`. Inputs are finite explicit scalars; count/counter values are bounded signed-positive integers (counts may be0). Raw selector0..1000000 is a new adapter guard, not a recovered UI maximum. Missing sky uses explicit null. Nonpositive net and Number result exactly0 return an unavailable status; overflow and invalid inputs throw typed errors. No magnitude is rounded, no SNR100 threshold is enforced, no extinction/reddening, temperature, distance, isochrone or fit is inferred.

JavaScript Number/Math replace native Extended/x87 only within this declared finite scalar slice. In particular the zero-magnitude guard withholds a potentially boundary-sensitive result rather than certifying a native flag decision. Complete aperture/neighbor calibration, result-recording rounding and exceptional FPU behavior remain open. Arbitrary supplied inputs are not necessarily physically consistent native readings.

## Try the delivered slice

From the project directory:

```sh
npm test -- src/core/photometryReduction.test.ts
```

The fixture `reference` supplies synthetic count1200,1×10seconds, raw selector10, native counter1000, prepared zero point20 and normalized sky20: factor1, mean120, net100, reference rate100, ratio1, magnitude20. `larger-aperture` separately checks area scaling; `background-snr` distinguishes the native raw-count SNR from a new net-count noise model. These are **synthetic algebraic vectors**, not CLEA observations. Rational arithmetic and70-digit Decimal logs/square roots were generated independently of TypeScript in the retained `analytic-vectors.py`.

No new photometer button is expected at http://127.0.0.1:5173/. Existing classification can still be tried at `/#classification` using the exact import/cancel/reimport/restore steps in [CLASSIFICATION-IMPORT.md](CLASSIFICATION-IMPORT.md). This increment is intentionally a scientific core deliverable, not another preview pretending to acquire Pleiades data.

## Exact artifacts needed before acquisition

- Resolved: global+0x2e53 is base counts per callback; global+0x2e57 is timer milliseconds. Do not infer callback count from selected/wall time. See the follow-up manifest for defaults, bindings and exact conversions.
- Complete source/sky preparation from the object context around0x4fffd4 and Start0x5008b4, including helper0x500b14, filter/telescope calibration and aperture-to-scene geometry. Existing spectrometer means are not a photometer substitute.
- Filter/integration bindings and bank identities are now traced. Complete aperture and reading-mode interaction plus telescope reentry/sky invalidation. Stored banks do not authorize sky reuse after changing telescopes.
- Recover Record0x501e7c and review/result serialization, flags and rounding; do not add speculative durable photometry state to v7.
- Recover cluster/hot-list/isochrone schemas and native readers before the E04/E05 lesson. `PLEIADES.HTL`/`CLUSTERS.DAT` are binary; divisibility or names do not establish their layouts. Native HR axes/reddening/manual fitting transforms need separate evidence.

Original license remains retained; broad derivative redistribution is unestablished. Static recovery plus analytic agreement establishes the documented bounded implementation only. See [full-plan status](ACCEPTANCE-STATUS.md) for the remaining package counts and priorities.
