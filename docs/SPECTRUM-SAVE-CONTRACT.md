# Bounded VIREO spectrum files

Reference CLEA_VEO.exe SHA256
781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c.
Source/range hashes and static constants are retained in
data/hubble/spectrum-save-provenance.json and the separate night research.

Correction to the earlier save dossier: bin+0xa is a signed int32 accumulator
of source PLUS sky. Reset0x50e287 clears it; timer0x50f7fc and0x50f848 add
both draws. Pause redraws it, and save0x50fe67/0x50feec reads the same bin.
Signedness does not establish source-minus-sky subtraction. No subtraction
or substitute source profile belongs in the saved-spectrum adapter. The
[buffer/mode amendment](ACQUISITION-BUFFER-AMENDMENT.md) preserves the old
dossier with its hash and supplies the fuller adversarial comparison.
Indices are1..600: the first actual mean/count start atP+0x440/P+0x44a;
the mean, count, display coordinate and Poisson cache are distinct fields.

Save0x50fb1c visits600 bins. Its maximum starts atzero; intensity=count/max.
Negative bins survive if there is a positive maximum. When all bins≤0,
there is no local guard before division. The original FPU/error/output
behavior is unresolved. The new codec rejects before returning bytes.
Absolute count scale, exposure time and RNG are lost; normalized[1,2]
and[2,4] produce the same spectral body.

The wavelength begins at configSingle minimum and is repeatedly updated
with the storedExtended step after writing each row. The writer calls
0x486268 with2 decimal places for wavelength,6 for intensity. That wrapper
selects fixed format2/precision18 via0x40cf28→0x40c5dc→0x40cb88. The18-digit
x87/BCD stage and FPU mode precede a decimal next-digit≥5 carry. There is
no proof of bitexact equivalence from Number or an exact rational model.
The adjacent trailing-zero trimmer0x486294 is not used by this save path.

Header0x510090 begins with eight bytes`*SpHdr* `, including the space.
Prefix+object is limited to32 TOTAL bytes, leaving24 bytes for the object;
it appends comma-separated native pointing fields fixed6/fixed5 and the
selected object's Single apparent magnitude fixed3. Those are current
global observatory/object fields, not metadata inferred from the bins.
Epoch/equinox, seed, elapsed exposure and integrity hashes are not encoded.

The reader0x55ee14 accepts the marker and optional magnitude. Its missing-
magnitude branch stores99.0; the new parser preserves absence rather than
asserting that default as a measurement. Native coordinates are readExtended
and magnitudeSingle. The reader constructs a uniform grid from first/last
wavelength and ignores interior wavelength tokens. The proposed parser
instead retains printed wavelengths and documents the distinction.

Compiled saved-spectrum suffix is.SSP (literal0x5a2f34→record+0x24cd),
configurable through options. The210 inspected library.SP files are all
headerless, with3351/1726/2799 rows;48 have flux>1. None validates the
acquired600-row writer. File extension alone cannot authenticate a format.

Native decimal separator is locale-dependent (global0x5b880f), while
header separators remain literal commas. Default text flag1 givesCRLF;
the native newline routine also supportsLF. Ansi codepages, decimal-comma
headers, exceptional floats and extreme general-format fallback remain
outside the new codec's ASCII/dot-decimal/CRLF output profile.

The original isolated helper accepted
supplied signed int32 counts and metadata only, with explicit Number grid
and exact-ratio half-away decimal adaptation. It rejects zero maximum and
unrepresentable/duplicate printed wavelengths atomically. Headerless sources
retain finite signed flux, raw whitespace and source bytes. No source file
is normalized, treated as an observation or promoted to a native oracle.

Five complete synthetic Fraction vectors plus original hash/roundtrip
fixtures support this bounded contract. No original CLEA execution or
native savedSSP reference was available, and external review stays separate.


## Acquired SSP interchange — 18 October 2026

The analyser now integrates the same codec through `core/exposureSpectrum.ts`
and `io/acquisitionObservation.ts`. **Download acquired SSP** is available for
replay-verified star and all three supported galaxy snapshots. The header uses
the bound telescope object/pointing/catalog magnitude; editing the measurement
label does not rewrite them. The body remains exactly the existing 600-row
analysis derivative. Prior curve hashes, linked measurements and session schema
versions remain unchanged. Source PLUS sky bins are passed without subtraction.

`io/spectrumFiles.ts` detects the marker rather than the extension. Its SSP
observation profile supports ASCII, LF/CRLF, optional magnitude, exactly 600
strictly increasing positive printed wavelengths, and finite signed intensities
from −2147483648 through 1 (the positive-maximum signed int32 writer domain).
Signed levels are retained and the observed SVG scale extends below zero;
reference/observation display scales remain independent. Unsupported codepages,
BOM-bearing SSP, decimal-comma headers, exceptional numeric output, duplicated
wavelengths and out-of-profile levels are rejected. The existing headerless
SP/CSV importer retains its 0–1 observation domain; library flux>1 is unchanged.

The full byte SHA-256, exact source text and parsed metadata survive download
and session restore. Metadata are file claims; no epoch, measured magnitude,
raw counts, RNG, elapsed time, acquired origin or student redshift is inferred.
Missing magnitude remains absent, never the native 99 sentinel. New imports
start at zero with unconfigured manual controls; the object label is the file's
editable claim. Imported SSP measurements remain ordinary imported-spectrum
records. Hubble magnitude/source/identification inputs stay explicit.

Analysis sessions reparse and rehash the retained source text, so no new
serialized metadata or trusted cached sample fields are needed. SSP and replay
JSON serve different purposes: SSP loses the count scale and acquisition state;
JSON preserves replay and links. Keep JSON for resuming an acquisition. An SSP
reimport cannot recreate that state, even with an archive present. Failed imports
and picker cancellation keep the current analysis. No new scientific model,
original-source bytes, dependencies, network service or public redistribution
was added. Existing rights restrictions in THIRD_PARTY_NOTICES.txt still apply.

Evidence is the unchanged hashed manifest and range bindings above, plus research
`/home/dobleuber/Documents/Codex/2026-10-18/task/spectrum-save-recovery-night/CONTRACT.md`
and `verification-with-underflow.json` (210 SP files, 536838 rows). Those are
original library reader checks, not an original writer oracle. No native SSP
fixture, x87/RTL/GDI equivalence or original execution is claimed. The previously
restricted external review was not attempted.

### Try the feature

1. Open http://127.0.0.1:5173/#galaxy-exposure, choose 54876, activate the field,
   start an exposure, then **Analyze acquired galaxy** after positive counts.
2. In **Keep your work** (PORTABLE ANALYSIS), use **Save session**, **Download analysis
   spectrum** and **Download acquired SSP**. The SSP begins
   `*SpHdr* 54876,15.373500,27.72222,16.000`, followed by 600 rows from 4000.00
   through 4998.33 Å, each with six-decimal normalized intensity. There is no z.
3. **Change file ↑** and select the SSP. **Imported SSP metadata** labels its
   claims. z is zero and the slider remains disabled until you set a step. Align
   manually and record; cancel first if checking the confirmation flow.
4. Save/reload/restore this imported-file session. **Download imported spectrum**
   must return the exact SSP bytes. Hubble input fields remain unfilled unless
   you explicitly entered them.
5. Restore the JSON saved before reimporting: the raw archive, linked acquisition
   and **Download acquired SSP** return. **Restore this acquisition in the
   telescope** restores the raw state deactivated. A malformed SSP leaves the
   previous curve/control/log intact. The same export works for 36747, 36773 and
   the supported star at #star-exposure. Sky-only sessions intentionally lack SSP.
