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
| classificationLoad | open `#classification` cold, until the type field shows and commits stop | 173 | 178 |
| classificationKey | one keystroke in "Proposed spectral type" | 34 | 36 |
| classificationFill | `fill` of that field | 34 | 36 |
| classificationToSpectrum | header click from classification to the spectrum analyzer | 52 | 55 |
| analyzerKey | one keystroke in the analyzer's "Object or reference" | 8 | 12 |
| observatoryLoad | open `#observatory` cold, until its heading shows | 102 | 110 |
| openDome | click "Open dome ↗" | 30 | 30 |
| visitedKey | after visiting eight routes (they stay mounted, hidden), one classification keystroke | 34 | 36 |
| visitedRouteChange | then the header click to the spectrum analyzer | 52 | 55 |

Counts are as of the commit that set them; the Front Perf commits lower them step by step and update this table.

### Budget changes
- Merge of main 4ac7516 (Fronts S and R1) into Front Perf: classificationLoad 135 → 144 and observatoryLoad 73 → 82
  (budgets 158, 90): Front S mounts SpectrumEngineControls (×2) in the always-mounted analyzer, and the analyzer subtree
  renders once more on load (SpectrumInstrument, Chart, Diagram, VelocityAnalysis, HubbleAnalysis, OwnObservationResults,
  CleaHelp, one each). analyzerKey 7 → 8 and both analyzer route changes 42 → 43: SpectrumEngineControls renders with the
  analyzer. Keystroke counts on other routes are unchanged (31).
- Merge of main e19d7bb (Fronts C5W and A) into Front D3: C5W's ObservatorySounds and A's CloudEntry rendered on every
  shell render (keystrokes 31 → 32 with CloudEntry; ObservatorySounds also on every clock tick). MR3 memoises both:
  ObservatorySounds compares only motion.kind and motion.phase (all its sound state reads), CloudEntry gets a stable
  onRestore. Keystroke and route-change counts are back to 31 and 43. On load each renders once more (classificationLoad
  144 → 147, observatoryLoad 82 → 85, within the budgets), and openDome 25 → 26: the dome switch cues the dome sound, which
  re-renders ObservatorySounds once.

- Front REL1 (v1.0) and Front Onboarding (2026-11-08). REL1 wrapped every lazily loaded part in an error boundary
  (LazyBoundary, RouteErrorBoundary). The shell builds new but equal route elements on each keystroke, so both wrappers
  rendered again for every mounted route: visitedKey 31 → 47 and classificationLoad 147 → 160, already over budget on main
  d6d0167. Front Onboarding memoises LazyBoundary (it skips a render when its child element has the same type, key and
  shallowly equal props), so keystrokes are 34 (the remaining wrappers belong to the route being typed in). Front Onboarding
  also makes each header section a NavGroup, which must know the current page to open its section: six more on load
  (observatoryLoad 85 → 93, budget 100; classificationLoad 164, budget 178) and five on every route change
  (classificationToSpectrum and visitedRouteChange 43 → 51, budgets 55). openDome is 30 (the dome's lazy sky boundary
  renders twice while it loads).

- Front HEADER (2026-11-10): the page bar replaces the investigation card and takes Help and the language select from the
  sidebar. On main 2dbb118 the counts had drifted to classificationLoad 168, observatoryLoad 97 and both route changes 54 (the
  table still showed the Onboarding counts). The bar is a memoised element (rebuilt only when the page, the host modal or the
  investigation's busy, notice or error change) whose parts (InvestigationActions, the Help menu, the language slot, CloudEntry)
  are memoised separately, so keystrokes do not render it and a route change renders only PageBar: the route changes go 54 → 52
  (HelpMenu, LanguageChoiceSlot and LanguageChoice no longer render with the sidebar). Loads mount PageBar and InvestigationActions,
  and the language module now fills two slots (LanguageSelectSlot ×2 + LanguageSelect, VireoOriginalsSlot ×2 +
  VireoOriginalsOption, against LanguageChoiceSlot ×2 + LanguageChoice): observatoryLoad 97 → 102, so its budget is raised to 110;
  classificationLoad 168 → 173, within 178. openDome stays 30; keystrokes stay 34 and analyzerKey 8. Its review confirmed the +5
  (re-measured against main 2dbb118: 97 → 102, the two new components and the split slot) and pinned the bar from 600 px up
  (CSS `position:sticky` and a ResizeObserver that writes the bar's height to a CSS variable, outside React): no count changed.
- Front LAZY-OBS (docs/SEO.md): the entry's `App` now loads `OpenVireo.tsx` as a chunk of its own and renders it, so each cold
  load counts 3 more components (`App` ×2 among them, around the app): classificationLoad 173 → 176 and
  observatoryLoad 102 → 105, within their budgets (178, 110), which are unchanged. openDome 30, keystrokes 34, analyzerKey 8
  and route changes 52 are unchanged. The table above keeps the counts of the commit that set them.

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
