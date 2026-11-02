# Spectrometer at the telescope pointing (Front G, G4a and G4c)

The Spectrometer page (`#spectrometer`) now holds VIREO's single-slit spectrometer wherever the telescope points. The plan is
`analysis/front-plans/front-g-gsc.md` §11.

## Evidence

- VIREO builds the instrument field at every pointing (0x53be70).
- The spectrometer is the default instrument in modes 0/1/2/4/5 (0x538062), and its Access (RdngBtnClick 0x53cce4) has no
  pointing check.
- The slit takes the nearest object (0x59a0fc).
- Static reading only; no equivalence with the original program is claimed.

## How it works

- **Pointing.** The student points the telescope in the Observatory, with its own checks (dome, Limit Slewing). This screen
  has no pointing control of its own (G3 review 1 M2: fewer pointing paths). **Use the telescope pointing** then reads the instrument field (0.375°) from the compact GSC tiles
  (`io/fieldSpectrometer.ts` → `assembleFieldPack`).
- **Spectrum.** `core/fieldSpectrometer.ts` (`spectrometerFieldResult`) uses the same option set as the Object X spectrometer:
  - the GLXYSP guard;
  - the recovered variable dispatch;
  - the approved photographs;
  - QSO 'merge';
  - 'start-time' continuation;
  - the page's spectrometer range (Front S2/S3: any range the Spectral Range dialog gives, 3500–7400 Å in 100 Å steps;
    default 3700–4700 Å);
  - star and QSO observation;
  - a galaxy's own bundled spectrum;
  - the observatory-clock JD, frozen when the student presses **Use the telescope pointing** (G4a review 1 M1), so a
    time-dependent variable star in the field is evaluated at that time, as Field Information and LSS do.

  The inputs are every template JSPEC2.SPI names (132) and the bundled own galaxy spectra, fetched and checked a few at a
  time. Photographs (Front F4, user approval of 2026-11-02: all 175 that GLIMAGES.LST names and the zip contains) are not
  loaded up front: `spectrometerInputsFor` fetches, checks and decodes only those the pointing's assembled pack names
  (`io/photographBitmaps.ts`), once each per page. A field at a photographed galaxy now draws it instead of stopping at
  `photographic-image`; NGC4643.BMP, M83.BMP and M108.BMP stay typed [W] (`UNDRAWN_PHOTOGRAPHS`, see docs/FIELD-ENGINE.md).

  Object X now calls the same function. At every Object X spectroscopy row and telescope, the generic result from the tiles
  equals the Object X result from its bundled pack (`src/io/fieldSpectrometer.test.ts`).
- **Gate.** The native instrument gate applies (`instrumentAccess`: moving, tracking, finder view, dome), plus "this field is
  the current pointing and telescope". Moving the telescope or changing the profile asks for the pointing to be used again.
- **Exposure.** The ordinary bounded journal (`createFieldExposure`), with policy
  `openvireo-field-spectrum-v1:<ra>,<dec>:T<telescope>[:JD<jd>]` (exact binary64 pointing and frozen JD). The session file
  holds the policy, seed and events. Restoring prepares the field again at that pointing, telescope and time and replays the
  journal; counts are never imported. A session from the same pointing and telescope at another observatory time restores too:
  the page then shows the session's re-prepared field and keeps its JD (G4a closure N2). The counts CSV quotes the policy field (RFC 4180), since the policy contains commas.
- **Readout.** "Nearest object, selected by the slit": the object 0x59a0fc selects, which may give no light in the slit
  (`slit-empty`).
