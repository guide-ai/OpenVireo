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

Record0x501e7c calls0x54a73c for an existing live collection record or a newly appended record, fills coordinates/band fields **before** ShowModal, then derives self+0x6b0 from ModalResult1. The exact Cancel handler0x54b2dc only clears a byte at global5bcae4 instance+0x480. Startup0x5ad58a, pointer0x541a0c→VMT0x541a58 and class evidence identify this as **THRDisplayForm1**, not the observation collection or modal result pointer. No direct observation rollback occurs in that handler or the caller's post-cancel branch. Full modal-close dispatch and original save/load are still not certified; no invented transactional cancel behavior is implemented.

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
- **Typed reasons** (`PhotometerTiledReason`), never approximated:
  - `photometer-galaxy`: a galaxy in the field. The photometer's treatment of the galaxy list is not recovered; M31's core
    gives this reason.
  - `photometer-qso`
  - `photometer-variable`: a TRUE-dispatch variable star, whose values depend on the clock.
  - `photometer-selection`: no star selected at the centre.
  - `photometer-population`: an engine gate.
- **Mode independence:** the source does not depend on the reading mode (G3b). A positive central fraction gives the known
  colours of the central star and its neighbours. A zero fraction with no admitted neighbour gives the literal 30. Neighbour
  light without central admission is `photometer-central-unadmitted`; a missing colour is `photometer-colour`.

## Photometer at the telescope pointing (Front G, G3b)

The photometer measures where the telescope points, from the tiles. The student then chooses Sky or Object and integrates, as
in VIREO. Static evidence is in `analysis/front-g-gsc/RE-photometer-start.md`.

- **Activate keeps the pointing (G3 review 1 M1).** VIREO's FormActivate (0x4ff8b0) never moves the telescope: it selects the
  nearest object where the telescope points (0x53cf94 → 0x59a0fc).
  - When the student pointed the telescope themself (the App's `studentPointed`: a pointing that is neither the initial one
    nor the bench's own prepared field), Activate keeps it and reads the field there from the tiles.
  - At an admitted PLEIADES.HTL position, or from the initial pointing, Activate keeps the earlier E04 behaviour: it selects
    that target or moves to the bench's known Pleiades field (a web orchestration).
  - **Use the telescope pointing** reads the field again after the telescope moved; before Activate it activates here.
- **One checked way to move from the bench (G3 review 1 M2).** Leaving the Photometer screen releases the bench, and Activate
  starts a fresh context with empty skies, so the bench keeps **Point the telescope here** for "sky on a clean patch, then
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
  - Tiled targets get the same limits as typed reasons that block Start (`tiledPhotometerReason`): `Poisson-mean-bound`,
    `all-duration-count-domain`, and at 0.9 m and 4 m `photometer-blend` (neighbours other than the selected star). The blend
    rule is a web validation limit [W]: the bounded 0.9 m and 4 m profiles were checked only for single stars (their Pleiades
    contracts), not a recovered VIREO branch.
- **Notebook and B−V** work for tiled stars. They never count toward the Pleiades exercise, whose summary reads only Pleiades
  rows.
- **Skies and E04 (G3 review 1 L3, web rule [W]).** VIREO keeps one sky per filter and telescope bank, wherever it was read, and
  reduces any object reading with it; the web keeps that for the reading itself. E04's count (`pleiadesExerciseSummary`) and
  its cluster points (`pleiadesPoints`) take only Pleiades object readings whose sky was read at a bundled Pleiades field
  (`pleiadesSkyContext`); a Pleiades reading reduced with a sky taken at a tiled pointing is shown but not counted.
- **Tests:** `src/io/photometerTiled.test.ts` (journal, session round trip, telescopes, sky question, E04) and
  `tests/photometer-tiled.spec.ts` (browser flow, and M31 typed).
