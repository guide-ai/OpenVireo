# Several acquired galaxies and a manual Hubble diagram

**Current bounded set,27 October2026:** the code supports eight of the original13targets: the earlier three on their verified profiles, CorBor‑1/3 on0.4m through the cached view and the three Pegasus galaxies on0.4m (Phase 2 B2 below). E01 remains open until the complete eight-target E2E and review; the status board is unchanged. Earlier sections retain their dated scope.

**Follow-up,19 October2026:** [Mayall4m star and three-galaxy acquisition/full14](MAYALL-ACQUISITION.md) now extend the verified profiles, retaining earlier data/formats and the0.9m star300ms bound. The earlier evidence below retains its dated scope.

**Follow-up,19 October2026:** [Three KPNO0.9m galaxy acquisitions and investigation13](KPNO09-GALAXIES.md) now add independent galaxy profile/target journals and verified manual Hubble continuity. The earlier bounded evidence below retains its dated scope.

Local entry: http://127.0.0.1:5173/#galaxy-exposure. Observatory: http://127.0.0.1:5173/#observatory. The final verification receipt records the exact tested link and build.

The supported set now contains three original designated Hubble galaxies. UM-I1 adds an elliptical target in the same grouping as UM-I2; CorBor2 adds a different field/grouping. All use original GLXYTMPL.SP through the native fallback branch, with the same explicitly adapted nearest-center raster and fixed 4000–5000 Å interval. They are simulated source-plus-sky acquisitions; source generation does not supply the student's measured z.

| Acquisition galaxy | Raw catalog record | Exact supported pointing (RA h / Dec °) | Final field | Regions / compact band | Slit level / fraction | Original V reference |
| --- | --- | --- | --- | --- | --- | --- |
| 36747 · UM-I – 1 | 12109 | 11.781083333333333 / 55.705555555555556 | 109 stars, 7 galaxies | 3835 / N5230 | 44 / 0.0484 | 15.6 · Hubble Data.xls, Sheet1!C2 |
| 36773 · UM-I – 2 | 12119 | 11.789361111111111 / 55.68888888888889 | 114 stars, 6 galaxies | 3835 / N5230 | 50 / 0.0625 | 15.8 · Hubble Data.xls, Sheet1!C3 |
| 54876 · CorBor – 2 | 18484 | 15.3735 / 27.72222222222222 | 141 stars, 6 galaxies | 2028,2031 / N2230 | 49 / 0.060025 | 16.0 · Hubble Data.xls, Sheet1!C9 |

The original workbook SHA256 is 09ac2e0bd4499e4a4796cf64981b3958d264f92b710b1ac9e3324340054fc7ed. Only its V-reference cells are shown in the acquisition help; its example redshifts and velocities never initialize acquired measurements. Reference V values agree with the rounded original catalog magnitudes. These are documented reference values, not photometry measured from the spectrum or detector crop.

## Feature 1: acquire and revisit each target

1. Open the exposure link. In **Acquisition galaxy**, choose **36747 · UM-I – 1**. Click **Activate supported galaxy field**, then **Start galaxy exposure**. Expect the target's exact pointing, its own raw source/sky counters and detector crop. **Original magnitude reference for Hubble** shows 15.6 and Sheet1!C2.
2. While exposing, choose **54876 · CorBor – 2**. The old exposure pauses and deactivates; the new one has a separate segment. Click **Activate supported galaxy field**, then **Start galaxy exposure**. Its field contains 141 stars and six galaxies; its magnitude reference is 16.0, Sheet1!C9.
3. Choose **36747 · UM-I – 1** again. Expect its earlier elapsed time, counts, seed and draw count retained, with **Start galaxy exposure** disabled until explicit activation. Switching targets does not relabel or continue the previous clock. The same behavior applies to **36773 · UM-I – 2**.
4. Alternatively, use **Target** in the observatory. Under **Supported acquisition**, choose the desired `… · supported galaxy`, then **Open dome ↗**, **Point telescope ↗**, **Switch to telescope view ↗** and **Acquire supported galaxy**. The exposure selector opens on that target. These supported entries use exact catalog centers; the original hot-list entries retain their rounded coordinates.

Each segment uses its displayed browser seed. Equal seeds reuse the same uniform random stream and do not imply statistically independent noise. Choose another seed and **New seeded exposure** when studying a different realization; this clears that target's current live segment. Separate journals are a declared web lifecycle adaptation, not recovery of CLEA's process-wide global RNG continuity across object changes. Sky/star segments retain their earlier behavior.

## Feature 2: measure three acquired curves manually

