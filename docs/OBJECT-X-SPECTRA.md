# E08 Object X — spectrometer branch (Front F)

Front F supplies the field-engine side of the Object X spectrometer. Front X owns the route and UI (`src/ObjectX*.tsx`,
`src/objectx/**`, `objectXInvestigation.ts`); this document is the interface for it.

## API (`src/io/objectXSpectrometer.ts`, pure core `src/core/objectXSpectrometer.ts`)
`observeObjectXSpectrum(pointing, telescope) → ObjectXSpectrometerResult`
- `pointing` must be exactly the ObjectX.HTL coordinates of a spectroscopy row (what "Copy the coordinates to the observatory"
  gives); anything else is `{status:'unavailable', reason:'not-a-target'}` (no field is generated at arbitrary coordinates).
- `available`: `targetKey` (the ObjectX.HTL row), `telescope`, `wavelengths` (600 channels), `pixelLevel`, and `engine` — the same
  bounded exposure journal as every acquisition (`create/activate/start/tick/pause/deactivate/reset/cancel/replay`), policy
  `openvireo-objectx-spectrum-v1:R<row>:T<telescope>` (`parseObjectXSpectrumPolicy`).
- `unavailable`: `reason` ∈ `not-recovered` | `telescope` (the existing brightness bound; another telescope may work) | `no-object`
  | `not-a-target`.
- Hidden identity (D5): no display field names the object, its kind or a catalogue record. `revealDetail` (kind and record, or
  the engine's typed reasons) is for after the reveal only.
- Loading is asynchronous and hash-checked (packs, CLEA_GLX.DAT, CLEA_QSO.DAT, QSOSpect.dat, GLIMAGES.LST, ObjectX.HTL); a failure
  rejects and the next call retries.

## Status per spectroscopy row
| Row | Kind | 0.4 m | 0.9 m | 4 m | Why |
|---|---|---|---|---|---|
| 1 HE 0353-3919 | QSO | available | available | available | QSO 522 selected; QSO 517 also in the field (both ordered inserts) |
| 10 3C 273 | QSO | telescope | telescope | available | QSO 1356 **replaces** its own GSC record N0000@550801 (within 30″ and 1 mag); bright: mean bound on 0.4/0.9 m |
| 13 HS 1603+3820 | QSO | available | available | available | QSO 1785 inserted |
| 8 NGC 4449 | galaxy | telescope | telescope | available | its GLIMAGES.LST row is dropped by the original parser (below), so no photograph; own NGC4449.SP (GLXYSP Pos lookup, matched branch) |
| 9 N3730-01103 | star | telescope | telescope | available | slit selects N3730.DAT@513845 (V 9.47), spectral index 50105000 → A0000044.sp (JSPEC2.SPI) |
| 3, 6 NGC 2403 / NGC 4262; 4, 5 stars in their fields | — | not-recovered | not-recovered | not-recovered | photograph rows 40 / 97 (BMP approval pending) |
| 11 NGC 4631, 12 N3000-01915 | — | not-recovered | not-recovered | not-recovered | photographs 131 / 135 and variable 9631 |

## Spectral interval
The normal spectrometer's: the active range (env+0x2bd4/0x2bd8 = general record +0x2520/+0x2524) is copied from the configured
range +0x2518/+0x251c at startup (0x5a2a5c..0x5a2a6e), after the options file (0x5a3f70..0x5a3f88) and from the options dialogs
(0x50cb66..0x50cb78, 0x588980..0x588992); its compiled default is 3700–4700 Å (0x5a2a1e/0x5a2a28), the interval the verified star
exposure already uses. No Object X specific interval exists on that path. Adaptation: no options file and no range control, so
the default is used (`OBJECT_X_SPECTRAL_INTERVAL`).

## Photographic list as the original keeps it (`src/core/photographicList.ts`)
The list loader 0x596bd0 (first call from the population assembler, 0x597b61) parses each GLIMAGES.LST row in try…except
(0x59719a: Exception → result false) and inserts only rows that parsed (0x596ce8). The width/height/centre columns go through
StrToInt 0x40ad50, which raises on an empty field (Val returns code 1 on a nil string, 0x40435a). So 9 rows are dropped silently:
6, 7, 9, 11, 19, 20, 91, 112 (NGC 4449) and 176 — every row whose BMP is absent from the archive is among them. No dropped row lies
in an E02 LSS area (tested), so LSS gates are unchanged.

## Star branch (`src/core/starTemplates.ts`)
Generalizes the verified star: spectral index = packed Int32 at compact-record offset 8; JSPEC2.SPI (approved, bundled) read and
ordered with the cursor insert 0x492728 (signed comparator 0x50d454); exact match 0x50d660, no fallback (a miss stays
star-selected); the template's flux values on a uniform endpoint grid (0x55ef64..0x55f05d); 600 channels through 0x55dfe0.
Reproduces the verified star (index 50705000 → A0000049.SP, row 103 of the sorted list). Templates are the byte-exact files
already published in `public/original/classification` (A0000044.SP for row 9); JSPEC2.SPI names them in lower case, the
bundled names are upper case (case-insensitive original file system).

## Photographic images (static RE done; BMPs not bundled) — `src/core/photographDraw.ts`
- Association (0x598ed2..0x599128): the first kept photograph whose name contains the galaxy's name (Pos) attaches an image
  object (0x59721c) at galaxy +0x55; insertion order is unchanged.
- Load 0x597290: LoadFromFile, then factor = {0.7, 0.85, 1.2}[selected telescope record, env+0x3818] × 0.8 (0.56, 0.68, 0.96);
  y = 1..Height, x = 1..Width (TBitmap VMT +0x20 GetHeight, +0x2c GetWidth); pixels outside the bitmap are no-ops, so row 0 and
  column 0 stay unscaled; Round(red × factor), clamped to 255, written as gray.
- Draw 0x597470 from the compositor 0x53b5d5..0x53b61c (instead of the synthetic stamp): left = Round(x) − centreX,
  top = Round(y) − centreY (GLIMAGES columns 9/10), unscaled TCanvas.Draw — it overwrites, unlike the synthetic larger-red rule.
- Tested on authored synthetic bitmaps only. Open: how the photo record's name string is built from columns 1–3 (it decides Pos
  matches); GDI's colour mapping when SetPixel writes gray into an 8-bit palettized bitmap (modelled as the nearest palette entry).

