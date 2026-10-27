# E08 Object X — orbit files, ephemeris and measuring tool (Front X, X0–X3)

Status: first mergeable set (X0a, X0b, X1, X2, X3), revised after independent review 1 (findings H1, M1–M3, L1–L3, L6;
raw report kept by the coordinator at analysis/reviews/front-x-review-1.md). The `#object-x` route, camera insertion of asteroids (X4) and the v28
investigation, guide and closure (X5) wait for the camera (Front C, C3). E08 is **not** closed.

Implementation: Claude Code (claude-opus-5-5), medium effort, branch `claude/serene-dubinsky-8d1244`. Independent high-effort
review by the coordinator is pending. Static analysis only: objdump on exact address ranges of CLEA_VEO.exe
(SHA-256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c, from CLEA_Vireo.zip 58dc02a6…6778b); REA had no
decompiler provider configured. Nothing was executed or emulated. Research notes (outside the repo):
`/home/dobleuber/Documents/Codex/2026-10-18/task-3/front-x-objectx-20261027/notes-x0a.md` and `notes-x0b.md`.

## Resources (X1)

| File | Bytes | SHA-256 | Use |
|---|---|---|---|
| public/original/hotlists/ObjectX.HTL | 1462 | fd9e68e4…858243b3 | 17 targets; only the coordinates are shown before the reveal (the identifier and the remarks both give the answer) |
| public/original/orbit/ObjX_MPC.CMO | 30989466 | b41e03f1…6802e | original default `ORBIT\OBJX_MPC.CMO` (exe 0x5a2dc4), 191293 records, epoch JD 2455400.5 |
| public/original/orbit/ObjX_AST.CMO | 4750326 | 341134bf…a12 | 29323 records, epoch JD 2454900.5 |
| public/original/orbit/ObjX_MPC.CMO.sav | 4798116 | efd665a7…124030 | 29618 records, epoch JD 2455000.5, zip date 2009-08-12; **web default** |