1. Accumulate a useful exposure for each target, preferably 2–3 minutes for line inspection, then click **Analyze acquired galaxy**. Positive short exposures are allowed but can be too noisy for accurate alignment.
2. Expect **Measure the acquired galaxy.**, **Galaxy acquisition provenance** naming the correct catalog ID, an unshifted rest template, z **+0.000000**, an unconfigured step and a disabled slider. Configure **z step per tick**, click **Apply step**, align the reference lines yourself, then **Record measurement ↗ → Save measurement**.
3. Use **Galaxy exposure**, select the next target and repeat. Each distinct snapshot starts with unconfigured measurement controls. Reopening the identical archived snapshot preserves its existing controls. Changing the editable object label does not change the target bound to the acquired curve.

The automated continuity test deliberately selects step 0.001 and positions 49,51,68 for UM-I2, UM-I1 and CorBor2. Those are test inputs chosen by the operator, not an automatic answer, a grading reference or a claim that a 1s spectrum measures those shifts accurately. Scientific count tests independently check five trajectories per target; manual callback timing need not match a test's totals.

## Feature 3: build the diagram from saved acquisitions

1. Open **Hubble diagram & distances**, click **Add saved measurements**, and choose **VIREO targets + student manual · M = −21.4 · fit through zero** in **Distance and summary recipe**.
2. For each row, enter its apparent V and source explicitly using the table above or another documented input. In **VIREO target identification · row …**, identify the corresponding acquired ID. The selector disables other IDs for an acquired curve. Renaming a measurement cannot certify a different target. Reference magnitudes are not entered automatically.
3. With at least two distinct complete acquired targets, expect velocity-distance points and the orange origin-fit line. Three complete rows give three points. The velocity uses each saved manual Single z; the distance uses the chosen absolute-magnitude assumption and the entered V. The fit is the existing unweighted mathematical implementation of the student manual.
4. Repeating a measurement of the same acquired galaxy does not create another independent target. Adding that row to Hubble produces **Repeated acquisitions of the same galaxy are not independent Hubble targets…**, and the summary/diagram is withheld. Use **Remove row …** to retain one Hubble row per acquired target. The measurement log remains intact. Stellar rows remain excluded.

UM-I1 and UM-I2 belong to the same grouping, so three galaxies do not represent three independent cosmological environments. Intrinsic luminosity differences, peculiar velocities, manual alignment error, noise and the shared fallback template limit interpretation. No fit value is a new determination of H0 or a native-runtime equivalence claim. Original worksheet examples remain a separately labelled, read-only source route; they are not mixed into this acquired dataset.

## Feature 4: save, restore and export the complete investigation

1. **Save session**, reload, then **Restore session**. Expect all acquired snapshots, their target IDs, student controls, linked measurements, Hubble recipe/input drafts and recalculated points/fit to return together. The normalized derivative is regenerated from replayed raw counts, not trusted from imported counters.
2. Click **Inspect acquisition for measurement 2** (or the relevant row), then **Restore this acquisition in the telescope**. Expect **Acquisition galaxy** to select the packet's target, with its exact 600 integer bins, totals, time and RNG, stopped/deactivated. Explicitly activate/start to resume. Other retained live segments are not overwritten.
3. **Save galaxy session JSON** saves the selected segment alone. To import it through its file control, select that same **Acquisition galaxy** first. A different-target journal is rejected atomically, preserving the current segment paused. The analysis-session restore can restore an archive containing all three targets.
4. **Export CSV ↓** writes measurement schema4 when target tags are present, adding `acquired_target_id`. **Export Hubble CSV** uses schema2 and retains acquisition kind/ID/target alongside source inputs and derived values. The velocity CSV uses schema2 for provenance-bearing logs. Legacy-only measurement CSV schema2 and legacy stellar provenance schema3 remain supported; old analysis sessions and the original 36773 journal are replay-compatible. CSV is not a replay backup.

Archive bounds remain eight snapshots, 24000 total archived events, 1000 measurements and 16MiB per analysis session. Per-target journals retain the 12000-event and 2MiB limits. These bounds are enforced before archive replacement; invalid imports preserve the existing analysis.

## New recovery evidence and remaining exclusions

Research is retained under `analysis/multi-galaxy-recovery/`. `target-inventory.json` records each field, template, hashes, slit and exclusions; `original-source-manifest.json` covers 13 unchanged original sources, including the workbook and new N2230 band. Each new field has a generator, full original admission/seek witnesses, merge trace, source-range records and independent Python/Decimal100 vectors. `data/hubble/galaxy-36747-{provenance,vectors}.json`, `galaxy-54876-{provenance,vectors}.json` and the pinned field JSONs are their bundled counterparts. The original 36773 field/source hashes and canonical journal are retained.

