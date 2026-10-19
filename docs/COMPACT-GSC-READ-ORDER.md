# One compact GSC band: search, scan and conditional tie order

This contract is limited to one already selected NewGSCFieldObj `.DAT` band,
before QSO/variable/galaxy reconciliation. It is NOT a complete field loader,
a claim of population completeness or the FSCFieldObj finder reader. The
legacy GSCFieldObj per-region `.BIN` path is also outside this implementation.

VIREO SHA-256:
`781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`.
Instruction ranges, file/record hashes and generator bindings are retained in
`data/hubble/compact-gsc-read-order-provenance.json`. Tests compose with the
previously recovered `catalogPopulation.ts` admission predicate; that earlier
population-contract patch must be present to run this test file. The new
trace module itself has no dependency on that helper or on original files.

## The native search is not lower_bound

Reader0x59ad98 computes an integer key with Double minRA×Single10000000
then conversion0x403700 (0x59af80..0x59af8e). The new helper requires this
already-rounded key explicitly. It does not infer the native active x87 CW
or substitute Math.round at half cases.

0x59af91 initializes low=0. FileSize0x403e10 returns byte length divided by
record size27; that RECORD COUNT becomes high in0x59afa6. High is not N−1.
For the supported non-overflow integer domain, midpoint=floor((low+high)/2).
The reader seeks/reads that index, compares raw signed int32 RA with the key,
updates high=mid−1 or low=mid+1, and stops on equality or low>high. It then
seeks the LAST midpoint again (0x59b01d..0x59b02b). There is no rewind to
the first equal record and no final replacement of mid with low.

`traceCompactGscBandRead` preserves those choices. Its source record count
must refer to the untruncated band: running the same algorithm on a cropped
array changes its midpoints. Sorted/stable source access is a prerequisite;
the trace API does not attest it or claim that all other source bands exist.

## Scan visits and admitted objects are different stages

From0x59b030 the scan rereads that midpoint and walks physical records.
Each row is decoded, tested by0x599e08 and possibly inserted BEFORE the
termination check at0x59b1cf. Only then does it stop for stored DoubleRA>maxRA
or typed-file EOF (0x403d6c compares position against FileSize). Therefore:

* An inexact search may begin below minRA. The admission predicate rejects
  that row; a lower_bound implementation would hide the different visit.
* Equality at maxRA is allowed and the scan continues. The first row strictly
  beyond maxRA is still visited/tested. For the non-wrapping fixtures here it
  is rejected by admission; visits must not be named an admitted population.
* Reaching the last row stops at EOF after processing it. But a search whose
  midpoint becomes N attempts a read outside the records. The RTL single-record
  reader0x403ef8 detects a short read and sets error100;0x4030f8 checks errors.
  The final native exception/UI outcome was not executed or observed. The
  adapter throws an explicit read-boundary error instead of returning an
  apparently valid empty population. Empty sources follow that same guard.

The v2 [composition review](CONTRACT-COMPOSITION-REVIEW.md) adds a degenerate
minRA==maxRA diagnostic with broad Dec bounds. Admission takes its OR branch
and can admit the first visited row beyond maxRA before the reader stops.
Do not append an extra clipping step to make these two stages look like a
conventional interval loader. This case still creates no completeness claim.

Budgets are explicit new protections. Exhausting one throws rather than
returning a truncated trace. Output names are `probes`, `visits` and
`single-compact-band-read-trace`; no complete-field brand is created.

## Original-record witness in N0000.DAT

The original file SHA-256 is
`a1394a80eea5aca3ef765e841883ef75de94e96aea972d7ed3e68787d23bb36a`.
It has31,481,649 bytes /27 =1,165,987 records. A full static pass verifies
nondecreasing packed RA for this file; no corresponding assertion is inferred
for other files. Indices below are zero-based physical file rows.

| Row | Packed RA | Packed Dec | Packed magnitude | Raw short identifier |
|---|---:|---:|---:|---|
|43828|17106260|327085|15360|00419|
|43829|17106260|327085|15360|00062|
|43830|17108200|327091|15340|00145|

The first two rows have different record hashes and identifiers but identical
position and magnitude fields. Use file+row provenance to distinguish them;
this table does not invent globally unique native object-name semantics.

With rounded lower key17106250, upper RA17106261/1e7 and the narrow Dec
interval3.27084..3.27086, the original-style search ends at43828. It visits
43828,43829,43830 and admits the first two under the recovered predicate.
With lower key17106260, the first exact midpoint is43829. It visits43829
and43830, admitting only43829. A comparison-only lower_bound would start
at43828 and retain both; that is NOT the recovered native search behavior.

The independent reference uses actual records at every probed/visited index,
the WHOLE band's count and exact-Fraction admission comparisons on the declared
binary64/Single adapter values. Narrow fixture bounds have comfortable rounding
margins, but decoded coordinates are still an adapter, not measured x87 bits.
Sparse fixture records must never be mistaken for a complete downloadable band.

## Why order can affect the object under the slit

Insertion0x492574 links a new record AFTER the current node and advances
the cursor to it; with no current node it uses the head-insertion helper
0x492528. Repeated insertions into a fresh first collection therefore preserve
scan order. Forward iteration0x492628/0x492634 follows that linked order.
It is not a magnitude sort, a reversal or a duplicate-coordinate collapse.

Nearest0x599f1c starts at350 pixels and replaces the winner only on a strictly
smaller distance (0x599fa4 JBE skips equal distances). The native slit caller
uses the optional type filter false. If the two original coincident rows
survive subsequent stages and tie as the nearest candidates,43828 wins when
both are retained in that order;43829 wins when the search starts at43829.
The test uses an explicit synthetic312px query frame to demonstrate that
conditional nearest result without attesting complete native-scene coverage.

This does not establish the final winner of a full telescope session. Region
selection, multiple-band and RA-wrap concatenation, preexisting list cursors,
QSO/variable replacements, galaxy-star cleanup, object arbitration and real
instrument throughput can change the candidate set. Those later stages must
be traced before connecting original catalogs to acquisition. The magnitude-
limited navigation sample cannot substitute for the omitted stages.
