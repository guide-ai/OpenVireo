# Sky field view at any pointing (Front G5)

The observatory's sky view draws VIREO's own field for the current view at any pointing, from the published compact GSC tiles
(approval of 2026-10-29, decision 2). Static reading of CLEA_VEO.exe (781bc970…c54c); plan
`analysis/front-plans/front-g5.md`. Code: `src/io/skyField.ts`, `fieldEngine.evaluateFieldView` / `evaluateFinderView`,
`core/fieldCache.ts`, `SkyField` in `src/OpenVireo.tsx`.

## Recovered [D]
- **Render 0x53a40c:** it reloads the field only when the scale changed, the force flag env+0x3812 is set, or 0x53af28 says the
  view left the cached field. Then the load (telescope 0x53be70, finder 0x53bae4) and the cache paint (0x53b390, 0x53b058) into a
  3W × 3H bitmap, and every render copies the W × H crop at the current offset.
- **Telescope view:** the instrument field (0.75°, limit 20) painted as the field engine's `paintField` (galaxies with stamp set 6
  or their approved photograph, then stars of types 0/2/3).
- **Finder view:** the finder field (7.5°, FSCFieldObj) painted by 0x53b058; see docs/FIELD-ENGINE.md, "The finder field".
- **Cache rule:** 3 × 312 px; the field is kept while the view moves less than 312 px per axis: 0.25° (telescope) or 2.5° (finder).

## Web adaptations [W]
- The 312² crop is drawn on a canvas scaled to the 700-unit view; the crop origin is the current pointing's position in the loaded
  raster, rounded (the native origin's x87 rounding is not reproduced).
- The catalogue target circles and labels stay as an overlay.
- Where the field cannot be drawn exactly (the typed reasons of docs/OBJECT-INFO-FORMS.md, for example a photograph that is not
  published, `variable-time-required` or `field-polar`), the magnitude ≤ 12 preview is shown and the caption names the reason.
- **Object X:** no field is drawn within 2° of an Object X position or the lab's hidden target, widened by max(0.62°, the field's
  farthest corner) (the observatory rule since G4b; about 5.3° for the finder field).
- The Finder Mag Limit is the compiled 11.5 (the Parameters tab is read-only on this site).
- Photographs: all nine approved ones (`core/approvedPhotographs.ts`); one that cannot be loaded leaves only its field typed.
- The JD a field is built with is frozen at its first build and kept while the field is kept, as the other field consumers do.
- **Finder fast path not ported** [W] (review 1 L1): VIREO's finder load 0x53bae4 first asks 0x53afb0 whether the finder viewport
  (±Finder/2, RA scaled by cos) still fits in the last finder area (0x5b581c); if so it re-projects about that area's centre and
  skips the catalogue read (0x53bb00..0x53bc66), keeping the old population, its frozen variable state and cache anchor. The
  web keeps a built finder field only while its own 2.5° cache rule holds; after a switch to the telescope view and back, or a
  telescope change, it builds again at the current pointing with a new JD, so the field's edges and the next reload point can
  differ from VIREO's.
- **Unreadable ObjectX.HTL:** the field stays hidden with its own reason (`object-x-unreadable`), not "near a target".

## Cost (measured 2026-10-30, Node on the development machine; six pointings)
| Step | Telescope view | Finder view |
|---|---|---|
| Tiles and pack | 6–27 ms | 50–240 ms |
| Population | included below | 80–410 ms |
| Paint | 9–107 ms in total | about 50–100 ms |

Builds run only on a reload (above), in the Worker `src/io/skyFieldWorker.ts` (review 1 M4), and one build per field key is shared
by the sky view and Edit Mode's layer (a caller's abort cancels only its wait; the build stops when nobody waits). While the view
drifts inside the cache only the crop runs (a 312² copy per pointing change). Chromium long tasks after this change (development
build, 2026-10-31), with Edit Mode off: none on three finder pans, one of 67 ms over three telescope pans (before: up to 190 and 344 ms, and 329 + 249
ms for the duplicate Edit Mode build). The finder paint draws into one raster in place (`paintNativeStarInPlace`, the same
pixels as `paintNativeStar`), which cut it from about 0.5 s to about 50 ms. `tests/render-budget.spec.ts` counts are unchanged.

## Tests
- Vitest: `src/io/finderField.test.ts` (area, FSC admission against an independent count, FSC star and galaxy records, paint
  shift, M31 drawn, unavailable variables typed, cache rule and crop), `src/io/clusterTileQuery.test.ts` (with the independent
  NGC 2244 oracle and an abort), `src/io/skyField.test.ts` (shared builds and aborts).
- Playwright: `tests/object-info-forms.spec.ts` (finder Catalog Object; the Star Data List loading test holds the tiles from the
  start because the sky view shares them), `tests/sky-field-view.spec.ts` (views, reasons, a pointing change mid-build),
  `tests/cluster-data-dialogs.spec.ts` (a far-south "No Stars Found" from the tiles).

## Memory and the Worker (G5 closure N3, N5)
- With Edit Mode on, the main thread also receives the cloned finder population and Edit Mode's layer derives its Catalog Object
  records; since closure N3 it derives them once per loaded field, so a pan only re-projects them (measured below).
- The Worker is a module singleton with no idle teardown. It keeps its own GSC tile store (an LRU of 24 tiles, at most about
  42 MB) and its own copies of CLEA_GLX.DAT, CLEA_QSO.DAT, GLIMAGES.LST and the photographs, beside the page's and the Multi-Spec
  Worker's. Acceptable for this increment; sharing or bounding the stores is a follow-up.
