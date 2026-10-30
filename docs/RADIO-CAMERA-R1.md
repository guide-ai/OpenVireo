# Radio and camera leftovers (Front R1)

**Status:** merged into main from branch `claude/front-r1-radio-camera` (2026-10-29); review 1 (MERGE-AFTER-FIXES) applied.

**Plan:** research root `analysis/front-plans/front-r1-radio-camera.md`.

**Recovery dossiers** (`analysis/front-r1-radio-camera/`):
- A: Add Current Item and Save Recorded Data;
- B: Review Find and Save Recorded Measurements;
- C: TRadiOptsDlg and the receiver sound;
- D: camera field objects, colour term, overlay and FITS writer.

**Method:** static reading of CLEA_VEO.exe (SHA-256 `781bc970…c54c`) only; nothing was executed, emulated or sent. No new
resources are used.

**Tags:** [D] decoded · [I] inferred · [W] web adaptation.

## Radio

### Noise draw for a negative mean (the "5 of 558" catalogue rows)
- The Poisson routine 0x55f0f4 has no mean guard [D]. For a mean below 12 it caches g = Exp(−mean) and multiplies uniforms
  while the product is above g. A finite negative mean gives g > 1, so it returns 0 after one uniform.
- The 5 refused catalogue rows had a negative first-sample area (0.2P ≤ dt < 0.3P), not a large mean.
- The radio now takes that native branch (`poissonDraw(…,'native')` in `src/core/acquisition.ts`, used by `radioRandom.ts`).
  The rejection branch for means of 12 or more is Front M's, unchanged.
- NaN, infinite and > 1e6 means are still refused; those are browser limits [W].
- This is [D] for −11356 < mean < 0. Below about −11356.5, Exp(−mean) overflows Extended and VIREO would likely raise
  EOverflow [I]; the web still draws 0 there [W]. The bundled catalogue cannot reach that range.

### Slew › Hot List › Add Current Item
- **Enable** [D]: when Receiver 1 opens (0x567a83), as long as slewing is allowed. VIREO disables it at a manual-slew horizon
  stop and at a confirmed programmed-slew start, and never re-enables it on arrival.
- **Record** (`src/core/radioAddCurrent.ts`):
  - RA/Dec: the current pointing. With Exact Pos (compiled 0) and a named pulsar in the buffer (the length byte +0x5f7,
    which a receiver miss clears), VIREO would use the catalogue position.
  - ID: by Pulsar Identification (compiled 1, the B1950 name), copied as stored, at most 24 characters.
  - Object X (0x567d1e) [D]: in the exercise the ID is always `ObjX-` + the target ID (or `UNKNOWN`), wherever the antenna
    points; the buffer's names are never read. The web uses its label for the hidden target. [W] After the reveal the web stops
    hiding and uses the pulsar name.
  - Remarks: always empty.
- **Flow:** the shared entry dialog (THOVerifyDlg), then the RA-ordered append (Front P), then the box
  `Object <ID> added to Observation List.` or `Position added to Observation List.`, caption `Observation List`.

### File › Save Recorded Data
- **VIREO** [D]: the item is enabled only by the analysis FormActivate/Load mirror of its Save1 enable and by a non-Yes answer
  to `Save Data Now?` (a Yes answer skips it). Its click calls the save wrapper 0x56b36c, the same as the analysis Save.
- **Web** [W]: enabled while the analysis holds a recording, not the cleared header that arming Record leaves. The click opens
  the analysis, where its verified Save writes the file; it does not save by itself.

### Review › Find
- The contract is the existing `savedFindRun` (`src/core/pulsarSavedRows.ts`, PLR-REVIEW-FIND-STATIC-01), also used by the
  saved-row viewer.
- **Dialog** [D]: `Find Record Containing...`, `Search String:`, Case Dependent and the `Begin Search:` buttons From Top, From
  Cursor and Cancel.
- **Search** [D]: the query is stored and lowercased in place (A–Z only). Each row's copy is lowercased and matched by
  substring. From Top starts at row 0, From Cursor at the row after the selection, and there is no wrap. Case Dependent is
  stored but never read.
- **Memory** [D]: the dialog reopens with the remembered, lowercased query. [W] The web keeps it while the analysis is open,
  separate from the viewer's.
- **Miss** [D]: the answer is `"<lowercased query>" Not Found.`, caption `String Not Found`.
- **Keys:** Escape is that dialog's Cancel (or the notice's OK), and the Review stays open with its draft. A hit focuses the
  selected row [I].
- **Rows** [W]: the web's row text. It can differ from VIREO's in the file-name tail, in rounding near ties, and for NaN.
- **Query bound** [W]: printable ASCII, at most 80 characters.

### Options (TRadiOptsDlg)
The read-only boxes show the compiled states, each with one line on its effect:
- Plot 0, Write HTL 0, Exact Pos 0, Sound Features 1, Test Mode 0;
- Pulsar ID 1;
- Telescope Type 0, Fully Steerable. Arecibo has no code of its own; only Transit is tested.

