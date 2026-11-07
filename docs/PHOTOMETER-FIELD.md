# Pinned Pleiades field and one-callback numerical replay

**Visual follow-up:** [Pleiades photometer](PHOTOMETER-VISUAL.md) now provides the bounded sky/object/manual-notebook/replay interaction at `/#photometer`. The numerical increment documented below predates that screen.

A complete bounded catalog-to-count-to-reduction example is now implemented in `src/core/photometerField.ts`. It covers one original Pleiades position, one declared sky position, V only and a fresh fixed telescope0 context. It is a pure numerical fixture, **not a new observing screen or a completed Pleiades exercise**. No learner measurement, catalog answer or grade is inserted into the application. Session v7 and all existing UI flows are unchanged.

## Exact supported domain

The exported `PINNED_PLEIADES_V_DOMAIN` declares a fresh direct VIREO Pleiades exercise(mode3), compact GSC mode1, **explicit base field-size option1 arcminute**, native multiplier3,312-pixel native canvas/936-pixel cached field, aperture selector10, telescope record0, native seeing Single3, prepared zero point9, base1000 photons per callback,100ms timer interval, V filter and nominal0.1-second/one-integration selection. The base field option is stored as Single by0x5a63df; **1′ is an analyst-selected supported option value, not the compiled15′ default, a supplied original preset, or an original execution witness**. Altered/missing/extra domain fields are rejected.

Fresh mode3 bypasses dynamic context creation guarded by modes0/1 at0x58b39e. Earlier generated clusters, resumed sessions, field/time/telescope/filter/aperture/seeing changes and standalone Pleiades editions are excluded. The function requires this explicit declared history; it does not detect history in the running UI. `CLUSTERS.DAT` positions remain separate from a generated-cluster UBV population and are not covered by this example.

The target is zero-based **PLEIADES.HTL record1**, the second entry, original label **01803-00478**, at stored Number coordinates RA3.715302h/Dec24.49326°. It matches compact record **N2230.DAT@145877**, expanded native name **N2230-00478**, by exactly equal projected coordinates and matching suffix. Both different name prefixes are preserved; this is an original-record association, not a modern star cross-identification. Compact signed int16 values at+12/+14/+16 are V/B−V/U−B divided by1000 then stored Single. The selected record contains V9470, B−V480, U−B10: V becomes9.470000267028809, rather than silently retaining decimal9.47.

## Complete field and neighbor proof

The two cached fields are0.05° wide; the sky pointing has the same RA and Dec+0.01°. Each independently selects region1803 and compact bandN2230. The retained fixture contains every original native search probe and scan visit, including the first record beyond the upper RA bound. It replays the existing native last-midpoint seek and catalog admission functions; no lower-bound search or navigation tile substitutes for the original population.

| Field | Admitted compact sources, in original order | Native neighbor query result |
|---|---|---|
| Object | N2230-00836, N2230-00954, N2230-00478 | N2230-00478, including the central source |
| Sky | N2230-00836, N2230-00954, N2230-00584, N2230-00478 | Empty |

The external generator checks the entire1,065,481-record N2230 band. Whole-band admission matches native seek/scan, exact Fraction comparisons against the declared stored Double rectangle and adjacent rounded RA-key controls. It also scans all31,147 variable records,2,269 QSOs,24,069 galaxies and183 galaxy-image list positions: **zero positional admissions in both fields, before any magnitude/time filtering**. Thus those stages are no-ops in these exact fields. A distance-only claim about nearby variable stars would be insufficient: native merge code can delete a runner-up without repairing a saved winner index. No such mutation is omitted here.

`queryPhotometerNeighbors(pointing,radiusDegrees,first,second)` ports0x59ac54: enumerate field+5 first, then field+0x35, append every native flat separation **<= radius+0.0025°**. It preserves central entries, duplicates and order, with no extra type/magnitude filter. The Extended literal at0x59ad54 is11805916207174113035/4722366482869645213696 (Number0.0025), verified from bytes;0.005 is incorrect. The downstream preparation excludes a neighbor whose native name equals the selected source name. Dense10,000-row and1-degree radius limits are new finite adapter guards, not recovered native maxima. Supplying a list to the scalar query does not prove its completeness.

The aperture radius is10.5/(936/0.05)=0.0005608974358974359°; prepared seeing width is(3/2)/3600=1/2400°. The existing point-source table/flat-distance/fraction helpers are reused. Selection uses the complete cached scene, not display SVG coordinates. Target distance is0 pixels in the object scene and187.2 pixels in the sky scene, below the native350-pixel nearest sentinel. Projection uses object declination; the separate photometer distance uses pointing declination, as recovered.

