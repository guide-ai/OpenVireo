# Review criteria

## Evidence and science
- Trace each formula/state transition to artifact hash, procedure address, assembly range and evidence ID. Distinguish original data, analyst inference and new UI behavior.
- Validate units, data schemas, conversion points (Extended/x87, double, float32), domain and rounding. Report the numerical policy; Number/WASM is not automatic x87 equivalence.
- Check SEH epilogues, stack cleanup, calls, cancellation, reentry and state. Preserve uncertainty. Tests are evidence of the chosen implementation contract, not an oracle for the original.
- Keep synthetic validation vectors separate from original observations; never present them as acquired CLEA spectra.
- Keep license/provenance inventory. The user explicitly authorized versioning all1279manifested resources and normal Git publication to guide-ai/OpenVireo. This is an operational scope update,not a blanket third-party license or original-runtime equivalence grant. Preserve source-specific notices/uncertainties;hosting,deployment and extra uploads remain outside scope.

## Engineering
- Pure core; React handles presentation. Inputs bounded and validated. Accessible controls and responsive layout. No raw HTML from imported text. Review parsing, file limits, CSV escaping, export behavior, dependencies and network surface.
- Test meaningful edge cases and user flows. Build/typecheck must pass; browser must be inspected. Record failures and remaining gaps.

## Work and review workflow
Claude Code (claude-opus-5-5) coordinates and implements; see AGENTS.md. Every feature goes through three steps:
1. **Plan** at high effort: student steps, files, evidence needed and the e2e path that will prove it.
2. **Implement** at medium effort, in the feature's own git worktree and `claude/<front>` branch. Parallel fronts never edit the same files; the coordinator merges into main after review.
3. **Independent review** at high effort by a reviewer that did not write the code (a separate subagent or session), over the whole feature rather than each micro-increment. Give it direct read access to the project and safe derived research evidence; never credentials or original binary bytes.

Do not run implementation at high effort by default. Record the effective model and effort of each step honestly. Validate review findings against source/evidence, fix confirmed issues, and keep the raw report separate from the resolution in the feature's doc. "Done" follows docs/STUDENT-EXERCISES.md: guide, end-to-end test of the student path, adaptations labelled in one line. Review is not permission to publish or execute CLEA.

History: Codex-driven launches (`analysis/claude_phase.py`, `claude_independent_review.py`), native /review and /code-review runs, and earlier denied or empty attempts are historical evidence only; see docs/REVIEW-RESULT.md.
