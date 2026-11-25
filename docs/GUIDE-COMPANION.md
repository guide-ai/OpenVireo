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
  only strings of the strip itself are `companion` in `src/components/AppShellMessages.ts` (seventeen, in ten languages: ten of the strip and the seven of Restart
  exercise).
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

## Restart exercise

User request, 2026-11-23: "we need a button to restart the exercise". The strip has a fifth action, **Restart exercise**,
between Full guide and Hide.

- It asks first. The confirmation (`RestartConfirm` in `components/GuideCompanion.tsx`, a modal `<dialog>` in the body) says
  what happens (the site loads again and this guide opens at its first step), what is lost (everything not saved: the work of
  this exercise and of every other tool in the tab) and how to keep it (cancel and choose Save investigation, named as the page
  bar names it in that language). The focus starts on **Cancel**; Escape cancels; after either, the focus is back on the
  strip's button and nothing changed.
- **Restart** loads the site again at `labRestartHref(location.href, lab)` (`src/seo/labSlugs.ts`): the same address (path and
  query, so a `?lang=` preview stays) with the hash `#lab=<slug>`, which opens that guide's window at load exactly as a /labs/
  link does, over the page such a link opens (the observatory; the cluster database for the cluster guide), not the page the
  student was on. The address is set with `history.replaceState` (no extra history entry, and no `hashchange`, which would
  change the route of the page behind while the new one loads) and then `location.reload()`, since a change of hash alone
  does not load the page. Once Restart is pressed both answers are disabled.
- Why a reload and not a reset of the exercise's state: an exercise's work is spread over many tools (the observatory, the
  instruments, the analysers, the results editors, the clock) whose state the site holds in memory, and each guide reads
  several of them. A fresh load is the one state every tool is known to start from; clearing them one by one would be a new
  rule per tool that could leave an exercise half reset. The cost is that the other tools in the tab start again too, which
  the confirmation says.
- What a reload keeps is what the site already keeps in the browser (the list checked for the language dialog,
  `LanguageChoiceMessages.ts`): the language, "View VIREO's own texts in English", the theme, the open sidebar sections, the
  tour-seen mark, the ? help key, Demonstration Mode if the instructor chose to remember it, and the confirmed Observation
  results notebook with its deletion-recovery copy (a results editor's, read by no guide's progress). Instructor mode without
  Demonstration Mode, and the instructor's options, go back to their defaults. So the confirmation's "everything you have not
  saved is lost" errs on the safe side. Nothing new is stored, and no file is written.
