# Visual photometer validation — 18 October 2026

Delivered: a lazy-loaded Pleiades photometry screen, pure bounded observing state machine, one-callback adapter, blank manual-entry modal, strict standalone portable journal, English i18n and regression coverage. The first usable scope is one original Pleiades target/sky, fixed telescope0/V/explicit1′ base field/0.1s. No further numerical model or default calibration was added.

## Actual repository checks

- `npm run build`: TypeScript(`tsc -b`) and Vite passed. The large-chunk advisory remains for the existing shared catalog/numerical data; no dependency or service configuration changed.
- `npm test`: **47 files,293 tests passed**. Twelve new tests cover activation/fresh sky, independently established seed42 counts, Stop/restart without random consumption, context release/return, refreshed sky association, manual values/duplicate rejection, event budgets with safe release, strict portable replay, foreign/cached/calibration fields, invalid ordering/seed and byte/UTF8/JSON bounds. All prior independent scalar/field/vector contracts pass.
- `npm run test:e2e`: **61 passed in23.9s**. Four new complete photometer flows cover sky→object, blank manual input/cancel/Escape/confirm, exact repeated save/reload/reimport, altered-file preservation, fresh-sky gating, Stop/restart, navigation/hidden-tab/pending-save stale callbacks, cancelled picker and cancelled/late file read after navigation. The prior57 flows retain v7/older analysis, SSP exact bytes/reimport, manual spectroscopy/classification/Hubble and three-galaxy acquisition behavior.
- A further Chromium UI probe against **http://127.0.0.1:5173/#photometer** used ordinary100ms callbacks and the untouched initial seed42: sky1, object552, displayed V9.647121003. It verified the manual field starts blank and focused, Cancel keeps the notebook empty, and no page errors/external requests occur.
- Real-run desktop and320px mobile photometer screenshots, plus390px mobile/desktop modal screenshots, were visually inspected. Field/controls/readouts/limits fit their cards; focus, entry controls and confirm/cancel fit the modal. No horizontal overflow occurred. The mobile Stop/reentry scenario advances its seed, so its later reading differs from the first seed42 pair as expected.

Retained screenshots: [external browser-evidence record], [external browser-evidence record], [external browser-evidence record] and [external browser-evidence record].

## Evidence, compatibility and review

Nine new listing/byte-range hashes and five supporting original/license/evidence hashes match the pinned binary and retained sources. All nine prior complete catalog/binary/license hashes and two prior generated field/vector hashes still match. The portable file's explicit SHA-256 matches the original field fixture. Static Start/reset, Stop/unlock, close-query, telescope-setting, result/edit/modal and inherited text-report writer branches are documented in [the contract](PHOTOMETER-VISUAL.md); broader native lifecycle/report precision/import is not asserted from those slices.

Of213 existing source/data/test/config/dependency files, **209 retain their hashes**. The four changed existing files in that inventory are `OpenVireo.tsx`(lazy route/navigation), `photometerField.ts`(additive callback export), `en.json` and planning metadata. Existing scientific formulas, IO/session v7, all previous tests, dependencies and configuration are unchanged. New photometry files are listed separately. Documentation changes/backups/patch are retained with the integration manifest.

I01/E04 are now partial because the bounded observing interaction exists. Full64-package acceptance remains0 complete:34 partial,28 contract-gated,1 rights gate and1 not started. Fourteen original-fidelity overlays remain tracked. No full original exercise/native runtime equivalence is accepted by passing software tests.

The UI intentionally exposes only the confirmed fixed telescope0 profile. Web context release/reactivation always needs fresh sky; it is not a claim about general native bank switching. The notebook's manual confirm/cancel behavior is declared new OpenVireo behavior, distinct from native pre-modal Record mutation. Its separate version1 JSON does not extend or accept v7 and is not an original native report/import format. Counts/reductions replay from strict bounded events; imported cached results/calibration are rejected. Notes are rendered as text. No automatic catalog answer or grade is written to a learner record.

Candidate verification found and resolved TypeScript union narrowing, a temporary-test dependency path pointing to a read-only checkout cache, and clock-harness loading/focus timing. The final harness lets the lazy screen load before freezing the clock; the production modal now focuses its field after React mounts it, independent of animation-frame timing. The loopback test-server restriction was resolved through approved execution. No browser/engine/dependency installation, original execution/microemulation, Windows, Claude, publication, push or original-resource upload occurred. No action remains denied, pending or uncertain.

Logs, backups, manifest, patch, source verification and browser probe:

`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-visual-integration/`

Static captures and verification scripts:

`/home/dobleuber/Documents/Codex/2026-10-18/task-3/photometer-visual-recovery/`

[URL, exact UI steps and scientific limits](PHOTOMETER-VISUAL.md).
