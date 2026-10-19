# Integrated three-target Hubble guide

Open http://127.0.0.1:5173/ and choose **Hubble lab guide** in the top navigation.
The guide is available from the observatory, exposures and analyser.
**Continue to next step** navigates to the stage derived from the saved data. It is a
new English/i18n-ready teaching interface, not text recovered from native forms.
The evidence-based choice to stay on Hubble is in [HUBBLE-ACCEPTANCE.md](HUBBLE-ACCEPTANCE.md).
The existing three-target science and file evidence remain in
[MULTI-GALAXY-HUBBLE.md](MULTI-GALAXY-HUBBLE.md),
[HUBBLE-ANALYSIS-UI.md](HUBBLE-ANALYSIS-UI.md) and
[SPECTRUM-SAVE-CONTRACT.md](SPECTRUM-SAVE-CONTRACT.md).

## What the learner can do without external instructions

1. **Go to galaxy exposure** from the guide. Choose a supported acquisition
   galaxy (36747, 36773, 54876), activate and start. The guide explains exact
   field activation, exposure/noise, pause/cancel and switching targets.
2. **Analyze acquired galaxy** sends a fixed snapshot. The guide explains line
   lists, z step, Fine/Coarse, recenter/reset and the record confirmation. The
   example comparison step 0.001 is a control resolution, never a target's z.
   Students must align features and decide whether their data support a result.
3. Repeat for the other targets. Reopen **Hubble lab guide** to inspect progress
   and original V references, including each worksheet cell. Reference magnitudes
   do not initialize Hubble fields. Expected z, velocity and fit are not shown.
4. **Open Hubble workspace** navigates, expands the section and focuses its
   summary. Add saved measurements, choose VIREO/manual M=−21.4 origin fit,
   enter magnitude/source and identify each target explicitly. The guide keeps
   workbook M=−21 mean(v/D) interpretation separate.
5. **If a step is blocked** explains activation/positive-count gates, noisy
   curves, missing/invalid row fields, source clearing, repeats, JSON/journal/SSP
   distinction and size/archive limits. It never fixes a scientific value.
6. Save JSON, export CSV/SSP as needed and reload/restore. The guide explains
   each file's role, raw-state restoration and how to start over after saving.
   Interpret the student's own points using the four reflection prompts. The
   guide does not give a grade or an expected H0.

Escape, **Close Hubble lab guide** or **Return to my work** dismiss the modal.
Opening it alone does not pause an exposure; choosing another route retains the
existing pause/deactivation behavior. No guide action changes telescope targets,
measurements, Hubble inputs, recipe selection or scientific results. Navigation
buttons only change route/open the Hubble section.

## Pure progress contract

`src/core/hubbleLab.ts` accepts a verified archive inventory, the measurement log
and the current Hubble workspace. Archive identity, target and curve SHA must
all match a galaxy measurement before it counts. The legacy 36773 origin schema
without explicit targetId retains its documented default. The three display
counts are unique archived target IDs, unique measured target IDs and complete
Hubble target rows. Multiple snapshots or records of one target cannot inflate
them. Generic SSP/CSV imports, stellar alignments, documented inputs and original
workbook examples cannot certify the acquired path by label.

A dataset is ready to interpret only when all three supported targets have
archive-bound measurements, exactly one complete Hubble row for each, the
VIREO/manual recipe and a supported calculated result. Missing sources/targets,
invalid numbers, repeats or extra/unrelated rows revoke readiness. This is a
workflow checklist, not a quality/accuracy or original-fidelity judgment. All
scientific calculations remain in the existing pure functions. No progress
field is serialized; session v1/v2/v3 behavior is unchanged and progress derives
again after an atomic restore. Hubble input drafts are not replaced by the guide.

## Evidence and boundaries

V references come unchanged from `data/hubble/galaxy-distance-references.json`:
Hubble Data.xls SHA-256
`09ac2e0bd4499e4a4796cf64981b3958d264f92b710b1ac9e3324340054fc7ed`,
Sheet1!C2=15.6, C3=15.8, C9=16.0. Only V references enter the guide.
Original distance/manual sources and their SHA-256 are shown in its sources
section. The UI exposes no workbook/catalog redshift as an acquired answer.
The scientific source/address/range hashes and license restrictions remain in
existing manifests; no original data or downloads were edited or published.

Three exact configurations, shared GLXYTMPL fallback, Number arithmetic,
nearest-center raster, browser seed/timing and separate journals remain bounded
adaptations. Source PLUS sky is retained. Native x87/RTL/GDI and process-wide
state continuity are unverified; no original saved SSP writer oracle exists.
The origin fit is the manual-based mathematical implementation, not recovered
native regression. Wider fields, time/site/tracking, instructor settings and
historical standalone branches remain incomplete. No astronomy-educator or
original-runtime acceptance is claimed from local software tests.

No original CLEA/Windows/emulation, Claude, REA setup, dependencies, remote work,
push, public upload or deployment was used. Earlier review restrictions remain.

## Final local verification

TypeScript/build, 216 Vitest tests and 41 Playwright flows passed against the
persistent preview. Desktop/mobile were inspected visually. Detailed evidence,
initial test correction and remaining limits: [HUBBLE-GUIDE-VALIDATION.md](HUBBLE-GUIDE-VALIDATION.md).
