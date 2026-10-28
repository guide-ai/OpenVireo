# E08 Object X — spectrometer branch (Front F)

Front F supplies the field-engine side of the Object X spectrometer and, since Front X finished, its UI wiring
(`src/ObjectXSpectrum.tsx` in the `#object-x` route).

## API (`src/io/objectXSpectrometer.ts`; pure core `src/core/objectXSpectrometer.ts`)
- `observeObjectXSpectrum(pointing, telescope)` → what the display may show before the reveal (D5, review 2 finding 4):
  `{status:'available', telescope, wavelengths (600 channels), engine}` or `{status:'unavailable', telescope}` — no row, kind,
  record or reason, so every unavailable case (brightness bound, no field at a pulsar's or asteroid's coordinates, any typed
  branch) reads the same. `engine` is the bounded exposure journal of every acquisition
  (`create/activate/start/tick/pause/deactivate/reset/cancel/replay`), policy `openvireo-objectx-spectrum-v2:<code>:T<telescope>`
  with the opaque target code, never the ObjectX.HTL row (`parseObjectXSpectrumPolicy`).
- `revealObjectXSpectrum(pointing, telescope)` → the separate reveal data: `row`, `kind`, `recordId`, typed `reasons`
  (`not-a-target` when the pointing is not a spectroscopy row's exact coordinates), `pixelLevel`. For use after the reveal only.
- Evaluation runs in a Worker (`io/objectXSpectrometerWorker.ts`), never on the main thread; inputs are loaded once and
  hash-checked (`io/objectXSpectrometerInputs.ts`: the seven packs against the file SHA-256 in `data/objectx/PROVENANCE.json`,
  CLEA_GLX.DAT, CLEA_QSO.DAT, QSOSpect.dat, GLIMAGES.LST, ObjectX.HTL, JSPEC2.SPI, GLXYSP.LST, four star templates, three galaxy
  spectra and four photographs). A failure rejects; the next call retries.
- Regression record: `data/objectx/frozen-observations.json` (every row × telescope: status, reasons, populations, photographs,
  crop digest, slit level, fraction, source file, source-means digest), checked by `src/io/objectXFrozen.test.ts`.

## Accepted D5 residual
Before the reveal the display carries no reason, but the availability pattern across telescopes still narrows the kind: on the
4.0 m every star, galaxy and QSO row gives a spectrum and every pulsar or asteroid row gives none, and on the 0.4 m only some QSO
and galaxy rows do. The coordinator accepted this (2026-10-28) as a consequence of recovered behaviour: in the original a pulsar
or an asteroid also puts no measurable object in the slit. The web has no approved field at those coordinates and does not invent
a sky-only spectrum, so the neutral message says only "No measurable spectrum at this position with this telescope."

## Kept spectra (save and restore)
The student keeps a stopped exposure (`ObjX-<ID>-Snn`, at most 8). A record holds the label, the opaque target code, the telescope,
the seed at reset and the journal events — nothing that names the object. These bounds — at most 8 records, each journal within the exposure journal's event
limit, and at most 24000 events over all of them — are checked right after the combined replay budget, before any engine-field
preparation or base replay. The budget is separate from the combined one (these journals replay against their own Object X
fields), so a v29 replays at most 24000 + 24000 events. Kept spectra are saved in the v29 wrapper
(`objectXSpectra`, only when present; the v28 Object X section is unchanged) and restored by re-evaluating each record and
replaying its journal (`io/objectXSpectra.ts`); a record that does not replay rejects the file, a loading failure is the retryable
`resources` error. A kept spectrum's CSV (`wavelength_A,counts`, 600 rows) is rebuilt identically after a restore.

## Status per spectroscopy row
Reveal-side outcomes (`telescope` = the existing brightness bound, `mean-bound`; the display shows only available/unavailable).

| Row | Kind | 0.4 m | 0.9 m | 4 m | Why |
|---|---|---|---|---|---|
| 1 HE 0353-3919 | QSO | available | available | available | QSO 522 selected; QSO 517 also in the field (both ordered inserts) |
| 10 3C 273 | QSO | telescope | telescope | available | QSO 1356 **replaces** its own GSC record N0000@550801 (within 30″ and 1 mag); bright: mean bound on 0.4/0.9 m. The replacement is a 95-byte copy over the GSC record, so the stack-residue uncertainty documented in qsoMerge.ts applies to this acquirable result (review 2 finding 12) |
| 13 HS 1603+3820 | QSO | available | available | available | QSO 1785 inserted |
| 8 NGC 4449 | galaxy | telescope | telescope | available | its GLIMAGES.LST row is dropped by the original parser (below), so no photograph; own NGC4449.SP (GLXYSP Pos lookup, matched branch) |
| 9 N3730-01103 | star | telescope | telescope | available | slit selects N3730.DAT@513845 (V 9.47), spectral index 50105000 → A0000044.sp (JSPEC2.SPI) |
| 3 NGC 2403 | galaxy | available | telescope | available | drawn from NGC2403.BMP (GLIMAGES row 40); GLXYSP fallback template |
| 4 N6000-00685 | star | telescope | telescope | available | N6000.DAT@209199, index 30005000 (no entry) → A0000018.sp by the 0x50d660 walk-back; NGC2403.BMP in the field |
| 5 N0730-00120 | star | telescope | telescope | available | N0730.DAT@472049, 60005000 → A0000052.sp; NGC4262.BMP in the field |
| 6 NGC 4262 | galaxy | available | telescope | available | drawn from NGC4262.BMP (row 97); own NGC4262.SP |
| 11 NGC 4631 | galaxy | telescope | telescope | available | drawn from NGC4631.BMP (row 131); own NGC4631.SP; variable AQ CVn (9631) takes the false-merge branch |
| 12 N3000-01915 | star | telescope | telescope | available | N3000.DAT@483032, 50305000 → A0000046.sp (bundled); NGC4656.BMP in the field; AQ CVn as row 11 |

Every spectroscopy row is now observable on at least the 4 m, so all three kinds can be investigated (the coordinator's
condition for wiring the API into the Object X UI). Before the reveal every unavailable case shows the same neutral message.

## Spectral interval
The normal spectrometer's: the active range (env+0x2bd4/0x2bd8 = general record +0x2520/+0x2524) is copied from the configured
range +0x2518/+0x251c at startup (0x5a2a5c..0x5a2a6e), after the options file (0x5a3f70..0x5a3f88) and from the options dialogs
(0x50cb66..0x50cb78, 0x588980..0x588992); its compiled default is 3700–4700 Å (0x5a2a1e/0x5a2a28), the interval the verified star
exposure already uses. The QSO preparation reads the same global range (0x50e821..0x50e853 pass [cfg+0x6b4+0x2520]/[+0x2524] and the
QSO's z to 0x55e330), as do the other spectrum paths (0x510555, 0x526e7f). No Object X specific interval exists. Adaptation: no options file and no range control, so
the default is used (`OBJECT_X_SPECTRAL_INTERVAL`).

## Photographic list as the original keeps it (`src/core/photographicList.ts`)
The list loader 0x596bd0 (first call from the population assembler, 0x597b61) parses each GLIMAGES.LST row in try…except
(0x59719a: Exception → result false) and inserts only rows that parsed (0x596ce8). The width/height/centre columns go through
StrToInt 0x40ad50, which raises on an empty field (Val returns code 1 on a nil string, 0x40435a). So 9 rows are dropped silently:
6, 7, 9, 11, 19, 20, 91, 112 (NGC 4449) and 176 — every row whose BMP is absent from the archive is among them. No dropped row lies
in an E02 LSS area (tested), so LSS gates are unchanged.

## Star branch (`src/core/starTemplates.ts`)
Generalizes the verified star: spectral index = packed Int32 at compact-record offset 8; JSPEC2.SPI (approved, bundled) read and
ordered with the cursor insert 0x492728 (signed comparator 0x50d454); the template's flux values on a uniform endpoint grid
(0x55ef64..0x55f05d); 600 channels through 0x55dfe0. Reproduces the verified star (index 50705000 → A0000049.SP).

Matcher 0x50d660 (corrects the earlier "exact match, no fallback" reading): nil if the list is not loaded or the index is below
10 000 000; a forward walk returns an exact match; at the first larger entry it walks back (0x492668) to the nearest lower entry
whose bucket Round(Frac(index/10000)·100) (0x40365c is Frac, 0x403700 is Round via FISTP) equals the key's, otherwise it
returns the entry just before the larger one (the first entry if the key is below all of them); a key above every entry is nil.
Computed exactly on integers; indices that are not multiples of 100 are rejected (no x87 measurement).

Templates (each byte-identical to its jspect2 original): A0000044 (row 9), A0000052 (row 5) and A0000018 (row 4) already
published in `public/original/classification`; A0000046 (row 12) bundled in `public/original/spectra/jspect2` under the
2026-10-27 group-1 approval. JSPEC2.SPI names them in lower case; the bundled names are upper case.

## Photographic images — `src/core/photographDraw.ts`, field-engine option `photographs`
The four BMPs (NGC2403/4262/4631/4656, user approval of 2026-10-28) are bundled byte-exact in `public/original/images`. NGC4449.BMP
is absent from the archive; its row is dropped by the native parser, so NGC 4449 keeps the synthetic stamp (as natively, no
photograph is ever loaded for it).
- Sublist 0x596ab8: kept photographs inside the fresh area (inclusive), in file order (0x492574 insert after cursor).
- Names: photograph = 'NGC ' + column 2 when column 1 is empty, else column 1 + ' (NGC ' + column 2 + ')', String[18]
  (0x596dfa..0x596f78); galaxy = ('NGC ' + s)[:11], ('IC ' + s)[:10] or String[18]@47, not trimmed (0x598e58..0x598ecd).
- With the option, a photograph in the area no longer gates the field by itself; only an associated photograph without a bitmap
  keeps `photographic-image`. A photographed galaxy skips the synthetic stamp bound.
- Association (0x598ed2..0x599128): the first kept photograph whose name contains the galaxy's name (Pos) attaches an image
  object (0x59721c) at galaxy +0x55; insertion order is unchanged.
- Load 0x597290: LoadFromFile, then factor = {0.7, 0.85, 1.2}[selected telescope record, env+0x3818] × 0.8 (0.56, 0.68, 0.96);
  y = 1..Height, x = 1..Width (TBitmap VMT +0x20 GetHeight, +0x2c GetWidth); pixels outside the bitmap are no-ops, so row 0 and
  column 0 stay unscaled; Round(red × factor), clamped to 255, written as gray.
- Draw 0x597470 from the compositor 0x53b5d5..0x53b61c (instead of the synthetic stamp): left = Round(x) − centreX,
  top = Round(y) − centreY (GLIMAGES columns 9/10), unscaled TCanvas.Draw — it overwrites, unlike the synthetic larger-red rule.
- Pan offset: the synthetic stamp's position adds the view's pan (0x53b561 `fadd [esi+0x45]` with [ebx+0x6a6]); the photograph
  path does not. They agree while the pan is zero, which holds for every web field (each is a fresh field at its own pointing,
  never panned); a panned field would need that offset traced for photographs.
- Tested on synthetic bitmaps and on the four originals inside the engine.
- Palette mapping (web adaptation): the rescale writes a plain RGB(v,v,v) COLORREF (0x5973f5..0x597404, no PALETTERGB flag)
  through TCanvas.Pixels (0x42ced4 → Windows SetPixel). The mapping onto the 8-bit colour table is done by GDI inside Windows, not
  by CLEA_VEO.exe, and cannot be traced statically. The web uses the nearest entry of the bitmap's own palette (squared RGB
  distance, first on ties); no palette is invented or altered. NGC2403.BMP has a non-gray 256-entry palette, the others gray
  palettes of 226–230 entries.

## Variable dispatch (`variableDispatch: 'recovered'`, Object X only)
The time-update dispatch 0x51ec48 returns false at 0x51ee57 with no side effect for a zero period (0x51ec9a fcomp 0 / je), a zero
word with a class other than 1, or class 3 (`nativeVariableDispatchFalse`); such a variable takes the same false-merge branch as
HI Peg. AQ CVn (CLEA_VStrs.dat 9631, class '*', period 0) hits N3000.DAT@482829 at 27.66″: the record is restored. Existing
exercises keep the verified class-3 contract (`'class-3'`), so LSS and Hubble gates are unchanged.
Object X does not use `variables: 'outside-view'` (review 2 finding 10: that rule is for Boo – 1/2 only); the frozen record shows
no row needed it.

## QSO observation (recovered)
- Selection: the merged QSO record (type 3) under the slit (0x59a0fc), point-source throughput with the QSO's own position and the
  pointing (0x50e0d7 star path, type 3), amplitude from its V Single and the telescope zero point.
- Source: QSOSpect.dat (approved byte-exact, 8251 × 6-byte records, Int16 rest wavelength 302..8552 Å, Single intensity).
  Constructor 0x55e330: rest window [λmin/(1+z), λmax/(1+z)] clamped to 302 / 8552 Å; first record Round(restMin − 302);
  count Round(restMax − restMin) + 1; 0x55df2c grid with lastIndex = count (count + 1 slots, the last never read and 0; step =
  (restMax − restMin)/count); values divided by the window maximum. Sampler 0x55e52c: 0x55dfe0 at λ/(1+z). `src/core/qsoSpectrum.ts`.

## Typed branches not modelled
No spectroscopy row hits one now; such a branch would stay a typed reveal-side reason (the display reads like any unavailable case).
The GLXYSP guard (review 2 finding 2): a selected galaxy that GLXYSP.LST names is observed only with its own spectrum, else the
typed `spectrum-mapping`; every own spectrum the Object X rows need (NGC4262.SP, NGC4449.SP, NGC4631.SP) is already published, so
no further .SP file is required (NGC 2403 has no GLXYSP.LST line and keeps GLXYTMPL.SP, as natively).

## UI (`src/ObjectXSpectrum.tsx`)
Telescope choice, "Place the slit on the object" at the catalogue coordinates (web adaptation, stated on the page), Start / Stop /
Clear spectrum (250 ms ticks; the exposure model's signal-to-noise stop disables Start until Clear), a counts plot, Keep, the kept
list (Show rebuilds a kept spectrum from its journal) and a CSV per spectrum. One neutral message for every unavailable case.
End-to-end `tests/object-x-spectrum.spec.ts`: a star, a galaxy and a QSO observed, kept, downloaded, saved (v29) and restored from
the student path with no identifier, remark, record, template, photograph or kind word in the page, the CSVs or the Object X
parts of the saved file; identical unavailable markup for star, galaxy, QSO and pulsar; 320 px and dark mode.

## Evidence
`data/objectx/spectra-*.json` (seven bounded packs; N6000, N0730, N1500, N3730, N3000, N0000, S3730 — N1500 because the NGC 4262 /
N0730-00120 areas cross +15°), `data/objectx/PROVENANCE.json`, `data/objectx/witnesses.json` (independent Python model reproduced
by `src/io/objectXSpectrometer.test.ts`: populations including the AQ CVn false merge, photograph associations and the selected
stars' templates).
