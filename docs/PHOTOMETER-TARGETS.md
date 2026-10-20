# Three original Pleiades targets and separate UBV notebooks

19 October 2026 follow-up: aperture changes now support the bounded sizes 5/10/15 described in [PHOTOMETER-APERTURE.md](PHOTOMETER-APERTURE.md). Earlier fixed-aperture descriptions below record this initial three-target profile; arbitrary sizes/pointings/telescopes remain unadmitted.

**Later sample follow-up:** [Sixteen admitted original positions](PLEIADES-SAMPLE.md) extend this earlier three-target snapshot by13 complete fields,with explicit exclusions and owner5 compatibility.

**Later timed-series follow-up:** [Operational duration/repeat controls](PHOTOMETER-INTEGRATION.md) extend this earlier one-callback snapshot to0.1/1/10/100s ×1–5, with stopped partial replay and owner-v4 compatibility. Broader scientific/native domains remain open.

**Investigation backup follow-up:** [Combined v8 investigation](INVESTIGATION-PHOTOMETRY.md) adds one-file restoration with spectrum/classification/Hubble work. Standalone v1–v3 photometer files below remain unchanged.

The local photometer at **http://127.0.0.1:5173/#photometer** now lets the learner select three original hotlist targets. Each has a verified complete object field and fixed sky position. Observations keep their original object identity; confirmed B/V pairs are selected explicitly for that same object. No catalog magnitude or color fills a manual entry.

## Try the new feature

Use a new seed42 session for these exact sequential checks. Start with the retained default **01803-00478**. Existing work can first be saved; then release the telescope, expand **Raw counts & reproducibility**, and choose **New seeded session** with42.

1. **Activate Pleiades photometer**. Keep V. Integrate **Sky position**, then **Target position**: sky1, target552 photons. **Add notebook entry** opens blank; enter your own V transcription, for example9.647, and confirm.
2. Choose B. Acquire B sky and then target: sky2, target331. Confirm your B transcription, for example10.207. Select saved B reading4 and V reading2 and **Calculate B−V**: acquired0.559889252, your rounded transcription0.56.
3. In **Photometry target**, choose **01799-01442 · original hotlist entry 1**. The object chart/coordinates change and the current reading clears. The previous object's readings are absent from the B/V selectors. The B sky origin still explicitly identifies reading3 at01803-00478. In this unchanged active profile, integrate B directly:200 photons. Confirm10.758, switch to V, integrate:1005, confirm8.996. Select B5/V6: manual B−V1.762, with a separately calculated acquired value.
4. Select **01803-01585 · original hotlist entry 5**. V integrates62715; confirm4.507. Switch B, integrate69686; confirm4.392. Explicitly select B8/V7: manual B−V−0.115. The shared notebook shows all six confirmed entries with target labels. Return to either earlier target: only its previously confirmed pair reappears.
5. **Save photometer session** produces version3. Reload and **Restore photometer session**: selected target, manual entries and each explicit pair replay. Activate and obtain fresh sky before any further target acquisition; save/restore releases the observing context. Existing v1/V-only and v2/UBV files still restore and save byte-for-byte; target selection upgrades their subsequent journal to v3.

Check cancellation: stop before the100ms callback completes; no reading/random draw is created. Target/filter/pointing controls are locked during integration. Open an entry and Cancel/Escape: it never becomes a saved B/V source. Cancel a file picker/read, navigate during a delayed read, or import a file with an unsupported target, mismatched proof or cross-object B/V pair: existing confirmed work remains intact. Release/hide/navigation/save/restore clears all active skies, including when returning to a previous target.

Fresh independent target sequences are different from the shared-sky sequence above. For a new seed42, select a target, acquire each band's own sky/object in **V→B→U** order:

| Original HTL entry / label | Native source | V target photons | B target photons | U target photons |
|---|---|---:|---:|---:|
|1 /01799-01442|N2230.DAT@144496|1004|191|33|
|2 /01803-00478(default)|N2230.DAT@145877|552|331|354|
|5 /01803-01585|N2230.DAT@147993|63063|69414|104613|

These are explicitly seeded OpenVireo simulations, not captured CLEA observations or learner answers. Counts change with acquisition order/seed. No HR fit, reddening, temperature or distance is inferred.

## Association, completeness and native contracts

