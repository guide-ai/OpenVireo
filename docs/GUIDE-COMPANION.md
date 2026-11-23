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
- **Steps done many times show their count.** The Hubble, LSS, Object X and Pleiades guides have steps that take one action
  per galaxy, record, image or star. The strip shows the guide's own counts line beside "Step n of m" (`hubbleCountsText`,
  `lssCountsText`, Object X's `counts`, the Pleiades coverage line), so the work is seen to count while the step stays. The Hubble guide also goes one galaxy at a time
  (`core/hubbleLab.ts`, user report of 2026-11-23): an archived spectrum with no measurement is measured ("Step 2 of 5")
  before the next galaxy is acquired ("Step 1 of 5"); before, it stayed on "acquire" until all the galaxies were archived, and
  nothing seemed to move.
- **Opening a guide starts its exercise; the strip does not.** Full guide shows the window without calling `startExercise`
  again (which forces the exercise's options and telescope access).

## Show me where

`src/help/guideTargets.ts` lists, per guide step, CSS selectors tried in order; each names an `id` or a `data-testid`, never a
position or a translated label. `guideTargets.test.ts` checks that every name exists in the source and that its control is on
the page the step goes to. A step that is a short chain of actions lists its controls from the last action to the first, and
`src/help/spot.ts` `chooseCandidate` takes the first that is shown and enabled, so the page's own enabled state decides which
control is outlined. Controls inside a route that is not shown are skipped; a closed `<details>` around the chosen control is
opened (the Hubble workspace card, the hot list).

Where a finished control stays enabled, the page publishes the state and the selector reads it, so the outline moves on:
`data-target-archived` on the galaxy exposure page (the chosen galaxy already has an archived spectrum: the galaxy selector is
outlined, not Analyze again), `data-recorded` on a survey row of the LSS list (a row with no record is preferred), and
`data-complete` on a Hubble row. These attributes are read from the same state the guides' marks use; they add no rule.

### A step that is a cycle

Three steps are done once per galaxy, image or star, and the guide's list keeps one line for all of them. The step shown
does not change there, but Show me where follows the cycle (audit of the seven guides, 2026-11-23: before, it pointed at the
cycle's first control every time, also after the student had used it):

- **LSS "repeat"** (five different galaxies): a row with no record; once the telescope points at it, its own Activate, Start,
  Pause, z step and Record Z; once it is recorded, another row. The page says which it is (`data-pointed-recorded` on
  `#lss-page`), since a recorded galaxy's buttons stay enabled.
- **Object X "image" and "repeat"**: `core/objectXLab.ts` `imageAction` names the next action from three facts the site already
  holds: the clock was set, here or in the observatory, after the last image of the target (`objectXLaterClock`, repeat only;
  a clock left running is not a later time, as in the guide's text), and whether the observatory's coordinate boxes or the
  telescope are within the on-target radius of the target (`objectXAim`; the same radius that makes an image count, so
  coordinates typed by hand count too). The keys are `repeat` (the later time, on the Object X page), `image-copy` (Copy the
  coordinates to the observatory, on the Object X page), `image-point` (the dome, then Point to coordinates) and `image`
  (tracking, Start exposure; the camera while it exposes). With no unrevealed target known to the shell (already revealed),
  `image-any` is the whole observatory chain, as before.
- **Pleiades "sample"** (24 stars): `PleiadesExerciseSummary.current` tells what the selected star still needs, and the strip
  points at the same controls as for the first star (`measure`, `record`, `color`); with its B−V confirmed, at the Photometry
  target selector.

`core/guideCompanion.ts` `companionTarget` gives the key and `components/guideCompanionRoute.ts` its page; the strip publishes
both (`data-target`, `data-route`) beside `data-step`. None of this is a mark, a count or a judgement: the guides' own steps,
texts and done rules are unchanged.

What the outline does not do, on purpose:

- Hubble "dataset" (the workspace holds examples or other inputs): the guide asks to save and then clear rows. The card is
  outlined, never a button that discards work.
- Object X "image": the chain is Copy the coordinates, dome, Point to coordinates, field of view, tracking, exposure. Each is
  outlined when it is the missing action, except the field of view: after pointing, while it is still the finder, the camera is
  outlined and its status line says what is missing.
- Pulsars "point": Pulsar Parameters and Receiver are both always enabled, so the first action (Pulsar Parameters) is outlined.
- LSS "repeat": the first row with no record is outlined; it is a suggestion, any row may be observed.

The sequence (`GuideCompanion.tsx` `show`):

1. The shell's `companion.go` (`src/OpenVireo.tsx`) goes to the step's page (`src/components/guideCompanionRoute.ts`
   `companionPlace`, the guide's own destinations). It does not navigate when that page is already shown (navigating stops a
   slew and cancels a running save) nor for a step whose control is Save investigation, which is in the page bar of every
   page. It only navigates; the card or section around the control is opened in step 3. One step differs from its guide's
   button: Object X "Image it again later" goes to the Object X page, where its first action is (a later time and Set the
   observatory clock), while the guide's button returns to the observatory, where the second image is taken.
2. `waitForGuideTarget` waits up to 4 s for the control (a page that is still loading), preferring an enabled control for the
   first 1.5 s (a list that is still loading keeps its first control disabled for a moment).
3. One turn later, after the shown page has focused its own heading, the control is scrolled to the middle of the window,
   focused and outlined. The outline follows the control and goes at the student's next press or key, when the step changes, or
   after 6 s.
4. While the outline is shown the control keeps both: a page whose module finishes loading late focuses its own heading (and
   scrolls to it), which would leave the control under the strip, so a heading that takes the focus gives it back. If a
   disabled control had to be outlined (a list that loaded slowly) and the page then enables the step's control, the outline
   and the focus move to it. Both stop as soon as the student presses, types or scrolls.
5. If no control is on the page, the strip says so ("That control is not on screen yet…") and outlines nothing.

If the page itself moves the guide on while step 2 is still waiting (the classification page loads its first practice when it
is shown) and the student has pressed nothing since, the search starts again for the new step, so a request is never dropped
without an outline or a note. If the page disables or removes the focused control after step 3 and the step changes, the focus
would be nowhere; it returns to the strip. A focus that has landed anywhere else in between is left alone.

**Full guide** shows the guide's window scrolled to its current step (`li[data-next]`). **Hide** moves the focus to the heading
of the page shown before the strip goes. Escape closes Step details.

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
- z-index 14: above page content, under the page bar (whose Help and More menus can reach the bottom of a short window and
  must stay above the strip), the sidebar, the popup windows and every modal backdrop. It is `inert`
  while a host-level modal is open or the investigation is busy, hidden while a guide's own window is open, and not printed.
- The outline is an `outline` (visible in forced colours) with `pointer-events:none`.
- The strip is memoised on its progress data; with no guide in use nothing is rendered (render budget unchanged).

## Tests

- `src/core/guideCompanion.test.ts`: the current step of the seven guides, their skip rules and marks that go back.
- `src/help/spot.test.ts`: which candidate is outlined.
- `src/help/guideTargets.test.ts`: every step has a target, every selector exists in the source and is on the page its step
  goes to, the steps whose page differs from the guide's button, and the strings' rules in every language.
- `tests/guide-companion.spec.ts`: the strip's life (appears, follows the work, the four actions, Escape, Hide and where the
  focus goes), the first step of every guide with Show me where, steps in the middle of the LSS, cluster and pulsar exercises, a
  missing control, the page bar's menus over the strip, layout at 1280, 800 and 375 px, print, inert, Spanish and right to left.
- `tests/hubble-guide.spec.ts`: Show me where in the middle of the Hubble exercise (the galaxy selector once a galaxy is
  archived; the recipe selector inside the closed Hubble card; Add saved measurements while there are no rows).
- The cycles: `core/objectXLab.test.ts`, `core/pleiadesLab.test.ts` and `core/guideCompanion.test.ts` (the rules), and Show me
  where inside the whole-exercise walks `tests/lss-guide.spec.ts` (second galaxy), `tests/pleiades-exercise.spec.ts` (second
  star) and `tests/object-x-path.spec.ts` (both images).
- `tests/fixtures/companion-audit.ts` is a harness, not a test: run any whole-exercise walk with its `test` and it writes, at
  every change, the strip's step, key and page and the control Show me where would outline. It is how the seven guides were
  audited; the traces are read by a person.

## Review

An independent Opus reviewer read the front's code on 2026-11-23 (approve after fixes). Fixed: Object X "repeat" went to the
observatory while its control is on the Object X page (M1; the page-of-step test now fails on such a table); the Hubble
workspace steps called the page's own `openHubble`, which could take the focus and the scroll after Show me where (M2: the
shell now only navigates); Hubble "inputs" with no rows outlined the recipe already chosen (M3); the page bar's menus were
drawn under the strip (m1); outlines that stayed on a control already used (m2 partly, m3, m5); Full guide did not scroll to the
current step (m6); Hide left the focus nowhere (m7); a step change during the wait dropped the request silently (m8); a stale
"lost focus" mark, Escape for Step details and a dead branch. Kept, and stated above: Hubble "dataset" outlines the card (m4),
the rest of Object X "image" (m2), and Pulsars "point". "Step n of m" stays outside the live region: only the step's line is
announced when it changes. Mid-exercise Show me where is tested for Hubble, LSS, the cluster HR and pulsars; Object X's later
steps (which need two exposures) are covered by the page-of-step test only. The coordinator's own screenshots then showed, once
in three runs on a phone-sized window, the page's heading focus arriving after the control's and leaving the control under the
strip, or a disabled control outlined beside the enabled one; step 4 of Show me where closes both and the strip's life test
forces the first.

### Audit of the seven guides (2026-11-23)

Asked to test every guide, the coordinator ran each whole-exercise walk with `tests/fixtures/companion-audit.ts` and read the
traces. The steps of the seven guides advance as their texts say; the classification, cluster HR and pulsar guides and the
Hubble guide (after its one-galaxy rule) needed nothing. Three steps were wrong in the same way (see "A step that is a
cycle"): Show me where pointed at the first control of the LSS "repeat", Object X "repeat" and Pleiades "sample" steps every
time, also after it had been used; Object X "image" offered Start exposure while the telescope pointed elsewhere, and the date
again after the later time was set; and the Pleiades strip showed no count during its 24 stars. An independent Opus reviewer
then read the fix (approve after minor fixes, all applied): coordinates typed by hand did not count as entered (an exact match
was asked); with the target already revealed Point to coordinates could no longer be outlined (`image-any`); the later-clock
rule became a pure, tested function. Known and left: the LSS marker follows the row list's own rule (same field and row), so a
galaxy recorded from another field or as a free spectrum is treated as in hand; a later time set in the observatory's own clock
dialog is covered by the rule's unit test and by reading, not by a walk.

The same day the first merge's CI failed in one script walk (E01 under qps-rtl): the new test id of the galaxy exposure page
renamed a known right-to-left problem, which is listed by its nearest test id (`tests/fixtures/rtlKnown.ts` `drawsOf`). The
list was updated; a marker that only Show me where reads is now an `id` (`#lss-page`), and `npm run test:scripts` is part of
this front's checks before a merge.