## From source to counts and magnitude

`buildPinnedPleiadesField(domain,'object'|'sky')` reconstructs the pinned scene, validates original read order and witnesses, selects the source and prepares its V magnitude/amplitudes. `simulatePinnedPleiadesVPair(domain,seed)` explicitly computes **one sky callback then one object callback**, chaining the supplied32-bit PRNG state. Each callback draws source Poisson first, then sky Poisson, and **adds source+sky**. It separately retains1000 base-count units and100ms timer units. Existing supplied-input sky/object reducers are reused with the fresh same-context sky; no new noise or calibration model is introduced.

At the sky pointing the nearest source remains selected, its aperture fraction is0 and the neighbor query is empty. Native attenuation returns literal magnitude30, and Start still converts that magnitude to source amplitude: the sky callback's source mean is **0.0000039810717055349725**, not zero. Fixed V sky16 gives sky mean1.5848931924611136. The object aperture fraction is approximately0.8212087158 and source mean532.6641192. Zero-source substitution would erase a real native branch; an explicit rare-seed test detects the channel difference.

The first selected integration duration is stored Extended0.1 at0x5b3a40. An independent rational check shows it equals100/1000 rounded to a64-bit Extended significand. This supports the chosen one-callback numerical domain under that policy; no general timer scheduler, repeated-addition/overshoot or original x87 control-word equivalence is claimed. Number/Math, the existing explicit-index normal table, explicit seed and bounded draw errors remain declared browser adaptations.

Independent fixtures use90-digit Gaussian antiderivatives followed by native0.1 interpolation and directly multiply linear flux by aperture fraction. A separate Python integer-modulo PRNG and `math.lgamma` Poisson calculation retains decision margins;70-digit Decimal verifies reduction. These are synthetic numerical references, **not original acquired observations or a writer/runtime oracle**.

## Reproduce the delivered feature

From `/home/dobleuber/Projects/personal/clea-web`:

```sh
npm test -- src/core/photometerField.test.ts
npm test -- src/core/photometerField.test.ts -t 'seed 42'
```

The second check verifies this exact supplied-seed replay: sky source0+sky1=1 photon; object source550+sky2=552 photons; fresh-sky subtraction leaves5510 counts/s, base rate10000 counts/s and reduced V≈**9.647121002870538**. This differs from catalog V and includes native aperture loss and simulated count noise; it is not an answer entered for the learner. The rare seed1298181734 yields one source photon at the nominal sky position; the test preserves source/sky attribution even though that specific zero-source control happens to retain total counts/final seed.

The persistent preview remains **http://127.0.0.1:5173/** for existing supported flows. For a **developer numerical check**, open that URL, open the browser developer console and run:

```js
await import('/src/core/photometerField.ts').then(m =>
  m.simulatePinnedPleiadesVPair(m.PINNED_PLEIADES_V_DOMAIN, 42))
```

Inspect `sky.totalPhotonCount`(1), `object.totalPhotonCount`(552) and `reduction.magnitude`(9.647121002870538). This exact check was executed in Chromium against the persistent Vite server, with no page errors or external requests. It does not mutate instrument/student/session state. There is no photometer acquisition button or route in this increment; this console check is not an observing procedure.

## Lifecycle evidence and remaining exact gates

Record0x501e7c calls0x54a73c for an existing live collection record or a newly appended record, fills coordinates/band fields **before** ShowModal, then derives self+0x6b0 from ModalResult1. The exact Cancel handler0x54b2dc only clears a byte at global5bcae4 instance+0x480. Startup0x5ad58a, pointer0x541a0c→VMT0x541a58 and class evidence identify this as **THRDisplayForm1**, not the observation collection or modal result pointer. No direct observation rollback occurs in that handler or the caller's post-cancel branch. Full modal-close dispatch and original save/load are still not certified; no invented transactional cancel behavior is implemented. Front P3 (2026-10-31) ports this as decoded: Cancel keeps the merged record and its band value and leaves the reading unrecorded (docs/PHOTOMETER-RECORD.md).

Before a usable instrument is enabled, finish telescope-change/reentry sky validity, partial Stop/restart behavior, modal acceptance/close and actual observation writer/replay. The manual requires fresh sky after any telescope change, including a return; three native banks alone do not authorize automatic reuse. This replay always computes fresh sky at fixed telescope0 and does not purport to implement those transitions. Wider original fields require actual variable/QSO/galaxy merge handling and source/color/time domains; CLUSTERS.DAT still needs generated-population association. R/I, image-source, unknown-color and broader integration configurations remain excluded.

