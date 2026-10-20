# P02: stopped observing workspace in investigation v9

**Follow-up:** [Investigation v10](EDITING-WORKSPACE.md) also preserves represented nonmodal editing drafts. [P02 original-criterion assessment](P02-ACCEPTANCE.md) supersedes the broad remaining-work shorthand below; it separates scientific dependencies from persistence and does not impose autosave/window/native-format requirements. This dated v9 delivery evidence is retained.

The full web investigation now includes **all five current, unarchived exposure segments** (sky, the supported catalog star and galaxies36747/36773/54876), each segment's independent seed-entry draft, and the implemented observatory context. Analysis, confirmed manual measurements, Hubble inputs, classification and photometry remain in the same validated file. P02 remains **partial** against its original complete instrument/lifecycle/edition criterion. This is a new OpenVireo persistence contract, not a recovered native project format.

## Try the feature

Use **http://127.0.0.1:5173/**. The **One investigation backup** toolbar is available above every tool.

1. Open **Sky exposure**, **Activate supported sky field**, **Start sky exposure**, then **Pause exposure**. Repeat in **Star exposure**. In **Galaxy exposure**, choose each supported acquisition galaxy and acquire a segment. Leave at least one segment outside analysis. You may type a different seed without pressing **New seeded exposure**; that draft is distinct from the actual random state.
2. Choose **Save investigation**, even while exposing. All observing clocks stop and segments deactivate before snapshotting. Only already committed intervals survive; the uncommitted wall-clock tail does not become extra counts. Download `openvireo-session.json` (version9).
3. Reload, then choose **Restore investigation JSON**. Every represented scope is validated before confirmed work is replaced. Visit the five segments: counts, committed time, frame remainder, random state/draw count and pending seed draft return. Waiting does not acquire more photons. Explicit **Activate…**, then **Start…**, continues the current segment.
4. Record your own measurement from **Analyze acquired star/galaxy**, save and restore again. Its archive reference and float32 measurement remain attached to the earlier observation. Continuing the telescope segment does not change that archived observation or fill any learner answer.
5. In **Observatory**, change the dome, finder/telescope mode, selected object, pointing or unapplied coordinate drafts. Save, change them, restore and check them. The current route stays open; the saved preview context returns.
6. Try a damaged copy (unsupported edition, altered proof or invalid pointing), cancel the picker, or cancel a pending read with **Cancel pending save/restore**. Confirmed work is kept. Leaving the current tool or hiding the tab invalidates pending completion. Editors are inert during validation; navigation and global cancellation remain available.

Existing analysis/Hubble/classification full-save buttons use the same v9 snapshot. Standalone exposure/photometer/practice files keep their established formats and narrower scope.

## State and compatibility contract

`observing` requires the exact policy `OpenVireo-stopped-observing-workspace-v1`, edition marker, bounded context, sky/star slots and exactly three galaxy slots. Edition is pinned to VIREO1.504 / `CLEA_VEO.exe`, SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`, the existing [observatory evidence](OBSERVATORY-PLAN.md) and [Hubble provenance](../data/hubble/PROVENANCE.json). This identifies the current source reference; it does not implement all options of that edition. Unsupported markers, IDs, extra settings and schema fields reject the whole file.

Each slot stores its raw seed-entry draft and either an empty marker, the established bounded standalone raw replay journal, or an exact existing acquisition archive reference. Archive reuse requires matching instrument, target and canonical journal bytes. Similar counts are insufficient. Raw counts and derived magnitudes are reconstructed, not trusted caches. Each journal retains its existing2MiB/12000-event limit; unique archive/current replay events share the unchanged24000-event total. The total raw-current budget is preflighted before current-journal replay. The outer16MiB/1000-measurement/8-archive limits remain.

Saving and restoring first synchronously release every mounted observing controller, invalidate standalone reads and pending Analyze/classify transfers, then capture/validate all scopes. Lazy tools retain their validated workspace until mounted. A generation guard rejects cancelled, hidden-tab or navigated late completions. Confirmed scientific/manual work commits only after the entire incoming file passes validation. A failed/cancelled operation can append stop/release events to today's segment but cannot replace confirmed observations. A save does not send unarchived segments to analysis.

All restored segments are stopped and deactivated. The observatory dome may return open, but that never arms an instrument. Source/sky counts, seed-at-reset, random state, committed exposure and frame remainder remain the unchanged journal contract. Unapplied coordinate drafts never replace the valid actual pointing; seed drafts never replace the actual random state. Negative-zero pointing uses the existing explicit JSON token.

Full1–8 and practice1–3 remain strict and readable. They have no observing scope, so they preserve today's stopped segments and context. Legacy files cannot smuggle a v9 field. Version9's explicit empty slots clear their previous segments; nullable photometry clears previous photometry. Version8 still requires its non-null photometer journal. Classification retains its explicit established profileVersion4–7. Pure IO callers without an observing workspace retain their earlier format/bytes, including the six P01 scientific export digest references.

## Remaining original acceptance criteria

This closes the previously missing **unarchived-segment** slice and the represented preview context/reentry/cancellation slice. It does **not** close complete P02. Unimplemented instruments, telescope/site/date/time/tracking/instructor options, original edition switching and original modal/reentry ordering still need their own recovered contracts and acceptance scenarios. Transient checker answers, an unconfirmed modal transcription, the photometer's pending seed text, view/scroll/dialog placement and browser automatic persistence are not part of this schema. Existing committed photometer notebook entries, classification responses, Hubble drafts and learner measurements are preserved. No original criterion or inventory denominator was reduced.

No formula, source/noise model, target, catalog answer, distance or fit was introduced. Native source plus sky still **adds** to the raw acquisition buffer; measured sky subtraction is a separate photometer reduction. Existing Number/Math versus Extended/x87 uncertainty and lack of native runtime/writer oracle remain. Tests establish this web contract only. Original files, addresses, proofs, licenses and hashes remain unchanged. No Windows/original execution, emulation, Claude, installation, remote push, publication, public upload or new external cost.

[Validation evidence](OBSERVING-WORKSPACE-VALIDATION.md).