- An independent review (Opus, high effort, 2026-11-23: approve after small fixes) found no stored state that brings a guide's
  progress back and no first-load window in front of the guide, and three low defects, all fixed: `location.replace` fired the
  app's `hashchange` handler before the reload; the focus did not return to the button after a mouse click where the browser
  does not focus buttons on click (Safari, Firefox on macOS; the tests run Chromium, so this one is by reading); and Escape
  in the confirmation also closed Step details (React delivers a portal's keys to the strip). It also changed five strings
  (Hindi «खो जाएगा» as the language dialog says, Russian «перезагрузится», Indonesian «semua alat lain», and the two Chinese
  "what happens" sentences). Not done, by choice: a Save investigation button inside the confirmation, as the language
  dialog has (the confirmation points to the page bar's button instead).
- It grades nothing and shows no answer: the restarted guide is the same guide at its first step.

## First look

Front NEWCOMER, sub-front NC1 (user decision, 2026-11-24; plan `analysis/front-plans/front-newcomer.md` §2.1). A first-time
visitor is walked through the observatory in four steps by the same strip, as an eighth guide, `'first-look'`
(`CompanionGuide = LabSlug | 'first-look'` in `src/core/guideCompanion.ts`). It has no window and starts no exercise, so the strip
shows no Full guide and no Restart exercise for it.

- **Where it starts.** «Guide me (about 3 min)», a compact link-style button in the observatory heading, just above its
  three-step band, on the line of "What works in this version ↗" (shown while the first look is not in use), and Help › «Take a
  first look», beside the tour (also on the light welcome shell, as the `first-look` intent of `src/home/appGate.ts`), and since
  NC2 the tour's last step, «Take a first look (about 3 min)» (below, "The tour's last step"). The plan put
  it under the band; there, and later on a row of its own, it pushed the dome cover's Open dome off the first screen of a phone
  and of a 1440 × 780 laptop in the longer languages. Now it adds no height: from 1300 px it sits beside the subtitle at the
  heading's bottom end, from 1051 px under "What works…" at the heading's top end beside the title, and below that on the same
  line as "What works…", the two wrapping to two lines only when they do not fit; on a phone (≤ 520 px) the heading's eyebrow is
  then visually hidden as its subtitle already was (both stay for assistive technology), which pays for that wrap.
  `tests/first-look.spec.ts` guards Open dome on the first screen at 375 × 700 in seven languages (375 × 667 and 390 × 664 failed in CI, whose fonts are wider) and the
  heading's height at 1280 × 720; `tests/launch-landing.spec.ts` keeps its 1440 × 780 and 375 × 700 guards. Every opener calls the
  shell's `companion.firstLook`: the observatory, the strip, and `guideOpened`, so the first-visit tour does not start over it
  (its timer checks it again when it fires). On the observatory the focus then goes to the strip's Show me where (the pressed
  button goes away, or the Help menu closes); from another page the observatory's heading takes it. Opening a lab guide replaces
  it in the strip, and starting it replaces a lab guide.
- **Its steps** (`src/core/firstLook.ts`, pure, no rule of its own beyond reading the observatory's state):

  | step | done when | Show me where |
  |---|---|---|
  | `dome` | the dome is open | Open dome |
  | `point` | the dome is open and the selected object is pointed at and centred (the band's step 2) | Point telescope once M82 is the selected object (`#point-target[data-first-look]`, a marker the button carries only then), else the picker (`#target`) |
  | `look` | the reference card shows the centred object through the telescope view (`canAccess`) | Switch to telescope view (`#to-telescope`) |
  | `spectrum` | a library spectrum was shown in the analyser since the first look started (a one-way flag of the tab) | Open spectrum analyzer (`#open-analyzer`), outlined while it is still disabled and loading; for an object without a library spectrum (`spectrumAvailable` false: none, or masked by an unrevealed Object X target), the key `spectrum-choose`: the picker |
  | closing | the spectrum step is done | the welcome's lab list (`#home-labs`, `tabIndex=-1`) |

  The current step is the first one not done, so marks go back with the state (closing the dome takes it back to `dome`), except
  the last: once a library spectrum has been shown the first look stays done, whatever is pointed at next. The observatory band
  reads the same rule for its current item (`observatoryBandStep`). The flag is cleared when the first look starts and set only
  while it is in use; nothing is stored, and a reload starts without it.
- **Only `point` names M82**, the one suggested galaxy with both an original library image and an original library spectrum
  (`FIRST_LOOK_TARGET_ID`, NGC 3034, 0.6° from the preselected M81, the path `tests/observatory.spec.ts` already walks). No step
  requires it: M81 completes `look` (its photograph) and then waits on `spectrum`, where Show me where points at the picker and
  Step details says that M82 has one. M82 is 13.6° from the nearest Object X target in ObjectX.HTL, far outside every masking radius (0.375° fields,
  2° name mask), so the picker never hides it.
- **Library material, said so.** What the visitor sees is VIREO's original library photograph and spectrum of the object: the
  reference card says these are "not new exposures taken in OpenVireo", the analyser that the spectrum is "not a spectrum
  acquired by the web telescope", and the last step's Step details that it is "VIREO's original library spectrum, not a new
  observation". No acquisition, spectrum, value or answer is added.
- **Markers are `id`s** (`point-target`, `to-telescope`, `open-analyzer`, `main-help-first-look`), never `data-testid`s: the
  script walks name known layout problems by the nearest data-testid (`tests/fixtures/rtlKnown.ts`).
- **Strings:** nine, `firstLook` in `src/components/AppShellMessages.ts` (map `appShell`), in ten languages; Step details of
  `dome`, `point` and `look` are the band's own `sky.step1Help..3Help`, and of the closing line `home.labsHint`.
- **Tests:** `src/core/firstLook.test.ts` (state → step, marks back, the one-way flag, an object without a spectrum and the
  `spectrum-choose` key, the band, the companion's step counter); `src/help/guideTargets.test.ts` (its targets exist and are on the observatory, the closing line on the
  welcome, the nine strings in every language); `tests/first-look.spec.ts` (from the band, the four steps with only Show me where
  and the page to M82's library photograph and spectrum, done stays done, the closing line's Show me where on the lab list, Hide;
  M81's spectrum step on the picker, closing the dome, a lab guide replacing it, Help › Take a first look from another page and
  from the welcome shell; the focus in the strip after Guide me by keyboard and after Help on the observatory; Show me where while
  M82's spectrum is held back 3 s, outlining Open spectrum analyzer until it is enabled; a scroll of the page not pulled back while
  the lab-list heading is outlined (the strip no longer treats an outlined heading as a heading that took the focus away); the
  first-screen guards; Spanish at 375 px; right to left).

## The tour's last step

Front NEWCOMER, sub-front NC2 (user decision, 2026-11-24; plan §2.2). The first-visit tour (`src/help/tour.ts`,
`src/components/SiteTour.tsx`) has four steps instead of six: welcome, save your work, Help (their texts unchanged) and a new last
step, «How would you like to start?». The sections, guides and observatory steps are gone, and with the observatory step
LAUNCH-1's "Show tracking control" in the tour (the observatory's own tracking shortcuts stay).

- **The question.** «Take a three-minute first look at the sky, or choose one of the seven labs; each lab has a guide that stays
  with you. Every page is in the menu; on a phone it is behind the Menu button.» The phone clause of the old sections step is
  kept and names the phone button as it reads («Menu», `appShell.toolsMenu`; the old text said "Tools", plan F10);
  `src/help/tour.test.ts` checks in all ten languages that the text contains that language's `toolsMenu`. The step outlines the
  sidebar's Exercise guides section, or on a phone (where the section is behind the closed menu) the Menu button.
- **Two choices and a plain close.** «Take a first look (about 3 min)» (primary) ends the tour and calls `companion.firstLook`,
  exactly as Guide me and Help › Take a first look do: on the observatory the focus goes to the strip's Show me where; from the
  welcome the observatory's heading takes it. «Choose a lab» (secondary) ends the tour, goes to the welcome if needed
  (`companion.chooseLab`), scrolls to its lab list and puts the focus on the list's heading (`#home-labs`, `tabIndex=-1`, named by
  «The seven labs»). «Start exploring» stays as the last step's close, now a link-style button under the two choices, and
  gives the focus back to Help as before. There is no Skip on the last step (as before); Back, Escape and Skip on the earlier
  steps work as before. Each way out marks the tour seen (the existing `openvireo.tour.v1`; nothing new is stored), and Help ›
  Take the tour takes it again.
- **Keyboard order on the last card:** the card (focused on arrival), Take a first look, Choose a lab, Back, Start exploring.
- **Layout.** Below 600 px the two choices are full-width buttons one under the other (long languages wrap inside the button,
  never past the card); from 600 px up the last step's card is wider (`min(30rem, 100vw − 24px)`) and the choices sit side by
  side when they fit. They are above the Back / Start exploring row. Every card scrolls inside when the screen is too short
  (`max-height: 100dvh − 24px`). Placement is `placeTourCard`'s, so it mirrors under a right-to-left page
  (`tests/scripts/rtl-css.scripts.ts` checks the card left of the sidebar's outline on this step).
- **Markers are `id`s** (`site-tour-first-look`, `site-tour-choose-lab`), never `data-testid`s (`tests/fixtures/rtlKnown.ts`).
- **Choose a lab's focus** uses the shell's focus-counter pattern (`labListFocus`, an effect declared after the route heading's
  focus, like `trackingFocus`), so the lab-list heading wins over the welcome's h1 on a route change.
- **Tests:** `src/help/tour.test.ts` (the four steps, the last one's targets, the ten languages); `tests/onboarding.spec.ts` (Step
  1 of 4, every outline, the question and its two named buttons, the tab order, Take a first look → the strip on Open the dome
  with Show me where focused, Choose a lab by keyboard → the lab list focused and on screen, the phone card and its Menu outline,
  Choose a lab at 375 px; the card clear of the outline at 1024 × 768 in English and Russian and at 800 × 768 and 800 × 600 in
  English; Start exploring reachable at 568 × 320; Escape on the last step; Take a first look from the welcome);
  `tests/home.spec.ts` (Choose a lab from the welcome itself); `tests/i18n/shell.spec.ts` (the last step's texts in every
  language).
- **Review (2026-11-24, independent, high effort): approve after fixes**, all applied in "Front NEWCOMER NC2 review":
  S1, on 600–1099 px screens of medium height the taller last card fell back to the bottom and covered the outlined Exercise
  guides section (Russian 1024 × 768 by 55 px), fixed by the wider card with side-by-side choices; S2, on a phone held sideways
  (568 × 320) Back and Start exploring were off screen, fixed by the card's own scrolling; N1, Choose a lab's `setTimeout`
  replaced by `labListFocus`; N2, home.spec's list of the tour's parts; N4, an unused class and a doubled comment; N5, the
  Russian no-break space in docs/I18N.md; N7, tests for Escape on the last step and Take a first look from the welcome; and the
  help topic's stale "Tools button" (now "Menu button", with the nine glossary rows renamed, so the glossary lint also checks
  the tour's start text). The nine translations were found fine.
- **CI fixes folded into the same round (from NC1, main run 45521682534):** `tests/clea-help.spec.ts` now expects Take a first
  look in the Help menu between Take the tour of the site and Websites; `tests/first-look.spec.ts` guards Open dome on the first
  screen at 375 × 700 (as `tests/launch-landing.spec.ts` does) instead of 375 × 667 and 390 × 664, where CI's wider Ubuntu fonts
  left it half on screen in Spanish, Portuguese and French.

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
  goes to, the steps whose page differs from the guide's button, and the strings' rules in every language (Restart exercise:
  every string present and translated, the confirmation names that language's Save investigation, and the confirming answer
  uses the button's own words).
- `tests/guide-companion.spec.ts`: the strip's life (appears, follows the work, its actions, Escape, Hide and where the
  focus goes), the first step of every guide with Show me where, steps in the middle of the LSS, cluster and pulsar exercises, a
  missing control, the page bar's menus over the strip, layout at 1280, 800 and 375 px, print, inert, Spanish and right to left.
  Restart exercise: Cancel and Escape keep the work and return the focus, Escape leaves Step details open, the keyboard opens
  it, Restart is a fresh load (a mark set on the window is gone, and the tab's history has no new entry) with the guide's
  window open, no step done and the survey page empty; and it keeps a `?lang=` preview.
- `src/seo/pages.test.ts`: the restart address (`labRestartHref`) for every lab, read back by `labFromHash`.
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