Byte-exact from CLEA_Vireo.zip under the approvals of 2026-10-26 (ObjectX.HTL), 2026-10-27 (ObjX_MPC.CMO, ObjX_AST.CMO) and the
later .sav approval recorded in AGENTS.md (e296ae4); manifest 1312 → 1316 (`docs/LOCAL-RESOURCES.json`, `docs/RESOURCE-PROVENANCE.json` group `public/original/orbit`, `THIRD_PARTY_NOTICES.txt`).
`src/io/bundledOrbitFile.ts` fetches an orbit file lazily from this origin, bounded to and checked for the exact size and
SHA-256 before parsing. **Web default: ObjX_MPC.CMO.sav** (coordinator decision): it reproduces the three moving rows of
ObjectX.HTL at the original default time (table below), while the original options default ObjX_MPC.CMO misses 1994 CC by 0.86°.
ObjX_MPC.CMO and ObjX_AST.CMO stay bundled and selectable (`SELECTABLE_ORBIT_FILES`). One-line adaptation label: "Orbit file:
ObjX_MPC.CMO.sav (web default; it reproduces ObjectX.HTL at 2009-06-01 04:00 UT — the original's default is ObjX_MPC.CMO)".

Identity hiding: the HTL identifier ("(433) Eros", "NGC 2403", "3C 273.0", "0329+54", "N6000-00685", …) and the remarks both
reveal the answer, so neither is shown before the reveal; the student sees an opaque label and the coordinates. Hiding is
presentation-level only: the file is publicly fetchable from this origin. ObjectX.HTL is deliberately **not** added to the
observatory's exercise-list buttons. X4 adds a browser test that no HTL identifier or remark is in the DOM before the reveal.
Hosting note: ObjX_MPC.CMO exceeds a 25 MiB per-asset limit of some static hosts; that is a deployment decision.

## CMO record (X0a, `src/core/orbitFile.ts`)

162 bytes; the in-memory reader 0x515f24 uses the first 156. **Records hold heliocentric state vectors, not elements.**

| Offset | Field |
|---|---|
| +0x00 | byte, always 0 in both files (copied to element +0xba; meaning not recovered) |
| +0x01 | ShortString[40] name (MPC: space-padded) |
| +0x2a | ShortString[8] number |
| +0x33 | Extended epoch JD |
| +0x3d / +0x5b | 3 Extended position (km) / 3 Extended velocity (km/s), J2000 ecliptic |
| +0x79 | central body (index into GM table 0x5b57e0 → 0x5b3a7c; 0 = Sun 1.3271244e11 km³/s²) |
| +0x7a | magnitude model (1 = H,G; 2 = comet H,K; other → magnitude 100) |
| +0x7b / +0x85 | Extended H / G |
| +0x8f..+0x9b | frame header: type 2, sub 0, tag 1, Extended equinox JD 2451545.0 |
| +0x9c..+0xa1 | 6 flag bytes (asteroid list form; meanings differ between AST and MPC files, see X0b) |

Every record of both files decodes with this header, body 0 and model 1 (test). Extended → binary64 rounds once.

## Ephemeris (X0a/X2, `src/core/ephemeris.ts`)

Both Object X paths — the CCD mover builder ComputeMovers 0x59940c and the observable-asteroid list 0x519e94/0x51a160 —
build the asteroid with mode 2 and convert the same way:

1. **State → elements** 0x517af8 (standard vector algorithm: e⃗, h⃗, node vector; branches e < 0.9999999 elliptic,
   e > 1.0000001 hyperbolic, else parabolic; M wrapped by Frac/2π into (−π, π] in all three branches, an original quirk for
   the hyperbolic/parabolic M), then a := q/(1−e) (q for kind 2), n := √(μ/|a|³) (kind 2: √(μ(1+e)/(4q³))), M from Tp.
2. **True anomaly** 0x516ab0. Kind by 0x516930: e = 0 → 0, e < 0.98 → elliptic, e ≤ 1.02 → near-parabolic, else hyperbolic.
   Elliptic/hyperbolic: third-order correction (d1, d2, d3 with the d1 term reused in the d3 denominator, as in the source),
   tolerance |f| ≤ 1e−10, more than 10 corrections → "*** Orbit Calculation Error! ***" (typed `orbit-calculation`).
   Near-parabolic: Newton start s³+3s = W·dt/3 (for e = 1 exactly this is the result: a factor-9 quirk relative to Barker's
   equation, kept and tested), then Landgraf's series (Meeus ch. 35) with the original limits (50 terms, |term| ≤ 10⁴,
   50 inner Newton passes in total).
3. **Position** 0x517878 with the P/Q vectors of 0x51759c (Ω +0x68, i +0x5e, ω +0x72).
4. **Earth** 0x51556c/0x515e8c: Bretagnon & Simon solar series 0x51522c/0x515434 (50 terms; tables l 0x5b3af4, r 0x5b3bbc,
   α 0x5b3c84, ν 0x5b3d4c; SHA-256 of the table bytes 9ab86821…, 75b42d7c…, a4d563e5…, ee2ab3d6…), mode forced geometric,
   longitude ± π, reduced to J2000 by subtracting the general precession in longitude 0x4ba87c (latitude 0).
5. **Light time** 0x5157b4 mode 2: Earth at t; asteroid at t − τ; τ = |G|·0.005775518329861111 d/AU until |Δτ| ≤ 1e−5 d.
   Δ is the **first** (geometric) distance; r is taken at the retarded time. Mode 1 (nutation 0x4ba65c/0x4ba76c) is unused
   by Object X and not ported.
6. **Frames**: rect → ecliptic 0x4b9ec8 in the J2000 template; ecliptic precession 0x4b99c0 (Meeus η, Π, p; pole branch
   keeps the unsigned ArcCos) J2000 → t, then the caller precesses t → J2000 again; ecliptic → equatorial 0x4ba454 with the
   mean obliquity 0x4ba990 (Laskar, 7 terms) of the J2000 record. RA h = α·12/π, +24 while negative; Dec ° = δ·180/π.
