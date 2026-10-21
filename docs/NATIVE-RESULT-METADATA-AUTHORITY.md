# Native result metadata authority and DAT writer boundary

Follow-up to the validated [read-only inspector](NATIVE-OBSERVATION-RESULTS.md),baseline981189a. This recovery resolves where selected native result fields come from;it does not add a writer,calendar conversion,answer filling or new web format. [Hashed provenance](NATIVE-RESULT-METADATA-AUTHORITY-PROVENANCE.json) pins21complete functions,3explicit caller slices,6import stubs and6data ranges to original EXE SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Original execution/emulation/Windows was not used.

## Time is route-specific external state

Successful classifier file loading at0x50840aand programmatic loading at0x50b405call0x40b1d0,then0x40b784,and store the returned Double in classifier+0x4e1. The first helper resolves `GetFileAttributesExA`,takes structure+20bytes,passes it through `FileTimeToLocalFileTime` and then `FileTimeToDosDateTime`. Structure+20is **ftLastWriteTime**,the file's last-write time,not its content or an observing timestamp. These API meanings and structure layout are supported by Microsoft's [file-attribute structure](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/ns-fileapi-win32_file_attribute_data) and [local-file-time conversion](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-filetimetolocalfiletime).

The second helper unpacks year1980+date>>9,month/day,hour/minute and2×seconds bits before native date/time encoding. [The DOS API](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-filetimetodosdatetime) defines1980–2107andtwo-second time granularity. Its return/failure,host timezone and DST handling are part of the native context;the port must not improve or reinterpret them silently. Native Gregorian encode0x40d1b8subtracts693594from the ordinal,matching1899-12-30. That identifies the loader's day-count representation,not a UTC epoch for every arbitrary DAT.

Classifier results0x50b1dcpasses this Double to preparation0x54a73c. A new row copies it at+0x10;an exact-ID reused row retains its existing time. Coordinates are overwritten separately from current spectrum+0x31/+0x3b. Thus even the native timestamp does not universally describe the newest source or confirmation time.

JD display still adds date-object Extended+0x2aand runtime global0x5bad48. Offset setter0x487b2cconverts a supplied Single hour offset to days by/24;startup threshold helper uses [GetLocalTime](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/nf-sysinfoapi-getlocaltime),then selects the previously recovered bias branch. Neither the original host clock/zone nor active date-object offset is carried by a144-byte result record. No JD/MJD/UTC/calendar display is added.

The committed resource manifest has path/size/SHA,not native-host last-write/timezone provenance. Current extraction/archive/browser lastModified timestamps are not established as the values consumed by the original installation. Source-identical files can have different file times:two independent synthetic copies retained outside source have identical SHA but different assigned mtimes. This is an information-loss witness,not native execution. Do not use download time,current clock,archive metadata or a catalog date as an observation-time substitute.

## Field authority differs by entry route

| Native path/field | Recovered owner and write | Current admission boundary |
|---|---|---|
|Classifier object/time|Loaded file/object claim and external file time;first-ID reuse may keep prior time.|Original practice identity is verified separately;no observed time is supplied by its body. Imported claims do not gain practice authority.|
|Classifier RA/Dec|Copies spectrum Extended+0x31/+0x3bto record+0x18/+0x22.|Header coordinates remain claims. Headerless/default state is not measured zero.|
|New result numeric defaults|Constructor0x54a814clears RA/Dec,five photometry slots,type,Z,V;kind comes from global option+0x2e7f.|Initialization/sentinel state,not measurements or permission to fill absent notebook metadata.|
|Photometry caller slice|Owner measurement struct+0x620provides object/time;conditional coordinates,kind+0x67e,five nonzero Extended values+0x64c are copied.|Separate observing path. Do not transplant its values or zero-skipping/reuse semantics into practice classification.|
|Redshift caller slice|Current/manual Extended+0x49fbecomes SingleZ;coordinates from spectrum;conditional V slot from spectrumSingle+0x45under exercise option.|Requires its own manual-result/source context. Catalog redshift/magnitude or an arbitrary header does not qualify.|
|Velocity|Form activation may computeC*zunder an option;OKcan parse/check entered Single after text/type writes.|Full option/zero/FPU/locale/error lifecycle and user-owned Z remain unresolved. No velocity/grade invented.|
|Type/remarks|Manual generic parser/short-string copies,already supported in the separate web notebook.|No spectral correctness grade;old JSON/CSV and long manual responses remain independent.|

