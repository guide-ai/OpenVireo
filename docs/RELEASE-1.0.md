# OpenVireo 1.0

The first public release of OpenVireo: a non-commercial browser reconstruction of Project CLEA's VIREO, the Virtual Educational Observatory, for students. It is published as a static site on Cloudflare Pages at its free address (user decision of 2026-11-07, `AGENTS.md`). Publishing steps are in [DEPLOY.md](DEPLOY.md) (Spanish).

OpenVireo is rebuilt from VIREO's recovered behaviour and its original data files. It is not CLEA's program and claims no equivalence with it.

## What 1.0 contains

The seven VIREO exercises, each with a student guide and an end-to-end test of the student path ([STUDENT-EXERCISES.md](STUDENT-EXERCISES.md)):

| | Exercise | Scope |
|---|---|---|
| E01 | Hubble's law | All 13 original galaxies, spectra, the Hubble diagram and H₀ |
| E02 | Large-scale structure | The LSS survey strip and the wedge plot |
| E03 | Stellar classification | The original atlases, practice lists and acquired spectra |
| E04 | Pleiades photometry | 24 stars, UBV photometry, the HR diagram and the distance |
| E05 | Cluster HR diagrams | The cluster database and the HR fits |
| E06 | Pulsars | The radio telescope, the receiver and pulsar timing analysis |
| E08 | The Quest for Object X | A star, galaxy, QSO, pulsar or asteroid, with its identity hidden until revealed |

It also contains:

- **The observatory:** dome, telescopes, finder and telescope views, the clock and tracking, hot lists, site and date, and the catalogue and field information.
- **The instruments:** spectrometer, photometer, CCD and infrared cameras, the multi-object spectrometer, and the radio telescope.
- **Results and help:** saved investigations and VIREO's Help files.

## Web adaptations

Each adaptation is labelled in the app where it appears and in each exercise's document. The main ones:

- **Browser arithmetic and drawing.** The site computes with browser timing, random seeds, raster and Number arithmetic, not VIREO's x87 or Windows drawing.
- **Local saves.** Investigations and results are saved in the browser or as downloaded files. There are no accounts and no log-in, so the student-name line stays blank.
- **Camera catalogue.** The original USNO NOFS service no longer answers. The cameras use bundled CDS/VizieR extracts (NOMAD I/297, USNO-B1 I/284), or a live VizieR VOTable query that sends only sky coordinates and radius.
- **Tiled originals.** Large originals are served as byte-range tiles under the host's 25 MiB per-file limit: the compact GSC and, since 1.0, `Orbit/ObjX_MPC.CMO`. Each tile is checked, and then the whole file is checked against its SHA-256 before use.
- **Object X default orbit file.** The web default is `ObjX_MPC.CMO.sav`, which reproduces the ObjectX.HTL asteroids at the original default time. `ObjX_MPC.CMO`, the original default, and `ObjX_AST.CMO` stay selectable.
- **External links.** They open in a new tab only when clicked. Where an address no longer exists, the current equivalent page is used.
- **Instructor mode.** This is the web form of VIREO's Demonstration Mode. It has no password and gives no protection.

## Privacy

- No cookies and no accounts.
- Visit analytics are aggregate and cookie-free (Cloudflare Web Analytics).
- Apart from that analytics beacon, the live camera query is the only request to another site, and it runs only when the student chooses it.
- The notice is in the app under Help › About this site and privacy.
- The response headers are in `public/_headers`: a strict Content-Security-Policy, `nosniff`, `same-origin` referrer, a deny-all `Permissions-Policy` and `frame-ancestors 'none'`.

## Known limits

- Equivalence with the original runtime (x87, GDI, timing, random numbers) is not claimed or verified. Tests prove the chosen contracts, not the original's output.
- Peripheral VIREO branches outside the seven student paths may be partial. They are marked where they appear.
- Some originals are missing from VIREO's own archive (for example seven galaxy photographs). Their rows keep VIREO's missing-file behaviour.
- The live camera query depends on the VizieR mirrors (IDIA, then CDS). If they are unreachable, only fields with a bundled extract can be imaged.
- The site is large (about 676 MiB in about 2000 files), but the browser loads data only as an exercise needs it.
- These are deferred:
  - the remaining CLEA programs;
  - accounts and cloud saves;
  - teacher features (the paused fronts T8–T11b);
  - a custom domain.

## Credits

- **Project CLEA, Gettysburg College:** the originator of VIREO and its data files. Supported by the National Science Foundation and Gettysburg College. The original files are included on the CLEA License.rtf basis: free non-commercial copies for students, and no distribution for profit.
- **Pulsar data:** likely derived from the ATNF Pulsar Catalogue (Manchester, Hobbs, Teoh & Hobbs 2005). That origin is uncertain.
- **Camera catalogues:** CDS/VizieR (doi:10.26093/cds/vizier); NOMAD (Zacharias et al. 2004); USNO-B1.0 (Monet et al. 2003); 2MASS (Skrutskie et al. 2006) through NOMAD.
- **Star fields:** the Guide Star Catalog, as packaged with VIREO.
- **Further sources:** per-file provenance, notices and uncertainties are in [RESOURCE-PROVENANCE.json](RESOURCE-PROVENANCE.json), [PROVENANCE.json](../PROVENANCE.json) and [THIRD_PARTY_NOTICES.txt](../THIRD_PARTY_NOTICES.txt).
