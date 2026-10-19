# Stellar acquisition → analysis → measurement → saved replay

The existing analyser now accepts the supported catalog-star exposure directly. This closes the current instrument's continuity; no additional instrument is introduced. The local entry is http://127.0.0.1:5173/#observatory and the exposure shortcut is http://127.0.0.1:5173/#star-exposure.

## How to test the complete feature

These control names and steps are exercised by `tests/star-analysis.spec.ts` in the local automated browser.

1. In **Target**, choose **N0000.DAT@14428 · supported star**. Click **Open dome ↗**, **Point telescope ↗**, and **Switch to telescope view ↗**. **Acquire supported star** becomes enabled only at the exact supported pointing and telescope view. Click it.
2. Click **Activate supported star field**, then **Start star exposure**. Let counts accumulate for a few seconds and click **Analyze acquired star**. This pauses before transfer. Expect **Align stellar lines.**, **Acquired star · source + sky**, an assigned stellar template, and a provenance panel showing the committed time, current random state and draw count. Ordinary elapsed time and counts depend on browser callback timing; do not expect an exact fixed total from a manual wait.
3. Enter **0.0001** in **z step per tick**, click **Apply step**, move the slider one tick, then click **Record measurement ↗** and **Save measurement**. Expect one log row marked **Stellar acquisition · excluded from Hubble**. This records a manual line-alignment shift; it is not a claimed correct astrophysical velocity. In **Hubble diagram & distances**, **Add saved measurements** stays disabled when the log contains only stellar rows.
4. Click **Save session**. Reload the page and use **Restore session** to select that JSON. Expect the same stellar curve, line-alignment controls, log and raw acquisition provenance. Click **Restore this acquisition in the telescope**: time, all600 integer bins, source/sky totals, draw count and current seed must match the saved snapshot. It is stopped/deactivated. **Activate supported star field** then **Start star exposure** resumes from the retained random state.

The automated1s scenario uses ten committed100ms callbacks and seed1; it verifies2092 source counts,28 sky counts,14120 uniforms and current state2842161081. This is a deterministic selected-contract test, not a timing promise for manual use or native x87 equivalence.

## Back navigation, object changes and old measurements

- Browser Back after analysis preserves the paused/deactivated telescope segment. Sending the identical snapshot again preserves its existing analyser controls and measurement log.
- Changing the observatory target or pointing does not relabel or replace an acquired stellar observation. A galaxy library preview cannot become its baseline or provenance. The acquired source remains N0000.DAT@14428 with its assigned A0000049.SP template.
- Importing another spectrum changes the current analyser input while preserving archived acquisitions and linked stellar rows. **Reopen acquisition 1 · … ms** selects an archived exposure; **Inspect acquisition for measurement 1** also restores that row's saved alignment controls.
- **Restore this acquisition in the telescope** is an explicit snapshot replacement, not ordinary navigation. Its help explains that it replaces the current telescope segment. The snapshot remains unarmed until explicit activation; restoration never starts a timer or follows the current observatory object.
- A downloaded normalised curve that uniquely matches a retained acquisition keeps that known provenance when re-imported. Ambiguous normalized matches require explicit snapshot selection. A standalone external file without its acquisition journal remains an imported-file claim; filenames and labels cannot certify acquisition.

## Recovered contracts and explicit bridge behavior

No acquisition physics changed. STAR-EXPOSURE.md pins the complete128-star field, selected original spectral index/template, native profile bank,936² raster,312² crop, slit level41, fraction1, Single magnitude, source/sky amplitude, sampler and source-then-sky Poisson order.

`io/starObservation.ts` creates a stopped immutable snapshot, replays and checks every in-memory counter against its scientific journal, and uses the existing recovered VIREO save adapter: integer source-plus-sky bins divided by the positive maximum, six-decimal intensities, repeated wavelength addition and two-decimal wavelength labels. This is a new headerless derivative for the existing normalized analyser parser. The original600 integer bins are not replaced by the normalized curve, and no background subtraction, smoothing, new photons or additional noise is introduced. Empty/all-zero exposures cannot be sent to this analyser because max normalization would be undefined.

The original native output contracts are traced in DETECTOR-STATIC-CONTRACTS.md, SKY-EXPOSURE.md and the save dossiers: save0x50fb1c/0x510090, count/maximum normalization and per-row wavelength formatting. Number/dot-decimal output remains the declared browser adaptation. The connector and snapshot archive are new web behavior, not a recovered native in-memory handoff.

An acquisition ID is SHA256 of the canonical stopped star-session JSON. The normalized derivative has its own separate SHA256. The acquisition tag, source file identity and journal stay attached to measurements even if the operator changes their object label. Repeated exports/reconstruction are deterministic under the supported policy.

## Portable session and scientific boundaries

Analysis session version3 adds a bounded acquisition archive. It stores only the acquisition ID and strict star replay journal; current stellar observations and measurement origins reference that ID. On restore the app revalidates the fixed policy, source/field hashes and exact domain, replays all counters/RNG, regenerates the normalized derivative and checks linked row file/digest identity. Imported means, cached counts, changed journals, missing links, duplicate IDs and origin stripping against a retained known stellar digest are rejected atomically. An invalid restore keeps the current analysis.

Version1/2 imported-file sessions retain their existing migration and byte-preservation behavior. Sessions with no acquisition archive continue to export version2. Measurement CSV remains schema2 for legacy-only logs; logs with acquisition provenance use schema3 and add `source_kind`/`acquisition_id`. Raw counts remain available through the exposure CSV and replay journal; a measurement CSV alone is not an exposure backup.

New web bounds are eight archived snapshots,24000 total archive events,1000 measurements and the existing16MiB analysis-session file limit. Each star journal retains its existing12000-event segment bound and fixed supported domain. Full original source assets are not copied into a portable session; restoring requires this app's matching bundled policy/data.

Stellar rows are excluded by UI selection, Hubble workspace validation, direct derived analysis and velocity CSV handling. Their manual line alignment is not converted into galaxy distance, cosmological velocity or a Hubble diagram point, even if renamed to a galaxy. Other imported/manual inputs remain operator claims under the prior documented rules.

No original CLEA execution, new dependencies, external review, Windows, public upload/deployment or push was used. The previously pending external reviews were not retried. Screenshots are `.local/qa/openclea-star-analysis-{desktop,mobile}.png`.
