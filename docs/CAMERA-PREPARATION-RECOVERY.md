# CCD / IR preparation: recovered owners and next boundary

This is the continuation of the [shared palette](CAMERA-PALETTE.md), not a claim that a saved FITS image operates either camera. Complete captures and hashes for the raw getter/setter/index, both level mappings, DIB preparation and histogram helpers are in [the provenance receipt](CAMERA-PALETTE-PROVENANCE.json). Original code was read/disassembled only.

## Owners established by the captured display routes

| Owner/field | Demonstrated use |
|---|---|
| Camera image `+4` | Distinct raw Single matrix. Getter `0x52449c..0x5244c7` reads Single then promotes through an Extended temporary; setter `0x5244c8..0x5244f0` stores Extended to Single. Index `0x5244f0..0x5244f9` is `y × width + x`, with matrix width at `+0x0c`. |
| Camera image `+0x46` | Histogram/statistics object passed to `0x55fbd0`, `0x55fc08`, `0x55fc28` and `0x55fc40` during display preparation. It is not merely the supplied image's finite minimum/maximum. |
| Camera image `+0x18` | Temporary display parameters; low64/high127 at offsets8/12. |
| Camera image `+0x20`, `+0x2a` | Extended baseline and display span prepared from owned statistics. Used by raw integer → byte level conversion before applying the palette. |
| Camera image `+0x1c` | Separate display/DIB object. Preparation `0x521014..0x5212a8` creates a 40-byte info header,8-bit indices,256palette entries,negative height for top-down rows,and rows padded to multiples of4bytes. The palette destination is this object's `+4` header buffer plus40. |

The captured raw-level functions are IR `0x51ea40..0x51eaaa` and CCD `0x521fec..0x522056`. Each subtracts the owned baseline from an integerized pixel. Below0 it returns low; above the owned span it returns high; inside the interval it divides by that span,multiplies by `(high−low)`,converts through FISTP,and adds low in the returned byte. The display caller first performs Single → Extended → FISTP integer conversion. The native result is not a direct palette lookup on a linear0–255stretch of all finite file pixels.

## Statistics recovered without inventing their image authority

The histogram helpers establish a first-maximum-bin search (`0x55fbd0..0x55fc05`),a search to the first zero bin to the right (`0x55fc08..0x55fc27`),a mean from Extended sum/count (`0x55fc28..0x55fc3e`),and a sample deviation from Extended sum/sum-of-squares/count followed by FSQRT (`0x55fc40..0x55fc97`). Histogram insertion (`0x55fb48..0x55fbcc`) clamps negative values to0 before accumulating sums,bins and count. It uses its owned Extended bin width and last-bin index,not a newly selected web binning rule.

Complete additional captures now include camera preparation IR `0x51e43c..0x51e712` and CCD `0x52154c..0x521c65`, histogram constructor `0x55fa68..0x55fae0`, statistics insertion IR `0x51eab0..0x51eae7` / CCD `0x521c90..0x521cc7`, and shared scalar jitter `0x520ec0..0x520f0e`. The preparation calls construct 256 bins with Extended bin width256; this is an owned camera histogram, not an arbitrary plot of the supplied FITS. The scalar helper uses a native random draw and a square-root-dependent spread; it must not be casually described as Poisson or Gaussian noise. These routes are still being followed through their actual configuration,field/star callbacks,random draw order,conversion points and clipping. Complete capture boundaries do not establish complete scientific ownership or enable acquisition. Earlier snippets/call candidates are discovery evidence only.

## What is still needed for a camera feature

1. Complete the camera preparation and source/field callback chain: source star/extended-object associations,photometric scales,configuration and dimensions.
2. Establish the exact background/dark/readout/random contracts,where statistics are collected relative to source addition/Single storage/ADC clipping,and the initial RNG ownership/order.
3. Trace camera fields to the actual source configuration and existing optical profiles. An arbitrary imported FITS file does not supply these fields or certify its origin,units or historical statistics.
4. Admit only recovered bounded domains,with independent numerical controls and explicit Number/x87 limits. Validate observing,cancellation,reentry,save/restore and manual-work conservation before enabling acquisition/calibration.

These are concrete further recovery tasks in the available VIREO source,not a claim that all remaining work is permanently blocked. Historical session metadata and unmeasured native FPU/output witnesses remain separate limitations. The optional palette preserves these gates;it does not synthesize camera context from header text or treat its display as scientific calibration.
