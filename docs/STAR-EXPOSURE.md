# First bounded catalog-star acquisition

**Follow-up,19 October2026:** [KPNO0.9m centered stellar acquisition and investigation12](KPNO09-STAR.md) are now implemented with independent calibration/raster/count evidence and separate telescope journals. The earlier bounded delivery/evidence below retains its historical scope.

18 October 2026 continuity update: the supported star now passes directly from the observatory through acquisition, stellar line alignment, linked measurements and replayable analysis-session restoration. Raw counts/time/RNG remain preserved, and stellar results are excluded from Hubble. See [STELLAR-ANALYSIS-CONTINUITY.md](STELLAR-ANALYSIS-CONTINUITY.md) for exact verified test steps.

`#star-exposure` acquires new simulated **source-plus-sky** counts for original compact-catalog record `N0000.DAT@14428`, pointing RA0.4987684h/Dec+0.03628°. Its stored Single magnitude is13.92199993133545. This is a real supplied catalog record and its original CLEA-assigned spectral template, not an imported example observation. The mapping does not assert that the catalog star is the original human-named template donor.

Only this exact fresh direct-Hubble, compiled-fallback, telescope-record0 configuration is enabled. Other objects, pointings, custom settings and histories remain disabled. No original executable, Windows environment or emulator was run; no Claude review was attempted or retried, no dependencies installed, and no public upload/push/deployment occurred.

## Selection and complete population

`analysis/object-exposure-recovery/generate.py` reads the immutable original data and PE sections. It pins11 whole-source hashes (the existing nine field sources plus JSPEC2.SPI and A0000049.SP); the original nine are checked against the previous immutable manifest. Subsequent runs verify `original-source-manifest.json`. It reconstructs the original area, all9538 region records, native increasing region selection, marked band order, binary probes and sequential visits. Adjacent rounded-key controls retain identical admissions, and an independent full-band search verifies the same admitted records.

The selected regions are3,10,4665,4672. The native band order is N0000 then S0000, admitting69+59=128 stars. The field is RA[0.47376839498813483,0.5237684050118652], Dec[−0.33872,+0.41128], limiting magnitude20. Whole-source position searches find no variable, QSO, galaxy or photographic center in this rectangle, before magnitude/time filtering. The bounded fresh Hubble mode4 path retains the previously traced absent dynamic context. This proof uses no reduced navigation tiles and omits no known admitted population.

The native resource/Delphi field-table binding from SKY-EXPOSURE.md gives CRT1=312², field multiplier3,936² cached raster,0.75° field. Projection0x53ca7c→0x594a44/0x594b04 places the target exactly at468,468. Native nearest selection0x53ce8c→0x59a0fc returns it at distance0; the next candidates are42.824270577 and66.245280586pixels away. There is no galaxy arbitration branch in this field. The explicit Number/Math projection and nearest-even integer conversion policy replaces unmeasured x87 control-word behavior, without making x87 equivalence a global gate.

## Raster, slit and calibration

| Stage | Recovered contract and supported binding |
| --- | --- |
| Background |0x538420 sets a black brush and fills the fresh native bitmap. Browser RGB starts at0,0,0. |
| Profile bank |0x593df8/0x594018 use the four original startup parameter records, ordered Gaussian/axis-spike terms, fifteen0.63^level entries, thresholds3/6/9 and byte clamp255. No new PSF is invented. |
| Cached magnitude |0x53c5cf sets bank offset+1/flag0 before projection;0x53cad5→0x594908 stores Round(Single magnitude)−1. The later bank metadata change does not recalculate this cached value. |
| Telescope paint shift |0x53df6d–0x53df75 round the original telescope correction−2. Native0x53b748–0x53b77c computes cached level−shift, clamps0..14. Target stored level13 becomes painted level14. |
| Painting |0x59417c stamps99² x-major/y-fastest levels with threshold30; strictly brighter red replaces all three channels with gray. All128 stars are painted in native order with rounded projected centers and zero fresh offsets. |
| Crop |0x53a810–0x53a8d8, fresh anchors468,468; exclusive source rectangle312,312–624,624; equal-size SRCCOPY gives a312² viewport. No unknown stretch/interpolation or missing pixels are filled. |
| Slit |0x53e338 sums RGB over native center3×19 pixels, divides by57 and rounds. Independent sum2343 gives level41. |
| Throughput |0x50f338: type0 at exact pointing passes both strict raw angular cuts and positive pixel level; fraction1. For stars this is binary admission, not level/200 galaxy attenuation. |
| Amplitude |0x50e0e4–0x50e147 uses the selected stored Single magnitude and stored telescope zero point4 (base6 plus correction−2):10^((13.92199993133545−4)/−2.5)=0.00010744841845974996. Sky magnitude19 gives1e−6; elapsed multiplier50. |