CorBor's neighboring 54868 has raw axes 0/0 and morphology 0. Recovered0x53b94c supplies ratio 0.6;0x5943d4 substitutes major 0.5′, giving raster radii 5,3;0x599324/0x55ea94 use minor 0.5×0.6 as Extended/Number, without a new Single narrowing. Other zero-axis morphology/RA-fraction branches remain unsupported. The selected54876 itself has supplied 0.4′×0.4′ axes.

Raw 54890/54891 records share identical Double coordinates. Comparator0x5969e0 and insertion0x492728 place a newly inserted equal key before the old equal key: native field order is 54891 then 54890. Both are retained and painted. Neither is claimed as an acquired target in this increment; the original hot-list identity/pointing ambiguity remains explicit. No duplicate source record was silently discarded.

Not enabled: UM-I3's photographic field; Coma's broader QSO/zero-axis composition; Boötes's variable/QSO fields; Pegasus variable-star phase/context; unregistered Corona Borealis targets. CorBor1 shares the recovered field but is intentionally outside this small enabled set. The incomplete paths are not filled with invented images, spectra, amplitudes or measured results.

All targets retain the explicit nearest-center image scaling, Number/Math nearest-even, browser seed/timing policy and 4000–5000 Å domain. Native GDI device/palette/kernel behavior, x87 equality and original runtime trajectories remain unverified. No original execution, emulator, installation, Claude, Windows, public upload or push was used. External reviews remain pending under the existing restriction.

## Phase 2 B1: CorBor – 1 (54875) and CorBor – 3 (54891), 0.4m only

At the B1 checkpoint: 5 of the 13 original Hubble.HTL targets were supported; the phase-2 minimum (at least 8 of 13 plus a complete E2E) was **not** met and E01 stayed open. The criteria in STUDENT-EXERCISES.md are unchanged.

Route B (`data/hubble/corbor-cached-provenance.json`, gate report `hubble-fields-student-phase2-gates.json`). Static bounded disassembly of CLEA_VEO.exe 781bc970…c54c recovered the cached-pan branch: the cache initializer0x53c198/0x53c1c3..0x53c236 stores anchor 936/2 = 468 and zero offsets; the fresh crop stores origin312; the projection0x53c9d4..0x53ca46 sets offset = anchor − projected pointing; the pan0x53a6ca..0x53a723 takes round(origin − offset) and the guard0x53af28 requires the unrounded 0 < left, top < 624; with the same configuration and no forced refresh,0x53a741 skips loader0x53be70 and CopyRect0x53a845..0x53a8dd copies the cached bitmap. `cachedGalaxyViewport.ts` enforces exactly these preconditions and rejects refresh, other configurations, the guard and any source hole.

The web explicitly initializes the verified complete 54876 field (141 stars, 6 galaxies, snapshot 7413ec…3ce1, centre 15.3735 h / 27.72222222222222°) and pans it to the exact catalogue centre of the target (54875: 15.3735 h / 27.738888888888887°, record18485; 54891: 15.3785 h / 27.6725°, record18493). The field centre stays distinct from the telescope pointing (`domain.view`); the field is never recentred, extended or relabelled, and the original process history is not inferred. Rectangles: 54875 (312,291)–(624,603), 54891 (229,374)–(541,686). The slit query is the integer crop origin + 156: the recovered nearest selection (radius3) accepts the subpixel residuals 0.2 and 0.1189…; 54891 precedes 54890 at identical coordinates, so it is chosen without sorting or deduplication. The old three keep their fresh distance-0 guard. Slit levels 39/25 give fractions 0.038025/0.015625.

