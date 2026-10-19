# Bounded native catalog population stages

Source VIREO `CLEA_VEO.exe` SHA-256
`781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`.
Raw instruction-range hashes, VMT bytes, constants and sampled catalog hashes
are in `data/hubble/catalog-population-provenance.json`. These are static
contracts from this executable, not proof of every historical CLEA edition.

## Distinct native catalog paths

| Class / VMT | Nearest slots | Stellar reader / galaxy loader | Mode |
|---|---|---|---|
| GSCFieldObj / 0x594d4c | 0x599f1c / 0x59a010 | 0x59994c / 0x598acc | base constructor sets1 |
| NewGSCFieldObj / 0x594db4 | same nearest methods | 0x59ad98 / 0x598acc | retains1 |
| FSCFieldObj / 0x594e20 | wrappers 0x59b340 / 0x59b35c | 0x59b374 / 0x59b894 | constructor sets0 |

Native startup 0x5ad26c..0x5ad2af constructs FSC at global0x61fcfc and
NewGSC at0x61fd40. Data slots0x5b5e1c and0x5b56ac point to those globals.
The finder loader0x53bdcd uses the former; telescope0x53c010 uses the latter.
The class/mode distinction is therefore bound to concrete callers, not inferred
from a filename or a web display mode. GSCFieldObj's old per-region `.BIN`
reader and NewGSCFieldObj's selected-band `.DAT` reader both read27-byte
packed records and call the same admission predicate. They are not text/FITS
readers. The FSC reader/galaxy path remains a separate implementation; this
module does not apply the GSC predicate to that path without further evidence.

## GSC admission is separate from painting and selection

`0x599e08..0x599f18` copies the95-byte decoded record and36-byte region.
Record RA/Dec are Double at+0x19/+0x21; magnitude is Single at+0x29.
The region contains Double minRA/maxRA/minDec/maxDec at0/8/16/24 and Single
limiting magnitude at32. For finite supported values it admits exactly:

* minRA<maxRA: minRA≤RA≤maxRA; otherwise RA≥minRA OR RA≤maxRA.
* minDec≤Dec≤maxDec.
* storedSingleMagnitude≤storedSingleLimit.

Equal RA endpoints take the OR branch. This describes the PREDICATE only:
reader seeking and region enumeration still constrain the records that reach
it. It does not mean that requesting equal endpoints loads the whole sky.
The helper takes already stored coordinates and an explicit region; it does
not synthesize that region from a square navigation viewport.

The readers decode raw int32 RA/1e7 and Dec/1e5 into Double, and int16
magnitude/1000 into Single. They also retain bits1/2/4/8 as bytes+0x39..0x3c,
set type+0x3d to0 and preserve additional fields. The predicate does not read
those flags or the type. No additional quality-bit rejection was recovered
at its two call sites. Names are prefixed by band/region context; raw IDs
alone must not be treated as globally unique browser identifiers.

This differs from the web navigation sample's magnitude cutoff and tiling.
A source admitted by native criteria may be much fainter than the navigation
sample, yet remain a candidate in the first ordered collection. Native slit
arbitration calls the nearest-star slot with its type-filter flag false.
The existing strict350-pixel sentinel, first-in-order tie rule and galaxy
radius/throughput arbitration remain in `objectSelection.ts`. Do not sort,
deduplicate or omit faint sources merely because they are not navigation dots.

## The12/16 adjustment applies to galaxies

`0x597ac8` performs stellar reads first. A wrapping RA interval is split into
two read calls. It then copies the region at0x597d9e and modifies ONLY that
copy's Single magnitude at0x597dba..0x597e07: mode0 uses min(limit,12);
mode1 uses max(limit,16). VMT+0xc receives the copy at0x597e1b. Both GSC
classes bind this slot to galaxy loader0x598acc; FSC binds0x59b894.
The original stellar limiting magnitude is unchanged. Telescope loader
0x53befe requests20, whereas finder0x53bcc1 requests14; those caller values
must not be confused with the later galaxy adjustment or hard-coded as
universal settings for unknown callers.

