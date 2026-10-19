# One complete original Hubble field

18 October 2026 update: A separate128-star pinned field centered on N0000.DAT@14428 now supports [one object acquisition](STAR-EXPOSURE.md). It is reconstructed from its own area and complete read traces, not by reusing this132-star sky field or accepting arbitrary pointing overrides.

This closes field-population construction for **one explicit original input
configuration**. The field builder itself does not enable acquisition, certify arbitrary pointings or
replace the current magnitude-limited navigation scene.

## Supported domain

- Original CLEA_VEO.exe SHA-256:
  `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`.
- Direct Hubble exercise in a fresh process, no prior general/solar-system mode
  or moving-target link; exercise mode4, telescope catalog mode1/NewGSCFieldObj.
- Compiled fallback options, with no VEO_OPTS.INI override or later option edits,
  explicit original telescope record0 (0.4m), active field15arcmin and catalog
  field multiplier3. These are an original supported branch, not an observed
  historical user's configuration or a claim that external files never override it.
- Manual pointing RA=0.5h, Dec=0°. No other pointing, telescope/options change,
  loaded prior session or unknown dynamic context is accepted by this adapter.

`buildPinnedNativePopulation(PINNED_FIELD_DOMAIN)` is a pure production core
API. It returns an owned immutable population and source evidence. It rejects
any differing/unknown domain instead of falling back to this field. The domain
is an explicit input precondition, **not a runtime history detector**; the
current browser does not claim its navigation state satisfies this history.
No automatic generic `NativeSelectionScene` completeness attestation is added.

## Configuration and area chain

The fallback option stores at0x5a29f6 and0x5a2a74 give Single15 and integer3.
Telescope load0x53be70..0x53c010 copies current pointing to Double area center,
sets limiting magnitudeSingle20 and computes halfDec=multiplier*field/120.
The RA half-width divides by15*cos(centerDec). At Dec0, the angle multiplication
is zero and cosine is1, avoiding an unvalidated nonzero-angle transcendental.
The exact rational area, stored as Double bounds, is:

| Bound | Value |
| --- | --- |
| Minimum / maximum RA | 19/40 =0.475h /21/40 =0.525h |
| Minimum / maximum Dec | −3/8 /+3/8 degrees |
| Native limiting magnitude | 20, including faint entries and quality flags |

Nearest-even(minimumRA*10^7) gives key4750000. Independent Fraction arithmetic
checks the key from the stored Double endpoint and stays far from a half tie.
Separate integer-search controls at keys4749999,4750000,4750001 retain the same
admitted order in both whole bands; this does not certify every x87 policy.
This is a high-level formula check, not x87 emulation. Coordinate divisions and
photometry use the existing Number/Single adapter policy; source-level bitwise
x87 equivalence is not asserted. Exact rational whole-band admission agrees
with the scan for this area; there are no ambiguous near-threshold admissions.

## Regions and original band order

The original `Cgsc/TABLES/REGIONS.BIN` has9538 records of36bytes. Row0 is a dummy;
loader0x597644 and query0x5977e0 preserve indexing and visit IDs1..9537.
The nonwrapped-field overlap at0x5978c0 uses **strict** RA/Dec intersection:
merely touching an edge does not select a region. Equal/reversed field RA needs
its separate native wrap branch and is rejected by this bounded helper.

The complete table selects regions **3,10,4665,4672**. The original upper-limit
map at0x5b4bac and name table at0x5b4c10 mark bands, then the reader iterates
bands1..24. This yields **N0000 followed by S0000**, each loaded once. This is
not sorting sources globally by RA. The global native field is initialized as
NewGSCFieldObj by0x5ad29e..0x5ad2a3; its superclass initializes catalog mode1.
Full region data and both static tables are retained in `native-regions.json`.

## Original catalog coverage and no-op stages

The generator verifies whole original hashes and reads:

| File / stage | Whole source records checked | Result for this area |
| --- | --- | --- |
| N0000.DAT | 1,165,987 | Native scan visits1524; admits61 |
| S0000.DAT | 1,016,897 | Native scan visits1069; admits71 |
| CLEA_VStrs.dat | 31,147 | No position in area, before magnitude/time filtering |
| CLEA_QSO.DAT | 2,269 | No position in area, before magnitude filtering |
| CLEA_GLX.DAT | 24,069 | No position in area, before magnitude filtering |
| GLIMAGES.LST | 183 | No photographic-image center in area |