Earlier preparation notes described a **zero-initialized record**. This is too broad:the constructor initializes specified fields,but the ShortString helper copies only a length and used text bytes;empty remarks initializes its length only. The complete144-byte stack buffer and unused text tails are not proved cleared. Raw older research remains unchanged;repository provenance carries this explicit erratum. Do not infer deterministic padding or original writer bytes from the initialized fields.

## What the native writer actually establishes

Writer `[0x547b0c,0x547e62)`chooses/normalizes a filename,handles the save/overwrite dialog,opens a typed file with record size0x90,then visits existing list record pointers and transfers their contents through0x4043b8→WriteFile. There is no application-header transfer in this captured path. A successful short write raisesIOerror101;API failure follows the system-error path. The routine can already have written a prefix before a later failure;transactional rollback is not established. Native UI failure/exception/close states remain a separate lifecycle contract.

This supports the existing inspector's **unchanged owned-input byte copy**. It does not turn a web notebook row into an owned native record. A reconstructed writer would need explicit authority for all numeric fields/display kind,source-specific date policy,number encoding,text ACP and padding/error behavior. Missing values cannot silently become zeros;new arbitrary padding would be a declared encoding policy,not binary parity. Original writer-output/runtime witnesses remain absent. Static layout and roundtrips do not establish interoperability with an original installation.

## Decision and next original feature

Native editable DAT output remains **pending for missing source/runtime state**,not for an external-review attempt. No new application adaptation is added merely to fill that gap. Inspector,web notebook/persistence/deletion Undo,existing formats,manual answers,integrator/acquisition and all64primary acceptance statuses remain unchanged;project partial.

The next independent original feature to prioritize is **single-level Undo of a confirmed selected-row edit**. Existing native Edit0x549620copies the144-byte before-state;on modal result1it enables Undo. Undo0x54993c's non-delete branch restores that saved state and disables Undo. This needs no new date/photometry/velocity authority. Scope the port to admitted practice rows and preserve exact code,remarks,source,IDs and order. First recover invalidation on subsequent edit/create/open/cancel and selected-index lifetime;then decide how it shares the existing persisted recovery/conflict guard without silently changing notebook-v1 or historical formats. It is a proposal,not implemented by this recovery.

## Verification and reproducibility

Local scripts/captures/receipts: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/observation-dat-authority/`. `capture.py` rechecks source/range hashes,import bindings,literals,calendar constant and the identical-content/different-mtime witness. Caller slices are explicitly partial;the exploratory whole-image listing/xrefs are not full-function proofs and may include data. No CPU instruction interpreter,Windows API execution or original output comparison is used. Existing1373unit contracts,typecheck/build and1279resource hashes are rerun before the documentation commit;browser behavior is unchanged from published981189a and its121affected/five persistent flows plus inspected desktop/mobile receipts. No new UI or browser-fix claim.

Publication receipt for981189a is retained separately. This recovery commit is local only;no additional push/deploy/original-resource upload. Claude/other external review remains on the explicit human hold,0new attempts. Historical star-activation timeout remains unreproduced/unattributed,not fixed by this work.

Follow-up:the bounded [selected-row Edit→confirm→Undo flow](OBSERVATION-EDIT-UNDO.md) is now implemented with explicit web snapshot/persistence/Finish safeguards. Full native callback/index/runtime fidelity and the metadata/writer blockers above remain open. No writer or fallback metadata was added.

Owned-input extension:[record field corrections](NATIVE-OWNED-RECORD-EDITS.md) can patch explicit text/type bytes of already supplied144-byte records while preserving every raw numerical field and unused tail. Its byte authority comes from the input,not missing notebook metadata. The blocked notebook→DAT constructor and full native numeric/locale/FPU acceptance remain separate;no default values or padding are invented.