Mode1 additionally loads QSOs and merges them into the first collection
before galaxies. QSO loader0x5987e4 calls position predicate0x59677c and
sets decoded type3; its inspected admission loop has no GSC magnitude
comparison. That position predicate also returns an ordered-scan stop flag;
it is not interchangeable with the simpler GSC helper above. QSO merge
0x597f90 can replace a nearby record with a95-byte QSO record when the
recovered angular separation×3600 is strictly below30, or insert it while
preserving native order. Implementing only the GSC magnitude predicate
therefore cannot reconstruct the final first collection.

## Catalog magnitude to a telescope profile level

This conversion is STATEFUL. Parameter setup0x53c500 initializes the bank at
0x53c5cf with EDX=+1 and CL=0, then projects records in its loop (call
0x53c965→0x53ca7c). Converter0x594908 uses Round for flag0, truncation
otherwise, subtracts the STORED bank offset and clamps below0. The caller
passes record Single magnitude and sign-extends AL into integer record+0x57
at0x53cae0..0x53cae3.

Later telescope compositor0x53b6fd..0x53b712 REBUILDS the same bank with
EDX=-2 and CL=0. That does not rewrite already cached record+0x57 values;
the compositor reads them directly. These arguments configure the later
magnitude converter, not the Gaussian widths or base-table construction.
For a supported9.5 magnitude, conversion at offset+1 gives9, whereas a
new conversion at offset-2 gives12. Painting the first cached record must
keep9 (before the separate magnitude shift), not silently recompute12.
This is a static ordering observation, not a claim of measured native
brightness changes during every pointing/event path.

The compositor's stellar pass admits types0/2/3 only. It subtracts supplied
integer observatory+0x6f8 from record+0x57 and clamps the result0..14 before
selecting bank+0x701+level×0x9925. It does NOT discard a star because that
level exceeds14. Pixel threshold30 and red-channel comparison are later
painter operations; selection does not reuse them as a brightness cutoff.

`nativeStoredStellarLevel` requires explicit offset and conversion mode.
`nativeStellarPaintLevel` consumes the cached level plus the supplied integer
magnitude shift. Splitting the stages preserves their differing lifetimes.
The explicit nearest-even Number policy is not a measurement of native x87
control state. Arithmetic overflow and a wrapping signed-byte store are
rejected as new guards. No telescope/options default or complete lifecycle
is inferred. The final level can feed the separately recovered profile
preparer; its kernel is not duplicated. Existing profile-recovery arguments
previously described as opaque are now identified for this converter, while
the base-table/profile construction itself remains unaffected by them.

## What remains before an actual native population can be used

This module deliberately supplies no completeness brand and does not call
`createNativeSelectionScene` on the navigation catalog. Remaining work is
concrete: enumerate original regions and selected bands; reproduce reader
seek/iteration order and duplicate-coordinate boundary behavior; trace all
QSO/variable-star replacements and optional catalog enrichments; reproduce
galaxy-star cleanup0x5980cc (including its type3 and strict magnitude-difference
branch); bind options, time and pointing; and complete native galaxy/photo
rendering, clipping/palettes and instrument throughput on the actual image.

Synthetic Fraction/Decimal vectors cover480 predicate cases,48 conversion cases and126 paint
cases;16 decoded original27-byte records bind to full-file and per-record
hashes. A complete synthetic two-record scenario verifies that removing a
faint admitted source can change native nearest selection. No finite vector
suite proves original x87 rounding, full field completeness or an acquired
spectrum. No original execution, Windows or external review was performed.

See [the composition review](CONTRACT-COMPOSITION-REVIEW.md) for explicit tests
linking cached levels to prepared profiles and for the equal-RA/scan-stop
interaction. The standalone predicate is not an interval-reader replacement.
