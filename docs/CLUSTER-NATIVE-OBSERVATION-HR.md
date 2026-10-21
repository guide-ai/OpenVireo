# HR diagram from saved observation results (original "Data from Observations")

This panel implements the original VIREO route described in `HRAnalHlp.TXT` ("Load Data from Observations" and "Display/Print Cluster Age/Distance Parameters"). It runs as follows. Load observation results you saved earlier. Plot them with **File › Load/Plot › Data from Observations**. Compare the ZAMS and isochrones by eye. Read the **View/Print Parameters** text. Nothing is fitted, filled in, graded or assigned membership. It reuses the existing DAT reader, the native results ordering, the six original model grids and the ZAMS. Their files and behavior are unchanged.

Status: integrated in the local candidate under Cluster database → HR diagram from saved observations. Separate Claude review and full integration validation remain pending. It adds no investigation session fields;Save investigation does not include this independent HR workspace. Download DAT before reload;manual overlays reset on reload.

## Recovered contract

Evidence `VIREO-HR-OBSERVATION-PLOT-REPORT-STATIC-2026-10-21` ([provenance](CLUSTER-NATIVE-OBSERVATION-HR-PROVENANCE.json)) is bound to executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`.

| Original | Address | Port |
|---|---|---|
| `MeasuredData1Click` | 0x542ed8 | Sets observation mode (+0x40d=1, database +0x40c=0) and refreshes. It has no emptiness check, prompt or cancel branch. |
| Redraw | 0x54235c | Frame, then database plot when +0x40c≠0 or observation plot when +0x40c=0, then enables the menu items at+0x38c/+0x388 (0x54239a–0x5423af),then checked overlays. 0x4548ac is TMenuItem.SetEnabled;the identities of these menu slots are not mapped. The web disables Clear when no overlays are shown as a UI choice. At0x542380 `mov al,1` overrides the earlier +0x40d test; +0x40d does not gate paint. The initial +0x40c is unrecovered. The explicit web Plot command selects observation mode; hiding records before selection is a web presentation choice. |
| Screen geometry | 0x5423dc, 0x542480 | Fixed axes. V runs 2.0→18 at 28 px/mag (top 15, bottom 463). B−V runs −0.5→+2.5 at 120 px/mag (left 80, right 440). This is the only writer in the HR code range. The original screen plot has **no autoscale**. |
| Frame labels | 0x542480, 0x486268 | `FloatToStrF(…, ffFixed, 18, 1)`. Positive colour labels get a `+`. `(B-V)` appears under +1.0 and `V` at (20, 22). The ported tick and label positions are an exact list. |
| Observation plot | 0x542990 | Iterates the results list from head to tail (0x492628/0x492634/0x49271c). It reads V Extended at +0x40 and B Extended at +0x36. V is compared before B with Single 0.0, and either signed zero skips the record. B−V = B − V. y = Round((V−2)·28)+15 and x = Round((B−V+0.5)·120)+80 use only the low 32 bits. Each point is a 7-px ellipse with no clipping. `# of Stars: N` is drawn top right. **The photometry kind (+0x5e) is not tested.** |
| View/Print Parameters | 0x543d90–0x544190 | Exact strings and decimal places. The ZAMS section prints V-Mv and E(B-V) with 2 decimals. With option +0x2e7c it adds the distance 10^((m+5−3.0E)/5) with 0 decimals and " Parsecs". The isochrone section prints the metallicity label, log age with 2 decimals, age 10^(logAge−6.0) with 0 decimals and " Million Years", and the (B-V) adjustment with 2 decimals. |

REA evidence `ev_61f4…` (PE resources) and `ev_f6d7…` (GNU objdump) were used. The objdump run was **partial**: the provider was killed at the output cap at 0x4e0d26. The HR range 0x540000–0x547000 therefore comes from the existing safe derived listing `task-2/analysis/native-field-recovery/target.asm` (SHA256 `164c88c2…`), checked against REA on the overlapping range. The REA Ghidra provider is not configured, and no provider workaround was applied.

## Numerical policy

Each x87 result in the plot is evaluated as an exact dyadic rational, rounded to a 64-bit significand with nearest-even. FISTP also rounds nearest-even. This applies to B−V, V−2, (B−V)+0.5 and both products. The policy follows the compiled 0x1332 control word; the historical host control word is unverified.

The hand-derived controls include two cases where a binary64 port differs:
- **V = 2.125−2^−62:** a binary64 port draws y=19; this port draws 18.
- **A product that rounds onto a tie at 64 bits:** this port draws y=423; real-number rounding gives 424.

**Exception paths.** The fcomp/Round invalid-operation and overflow exceptions are unmasked in 0x1332. These cover NaN, unsupported or infinite operands that survive the zero tests, Extended overflow, and results outside Int64. Pseudo-denormal operands (declared web choice) and pixel offsets whose low 32 bits would wrap are handled the same way. In every case the web **blocks the whole plot** and names the record. It does not reproduce a partial paint, a wrapped position or the error dialog. The zero tests come first, so V=0 with B=NaN is simply skipped.

**Report values.** These use Number/Math in place of the Extended `Power` (0x42703c). `toFixed(0)` approximates the FloatToStrF decimal path. The decimal separator is `.`; the host separator is not recovered.

## Using the panel

1. Choose **Load saved observation results (DAT)**. Review the name, record count and SHA-256, then choose an action:
   - **Add to current results** inserts the records through the recovered insertion.
   - **Replace current results…** then requires **Confirm replacing current results**, which is the original second confirmation.
   - **Cancel and keep current results** leaves everything unchanged.

   **Cancel file read** handles slow reads, and late completions are ignored.
