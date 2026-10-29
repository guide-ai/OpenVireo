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
| classificationLoad | open `#classification` cold, until the type field shows and commits stop | 135 | 150 |
| classificationKey | one keystroke in "Proposed spectral type" | 31 | 36 |
| classificationFill | `fill` of that field | 31 | 36 |
| classificationToSpectrum | header click from classification to the spectrum analyzer | 42 | 47 |
| analyzerKey | one keystroke in the analyzer's "Object or reference" | 7 | 12 |
| observatoryLoad | open `#observatory` cold, until its heading shows | 73 | 81 |
| openDome | click "Open dome ↗" | 25 | 30 |
| visitedKey | after visiting eight routes (they stay mounted, hidden), one classification keystroke | 31 | 36 |
| visitedRouteChange | then the header click to the spectrum analyzer | 42 | 47 |

Counts are as of the commit that set them; the Front Perf commits lower them step by step and update this table.

## Changing a budget
- `OPENVIREO_RENDER_REPORT=1 npx playwright test tests/render-budget.spec.ts` (or `=all` for every component) prints each scenario's count, commit count and
  the components that rendered most.
- **A count went down** (an optimisation): lower the budget to the new count plus a small headroom: about 5 % (at least 5)
  for keystroke and route-change scenarios, about 10 % for the two load scenarios.
- **A load count went up because a feature mounts new components** in an always-mounted window (the observatory, the
  hidden analyzer): expected. Raise that load budget in the merge commit, with the printed component list as the
  justification. Keystroke and route-change budgets stay tight: a rise there is a regression to fix.
- **A count went up**: first check the printed components. If a hidden route, closed dialog or unrelated window now
  re-renders, fix that (memo, stable props) instead of raising the budget. Raise a budget only when the new renders are
  needed for the feature (a newly visible window, a new route mounted on load), say why in the commit message, and update
  both this table and `BUDGET` in the spec in the same commit.
- Never relax the assertion itself or turn the scenario off.

## What the stable handlers change
The handlers passed to memoised children (`src/renderStability.ts`, `useStableHandlers`) call the closure of the latest
committed render. For events and effects that is what an inline arrow did. Code that runs after an `await` inside a child
(LSS currentJd after its field fetch, the analyzer's restore continuations) now reads the latest committed shell state
instead of the state when the operation started; the UI is inert during a restore, so the outcome is the same today. A
child that must keep the values of the render that started an operation gets a `useCallback` over those values instead
(the camera's extraSources over pointing), and a function a child calls during render gets a render-assigned ref reader
(observatoryJd, Object X clockUtc) or a `useCallback`/`useMemo` over exactly what it reads (slewMenu, radio hiddenName).
