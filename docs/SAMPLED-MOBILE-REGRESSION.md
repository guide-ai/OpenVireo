# Sampled mobile keyboard regression investigation

Follow-up to `debf9393e4c6fe982fca772c8af6b2e62e9e1114`. This increment changes one browser test, not the product or scientific model. Evidence remains local at `/home/dobleuber/Documents/Codex/2026-10-18/task-3/regression-timing-recovery/`; original two97/98batch logs remain in `combined-native-route-recovery/`.

## Confirmed cause and bounded correction

A natural reproduction on the **unchanged9101dd5baseline** establishes a test setup race. Its event record shows:

| Sequence | Native browser event | Cursor state |
|---|---|---|
|38|ArrowRight keydown|Creates preview|
|39|Resize to360×800|Preview visible before the handler;existing resize cancellation runs|
|40|ArrowRight keyup|Preview cleared|
|41|Enter keydown|No cursor position to confirm|
|42|Enter keyup|No retained reading|

The test awaited `setViewportSize` and advanced100ms through the mocked clock. Neither step guaranteed that Chromium had dispatched its native resize event before the keyboard gesture. `InspectionSurface` deliberately cancels a pending cursor on resize; Enter correctly does nothing after that cancellation. The test incorrectly assumed an uninterrupted gesture. This is not a demonstrated product regression from the combined lower-source route.

The test now registers a one-shot native resize promise **before** changing the viewport, awaits its delivery, disposes the handle and then performs the existing100ms clock advance and keyboard steps. There is no sleep,timeout increase,clock workaround,removed assertion or production change. Two additional assertions distinguish the live preview from the retained reading; the original ordinate assertion and acquired/raw/SSP/reimport/restore/scroll checks remain. Reversing only these additions reproduces the exact original test SHA-256 `d87022922c30c402ab8bb4829fb19ccf3de2c3d17f1d85ab330961ebe3fb47f6`.

The entire `InspectionSurface` body remains identical to9101dd5, SHA-256 `70be0a01052f9936e35c255f82f125e8eaadf5b52fc2ebecdb2d11fbb2d0d7f5`. The product's stale-geometry cancellation contract is preserved.

## Controls and verification

Identical diagnostic copies use the same browser/dependencies,worker count1,default30second test/5second expect limits and matched cases on both revisions. A temporary loopback5177server serves the preserved9101dd5source archive;the candidate uses the existing5176server. Suites run sequentially. The93common-case control excludes only the four new feature cases and the one changed combined-source case on both sides. Passive event collection changes no assertions and injects no resize event or CPU throttling. Full trace archives,request/page-error records,source snapshots and event JSON remain outside Git. Worker concurrency stays1;Playwright restarts its worker after the baseline failure as usual.

| Control |9101dd5baseline|debf939candidate|
|---|---|---|
|Common broad suite with full traces|93/93pass|93/93pass|
|Original body,eight cases in one worker,passive events|7/8pass;natural resize race captured|8/8pass|
|Same eight cases,only real-resize await added|8/8pass|8/8pass|

The independent Python event-order contrast checks all32passive/before-after cases. The sole failure has resize between ArrowRight and Enter. All16await-only cases have resize before ArrowRight,no intervening resize and a live preview when Enter arrives. This is event-lifecycle evidence,not native CLEA execution,emulation or a numerical oracle.

The actual corrected repository test also verifies live/retained phases. Full unit suite passes1343tests/135files;typecheck/build and1279resource size/SHA-256checks pass,with the existing build chunk advisory. The actual repository affected suite now passes **98/98in one ordinary untraced batch(3.6minutes)**,with failure-only screenshot capture and unchanged timeouts. The repaired mobile case checks both live and retained phases inside that batch;no cases are skipped or partitioned. Desktop/mobile browser evidence is retained;the mobile screenshot was inspected. The successful batch establishes current regression verification,not an explanation or permanent absence of every historical intermittent failure.

An initial diagnostic-harness load failed because copied tests lacked a nearest `type:module`package;that external harness metadata was corrected before the93case runs. Its log is retained and is not an application failure. The temporary baseline server is stopped after the controls;existing5173/5176processes are preserved.

## Separate unresolved startup observation

The previous second batch timed out before finding **Activate supported star field**,before classification. That failure was **not reproduced** in either matched93case trace or the32passive/await-only cases. Passing traces show the star module arriving and the initial Suspense fallback resolving. These observations do not establish the original timeout's cause,and the resize fix is not claimed to fix startup. Original failure/error context remains;no speculative cache,React,timer or timeout change is made. Earlier acquisition/keyboard/Mayall timing observations retain their own scopes and uncertainty.

External review remains on the explicit human authorization hold,with0new attempts and no substitute. No push,deployment,original execution/emulation,integrator,source/sampler,acquisition/count/seed,record,grade or persistent-format change. N02/E03remain partial;all64primary statuses remain unchanged.

## Proposed next feature only

No observational-results implementation starts here. The existing recovered `TObsRsltsDlg1`resource has SHA-256 `7bb02ba22d7533bb87d65450bd1ae9a24eef463dec005a2898fabdfd13a9709e`;verify this identity against the local parsed artifact before extending the recovery. Designer properties locate manual spectral type `SpEd`(MaxLength12),remarks `RmrksEd`(MaxLength36),velocity `VelEd`,and read-only object/JD/RA/Dec/redshift/U/B/V/R/Ifields. Designer defaults are not observations or proof of runtime visibility/validation;never populate student measurements from them. The [previous hashed provenance](COMBINED-LOWER-WIDTH-PROVENANCE.json) preserves executable identity,credits and source-specific uncertainty.

The next bounded proposal is one source-bound **open → edit → cancel/reopen → confirm** observational record flow. First recover classification entry `[0x50b1dc,0x50b2c2)`,preparation0x54a73c,OnActivate0x54a91c,OK0x54b02c andCancel0x54b2dc to establish field ownership,validation and actual record writes. Show only already verified observation data;mark missing values explicitly. Preserve existing long answers without truncation or format changes. Native list edit/delete/undo and legacy interchange remain separate recovery until their contracts are established;no grade or uncertainty rule is inferred.

Acceptance should cover Cancel preserving records/drafts,confirmation exactly once under the recovered append/update rule,readonly source identity,source changes invalidating stale review and complete investigation/CSV continuity on desktop/mobile. Designer MaxLength values alone do not authorize silently imposing new constraints on existing answers. The proposal and precise later list-handler addresses are also saved in the local `results-form-proposal.json`.

## Recheck locally

Run `npm run test:e2e -- tests/sampled-intensity-traces.spec.ts` from the repository to exercise all four sampled-trace flows. The default test server uses a separate loopback5175port and leaves the persistent5173preview alone;choose an unused `OPENVIREO_TEST_PORT`if needed. Full affected command and raw98-case log are preserved in the local evidence directory.

For a manual check at `http://127.0.0.1:5173/#classification`,choose **Sampled intensity traces**,focus the unknown plot,press an arrow for preview and Enter to retain. Resizing between those keys should cancel the preview;an arrow and Enter after the resize should retain a new reading. This cancellation behavior is preserved,not changed by the test correction.
