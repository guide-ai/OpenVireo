# Owned DAT record deletion and Undo

This bounded workflow removes a supplied 144-byte record and restores its exact prior file snapshot. It does not create observational metadata, reconstruct notebook rows, evaluate stored floating-point operands or establish original-runtime acceptance. Imported files remain untrusted; the inspector's structural admission does not authenticate their origin.

## Evidence

CLEA VIREO executable SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`; complete static handlers `0x54978c..0x5498d5` (Delete) and `0x54993c..0x549a27` (Undo), exclusive ends. Delete rejects header/no-row selection, asks confirmation, captures the selected index and copies 36 dwords (144 bytes) into its backup before removing the typed-list/display row. Undo restores a deleted record/position or an edited record, then disables Undo. These are evidence of data layout and selected-record operations, not Windows/GDI callback or runtime parity. See the provenance companion for capture hashes. Original downloads and disassembly remain outside source; no original executable was run or emulated. CLEA/source-specific provenance and rights uncertainties from the existing inventory still apply.

## Implemented boundary

The pure core requires a privately owned parsed file and a branded selection tied to its exact immutable base. It concatenates the byte ranges before/after the selected record. Every retained byte stays exact, including unknown kind/type codes, Extended encodings, NaN payloads, signed zeros and unused ShortString tails. Only ordinal presentation is recomputed. There is no interpolation, numeric conversion or promotion to an admitted practice source.

The browser asks explicit confirmation and hashes a candidate before committing. Cancel, closed/stale confirmation, failed hashing, navigation and late completion preserve the previous file and Undo. A single Undo spans text edits and deletions, restoring the previous file and selection; a later committed operation replaces that recovery. This atomic retention is a declared web policy: the native handler invalidates its older Undo earlier, and native partial failures/event ordering are not reproduced.

The original input download always remains unchanged. The edited copy has a separate SHA-256 and `.edited.dat` download. Deleting the last row produces an owned zero-byte edited copy; Undo/original restoration remain available. An empty file cannot authenticate a format. Reviewed file replacement/revert keeps prior changes until explicit confirmation. Reload discards inspected/edited DAT files; download first. These copies remain separate from the persisted web notebook, historical investigation JSON and classification CSV.

## Try locally

1. Open `http://127.0.0.1:5173/#classification` and choose **Inspect observation DAT file**. For a safe authored example, select `tests/fixtures/observation-results-synthetic.dat` in this repository; it is a synthetic test vector, not an original observation/writer specimen.
2. Select record 2, choose **Delete selected DAT record**, then **Keep DAT record** or Escape. Confirm the three records remain.
3. Reopen and choose **Delete DAT record now**. The edited count becomes 2; download both the unchanged original and edited copy. Other record bytes/order remain intact.
4. Choose **Undo last DAT deletion**. All three records and the prior selected ordinal return. Confirm another text edit and deletion to check that recovery holds only the immediately preceding operation.
5. Delete every remaining record: the edited file is empty, editing/deletion disable, and Undo restores the last record. **Restore original DAT bytes** asks for confirmation before discarding changes.
6. Reimport a downloaded edited copy; accept the replacement review if an edited file is still active. Invalid files, cancellation and failed reads preserve the working copy. Download before reloading; native copies are deliberately not silently persisted in historical JSON or notebook storage.

## Remaining contracts

Full numeric/date/velocity validation, owned runtime time/photometry/coordinate metadata for new notebook-derived records, native `.DAT` writer/original-reader oracle, append/merge/list/print variants, full callback/index/error/GDI/x87 lifecycle and acquired/imported result-source authority remain unresolved. Source+sky acquisition SUM, confirmed records, manual responses, notebook persistence/Undo, JSON and CSV formats are unchanged. This increment does not close the project or its 64 primary acceptance statuses.
