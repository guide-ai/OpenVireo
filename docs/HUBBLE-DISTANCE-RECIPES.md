# Explicit Hubble distance and summary recipes

Source VIREO executable SHA256
781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c;
distributed Hubble Data.xls SHA256
09ac2e0bd4499e4a4796cf64981b3958d264f92b710b1ac9e3324340054fc7ed.
Detailed source/range hashes are in data/hubble/hubble-distance-provenance.json.

The original workbook Sheet1!F2:G14 computes
log10(distance_pc)=(apparentV−assumedAbsoluteV+5)/5, then
distance_Mpc=POWER(10,log10(distance_pc))/1000000. Its E rows compute
velocity=c*z with I2=299792.458km/s, and H16=AVERAGE(H2:H14) where
each H row is velocity/distance. The embedded chart uses K2:K14 for
distance and L2:L14 for velocity and has no stored trendline record.
All79 cell formulas were statically decoded, including shared formulas,
and independently checked against their saved caches with Decimal90.
Original workbook recalculation/Excel behavior is not claimed.

Absolute magnitude must be explicit. The saved workbook J2 is−21.0;
the VIREO manual recommends−21.4 for the13 designated hot-list targets;
the earlier standalone manual assumes−22.0 and documents a distinct
generated-apparent-magnitude model. These are different source/version
choices, not interchangeable defaults. Use apparentV, never the
detector-calibration surface-brightness parameter. Unknown magnitudes,
unqualified targets and missing assumptions cannot be filled from v/H0.

The 24November2008 student manual pp11–12 separately prescribes a plot
with distanceMpc onX and velocityKmS onY, a Linear trendline and intercept
fixed atzero. The unweighted mathematical slope sum(D*v)/sum(D²) is a
new Number implementation of that documented recipe. No native VIREO
regression routine, original Excel internal arithmetic or x87 equivalence
was recovered. A free intercept, weights, uncertainty or R² are not added.

`meanIndividualHubble` implements the worksheet mean(v/D).
`fitHubbleThroughOrigin` implements the manual-based origin-constrained
least-squares recipe; its method tag distinguishes the result. For
synthetic(1,100),(10,500), the outputs are75 and5100/101, respectively.
For the saved workbook's13 points with M=−21, the mean is≈86.61395485,
whereas the derived origin fit is≈63.11682928. Never force either to71.

The native main spreadsheet handler0x58d6dc delegates to an external
program/system association. Its execution is not part of this helper.
Native auto-velocity optionenvironment+0x2e88 (generalrecord+0x27d4) has
compiled defaultfalse, with options-file override. It is not an absolute
magnitude or regression setting. Native saved z/velocity areSingle;
the workbook's own z/c arithmetic isDouble. These helpers take explicit
velocities and never silently replace the caller's numerical boundary.

The module is pure Number arithmetic with explicit finite/domain/range
guards and no input mutation, row filtering or UI/session changes.
Source examples are not new observations. Independent Decimal/Fraction
fixtures cover distances, units, method differences, signed/zero inputs
and unsupported numeric cases. This module does not complete acquisition
or certify the original experiment. External review remains separate.

The v2 consolidation adds final-division underflow guards for the mean and
origin slope: a nonzero accumulated numerator that rounds to zero in the
last Number division raises `range`. True zero and exact signed cancellation
remain valid. This is a new adapter protection, not recovered Excel/VIREO
exception behavior; ordinary recovered worksheet vectors are unchanged.

The subsequent English UI connects these helpers using separately bound recipes;
see HUBBLE-ANALYSIS-UI.md for input provenance, session v2 and interface limits.
