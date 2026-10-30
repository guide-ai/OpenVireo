# Bounded photometer aperture observing

> **Front P2 (2026-10-30):** apertures 5–150, the R and I filters, VIREO's sky at large apertures and the superseding 0.9 m / 4 m domain are in [PHOTOMETER-P2.md](PHOTOMETER-P2.md); this page describes the earlier bounded scope, whose contract stays unchanged.

19 October 2026 follow-up: [KPNO 0.9m photometry](KPNO09-PHOTOMETER.md) now adds a separate fourteen-target calibrated observing profile with telescope provenance and fresh skies. Earlier fixed-0.4m descriptions below remain the original bounded profile.

Telescope0 now admits three original selector sizes5,10,15 for the existing sixteen complete Pleiades object/sky fields and U/B/V filters. Changing size changes the source aperture fraction and the background amplitude before the existing source-then-sky Poisson draws. The chart shows the corresponding radius; the notebook records the aperture of each confirmed reading. Student entries remain blank and manual. Explicit B/V color pairs require the same aperture; both chosen readings and derived diagram points retain the aperture. Mixed-aperture pairs are withheld as a browser protection because no aperture-loss correction exists. No aperture-loss, color, extinction or catalog-answer correction is supplied.

The original dialog allows5..150; this increment intentionally exposes only three checked values. Its decoded form is at executable file offset2157372,1693bytes,SHA256`f320e52144263bd948e2498f9a577c477e85392b78bf1eb7a9dd79316bf913db`. Original executable and archive identities, procedure ranges, help/license/copyright hashes and numerical policy are bound by `data/photometry/aperture-contract.json`.

## Native contract and browser boundaries

`0x5404b0..0x5404dc` stores `(selector+Single(0.5))/scopeScale`; the existing complete field fixes scopeScale=936/.05 pixels/degree. Diameter is radius×120 arcminutes. `0x500acc..0x500b58` gives areaFactor=(selector+.5)^2/10.5^2 and skyMagnitude=referenceMagnitude−2.5log10(areaFactor). Source fractions use the existing recovered flat separation, prepared3/2arcsec seeing width, integral table and original neighbor query/order. Each configuration re-queries the complete field; the previous aperture's neighbor list is not reused for a new size.

The original PHOTOHLP.TXT explicitly describes sky reuse after an aperture change. `0x501831..0x50186d` divides measured sky rate by its own area factor; object reduction multiplies that stored reference rate by the object's area factor. Per-filter sky readings retain their original reading ID, aperture, duration and context. Sky is never relabeled as newly measured. Source and sky photons are summed. Display SNR remains native sqrt(total), without inventing a physical error model.

The native dialog changes geometry live and restores the old size on Cancel. The web modal instead commits only on Apply; Cancel/Escape/default draft changes consume no photons or events. Applying a different size is permitted only while armed and stopped. It clears the current/unfinished integration, retains consumed RNG/callback budget, and preserves prior readings/notebook/colors/fits and measured sky. This explicit stopped reset is a browser policy, not a claim about native VCL reentry scheduling. Modal drafts are discarded on navigation, release, save and replacement. Returning to size10 does not erase the fact that an aperture change occurred.

Optional in-memory reading/work apertureSelector defaults to10 for old states. Canonical raw owner8 is required only when history includes an actual aperture change; it binds all previous proofs plus the aperture contract. Old raw1–7 serializers retain their exact default path/header bytes. Full investigation8–21 embeds the nested journal through the existing photometry owner; no new outer version or cached counts are introduced. Reader resource limits, replay, duration, count and terminal-release checks remain active. A redundant-only aperture journal is rejected rather than accepted and silently downgraded. This checks minimal ownership and dropped/coalesced events, not original JSON whitespace, key order or numeric-token spelling; the existing Number/JSON policy normalizes signed zero.

## Evidence and limits

Independent Python Decimal90 Gaussian power-series integrals and table interpolation, integer-coordinate geometry/cosine, direct flux sums and area scaling contrast all288 configurations. An independent modulo PRNG/math.lgamma reference supplies864 draw pairs at three seeds. Maximum relative source-mean difference is5.445e-9; this measures the chosen Number quadrature policy against an analytic reference, not original-runtime equivalence. The minimum distance to the unsafe native+5 lookup argument is3.01282; every query circle is inside the previously whole-censused field. All sky apertures remain empty; each object query contains only its central star, with original known colors. This finite real-field validation exercises no second contributor or real blending at sizes5/15. Ordered duplicate/second-list query and known-color blending have separate synthetic kernel tests in photometerField.test.ts and photometerSource.test.ts; they do not admit a contaminated observational field. Expected5000-callback maximum is2.023254e9 counts; the actual int32 guard is still checked per callback. Expected counts do not guarantee arbitrary random trajectories cannot overflow.

Original fields, inputs and kernels remain preserved. No original executable, Windows, REA or emulation was used. Original-runtime/x87 equality, full native selector range, arbitrary pointing, other telescopes, R/I, mixed-variable fields, generated sources, uncertainty and public redistribution remain unvalidated/unadmitted. I01/N03/E04 remain partial and the primary64 acceptance statuses are unchanged.

Static operand/form/hash verification, independent generator and results are retained outside source at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-aperture-recovery/`. New numerical vectors are explicitly synthetic validation data, never original observations. The original whole-field census evidence remains in the three prior field/provenance packets.

## Try locally

1. Open `http://127.0.0.1:5173/#photometer`; activate the Pleiades photometer. If another telescope profile is selected, first return to Observatory, select telescope 0 and choose **Use this telescope**, then open **Pleiades photometry**.
2. Choose **Change aperture**, size5, **Apply aperture**. Keep Sky pointing and start integration.
3. Choose size15; cancel first to see size5 retained, then apply. The sky reference still identifies size5.
4. Point to Object and start. Inspect counts and magnitude; **Add notebook entry** starts blank. Enter your own transcription and confirm. The notebook preserves size15.
5. Change duration to1s; start/stop a partial reading, change size and verify that no partial magnitude or notebook row is fabricated.
6. Save the photometer session, restore it, and verify reading IDs/apertures/manual entries. Save/restore the full investigation as well. Malformed/wrong-contract files report an error without replacing existing work.
7. **Default size10** changes only the modal draft until Apply. Prior raw1–7 files still restore at size10 with their original replay/bytes.

Final checks and review dispositions: [PHOTOMETER-APERTURE-VALIDATION.md](PHOTOMETER-APERTURE-VALIDATION.md).
