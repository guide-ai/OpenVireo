# E08 Object X — the quest for Object X (Front X, X0–X5)

Status: X0–X3 merged at 121c835 after review 1 and the closure check. X4 (route, camera asteroids, asteroid list) and X5
(v28 investigation, guide) are implemented on branch `claude/serene-dubinsky-8d1244` and await independent review. E08 is
**not** closed: the star, galaxy and quasar branches need the spectrometer at arbitrary coordinates, which is typed "not
available yet" until the field-engine front lands.

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

| Row | ObjX_MPC.CMO.sav (epoch 2009-06-18) | ObjX_AST.CMO (epoch 2009-03-10) | ObjX_MPC.CMO (epoch 2010-07-23) |
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
- The renderer draws the pair as one trail (recovered by front C, NATIVE-CAMERA-FRONT-C-C0-01). Not recovered: the exact source of the CCD field box, the sort key
  of the observable list, the orbit-file creator's selection rule, and the meaning of AST byte 0x9e/MPC bit 16.

## The #object-x route (X4, `src/ObjectXLab.tsx`, `src/core/asteroidField.ts`)

Student path, following the original manual (identification, decision D3):

1. **Your object.** ID # (≤ 18 characters, TUTTimeDlg IDEd; it only labels data as `ObjX-<ID>`, or `UNKNOWN`) and an
   **object code**. Codes are `X-` + 5 base-36 characters of FNV-1a over the HTL identifier, listed sorted by code, so neither the
   file order (grouped by kind) nor any identifier or remark is shown (decision D5). "Assign me one at random" is a web
   convenience. Date and time default to the original 2009-06-01 04:00:00 UT; **Set the observatory clock** applies it.
