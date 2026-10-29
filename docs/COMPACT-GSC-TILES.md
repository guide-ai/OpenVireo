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
- Measured: the whole check takes about 1.4 s warm.

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
