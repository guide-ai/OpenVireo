# Supplied TXT to native-style CSV copy

The saved-text inspector can now preview and download a separate CSV copy from an owned, nonempty canonical general TXT file. This ports the recovered writer's string stage. It preserves every supplied field spelling, row order, duplicate and complete comment tail through the checked CSV projection. The original TXT bytes and SHA remain available.

## Try it

At http://127.0.0.1:5173/#classification:

1. In **Inspect native saved text results**, use **Inspect native results TXT file** to select a supported general TXT. Local authored examples are in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/native-csv-export-implementation/SYNTHETIC-counts3.txt` and the corresponding counts5/magnitudes3/magnitudes5 files. These are synthetic strings, not acquired spectra, observations or native-output witnesses.
2. Select **Preview native CSV from TXT**. The review shows the original TXT name/SHA, output name/SHA and row count. Press Escape or **Cancel native CSV export**; the source and selected row remain intact, and focus returns to Preview.
3. Reopen and choose **Download generated native CSV**. The browser receives a separate `.native.csv` download. Download completion depends on the browser; the application reports only that it requested the download.
4. Use **Inspect native results CSV file** to reimport that copy. Compare rows, full original CSV row and SHA; **Download unchanged native CSV bytes** returns it exactly. Original TXT can be reimported independently. Manual responses, notebook, DAT edits/Undo and investigation exports are preserved.
5. An unsupported or lossy TXT reports an error and remains downloadable unchanged. Preparation can be cancelled; stale hash results, source/separator/context changes and other open dialogs cannot silently accept or stack an export. Reload clears temporary inspected files; existing confirmed notebook persistence is separate.

## Evidence and scope

[Provenance](NATIVE-CSV-EXPORT-PROVENANCE.json), evidence `NATIVE-TXT-CSV-WRITER-01`, pins the complete writer 0x5472e0..0x547954 and string operations 0x54763e..0x547756 to EXE SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. The native handler takes display row strings, replaces unit/spacing delimiters with commas, removes ASCII spaces from the bounded prefix and appends the untouched comments. The port uses this stage on supplied canonical rows. It does not need to invent a date or numerical record.

The admitted route is general counts/magnitudes with 3 or 5 filters and the already supported canonical CSV headers/precision. Expected unit/gap characters and numeric-looking lexical fields are checked. Reinspection must preserve the profile, object and every field spelling except outer ASCII padding, plus the complete comment tail. Internal spaces in an object/type/numeric token that the native compaction would destroy cause rejection. This is an explicit web safety restriction, not a claim that the original refused such input.

Exercise 4, empty/header-only data, ambiguous precision, blank first U, unsupported coordinate/spacing/numeric spellings and general quoted/locale CSV stay outside admission. The separate [CSV alignment limits](NATIVE-CSV-RESULTS.md) remain. Original date prefix/global bias, current native configuration, locale/FPU numeric construction, source-owned metadata, text-to-DAT/new notebook observations and full runtime interoperability remain unresolved. No current clock, catalog answer, default metadata or computed grade is substituted. No original execution/emulation or binary equivalence claim; all primary acceptance statuses remain unchanged.
