# Photometer Record/Review (Front P3)

VIREO's photometer **File › Data › Record/Review**: the reading is written to the observation results list and opened in the
Observational Data window. Static reading of CLEA_VEO.exe (SHA-256 781bc970…c54c) only; nothing executed or emulated. Research:
`analysis/front-p3/RESEARCH.md`; plan `analysis/front-plans/front-p3.md`. Tags: [D] decoded, [I] inferred, [W] web choice,
[U] unknown. Code: `src/core/photometerNativeRecord.ts` (pure), `src/core/photometerRecord.ts` (the 0x54a73c rule),
`src/core/photometer.ts` (event `nativeRecord`), `src/Photometer.tsx`.

## What is ported
- **The reading** (TPhotometer+0x620, one 0x90-byte results record) [D]:
  - Start 0x4fffd4 fixes its name (`photometerRecordedName`: Sky / the object name with Show Object ID / `UNKNOWN` or `ObjX-`ID)
    and resets it. One reading holds one filter's value.
  - Completion (0x5016bf–0x501904) puts the magnitude in the filter's slot (0 when it is unavailable).
  - Record/Review is enabled after an object reading until it is recorded with OK. It is never enabled for a sky reading
    (magnitudes mode; 0x5018e5).
- **Record1Click 0x501e7c** [D]:
  - find-or-add by ID (0x54a73c);
  - RA/Dec := the telescope pointing when either is 0;
  - kind 1 ("Observed Magnitudes", 3 decimals);
  - nonzero slots copied.
  - All of this happens before the dialog, the shared `ObservationalDataDialog`.
  - OK (0x54b02c) stores the remarks (36) and the Sp type. The first OK of the bench shows **Data Saved** (0x502080/0x50210c).
- **Cancel** (0x54b2dc) follows VIREO [D]:
  - The record keeps the band value (a new row stays).
  - Remarks and Sp typed are dropped.
  - Record/Review stays enabled.
  - With Time-Dependent Data on, a second Record/Review appends a duplicate row.
  - This replaces the earlier "Cancel records nothing" web choice for photometer records only (Hubble and LSS keep theirs).
- **Time-Dependent Data** (env+0x2e8c, read at Record) [D]:
  - Off: B and V of one star share one row (key: the ID string).
  - On: every Record/Review adds a row.
- **Start with an unrecorded reading** (0x4fffd4) [D]: **Telescope has Moved!** (Yes opens Record/Review). If the reading is still
  not recorded after that, **Data Not Saved!** / "Current Readings Cleared!". Then Start goes on.
- **Display/Print Data** [D 0x542f2d]: Display/Print Data opens the Recorded Results list (row writer 0x5486a8, `RecordedResultsWindow`).
  - It is on the photometer page.
  - It is also in the own-observation HR view when rows exist.
- **Data from Observations** (0x542990): **Plot my photometer records** in the saved-observations HR workspace. V +0x40 and
  B +0x36; rows with either at 0 are skipped.
- **Storage.** Rows are encoded as the 144-byte records (time = JD − 2415018.5 as Double; RA/Dec and bands as Extended of the
  binary64 values [I]).

## Session format
- The journal event is `{type:'nativeRecord',readingId,id,jd,ra,dec,timeDependent,ok,remarks,spectralCode}`. A history with it is
  owner **15** (`OpenVireo-photometer-native-record-v15`); the header is v14's plus that policy.
- Owners 1–14 never contain the event, so they replay and re-save byte-identically. The existing fixture tests
  (`photometerOwnerCanonical`, `photometerRichLegacy`, `photometerSession`, the per-owner tests) are unchanged and pass.

## E04
- The guide's counts read the notebook entries and B−V pairs only (`pleiadesExerciseSummary`). Record/Review does not move them.
  A Vitest test compares the summary before and after native records.

## Galaxy gate (tiled fields)
- `photometer-galaxy` now applies only when the centre selects a galaxy (0x59a0fc over stars and the galaxy list field+0x1b).
  - It also applies when the star/galaxy overlap tie needs a throughput the field build does not have ([W] fail closed).
- A galaxy elsewhere in the field is ignored: the neighbour producer 0x59ac54 walks only field+0x5 and field+0x35 [D].
- This affects only telescope-pointing (compact GSC) fields; the bundled E04 fields do not use this path.
- The selected-galaxy branch (σ from the axes and 0x53b94c, Sky gated by the image level 0x53e338 ≥ 80) stays typed [U].

## Web adaptations and typed residue
- [W] The record time is the observatory clock at completion (VIREO: host Now). Without an observatory link, the host clock.
- [W] Compute Magnitudes is fixed on (kind 1); counts-mode records are not produced.
- [W] The reading lives within one activation. Leaving the bench drops an unrecorded reading. FormCloseQuery's "Data Not
  Recorded!" (0x501b84) is not reproduced. A Record/Review dialog closed by leaving the bench records nothing.
- [W] A reading already entered in the web notebook does not trigger "Telescope has Moved!": its value is kept there.
- [W] Photometer rows live in a photometer-owned list. VIREO shares one list and ID space with the classifier and Hubble Record Z,
  so cross-instrument same-ID merges are not reproduced.
- [W] The velocity box stays read-only (a typed velocity divides by c·0 natively, [I]). A Sp text the parser cannot store is
  refused.
- [W] Later OKs show a status line instead of VIREO's MessageBeep [I]. The HR handoff orders rows by time, then RA.
- Not ported:
  - the allotment counter (Obs+0x41c5dd);
  - AnalyzeHRDiagram1 enabling in exercise 3 (the web has no such menu gate).
- [D] [0x5b5d98] is the Object X ID: only TUTTimeDlg.OKBtnClick 0x4fdf0c writes it, from the IDEd box (+0x388, "ID # of Unknown Object (From Lab Sheet or Instructor)"); an empty box gives `UNKNOWN` (0x4fe078). The off-mode name is therefore `UNKNOWN`, or `ObjX-`+that ID (Front P3 review 1 M2).
- With Show Object ID off, every photometer reading has that one name, so with Time-Dependent Data off they all merge into one
  `UNKNOWN`/`ObjX-` row, as in VIREO (reuse by ID, 0x54a73c). Turn Show Object ID on for one row per star (review 1 M1).
- Still typed: `photometer-variable` (field engine / clock), `photometer-selection` (stale light; Show ID on dereferences nil),
  `photometer-qso`.

## Model and effort
- Plan: Claude Opus 5.5, high.
- Implementation: Claude Opus 5.5 (subagent).
- Review: the coordinator, review 1 (analysis/reviews/front-p3-review-1.md), Claude Opus 5.5 high; fixes at medium.
