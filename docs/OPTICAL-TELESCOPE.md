# A01/I08: compiled optical telescope selection

**Follow-up,19 October2026:** [Mayall Pleiades photometry](MAYALL-PHOTOMETER.md) now adds a separately bounded ten-target profile. Earlier Mayall gates below describe the dated preceding increment; existing telescope0/1 contracts remain intact.

19 October 2026 follow-up: [KPNO 0.9m photometry](KPNO09-PHOTOMETER.md) now adds a separate fourteen-target calibrated observing profile with telescope provenance and fresh skies. Earlier fixed-0.4m descriptions below remain the original bounded profile.

Follow-up: [Fixed UT/site clock](SITE-CLOCK.md) now derives a bounded sidereal reading from the applied telescope's compiled longitude. This does not implement native live time, tracking or horizon effects.

**Follow-up,19 October2026:** [Mayall4m star and three-galaxy acquisition/full14](MAYALL-ACQUISITION.md) now extend the verified profiles, retaining earlier data/formats and the0.9m star300ms bound. The earlier evidence below retains its dated scope.

**Follow-up,19 October2026:** [Three KPNO0.9m galaxy acquisitions and investigation13](KPNO09-GALAXIES.md) now add independent galaxy profile/target journals and verified manual Hubble continuity. The earlier bounded evidence below retains its dated scope.

**Follow-up,19 October2026:** [KPNO0.9m centered stellar acquisition and investigation12](KPNO09-STAR.md) are now implemented with independent calibration/raster/count evidence and separate telescope journals. The earlier bounded delivery/evidence below retains its historical scope.

The observatory now exposes the three VIREO1.504 compiled fallback telescope records, their site information and the native Hubble unrestricted-access policy. Selection has an explicit preview/Apply/Cancel workflow. Applying a different telescope stops and retains represented observing segments and closes the preview dome. Investigation11 preserves both the selected telescope and the unapplied choice. This completes the bounded **compiled-profile inspection, safe selection and durable continuity** criterion. A01/I08/P02 remain partial against their full original outcomes.

## Try it at http://127.0.0.1:5173/

