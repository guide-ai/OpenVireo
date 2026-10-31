# Range fingerprints v2 (2026-10-31, Front S2 round 2)

New Hubble and LSS exposures take VIREO's 3700–4700 Å with the start-time continuation (0x55e97c). Exposures without a range
mark keep 4000–5000 Å and their v1 fingerprints (`data/hubble/existing-target-fingerprints.json`, unchanged). The v2
fingerprints are in `src/core/galaxyRange.fingerprints.json` (`src/core/galaxyRange.test.ts`).

No outcome changed: every LSS row has the same kind, reason and selected record on both intervals (E02 196/93/198 on both).
What changed, entry by entry, and why:

- **Grid:** every calibrated spectrum starts at 3700 Å instead of 4000 Å (wavelengths and source means change).
- **Continuation:** where the shifted template starts above 3700 Å, the blue bins are VIREO's continuation, drawn from the
  exposure's random state at each Go. Counts, totals, final seeds and CSVs change.

## Hubble pairs (25: the 14 pairs of v1 plus UM-I 3 and the 10 engine pairs)

| Target | Telescope | Policy | Continuation |
|---|---|---|---|
| 36773 | 0 | `openvireo-pinned-galaxy-36773-v1#R3700-4700` | yes |
| 36773 | 1 | `openvireo-kpno09-galaxy-36773-v1#R3700-4700` | yes |
| 36773 | 2 | `openvireo-mayall-galaxy-36773-v1#R3700-4700` | yes |
| 36747 | 0 | `openvireo-pinned-galaxy-36747-v1#R3700-4700` | yes |
| 36747 | 1 | `openvireo-kpno09-galaxy-36747-v1#R3700-4700` | yes |
| 36747 | 2 | `openvireo-mayall-galaxy-36747-v1#R3700-4700` | yes |
| 54876 | 0 | `openvireo-pinned-galaxy-54876-v1#R3700-4700` | yes |
| 54876 | 1 | `openvireo-kpno09-galaxy-54876-v1#R3700-4700` | yes |
| 54876 | 2 | `openvireo-mayall-galaxy-54876-v1#R3700-4700` | yes |
| 54875 | 0 | `openvireo-cached-galaxy-54875-v1#R3700-4700` | yes |
| 54891 | 0 | `openvireo-cached-galaxy-54891-v1#R3700-4700` | yes |
| NGC 7501 | 0 | `openvireo-pinned-pegasus-7501-v1#R3700-4700` | yes |
| NGC 7499 | 0 | `openvireo-cached-pegasus-7499-v1#R3700-4700` | yes |
| NGC 7503 | 0 | `openvireo-cached-pegasus-7503-v1#R3700-4700` | yes |
| 36805 | 0 | `openvireo-cached-umi-36805-v1#R3700-4700` | yes |
| NGC 4874 | 0 | `openvireo-engine-galaxy-NGC4874-r0-v1#R3700-4700` | yes |
| NGC 4874 | 2 | `openvireo-engine-galaxy-NGC4874-r2-v1#R3700-4700` | yes |
| NGC 4889 | 0 | `openvireo-engine-galaxy-NGC4889-r0-v1#R3700-4700` | no (own spectrum covers the grid) |
| NGC 4889 | 2 | `openvireo-engine-galaxy-NGC4889-r2-v1#R3700-4700` | no (own spectrum covers the grid) |
| 51976 | 0 | `openvireo-engine-galaxy-51976-r0-v1#R3700-4700` | yes |
| 51976 | 1 | `openvireo-engine-galaxy-51976-r1-v1#R3700-4700` | yes |
| 51976 | 2 | `openvireo-engine-galaxy-51976-r2-v1#R3700-4700` | yes |
| 51975 | 0 | `openvireo-engine-galaxy-51975-r0-v1#R3700-4700` | yes |
| 51975 | 1 | `openvireo-engine-galaxy-51975-r1-v1#R3700-4700` | yes |
| 51975 | 2 | `openvireo-engine-galaxy-51975-r2-v1#R3700-4700` | yes |

## LSS rows (594 of 657 entries changed; the 63 others have no calibration on either interval)

Each entry is `F<field>R<row>T<telescope>` with its kind and the source on 3700–4700 Å (cont: continuation; prof: in-template).

