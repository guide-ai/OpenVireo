# Guide companion

Front GUIDE-COMPANION (user decision, 2026-11-23). Web presentation only: it is not a VIREO feature, ports no CLEA resource and
changes no numerical or recovered contract. The plan is `analysis/front-plans/front-guide-companion.md` in the research root.

## What it is

The seven exercise guides are windows with numbered steps. Before this front, closing a guide left nothing on screen: the student
had to remember the step, find the page and find the control. The companion keeps the guide in use on screen:

- A strip at the bottom of every page (`src/components/GuideCompanion.tsx`) shows the guide's name, "Step n of m" and what to do
  now. It appears when a guide's window is closed and stays until **Hide** or until another guide is opened.
- **Show me where** goes to the page of the current step, scrolls to the step's control, puts the focus on it and draws an
  outline around it. The page is not dimmed and still takes every click.
- **Step details** shows what the guide says under the current step.
- **Full guide** opens the guide's window again.
- The strip moves on by itself as the student works.

## Rules it keeps

- **No rule of its own.** The current step is each guide's `next`, from the same pure progress function the guide's ticks use
  (`src/core/guideCompanion.ts` `companionNow` over `hubbleLab`, `lssLab`, `objectXLab`, `classificationLab`, `clusterLab`,
  `pulsarLab` and `pleiadesLab`). `lssLab` and `objectXLab` gained `next` for this (the first step not done, in list order). A
  mark that goes back (a save made stale, receivers closed before a capture) takes the strip back with it.
- **Nothing is stored.** The guide in use is state of the page load; a reload starts without a strip. No answer, expected value
  or grade appears in the strip that the guide does not show; Object X's identity stays hidden as in its guide.
- **One text, two places.** The strip's line is the guide's own "Next:" line (or the step's title in the LSS and Object X
  guides, which have none), and Step details is the guide's own step body. Each guide exports them
  (`hubbleNextText`/`hubbleItemBody`, `lssStepHelp`, `pulsarNextText`/`pulsarStepBody`, `pleiadesStepBody`,
  `classificationStepBody`, `ClusterLabGuideText.tsx`) and `src/components/guideCompanionContent.tsx` puts them together. The
  only strings of the strip itself are `companion` in `src/components/AppShellMessages.ts` (ten, in ten languages).
- **Opening a guide starts its exercise; the strip does not.** Full guide shows the window without calling `startExercise`
  again (which forces the exercise's options and telescope access).

## Show me where

`src/help/guideTargets.ts` lists, per guide step, CSS selectors tried in order; each names an `id` or a `data-testid`
(`guideTargets.test.ts` checks every one against the source), never a position or a translated label. A step that is a short
chain of actions lists its controls from the last action to the first, and `src/help/spot.ts` `chooseCandidate` takes the first
that is shown and enabled, so the page's own enabled state decides which control is outlined. Controls inside a route that is
not shown are skipped; a closed `<details>` around the chosen control is opened.

The sequence (`GuideCompanion.tsx` `show`):

1. The shell's `companion.go` (`src/OpenVireo.tsx`) goes to the step's page by the guide's own destination. It does not navigate
   when that page is already shown (navigating stops a slew and cancels a running save) nor for a step whose control is Save
   investigation, which is in the page bar of every page.
2. `waitForGuideTarget` waits up to 4 s for the control (a page that is still loading), preferring an enabled control for the
   first 1.5 s (a list that is still loading keeps its first control disabled for a moment).
3. One turn later, after the shown page has focused its own heading, the control is scrolled to the middle of the window,
   focused and outlined. The outline follows the control and goes at the student's next press or key, when the step changes, or
   after 6 s.
4. If no control is on the page, the strip says so ("That control is not on screen yet…") and outlines nothing.

If the page then disables or removes the focused control and the step changes (the classification page loads its first practice
by itself), the focus would be nowhere; it returns to the strip.

The LSS guide's wedge step now leads to the survey page until something is plotted (`lssStepDestination`): "Plot my records in
the wedge" is a button of that page. Once records are plotted it leads to the wedge.

## Layout and accessibility

- Fixed 8 px above the bottom of the window, as wide as the page bar; beside the fixed sidebar from 1100 px up. One row from
  about 900 px; below that the actions wrap under the text; on a phone it takes at most 45% of the screen and scrolls inside.
  Text wraps and is never cut. Logical CSS, so it mirrors in a right-to-left page.
- `--ov-companion-height` (a ResizeObserver, no React render) lengthens the page by the strip's height and sets the page's
  bottom scroll padding, so the end of the page and a focused control are never under it (WCAG 2.4.11).
- `<aside aria-label="Current step of the guide">`; the line and the "not on screen yet" note are `role="status"`; Step details
  is a button with `aria-expanded`; Hide's accessible name ("Hide this guide") starts with its label in every language.
- z-index 16: above page content and the page bar, under the sidebar, the popup windows and every modal backdrop. It is `inert`
  while a host-level modal is open or the investigation is busy, hidden while a guide's own window is open, and not printed.
- The outline is an `outline` (visible in forced colours) with `pointer-events:none`.
- The strip is memoised on its progress data; with no guide in use nothing is rendered (render budget unchanged).

## Tests

- `src/core/guideCompanion.test.ts`: the current step of the seven guides, their skip rules and marks that go back.
- `src/help/spot.test.ts`: which candidate is outlined.
- `src/help/guideTargets.test.ts`: every step has a target, every selector exists in the source, and the strings' rules in
  every language.
- `tests/guide-companion.spec.ts`: the strip's life (appears, follows the work, the four actions, Hide and back), the first step
  of every guide with Show me where, a missing control, layout at 1280, 800 and 375 px, print, inert, Spanish and right to left.
