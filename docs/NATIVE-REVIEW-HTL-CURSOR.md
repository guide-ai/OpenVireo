# Native review of HTL and the manual spectral cursor

The requested CLI input was `/review /tmp/openvireo-arrival`, directly against the actual repository. No source snippets, filtered project copy or custom diff review was supplied. The configured model was `claude-opus-5-5`, with effort `high`; final usage reported that model, the process exited 0 and a nonempty report was returned. Provider-internal effort telemetry is unavailable.

The native task stream internally labels its reviewer `/code-review`. The child report says it has only Read/Glob/Grep and cannot itself invoke Git or `/review`; this is retained in the raw report rather than rewritten. The entry command sent by this task was `/review`, and no alternate command was sent. The report made 26 read-only calls (15 Read, 10 Grep, 1 Glob). Original binaries, HTL payloads, assembly and private state were excluded from model reads. Independent static/hash, original-file, numerical and browser checks supply the evidence the reviewer could not execute.

Raw prompt, launch arguments, stream, report and audit remain outside source in `task-3/native-review-htl-cursor/`, separate from `dispositions.json`. The runtime source remained stable while the reviewer read it; workflow/status documentation was updated and the feature committed after dispatch. No immutable-tree review or later external sign-off is claimed.

## Validated dispositions

| Report item | Resolution |
| --- | --- |
| 1. Leaving and re-entering a held gesture could commit | Leaving the plot now releases and cancels the gesture. A return before release cannot commit; browser regression covers that path. |
| 2. Accepted blank HTL IDs could not retain their ID while editing other fields | An unchanged imported blank/whitespace ID is preserved. New or changed IDs still require a nonblank value. Unit and browser cases preserve the original ID bytes while correcting other fields. The report's stronger claim that renaming was impossible was not reproduced. |
| 3. Shoulder mode stayed pressed when the center became invalid | It returns to Inspect, cancels pending gestures and exposes consistent disabled/pressed states. Browser regression checks numeric center invalidation. |
| 4. Another pointer's cancellation aborted the primary gesture | Cancellation now checks the active pointer ID. A distinct pointer cancellation no longer drops the primary mark. |
| 5. Source comment had incomplete evidence ranges | It now cites ST-07 `[0x5094cc,0x5096dc)` and ST-08 `[0x5096dc,0x509f24)` explicitly. Both original byte/listing hashes were independently rechecked. |
| 6. Applying a keyboard shoulder exactly at the center is rejected | This is the existing strict manual region guard, not a valid shoulder. No automatic offset is invented. The UI now explicitly instructs moving left/right before applying; keyboard arrows and invalid-height paths are tested. |
| 7. Pointer readout could queue live announcements | Live announcements are off during a held gesture and polite afterward. Keyboard preview remains readable. DOM state is tested; behavior across all screen readers is not claimed verified. |
| 8. Repeated parsing/domain/geometry rules | The existing feature draft parser, field keys and wavelength domain are shared. Cursor ticks use its pure mapping. Numerical integration and input grammar are unchanged and analytic/unit tests pass. |
| 9. A separate manual-tool plot repeats the comparison spectrum | Retained deliberately: the comparison view and focused manual-input view serve distinct interactions. They share the same verified sample array and `spectrumPoints` adapter, with no resampling. A browser regression asserts identical logical curve points. The partial versus complete marker overlays are intentional draft views, not different spectra. This is a documented design choice, not a reproduced scientific/state defect. |
| 10. ASCII edits around retained imported high-byte HTL text failed | Such edits are now admitted while preserving the original high-byte sequence. ASCII-only replacement remains possible; new high bytes or codepage conversions are rejected. Unit/browser roundtrips verify the exact retained bytes. |

The reported scale, rounding, codepage, Number/x87 and conditional shoulder-retention uncertainties remain declared adaptations. The report is not original-runtime or scientific equivalence evidence. No new continuum fit, automatic answer, acquired width, noise model or uncertainty estimate was added.

## Verification after resolutions

TypeScript/Vite build passed. All 1241 unit contracts in 113 files passed, including the unchanged analytic equivalent-width contracts. All 23 directly relevant HTL/cursor/classification/import/acquired-continuity browser flows passed. The 13 original HTL files/281 rows again passed independent Fraction/TypeScript coordinate comparison, exact file roundtrip and every-row edit/reimport/undo checks. Existing source resources and scientific measurement policies remain unchanged.

The corrected delivery is checked separately in the persistent loopback browser. Earlier `/code-review` execution denials remain historical; the subsequent explicitly requested `/review` returned the report described here. No second external approval of the post-report corrections is asserted.
