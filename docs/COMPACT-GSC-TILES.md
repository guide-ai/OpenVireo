# Compact GSC tiles (Front G)

OpenVireo publishes VIREO's whole compact Guide Star Catalog, byte-exact, as small tiles. The browser fetches only the tiles
near the current pointing. This was approved by the user on 2026-10-29 (AGENTS.md, decision 2). The band hashes are listed in
the research file `analysis/approved-gsc-wav-2026-10-29.txt`.

**Source**
- CLEA_Vireo.zip (SHA-256 `58dc02a6…6778b`), `program files/CLEA/VIREO/Cgsc/`: the 24 bands `GSC/N0000..N8230.DAT` and
  `GSC/S0000..S8230.DAT`, and `TABLES/REGIONS.BIN`. That is 25 files and 509,056,848 bytes.
- Credits: Project CLEA, Gettysburg College (originator of this compact packaging); NSF and Gettysburg College (supporters).
- Upstream: the Hubble Guide Star Catalog (GSC 1.x), Space Telescope Science Institute. The exact GSC version CLEA used is not
  recorded in the bundle and is uncertain.
- Terms: the license basis of the 2026-10-26 approval (`docs/RESOURCE-PROVENANCE.json`, `credits.compactGsc`).

## Layout

- **Records:** each band is a whole number of 27-byte records (18,841,240 in all). Records are sorted by packed RA, an int32
  at +0 in units of 1e-7 h; Dec is an int32 at +4 in units of 1e-5°. The cut tool checks the RA order for every band.
- **Tiles:** `public/original/gsc/<band>/<kkk>.bin`. Tile k holds records [k·65536, min((k+1)·65536, N)), so a full tile is
  1,769,472 bytes; the last tile of a band is shorter. No tile splits a record. There are 300 tiles.
  - Bands are not ordered by region, so region boundaries do not map to byte ranges. The only cut that leaves the native read
    path intact is a record boundary.
- **REGIONS.BIN:** `public/original/gsc/REGIONS.BIN`, byte-exact. The field engine still reads its existing derived form,
  `data/hubble/native-regions.json`.
- **Whole bands:** not stored. `assembled[]` in `docs/LOCAL-RESOURCES.json` lists each band with its approved size and
  SHA-256, and its tiles in order.
- **Index:** `data/gsc/gsc-index.json` is derived from the tiles. It holds:
  - for each band: records, bytes and SHA-256;
  - for each tile: first record, records, bytes, SHA-256, and first and last packed RA;
  - the **search skeleton**: the packed RA and Dec (the 8 bytes a position-only witness holds) of every midpoint the native band search (0x59af80, `compactGscReadOrder.ts`) can
    probe while its [low, min(high, N−1)] interval spans more than one tile. That is 4,189 entries.

## Cut tool

`analysis/front-g-gsc/tools/cut_gsc_tiles.py` (Python, run with `-I`; SHA-256
`dd9ee8d0bb1ced7f4cd7b195a9513dadf438550520328662fa5998c948d17566`). It reads the approved zip and checks the zip hash and all 25
approved sizes and hashes before writing anything. It then writes the tiles, the index and the manifest fragment, and finally
re-reads the tiles to check that every band reassembles to its approved hash. Nothing from the archive is executed.

## Integrity

- `scripts/check-resources.mjs` (run before `dev`, `build`, `test` and `test:e2e`) hashes every tile in full on every run.
- In the same read pass it feeds each band's tiles, in order, into a second hash that must equal the band's approved SHA-256:
  "Assembled original files: 24/24 equal the concatenation of their tiles."
- `docs/RESOURCE-PROVENANCE.json` records `assembledFiles` and `assembledBytes` and the `public/original/gsc` and `data/gsc`
  groups. Tests: `scripts/check-resources.test.mjs`.
- `censusRoots` in `docs/LOCAL-RESOURCES.json` is `public/original`. check-resources reports any file, symlink or special entry
  under it that the manifest does not list, so an extra tile cannot ship silently (review 1). `data/` is not a census root
  yet: six of its files are unlisted and belong to other fronts.
- Measured: the whole check takes about 1.6 s warm.

## Reading

`src/core/gscTilePlan.ts` plans which tiles one native band read needs:
1. It replays the binary search on the skeleton until the remaining probes lie in one tile.
2. It adds the tiles the forward scan can reach (up to and including the first row past the maximum RA, or end of file).

The trace itself then runs on the fetched bytes. A read outside the planned tiles is a typed error, never a skipped record.

Tests (`src/core/gscTilePlan.test.ts`) check that the plan equals the tiles the native trace needs, in these cases:
- random keys;
- tile boundaries;
- equal keys across a boundary;
- end of file;
- a key past every record;
- a whole band (polar read);
- a wrapped interval read as two parts;
- bands smaller than a tile or an exact multiple of it.

## Loading (`src/io/gscTiles.ts`)

- **Fetching:** tiles come from the same origin through the browser's HTTP cache (`cache: 'force-cache'`; the file names are
  immutable).
- **Checks:** a tile's exact size and SHA-256 are checked against the index (`crypto.subtle`) before any record is read.
- **Memory:** at most 24 tiles (about 42 MB) are kept in memory, least recently used evicted. Concurrent callers share one
  request per tile, and each caller can stop waiting with an AbortSignal.
- **Errors:** `GscTileError` with code `fetch`, `integrity`, `index`, `missing-tile` or `budget`.
  - `fetch` covers a failed request, a non-OK status and an HTML answer. A host with an SPA fallback answers a missing tile
    with 200 and `index.html`; that is a missing file, not changed bytes (review 1 L2).
  - `integrity` means the bytes the server returned differ in size or SHA-256 from the index.
  - The names are immutable and the bytes are fixed by the approved hashes. A re-cut with different bytes under the same names
    would keep failing with `integrity` until the HTTP cache is cleared.
