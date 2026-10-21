# Bounded decimal NOMAD candidates and selection

`src/core/nativeNomadRows.ts` reads one fixed-column NOMAD header/units pair and one candidate data line. It makes no service request, authenticates no catalog, and does not enable camera acquisition. The [request coordinator](CAMERA-REQUEST-GATE.md) still needs actual request/cache/source authority and complete validation; this candidate reader does not supply its usable-result verdict automatically.

[NATIVE-NOMAD-DECIMAL-ROWS-01](CAMERA-NOMAD-ROWS-PROVENANCE.json) pins six complete procedures, three12-field tables, five typed Single literals, six strings and two typed switch tables to executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Source listings, branch-target captures and independent controls stay in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-camera-catalog-rows/`. This is static source recovery, not REA/native execution or a captured NOMAD service response. Original resources remain unchanged.

## Header and lexical ownership

The original header routine`0x59c9d8..0x59cbad` requires RA and searches mode-specific field labels. NOMAD's12slots are id,RA,DEC,MuRA,MuDEC,B,V,R,an absent I slot,J,H,K. The table has8-byte slots allowing seven-character strings, but the caller copies each into ShortString[6]. Therefore ` MuDEC|` is searched as ` MuDEC`; the implementation retains that limit. Offsets are computed by scanning left over ASCII spaces from each match and storing one-based start/count words. This is fixed-column slicing, not CSV splitting or trimming into a new table.

The bounded layout admits the explicit `hh.hhh`/`dd.ddd` descriptor, preserving the header/units strings. Sexagesimal coordinates, USNO-B1/A2 modes and an entire response stream are separate unimplemented paths. Every required NOMAD label must exist; the unused I slot stays absent. Duplicate matches are rejected as an explicit web admission guard rather than guessing which column was intended.

The reader retains the admitted original ASCII line and exact sliced cells. Identifier handling removes leading ASCII spaces and copies **at most18bytes**, without padding, inventing an identifier or stripping its trailing bytes. The unused I slot is exposed as null, not a manufactured I magnitude. No file reader/writer, encoding repair or new persistence schema is added.

## Numerical order and band selection

All present numeric fields, including unselected magnitudes, must parse. The canonical ASCII-dot grammar and Number conversion are declared web policies; they are not a port of every native host locale or Extended parser boundary. Motion follows these captured operations:

```
storedMuRA  = Single(rawMuRA / 1000)
storedMuDEC = Single(rawMuDEC / 1000)
RAepoch  = sourceRAhours    + epochOffsetYears * storedMuRA  / 54000
DECepoch = sourceDECdegrees + epochOffsetYears * storedMuDEC / 3600
```

The caller supplies the epoch offset explicitly. No browser date, missing historical timestamp or assumed live field is substituted. The format descriptor establishes decimal hours/degrees; the raw motion scalars and code divisors do not independently witness the service's physical proper-motion convention. No inferred cosine correction, RA wrapping or pole clamp is added. Corrected coordinates may subsequently lie outside a field and still need the original selection/projection route.

NOMAD selectors0..5 map to B,V,R,J,H,K, with native band codes1,2,3,5,6,7. The selected magnitude is stored Single **before** the `!=0` and `<30` checks. A value below30 in decimal text can round to30 and reject. Negative values pass that source predicate; no nonnegative lower bound or alternate-band fallback is introduced. This predicate describes numerical admission, not astrophysical correctness or actual filter/calibration authority.

The captured selection procedure`0x59cf58..0x59d030` compares corrected coordinates with explicit bounds and a Single magnitude limit. All endpoints and the magnitude threshold are inclusive. When minimum RA is less than maximum RA it uses the closed interval; otherwise it uses the union of the two outside intervals. **Equal RA endpoints follow that wrapping branch**, so they cover all finite RAs before the DEC/magnitude tests. No point-width repair or coordinate normalization is introduced. Inverted DEC bounds naturally select nothing. The helper validates finite inputs and a representable Single limit; it does not derive actual observing bounds, survey completeness or request/cache ownership.

## Bounded admission and controls

Inputs are printable ASCII single lines of1..4096characters, explicit supported band and finite epoch offset within±1000years. Raw RA0..24hours and DEC±90degrees, nonblank ID, complete required slices and finite parsed/Single values are required. These are web bounds; native malformed-row, overflow, locale and FPU exception parity is not asserted. Layouts/columns/candidates/cells are immutable; a JSON-restored layout lacks its private ownership brand and must be rebuilt from its actual header.

Thirty-eight unit contracts cover fixed/reordered positions, six-byte label copying, ID length, all six selectors, Single conversion points, zero/30 boundaries, retained negative magnitudes, normal/wrapping/equal-endpoint selection, inclusive DEC/magnitude limits, missing/ambiguous fields, unsupported formats, invalid unselected cells, malformed context and atomic failure. The initial run passed14/15; the failed test incorrectly expected the native ID to be padded to18bytes. The source/helper confirmed a maximum-length copy, the expectation was corrected, and both initial logs were retained. Typecheck also caught an unused test import before correction.

Independent exact-rational arithmetic and an integer IEEE32 nearest/even encoder control15synthetic examples:12candidates,3magnitude rejections and36stored Single comparisons, with no bit mismatches. Maximum observed coordinate difference under the declared Number expression policy is `3.552713678800501e−15` hours in RA and0degrees in DEC. These are measured examples, not universal/native error bounds. They are explicitly synthetic data, not acquired observations or a historical response/output oracle. Browser verification also checks unchanged investigation exports and invalid-input rejection. A first browser launch could not reach the stopped work server5176; listener/process checks confirmed its absence, it was restored on loopback, and the original failure log was retained. The persistent5173service was not restarted.

A separate exact interval-union control checks1750selection combinations, including wrapping/equal RA, inverted DEC and negative magnitudes. It agrees with Node and Chromium under the declared finite Number/Single predicate policy; this does not certify original Extended comparisons at rounding boundaries or supply actual camera field bounds.

Run `node node_modules/vitest/vitest.mjs run src/core/nativeNomadRows.test.ts`. Independent reproduction uses `control.py`, `capture.py`, `capture-extra.py`, `check.mjs` and `browser-check.mjs` in the evidence directory; the browser uses `OPENVIREO_NOMAD_URL` with an existing Vite preview. No native executable or network service is invoked by these checks.

The normal preview remains http://127.0.0.1:5173/#observatory with the existing CCD/IR preparation reference. No new exposure or catalog-import control is added. Full response END/header/body handling, sexagesimal/locale paths, request/options/cache/field-time authority, actual selection-bounds/projection ownership, preceding random sequence and remaining image/output contracts are still required. No manual answers, session/Undo formats, source resources or58-package acceptance counts change.

A subsequent [bounded response framing stage](CAMERA-NOMAD-RESPONSE.md) now composes the decimal reader with supplied LF/ASCII preamble/header/units/body handling. It still does not certify actual request/cache/observing authority or the other encodings/coordinate paths.
