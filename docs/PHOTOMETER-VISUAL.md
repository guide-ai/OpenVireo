# Visual Pleiades V photometer — 18 October 2026

**UBV follow-up:** [PHOTOMETER-UBV.md](PHOTOMETER-UBV.md) now adds U/B, independent filter sky and B−V from explicit confirmed observation pairs. The V-only increment below remains its original scope.

A usable bounded observing flow is available at **http://127.0.0.1:5173/#photometer**, also reached through **Pleiades photometry** in the main navigation. It uses the complete original source/neighbor fields and numerical contracts already verified in [PHOTOMETER-FIELD.md](PHOTOMETER-FIELD.md). No console commands are required.

## Try the complete interaction

1. Open the photometer. The initial reproducible seed is42. Click **Activate Pleiades photometer**. Its dedicated context begins at **Sky position** and requires fresh V sky.
2. Click **Start integration**. After one100ms callback the status reads **Integration complete** and total sky-position photons are1.
3. Select **Target position · 01803-00478** under **Photometer pointing**, then **Start integration**. The initial pair produces552 total target photons and displayed reduced V **9.647121003**. Source550+sky2 are added; the earlier sky1 is subtracted during reduction. No catalog magnitude is used as a learner answer.
4. Click **Add notebook entry**. **Your transcribed V magnitude** starts blank. Type the reading you observed, optionally add a note, and choose **Confirm notebook entry**. **Cancel notebook entry** or Escape leaves the notebook unchanged; reopening starts a blank draft. A confirmed entry is explicitly a manual transcription, not an automatic grade.
5. Click **Save photometer session**. It releases the telescope and downloads `openvireo-pleiades-photometer.json`. Reload the page and use **Restore photometer session**. Acquired counts, seed history and manual entries replay. The context remains inactive; activate and acquire fresh sky before any further target integration. Repeated saves preserve identical journal bytes.

The raw-count/reproducibility disclosure shows source/background components, current random state, completed-reading count and the initial-seed control. **New seeded session** clears this photometer's counts and notebook; it does not edit spectrum analysis. To repeat the first pair exactly, release the context, enter42 and press **New seeded session**, then repeat steps1–3.

**Stop integration** before the sole100ms callback completes produces no completed reading or random draw. Another Start begins a fresh integration. With this deliberately short profile, no positive partial-callback state exists. Leaving the route, hiding the tab, releasing the context, saving or restoring cancels pending callbacks and requires fresh sky on reactivation. None of those actions fabricate an integration. Controls prevent pointing changes while running and prevent target acquisition without current-context sky.

## Scientific scope

This is VIREO1.504's one pinned original Pleiades target, native nameN2230-00478/HTL label01803-00478, and the verified sky position0.01° north at the same RA. The explicit base field option is1′, native multiplier3, cached field0.05°/936pixels, fixed telescope0, aperture selector10, seeingSingle3, prepared zero point9, V, one0.1s integration and1000 base photons per100ms callback. The1′ option is a declared non-default profile, not the original15′ default or an observed native preset.

The drawing displays original catalog positions and a schematic aperture. It is not a detector image, a synthesized stellar-brightness picture or an assertion of original renderer equivalence. Complete object/sky populations have3/4 sources and no additional admitted aperture neighbors. The existing flat-distance, interpolated aperture table, original Single UBV conversion, native0.0025° neighbor margin and source-then-sky Poisson/random-state order are reused. Zero aperture still retains the native magnitude30 source leakage. Number/Math and explicit seed remain adaptations; no native x87/binary execution equivalence is claimed.

No other telescope/filter/aperture/seeing/integration/target or generated-cluster option is exposed. In particular, the screen does not simulate unsupported telescope changes using telescope0 calibration. Broader switch/return validity and native modal/file compatibility remain open contracts. I01/E04 advance to **partial**, not complete.

## Native state review and explicit web boundaries

[Visual provenance](../data/photometry/visual-provenance.json) adds nine bounded original byte/listing captures, five supporting source/license/evidence hashes and exact native/new-behavior separation. Raw analysis stays outside web source in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-visual-recovery/`.

- Start0x500945 calls0x500bcc: elapsed/source/sky/total/base-count accumulators, integration count, SNR and list are reset. No reseed occurs there. Stop0x500b58 disables the timer and unlocks through0x501abc; it does not reduce or invoke Record. Within the fixed one-callback profile, Stop before completion preserves the seed and makes no observation; Start retries from clean counters.
- Current negative sky-bank/filter gating and per-aperture normalization are retained. Constructor bank initialization and activation bank selection are already documented. Telescope setup0x53df24 stores/calibrates a telescope, but this new capture does not establish clearing all photometer banks. The manual requires fresh sky after a telescope change, including a return. The web **release/reactivation** boundary deliberately invalidates sky; only telescope0 exists in this screen. This conservative web policy is not presented as recovered general native bank switching.
- Native CloseQuery0x501b84 checks an enabled control and unrecorded flag; Yes0x501d16 invokes Record, and Cancel0x501d21 clears canClose. Native Record modifies a live result before modal review; its Cancel handler clears THRDisplayForm1+0x480. The original result collection initialization0x546dea uses0x90-byte records, distinct from0x5f neighbor entries. These native behaviors are documented rather than relabeled as an atomic undo contract.
- The inherited **SaveasText1Click**0x59e92c iterates displayed list strings at0x59eb49–0x59eb9f, writes string/newline, then closes the text file. This inspected report branch is not a raw-observation replay schema. Exact native report formatting and native result import are not ported.
- The manual notebook is an explicit new OpenVireo interaction: a blank user-entered V value from−50 to100 and an optional note up to500 characters, confirmed once per completed object reading. Cancel has no notebook mutation. Native Record/modal equivalence is not claimed. The instrument's computed reading remains separate from the user's transcription.

## Portable file and compatibility

`OpenVireo Pleiades photometer session`, version1, is a separate web format. It does **not** extend or reinterpret existing full analysis v7. Spectrum/raw acquisition/classification/Hubble sessions retain their current schemas and flow. Photometer files contain only an explicit seed and strictly validated events, plus policy/numerical markers and the original field-fixture SHA-256. Imported computed counts, calibration fields, foreign v7 files, unknown event keys, invalid ordering and altered proof are rejected.

Limits are128KiB,256 events and500 characters per note. Capacity is reserved to Stop/release safely at the journal limit. The replay recomputes every photon component, reduction and manual-entry association from the confirmed fixed domain. Saved/restored contexts are released; a file cannot authorize background acquisition or reuse a stored sky bank. No wall-clock catchup is performed. Pending file reads can be cancelled; cancelled or late results after navigation cannot overwrite current work. Parse errors retain the current completed readings/notebook.

No backend, service configuration, dependency, Worker or IndexedDB change was needed. The persistent service remains on127.0.0.1:5173. Original files/hashes/license remain intact; local research only. No Windows/original execution/microemulation, Claude, publication, remote push or original-resource upload occurred. [Validation](PHOTOMETER-VISUAL-VALIDATION.md) records actual-repository results and browser screenshots.
