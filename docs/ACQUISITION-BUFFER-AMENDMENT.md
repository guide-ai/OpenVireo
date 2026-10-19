# Amendment: acquired counts contain source plus sky

This amends the analyst label `source-minus-sky` in research
`analysis/scene-save-recovery/contracts.json`, `/save_contracts/1/reading`.
That historical artifact is retained unchanged; its SHA-256 and the proposed
replacement are recorded in `data/hubble/spectrum-accumulation-provenance.json`.
The original executable and earlier raw evidence are not changed by this note.

For VIREO SHA-256
`781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`,
the inspected TSpectrometer reset/Go/timer/Stop/Save path accumulates source
PLUS sky. The earlier timer dossier already shows both additions. This is
an interpretation correction to the save label, not a new subtraction stage
or a change to the existing acquisition reducer's arithmetic.

With form instance P and i=1..600, B_i=P+0x42d+19*i. The first allocated
element begins at P+0x440; index zero is not an extra spectral bin.

| Field | Address | Relevant writes |
|---|---|---|
| Prepared source mean, Extended | B_i | Reset clears; Go FSTP at 0x50f556/588/5ba |
| Acquired count, signed int32 | B_i+0xa | Reset 0x50e287=0; ADD source 0x50f7fc; ADD sky 0x50f848 |
| Display y, int32 | B_i+0xe | Stop/timer write 220−Round(count×scale) |
| Display flag, byte | B_i+0x12 | Reset/Stop/timer |

Timer keeps P in EBX. For source, EDI=B_i; `01 47 0a` adds its Poisson
draw. After the sky draw it recalculates EDX=B_i; `01 42 0a` adds that draw
to the identical count. The sky total P+0x3112 is an int32 scalar; source
total P+0x3116 and combined total P+0x311e are int64. FADDP at 0x50f88c
forms source+sky. There is no retained per-channel sky realization in this
path. P+0x30c8 is the separate Poisson cache, immediately after the array.

Mode P+0x416 is set from zero throughput during activation. Sky-only mode
skips the source draw and still ADDS sky to the same count. Object types
choose different source samplers but converge on this accumulator. Stop's
SUB at 0x50f70a writes the display field +0x43b, not the count field +0x437.
The magnitude minus zero-point and Poisson exp(−mean) operations are earlier
calibration/sampling arithmetic, not background subtraction from counts.

Save retains P in EDI (0x50fb2f), reads counts at 0x50fe67/7c/ec and divides
by their maximum using `DE F9` at 0x50fef6. No corrected count is stored.
Reset's 95-byte copy to P+0x318b copies object metadata, not another count
buffer. Equal small offsets in the photometer or receiver belong to other
classes and do not establish aliases to this spectrometer array.

For valid nonnegative means/time products without overflow or invalid FPU
conversions, sum(counts)=sourceTotal+skyTotal. Signed storage and possible
overflow do not establish source−sky semantics. Browser overflow guards,
Number arithmetic and atomic updates remain explicit adaptations. No original
x87 run, exceptional zero-maximum output, whole-program indirect-alias proof
or claim about every other CLEA instrument follows from this amendment.

`spectrumAccumulation.test.ts` compares 600 channels against independent
integer-LCG/Decimal80 and Decimal100 product-Poisson fixtures with both means
positive. It checks draw order, sky-only versus present-zero source, pause,
resume, reset, and acquisition→codec normalization. Inputs and metadata are
synthetic; the results are not acquired CLEA observations. Realized draws
of 1 and 2 sum to 3; Poisson MEANS of 1 and 2 do not guarantee three counts.

The public contracts remain separate: `photons.ts` prepares amplitudes,
`acquisition.ts` samples, `exposure.ts` accumulates, and `legacySpectrumFile.ts`
handles bounded native-format bytes. No UI acquisition or automatic promotion
of imported/source files into observations is enabled.
