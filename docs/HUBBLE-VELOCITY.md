# Original Hubble velocity convention

ReferenceVIREO `CLEA_VEO.exe`, SHA256`781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. This increment derives velocities from saved redshift records, including restored sessions. It does not supply missing spectra, galaxy distances or a Hubble fit.

`TObsRsltsDlg1.FormActivate` at0x54a91c, selected0x54aed4..0x54af24, auto-fills a previously zero velocity when original option+0x2e88 is enabled and recordedSinglez(+0x63) is nonzero. The product ofExtendedc@0x54b020 andSinglez is storedSingle@0x54aefc inrecord+0x67. The web presents that recovered calculation as an always-available **derived table**, a new UI choice; it does not infer that the original option was enabled or overwrite the measured z record. A zero z displays a derivedzero, while the original auto-fill branch left it blank.

`OKBtnClick`0x54b02c, selected0x54b150..0x54b17f, converts an entered velocity toSingle first, then comparesabs((enteredSingle−cExtended×zSingle)/(cExtended×zSingle)) toExtendedtolerance@0x54b238. It accepts equality; the expected denominator is the unrounded product, not the auto-filledSingle. The samec/check appears inLSS0x57cd80 but that exercise is not generalized here. Original export strings@0x5471f0 and0x547aa8 establishkm/sunits. DFM labelsbindthe observedRedshift/Velocitycontrols to the published methods.

Bothcconstants have bytes`2db29defa70e62921140`: exactExtendedvalue299792.457999999999998408384271897375583648681640625; Numberprojection299792.458. Tolerancebytes`0ad7a3703d0ad7a3f83f` represent a value slightly below0.01; Numberprojection0.01. The pure adapter appliesSingle input/output boundaries and usesNumber arithmetic. It is the historicalv=czconvention, not a relativistic velocity or cosmological distance model; no bitexactx87claim is made.

New support guards reject nonfinite/overflowedSingle values and the existing analyzer'sz<=−1domain. The relative check rejects a zero denominator withzero-reference rather than guessing the original FPU exception/NaN policy. Answers within1e-12relative-error units of the1%threshold reportprecision-boundary; this is an explicit conservative adapter limit, not a measured original tolerance or an error bound proving x87 equivalence.

`hubble-velocity-vectors.json` retains12independentDecimal90/Single vectors, including3original catalogzfields (not observations), negative/zero/subnormal and large synthetic values. It records a deterministic float32answer near the guarded threshold. Tests discriminate unroundedreference vs storedSingle, answer quantization, wrongsigns,overflow,zero,CSVescaping andunsupported rows. CSV is a separate new schema1(`openvireo-velocities.csv`) with original-fileSHA,zbits,c,referenceproduct,storedvelocitybits,status and numericalpolicy; existing measurementCSVschema2 stays intact. Unsupported rows remain in the export with a status.

The browser's optional answer check is a practice draft and does not create a saved velocity record. Sessionversion1already restores the measuredzrecords, so the table recomputes afterrestoration. Draftanswers are not bundled. Rawstatic evidence and bindings are retained in research `analysis/scene-pixel-recovery/contracts.json` and`analysis/rea-ghidra-scene-results-results/`. StandalonehistoricalHubbleLab workflows, native regression/instructor configuration and originalFPU/output formatting remain pending. Separate [distance and summary helpers](HUBBLE-DISTANCE-RECIPES.md) implement explicit recipes from the distributed workbook and student manuals, with distinct method tags; they are not connected to this velocity UI or asserted as native VIREO regression.

The requested native/code-review for this increment was denied beforeprocesscreation byautomaticapprovalreview and remains pending. No external result or model is claimed. Local checks and the separatelydeniedsecurity-review status are recorded independently inREVIEW-RESULT.md.

## Observational Data on the Hubble record path (Front H2, 2026-10-30)

**What VIREO does:** RecordZ1Click takes the observation-results path in mode 4, the Hubble exercise [D].
- **Find or add (0x54a73c):** with Time-Dependent Data off (compiled), the first record with the same ID is reused and
  keeps its time.
- **Record fields:** z := Single(z), RA/Dec := the target's, and V := the catalogue magnitude when it is below 99.
- **Dialog:** "Observational Data" (TObsRsltsDlg1) opens. The student types the velocity, and OK 0x54b02c stores it after
  the 1 % check above. The record's velocity (+0x67) is that typed value.
- **Empty Velocity box:** OK skips the conversion and the check (`cmp [ebp-0x128],0; je 0x54b1f7` at 0x54b11b), so the dialog
  closes and the z-only record stays. "Velocity is incorrect or missing!" appears only for non-numeric text (EConvertError).
- **Record ID and time:** both come from the loaded spectrum (LoadSavedSpectrum1Click: ID 0x582bc3, time 0x582bdb–0x582be5),
  so the student cannot edit either.
- **Results list:** in mode 4 the row prints +0x67, the typed velocity, blank when 0 (0x548a5a–0x548a95).

**In the web, a catalogue-galaxy acquisition's Record measurement opens the same dialog** (`core/hubbleObservation.ts`, K2's
`ObservationalDataDialog` with Velocity editable).
- **Stored:** the typed Single velocity, its hex, remarks, Sp type, first time, target RA/Dec and V go in the measurement row.
- **Session v32** (`openvireo-hubble-observational-data-v32`, outermost) lists the records by measurement id around an
  unchanged base. On restore, each record must pass the 1 % check against its row's Single z and match the acquisition's
  target position and V. Older files restore and re-save byte-identically.
- **Re-recording is keyed** on the acquisition's catalogue target ID, never the analyzer's free Object label. Two galaxies with
  the same label keep separate rows.
- **The Hubble analysis** takes a row's typed velocity when it has one, because VIREO's results list shows the record's
  velocity. Otherwise, with no record or an empty box, it keeps v = c z [W].
- **Observational Results** (the analyzer's view, its CSV, text and print) shows the c z column as the derived study aid. Beside
  it, the record's typed velocity, Sp type, remarks and JD appear in the record column, or the `typed_velocity_float32_*`,
  `sp_type`, `remarks` and `record_jd` CSV columns.
- **Older builds:** builds before H2 refuse a v32 file with the generic format error.
- **E01 numbers:** they change only within the 1 % rule.
  - The tests type c times the dialog's 4-significant-digit z, rounded to 0.01 km/s. With the guide's 0.001 z steps, that z
    is exact, so their velocities differ from the derived ones by at most 0.005 km/s plus Single rounding (measured 0.0046;
    H0 moves by 1.2e-6).
  - With finer steps, the 4-digit z drifts by up to about 0.15 km/s.
- **Re-recording a galaxy:** with Time-Dependent Data off (the R3 option), it updates its row, which keeps its id and first time; on, it adds a row. The rule is core/recordReuse.ts, shared with LSS.
- **Compute Rdshft Vel.:** it pre-fills c·z when z ≠ 0, and the pre-fill is a store [D] (Front F3, H2 review N1): FormActivate
  writes Single(c·z) into the record's velocity (0x54aefc) before the dialog opens, and an empty box skips OK's store
  (0x54b155), so clearing the box keeps c·z. With the option off, an empty box keeps 0.
- **[W] Stellar rows and spectra:** stellar rows, imported and library spectra keep the web confirmation. VIREO sends every
  mode-4 Record through the dialog, but the web has no exercise mode, and stellar rows are alignment practice excluded from
  Hubble.
- **[W] Cancel** records nothing, and on a reused row changes nothing.
- **[W] Empty box on a reused row:** it stores 0; VIREO would keep the earlier velocity, which may be off the new z by more
  than 1 %.
- **[W] Record time:** it is the observatory clock at Record, because the web's acquisitions carry no spectrum time.
