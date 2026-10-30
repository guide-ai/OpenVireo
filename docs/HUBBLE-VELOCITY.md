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

**In the web, a catalogue-galaxy acquisition's Record measurement opens the same dialog** (`core/hubbleObservation.ts`, K2's
`ObservationalDataDialog` with Velocity editable).
- **Stored:** the typed Single velocity, its hex, remarks, Sp type, first time, target RA/Dec and V go in the measurement row.
- **Session v32** (`openvireo-hubble-observational-data-v32`, outermost) lists the records by measurement id around an
  unchanged base. On restore, each record must pass the 1 % check against its row's Single z and match the acquisition's
  target position and V. Older files restore and re-save byte-identically.
- **The Hubble analysis** takes a row's typed velocity when it has one, because VIREO's results list and its files carry the
  record's velocity. Otherwise it keeps v = c z.
- **E01 numbers:** they change only within the 1 % rule. The guide and tests type c·z rounded to 0.01 km/s, so their
  velocities differ from the derived ones by at most 0.005 km/s plus Single rounding.
- **Re-recording a galaxy:** with Time-Dependent Data off (the R3 option), it updates its row, which keeps its id and first time; on, it adds a row. The rule is core/recordReuse.ts, shared with LSS.
- **Compute Rdshft Vel.:** it pre-fills c·z when z ≠ 0.
- **[W]:** stellar rows, imported and library spectra keep the web confirmation (no catalogue target record). Cancel records
  nothing, and on a reused row changes nothing. The analyzer's own-results table stays the derived c·z study aid.
