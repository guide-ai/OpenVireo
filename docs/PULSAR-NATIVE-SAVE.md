# Pulsar analysis: Save Recorded Measurements (Front F3)

Results › **Save recorded measurements (.CSV)** in `#pulsar-analysis` runs VIREO's own save of the measurement list
(TPlsrAnalysisForm1.Save2Click `0x56ef60`, writer `0x56feac`). Code: `src/core/pulsarNativeSave.ts` (pure),
`pulsarNativeSaved`/`pulsarNativeSaveCancelled` in `src/core/pulsarAnalysis.ts`, and `src/components/PulsarAnalysis.tsx`.
Static reading of CLEA_VEO.exe (781bc970…c54c) only. Research: `analysis/front-r1-radio-camera/B-pulsar-review-save.md` §2,
`analysis/front-r2/B-radio-save-sound.md` §A, plan `analysis/front-plans/front-f3.md`.

## Recovered [D]
- **Questions, in order** (literals byte-exact from the image):
  - an empty list: `Nothing To Save!` (caption `No Measurements Recorded!`);
  - a panel with an unrecorded reading: `You have not recorded your current measurements!…` (`Measurements Not Recorded!`), Yes
    or No;
  - the save dialog, titled `Select File Name for Data Save`, starting from the last name (`+0x5d7`), DefaultExt `CSV`, filter
    `Comma Delimited Text |*.CSV`, no overwrite prompt of its own;
  - a different extension: `Extension Not .CSV!`. Yes shows the dialog again, No goes on, Cancel stops;
  - an existing file: `The File <name> Already Exists.…` (`Overwrite Existing File?`). Yes overwrites, No appends, Cancel picks an
    automatic name and shows the dialog again;
  - `Writing Data to <name>` or `Appending Data to <name>` (`Verify Data Save`). Cancel writes nothing and marks the list unsaved
    (`+0x5db := 0`).
- **Automatic name:** the login prefix (`+0xa9`) cut to 8 and then to at most 5 characters, followed by `001`, `002`, … and
  `.CSV`, the first that does not exist.
- **The file:** `"date","time"` (two clock reads), `"Table Number: ` + the login table + `"`, a blank line, the non-empty login
  names, a blank line, the 151-byte column header, then every list row verbatim. Every line ends in CR LF
  (DefaultTextLineBreakStyle `0x5ae034` = 1). An append writes only the rows, all of them (Save never clears the list).
- **Afterwards:** Record and Save are disabled, Review enabled, every panel counts as recorded, the list is saved (`+0x5db := 1`),
  the name is remembered, and `0x56fe6c` clears the measurement record (reference, vertical and horizontal values, comments).
  The list, the cursors on screen and the readouts are kept.
- **Clear** (`0x56f7ac`) on an unsaved list: `You have not saved all your recorded measurements!…` (`Recorded Measurements Not
  Saved!`). Yes runs Save and stops unless the list is then saved, No goes on, Cancel stops. Then `Clear List of All Current
  Measurements?` (Yes/No).

## Inferred [I]
- With no login the record is zero (K2 §3): an empty table, no name lines, and an empty automatic-name prefix (`001.CSV`).
- The DefaultExt rule is the Windows common dialog's: a name without an extension gets `.CSV`; a different extension, compared
  case-insensitively, is kept and raises the question. File names compare case-insensitively, as on Windows.

## Web adaptations [W]
- **Date and time:** the US Windows defaults (user decision of 2026-10-30): `M/d/yyyy`, whose `/` prints VIREO's DateSeparator
  `-` (`10-30-2026`), and `h:mm:ss AMPM` (`3:07:42 PM`). VIREO uses the computer's regional format, which cannot be known.
- **The folder:** a browser cannot look into folders. "Exists", overwrite, append and the automatic name use the files this
  Save wrote while the analysis is open (kept in memory, lost on reload). Each save downloads the whole resulting file under its
  name; an append downloads the earlier bytes plus the new rows. To add rows to a file on disk, use Append
  ([PULSAR-RESULTS-APPEND.md](PULSAR-RESULTS-APPEND.md)).
- **File names:** printable ASCII without `\ / : * ? " < > |`, at most 255 characters; no folders.
- **Failures:** if a row does not agree with its stored values, the file would exceed the saved-rows bounds, or the browser does
  not start the download, nothing changes (no folder entry, no state change) and the dialog says so. VIREO marks the list saved
  even after an I/O error. Its Append-then-Rewrite fallback, the `IOResult` box and the hourglass cannot occur in the browser.
- **Stale snapshot:** if the list or the data changed while the dialog was open, nothing is saved.

## Tests
- Vitest `src/core/pulsarNativeSave.test.ts`: the date/time formats (midnight, noon), DefaultExt, the automatic name, every
  question branch, the fresh and appended bytes, the post-save state and Clear's save-first answer.
- Playwright `tests/pulsar-native-save-app.spec.ts`: Record → Save → Verify with exact header lines, a case-insensitive exists →
  append, Cancel → `001.CSV`, Verify Cancel, the unrecorded and extension questions, a refused name, and Clear → save first →
  confirmation → cleared.
- Re-pinned 2026-10-30: `pulsar-analysis.spec.ts`, `pulsar-results-export-app.spec.ts` and `pulsar-results-append-app.spec.ts`
  (Save is enabled while the list is unsaved; the Clear text is VIREO's), `pulsarProvenance.test.ts` (no gated contract left).
