# Render budget

`tests/render-budget.spec.ts` counts how many React components each user action renders on the dev build, and fails when a
count goes over its budget. It guards the Front Perf work (plan `analysis/front-plans/front-perf.md`, coordinator decision
D1 of 2026-10-29) against slow regrowth: before it, every keystroke re-rendered the whole app, and the cost grew by about
3× over two weeks without any single commit standing out.

## How it counts
`tests/fixtures/render-probe.ts` installs a stub React DevTools hook before the page loads. On each commit it walks the
committed tree with React DevTools' own rule: a subtree whose child pointer did not change was not visited, and a component
counts when it is new or carries React's PerformedWork flag. The dev build renders twice under StrictMode, but a fiber
commits once, so each component is counted once per commit. Counts are deterministic for a flow; times vary with machine
load, so they are never asserted.

## Scenarios and budgets
| Scenario | What happens | Count | Budget |
|---|---|---|---|
| classificationLoad | open `#classification` cold, until the type field shows and commits stop | 164 | 175 |
| classificationKey | one keystroke in "Proposed spectral type" | 31 | 36 |
| classificationFill | `fill` of that field | 31 | 36 |
| classificationToSpectrum | header click from classification to the spectrum analyzer | 42 | 47 |
| analyzerKey | one keystroke in the analyzer's "Object or reference" | 7 | 12 |
| observatoryLoad | open `#observatory` cold, until its heading shows | 73 | 78 |
| openDome | click "Open dome ↗" | 25 | 30 |

Counts are as of the commit that set them; the Front Perf commits lower them step by step and update this table.

## Changing a budget
- `OPENVIREO_RENDER_REPORT=1 npx playwright test tests/render-budget.spec.ts` (or `=all` for every component) prints each scenario's count, commit count and
  the components that rendered most.
- **A count went down** (an optimisation): lower the budget to the new count plus a small headroom (about 5 %, at least 5).
- **A count went up**: first check the printed components. If a hidden route, closed dialog or unrelated window now
  re-renders, fix that (memo, stable props) instead of raising the budget. Raise a budget only when the new renders are
  needed for the feature (a newly visible window, a new route mounted on load), say why in the commit message, and update
  both this table and `BUDGET` in the spec in the same commit.
- Never relax the assertion itself or turn the scenario off.
