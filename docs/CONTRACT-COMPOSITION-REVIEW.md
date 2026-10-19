# Local v2 contract composition review

This review combines the recovered profiles/distance/codec helpers, bounded
catalog population stages and one compact GSC band read trace. It is local
static/numerical review with synthetic diagnostics and hash-bound original
catalog witnesses. It is not an external review, an original executable run,
a complete detector-population certificate or an acquisition implementation.

## Configuration state versus drawing state

The profile preparer returns the same fifteen tables independently of the
bank's later converter metadata. Native parameter setup0x53c5cf initializes
offset+1/flag0 before the loop that stores record+0x57. Native draw0x53b712
later rebuilds the bank with-2/flag0 but reads that cached record level.
The APIs correctly separate `nativeStoredStellarLevel`,
`nativeStellarPaintLevel` and `prepareNativeStarProfiles`.

An added composition test converts supplied9.5 magnitude at+1 to cached9,
selects prepared profile9, and obtains independent synthetic slit level314
after the existing painter. Recomputing with draw-stage-2 gives profile12
and diagnostic121. The synthetic black100×100 field is a test input, not
an original detector frame. Original active x87 rounding remains unknown.

Older profile documentation called EDX/CL opaque metadata; that description
is now updated with their recovered converter use. Their values still do
not alter Gaussian table construction. Existing raw evidence hashes remain
unchanged; the later interpretation is recorded explicitly.

## Search visits, admission and the maximum boundary

The compact reader starts at its last binary-search midpoint, processes a
row through admission/insertion, and only THEN tests stored DoubleRA>maxRA.
This preserves the original duplicate witness: on N0000.DAT rows43828/43829,
the slightly earlier lower key retains both, while an exact-key midpoint
can start at43829. Strict nearest-distance improvement keeps the first
surviving candidate in a tie. Subsequent source merges may still alter it.

Two added composition cases use those hash-bound original rows. With
minRA<maxRA and the duplicate coordinate exactly on maxRA, both duplicates
are admitted; the later visited43830 is rejected. With minRA==maxRA and
broad Dec bounds, the admission predicate's OR branch admits43829 AND
43830 before the scan stops, even though43830 exceeds maxRA. Thus neither
the predicate alone nor the trace alone should be renamed a conventional
complete interval loader, and no second clipping pass should be invented.
These are bounded diagnostics, not reconstructed full-session fields.

## Source plus sky and spectrum bytes

The acquisition reducer retains source-plus-sky counts. The historical
source-minus-sky save label is explicitly amended, with the original research
artifact preserved and hash-bound. Reset/Go/timer/Stop/Save buffer identities
agree with the reducer and the codec: display-coordinate subtraction is not
a photon subtraction. Sky-only mode skips source draws; a present zero-valued
source consumes them. Positive-source/positive-sky reference vectors and
acquisition→codec tests retain their independent expectations.

The codec normalizes supplied signed counts by a maximum starting at zero;
it does not subtract sky or substitute source-profile intensities. Native
exceptional zero-maximum output is unobserved; this adapter rejects atomically.
Its ASCII/dot-decimal output profile remains separate from UTF8/CSV UI import,
portable sessions and source-library parsing. The save follow-up documentation
now distinguishes recovered formatter/header details from runtime/locale gaps.

## Distance/summary recipes and one corrected numerical boundary

Workbook mean(v/D) and manual origin-constrained least squares remain distinct
methods with explicit magnitude assumptions and supplied velocities. Apparent
magnitude is not the detector's corrected surface-brightness parameter.
Nothing connects these helpers to acquisition or native regression in the UI.

Local review found a bounded inconsistency in underflow guards: intermediate
nonzero-to-zero ratios/products were rejected, but the last mean or slope
division could still return zero for a nonzero accumulated numerator. V2 adds
that final guard. Independent exact-Fraction witnesses have positive results
that round to zero in Number; tests also retain true zero and exact signed
cancellation. This is a NEW browser range policy, not a claim that the original
workbook, Excel or VIREO throws. Ordinary worksheet vectors are unchanged.

## Remaining limits

No complete field is created or attested. Region/band enumeration, wrap
concatenation, legacy BIN/FSC routes, original list context, QSO/variable merges,
galaxy-star cleanup and final arbitration remain separate. Complete native
galaxy/photographic transforms, raster/palette/clipping, image under the slit,
throughput, options/time/pointing and full lifecycle ordering are still needed.
The navigation sample cannot fill those gaps. Number/Math/decimal policies and
new guards do not establish x87 or native GDI equivalence. Previously denied
external/security reviews were not retried or represented as completed.
