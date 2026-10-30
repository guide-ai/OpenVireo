# Spectrometer at the telescope pointing (Front G, G4a)

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
  - 3700–4700 Å;
  - star and QSO observation;
  - a galaxy's own bundled spectrum.

  Object X now calls the same function. At every Object X spectroscopy row and telescope, the generic result from the tiles
  equals the Object X result from its bundled pack (`src/io/fieldSpectrometer.test.ts`).
- **Gate.** The native instrument gate applies (`instrumentAccess`: moving, tracking, finder view, dome), plus "this field is
  the current pointing and telescope". Moving the telescope or changing the profile asks for the pointing to be used again.
- **Exposure.** The ordinary bounded journal (`createFieldExposure`), with policy
  `openvireo-field-spectrum-v1:<ra>,<dec>:T<telescope>` (exact binary64 pointing). The session file holds the policy, seed and
  events. Restoring prepares the field again at that pointing and replays the journal; counts are never imported.
- **Typed results**, shown as readable text (`fieldSpec.reason.*`):
  - the engine's reasons (slit-empty, mean-bound, variable-*, merge-boundary, photographic-image, spectrum-mapping, …);
  - every template JSPEC2.SPI names is bundled (the 17 remaining ones were approved on 2026-10-30), so any star in a field has
    its template; the former `star-template-not-bundled` reason is gone.
  - the tile reasons (field-polar, field-tiles, field-unreadable);
  - `object-x-hidden`: within 2° of an Object X position.
- **Photographs.** Assembled packs now take their photograph matches from VIREO's kept GLIMAGES.LST rows
  (`nativePhotographRows`). A row that fails to parse, such as NGC 4449's, is dropped whole, as the Object X runtime already did.
- **Exercises.** Exercise routes, packs, policies and counts are unchanged. These exposures never count toward an exercise.

Not yet: Multi-Spec in the free view on tiles (G4b), investigation persistence (G4c), the spectrum analyser hand-off and
Save .SSP for this route.