I01/E04 are not accepted complete; N03 remains partial. [Verification](PHOTOMETER-FIELD-VALIDATION.md) records actual-repository results. [Provenance](../data/photometry/field-provenance.json) retains13 byte/listing captures, exact constants, aliases, nine original source/license hashes, generators and fixture hashes. Raw downloads and analysis stay outside source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-field-recovery/`. Local research rights only; no original execution/microemulation, installation, Windows, Claude, push, publication or original-resource upload.

## Photometer field at any pointing from the compact GSC tiles (Front G, G3a)

- **How it is built:** VIREO builds the photometer's field with the same telescope load and field build as the instrument
  field (0x53be70 → 0x597ac8), only with the photometer field size. The half-height is size·3/120: 0.025° for the 1′ option
  instead of 0.375°.
  - `freshFieldArea(pointing, FIELD_HALF_DEGREES.photometer)` and `buildFieldPopulation(…, {fieldHalfDegrees})` build that
    field from a pack assembled from the published GSC tiles (`assembleFieldPack(…, halfDegrees)`).
  - `photometerFieldFromPopulation` then applies the steps `buildCompleteField` uses: native centre selection (0x59a0fc),
    neighbours (0x59ac54), aperture fraction, and the known-colour or attenuated magnitude.
- **Equality:** `src/core/photometerTiled.test.ts` checks that, for all 24 PLEIADES.HTL targets in both object and sky fields
  (48 fields), the tiled field equals the bundled field. That covers stars and their order, neighbours, the selected star and
  its pixel distance, the aperture fraction, the source magnitude, and the means.
- **Typed reasons** (`PhotometerTiledReason`), never approximated (Front PHTILED, 2026-11-05, retired `photometer-galaxy`,
  `photometer-qso` and `photometer-colour`; see the section below):
  - `photometer-galaxy-name`: the centre selects a galaxy whose catalogue name another CLEA_GLX.DAT record shares (195 names); the
    photometer finds the galaxy record by name, possibly from a record cached by an earlier lookup (0x5006b8..0x5006fe) [U].
  - `photometer-empty` (Front AXISMERGE, 2026-11-05): no GSC star in the photometer field. The field build 0x597ac8 then shows
    "No Stars Found in Field!" / "Possible Error in Field Parameters" and jumps past the QSO and galaxy loads (0x597c8a) [D]; those
    lists are cleared only inside the skipped loaders, so the galaxies and QSOs of the previously loaded field remain, the paint
    is skipped and the telescope clock stays stopped (docs/FIELD-ENGINE.md). What the photometer then selects and measures depends
    on that earlier field and is not reproduced. M31's core (0.7123 h, +41.2692°) is such a field.
  - `photometer-variable` (narrowed by Front PHVAR, 2026-11-05; section below): a variable kept by the TRUE dispatch whose V, B−V
    and U−B are unavailable (no observatory-clock time, or a typed model reason in the detail) is selected or lies within the
    neighbour query of the largest aperture.
  - `photometer-selection`: no star or galaxy selected at the centre; Start then integrates the band slots left by the previous
    source preparation (0x4ffbba → 0x4fff04 writes none; StrtBtnClick has no nil test) [D], which the web does not keep.
  - `photometer-population`: an engine gate.
- **Mode independence:** the source does not depend on the reading mode (G3b), except for a selected galaxy (below). A positive
  central fraction gives the known colours of the central object and its neighbours. A zero fraction with no admitted neighbour
  gives the literal 30. Neighbour light without central admission is added to that 30 (Front P2 ported this decoded path; it was
  typed `photometer-central-unadmitted` before, docs/PHOTOMETER-P2.md).

## Photometer at the telescope pointing (Front G, G3b)

The photometer measures where the telescope points, from the tiles. The student then chooses Sky or Object and integrates, as
in VIREO. Static evidence is in `analysis/front-g-gsc/RE-photometer-start.md`.

- **Activate keeps the pointing (G3 review 1 M1).** VIREO's FormActivate (0x4ff8b0) never moves the telescope: it selects the
  nearest object where the telescope points (0x53cf94 → 0x59a0fc).
  - When the student pointed the telescope themself (the App's `studentPointed`: a pointing that is neither the initial one
    nor an instrument Activate jump, such as the bench's own prepared field or a sky/star/galaxy exposure field; a pointing
    restored from an investigation counts as not chosen, since the save does not record who pointed [W]), Activate keeps it and reads the field there from the tiles.
  - At an admitted PLEIADES.HTL position, or from the initial pointing, Activate keeps the earlier E04 behaviour: it selects
    that target or moves to the bench's known Pleiades field (a web orchestration).
  - **Use the telescope pointing** reads the field again after the telescope moved; before Activate it activates here.
- **One checked way to move from the bench (G3 review 1 M2).** Leaving the Photometer screen releases the bench, and Activate
  starts a fresh context with empty skies, so the bench keeps **Point the telescope here** [W] for "sky on a clean patch, then
  back to the star". It goes through the Observatory's own checked pointing (`pointChecked`): Limit Slewing refuses a
  position below the horizon, and a closed dome refuses the move (the bench never opens the dome). After a move the field is
  read again at once, as FormActivate re-selects when the form becomes active again. The spectrometer screen has no such
  control.
- **A late field is dropped (L1).** A field that finishes loading after the telescope moved is not applied; the student is
  told to read it again.
- **Object X (L2).** The 2° mask includes the Object X lab's hidden target, as for Field Information.
- **Bounded caches (L5).** Prepared frames are kept for at most 512 pointings (a journal cannot name more), oldest out; their
  integration configurations have their own bounded cache (256, oldest out), separate from the Pleiades-sized one, and are
  rebuilt from the frame when needed.

- **Sky readings anywhere** (coordinator decision 3b).
  - The native Start (0x4ffa30) prepares the source in the same way in both modes: Sky mode is the radio item at +0x41c.
  - A sky reading at a pointing with a star in the aperture therefore includes that star's light, which is VIREO's result.
- **The one warning VIREO has is ported literally.**
  - When a Sky reading would replace this filter's sky in the current telescope bank while the selected star has light in the
    aperture, VIREO asks "Are you sure you want to replace a sky reading with one that may be invalid?" (caption
    "Reading Sky!", Yes/No; No cancels the Start).
  - In the journal that is a one-shot `skyConfirm` event before `start`. The first sky reading is never asked about.
  - **The slider flag +0x41d (G3 review 1 M3).** The question also needs +0x41d = 0 (0x4ffab5). RdngSliderPositionChange
    (0x5021cc) sets it and then runs the same source preparation (0x4ffa30), and FormActivate clears it (0x4ff9cb). The slider
    (TiSwitchSlider RdngSlider, positions "Object, Sky", at +0x400) fires OnPositionChange (+0x378) from SetPosition 0x4f4930
    → 0x4f4798 whenever its position changes, also when FormActivate sets it. So once the student has moved the Object/Sky
    slider since activation, VIREO no longer asks. The journal state `readingSliderMoved` follows this: a `point` or `target`
    event that changes the mode sets it, and `activate` clears it, setting it again only when the activation itself changes
    the mode (the web activation always declares Sky [W]; VIREO's FormActivate chooses Sky from the slider and the aperture
    fraction, which the web does not reproduce).
  - A `field` event also clears it [W]: a move stands for leaving the form to point the telescope, and VIREO's FormActivate
    clears the flag when the student comes back. So Sky declared before the move onto a star is asked about, and Sky chosen
    again on the star is not, as in VIREO.
  - Bundled Pleiades sky fields have a zero fraction, so they are never asked about.
  - **Detect Sky (Front T4, 2026-11-06, docs/OPTICAL-OPTIONS.md).** The other branch of FormActivate: with the instructor option
    on (DtctSkyBox, env+0x2e83, copied into the form at +0x6b1 by TObsrvtry's initialisation 0x537f08 at 0x53805c, run after the observatory's
    FormActivate/FormPaint and by ScopeTimerTimer 0x58b9bf when the telescope changes; compiled off), Sky :=
    (fraction = 0) whatever the slider says, and the slider and its group are disabled (0x4ff94c–0x4ff985). At telescope
    pointings OpenVireo follows each `activate`/`field` with the `point` event that FormActivate's SetPosition implies
    (`photometerDetectSkyEvent`), so `readingSliderMoved` is set exactly when the position changes, the selector is locked,
    and a session replays without the option. Pinned PLEIADES.HTL targets keep their Object/Sky positions (a telescope move
    in the web); with Detect Sky on, Start at their sky position is refused while the star lights the aperture [W].
- **No star within the selection radius** (0x59a0fc, 350 pixels, about 1.1′): VIREO keeps a nil selection and skips the
  magnitude preparation. The band magnitudes at +0x41f…+0x451 then keep the previous star's values, or 0 on a fresh form.
  That memory is not reproduced, so the case is typed `photometer-selection`.
- **Journal:**
  - A `field` event {ra, dec} selects the tiled target `gsc:<ra>,<dec>`. Moving keeps the per-filter skies of the context,
    since only a telescope change needs fresh sky, and keeps the declared mode.
  - Frames are prepared asynchronously (`io/photometerTiledFields.ts`, with the Object X 2° mask) and registered before the
    synchronous journal uses them.
  - Sessions with a `field` event are owner version 12 (`OpenVireo-photometer-compact-GSC-fields-v12`, header
    `gscIndexSHA256`). Restoring prepares their frames first; earlier sessions are unchanged.
- **Telescopes:** all three (point 4).
  - The 0.9 m and 4 m constants come from the optical profile.
  - Their per-target exclusions follow from the field and telescope alone. `photometerMaximumMean`, the largest per-callback
    mean over U/B/V and apertures 5/10/15, reproduces every recorded `maximumMean` and reason of both contracts, to a relative
    1e-8 (`src/core/photometerTiledBench.test.ts`).
  - Tiled targets get the same limits as typed reasons that block Start (`tiledPhotometerReason`): `Poisson-mean-bound` and
    `all-duration-count-domain`. The earlier 0.9 m / 4 m `photometer-blend` web limit was lifted by Front PHTILED (below).
    Front MEANBOUND (2026-11-05) leaves both unchanged: `poissonDraw` now admits 2^33, but `Poisson-mean-bound` is the
    photometer's own 10⁶ per-callback rule (`PHOTOMETER_MEAN_BOUNDS`) [W]. Lifting it alone would make nothing measurable (a
    mean above 10⁶ over the longest 5000 callbacks exceeds the counter, so `all-duration-count-domain` would refuse it) and would
    only move the three Mayall Pleiades exclusions to the other reason; a shorter-series domain with VIREO's overflow message
    0x5019a0 is left for a later front.
- **Notebook and B−V** work for tiled stars. They never count toward the Pleiades exercise, whose summary reads only Pleiades
  rows.
- **Skies and E04 (G3 review 1 L3, web rule [W]).** VIREO keeps one sky per filter and telescope bank, wherever it was read, and
  reduces any object reading with it; the web keeps that for the reading itself. E04's count (`pleiadesExerciseSummary`) and
  its cluster points (`pleiadesPoints`) take only Pleiades object readings whose sky was read at a bundled Pleiades field
  (`pleiadesSkyContext`); a Pleiades reading reduced with a sky taken at a tiled pointing is shown but not counted.
- **Tests:** `src/io/photometerTiled.test.ts` (journal, session round trip, telescopes, sky question, E04) and
  `tests/photometer-tiled.spec.ts` (browser flow, and M31 typed).

## Galaxies, QSOs, colours and blends at tiled pointings (Front PHTILED, 2026-11-05)

Static evidence and measurements: `analysis/front-phtiled/RECOVERY.md` (excerpts.asm SHA-256 6c53f6ea…bf34); plan and what is left:
`analysis/front-plans/front-phtiled.md`. Breadth only: E04 still uses the bundled Pleiades fields, whose frames and readings are
unchanged (48-field equality, Pleiades contracts and P2 tests).

- **QSOs.** The photometer's field is the telescope field object [0x5b56ac] that 0x53be70 builds (0x53c010); its mode byte 1 loads
  and merges the QSOs (0x597db0..0x597df3) [D]. The tiled photometer field is now built with the engine's QSO merge, as the
  spectrometer at any pointing. A merged QSO (kind 3) is selected like a star and prepared from its own V, B−V and U−B through the
  point branch of 0x500568. The neighbour producer 0x59ac54 walks the star list and then the QSO list field+0x35 [D], so a QSO in
  the aperture that is not selected adds its light once per list (the frame keeps the list as `qsos`; the bench chart draws its records too). Measured: 1154 of the 2269
  CLEA_QSO.DAT positions now select their QSO (1165 were `qso-merge` before; 1103 are empty fields).
- **Selected galaxy (kind 1).** 0x53ce8c copies the galaxy into the current object: V from the catalogue (+0x18 Single), B−V and U−B
  from the loader's morphology table. 0x500568's galaxy branch takes its width w = 0.6 · (a + b)/4 with a = major/60 (1/120 when
  0) and b = minor/60 (the 0x53b94c ratio × a when 0), and a distance 0 (the object is a copy of the named record): the fraction
  I(r/w) − I(−r/w) does not depend on the telescope or on the offset of the pointing (`photometerGalaxyWidthDegrees`). Neighbour
  stars and QSOs add their light as usual. Measured: 20259 of the 24069 galaxy positions now give a reading.
  - **Sky readings on a galaxy** (Front PHSKY, 2026-11-06; section below): in Sky mode 0x500568 gates the galaxy's fraction on the
    Telescope display (0x53e338 ≥ 80), which is now painted for the photometer field; `photometer-galaxy-sky` remains only where
    that cannot be decided. (Until then every such reading was refused.)
  - **Mode after a move onto a galaxy**: exact. Review 1 M1 assumed FormActivate's +0x41c could differ from the slider; the slider's
    OnPositionChange 0x5021cc calls 0x4ffa30, which writes +0x41c from the slider (0x4ffa61) [D], so with the slider at Object
    FormActivate takes the Object-mode galaxy fraction, as the web does (Front PHSKY, analysis/front-phsky/RECOVERY.md §2).
  - `photometer-galaxy-name` (349 galaxy positions), see the typed reasons above.
- **Colours.** Start skips a selected object's colour term when it is ≥ 30 (0x4ffc39, 0x4ffcb4) and sums a neighbour's colours with
  no test (0x4ffe46..0x4ffed9); both are ported (`preparePhotometerBands`). No bundled record reaches them (no compact GSC, QSO or
  galaxy-table colour is ≥ 30), so `photometer-colour` is gone.
- **0.9 m and 4 m blends.** The native neighbour fold is the same for every telescope; only the seeing width differs. The former
  `photometer-blend` web limit is lifted for tiled targets (4 CLEA_VStrs.dat positions were refused at aperture 10); the mean bounds
  still apply. The bundled Pleiades 0.9 m / 4 m contracts keep their single-star rule.
- **Left typed:** the nil selection, the empty field, photographic-image fields and the engine's merge faults. Variables
  (`photometer-variable`, then 7997 GCVS positions) were done by Front PHVAR (below).
- **Tests:** `src/core/photometerPhtiled.test.ts` (NGC 7805, 00002+1837, A0000-3600, NGC 190, CLEA_QSO.DAT 2 and 2132, star
  N0000-01000 beside CLEA_QSO.DAT@39 at aperture 150 (the QSO counted once per list), the CLEA_VStrs.dat 20193 blend), `src/core/photometerColourBranches.test.ts`, `src/io/photometerTiled.test.ts` (journal, Record,
  session) and `tests/photometer-tiled.spec.ts` (M32: sky on a star patch, Sky refused on the galaxy, Object reading).

## Time-dependent variables at tiled pointings (Front PHVAR, 2026-11-05)

Static evidence and measurements: `analysis/front-phvar/RECOVERY.md` (excerpts.asm SHA-256 c9494b81…48db3); plan:
`analysis/front-plans/front-phvar.md`. Breadth only: E04 still uses the bundled Pleiades fields (none of the 24 photometer fields
holds a TRUE-dispatch variable; frames and readings unchanged).

- **What VIREO does [D].** The field's variable stage reads the observatory clock (0x487bcc on env+0x37de at 0x5986ab and 0x59878b,
  the clock as its timer tick 0x5384b0 last set it). A hit (0x59864d..0x59869b) renames the nearest GSC star to the variable's name
  and writes the model's V, B−V and U−B (+0x29/+0x2d/+0x31, dispatch 0x51ec48); a miss (0x59873e..0x5987a9) inserts a type-0 object
  with the variable's name and position. The telescope load 0x53be70 runs only when the Telescope view's cache misses
  (0x53a6c0..0x53a75f: a new pointing or field size, or env+0x3812, which the time dialog sets after the clock is changed, 0x58b413).
  The photometer's selection 0x53ce8c keeps a pointer to the star's list record (0x53cf1b) and Start reads its V (+0x29, 0x4ffbd7);
  no photometer method reads the clock or reloads the field (no call of 0x487bcc, 0x53a40c, 0x53be70 or 0x597ac8 in
  0x4ff400..0x502fff). So a reading uses the values of the last field load at that pointing.
- **Here.** `preparePhotometerTiledField` builds the field without a time first. If that frame is ready, no reading depends on the
  time and the frame and its `field` event carry no JD (every earlier pointing and session is unchanged). If the frame is typed by
  the variable stage, the observatory clock (`currentJd`, read once when **Use the telescope pointing** is pressed) is frozen and
  the field is built again at that JD, as the field spectrometer (G4a) and LSS do. The frame's selected star then carries the GCVS
  name and the model's values (hit: the GSC star's id and position; miss: `CLEA_VStrs.dat@<record>` at the variable's position),
  its neighbours likewise, and the bench says so in one line (with the JD and its UT date).
  - [W] One JD for the whole field, frozen when the student prepares it (Activate at a pointing, Point the telescope here or Use
    the telescope pointing; VIREO: the clock at each variable when the view loaded the field). Press Use the telescope pointing
    again to read at the current time; changing the clock does not rebuild a prepared frame.
  - Why a frame ready without a time needs none: a kept variable's values reach a reading only through the fold (selected or a
    neighbour at some aperture) or through a later stage that reads its V, and the only such stage is the QSO merge, which passes
    the QSO's V as the reference magnitude to 0x59a2e0 (0x597fda; review 1 L1). The galaxy cleanup and later variable merges pass
    reference 0. Measured as well: on the 352 pointings where such a frame holds a kept variable, the frames at 24 JDs over about
    four years give the same readings (U..I, apertures 5, 10, 20, 50, 100 and 150, Sky and Object).
- **Typed.** `photometer-variable` only when a kept variable without values is selected, within the aperture-150 neighbour
  query, or (any kept entry without values, at its own position, even one whose star a QSO replaced or pruned in this build) within
  the QSO merge guard radius (≤ 2′ + 0.006°) of a QSO of the field (no bundled pointing; synthetic tests pin both cases). With a JD only the model's own reasons remain: `variable-colour-residue` 9 and `variable-spectrum-dangling` 2 positions.
  The bench shows the reason in words.
- **Journal.** The `field` event gains `jd` only for such frames; the target id is `gsc:<ra>,<dec>:JD<jd>`. A history with it is
  owner **16** (`OpenVireo-photometer-variable-time-v16`, header as owner 15). Restoring runs the same two steps with the stored
  JD in place of the clock (never read on restore), so a JD on a field that does not need one is refused (one file form per state);
  owners 1–15 have no such event and replay and re-save byte-identically.
- **Measured** (`analysis/front-phvar/measure.tsv`; before: `front-phtiled/measure-v2.tsv`): over the 31147 CLEA_VStrs.dat
  positions, ready 14619 → 22589 (7621 at the frozen JD); `photometer-variable` 7997 → 11; at aperture 10 Start-ready with the
  0.4 m / 0.9 m / 4 m: 14553 / 14261 / 12833 → 22514 / 22199 / 20501. 27 fields once typed as variables are now
  `photometer-selection` (no object at the centre); `variable-spectrum-indeterminate` 18 → 7. Galaxy positions: the 8 variable
  fields become 5 ready and 3 `photometer-galaxy-name`. QSO, sky-grid and Pleiades sets unchanged.
- **Tests:** `src/core/photometerPhvar.test.ts` (GM And, record 0, a Cepheid hit, at two JDs: two magnitudes equal to the dispatch
  model; KU And, record 63, a miss; target ids), `src/io/photometerPhvar.test.ts` (clock read once, owner 16, restore at the stored
  JD, byte-identical re-save, Record/Review, a crafted JD refused), the synthetic QSO-guard case in the core test, and
  `tests/photometer-tiled.spec.ts` (GM And measured, recorded through Record/Review with ID GM And, saved, the shown JD checked
  against the saved one, and restored).

## Sky readings on a selected galaxy (Front PHSKY, 2026-11-06)

Static evidence and measurements: `analysis/front-phsky/RECOVERY.md` (excerpts.asm, witness tool, measure-*.tsv); plan:
`analysis/front-plans/front-phsky.md`. Breadth only: E04's bundled Pleiades fields never select a galaxy (unchanged).

- **What VIREO does [D].** Start's source preparation 0x4ffa30 sets Sky mode (+0x41c) from the slider (0x4ffa61). For a selected
  galaxy, 0x500568 in Sky mode reads 0x53e338 (the mean R+G+B of the 3 × 19 pixels at the centre of the Telescope display) and gives
  fraction 0 below 80 (0x50066d..0x5006b3); otherwise the galaxy's Object-mode fraction. "Reading Sky!" (0x4ffad9) uses the same
  gated fraction.
- **The display [D].** The render 0x53a40c copies the centre 312² of the 936² cache (CopyRect, SRCCOPY), then draws the
  photometer's overlay (instrument 2, table 0x53a947 → 0x53ad01): a red, 1-pixel Ellipse of radius = the aperture selector. The cache
  is 0x53b390's paint: black, galaxies (bank set 6, level − +0x6f8, stamp 0x59456c; NGC 224 skipped), then stars (99 × 99). Its scale
  is Field Creation Factor × Instr. Field: with the declared 1′ profile, 0.05° and 312 px per arcminute, so galaxies are drawn 15
  times larger than in the instrument field. `core/photometerDisplay.ts` paints only the 57 patch pixels, per telescope record.
- **Bounded, not reproduced.** GDI's stretch of the galaxy stamp (TBitmap.Draw 0x431714: STRETCH_DELETESCANS on a true-colour
  screen, phase undocumented) is bounded by the source footprint ± 1 pixel, and the Ellipse's pen pixels (only apertures 5..9 reach
  the patch) by a band around the circle [I]. The gate is decided only when the whole level interval is on one side of 80.
- **Typed.** `photometer-galaxy-sky`: the interval straddles 80 (small or thin stamps). `photometer-galaxy-sky-stamp` [W]: a painted
  galaxy needs stamp bitmaps beyond (2·2047 + 1)² pixels (VIREO allocates two per galaxy with no bound; whether Windows can is not
  determined; 13 galaxies of 13′ or more).
- **Web choices [W].** True-colour display (at 16 bpp a level could drop by up to 17; 45 decided gates with the 0.4 m lie that close),
  fresh view (no drift), the Telescope view in instrument mode (not the finder), no click mark (0x53d648).
- **Bench.** In Sky mode on a galaxy the bench says whether VIREO counts its light (level shown); the sky question is asked when the
  gate is open and a sky exists. No journal change: earlier sessions could not hold such a reading, and replay unchanged.
- **Measured** (`measure-before-*.tsv` / `measure-after-*.tsv`): 20271 galaxy frames (20264 CLEA_GLX.DAT, 3 CLEA_QSO.DAT, 4
  CLEA_VStrs.dat positions) had every Sky reading refused. Now, at apertures ≥ 10 with the 0.4 m / 0.9 m / 4 m: decided 20185 / 20186 /
  20189 (open 20126 / 20147 / 20164), `photometer-galaxy-sky` 73 / 72 / 69, `-stamp` 13. At aperture 5: 110 / 89 / 73 undecided.
- **Tests:** `src/core/photometerDisplay.test.ts` (geometry, pen band, levels, gate rule), `src/core/photometerDisplayWitness.test.ts`
  (11 cases against the independent Python model `analysis/front-phsky/tools/phsky_witness.py`, and record 3770's stamp bound),
  `src/core/photometerPhtiled.test.ts` and `src/io/photometerTiled.test.ts` (NGC 7805: open gate, question, Sky = Object source), and
  `tests/photometer-tiled.spec.ts` (M32: open, "Reading Sky!" asked; record 1978: closed, no question).

## Instructor parameters (Front T6, 2026-11-06)
The options dialog's Photometer tab edits (Base Magnitude, Sky Magnitude, Base Photon Count, Timer Wait; record +0x250c, +0x2510,
+0x279f, +0x27a3; `src/core/instrumentParameters.ts`, docs/OPTICAL-OPTIONS.md, `analysis/front-teacher/t6/RECOVERY.md`) reach the
photometer at its next Start. With the compiled values (6, 16, 1000, 100) nothing changes: no journal event, the same code path, and
every reading, witness and pinned field above is byte-identical. Any other value is **uncertified-parameter**:
- the reading is measured with VIREO's formulas [D]: zero point Single(BaseMag + correction) + 5 (0x53df4f, 0x500976), sky
  V = SkyMag, B = V + 1.0, U = B + 0.33 (0x4ff6aa), means and base-count sum × BaseCount (0x501506, 0x501582), callbacks per period
  at a Timer-ms interval (0x500a01, 0x500a43): ⌈1000·s / Timer⌉, except that since Front PHCALLBACK new sessions count VIREO's
  Extended elapsed sum, one more at 18 tie pairs [D] (docs/PHOTOMETER-INTEGRATION.md; owner 17 histories keep the nominal count);
- the values travel as a `parameters` event (owner 17, `OpenVireo-photometer-instructor-parameters-v17`), and an untimed session first
  takes its shown 0.1 s × 1 timing (the only form that admits the event);
- the reading records them and shows `photo-uncertified` (review 1: so does an object reading reduced with an uncertified sky); E04's
  summary and cluster points leave both out (the pinned Pleiades fields and the contracts' maxima hold for the compiled values only);
  [W] the mark is not carried into the native Record/Review rows or the shared Observational Results list (no field for it);
- the limits are recomputed with the instructor values: the photometer's per-callback Poisson bound (10⁶) and the all-duration 32-bit
  count over 5·⌈100000 / Timer⌉ callbacks (Front PHCALLBACK: 5 × the exact 100 s period in new sessions), for tiled and bundled
  targets, and the base-count sum; a target beyond them refuses Start;
- the PHSKY display gate does not read these fields (it uses the telescope record's +0x6f8 and the stamps) and is unchanged.
- PHCALLBACK review 1 (fix): the Yes to VIREO's "Reading Sky!" question survives the `timing` and `parameters` events the web Start
  records between the answer and itself (earlier the first Start after changing instructor values failed with `confirm` and a second
  Start was needed); any other event still drops it, and it stays one-shot.