The native binary search starts at its last midpoint, not lower_bound; admission
precedes the upper-RA/EOF test. The bundled replay retains every search/scan
record needed for the two reads, raw bytes, probes, slices and whole-file hashes.
A separate **whole-band** admission pass independently gives the same surviving
indices. This is a complete native-area subset of the original files, not the
navigation magnitude subset. Raw quality bytes are preserved, not filtered.

The photographic list is selected at0x596ab8; association with an image and
insertion happen only after galaxy admission at0x598e3b..0x598e52, with insertion
at0x599128. There is no separate post-loop insertion of photographic objects.
The complete183-entry image-list check also finds no center in this area.

The native assembler0x597ac8 executes stellar read→variable selection/merge→QSO
selection/merge→galaxy load→optional dynamic update→galaxy cleanup. In this
particular area, the whole-file searches prove those non-GSC lists
empty. The fresh lifecycle makes the dynamic branch absent, as explained below.
Consequently none of the merge stages changes the GSC list; they were not
silently omitted. The result is **132 type0 stars, zero galaxies**, with61 north
entries followed by71 south entries. It deliberately preserves the RA decrease
at the band transition. **119 stars have magnitude>12** and would be missing from
navigation data; source record identities and all27 original bytes survive.

The shipped **Hubble.HTL is loaded normally**. The historical dossier name
`hubble-options-select` is misleading: source slot+0x16d0 selects Hubble.HTL,
and0x5903d8 reads13 hot-list records of86bytes into a separate UI list. This is
not an exercise options override, nor does loading that list insert its targets
into the current native field or change this manual pointing. Its whole-file
hash and both routines are now bound in the provenance. VEO_OPTS.INI is absent
from the extracted package; external/user overrides remain outside this domain.

## Why an absent dynamic context is legitimate here

The imported pointer slot0x5b5838 targets global0x5bc958. Unit initialization
0x5ad09c clears it. The observed context constructor/write at0x58b3be..0x58b3c9
is guarded by exercise mode0/1; Hubble entry0x58a8e6 sets4. The automatic date
call0x58a0fa is itself guarded by mode1. FormCreate reads options/initializes the
clock but does not invoke that constructor on the inspected fresh path.

Thus the direct fresh-Hubble branch can reach field load with context absent;
0x597e26 skips dynamic update. This is a bounded normal-path static conclusion,
not a guarantee about arbitrary writes, plugins, prior sessions or every indirect
call. Switching from general/solar-system modes may retain an existing context
and is **unsupported**, even if the new field contains no catalog variables.
Those cases require the dynamic record/time model; this adapter never assumes
an existing context empty.

## A narrower acquisition route suggested by the field

None of the132 surviving sources passes both native stellar angular cuts about
RA0.5h/Dec0. Exact rational comparisons against the source Extended constants
retain a minimum normalized rejection factor≈5.66875. Every possible selected
record is type0 or selection is absent, provided selection uses this complete
current field. Static0x50f338 branches therefore imply zero throughput regardless
of the unknown pixel level. The test exhausts levels0..765 for all132 sources as
a finite diagnostic; **no detector pixel is supplied in production**.

The subsequent [bounded sky exposure](SKY-EXPOSURE.md) now traces the native
frame and connects activation, calibrated sky, seed/time and saving to a
separate interface. This field builder still generates no photon counts,
amplitudes or acquired object spectra itself.
For object-bearing pointings, the actual native image/slit remains a gate.

## Automated evidence and support limits

Vitest checks source snapshot hashes,132 exact surviving identities, both full
read traces and slice hashes, strict region edges, band upper-limit equalities,
unsupported wrap/polar/lifecycle/configuration inputs, repeated immutable results,
full compact decoding and angular rejection. The static generator checks nine
whole-source hashes, raw code ranges, all9538 regions, both full bands and all
57668 non-GSC/photo-list positions. Source/range hashes and limits are retained in
`data/hubble/pinned-hubble-field-provenance.json`; research:
`analysis/native-field-recovery/generate.py` and `independent-verification.json`.

No universal population loader, variable curve, QSO merge, optional ephemeris,
prior-session restoration or source/pixel fidelity is inferred. Other pointings,
wrap/poles and changed options fail rather than silently reuse this field. No
original execution/emulation, denied-review retry, Windows, installation,
publication/push or unrelated project changes occurred.