The original0.4m default telescope's normalized value1 equals the Single comparison at0x53ce58. The original opening path0x53cd21→0x53cd7f clears the observation-allotment pointer for this telescope record; this route does not invent observation credits. Same-object reactivation retains a segment, and field changes pause/deactivate without discarding its data. The native unsaved-data dialog is replaced by explicit retention and explicit Reset/Cancel actions.

`verify_numeric.py` independently reconstructs the binary64 grayscale frame and viewport, checks the original source text and uses Decimal100 interpolation/calibration/Poisson with exact integer LCG. The whole-raster SHA256 is `20dc9a2da6c8f8657e3bb0eb8160fea3c546c31f0f35509ff55e1cad974b8863`; viewport SHA256 is `df72d0d99cdc1b4706d5271bd7d390de33794b2f9c3927380f82af9f5458dab3`. TypeScript matches the complete viewport and slit level. Native device palette/GDI and x87 pixel identity are not asserted; deterministic RGB/nearest-even behavior is the declared browser adaptation.

## Original source and new counts

Compact reader0x59b0b3–0x59b0b9 copies packed int32 offset8 to expanded record+0x43. Reset's95-byte selected-record copy places that index at spectrometer+0x31ce. It is50705000. The default configuration0x5a233b–0x5a23b7 stores `SPECTRA\JSPECT2\JSPEC2.SPI` from0x5a2d10. The index validity flag at spectrometer+0x431 aliases (index list+0x417)+0x1a and is set by successful file loading, rather than being an unrelated assumed enable flag. The original index reader0x50d460/0x50d754 inserts via0x492728 using signed-integer greater comparator0x50d454. The file's132 rows are not globally ordered; native insertion constructs an ascending collection. This was recovered explicitly instead of treating file order as lookup order. Matcher0x50d660 then selects the unique exact JSPEC2.SPI entry `50705000 'A0000049.sp'`; no fallback template or random index is used. Star preparation0x50e328 loads that original file through0x55ee14.

A0000049.SP contains2799 original wavelength/flux rows,3510–7427.2Å. The headerless loader0x55ef64–0x55f05d retains original flux values and reconstructs a uniform endpoint grid. No new normalization is added. Go0x50f4f9–0x50f5c9 samples at3700+i×(1000/600),600 bins, using the recovered0x55dfe0 nearest-even/quadratic sampler; all requested wavelengths are in bounds. Each sampled shape is multiplied by the traced source amplitude.

Source means and sky means are integrated by the existing transactional exposure reducer, drawing **source then sky for each bin**. Every supported tick is0..1000ms; the maximum source Poisson mean remains below12, so only the recovered product branch is used. Even a committed0ms interval consumes1200 uniforms. Original star preparation has no random continuum-extension step.

Five independent synthetic vectors test full600-bin outputs, source/sky totals, draw count and final state. For seed1 with ten100ms intervals, the result is2092 source counts plus28 sky counts,14120 uniforms, final seed2842161081. One1000ms interval has a different draw path and is tested separately; timing subdivisions are not falsely treated as identical observations. These vectors validate the declared adapter contract, not an executing original.

## Shared lifecycle, saving and bounds

`exposureJournal.ts` and `useBoundedExposure.ts` now serve both sky and star routes. Timer epochs, actual integer monotonic deltas,100ms target cadence,1s gap rejection, background/route/domain pause, retained RNG, compound Stop→Reset, cancel/discard, explicit uint32 browser seed and12000-event segment bound retain the previously tested policies. A queued callback cannot mutate a reset, paused or different-field segment. Browser histories and cumulative committed milliseconds are explicit per-reset-segment bookkeeping, not a native application/session emulator.

The separate star CSV records raw **source-plus-sky** bins with object/source/field identifiers and hashes, magnitude, slit level/fraction, aggregate source and sky totals, committed milliseconds, reset/current seed and uniform draw count. Per-bin source/sky separation is not invented. The existing analyser is not silently populated with these counts.

Star JSON binds the known field and source snapshots, fixed domain and policy, reset seed and exact event journal. It replays counts and never trusts imported means, cached counts or amplitudes. Strict keys/domain, UTF8,2MiB and event bounds apply. It restores stopped/unarmed and cannot be confused with a sky JSON. Both serializers reject a state from the other policy. Repeated exports are stable; invalid imports pause and retain previous committed data.

Tests cover all independent counts and source checks, viewport hash/slit, byte saturation and native level clamping, Single magnitude, invalid precision/timing inputs, policy/source/field tampering, lifecycle, reset during exposure, cancellation, seed repeats, field changes between independent sky/star states, export/reload/replay, delayed clocks, keyboard and320px layout. Full-page screenshots: [external browser-evidence record].

The star path has no missing source/raster dependency in this bounded domain, so a galaxy fallback was unnecessary. The known M82 route would additionally require photographic preparation/device scaling and galaxy-specific calibration; this increment does not broaden that work or substitute a galaxy example for an acquisition. Claude remains pending under the existing restriction; no new approval request was made.
