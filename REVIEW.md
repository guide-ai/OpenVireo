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

## Claude review workflow
Use local Claude with model claude-opus-5-5 and --effort high; verify effective model in initialization/assistant output and record configured effort honestly. Give direct read access to this complete project and both research directories, without snippets or filtered copies. Do not expose credentials or original binary bytes to the model. Keep raw reports separately from resolved findings.

Run /code-review directly in Claude when the installed command supports the actual review target. Run /security-review for changes involving untrusted input, file parsing, data flow or external exposure when that command is available and appropriate. Inspect the command's scope first: a PR-only workflow must not post comments, open PRs or fabricate a PR for this local project. If a command is unavailable/inapplicable, document that exact limitation and request a direct local read-only review of the full project with the same criteria. Do not bypass permissions or install plugins automatically.

Validate findings against source/evidence, fix confirmed issues and retain the review result and resolution. Review is not permission to publish or execute CLEA.

## Verified native command
The native /code-review was executed successfully on this project directory with Opus 5.5 and high effort, without a PR or publication. It is distinct from the legacy PR-only plugin command. See docs/REVIEW-RESULT.md for the original report, audit and independently validated resolutions. Prefer the native local-target command for this project; preserve the no-publication and no-secret restrictions.