[Complete-field packet](../data/photometry/pleiades-target-fields.json) contains four newly verified fields, two original target associations, individual original-record hashes, all necessary native compact read probes/visits and nine whole-source hashes including original license. [Provenance](../data/photometry/targets-provenance.json) pins the packet, independent vectors, source files, reused contracts, analysis scripts and new original byte/listing captures. Research/raw listings stay outside the web source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-targets-recovery/`.

Original PLEIADES.HTL reader0x590424 uses86-byte records;0x591e99–0x591ed3 copies Extended coordinates at+0x19/+0x23 into pointing. HTL0 and4 projected Number coordinates exactly match compact27-byte rows144496 and147993, with matching Pascal suffix. Preserve differing HTL prefixes01799/01803 and native N2230; a matching suffix alone does not establish association. Default HTL1/row145877 is unchanged.

The four new field populations are reconstructed using the existing native region/band order, compact binary search and forward-read/admission rules. Every1,065,481-row N2230 band is checked against each field, independently with exact-rational packed coordinates and stored Double bounds, plus adjacent search-key controls. Whole variable31147/QSO2269/galaxy24069/image183 position checks are empty at each field; no unimplemented mixed catalog merge is bypassed. Object fields admit3/2 sources respectively, sky fields2/2; aperture query is central-only at object, empty at sky. Other admitted sources remain visible and ordered.

Existing native selection350-pixel sentinel, pointing-declination separation, radius+0.0025° neighbor query, Gaussian lookup and UBV flux preparation are reused. Seeing3/2arcsec, explicit non-default1′ base field×3/936, aperture10.5pixels, telescope0/common zero point9,1000 base count and100ms callback remain unchanged. All three sources have recovered original Single UBV colors. Source is drawn before sky; **source+sky are added**. At each sky pointing the selected star is187.2pixels away, aperture fraction0 and neighbors empty; native magnitude30 source leakage remains nonzero.

The brighter target stays below the existing1e6 mean adapter bound. Additional capture0x50158e–0x5015ba checks the original total-count guard; literal0x50198c is10-byte Extended2147483647, not Single. This adds a domain check, not a new count model. Independent references use Decimal90 source/sky means, the prior analytic aperture reference, integer-modulo PRNG, Python lgamma Poisson decisions and Decimal70 reduced magnitudes. Nine target/seed UBV sequences and an eight-reading shared-sky sequence test count components, seeds/draws and reductions. This does not supply an original execution oracle.

## Target identity and sky validity

A new bounded web `target` event chooses only a bundled complete field, resets the current result and points to the object. It never accepts arbitrary coordinates or a caller's completeness assertion. Every acquired object reading carries targetId, fieldTargetId, filter, contextId and exact skyReadingId. Notebook entries reference those readings. A color event requires confirmed acquired B and V readings belonging to the selected same object. Pairs are stored by target and never guessed from newest rows; manual and acquired differences stay distinct.

Native sky gate0x5008e0 and store0x501831 address the current telescope/filter bank. Moving between these fields retains those banks within one unchanged active context: all six fields share the same fixed sky parameters, and their sky apertures are separately proven empty. The UI names the actual sky observation's target field; reuse does not relabel or silently remeasure it. Changing filter selects only its own bank. Release clears all banks as the previously declared conservative web boundary. Broader telescope-change/native reentry behavior remains outside this adapter. The new target event and notebook persistence are web design, not a claim that the original target control has identical event semantics.

## Persistence and remaining scope

Photometer v3 adds a required complete-target-fields SHA-256 alongside original field and UBV proofs. It stores bounded seed/events, recomputes counts/colors and rejects unknown cached fields, unsupported targets or invalid associations. Original v1/v2 markers, key order and byte round trips are retained when no target event is present. All formats keep128KiB/256-event bounds and terminal Stop/release capacity. Investigation v7, SSP, classification and Hubble persistence remain separate and unchanged.

This completes the declared **three-target slice**, not I01/N03/E04 or the whole Pleiades exercise. The remaining21 hotlist targets, arbitrary navigation, telescope/seeing/aperture/integration changes, generated clusters, missing-color/image sources, mixed variable/QSO/galaxy fields, R/I, native modal/report fidelity, HR fitting and classroom acceptance remain open. Number/Math adapt Extended/x87; no original binary/numerical equivalence is claimed. Original rights and files/hashes are retained for local research; no public redistribution is authorized. No installation, Windows/original execution, microemulation, Claude, push, publication or original-resource upload occurred. [Validation](PHOTOMETER-TARGETS-VALIDATION.md) records the integrated checks.