Spectrum: GLXYSP.LST (0a7a35…166a, 48 NGC####.SP names) has no entry for either identifier, so the existing GLXYTMPL.SP fallback at 1 + catalogue Single z applies; all 600 channels of 4000–4998.33 Å stay inside the shifted 3650–7000 Å template, with no continuation. Catalogue z is internal to generation only; manual z starts unconfigured. Hubble V references are the workbook values 16.9 (Sheet1!C10) and 16.3 (Sheet1!C11), shown as references and never prefilled.

Hubble.HTL: **Load original Hubble.HTL** checks 1118 bytes and SHA-256 02cab4…7986 before parsing; each row reports its status or unavailable reason (`hubbleHotList.ts`). Rounded HTL coordinates cannot activate acquisition; **Use exact catalogue centre** points at the catalogue centre. The KPNO 0.9m and Mayall 4m show an explicit unavailable notice for these targets and the telescope is never switched automatically. Sessions with these targets use the v24 wrapper (unchanged v1..23 base plus the 0.4m banks); their journals are rejected in any earlier version.

Adaptation: CorBor – 1/3 reuse CorBor – 2's nearest-centre raster, Number/Math nearest-even, the fixed 4000–5000 Å interval and browser seed/timing through the recovered cached view, 0.4m only. No native GDI/x87/runtime identity is claimed.

## Phase 2 B2: Pegasus – NGC 7499, NGC 7501, NGC 7503 (0.4m only)

Status: the agreed minimum-eight E01 web student path is technically validated and separately reviewed, with all four unchanged student criteria covered by the actual-App E2E. Build/typecheck, 3105 unit tests and 1289 resource identities passed on the final corrected candidate; the initial 114 distinct browser cases and 19 affected closure reruns passed, without summing repeats. The code supports 8 of the 13 original Hubble.HTL targets; neither the count alone, the unavailable remaining five nor other phase-2 observatory functionality is presented as the complete original exercise. See STUDENT-EXERCISES.md for status and evidence, separate from criteria.

Field (`data/hubble/pinned-pegasus-field.json` 61fc0129…879c, `pegasus-field-provenance.json`, builder `pinnedPegasusField.ts`): the fresh NGC 7501 domain (record 0 only; centre 23.17511111111111 h / 7.588888888888889°, regions 582/583/1161, bands N0000 then N0730, key 231498902). 46 + 98 = 144 admitted stars; CLEA_QSO.DAT (2269 records) and GLIMAGES.LST (183) have no position match. One CLEA_VStrs.dat record matches the area: HI Peg (record 30685, class string `EA/SD`). `variableMerge.ts` reproduces the recovered branch only: nearest merge with reference magnitude 0 (three zero DWORDs 0x598600..0x598604 before 0x598608), exact table classification 0x4bc834 (EA/SD is in no table → class 3), class‑3 dispatch with nonzero period and word48 returning false (0x51ee57/0x51ee7c), restore of the hit record (0x5986c0) and no miss insertion (0x5987a1). The hit star N0000.DAT@1141949 keeps its record and order; nothing is removed or inserted. Classes 0/1/2, zero period/word48, a prune below the saved winner, a null lookup and boundary precision are rejected. Galaxy cleanup (70593, NGC 7499, NGC 7501, NGC 7503 in that order) removes N0730.DAT@1032764 (70593 runner prune), @1033014, @1033088 and @1033201, leaving 140 stars and 4 galaxies. 70593 (morphology 20, supplied axes) is only a painted neighbour, never an acquisition target.

Views (`pegasus-cached-provenance.json`): NGC 7501 is fresh (selection at (468,468), distance 0, radius 5, slit level 74, fraction 0.1369). NGC 7499 and NGC 7503 are cached pans of that verified view at their exact catalogue centres: rectangles (354,321)–(666,633) and (251,339)–(563,651), radii 12 and 8, residuals 0.2486… and 0.3528…, levels 164/114. Source means stay below the existing bound (maxima 1.69, 4.30 and 2.07 < 12 at 1000 ms). GLXYSP.LST has no entry for the three names, so GLXYTMPL.SP is used at 1 + catalogue Single z; all 600 channels lie inside the shifted 3650–7000 Å source. Crops, levels, fractions, amplitudes and bounds are compared with `pegasus-independent-vectors.json`. V references 14.1/14.7/14.4 (Hubble Data.xls Sheet1!C12–C14) are documented inputs, never prefilled.

Hubble.HTL rows 11–13 report these targets on the 0.4m; the KPNO 0.9m and Mayall 4m show an unavailable notice and the telescope is never switched. Sessions with Pegasus targets use the v25 wrapper (an unchanged v1..24 base, so it can enclose the CorBor v24 wrapper, plus the Pegasus 0.4m banks); Pegasus journals, banks or context are rejected in any other file, and base, CorBor and Pegasus journals share the existing 24000-event budget, counted before replay. Archive (12 snapshots) and journal limits are unchanged; eight 120 s acquisitions at the 100 ms tick use 9616 events.

Adaptation: Pegasus: NGC 7501 fresh field and cached views for 7499/7503 on 0.4m; HI Peg variable not modelled (unsupported class, no light curve); browser raster/timing. No native GDI/x87/runtime identity is claimed.


## Feature 5: acquired SSP download and reimport

The analyser now offers **Download acquired SSP** alongside **Download analysis
spectrum** and **Save session**. The SSP has the recovered `*SpHdr* ` header,
bound target ID, telescope pointing and catalog magnitude, then the same 600
normalized source-plus-sky bins. Edited labels and manual z do not enter it.
Reimport via **Change file ↑**: the header is shown as **Imported SSP metadata**,
with zero/unconfigured measurement controls and no acquired-origin assertion.
Hubble inputs are never initialized from that header. Save/restore preserves
its exact bytes and hash. Keep the pre-export JSON to restore raw acquisition
counts/time/RNG; SSP alone cannot do so. Errors and picker cancellation preserve
the previous analysis. Full profile, evidence and exact test steps are in
[SPECTRUM-SAVE-CONTRACT.md](SPECTRUM-SAVE-CONTRACT.md#try-the-feature).