## Camera

### Colour term 0x51ef38 (`src/core/cameraColourTerm.ts`)
- **Filters** [D]:
  - NF and R → V−R;
  - B → −(B−V) of the field star;
  - V → 0;
  - I → (V−R)+(R−I).
- **Zero:** the term is 0 when the period is 0, the rise word is 0 (with no class-1 exemption) or the class is 3.
- **Classes 1 and 2:** they use the base object, whose V−R and R−I are 30 (the original bug, kept).
- **Magnitude:** Single(V − term).
- **Not wired:** the field-object pass 0x5228dc needs the field-engine variable population, which the camera does not have.

### Overlay
- **Source** [D]: a 936² bitmap that the field painter 0x53b390 fills with galaxies only (stamps, photographs, M31), before
  the stars are painted.
- **Gate:** +0x412 is set by any galaxy in the field other than M31, and reset at each field load.
- **Window:** the rectangle is centred on the telescope pointing and scaled to the camera field, then StretchDraw'n to the
  camera size.
- **Still typed:** the GDI StretchBlt mode is not recovered, so the overlay stays unavailable.

### Save image (VIREO header) (`src/core/cameraFitsNative.ts`)
- **Card order** [D]: SIMPLE BITPIX NAXIS NAXIS1 NAXIS2 OBJECT ORIGIN DATE FILTER RA DEC EPOCH OBSERVAT TELESCOP INSTRUME
  DETECTOR OBSERVER EXP DATE-OBS GAIN END.
- **Card formats** [D]: the value ends at column 30. Strings are quoted from column 11 and their quotes are not doubled. The
  comment after `/` is empty.
- **Values** [D]: ORIGIN `CLEA Simulation`; EPOCH `'2000.0'`, quoted; RA/Dec as `h:m:s.s` / `d:m:s`; INSTRUME `CCD Camera` or
  `Infrared CCD Camera`; filters NONE B V R I and J H K.
- **Layout** [D]: the header is padded to 2880 bytes. The data are not padded.
- **Web choices** [W]:
  - OBJECT is `UNKNOWN`, so the file is `UNKNOWN-01.FIT`;
  - DATE is the exposure time;
  - DETECTOR and OBSERVER are empty;
  - NAXIS1/2 are the plane size;
  - OBSERVAT and TELESCOP come from the compiled profile.
- **Key column** [D]: the keyword table 0x5b3ff8 holds String[8] entries already space-padded.
- The standard web FITS stays the first button.

## Follow-ups
- **Results › Save Recorded Measurements, native:**
  - the header's date and time use the host locale (ShortDateFormat/LongTimeFormat);
  - the post-save state machine is not ported;
  - the web save stays.
- **Receiver sound:** it is synthesized in code (PulsarSoundObj, waveOut, 8-bit 5512 Hz), but the meanings of its noise and
  gain parameters are only inferred. It stays silent with a note.
- **Camera field objects:** the colour term is ready; the pass needs a field-engine population in the camera.
- **Camera overlay:** needs the StretchBlt mode.
- **Field-object pass 0x5228dc:** the plan's pure-function fallback (two draws per eligible variable, the tail overwrite) was
  not delivered; only the colour term was.
- **Hot-list appends during an observatory edit** (review L5): Add Current now refuses while the observatory editor has an
  Add or Edit open, as radio Load does. The other appenders (optical Slew, QSO list, field information, cluster database)
  still insert by RA under an open Edit, which shifts its row index. Fix that once, in the shared pattern.

## Code and tests
- **Vitest:**
  - `radioRandom.test.ts`: the negative-mean branch;
  - `radioAddCurrent.test.ts`: the record rules, Object X anywhere, no trim;
  - `pulsarProvenance.test.ts`: Find recorded as a web adaptation;
  - `cameraColourTerm.test.ts`;
  - `cameraFitsNative.test.ts`;
  - the receiver and list tests, whose refusals now come from a 1e8 flux.
- **Playwright:**
  - `tests/radio-receiver-app.spec.ts`: both noise outcomes;
  - Add Current: `tests/radio-receiver-app.spec.ts`; Object X (review M2): `tests/object-x-radio.spec.ts`;
  - Find and Escape (review M1): `tests/pulsar-analysis.spec.ts`;
  - options: `tests/radio-simulation-options-app.spec.ts`; Save Recorded Data: `tests/radio-access-options-app.spec.ts` and
    `tests/radio-receiver-save-verified-app.spec.ts`;
  - the camera's VIREO-header save: `tests/camera-exposure.spec.ts`.

## Model and effort
| Step | Model | Effort |
|---|---|---|
| Plan and recovery | Claude Opus 5.5 | high |
| Implementation and tests | Claude Opus 5.5 | medium |
| Review 1 (`analysis/reviews/front-r1-review-1.md`) | Claude Opus 5.5 (coordinator) | high |
| Review 1 fixes | Claude Opus 5.5 | medium |