- F1R1T0 available cont; F1R1T1 unavailable cont; F1R1T2 available cont; F1R2T0 available prof; F1R2T1 unavailable prof; F1R2T2 available prof
- F1R3T0 available cont; F1R3T1 unavailable cont; F1R3T2 available cont; F1R4T0 available prof; F1R4T1 unavailable prof; F1R4T2 available prof
- F1R5T0 available prof; F1R5T1 available prof; F1R5T2 available prof; F1R6T0 available cont; F1R6T1 unavailable cont; F1R6T2 available cont
- F1R7T0 available prof; F1R7T1 unavailable prof; F1R7T2 available prof; F1R8T0 available prof; F1R8T1 unavailable prof; F1R8T2 available prof
- F1R9T0 available prof; F1R9T1 unavailable prof; F1R9T2 available prof; F1R10T0 available prof; F1R10T1 unavailable prof; F1R10T2 available prof
- F1R11T0 available prof; F1R11T1 unavailable prof; F1R11T2 available prof; F1R12T0 available prof; F1R12T1 available prof; F1R12T2 available prof
- F1R13T0 available prof; F1R13T1 unavailable prof; F1R13T2 available prof; F1R14T0 available prof; F1R14T1 unavailable prof; F1R14T2 available prof
- F1R15T0 available cont; F1R15T1 available cont; F1R15T2 available cont; F1R16T0 available prof; F1R16T1 available prof; F1R16T2 available prof
- F1R17T0 available prof; F1R17T1 unavailable prof; F1R17T2 available prof; F1R18T0 available prof; F1R18T1 unavailable prof; F1R18T2 available prof
- F1R19T0 available prof; F1R19T1 unavailable prof; F1R19T2 available prof; F1R21T0 available cont; F1R21T1 unavailable cont; F1R21T2 available cont
- F1R22T0 available prof; F1R22T1 unavailable prof; F1R22T2 available prof; F1R23T0 available prof; F1R23T1 unavailable prof; F1R23T2 available prof
- F2R1T0 available prof; F2R1T1 unavailable prof; F2R1T2 available prof; F2R2T0 available prof; F2R2T1 unavailable prof; F2R2T2 available prof
- F2R3T0 available cont; F2R3T1 unavailable cont; F2R3T2 available cont; F2R4T0 available prof; F2R4T1 unavailable prof; F2R4T2 available prof
- F2R5T0 available prof; F2R5T1 unavailable prof; F2R5T2 available prof; F2R6T0 available prof; F2R6T1 unavailable prof; F2R6T2 available prof
- F2R7T0 available prof; F2R7T1 unavailable prof; F2R7T2 available prof; F2R8T0 available prof; F2R8T1 available prof; F2R8T2 available prof
- F2R9T0 available cont; F2R9T1 unavailable cont; F2R9T2 available cont; F2R10T0 available prof; F2R10T1 available prof; F2R10T2 available prof
- F2R11T0 unavailable prof; F2R11T1 unavailable prof; F2R11T2 available prof; F2R12T0 available cont; F2R12T1 unavailable cont; F2R12T2 available cont
- F2R13T0 available prof; F2R13T1 unavailable prof; F2R13T2 available prof; F2R14T0 available cont; F2R14T1 unavailable cont; F2R14T2 available cont
- F2R15T0 available cont; F2R15T1 unavailable cont; F2R15T2 available cont; F2R16T0 available cont; F2R16T1 unavailable cont; F2R16T2 available cont
- F2R17T0 available prof; F2R17T1 available prof; F2R17T2 available prof; F2R18T0 available cont; F2R18T1 unavailable cont; F2R18T2 available cont
- F2R19T0 available prof; F2R19T1 unavailable prof; F2R19T2 available prof; F2R20T0 available cont; F2R20T1 unavailable cont; F2R20T2 available cont
- F2R22T0 available cont; F2R22T1 available cont; F2R22T2 available cont; F2R24T0 available cont; F2R24T1 available cont; F2R24T2 available cont
- F2R25T0 available prof; F2R25T1 available prof; F2R25T2 available prof; F3R1T0 unavailable prof; F3R1T1 unavailable prof; F3R1T2 available prof
- F3R2T0 available cont; F3R2T1 unavailable cont; F3R2T2 available cont; F3R3T0 available cont; F3R3T1 unavailable cont; F3R3T2 available cont
- F3R4T0 available cont; F3R4T1 unavailable cont; F3R4T2 available cont; F3R6T0 available cont; F3R6T1 unavailable cont; F3R6T2 available cont
- F3R7T0 available cont; F3R7T1 unavailable cont; F3R7T2 available cont; F3R8T0 available prof; F3R8T1 unavailable prof; F3R8T2 available prof
- F3R9T0 available cont; F3R9T1 unavailable cont; F3R9T2 available cont; F3R10T0 available cont; F3R10T1 unavailable cont; F3R10T2 available cont
- F3R11T0 available cont; F3R11T1 unavailable cont; F3R11T2 available cont; F3R12T0 available cont; F3R12T1 unavailable cont; F3R12T2 available cont
- F3R13T0 available cont; F3R13T1 unavailable cont; F3R13T2 available cont; F3R14T0 available cont; F3R14T1 unavailable cont; F3R14T2 available cont
- F3R15T0 available cont; F3R15T1 unavailable cont; F3R15T2 available cont; F3R16T0 neighbour cont; F3R16T1 neighbour cont; F3R16T2 neighbour cont
- F3R17T0 available cont; F3R17T1 available cont; F3R17T2 available cont; F3R18T0 available cont; F3R18T1 unavailable cont; F3R18T2 available cont
- F3R20T0 available cont; F3R20T1 available cont; F3R20T2 available cont; F3R21T0 available cont; F3R21T1 unavailable cont; F3R21T2 available cont
- F3R22T0 available cont; F3R22T1 unavailable cont; F3R22T2 available cont; F3R23T0 available cont; F3R23T1 available cont; F3R23T2 available cont
- F3R24T0 available cont; F3R24T1 unavailable cont; F3R24T2 available cont; F3R25T0 available cont; F3R25T1 unavailable cont; F3R25T2 available cont
- F4R1T0 available cont; F4R1T1 unavailable cont; F4R1T2 available cont; F4R2T0 available prof; F4R2T1 unavailable prof; F4R2T2 available prof
- F4R3T0 available cont; F4R3T1 unavailable cont; F4R3T2 available cont; F4R4T0 available cont; F4R4T1 available cont; F4R4T2 available cont
- F4R5T0 available cont; F4R5T1 unavailable cont; F4R5T2 available cont; F4R6T0 available cont; F4R6T1 unavailable cont; F4R6T2 available cont
- F4R7T0 available cont; F4R7T1 unavailable cont; F4R7T2 available cont; F4R8T0 available cont; F4R8T1 unavailable cont; F4R8T2 available cont
- F4R9T0 available cont; F4R9T1 unavailable cont; F4R9T2 available cont; F4R10T0 available cont; F4R10T1 unavailable cont; F4R10T2 available cont
- F4R11T0 available cont; F4R11T1 available cont; F4R11T2 available cont; F4R12T0 available cont; F4R12T1 unavailable cont; F4R12T2 available cont
- F4R13T0 available cont; F4R13T1 unavailable cont; F4R13T2 available cont; F4R14T0 available cont; F4R14T1 unavailable cont; F4R14T2 available cont
- F4R15T0 available prof; F4R15T1 unavailable prof; F4R15T2 available prof; F4R16T0 available cont; F4R16T1 unavailable cont; F4R16T2 available cont
- F4R17T0 available cont; F4R17T1 unavailable cont; F4R17T2 available cont; F4R18T0 available cont; F4R18T1 unavailable cont; F4R18T2 available cont
- F4R19T0 available cont; F4R19T1 unavailable cont; F4R19T2 available cont; F4R20T0 available cont; F4R20T1 unavailable cont; F4R20T2 available cont
- F4R21T0 available cont; F4R21T1 unavailable cont; F4R21T2 available cont; F4R22T0 available cont; F4R22T1 unavailable cont; F4R22T2 available cont
- F4R23T0 available cont; F4R23T1 unavailable cont; F4R23T2 available cont; F5R1T0 available cont; F5R1T1 unavailable cont; F5R1T2 available cont
- F5R5T0 available cont; F5R5T1 unavailable cont; F5R5T2 available cont; F5R6T0 available cont; F5R6T1 available cont; F5R6T2 available cont
- F5R7T0 available prof; F5R7T1 unavailable prof; F5R7T2 available prof; F5R8T0 available cont; F5R8T1 available cont; F5R8T2 available cont
- F5R9T0 available cont; F5R9T1 unavailable cont; F5R9T2 available cont; F5R10T0 available cont; F5R10T1 available cont; F5R10T2 available cont
- F5R11T0 available prof; F5R11T1 unavailable prof; F5R11T2 available prof; F5R12T0 available prof; F5R12T1 unavailable prof; F5R12T2 available prof
- F5R13T0 available cont; F5R13T1 available cont; F5R13T2 available cont; F5R14T0 available cont; F5R14T1 unavailable cont; F5R14T2 available cont
- F5R15T0 available cont; F5R15T1 available cont; F5R15T2 available cont; F5R19T0 available cont; F5R19T1 unavailable cont; F5R19T2 available cont
- F5R20T0 available cont; F5R20T1 available cont; F5R20T2 available cont; F5R21T0 available cont; F5R21T1 unavailable cont; F5R21T2 available cont
- F5R22T0 available cont; F5R22T1 available cont; F5R22T2 available cont; F5R23T0 available cont; F5R23T1 unavailable cont; F5R23T2 available cont
- F5R24T0 available cont; F5R24T1 available cont; F5R24T2 available cont; F6R1T0 available cont; F6R1T1 unavailable cont; F6R1T2 available cont
- F6R2T0 available cont; F6R2T1 available cont; F6R2T2 available cont; F6R3T0 available prof; F6R3T1 unavailable prof; F6R3T2 available prof
- F6R4T0 available cont; F6R4T1 available cont; F6R4T2 available cont; F6R5T0 available cont; F6R5T1 available cont; F6R5T2 available cont
- F6R6T0 available cont; F6R6T1 available cont; F6R6T2 available cont; F6R7T0 available cont; F6R7T1 unavailable cont; F6R7T2 available cont
- F6R10T0 available cont; F6R10T1 available cont; F6R10T2 available cont; F6R11T0 available cont; F6R11T1 available cont; F6R11T2 available cont
- F6R13T0 available cont; F6R13T1 available cont; F6R13T2 available cont; F6R14T0 available cont; F6R14T1 available cont; F6R14T2 available cont
- F6R15T0 available cont; F6R15T1 available cont; F6R15T2 available cont; F6R16T0 available cont; F6R16T1 available cont; F6R16T2 available cont
- F6R18T0 available cont; F6R18T1 available cont; F6R18T2 available cont; F6R19T0 available cont; F6R19T1 available cont; F6R19T2 available cont
- F6R20T0 available cont; F6R20T1 available cont; F6R20T2 available cont; F6R21T0 available cont; F6R21T1 available cont; F6R21T2 available cont
- F7R1T0 available cont; F7R1T1 available cont; F7R1T2 available cont; F7R2T0 available cont; F7R2T1 available cont; F7R2T2 available cont
- F7R3T0 available prof; F7R3T1 unavailable prof; F7R3T2 available prof; F7R5T0 available prof; F7R5T1 available prof; F7R5T2 available prof
- F7R6T0 available cont; F7R6T1 unavailable cont; F7R6T2 available cont; F7R7T0 available cont; F7R7T1 available cont; F7R7T2 available cont
- F7R9T0 available cont; F7R9T1 unavailable cont; F7R9T2 available cont; F7R10T0 available cont; F7R10T1 unavailable cont; F7R10T2 available cont
- F7R12T0 available prof; F7R12T1 unavailable prof; F7R12T2 available prof; F7R13T0 available cont; F7R13T1 unavailable cont; F7R13T2 available cont
- F7R14T0 available prof; F7R14T1 unavailable prof; F7R14T2 available prof; F7R15T0 available cont; F7R15T1 available cont; F7R15T2 available cont
- F7R16T0 available cont; F7R16T1 available cont; F7R16T2 available cont; F7R17T0 available cont; F7R17T1 available cont; F7R17T2 available cont
- F7R19T0 available cont; F7R19T1 available cont; F7R19T2 available cont; F7R20T0 available cont; F7R20T1 available cont; F7R20T2 available cont
- F7R21T0 available cont; F7R21T1 available cont; F7R21T2 available cont; F7R23T0 available cont; F7R23T1 available cont; F7R23T2 available cont
- F7R24T0 available cont; F7R24T1 available cont; F7R24T2 available cont; F7R25T0 available prof; F7R25T1 available prof; F7R25T2 available prof
- F7R26T0 available cont; F7R26T1 available cont; F7R26T2 available cont; F8R1T0 available cont; F8R1T1 available cont; F8R1T2 available cont
- F8R2T0 available cont; F8R2T1 available cont; F8R2T2 available cont; F8R3T0 available cont; F8R3T1 available cont; F8R3T2 available cont
- F8R4T0 available prof; F8R4T1 unavailable prof; F8R4T2 available prof; F8R5T0 available cont; F8R5T1 available cont; F8R5T2 available cont
- F8R6T0 available cont; F8R6T1 unavailable cont; F8R6T2 available cont; F8R7T0 available cont; F8R7T1 available cont; F8R7T2 available cont
- F8R8T0 available cont; F8R8T1 unavailable cont; F8R8T2 available cont; F8R9T0 available cont; F8R9T1 unavailable cont; F8R9T2 available cont
- F8R10T0 available prof; F8R10T1 available prof; F8R10T2 available prof; F8R11T0 neighbour prof; F8R11T1 neighbour prof; F8R11T2 neighbour prof
- F8R12T0 available cont; F8R12T1 available cont; F8R12T2 available cont; F8R13T0 available prof; F8R13T1 unavailable prof; F8R13T2 available prof
- F8R14T0 available prof; F8R14T1 unavailable prof; F8R14T2 available prof; F8R15T0 available cont; F8R15T1 available cont; F8R15T2 available cont
- F8R16T0 available cont; F8R16T1 unavailable cont; F8R16T2 available cont; F8R17T0 available cont; F8R17T1 available cont; F8R17T2 available cont
- F8R18T0 available cont; F8R18T1 available cont; F8R18T2 available cont; F8R19T0 available cont; F8R19T1 available cont; F8R19T2 available cont
- F8R20T0 available cont; F8R20T1 available cont; F8R20T2 available cont; F8R21T0 available cont; F8R21T1 available cont; F8R21T2 available cont
- F8R23T0 available cont; F8R23T1 available cont; F8R23T2 available cont; F8R24T0 available cont; F8R24T1 available cont; F8R24T2 available cont
- F8R25T0 available cont; F8R25T1 available cont; F8R25T2 available cont; F9R1T0 available cont; F9R1T1 available cont; F9R1T2 available cont
- F9R2T0 available prof; F9R2T1 unavailable prof; F9R2T2 available prof; F9R3T0 available cont; F9R3T1 available cont; F9R3T2 available cont
- F9R4T0 available prof; F9R4T1 available prof; F9R4T2 available prof; F9R5T0 available cont; F9R5T1 available cont; F9R5T2 available cont
- F9R6T0 available prof; F9R6T1 available prof; F9R6T2 available prof; F9R7T0 available prof; F9R7T1 available prof; F9R7T2 available prof
- F9R8T0 available cont; F9R8T1 available cont; F9R8T2 available cont; F9R9T0 neighbour cont; F9R9T1 neighbour cont; F9R9T2 neighbour cont
- F9R10T0 neighbour cont; F9R10T1 neighbour cont; F9R10T2 neighbour cont; F9R11T0 available cont; F9R11T1 available cont; F9R11T2 available cont
- F9R12T0 available cont; F9R12T1 available cont; F9R12T2 available cont; F9R13T0 available cont; F9R13T1 available cont; F9R13T2 available cont
- F9R14T0 available cont; F9R14T1 available cont; F9R14T2 available cont; F9R15T0 available cont; F9R15T1 available cont; F9R15T2 available cont
- F9R16T0 available cont; F9R16T1 available cont; F9R16T2 available cont; F9R17T0 available cont; F9R17T1 available cont; F9R17T2 available cont
- F9R18T0 available cont; F9R18T1 available cont; F9R18T2 available cont; F9R19T0 available prof; F9R19T1 unavailable prof; F9R19T2 available prof
- F9R20T0 available cont; F9R20T1 available cont; F9R20T2 available cont; F9R21T0 available cont; F9R21T1 available cont; F9R21T2 available cont
- F9R22T0 available cont; F9R22T1 unavailable cont; F9R22T2 available cont; F9R23T0 available prof; F9R23T1 available prof; F9R23T2 available prof
- F9R24T0 available cont; F9R24T1 available cont; F9R24T2 available cont; F9R25T0 available cont; F9R25T1 available cont; F9R25T2 available cont
- F9R26T0 available cont; F9R26T1 available cont; F9R26T2 available cont; F9R27T0 available cont; F9R27T1 available cont; F9R27T2 available cont
