# Hubble acceptance status — 18 October 2026

This assessment uses the implemented source and local verification receipts,
not the earlier planning paragraphs that still describe acquisition as disabled.
It evaluates the bounded three-target VIREO teaching path, not every native
Hubble/HubLab mode or all phase-1 prerequisites.

| Acceptance outcome | Status before the integrated-guide increment | Evidence / boundary |
| --- | --- | --- |
| Reach a supported galaxy from the observatory | Implemented for 36747, 36773, 54876 | Exact catalog centers, explicit activation, fixed 4000–5000 Å. `tests/multi-galaxy.spec.ts`; broader targets unavailable. |
| Form calibrated source-plus-sky counts and pause/revisit each target | Implemented bounded simulation | Original catalog/GLXYTMPL fallback, recovered calibration/Poisson, independent vectors, separate journals. `docs/MULTI-GALAXY-HUBBLE.md`; native raster/RNG/timing fidelity unverified. |
| Inspect an acquired curve and measure redshift manually | Implemented | Zero/unconfigured controls on each distinct snapshot; student aligns and confirms. `tests/galaxy-analysis.spec.ts`, `multi-galaxy.spec.ts`; no catalog z supplied as measurement. |
| Record and trace distinct targets | Implemented | Bound acquisition ID/target, immutable archive, editable labels do not change identity; stars excluded, repeats cannot masquerade as independent targets. |
| Enter apparent V/source and select an explicit distance/summary recipe | Implemented | Original V references 15.6/15.8/16.0 are visible but not inserted. Workbook M=−21.0 mean(v/D) and VIREO M=−21.4 plus 2008 manual origin fit remain distinct. |
| Plot the measured relation and calculate a supported summary | Implemented mathematical adaptation | Three measured targets produce points/fit after complete inputs; missing rows and duplicate acquired targets withhold the summary. Independent Decimal vectors; no native regression oracle or new H0 determination. |
| Save, reload, restore, inspect and resume raw investigation | Implemented | Analysis JSON v3 archives acquired journals/controls/log/Hubble drafts; old versions supported; atomic replay and deactivated restoration tested. |
| Export scientific tables and interoperable spectra | Implemented bounded profiles | Measurement/Hubble CSV retain source claims, bits and IDs. SSP exports header+600 normalized source-plus-sky bins; exact SSP import/source download/session roundtrip tested. SSP loses raw scale/time/RNG; JSON is the backup. |
| Complete the sequence without consulting external instructions | Partial — next implementation priority | Local docs explain the path, but the UI has only scattered help, no coherent three-target workflow, progress, or contextual recovery guide. This is a P03/Q02 gap in the current Hubble pilot. |
| Interpret assumptions and limitations rather than treat a fit as a cosmological measurement | Partial | Scientific limits exist in evidence/help; students need an integrated explanation and prompts alongside their own dataset. No answer/grading model is justified. |
| Original program/runtime equivalence and all historical exercise branches | Unverified / out of current bounded acceptance | No original execution, x87/RTL/GDI equality, process-wide RNG continuity or saved SSP writer oracle. Broader fields, instructor settings, historical HubLab variants and full phase-1 time/site/motor/coordinate behavior remain incomplete. |
| External review/release/rights acceptance | Pending under existing restrictions | Earlier reviews cover earlier snapshots only. No Claude/Windows/push/public upload in this increment. Local rights inventory is not redistribution permission. |

Evidence baseline before the guide: `docs/SSP-INTEGRATION-VALIDATION.md` records
**210 Vitest tests, 39 Playwright flows, TypeScript/build and visually inspected
desktop/mobile preview**, plus source hashes and supported SSP boundaries in
`docs/SPECTRUM-SAVE-CONTRACT.md`. Static contracts and self-consistent tests are
not an original-runtime oracle. Exact native byte/numerical equivalence is not
an automatic gate on a clearly labelled, bounded web adaptation.

Decision: remain in phase 2 and close the integrated guidance/error-recovery
slice before advancing to phase-3 classification/photometry/LSS. No new astronomy
model, acquisition target, measured answer, spectrum, distance rule or fit will
be invented for that UI work. The bounded Hubble path can become self-guided;
that does not mark phase 2, E01, or the complete suite universally finished.


## Integrated-guide increment outcome

The gap identified above is now implemented as **Hubble lab guide** in the
persistent top navigation. It explains the complete three-target workflow,
manual comparison controls, distinct recipes, original V references, JSON/CSV/
SSP roles, reflection prompts and actionable recovery steps. Progress derives
from replay-verified archive identity + curve digest + target + measurement and
complete sourced Hubble rows. Repeated targets, generic imports and workbook
examples do not certify the acquired path. A ready dataset is labelled ready to
interpret, not graded or certified. Guide dismissal/navigation preserves work;
JSON restoration recalculates progress without a new saved-session schema.

Local acceptance is the bounded software workflow and explicit science policy,
with navigation, repetition, cancellations, invalid inputs/imports, raw-state
return and restoration checked. An astronomy educator has not evaluated a real
learner's lab report or line-alignment accuracy. Native execution/equivalence,
all original fields/options, historical HubLab, wider observatory prerequisites,
external review and release/rights gates remain open. E01/phase 2 is not marked
universally complete. No new scientific model or recovered contract was added.
See [HUBBLE-LAB-GUIDE.md](HUBBLE-LAB-GUIDE.md) for feature steps and verification.

Current increment verification: **216 unit tests / 41 E2E / typecheck/build**,
with the integrated guide inspected on desktop and 320 px mobile.
See [HUBBLE-GUIDE-VALIDATION.md](HUBBLE-GUIDE-VALIDATION.md).
