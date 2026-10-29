# Observation results: recovered manual record fields

Classification now includes **Observation results**,a separate notebook for the25original practice objects. It ports the original result form's packed spectral-type conversion,short remarks,first-object reuse and selected-row writes. Open,edit,cancel,reopen and confirm are functional. Existing free-form classification answers,confirmed classification/width records,JSON andCSV remain unchanged.

**Confirmed results now use separate web persistence and portable export/restore; see [Observation notebook persistence](OBSERVATION-PERSISTENCE.md). They are not included in existing investigation/classification JSON or CSV.** Native observational-record file interchange remains a separate recovery. Acquired/imported result identities and the numerical observation fields are outside this first admitted path;their established manual classification workflow still works.

[Provenance](OBSERVATION-RESULTS-PROVENANCE.json) binds twelve code excerpts,four generic type tables,29compiler fields and the4786byte `TObsRsltsDlg1`resource to original executable SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. [Validation](OBSERVATION-RESULTS-VALIDATION.md) records contracts,independent controls,flows and limitations. Originals/raw analysis remain outside the web source. No answer key was read and no original runtime was executed.

## Try locally

1. Open `http://127.0.0.1:5173/#classification`. Choose an original **Practice object**,then scroll to **Observation results**. Your existing **Proposed spectral type** and **Features and reasoning**remain separate,including answers longer than the native fields.
2. Click **Open observation results**. The first form for an object starts empty. Its object ID and source SHA are read only. Observation time,RA/Dec,photometry and velocity explicitly say unavailable;they are not taken from a catalog,header claim or designer default.
3. Enter your own type,for example `G2 V`,and short remarks. The preview shows the recovered stored label `G2V`and code50205000. This example is a parser exercise,not the answer for the selected star. The type field allows12bytes and remarks36printable Windows-1252bytes. Remarks keep leading/trailing spaces.
4. Click **Cancel observation changes**,or press Escape. Reopen:unconfirmed entries were discarded and no row was added. Enter again and click **Record observation result**. A row appears and the browser-saving status reports whether it is saved.
5. Click **Edit observation result 1**,change either field,Cancel and reopen:the confirmed row is retained. Confirming replaces that selected row without changing its ID. The existing classification/width histories are untouched.
6. Check **Create a separate observation on each confirmation**to create another row. New opens start empty in this mode. Uncheck it and Open reuses the **first**result for the current object,as in the recovered lookup. Edit buttons select a particular row. Select another practice to record its separate identity;rows for other objects cannot be edited until that practice is selected.
7. Try `???`:the original converter returns0and the native stored label is empty. The form explains this and allows confirmation;this is not a correctness grade. Try an emoji:the byte-compatibility gate rejects it while preserving your text and prior row. A colon-only value is explicitly unsupported because the original deletion path can reach an unchecked empty-string read.
8. On mobile,the dialog scrolls within the screen and the controls support touch and keyboard. Source/atlas/file activity and navigation invalidate a pending review. Save a complete investigation before/after observation-notebook work:the old JSON/CSV contents remain unchanged. Reload keeps confirmed rows when browser storage is available. Existing investigation/classification restore keeps the separate notebook;its own export/restore control carries those rows. File activity closes pending forms.

## Recovered behavior and browser adaptations

The classification entry `[0x50b1dc,0x50b2c2)`calls preparation0x54a73c,which scans by exact object ID when the option+0x2e8c is zero and returns the first matching record. The other branch creates a new record. The list constructor uses a0x90byte element,and native selected-row Edit copies0x24DWords. Its fields include object shortstring15,native date/timeDouble (not rawJD),RA/DecExtended,five Extended photometry slots and a display-kind byte,packed type int32,redshift/velocity single and remarks shortstring36. The two entryDWORDs are one native date/timeDouble;they are not two coordinate floats. The earlier rawJDlabel is corrected by [numeric DAT inspection](NATIVE-OBSERVATION-RESULTS.md):JDdisplay uses date-object/runtime state. Classifier coordinates are copied separately from two Extended spectrum fields.