2. **Investigate**, three instrument branches on one page:
   - **CCD camera** (asteroids, any object): orbit file (default ObjX_MPC.CMO.sav, with the one-line label; MPC and AST
     selectable), limiting magnitude (16), **Build the asteroid list for the observatory date**, and **Copy the coordinates to
     the observatory** (it fills the observatory's RA/Dec fields; the student points with *Point to coordinates*). The observatory
     camera then asks the lab for moving pairs at each exposure and hands it each image.
   - **Radio telescope** (pulsars): opens the radio route; the student enters the coordinates there.
   - **Spectrometer** (stars, galaxies, quasars): typed "Not available yet" with the same text for every object, so it reveals nothing.
3. **Your images**: one line per camera image (`ObjX-<ID>-NN`, UT, filter, length, asteroids in the field box and how many
   fell off the detector — the composer's `moving-pair-off-detector` reason), and **Open saved FITS images** to load images back.
4. **Compare and measure**: two images into the X3 measuring tool (blink, centroid, header WCS or plate constants, motion).
   The **Current observable asteroids** list (original 0x51a614 columns: name, RA, Dec, V, Δ, notes (1)–(4) with the per-file
   legend) is rendered only when opened, sorted by RA.
5. **Your answer**: star / galaxy / quasar / pulsar / asteroid, a free description, then **Reveal the identity** (two clicks,
   only after an answer), which shows the HTL identifier and remark and whether the answer matches.

Asteroid list (0x519e94): every record through the X2 ephemeris at the list date; kept when V ≤ limit and (near-Earth flag —
AST byte 0x9c ∈ {1,2,4}, MPC byte 0xa0 ∈ {2,3,4} — or RA within ±3 h of the antisolar point, wrap-aware). The antisolar RA is the
Sun's geometric longitude + π converted with the mean obliquity of date (0x515df0/0x4b9f44 were not read; a few arcseconds
do not matter against a ±3 h window). **Closure L5:** a record whose decoding or ephemeris fails is skipped with a typed reason
(`record` or `ephemeris` + the EphemerisError code) and the scan continues; the count is shown. The scan runs in 4000-record
slices (0.22 s for the .sav file, 1.3 s for ObjX_MPC.CMO in Node), so no Worker is needed. At 2009-06-01 04:00 UT the .sav file
gives 533 asteroids (11 near-Earth, 522 near opposition), Eros among them at 0.04″ from its HTL row.

Moving pairs (ComputeMovers 0x59940c): list entries within the field box, each evaluated at T (exposure start) and T + exposure;
`storedMag` is V at T as a Single (the composer applies NF −0.54, B +0.65, V 0, R −0.54, I −0.88). Web adaptations: the field box is
2° around the pointing (the original box source is not recovered); at most 128 pairs, brightest first (composer limit 256).

**Camera contract** (front C, main 9af0d29): the camera calls `extraSources(jd, seconds)` with the JD and the total exposure
length captured at Start, so each pair ends at T + exposure, and the composer draws the pair as one trail between the two
positions (source loop 0x521a6f..0x521b35 → extended source 0x524a6c; evidence NATIVE-CAMERA-FRONT-C-C0-01,
docs/CAMERA-EXPOSURE.md). Pairs the composer does not draw arrive in `onImage` as `exposure.skipped` with a typed reason
(`moving-pair-off-detector`, `moving-pair-geometry`, `moving-pair-budget`); the image list shows them by reason and count, never
by name (a name could reveal the object), and v28 stores the reasons. Rates at 2009-06-01 04:00 UT from the .sav file: 1994 CC
0.0907°/h, Eros 0.0152°/h, Pluto 0.0010°/h; front C draws diagonal 600 s trails of 0.15° and 0.5°, so exposure length is no
longer a practical limit.

Known limits: Eros (V ≈ 13.7 in NF here) is only ~15 ADU above a ~530 ADU background in 30 s on the 0.4 m: it is the brightest pixel
but faint on screen, so the guide suggests NF and about 2 minutes. The observatory's "Switch to telescope view ↗" shortcut re-points
at the selected catalogue object; after *Point to coordinates* the student must use the plain *Telescope · 15′* view button (front B).

## Investigation file v28 (X5, `src/io/objectXInvestigation.ts`)

A v28 file wraps an unchanged v1..27 base, outermost (so it combines with a v27 LSS file); a v28 is never nested. It stores the
orbit file, ID, object code, start date, whether the clock was set, the list date and limit, one recipe per exposure (JD,
length, filter, gain, telescope, pointing, seed, catalog mode/SHA-256/extract, list date, pair count and the typed reasons of pairs the camera skipped, SHA-256 of the
FITS the lab wrote), image references (SHA-256, label, JD, exposure), the measuring pair and marks (pixels only), the answer, the
description and the reveal flag. **Images are not stored**; the student keeps the FITS files and reopens them.

Restore replays: the bundled orbit file is fetched and checked (size and SHA-256), each list is rebuilt at its date, every
exposure's pairs are re-derived and must match the stored count, and a SHA-256 over the derivatives must equal the stored digest.
Bounds: 64 exposures, 16 images, 8 list dates, 64 marks, 4000-character description, 1 MiB. Any failure rejects the whole file.

## Guide (X5, `src/ObjectXLabGuide.tsx`, `src/core/objectXLab.ts`)

Ten steps recomputed from the lab on every render: object, clock, list, image (an image within 0.25° of the object), repeat
(two such images), measure (a motion, or a non-moving answer), classify, describe, reveal, save. Nothing judges the answer
before the reveal; no step names an object.

## Tests (X4–X5)

- Vitest: `objectXLab.test.ts` (4: distinct opaque codes with no identifier or remark, reveal, ObjX- label, progress), `asteroidField.test.ts` (8: file type, label, antisolar window, list contract on the .sav file, chunked = whole, L5
  per-record errors, Eros pair, 0 s exposure), `objectXInvestigation.test.ts` (3: v28 round trip also over v27, no orbit fetch
  without asteroid exposures, tamper/digest/replay/bounds), `astrometryMeasure.test.ts` +1 (N1 catalogue pairing).
- Playwright `tests/object-x-path.spec.ts` (2): hidden identity checked in the route, guide and camera before the reveal (M1;
  identifiers everywhere, one-word remarks such as "Star" only outside the camera's shared text); Eros: clock, list, observatory,
  two 30 s live-mode images with the recorded VizieR response, pairs in both, both marks within 4″ of the object, motion, answer,
  reveal, save v28 and restore in a fresh page; radio and spectrometer branches, guide progress, 375 px without overflow.
  `tests/object-x-camera.spec.ts` (1, test-only host `tests/fixtures/object-x-camera-host.ts` with the real CameraControl and
  ObjectXLab wired as in OpenVireo): the camera calls `extraSources(jd, 2)` with the Start values, and an authored pair 80° off
  axis is skipped as `moving-pair-off-detector` and shown in the Object X image list as "Not drawn: 1 far outside the detector.".
  `tests/object-x-measure.spec.ts` now also checks N1 (reversed marking order), N2 (no re-stretch on cursor moves) and N3 (aligned
  pixel). `recorded-analysis-navigation.spec.ts` lists the two new header buttons.

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
- Blink: alternate two images at 10–1000 ms (default 500), aligned on the first two reference stars marked on both images,
  paired by catalogue position within 1″ (closure N1), otherwise raw frames (labelled "same pointing assumed"). Measuring is disabled while blinking.
- Motion: rate (″/h) and position angle (north through east) between the earliest and latest solved target marks.
- Synthetic fixtures are authored test images, never presented as CLEA observations.

The component is mounted by the `#object-x` route (X4). It is also exercised in Chromium through the test-only host
`tests/fixtures/object-x-measure-host.ts` (`tests/object-x-measure.spec.ts`: keyboard cursor and Enter, click → pixel on the
shown image, frame attribution, motion, raw → aligned blink, timer alternation, measuring disabled while blinking).

## Not recovered / open

- Mode 1 apparent positions (nutation) — unused by Object X.
- CCD field box source, list sort key, orbit-file creator selection, some flag bits (X0b).
- x87 Extended evaluation is not reproduced; no original-runtime equivalence is claimed.
- Star, galaxy and quasar branches: the spectrometer at arbitrary coordinates (quasar merge, photographic association, own galaxy
  spectra, star templates) belongs to the later field-engine front; E08 closes only after it.
- The radio route is opened but not pointed for the student; there is no coordinate handoff into it yet.
- The anti-solar RA routine 0x515df0/0x4b9f44 was not read; the web uses geometric longitude + π and the mean obliquity of date.
