# Native DAT list loading and merge

The DAT inspector can now build the recovered native results ordering and merge another supplied DAT into that list. It moves complete144-byte records without rewriting time,RA,photometry,unknown fields,unused tails or duplicate records. No notebook metadata is synthesized.

## Try the flow

At http://127.0.0.1:5173/#classification,choose **Inspect observation DAT** and a local DAT with admitted keys. Raw inspection initially retains file order. Choose **Build native results ordering**,review counts and **Cancel** or **Confirm DAT list transformation**. Confirmation creates a separate downloadable working copy,activates ordered mode and selects the first record.

Choose **Append DAT records from file** and another `.dat`. Review its name,SHA-256,input count and resulting count. Cancel retains bytes,selection and prior Undo. Confirm inserts each incoming record in file order into the established list. **Download unchanged DAT bytes** still returns the first original input;**Download edited DAT copy** returns the current list. Reimporting that download inspects its exact bytes;it does not implicitly reapply ordering.

**Undo last DAT list transformation** restores the exact prior bytes,selection,ordered mode and temporary receipts. A confirmed text edit or deletion replaces that one Undo slot and retains ordered mode;its own Undo restores the previous list. Empty append is a true no-op. Raw replacement or restoring original input clears ordered mode and receipts. Files on disk are never modified.

Temporary append receipts contain only supplied filenames,SHA-256 and input counts. They are not per-record provenance and are not encoded in DAT,investigation JSON,classification CSV or notebook backups. These list/files are temporary browser state;reload clears them. Download the working DAT before leaving. At most1000records and1000receipt events are admitted;these are browser limits.

## Recovered contract and admitted profile

See [provenance](NATIVE-RESULT-LIST-PROVENANCE.json),evidence ID `DAT-LIST-LOAD-01`. Original executable SHA-256 is `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Main `LoadSavedData1Click`588fd8..5894f3 dispatches DAT to549aa8..549cff. It opens typed144-byte records,offers add/clear/cancel,asks a second clear confirmation,and inserts each read record through492728..4927fc. The static22-function capture includes complete returns,method-table binding and hashes;original bytes remain outside this repository.

Comparator546db4..546dde orders stored Double+16(time),then Extended+24(RA). Canonical normal and zero keys are compared exactly as signed integers times powers of two using BigInt. Signed zeros compare equal. This is ordering of stored scalars,no UTC/JD/MJD conversion or authority for the scientific source. NaN,infinity,subnormal,pseudo-denormal and unsupported keys are rejected for ordering/merge;the raw inspector still preserves them. Other numeric fields remain opaque even when their encodings are outside this key admission.

Insertion is cursor-sensitive. If incoming>current,the forward walk inserts after equal keys. Otherwise the backward walk reaches the first lesser key and inserts after it,**except an equal minimum head is also followed rather than preceded** (4927d3..4927f2). An earlier research summary omitted that head exception;the complete capture is unchanged and the correction is explicit in provenance/validation. Duplicates remain. New insertion becomes current during input. At full reader readout the cursor ends at tail. Build starts empty;append uses this after-full-readout tail profile. Manual display refresh after text/delete validates sorted keys without rebuilding/reversing tie runs. This does not establish every native selection/callback/cursor history.

The web separates raw inspection from explicit ordering and uses an atomic reviewed candidate plus exact one-level Undo. Native typed I/O can leave inserted prefixes on later failure;that partial-error behavior is not reproduced. The browser preserves the prior list on read,structural,key,capacity or hash failure and rejects late/cancelled/context-changed completions. CSV/TXT use a separate unported reader and are rejected by Append. A DAT extension is not authentication;headerless144-byte structural acceptance is a bounded candidate inspection.

No original execution,microemulation,external resource upload,remote access,push or deployment was used for this increment. Original GDI/x87/FPU exception/Extended runtime acceptance is not claimed. Notebook→new native DAT remains blocked on source-owned numerical metadata,host file-time/date options and validation/writer-oracle evidence. All64primary implementation acceptance statuses stay unchanged;OpenVireo remains partial.
