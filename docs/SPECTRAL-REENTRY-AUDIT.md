# Native spectral focus, reset and cache audit

19 October2026. Static audit only; no Windows, original CLEA execution or microemulation. The executable SHA-256 is `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. `/home/dobleuber/Documents/Codex/2026-10-18/task-3/spectral-reentry-recovery/audit.json` binds11 raw objdump ranges and retained original executable/license/copyright hashes. Original downloads, assembly and research remain outside web source; no public rights are inferred.

| Native branch | Direct evidence | Consequence |
|---|---|---|
| FormActivate 0x50dac4–0x50dbd3 | Resolves current source/slit and writes mode+0x416 before identity comparison and unsaved-spectrum query | A guessed atomic focus transaction would conceal real intermediate native state |
| Save-change query 0x50dbd8–0x50dd68 | Guard+0x3171 may return false; saved flag+0x3172 controls dialog; Save invokes writer and checks the flag after return; Cancel returns false | Reentrant dialogs/callbacks must be resolved before porting active refresh/cancel semantics |
| Source reset 0x50df64–0x50e314 | Same label/type skips reset; changed identity resets only when query returns true. Reset clears600 means/counts, committed elapsed+0x312b and totals; no call to0x55f0d0 | Clearing an observation does not establish a new global random seed |
| Go/Stop 0x50f484–0x50f76c | Means prepared only when source mode is active and committed elapsed equals0. Stop disables SpecTimer and retains count/RNG cache | Continuation reuses cached means; no evidence for per-tick mean refresh |
| Timer 0x50f76c–0x50fa93 | Count accumulation uses retained means and native RNG | Current browser per-segment RNG does not attest all native global interleavings |
| FormPaint 0x50ede0–0x50f2dc; reinitialize0x5110b0–0x5110eb | Paint redraws. Reinitialization calls clear/show/activate/source setup/paint, ending at Paint rather than Go | Repaint does not begin integration; the previously corrected Go attribution stays corrected |
| Cache bounds0x53af28–0x53afb0; focus0x537978–0x537d54 | Cache-hit geometry is bounded; focus dispatch can route through instrument reentry | A cache miss needs a newly admitted original population/context |
| Poisson init0x55f0d0–0x55f0f4 | FormCreate initializes the Poisson cache; inspected source/reset/save/stop do not prove seed reinitialization | Browser reset preserves the seed under its explicit contract |

Direct branch ordering is now recorded. Still unresolved are complete queued VCLtimer/focus/message ordering during integration, modal callback reentry, the prewritten selection/mode following Cancel, and global RNG consumption across catalog/render/window activity. These are scientific/lifecycle dependencies, not a denied tool action. Focus is not asserted to stop exposure. No atomic rollback, live stellar mean refresh, arbitrary recache or drift-photon integration is implemented from these incomplete branches.

The existing [read-only drift view](STAR-DRIFT-INSPECTION.md) remains bounded. The independent functional increment is [three-telescope sky acquisition](SKY-TELESCOPE-PROFILES.md), whose exact zero-source field/calibration/low-mean RNG contracts can be checked without resolving those missing moving-star branches. No scientific acceptance criterion or package count changes.