7. **Magnitude** 0x515b40: H + 5 log₁₀(rΔ) − 2.5 log₁₀((1−G)Φ₁ + GΦ₂), Φ₁ = exp(−3.33 x^0.63), Φ₂ = exp(−1.87 x^1.22),
   x = |tan(α/2)|. The CCD record stores magnitude and Δ as Singles.

Numeric policy: binary64 in source order, constants rounded once from their Extended/Single cells; Math.* elementary
functions; Power is Math.pow. **Web guards** (the original has no bound): 100 light-time evaluations and 1000 iterations of the
first parabolic Newton loop, both as typed errors. The JD is the program clock (UT); there is no ΔT in this path.

### Independent controls

`src/core/ephemeris.controls.json` is authored by a separate Python program (generator SHA-256 in the file; script kept with
the research notes). It is independent **for propagation and frame rotation only**: universal-variable Kepler propagation
straight from the stored state vector, standard rv→coe and a direct J2000 rotation matrix (these check the Kepler/Landgraf
branches, the d1-reuse step's convergence, P/Q and the precession round trip). It shares with the port the Sun tables and
formula, the pA polynomial, the ±π/latitude-0 Earth, the light-time rule (Δ = first pass), the H,G formula, the record decoder
and the constants, and was written by the same implementer from the same notes, so it cannot detect a misreading of the
binary. Agreement (positions < 5e−8 relative, RA/Dec < 0.05″) is evidence of the implementation contract only. No external
ephemeris service was consulted.

External checks: (1) the ObjectX.HTL moving rows, which CLEA itself wrote, are reproduced from ObjX_MPC.CMO.sav at the
original default time to 0.04″ (Eros, 1994 CC at Δ ≈ 0.046 AU) and 1.4″ (Pluto, = HTL RA rounding) — a witness for the
J2000-ecliptic state-vector reading, the light-time rule and the "UT clock, no ΔT" convention; (2) the Sun within 10″ of Meeus
example 25.b (1992 Oct 13.0). No near-parabolic or hyperbolic orbit exists in the bundled files; those branches are tested on
authored synthetic state vectors.

### Where the ObjectX.HTL moving rows match (derived)

The original's Object X default date is **2009/06/01 04:00:00 UT** (TUTTimeDlg 0x4fde9c/0x4fdeb0, X0b). Separation from each row
at that time, computed with this port:

| Row | ObjX_MPC.CMO.sav (epoch 2009-06-18) | ObjX_AST.CMO (epoch 2009-03-09) | ObjX_MPC.CMO (epoch 2010-07-23) |
|---|---|---|---|
| (433) Eros 22.722017 h −8.03989° | **0.04″** | 0.18″ | 25.0″ |
| (134340) Pluto 18.166972 h −17.631472° | **1.37″** (HTL RA rounding 0.1 s ≈ 1.43″) | 1.32″ | 3.9″ |
| (136617) 1994 CC 12.451553 h −44.033056° | **0.04″** | 962″ | 3112″ (never closer than 0.86° in 2008–2010) |

Reading: the rows were generated at the default time from the orbit set saved as ObjX_MPC.CMO.sav (zip date 2009-08-12, before
ObjectX.HTL, 2009-08-21). The shipped ObjX_MPC.CMO is a 2010 update; two-body propagation back across 1994 CC's June 2009 close
approach misses its row by 0.86°, so with the original's options default a camera pointed at the 1994 CC row would not show
it. ObjX_AST.CMO also misses 1994 CC at 04:00 (16′; it crosses the row near 06:56 UT by coincidence). Hence the web default.

## Asteroids in the CCD field and the Object X entry (X0b; used by X4)

- Object X is exercise **1** (ObjectX1Click 0x58ad38); the HTL file name is at settings+0x10f4 (0x5a3105).
- TUTTimeDlg "Set Date/Time, ID": date YYYY/MM/DD, UT HH:MM:SS, ID ≤ 18 characters; empty ID → "UNKNOWN"; the clock then runs
  from the entered UT and the observable list is built for that date. The ID only labels saved data ("ObjX-<ID>-01.FIT",
  photometer/spectrum/radio labels, observation list); it never selects a target.
- Orbit-file type by file name: contains OBJX_AST → 0, OBJX_MPC → 1, else no list.
- Observable list 0x519e94: every record, kept when V ≤ limiting magnitude (default 16) and either a near-Earth flag
  (AST byte 0x9c ∈ {1,2,4}; MPC byte 0xa0 ∈ {2,3,4}) or RA within ±3 h of the antisolar point; no altitude test.
- Field list 0x51a4d8/0x51a558: observable entries inside the chart/field RA/Dec box and magnitude limit.
- CCD Expose 0x5222d4 → 0x522718 → ComputeMovers 0x59940c(T = clock at exposure start, dt = exposure): one record at T and,
  for dt > 0, a second at T + dt ("kind-2 pair"), name "(number) name", V, B−V 0.65, U−B 0.195, spectral code G2V; gnomonic
  projection with optional jitter; band offsets NF −0.54, B +0.65, V 0, R −0.54, I −0.88; no frame-bounds test.
- Not recovered: how the renderer draws the pair (two images or a trail), the exact source of the CCD field box, the sort key
  of the observable list, the orbit-file creator's selection rule, and the meaning of AST byte 0x9e/MPC bit 16.

## Measuring tool (X3, `src/core/astrometryMeasure.ts`, `src/ObjectXMeasure.tsx`)

The original sends images to external programs (Toolkit, CLEA_AST.EXE, DS9) that are neither ported nor run. The web tool is
**new**, designed from the CLEA Astrometry user guide (ASTUG.PDF §VI-2/VI-3) and the "Astrometry of Asteroids" manual, read
statically under decision D6; toolkit.exe was not needed and not analysed.

- Centroid: brightest pixel within radius 8 of the cursor, then position average within radius 8 weighted by the display
  range (0 below the low cut, 1000 above the high cut, linear between), weights cubed. On authored synthetic Gaussian stars it
  is cursor-insensitive within 5 px and biased by ≤ 0.1 px toward the peak pixel (property of cubed weights).
- Solution: standard coordinates about the field centre (mean of the references), six plate constants by least squares from
  ≥ 3 non-collinear reference stars; or the image's TAN WCS when its header carries one (web adaptation for camera images saved
  by this app). Marks keep pixels only: every target position, the per-frame rms and plate scale, the per-reference residuals
  and the motion are derived from the current marks at render time, so correcting a reference star re-solves every target.