OnActivate renders the current record,including the packed type. OK copies IDup to15bytes,remarks up to36and the converted type into+0x5f. It then conditionally parses/checks nonempty velocity againstC*z. There is no nonempty type/remarks requirement or spectral correctness grade in this handler. Unknown initial type converts to0;other unrecognized trailing text may be ignored or recognized as one suffix. The generic converter is case sensitive,removes ASCIIspaces/colons and packs `class*1000000 + subclass*10000 + luminosity*100 + peculiarity`. The one-digit/one-decimal subtype domain uses exact integer tenths in the port;the missing99sentinel and zero-subclass display quirks are retained. Reopening shows the canonical label rather than the original typed spelling;some codes/labels are not lossless roundtrips. Preview this conversion before recording.

The native preparation allocates a provisional row before opening the form,and activation can write an automatic velocity. OK writes text/type before later velocity rejection. Cancel clears an owner flag and does **not**delete or roll back the record in the recovered handler. The browser intentionally stages all new writes/row creation until confirmation,keeps cancellation atomic,and checks actual source,ledger,mode and pending context. This is a transaction adaptation preserving current work,not a claim of native placeholder/partial-write/Win32event parity. Default reuse,the100row notebook cap,source-specific Edit admission and the printable Windows-1252gate are explicit browser policies. Original ACP was machine dependent.

Only the25verified original practice names/SHAassociations participate;all names fit15bytes and are unique. No observed timestamp,position,photometry,redshift or velocity is present in this retained practice path. Those values remain unavailable,not zero-filled or inferred. The full nonempty-velocity validation,formatting and zero/FPU cases are not implemented by this increment. A file containing the same original spectrum bytes remains imported and does not acquire practice result authority.

No native0x90record file writer,legacy result-file interchange,delete/undo,grade,uncertainty or physical precision is asserted. All1279manifested source resources retain bytes/hashes/credits and source-specific uncertainty. N02/E03and all64primary acceptance statuses remain unchanged;the project remains partial. External review remains pending the human answer under the parent hold,with0attempts;no push or deployment.

Current follow-up:[selected-row edit Undo](OBSERVATION-EDIT-UNDO.md) now protects an explicitly selected Edit N confirmation with saved prior/current states. It shares the safe recovery slot with deletion and preserves notebook-v1/historical files. This does not grant generic first-object reuse Undo,numerical metadata or native DAT authority.

## Loaded and acquired spectra (Front S, S4, 2026-10-29)

VIREO has no direct "acquired spectrum → Classify" route: a spectrum reaches Classify as a saved .SSP (File › Unknown
Spectra › Saved Spectra) or from the practice list. For a loaded .SSP the Observational Data record (TObsRsltsDlg1) takes
(static reading of CLEA_VEO.exe, research `analysis/front-s-spectroscopy/RE-observational-data-metadata.md`):

| Field | VIREO source | OpenVireo |
|---|---|---|
| Object | file-name stem: cut at the first `.`, drop through the first `_`, trailing spaces trimmed, ≤15 characters; the header's object name is **not** used | same (`observationStem`); characters outside Windows-1252 become `?` [W] |
| Observation Time (JD) | the file's last-write time, fixed with 6 decimals | the browser's `File.lastModified`, converted to JD in UTC [W: VIREO uses local time]; known only for a file imported on this page (a restored investigation has no file time, so the box is empty) |
| Right Ascension / Declination | the `*SpHdr*` pointing, `HHh MMm SS.SSs` and `±DD° MM' SS.S"` | same; a file without a header leaves both empty |
| Observed Magnitudes, Redshift (Z), Velocity (V) | zero, shown empty (the header magnitude is not copied) | empty |

A zero value shows as an empty box in VIREO, not "Unavailable"; OpenVireo shows "(empty)" for screen readers.

**Classified directly from an exposure [W].** The web's "Classify acquired star" shortcut stands for "save, then load". The
record uses the stem of the acquisition's name, the pointing from the header the .SSP save writes for the same exposure, and
no JD (there is no file).

**Records.** A record keeps its source's values. The notebook is written as version 2 (policy
`source-id-sha256-metadata-web-v2`) when it holds such a record; a notebook with practice records only is still written as
version 1, byte for byte. Records compare sources by value: re-importing the same file with another file time makes a
separate record [W] (VIREO reuses a record by object name and keeps its first time). Row Edit and Delete work from a loaded
spectrum as from a practice spectrum, as VIREO's handlers have no current-spectrum check.

Code: `src/core/observationMetadata.ts`, `src/core/observationResults.ts` (`externalObservationSource`),
`src/core/observationNotebook.ts`, `src/ObservationResults.tsx`. Tests: `observationMetadata.test.ts`,
`tests/observation-metadata.spec.ts`.