- **Band source:** `tiledBandSource` gives the existing trace synchronous reads over the fetched tiles. The outer search probes
  come from the skeleton when their tile was not fetched.
- No IndexedDB or Worker is used; none has been shown to be needed.

## Field pack for any pointing (`src/io/assembledFieldPack.ts`)

`assembleFieldPack(pointing)` builds an ordinary `openvireo-field-pack-v1` pack for one pointing, so the field engine runs on it
unchanged:
- band order from the regions;
- per band, the planned tiles and the native trace, with every read recorded by the published packs' rule (the whole record
  inside the area, the 8-byte position otherwise);
- every CLEA_VStrs.dat variable record and every CLEA_QSO.DAT position inside the area, from the whole bundled files;
- the GLIMAGES.LST indices inside the area (`packWithPhotographs`).

`AssembledFieldError` types what is not yet supported or cannot be read:
- `polar`: an RA half-width of 12 h or more, about \|Dec\| ≥ 89.88° (G-RE2). There VIREO's result depends on the x87 cosine
  near π/2 and on the low dword of its Int64 band key.
- A field across RA 0 h/24 h is read as VIREO reads it (G1b): two reads per band, [min, 24] then [0, max]. The pack records
  both traces, and its coverage is the whole RA ring of its Dec band.
- `input`: an invalid pointing (not finite, RA outside 0–24 h, or |Dec| > 90°).
- `regions`: more than 100 regions. A ±0.375° field never exceeds 12, even at ±90°.
- `budget`: more than 100,000 visits in one band, the same limit the field engine applies (`FIELD_SCAN_BUDGET`). A whole polar
  band fits (S8230: 95,441 records), so this no longer occurs for any valid pointing.
- `band-end`: the native search runs past a band's last record because the minimum RA key is above every record. VIREO reads
  past EOF there and raises an I/O error.
- `plan`: a read outside the planned tiles. This is a planning bug, never a skipped record.
- `source`: a malformed bundled file.

A tile fetch or integrity failure stays a `GscTileError`, and an abort is the DOMException `AbortError`.

Nothing is approximated.

**Measured visit budget (review 1 L5).** The largest band scan of one field, over 47 RA values at each Dec:

| Dec | −88.99 | −88.9 | −88.5 | −88 | −87 | +88 | +88.5 | +88.9 | +88.99 |
|---|---|---|---|---|---|---|---|---|---|
| Visits | 14,594 | 13,439 | 10,046 | 7,662 | 5,188 | 6,160 | 8,066 | 10,339 | 11,157 |

- The peaks are at RA 15.5–16 h in S8230 and 1–1.5 h in N8230. Dense band-edge fields elsewhere stay under about 6,000
  (review measurement).
- VIREO has no such budget. It is an adapter guard, and at |Dec| ≈ 88.5–89° it currently yields the typed `budget`.
- **Decision, carried out in G1b:** both limits were raised together to 100,000 (`FIELD_SCAN_BUDGET`). That covers a whole
  polar band (S8230: 95,441 records; N8230: 74,656), which is what the native scan reads as the RA half-width approaches 12 h.
- **Worst-case cost** (Node, desktop, warm disk). "Assemble" includes the tile reads and the SHA checks.

| Pointing | Band reads | Assemble | Heap | Population | Field |
|---|---|---|---|---|---|
| RA 15.5, Dec −89.88 (S8230, whole band) | 95,002 | 431 ms | +38 MB | 436 ms | 586 ms |
| RA 1.5, Dec +89.88 (N8230) | 74,400 | 368 ms | +31 MB | 362 ms | 490 ms |
| RA 15.5, Dec −88.99 | 14,605 | 100 ms | +5 MB | 63 ms | 188 ms |
| RA 12, Dec 20 (ordinary) | 965 | 18 ms | +1 MB | 11 ms | 74 ms |

**Behaviour:** G1 does not change any route yet. The published bounded packs stay the certified fast path. Opening other
pointings is phased in from G2 on (analysis/front-plans/front-g-gsc.md §6, §8).

## Equality with the published subsets (`src/io/assembledFieldPack.test.ts`)

These proofs read the published tiles from disk.
- **Stored reads:** every band read stored in the published subsets equals the tile bytes. That covers the 9 LSS packs, the
  Coma and Boötes engine packs, the 7 Object X packs, the 6 pinned snapshots and the 5 Pleiades photometer files. Whole records
  are byte-equal, and position witnesses equal the first 8 bytes. The stored band record counts equal the tiled ones.
- **Populations:** at every certified pointing (more than 200), a pack assembled from the tiles gives the identical
  `buildFieldPopulation` result as the published pack, with the QSO gate and with the recovered merge. This covers all six
  pinned snapshots, including the fresh-Hubble fallback and the star route's field. The test is self-contained and also
  requires that the comparisons are of real populations.
  - The Pleiades files are covered by the byte proof. Their photometer read path is checked when the photometer opens to other
    pointings (G3).
  - UM-I-3 is VIREO's cached pan of the 36773 field and has no fresh read of its own.
- **Other pointings:** for 200 fixed pseudo-random pointings, the assembled reads are exactly the native trace's reads over the
  reassembled whole band, and each one is byte-equal.
- **Sky tiles:** the whole-sky `public/original/sky` tiles equal, per RA hour, the multiset of
  [packed RA, packed Dec, magnitude×1000] of every tiled record with −3 ≤ magnitude ≤ 12 (2,369,926 records).