1. Open **Observatory → Optical telescope → Site information & optics**. The initial profile is **0.4m (16") Telescope**. Inspect aperture406.4mm, focal length4627.5mm and Gettysburg College Observatory. These are display-rounded values; source Single bits remain in the data packet.
2. Choose **KPNO 0.9m (36") Telescope** in **Telescope profile to inspect or select**. Its site/optics appear immediately, but the current telescope remains0.4m. Choose **Cancel telescope choice** to discard the pending choice. Dome, pointing and observing data are unchanged.
3. Choose0.9m again and **Use this telescope**. The current profile changes and the dome closes; current exposure segments stop and their data remain. Inspect **KPNO 4m (158") Mayall Telescope**: the original nominal name is retained alongside the actual stored aperture3810mm and focal length10287mm. Apply it explicitly if desired.
4. Visit **Sky exposure**, **Star exposure**, **Galaxy exposure** or **Pleiades photometry**. Existing measurements, archives and notebooks can still be inspected. New acquisition is disabled for these alternate profiles because their complete calibrated acquisition contract is not admitted. Choose **Use supported 0.4m (16") Telescope**, then explicitly activate/start the instrument to resume the supported workflow. No prior count or manual answer is rescaled.
5. Back in Observatory, apply0.9m and leave4m as the pending choice. **Save investigation**, reload, then **Restore investigation JSON**. Both choices return independently, observing activity remains stopped, and the saved manual work remains unchanged. Cancel a restore to retain current work. A damaged optical proof/index or injected aperture rejects the whole file atomically.

## Original data and native control evidence

| Compiled record | Stored aperture mm | Stored focal length mm | Seeing arcsec | Scope/finder magnitude factors | Site |
|---|---:|---:|---:|---|---|
| 0.4m (16") | 406.3999938964844 | 4627.5 | 3 | −2 / −6 | Gettysburg College Observatory |
| KPNO0.9m (36") | 914.4000244140625 | 9144 | 1.7999999523162842 | 0 / −5 | Kitt Peak Nat'l. Obs. - Arizona |
| KPNO4m (158") Mayall | 3810 | 10287 | 1.7999999523162842 | 3 / −4 | Kitt Peak Nat'l. Obs. - Arizona |

The recovered constructor is0x5a3174, packed record stride0x93. Site-information bindings0x53e9e4..0x53ee9e and optical-options0x5933b4 establish units/field semantics. Record offsets,57 literal checks, original Single hex and raw Extended coordinates/constants are retained in [compiled-optical-profiles.json](../data/observatory/compiled-optical-profiles.json), SHA-256 `08685cc7d0d18abaa71deafbf515d66ec08aa1e7782ee6784b62b6238e941dfc`. The source executable SHA-256 is `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Whole-source/license hashes, addresses, static lifecycle evidence and uncertainty are in [optical-provenance.json](../data/observatory/optical-provenance.json).

The three defaults carry availability1/.5/.25, allocation sentinels255/255 or successful-use ranges12–23 and8–15, and rejected-request waits0/10/15minutes. **They do not run a lottery here.** Native Hubble initialization writes unrestricted access at0x58a8ca..0x58a8d3; menu policy0x589cb5..0x589cde directly enables all three telescopes and disables Request Time. Restricted request0x58ba88..0x58bf06 uses upper-exclusive bounds and consumes both random draws even on cancel; that separate workflow is recovered but unimplemented. Displaying its inactive metadata does not implement restricted scheduling.

Same-index Access is a native no-op. The original default switch waits for dome closing before committing (0x58b444..0x58b9bf with options-copy0x5879b8..0x5879cd); native Access does not have this web Apply/Cancel prompt. The browser deliberately stops/deactivates controllers and closes its simplified dome immediately, while retaining catalog pointing and old observations. Native coordinate reinitialization at0x537f08 is not reproduced by that retention policy. Neither a native dome animation nor native switching equivalence is claimed.

## Numerical, session and scientific limits

Values are **compiled fallback defaults**, not an imported `VEO_OPTS.INI` or a claim about an instructor's configured installation. Native nominal labels can differ from stored physical numbers. Single values are preserved exactly in JavaScript Number; coordinate displays project independently decoded Extended-rational products through the native radians-to-degrees constant and then round only for presentation. No native x87/runtime witness exists. Static source checks and self-consistent tests cannot establish binary equivalence.

Full11 adds the strict optical policy `VIREO-Hubble-unrestricted-optical-v1`, packet SHA and two indices to full10's bound observing/editing state. Arbitrary site/aperture/availability overrides, altered proofs and unknown fields reject. Old full9/10 implicitly describe the former sole0.4m context and migrate to it; older full1–8 and practice-only files have no observing/optical scope and preserve the current optical choice. Pure writers without optical state retain their prior formats/bytes. All restored represented instruments remain stopped/deactivated until explicit activation. Standalone scientific journals retain their original fixed0.4m proofs even when viewed beside another selected profile.

Alternate-telescope acquisition, user preference ingestion, restricted access requests, native switch timing, date/time, tracking, horizon visibility, atmospheric/DST corrections and scientific effects of those additional settings remain open. No new counts, spectrum, noise, calibration, distance or Hubble fit is generated for them. The learner's redshift/velocity/color remains manually entered. Raw source plus sky still **adds** to the native acquisition buffer; measured sky subtraction remains a later photometer reduction.

Static recovery/reproduction artifacts are outside web source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/i08-a01-recovery/`. Original files, hashes and rights statements are preserved; this local work grants no public redistribution. No original execution, emulator, Claude, installation, public upload/deployment, remote push or purchase was used. [Verification](OPTICAL-TELESCOPE-VALIDATION.md).
