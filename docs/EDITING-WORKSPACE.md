# P02: durable editing workspace in investigation v10

**Follow-up,19 October2026:** [Investigation11](OPTICAL-TELESCOPE.md) also preserves selected and pending compiled optical profiles. The v10 delivery/verification below is retained as dated evidence.

A full investigation now retains the existing source-preparation seed draft, photometer seed draft, pending confirmed B/V reading choices, selected velocity row, exact manual velocity text and whether a check was requested. The already implemented scientific observations and prior durable drafts remain unchanged. This closes the represented **nonmodal editable-input continuity** criterion. [Original P02 criteria, remaining dependencies and scope boundaries](P02-ACCEPTANCE.md).

## Try it at http://127.0.0.1:5173/

1. In **Spectrum analyzer**, import your spectrum, enter an analyst z step, adjust the control and save your own measurement. Open **Velocity analysis**, select its **Measurement for velocity check**, type **Your velocity · km/s**, and leave it unchecked or explicitly choose **Check velocity**.
2. In **Spectrometer**, expand **Repeatable source preparation** and type a seed draft. In **Pleiades photometry**, acquire/confirm your own B and V notebook entries as usual. Choose **Saved B reading** and **Saved V reading**, then leave the pair unapplied. Use **Release telescope context**, expand **Raw counts & reproducibility**, and type another seed without pressing **New seeded session**. An invalid/incomplete seed draft can be kept without changing the actual PRNG seed.
3. Choose **Save investigation**, reload and use **Restore investigation JSON**. Full10 restores the exact drafts, including deliberate blank choices. The selected velocity row remains bound to its saved manual z; a requested check is recalculated with the existing numerical contract. No check is performed for an unchecked answer.
4. Visit photometry: pending B/V choices return, but no B−V is calculated until you explicitly choose **Calculate B−V**. A previously calculated color remains separate from the current pending selections, including a deliberately cleared selection. Seed drafts do not replace the journal's actual seed or counts. Instruments remain inactive until explicit activation/start.
5. Try a damaged copy with a B reading bound to a V/sky/wrong-target/unconfirmed reading, an unknown measurement ID, overlong text or an injected grade. The entire replacement rejects and existing work remains. Cancel a pending restore, wait for editing controls to return, then change an answer; late file completion cannot overwrite it.

Existing Save session/complete-investigation buttons use the same full10 snapshot. Standalone scientific journals keep their exact previous formats and scope.

## File and state policy

Full10 requires full9's admitted observing/edition context plus `editingPolicy: OpenCLEA-editing-workspace-v1` and a strict `editing` record. Every raw text draft is bounded to80 characters, including invalid/incomplete/Unicode text. Pending photometer reading IDs must reference confirmed object notebook entries in the specified filter and current target; they are never silently changed to a different reading. A velocity selection must refer to an eligible restored row; catalog-star acquisitions remain excluded. An investigation with no eligible rows admits only an empty, unchecked velocity draft. Extra fields and cached/translated feedback or accepted flags are rejected.

The existing velocity formula/check is called after restoration when the saved `checked` flag is true; neither a cached grade nor a catalog answer is trusted. Invalid, zero-reference and guarded-boundary outcomes retain the existing behavior. Pure numerical kernels and scientific CSV/journal formats are unchanged. The photometer's confirmed entries and calculated colors remain in its proof-bound raw journal; pending selections and seed text are a separate editing scope.

Full1–9 remain supported. They contain no editing scope: velocity restores the prior default (latest eligible restored row, blank unchecked answer); a replaced photometer restores its original seed text and existing explicitly calculated pair or blanks; absent old photometry preserves current photometry/drafts; the unrepresented source-preparation seed draft is preserved. Full10 explicitly replaces all included drafts. Practice-only restore retains its established merge scope. A legacy version cannot smuggle full10 editing fields. Pure IO writers without editing retain earlier versions/bytes, including full9; full10 requires an admitted observing context rather than accepting unbound edition settings.

Snapshot/replay/transaction guards are shared with [full9](OBSERVING-WORKSPACE.md). Release/count events now retain unapplied photometer choices; changing target, resetting a segment or explicitly calculating a new color reconciles them against the real confirmed entries. Save does not confirm a modal review, integrate a pending callback, add a measurement, apply a seed or calculate a color. Closing an unconfirmed modal remains cancellation; no automatic browser persistence or native modal reentry is introduced.

This is a new web persistence contract. It introduces no astronomy model, calibration, source/noise function, option, distance, fit, catalog answer or native file-format claim. Existing Number/Math versus Extended/x87 limitations remain. Raw source plus sky still adds to the acquisition buffer; measured sky subtraction remains a separate photometer reduction. Original files/provenance/hashes/addresses/licenses are preserved. No original execution, emulation, Claude, installation, public upload/deployment, push or external cost.

## Manual cluster draft follow-up

Pleiades `clusterModulusText` now registers with the same full-investigation editing workspace. Its optional80-character string preserves unapplied,blank and invalid learner text independently of the confirmed raw6 fit. A present field selects strict `OpenCLEA-editing-workspace-v2`;absent fields preserve exact oldv1 shape/bytes. Full scope/outer1–18 versions remain unchanged. Raw photometer restore and an explicit new photometer session reset this separate draft;full restore,release,callback/target changes and navigation retain it. See [Pleiades analysis](PLEIADES-ANALYSIS.md).

## Native model draft registration

The native isochrone trial registers its bounded unapplied numeric text,known model selector,explicit correction flag and manual interpretation through optional `nativeClusterDraft` and strict editing-v3. It coexists with the paper draft and preserves oldv1/v2 bytes when absent. Confirmed model parameters live in raw7;full1–18 scope selection stays unchanged. This follows the existing nonmodal continuity criterion without narrowing it. See [native model contracts](PLEIADES-NATIVE-MODELS.md).


The separate M67 reference laboratory keeps its pending selection,invalid/blank native trial fields,interpretation andmanual/preset reddening provenance in the strict full19 reference workspace wrapper. Photometer editing-v1/v2/v3 andall canonical1–18 base records are unchanged. See [M67 persistence](CLUSTER-DATABASE.md).