- **Typed results**, shown as readable text (`fieldSpec.reason.*`):
  - the engine's reasons (slit-empty, mean-bound, variable-*, merge-boundary, photographic-image, spectrum-mapping, …);
  - every template JSPEC2.SPI names is bundled (the 17 remaining ones were approved on 2026-10-30), and the matcher's bucket
    `Round(Frac(index / 10000) · 100)` is computed as the x87 does under Delphi's control word 0x1332 (64-bit precision, round to
    nearest-even; G4a closure N1), so every index that 0x50d660 resolves gets its template, including the 1,176 GSC records
    whose index is not a multiple of 100 (many naked-eye stars). The bucket agrees with an independent 80-bit witness;
  - `star-index-invalid`: 0x50d660 returns nil (5,468 GSC records have an index above JSPEC2.SPI's last row); VIREO shows
    "You Cannot Record A Spectrum of This Star! Spectrum Index is Invalid!" and records nothing;
  - `star-template-random`: a star whose spectral code is 0. VIREO draws Random(131) over the sorted JSPEC2.SPI list (0x50e38a,
    RandSeed 0x5ae008 after Randomize, so not reproducible). It is unreachable with the published data: none of the 18,841,240
    compact GSC records has code 0, a code-0 variable makes the dispatch FALSE, and QSOs are type 3 (Front RE6,
    research front-re6/random-template-code0.md). It stays typed;
  - preparation failures are typed by cause: a network failure is a missing catalogue piece (try again), a resource that does
    not match its identity is a load error, and anything else is an internal error to report (G4a closure N1).
  - the tile reasons (field-polar, field-tiles, field-unreadable);
  - `object-x-hidden`: within 2° of an Object X position.
- **Photographs.** Assembled packs now take their photograph matches from VIREO's kept GLIMAGES.LST rows
  (`nativePhotographRows`). A row that fails to parse, such as NGC 4449's, is dropped whole, as the Object X runtime already did.
- **Exercises.** Exercise routes, packs, policies and counts are unchanged. These exposures never count toward an exercise.

Multi-Spec at any pointing (G4b) is described in MULTI-SPEC.md.

## Outputs and the investigation (G4c)

- **Save .SSP.** A stopped exposure is saved through the recovered dot-decimal writer, as the star, galaxy, LSS and Object X routes
  save theirs.
  - Header object: VIREO's name for the slit object, the current-object record's ShortString (header 0x510090) [D]: a GSC star
    `<band>-<name>` (for example `N0000-01634`, built at 0x59b125..0x59b196), a kept variable its GCVS ID, a QSO its CLEA_QSO.DAT
    name (0x5987e4), a galaxy its catalogue or photograph name (Front RE6, research front-re6/U6-ssp-header-name.md). Printable
    ASCII, commas → `_`, at most 24 characters. The record locator (`N0000.DAT@63282`) only where that name cannot be built [W].
    Files saved by earlier builds (before Front RE6) keep the locator in their header; they still import, and their data rows
    and file names are unchanged. The star route's header names its target `N0000-00008` the same way.
  - Magnitude: that record's catalogue magnitude.
  - Pointing: the field's pointing, as recorded in the policy.
  - Rows: 600 source-plus-sky bins from the calibration's first wavelength, step (maximum − minimum)/600 Å (1000/600 Å at the default range).
  - The bytes equal the Object X save after the reveal at every Object X row (galaxies, stars and QSOs).
  - Default file name (Front R4d): with Show Object ID off (the compiled default), `field-<locator>.ssp`, using only letters,
    digits and '-', so the file-name ID keeps the whole locator; with it on, VIREO's `Name.SSP` (the current object at the
    prepared pointing; `\ / : * ? " < > |` become `_`, and a name outside printable ASCII keeps the web name). The bytes do not
    depend on the option. The Object / App. Mag (V) boxes and the print lines follow Show Object ID / Show Object Mag
    (docs/FRONT-R4-OPTIONS.md, R4d).
  - **Sky reading** (Front R4e, `fieldSpectrometerSkyReading` in `core/currentObject.ts`): the reading is a sky reading when
    VIREO's throughput 0x50f338 is 0 for the slit object the field engine selected (the same 0x59a0fc nearest object), computed
    from that selection, the frame's slit level and the pointing, also where the engine returns before its own throughput. A
    field blocked before the slit selection uses the current object instead: a star or QSO outside 0x50f338's strict cut reads
    `Sky`; [W] a galaxy, and a star or QSO inside the cut, stay named. A sky reading shows `Sky` and an empty magnitude in the
    Object / App. Mag (V) boxes and prints `Reading Sky`. Details and probes: docs/FRONT-R4-OPTIONS.md (Sky reading).
- **Print.** Uses the shared spectrum print card, so it carries VIREO's print header (0x58e860, Front H2) and, since Front
  RE6, the print body 0x510240.
- **Analyze / Classify.** Both read the exposure's own .SSP back as if the student had opened the saved file. Analyze opens it in
  the spectrum analyser; Classify opens it as an imported spectrum. If the analyser is busy with a file operation, the page
  says so instead of blaming the spectrum.
- **Object X.** Preparation masks the field within 2° of every ObjectX.HTL position and of the lab's hidden target. A hidden
  target chosen after the field was prepared masks it from then on, by the same rule. While masked, the page withholds
  everything: the readout, the exposure, CSV/JSON, .SSP, Print, Analyze, Classify, and the field's part of the investigation.
  The masked field and its exposure are dropped, so lifting the mask brings nothing back; the student uses the pointing again
  (G4c review 1 L2). This late mask cannot happen today: the lab's hidden target is always an ObjectX.HTL row, which
  preparation already masks within the same 2°.
- **Investigation (session v33).**
  - The investigation file holds the field and its exposure in an outermost wrapper around an unchanged v1..32 base.
  - Policy: `openvireo-field-spectrum-investigation-v33`. The part is the standalone exposure-session object, plus a SHA-256 over
    what the replay derives.
  - Restore assembles the field again from the tiles at the policy's pointing, telescope and JD, applies the mask, and replays
    the journal. An edited, nested or masked part rejects the whole file. A tile or catalogue file that does not arrive,
    including ObjectX.HTL on a page that has not read it yet, is a resource failure (G4c review 1 M1), and the message names
    no single route.
  - Saving pauses a running exposure.
  - A file without the part keeps its older version and bytes exactly, and restoring it clears the field.
