# P02: photometry in the portable investigation

**Follow-up:** [Investigation v9](OBSERVING-WORKSPACE.md) supersedes this dated v8 UI/save boundary: the shared toolbar is now above every tool, current unarchived segments and preview context are included. This document retains the v8 delivery evidence; its older remaining-segment limit is closed by that follow-up.

**Delivered slice:** save and restore the existing Pleiades photometry notebook together with the current spectrum, measurement log, Hubble drafts, classification work and acquired spectra already sent to analysis. This closes the missing photometer continuity within the implemented investigation workflow. P02 remains **partial** under its original broader instrument/lifecycle/edition criterion; the package count does not increase.

## Try it in the local app

Open **http://127.0.0.1:5173/#photometer**. Keep or create your existing spectrum/classification/Hubble work before these steps if desired.

1. Activate the photometer. In V, integrate **Sky position**, then **Target position**, and confirm your own blank-started notebook transcription. Repeat with B's own sky/object and confirm B. Explicitly select the saved B/V pair and **Calculate B−V**. No catalog answer is entered for you.
2. Under **One investigation backup**, choose **Save investigation**. Download `openvireo-session.json`. It now uses version8 when photometry exists, and includes the validated photometer v1/v2/v3 journal appropriate to its history. Pending photometer integration is stopped/released before the snapshot; it never creates a completed reading to save.
3. Reload. In photometry choose **Restore investigation JSON**, or use **Restore session** in the spectrum analyzer. Both validate the entire file before replacing confirmed work. Your photometer target, filters, raw count replay, notes, manual magnitudes and per-object explicit B/V pairs return alongside the included analysis/classification/Hubble work. Activation and fresh filter sky are required before further photometry.
4. Navigate to **Spectrum analyzer** and **Stellar classification** to check the included work. Save from analysis, Hubble or classification: these existing investigation buttons include current photometry too. Photometry need not have been visited before a v8 restoration; its lazily mounted view receives the restored state.
5. Try an invalid copy, cancel a picker/read, or leave photometry while its combined restore is delayed: existing confirmed entries remain. A pending sole100ms integration is stopped without a count/random draw. A legacy full1–7 or practice1–3 file contains no photometry and **preserves your current photometry**; its represented analysis/classification work follows the existing restore/merge policy. The UI explains this boundary.

Separate **Save photometer session / Restore photometer session** remain available with exact standalone v1/v2/v3 compatibility. A separate photometer restore affects photometry only; a subsequent investigation save bundles it with current other work.

## Versioned contract and atomicity

Full investigation8 adds one required `photometry` object to the established full format. It is the existing bounded photometer journal, containing seed, events, native field/UBV/target proof hashes and policy markers. Cached photon counts, reduced magnitudes or B−V values are not serialized as authoritative data. The existing parser replays them, preserves original target/filter/context/sky-reading identity and requires valid same-object confirmed B/V entries. Unsupported targets, invalid paired IDs, unknown cache fields, altered proofs, running/armed journals or oversized/invalid events reject the entire investigation.

The outer16MiB file bound and1000 measurement cap are unchanged. The nested photometer retains128KiB and512 events (256 before 2026-10-28, PHOTOMETER-VISUAL.md) and its existing manual note/value limits; bounds apply before replay and to canonical standalone serialization. Replayed/restored photometry is released with all sky banks invalidated. All prior full1–7 and practice1–3 readers remain strict; a legacy version cannot hide a photometry field. When photometry is absent, serialization retains the prior full version and byte structure. Six pre-P01 scientific byte references remain unchanged for existing non-photometric work.

Version8's `classification` is null when absent, or contains an explicit **profileVersion4/5/6/7** plus that established profile's fingerprint/workspace and required import policy. It never treats ordinary practice/luminosity/feature work as though it were imported-spectrum version7. Main-sequence, new-atlas, width and imported profiles each replay through their original admission rules. Acquired spectra, journals, source bytes, Single measurement bits and Hubble source claims retain their existing validation.

The analysis controller prepares a synchronous released photometer snapshot before asynchronous serialization/read, then commits a parsed v8 alongside the other validated scopes. The photometer exposes only released snapshot/replacement operations; the parent retains the latest immutable state even when its view is not active or mounted yet. Epoch guards cancel pending callbacks, standalone file reads and late combined-file completion. Full-operation controls are locked during validation; separate-file and combined-file cancellation controls are distinct. Navigation/hiding cancels a combined operation initiated from photometry. Released-context events may be appended before a failed/cancelled import; confirmed measurements, entries and pairs are not replaced until validation succeeds.

The photometer parser is dynamically loaded only for v8/actual photometry. Reusing it does not force its scientific fields/photon code into the initial legacy-analysis bundle. No worker, database, backend, service, library or native file format was added.

## Remaining scope and scientific limits

This is a new OpenVireo web interchange/lifecycle integration, not a recovered native CLEA project format or native photometry report writer. It introduces no astronomical formula, source/noise model, target, catalog answer or grading. Existing Number/Math versus Extended/x87 limitations, three-target/six-fixed-field UBV domain, source-then-sky **addition**, independent sky subtraction in reduction and per-filter sky policy are unchanged.

The backup includes acquired spectra that have been sent to analysis. **Unarchived sky/star/galaxy exposure segments still require their own existing save**; transient velocity-check answers, an unconfirmed photometer modal transcription and unimplemented edition/instructor/site/time state are outside this container. There is no automatic browser persistence. Those concrete limits keep P02 partial; no original criterion or count is reduced to claim full completion. Educator/native-runtime/release rights remain their existing gates. Original files, licenses, provenance and hashes are preserved; no Windows/original execution, emulation, installation, Claude, push, publication, upload or new external cost.

[Validation and acceptance evidence](INVESTIGATION-PHOTOMETRY-VALIDATION.md).