- Cuts: the low/high cut sets both the display stretch and the centroid weights (the guide ties them to the displayed range);
  the 5 %/50 % default of the image range is a labelled web choice.
- Blink: alternate two images at 10–1000 ms (default 500), aligned on the first two reference marks of each image when both
  have them, otherwise raw frames (labelled "same pointing assumed"). Measuring is disabled while blinking.
- Motion: rate (″/h) and position angle (north through east) between the earliest and latest solved target marks.
- Synthetic fixtures are authored test images, never presented as CLEA observations.

The component is mounted by the `#object-x` route in X4. Until then it is exercised in Chromium through the test-only host
`tests/fixtures/object-x-measure-host.ts` (`tests/object-x-measure.spec.ts`: keyboard cursor and Enter, click → pixel on the
shown image, frame attribution, motion, raw → aligned blink, timer alternation, measuring disabled while blinking).

## Not recovered / open

- Mode 1 apparent positions (nutation) — unused by Object X.
- The renderer of asteroid pairs, CCD field box source, list sort key, orbit-file creator selection, some flag bits (X0b).
- X4 list builder: catch ephemeris errors per record (the original continues past a bad record, 0x5159aa → 0x515abd).
- x87 Extended evaluation is not reproduced; no original-runtime equivalence is claimed.
