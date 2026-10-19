# Bounded native stellar profile preparation

18 October 2026 update: These recovered stellar tables now feed the complete128-star raster for [one bounded object acquisition](STAR-EXPOSURE.md), with independent viewport/slit verification. This does not certify native x87/GDI pixels or general scenes.

Reference: VIREO CLEA_VEO.exe SHA256
781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c.
Procedures0x593df8,0x594018,0x5948b0; initialization entry0x5ad220.
The earlier0x5ad229 lookup was an interior instruction, not the initializer entry.

Static startup binds four <int16 threshold,Single amplitude,Single divisor,
Single spike> records at0x5b4b6c/7c/8c/9c to runtime tables at
0x5bcfa0,0x5c68c4,0x5d01e8,0x5d9b0c. Their values are
(0,2000,6,1000),(3,7000,4.5,1000),(6,20000,3.5,1000),(9,45000,2,1000).
For dx,dy from−49 through49, the Gaussian is
A×exp(−((dx/s)²+(dy/s)²)/2). An ordered cross coefficient is added times1000:
x=0 uses1−|y|/50; else|x|=1 uses0.5−|y|/100; elsey=0 uses1−|x|/50;
else|y|=1 uses0.5−|x|/100; otherwise0. X priority must not be symmetrized.
Base values are integer-rounded and stored x-major/y-fastest.

Fifteen levels0..14 select tables at inclusive thresholds3/6/9, multiply
the integer base by0.63^level, integer-round, clamp255 and pack grayscale.
RTL0x42703c uses an integer-exponent multiplication tree for these levels.
Original entries have99×99×4-byte pixels plus radius byte50, stride0x9925.
Bank EDX/CL arguments are stored after all15 entries and do not configure
base generation. Their later role as magnitude offset/conversion flag is now
traced in [the population contract](CATALOG-POPULATION-CONTRACT.md): parameter
setup uses+1 before caching record levels; a later draw rebuild uses-2 and
consumes the cached levels. Table preparation and level conversion remain
separate APIs. See [the composition review](CONTRACT-COMPOSITION-REVIEW.md).
The telescope caller0x53b712 uses bank+0x701 and subsequently clamps
record+0x57 minus observatory+0x6f8 to0..14 for types0/2/3.

The helper returns owned byte levels for the existing paintNativeStar.
The painter separately applies threshold30, strict red comparison and
clipping. No scene/catalog or acquisition UI is connected by this module.

Numerical policy: binary64 Math.exp, the shared explicit nearest-even rule,
and the observed integer-power multiplication tree using Number0.63.
Original literal0.63 has Extended bytesae47e17a14ae47a1fe3f, slightly below
decimal0.63. The proposal is not an x87 oracle: mathematical exact powers
of that Extended literal differ from the Number policy in32 level1 cells;
rounded native x87 results remain unknown. Base50 gives32 in this adapter
and31 in the exact-product sensitivity model. Do not call that a measured
original difference or silently change policy to the sensitivity model.

Independent Decimal70/100 mathematical base vectors agree for all39204
cells; Fraction/binary64 multiplication-tree fixtures cover147015 level
cells. Full digests and selected coordinates are in
data/hubble/star-profile-vectors.json. These are validation vectors, not
stellar observations. Detailed raw-byte/range hashes, reproducible generator,
aligned objdump captures and sensitivity diagnostics are retained in the
separate star-profile-recovery-night research delivery.

Complete field population/filtering, galaxy/photographic transformations,
palettes, cache/pointing context and original FPU policy remain separate
gates. This addition does not supersede the pending external review.