2. Press **Plot data from observations**. Every current record whose B and V are both non-zero is drawn on the fixed axes. Records marked as mean counts are flagged because the original plots them unchanged. Off-axis records are still listed in **All records and how the original treats them**.
3. Show the ZAMS, then move the **V − Mv** and **E(B−V)** sliders. No catalogue reddening is copied for observation data. Add an isochrone, choose its metallicity and set log(age/yr) and the (B−V) adjustment. **Tools › Clear** removes both overlays.
4. Read **View/Print Parameters**. The original first line continues with the last *database* cluster record name. That content is not recovered for observation data, so the line shows only `Cluster: `, with an explanation.
5. **Download current results (DAT)** returns the current records as exact 144-byte original-format records in native order. Reloading that file reopens the work. HR slider/overlay state is not persisted, because there is no original evidence for it.

Invalid files leave the current results unchanged. This covers a size that is not a multiple of 144, more than 1000 records, overlong text, time/RA keys that cannot be ordered, and read failures.

## Integration interface

```tsx
import ClusterNativeObservationHr from './components/ClusterNativeObservationHr';
<ClusterNativeObservationHr
  initialList={nativeResultListOrNull}      // optional handoff (e.g. from the DAT inspector)
  messages={translatedSubset}               // Partial<ClusterNativeHrMessages>; English defaults
  idPrefix="cnhr-" disabled={busy}
  onWorkspaceChange={w => {/* ClusterNativeHrWorkspace, if the host decides to persist */}}/>
```

The core functions are in `src/core/clusterNativeObservationHr.ts`:
- `clusterNativeHrPlot`, `clusterNativeHrFrame`, `clusterNativeHrReport`;
- the workspace transitions `begin/complete/fail/cancelClusterNativeHrRead`, `add/armReplace/confirmReplace/disarmReplace/cancelPending`, `plotClusterNativeHrObservations`, `setClusterNativeHrTrial` and `clearClusterNativeHrOverlays`.

The Playwright spec reads `CLUSTER_NATIVE_HR_URL` and defaults to the integrated route `/#cluster-database`.

## Remaining limits

The following are not recovered:
- the paint-box extent, GDI colours and fonts;
- initial database/observation mode byte +0x40c;
- optional selected-star marker ownership/context:0x542b03–0x542b5e reads +0x480 and position +0x481/+0x485, with colour from +0x3d9. That branch is not implemented;no marker is synthesized;
- the print path (0x542fc8);
- the database-record name line for observation data;
- the default of option +0x2e7c;
- the exact FloatToStrF decimal path and host FPU state.

No runtime witness exists. Tests check this implementation's contract and are not an original oracle. N04/E05 remain partial: optional CCD, uncertainty, classroom validation and original runtime fidelity are open. No original execution, emulation, network or new dependency is used.

The candidate host retains the observation workspace across navigation and cancels in-flight file reads on collapse, navigation or investigation save/restore. Previous results and pending reviewed files remain separate from global investigation data. Presentation text uses the shared catalog;source report strings and scientific values retain their original identity. The dyadic policy is a bounded arithmetic model under the compiled default,not demonstrated historical x87/FPU/GDI execution equivalence.

Validation is recorded per frozen snapshot,not combined into a single result. The initial integration source (c674548) passed1,751unit tests,six HR application flows and450E2E withthree radio-harness skips. The first correction (5a5ed87) passed1,752unit tests,eight HRflows and452E2E withthe same three skips. The next correction (ea13938) passed1,753unit tests,ten HRflows and454E2E withthreeharness-onlyskips (7.8min). Each snapshot also passedtypecheck/build andall1,279resource SHA-256/size checks. Current receipts and raw logs are in `/home/dobleuber/Documents/Codex/2026-10-18/task-3/fronts-integration/`. Later corrective snapshots require their own validation and separate Claude review before promotion. These are tests of the chosen port contract,not original-runtime oracles.

The numerical policy refers to [the existing FPU context recovery](NATIVE-FPU-CONTEXT-PROVENANCE.json): the compiled word is 0x1332 at 0x5ae024, with its source hash recorded there. The historical registry exception mask and actual handler-entry word remain unverified. Evaluating the recovered formulas introduces no original Windows registry access, CPU instruction interpreter or original execution.

Review corrections: exact decimal presentation is capped at96 fractional places (large integer expansions also bounded), retaining an exact coefficient × 2^exponent fallback without changing arithmetic. Blocked plots expose all raw object/B/V records in merged native order without partial computed points. Local transaction controls restore keyboard focus;DAT download errors retain the workspace. The1000ms object-URL cleanup follows the existing inspector;the review suggested a cross-browser hazard,but no Firefox/Safari failure was reproduced. The raw author evidence ledger is preserved;the redraw interpretation above corrects its earlier +0x40d claim. Separate post-correction review remains required.

Post-review diagnostic labels describe the web decision to withhold the whole plot,not the original treatment of each row. The blocking row is explicitly marked;rows before/after it do not fabricate additional B−V or a native exception outcome. A slow file completion preserves focus if the learner moved to a model control. Failed Add retains its candidate and Dismiss returns focus to that candidate.

Diagnostic number cells use the same stored-number fields in successful and blocked modes,retain signed infinities and localised encoding classifications,and expose the exact stored hex in their title. No invalid value becomes a physical measurement. Async focus is rechecked at DOM commit against its original owner and intervening focus/pointer interactions;an unrelated click or manual control keeps focus. Download failures are tied to the list they belong to,without a stale-alert commit on list replacement.
