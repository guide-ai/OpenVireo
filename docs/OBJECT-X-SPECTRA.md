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
| 3, 6, 8, 11 galaxies; 4, 5, 9, 12 stars | — | not-recovered | not-recovered | not-recovered | every area holds a GLIMAGES.LST photograph (NGC 2403, 4262, 4449, 4631/4656); rows 11–12 also hold variable 9631 |

## QSO observation (recovered)
- Selection: the merged QSO record (type 3) under the slit (0x59a0fc), point-source throughput with the QSO's own position and the
  pointing (0x50e0d7 star path, type 3), amplitude from its V Single and the telescope zero point.
- Source: QSOSpect.dat (approved byte-exact, 8251 × 6-byte records, Int16 rest wavelength 302..8552 Å, Single intensity).
  Constructor 0x55e330: rest window [λmin/(1+z), λmax/(1+z)] clamped to 302 / 8552 Å; first record Round(restMin − 302);
  count Round(restMax − restMin) + 1; 0x55df2c grid with lastIndex = count (count + 1 slots, the last never read and 0; step =
  (restMax − restMin)/count); values divided by the window maximum. Sampler 0x55e52c: 0x55dfe0 at λ/(1+z). `src/core/qsoSpectrum.ts`.
- Spectral interval: the Object X exercise's own interval is not recovered; the API uses the 4000–5000 Å domain of every web
  acquisition (declared adaptation; the field option accepts another interval).

## Not recovered (typed `not-recovered`)
- Photographic association: the galaxy loader (0x598e3b..0x599128) attaches an image object (0x59721c/0x597290) to every admitted
  galaxy whose name a GLIMAGES.LST photograph name contains (Pos); the galaxy is then drawn from its BMP. The BMP files are not
  approved resources and the bitmap draw contract is not ported, so every star and galaxy row stays unavailable.
- Star branch: the JSPEC2.SPI template lookup (spectral index in record bytes 8..11) is recovered for the verified star, but no
  Object X star area is free of a photograph; no jspect2 template has been bundled.
- Galaxy own spectra NGC 4262/4449/4631 (GLXYSP.LST matches) would use the matched branch as NGC 4889 does, once their fields can be
  rendered. NGC4449.BMP is listed but has empty geometry columns.

## Open decision (coordinator / user)
While some kinds are available and others are not, the status itself hints at the kind (only QSO rows are available). Front X
showed one neutral text for every object; that is no longer identity-neutral.

## Evidence
`data/objectx/spectra-*.json` (seven bounded packs; N6000, N0730, N1500, N3730, N3000, N0000, S3730 — N1500 because the NGC 4262 /
N0730-00120 areas cross +15°), `data/objectx/PROVENANCE.json`, `data/objectx/witnesses.json` (independent Python model reproduced
by `src/io/objectXSpectrometer.test.ts`).
