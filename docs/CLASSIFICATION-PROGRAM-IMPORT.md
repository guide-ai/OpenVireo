# Local original-style Program List import

The Program List dialog can preview a local `.LST` sequence of the 25 admitted original practice spectra, select a row and advance with Next on List. Rows have independent ordinals: repeated filenames remain separate entries and may have different display aliases. Responses and observation records continue to use the canonical original source identity. No catalog answer, measurement or grade is filled automatically.

At http://127.0.0.1:5173/#classification choose **Program List → Import program list (.LST)**. Save this authored example as a local text file:

```
'First alias' 'A0000021.sp'
'Repeated alias' 'A0000021.sp'
'Last alias' 'A0000014.sp'
```

Preview then **Load selected practice**. Enter a manual response on row 1; Next reaches row 2 without discarding it or generating a record. Next to row 3 requires the existing confirmed-response guard. On the last row, Next reports No More Spectra without wrapping. Cancel preserves the active list and work. **Use original 25-entry list** is also a candidate change until verified confirmation. Reopening the same imported list remembers its selected ordinal, including repeated spectra.

The reader admits printable ASCII, single-quoted label and basename fields, space separators, CRLF/LF and a final newline; up to 64 KiB/1000 rows. Empty/comment rows, malformed/extra fields, embedded quotes, tabs/control bytes/BOM/non-ASCII, unknown spectra, paths and URLs are rejected with an explanatory error. Labels are inert text. Source files are loaded only through the existing admitted/hash-checked loader; the LST never supplies a new URL or spectrum. Same-name files are reparsed and hashed from their actual bytes.

Imported configuration is temporary in this tab. Historical classification/investigation JSON and CSV are unchanged and do not save list content/position. Reload and a successful stellar/full session restore return to the original list; successful restore explicitly announces that reset. Failed restoration preserves the active list. Saved observations/notebook/edit/deletion recovery remain under their existing formats and storage contracts. Keep the LST file and reimport/select a row explicitly to resume. A direct practice change outside list navigation invalidates the imported-list cursor; Next remains unavailable until an explicit row selection avoids guessing among duplicates. Acquired/imported spectrum workspaces retain separate identity and cannot gain practice authority from a list.

## Evidence and deliberate browser policies

[Provenance](CLASSIFICATION-PROGRAM-IMPORT-PROVENANCE.json) pins executable SHA 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c, complete static function ranges/listing hashes and decoded base resource identity. Classification construction0x5076a3..0x5076b5 binds TClssfyListForm classslot0x50bb70, derived from TAtlasListForm slot0x50b8d0. Its virtual+0x104target is0x50c38c, distinct from base0x50bd44. The actual loader0x50c38c..0x50c694 and token helper0x4867fc..0x48690b include cleanup/return. They support two tokens stored in parallel label/file lists, selection by ordinal and remembered highlight. Earlier complete selection/Next handlers support indexed selection and end without wrap. Original 675-byte CLASSIFY.LST SHA a1a869ba1dcd71406b435ed4432d6c440adcaefefd0ee9d9f45d9dc49280fe70 independently matches all 25 catalog associations/order/hashes.

Strict admission/limits, authored order preservation, candidate/content hashes, atomic verification/cancellation, manual-response guard and temporary browser lifetime are explicit web policies. The recovered native tokenizer uses the first byte as a delimiter and has more permissive malformed-input behavior; native cache uses filename rather than content. Its clear/append/index/cancel/load-failure lifecycle is not our atomic transaction. The base DFM has double-click/menu selection bindings and no serialized Sorted property; constructor/default/runtime sorting remains incompletely traced. Do not describe this bounded reader as arbitrary native file/runtime equivalence.

No original code was executed or emulated. Text-mode ACP/BOM/control-Z, configured paths/OS dialogs, partial I/O/close errors, complete sorting/cancel/reentry/VCL/GDI behavior remain open. DAT source metadata/writer, acquired/imported observation-result authority and native FPU/six-indicator contracts remain separate unresolved work. Original bytes/1279 manifest hashes/credits and source-specific rights uncertainty remain unchanged. See [validation](CLASSIFICATION-PROGRAM-IMPORT-VALIDATION.md).
