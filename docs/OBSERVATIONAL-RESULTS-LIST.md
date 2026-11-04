# VIREO's one Observational Results list (Front ONERESULTS)

VIREO keeps **one** Observational Results list. The photometer's **File › Data › Record/Review**, the classifier's
**Classification Results** and Hubble **Record Measurements** (Record Z) all write it, with one ID space, and HR **Data from
Observations** plots it. Static reading of CLEA_VEO.exe (SHA-256 781bc970…c54c) only; nothing executed or emulated. Research:
`analysis/front-oneresults/RECOVERY.md` (excerpts SHA-256 96ec517e…7560); plan `analysis/front-plans/front-oneresults.md`.
Tags: [D] decoded, [I] inferred, [W] web choice, [U] unknown. Code: `src/core/sharedObservationList.ts` (pure),
`src/observationListContext.ts` (the shell's list), the three routes (`Photometer.tsx`, `ObservationResults.tsx`,
`SpectrumInstrument.tsx`), `src/io/analysisSession.ts` (v35).

## Recovered contract
| Rule | Evidence | Port |
|---|---|---|
| One list, owner `[[0x5b5bd4]]+0x480`, 0x90-byte records, order predicate 0x546db4 (time, then RA) | FormCreate 0x546de0–0x546dfa; VMT 0x546790, slot +4 [D] | `ObservationList` |
| Exactly three callers of find-or-add 0x54a73c: photometer 0x501eb6, classifier 0x50b20b, Hubble Record Z 0x5839e6 | whole-image call scan [D] | the three routes share one list |
| Time-Dependent Data off → first record, in list order, with the same ID; on, or a miss → create | 0x54a76f–0x54a7dd [D] | `observationListFindOrAdd` |
| Create: zeroed record (ID ≤ 15, time, kind = Compute Magnitudes), inserted from the tail with key (time, RA = 0); the route writes RA afterwards, nothing re-sorts | 0x54a814–0x54a8ec, 0x4926d0, 0x492728 [D] | `observationListInsertionIndex` |
| Photometer: RA/Dec only when one is 0, kind, nonzero bands | 0x501ecb–0x501f89 [D] | `observationListPhotometer` |
| Classifier: RA/Dec always | 0x50b20b–0x50b240 [D] | `observationListClassifier` |
| Hubble (mode 3/4/7): z, RA/Dec always; mode 4 and mag < 99: V and kind 1 | 0x5839eb–0x583a6b [D] | `observationListHubble` |
| FormActivate stores Single(c·z) as the velocity (Compute Rdshft Vel., z ≠ 0, velocity 0) | 0x54aedb–0x54aefc [D] | `observationListActivate` |
| OK: remarks, Sp code, checked velocity; Cancel rolls nothing back | 0x54b02c, 0x54b2dc [D] | `observationListOk` |
| The HR plot and Display/Print Data walk head → tail, no route filter | 0x542a11–0x542a25, 0x542f2d [D] | the list as it stands |

The list is therefore **not** in insertion order. A record goes where its time puts it, and records of equal time depend on the
RAs written after earlier insertions. The earlier docs and the gap inventory said "insertion order"; that was wrong (RECOVERY §5).

## What the student sees
- Each route's Observational Data window opens on the shared record, so a Record of a name another instrument already recorded
  shows that record (its first time, bands, z, remarks and Sp), unless Time-Dependent Data is on.
- **Tools › Results Editors › Observational Results** (the analyzer's results card) shows the list's count and its Display/Print
  Data (VIREO's Recorded Results window). The photometer bench and the own-observation HR view show the same list.
- Cluster HR **Plot my observation records** takes the list as it stands into the saved-observations HR workspace.

## Session format (v35)
- Save writes the list only when it differs from what the migration derives from the same investigation: an outermost v35
  wrapper `{format, version: 35, numericalPolicy, base (v1..34), observationListPolicy: 'openvireo-observation-list-v35',
  observationList: [records]}`. Otherwise the older format is written byte for byte. A v35 whose list equals the migration is
  refused (one canonical file per state).
- Each record: `{id, jd (or null), ra, dec, bands[5], kind, spectralCode, z, velocity, remarks}`; z and velocity are Single
  values, −0 is stored as +0, at most 1000 records. JSON numbers round-trip exactly, so a v35 re-saves byte-identically.

## Web adaptations ([W], one line each)
- Older investigation files migrate by a fixed rule: their photometer rows, then their Hubble records, each inserted by its own
  time; cross-route merges are not applied retroactively.
- Classifications keep the browser notebook (its own reuse by retained spectrum, Edit, Delete and backup); Record also writes
  the shared list, and its dialog starts from the shared record when one has the same name.
- The shared list has no web Edit, Delete or Clear; Save investigation keeps it. A photometer session file adds its rows only to
  an empty list.
- Hubble and classifier Cancel still record nothing (natively the record stays); photometer Cancel keeps it, as VIREO.
- A classifier source without a known JD in 1900–2099 is stored with no time (shown blank; the text list prints 5018.500000 for
  a zero time, as VIREO's row writer does).
- The file loader 0x584d0c (another writer of this list) is not ported [U].

## Tests
- `src/core/sharedObservationList.test.ts`: shared IDs across routes, Time-Dependent Data on/off, insertion order rules
  (equal times, head branch), route writes, FormActivate, encoding, plot order, migration, portable bounds, full list.
- `src/io/observationListSession.test.ts`: older files (v8 photometer owner 15, v32 Hubble) load with the migration and re-save
  byte for byte; v35 round trip; canonical and malformed v35 refused.
- `tests/one-results.spec.ts`: photometer Record/Review + Classification Results + Hubble Record → one list → Data from
  Observations plot → Save investigation (v35) → restore.

## Model and effort
- Plan and implementation: Claude Opus 5.5 (subagent). Independent review: pending.