## QSO observation (recovered)
- Selection: the merged QSO record (type 3) under the slit (0x59a0fc), point-source throughput with the QSO's own position and the
  pointing (0x50e0d7 star path, type 3), amplitude from its V Single and the telescope zero point.
- Source: QSOSpect.dat (approved byte-exact, 8251 × 6-byte records, Int16 rest wavelength 302..8552 Å, Single intensity).
  Constructor 0x55e330: rest window [λmin/(1+z), λmax/(1+z)] clamped to 302 / 8552 Å; first record Round(restMin − 302);
  count Round(restMax − restMin) + 1; 0x55df2c grid with lastIndex = count (count + 1 slots, the last never read and 0; step =
  (restMax − restMin)/count); values divided by the window maximum. Sampler 0x55e52c: 0x55dfe0 at λ/(1+z). `src/core/qsoSpectrum.ts`.

## Not recovered (typed `not-recovered`)
- Rows whose areas hold a kept photograph (NGC 2403, NGC 4262, NGC 4631, NGC 4656): until the four BMPs are approved and the record
  name construction is confirmed, no field is drawn for them.
- Rows 11–12 also hold variable 9631, which the outside-view rule does not admit.

## Open decision (coordinator / user)
Coordinator decision (2026-10-27): `observeObjectXSpectrum` is not wired into the Object X UI until every spectroscopy row's kind
is observable; each still-unavailable row then shows one kind-neutral message. A test checks that unavailable results have the
same fields and reason domain across kinds and that resources are loaded once, up front.

## Evidence
`data/objectx/spectra-*.json` (seven bounded packs; N6000, N0730, N1500, N3730, N3000, N0000, S3730 — N1500 because the NGC 4262 /
N0730-00120 areas cross +15°), `data/objectx/PROVENANCE.json`, `data/objectx/witnesses.json` (independent Python model reproduced
by `src/io/objectXSpectrometer.test.ts`).
