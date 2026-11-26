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

Front NEWCOMER (2026-11-24) adds an eighth guide without a window, the first look ("First look" below), and makes the strip's
line the step's plain title ("Plain step titles and More detail"); `docs/NEWCOMER.md` maps that front.

## Rules it keeps

- **No rule of its own.** The current step is each guide's `next`, from the same pure progress function the guide's ticks use
  (`src/core/guideCompanion.ts` `companionNow` over `hubbleLab`, `lssLab`, `objectXLab`, `classificationLab`, `clusterLab`,
  `pulsarLab` and `pleiadesLab`). `lssLab` and `objectXLab` gained `next` for this (the first step not done, in list order). A
  mark that goes back (a save made stale, receivers closed before a capture) takes the strip back with it.
- **Nothing is stored.** The guide in use is state of the page load; a reload starts without a strip. No answer, expected value
  or grade appears in the strip that the guide does not show; Object X's identity stays hidden as in its guide.
- **One text, two places.** The strip's line is the current step's plain title, as the guide's window shows it (Front
  NEWCOMER NC3, "Plain step titles and More detail" below; before NC3 it was the guide's "Next:" line), and Step details is the
  guide's "Next:" line followed by the guide's own step body. Each guide exports them
  (`hubbleItemTitle`/`hubbleNextText`/`hubbleItemBody`, `lssStepHelp`, `pulsarStepTitle`/`pulsarNextText`/`pulsarStepBody`,
  `pleiadesStepTitle`/`pleiadesStepBody`, `classificationStepTitle`/`classificationStepBody`, `ClusterLabGuideText.tsx`) and
  `src/components/guideCompanionContent.tsx` puts them together. The
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
   scrolls to it), which would leave the control under the strip, so a heading that takes the focus gives it back. If a disabled
   control had to be outlined (a list that loaded slowly) and the page then enables the step's control, the outline and the
   focus move to it. If the focus is on the page's body (nowhere) while the outlined control is enabled, for example after the
   page disabled it for a moment without the step changing (the classification page's practice select while its spectra load),
   the control takes the focus back. That check runs every 250 ms while the outline is held, at most 6 s; if the outline goes
   while the control is still disabled and the focus is nowhere (spectra that load slowly), the return stays pending until the
   page enables the control (at most 60 s, `FOCUS_RETURN_MS`). All of this stops as soon as the student presses, types or
   scrolls, at a new step or Show me where, and the pending return also stops when the focus lands anywhere.
5. If no control is on the page, the strip says so ("That control is not on screen yet…") and outlines nothing.

If the page itself moves the guide on while step 2 is still waiting (a page that finishes loading after it is shown; the
classification page's preselected practice no longer does this since 2026-11-25, as its Choose step waits for the visitor's own
choice or act on that practice) and the student has pressed nothing since, the search starts again for the new step, so a
request is never dropped without an outline or a note. If the page disables or removes the focused control after step 3 and the
step changes, the focus would be nowhere; it returns to the strip. A focus that has landed anywhere else in between is left
alone.

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
- **CI fix after NC4 (main run 45592548133):** at 800 × 600 the last card fit neither below nor above the Exercise guides
  section (the menu at the top of the page left 271 px above it and 199 px below, for a card 286 px tall) and fell back to the
  bottom over it; the wider card of S1 was not enough there. `components/SiteTour.tsx` now scrolls the part to the top of the
  window, from 600 px up, whenever the card would otherwise fall back to the bottom, so it fits below the part
  (`tests/onboarding.spec.ts` 800 × 600). On phones the card still docks at the bottom by design.

## Plain step titles and More detail

Front NEWCOMER NC3 (user decision, 2026-11-24, recorded in AGENTS.md; plan analysis/front-plans/front-newcomer.md §2.3, review
M2, M5, M7 and m7):

- **Each step of the seven guide windows shows its title, its status and its button**, and folds the rest of what the guide says
  under the step (body text, formulas, warnings) into a `<details class="lab-step-more">` «More detail» (`src/guideMoreDetail.tsx`
  `moreDetail` and `stepTitle`, plain functions: the windows render closed on every load and the render budget is unchanged).
  The current step's More detail is open (`open={step===next}`), the others closed; Hubble's item 4, Save your work, which has
  no mark, opens with item 5, Interpret (`next==='interpret'`), so its CSV and backup advice shows when the exercise ends.
  Nothing is deleted, only reordered (the button now comes before the folded text). The summary's visible text is «More detail», and its name adds the step's title
  (`aria-labelledby="<id>-more <id>-title"`, «More detail Measure the period»), so the 50 summaries are told apart; the status
  beside the title stays out of that name. One new tab stop per step.
- **The top of each window:** the classification guide's adaptation note joins the existing Research notes (Hubble, LSS,
  cluster and Pleiades already kept theirs there). The pulsar guide's backup note (how Save investigation and Restore work)
  moves from the progress block into the body of its step Save the investigation (folded with it; review N1a). The Pleiades
  guide's E05 note stays in the progress block, visible, beside the Data from Observations button it explains (review N1b).
  The intro paragraphs stayed visible (the dialogs' `aria-describedby` pointed at them) until NC4 put the why-line in their
  place ("Why it matters, and what next" below).
- **Twelve titles were rewritten** in plain words (same keys, ten languages; docs/I18N.md "Plain step titles"): Hubble's five
  items, cluster HR trial and report, pulsars' delay, Pleiades measure, color and sample, and Object X's measure step.
- **The strip's line is the step's title** in all seven guides (`companionContent`). The classification guide's «n · » number is
  left out in the strip only (`withoutStepNumber` in `src/core/guideCompanion.ts`, tested on the ten catalogs), since the strip
  says «Step n of m»; the window keeps it. Step details opens with the guide's "Next:" line, then the step's body. Kept as the
  line: the three warning states (Hubble `dataset`, `lab.next.dataset`; pulsars `setup` with Tracking off,
  `pulsarLab.next.tracking`; Pleiades `sample`, `pleiadesLab.next.sample`, which says that only the 0.4m telescope reaches every
  admitted star, review N2) and every closing state (Hubble `lab.next.interpretSupported`, `pulsarLab.next.save`,
  `pleiadesLab.next.save`, `classLab.next.save`; LSS, Object X and cluster `companion.allDone`). This replaces the strip's
  "Next:" line of the GUIDE-COMPANION record.
- **Print:** a guide window printed while it is open prints as the whole document, every step unfolded. Two parts:
  `src/help/printDetails.ts` (`installGuidePrintDetails`, installed once by the shell) opens every closed `<details>` of an open
  guide window on `beforeprint` (More detail, Research notes, the progress disclosure, Troubleshooting, Sources) and closes
  exactly those again on `afterprint`; and an `@media print` rule in `src/hubble-lab.css` (review S1) hides the page behind the
  window (every element that is not the window, inside it or an ancestor of it; the cluster guide sits inside `<main>`) and
  takes away the window's screen height limit, scrolling, border and backdrop, so its content flows over as many pages as it
  needs (before the rule, Chromium printed the top of the scrolling window on every page). A page printed with no guide window
  open is unchanged. The strip itself is not printed, so its Step details need nothing. Checked by eye in the PDFs of all seven
  guides (Chromium).
- **Tests:** `src/guideMoreDetail.test.ts` (server render of each window: one More detail per step, open only on the current
  step, title, status and button outside it, the summary's name; every body test id still rendered; the strip's line per guide
  and state; Step details starting with the "Next:" line; `withoutStepNumber` on ten catalogs; the print helper);
  `tests/guide-companion.spec.ts` (the line is the title; Step details start with the "Next:" line; print of an open guide window
  opens and restores its details, and under print media after `beforeprint` neither the window nor an ancestor clips it, folded passages
  of the last pulsar steps, the Hubble Save your work item and the cluster guide's last step and limits are rendered, and the page
  behind is not; a first version read the text out of `page.pdf()`, which CI's fonts defeated); the walks open every More detail before their checks through
  `tests/fixtures/moreDetail.ts` `openAllMoreDetail`. The print test runs in Chromium (`page.pdf()` fires both events) and passed
  with `--browser=firefox` (the two events dispatched); WebKit could not start on the implementer's machine (missing system
  libraries). A summary named by its step's title is also found by `getByLabel(<title>)`: `tests/object-x-path.spec.ts` and
  `tests/object-x-spectrum.spec.ts` now look for the Object X answer box («Describe your evidence», also a step title) inside
  the Object X page.

## Why it matters, and what next

Front NEWCOMER NC4 (user decision, 2026-11-24, recorded in AGENTS.md; plan analysis/front-plans/front-newcomer.md §2.4, review
M1 and m7, answer Q14):

- **Each of the seven guide windows opens with a why-line** (`whyLead` in `src/guideLead.tsx`): the question the visitor will
  answer, then what they will do, in at most 60 English words, for example «How far away is the Pleiades cluster? You will work
  it out from your own measurements of its stars’ brightness and color.» It never states the lab's result, not even
  qualitatively (Q14 «no»), names no number and says nothing about Object X's identity. Keys `lab.why`, `lssLab.why`,
  `classLab.why`, `pleiadesLab.why`, `clusterLab.why`, `pulsarLab.why` and the Object X map's `why`. The why-line is the dialog's
  description (`aria-describedby="<guide>-why"`; the id moved from the intro, review m7). The former intro paragraph is the first
  research note (Research notes, which the pulsar and Object X windows gain), before the Options and adaptation notes. NC6 adds
  the time and level line under the why-line and NC5 the version choice; neither is in NC4.
- **The Hubble and LSS home cards** were reworded the same way (Q14): «Measure how fast galaxies are moving and how far away
  they are, then compare the two.» and «Measure the redshifts of many galaxies across a strip of sky and map where they lie.»
  (they said «…then work out how fast the universe expands» and «…map the cosmic web», plan F11). `homeBoot` mirrors them.
- **What next** (`whatNext` in `src/guideLead.tsx`), once the guide's counted steps are all done (the same closing states as
  `companionNow(...).allDone`: Hubble `interpret`, LSS and Object X `done`, classification, pulsars and Pleiades `save`, cluster
  `preserve`): a labelled region «What next» with a recap made only of the guide's own counts line, «A lab to try next: {lab}.»
  (the lab's name as on its home card, after a colon so every language keeps it in the nominative) and «Open its guide». The
  next lab comes from `src/home/labNext.ts` (`LAB_NEXT`, pure): Hubble → large-scale structure → Hubble, classification →
  Pleiades → cluster HR (which can use the visitor's own Pleiades pairs) → pulsars → Object X → Hubble. The button closes the
  window and calls the shell's `companion.next`, the lab's own opener (`openGuide[lab]`, as its Guides menu button), so the new
  window opens with the focus on its close button and the strip follows the new guide. In the window it sits right after the
  step list (Hubble before Targets, progress and original V references, classification and Pleiades before Troubleshooting,
  pulsars before Three kinds of data, cluster after Keep your work, LSS after its questions, Object X before Return). The strip's Step details end
  with the same section in the closing state, without the recap (its counts are already in the strip). Its button first moves the
  focus to the strip's Step details button and closes Step details (review N4), so the new window gives the focus back there. One new tab stop. It
  shows no answer, expected value or grade and stores nothing. The counts line is computed once per window (`counts`) for the
  progress block and the recap, so five `*_STEPS.length` receipts of `src/i18n/vireo-literals.json` left the JSX and were removed;
  `src/i18n/coverage.test.ts` counts `src/guideLead.tsx` (152 files).
- **Tests:** `src/guideLead.test.ts`: every why-line in ten languages is a question («?» or «？»), has no digit of any script and
  none of its guide's result words in that language (curated from what the guide's reflect, interpret and outcome texts lead
  to: Hubble expansion, faster, proportional, linear, slope; LSS walls, voids, filaments, crowding, evenly, the cosmic web;
  classification temperature, hotter, cooler; Pleiades and cluster light-years, parsecs, young, old, turnoff, millions; pulsars
  neutron, electron, gas, spin, dispersion, plasma, interstellar; Object X the language's five kind names from
  `OBJECT_X_LAB.kinds`), with a self-check that the old home summaries and textbook answers are caught; the Hubble and LSS home
  cards against the same lists; `LAB_NEXT` (every lab suggests another lab; Stellar classification, the Start-here lab, is suggested by none, on purpose); each window's why-line as description, the former
  intro as the first research note and What next only in the closing state. Review N3 widened the lists (growth: increasing,
  growing, farther, more quickly; clumping: clumps, clusters, sheets, empty regions, uneven) and lets an entry starting with `*`
  match inside a word, so negated forms (unevenly, «неравномерно», «inégalement», «असमान») are caught. `tests/classification-guide.spec.ts`: a finished
  classification shows What next in the strip's Step details and in the window, and each button opens the Pleiades window,
  described by its why-line.

## Quick versions of the two long labs

Front NEWCOMER NC5 (user decision, 2026-11-24, recorded in AGENTS.md; plan analysis/front-plans/front-newcomer.md §2.5, review M3,
answer Q5):

- **Hubble's law and Pleiades photometry offer a quick version** beside the full one: any 3 different supported galaxies, any 8
  admitted stars, the visitor's choice. It is a web suggestion, a part of the original exercise; the full version is the original
  (13 galaxies, 24 stars). Quick opens by default (Q5). LSS keeps its 5-galaxy suggestion; the other labs have none.
- **The choice is tab state** (`labVersions` in the shell, `src/core/labVersion.ts`), like the guide in use: nothing is stored, no
  file changes, and a reload or Restart exercise starts with the default again. A Restore (the page bar's or the analyser's)
  keeps the tab's version: review N2 departs here from plan §2.5, which reset it, because a reset made a restored full
  investigation read «You finished the quick version».
- **The progress functions take a goal** with the full version as default, so every other caller keeps its behaviour:
  `hubbleLabProgress(archive,measurements,workspace,goal)` (passed by the shell to `SpectrumInstrument` as `labGoal`) and
  `pleiadesLabProgress({…,goal})`. Hubble: an archived unmeasured galaxy is still measured first; `acquire` lasts while fewer than
  `goal` galaxies are archived; `dataset` and `recipe` are unchanged; `inputs` lasts until at least `goal` distinct acquired
  targets are complete rows, every row is complete (an extra incomplete row still blocks) and the fit has a value; then
  `interpret`. Pleiades: the sample step is done at `goal` confirmed B−V. Both progress objects carry `goal`; Hubble keeps `total`
  (13 supported) for its coverage line.
- **"Done" in the quick version** is the guide's closing state, as in the full one (Hubble `interpret`, Pleiades `save`, so the
  Pleiades distance fit still follows the 8 stars): What next appears there, and under the version choice the window says «You
  finished the quick version. Continue with the full exercise for the whole list.» with **Continue with the full exercise**, which
  chooses Full and leaves the focus on its radio button; the guide and the strip then go back to the next unfinished step.
- **Counts are never clamped** and show the version's goal beside them: «Complete Hubble targets: 4 (goal 3)», «Admitted stars with
  your own confirmed B−V: 9 (goal 8)». Nine strings became goal-neutral once instead of quick copies (`lab.counts`,
  `lab.next.acquire`, `lab.next.measure`, `lab.next.interpretSupported` with `{count}`, `lab.recipeHelp`, `pleiadesLab.coverage`,
  `pleiadesLab.status.sample`, `pleiadesLab.next.sample`, `pleiadesLab.step.sample.help` with `{total}` = 24).
- **The window:** under the why-line, a native radio group (legend «Version», one tab stop, arrows between the two; a change is
  announced by the radio button's own checked state, review N3), described by the shared note; Hubble adds the tip «Galaxies
  from different groups (UM-I, CorBor, Peg, Coma, Boo) make a clearer graph.», with the group labels of the galaxy selector (N6).
  The windows take the chosen version from the shell's state (`version` prop), not from the progress, which follows it one effect
  later (review S1: the radio flicked back for a frame). (`versionChoice` in `src/guideLead.tsx`, a plain function, as the windows render closed on every
  load). **The strip** shows «Quick version» beside the lab's name while quick is chosen (`companionQuick`, read from the goal the
  progress was computed with, so it never disagrees with the counts); its counts line is the guide's, with the goal.
- **Tests:** `src/core/labVersion.test.ts` (both cores at the quick goal and the default: measure before the next acquire, the
  recipe and fit still needed, an extra incomplete row blocks, duplicates not counted, counts above the goal; `companionQuick`);
  `src/guideLead.test.ts` (the ten version strings in ten languages, with `{count}` and none of their lab's result words; both
  windows quick and full, the goal in the counts, Continue with the full exercise only once quick is done);
  `tests/hubble-guide.spec.ts` (three galaxies on the 0.4 m reach `interpret` in the quick version, then Continue with the full
  exercise moves the strip back to `acquire`); the full walks of `tests/hubble-guide.spec.ts` and `tests/pleiades-exercise.spec.ts`
  choose Full first.

## Time, level and Start here

Front NEWCOMER NC6 (user decision, 2026-11-24, recorded in AGENTS.md; plan analysis/front-plans/front-newcomer.md §2.6, review M6,
answers Q6 and Q9):

- **One table, `src/home/labFacts.ts`** (pure, no text): per lab the full exercise's rough time in minutes, the quick version's on
  Hubble and Pleiades, and a level 1–3; `START_HERE` is Stellar classification (Q6). The home cards, the guide windows and the
  static /labs/ pages render it.
- **The times are computed, not measured with visitors**, and every place that shows them says so: «Times are rough estimates
  computed from the steps, not measured with visitors.» (`home.estimateNote`, under the home cards, after each window's facts and
  on the /labs/ pages). The method, inputs and date are in the table's comment. The objects counted: Hubble 13 galaxies (quick
  3), LSS 5 galaxies (the web guide's own threshold for its repeat step, `LSS_LAB_REPEAT_RECORDS` in `src/core/lssLab.ts`, not
  an original requirement), Pleiades 24 stars (quick 8), one practice star, one cluster, one pulsar, one Object X target. The
  visitor actions of each whole-exercise walk count 30–60 s each for the set-up and the first object and 10–20 s for each
  repeated galaxy or star; the tries a visitor repeats where the walk goes straight to a choice count 30–60 s each (3–5 standard
  pairs in classification, 5–10 slider or fit trials in cluster HR; review N1); then the real-time waits
  the walks shorten (the Hubble guide's 2–3 min per galaxy exposure, also used for LSS; photometer integrations; the pulsar
  capture; Object X's CCD images and spectrum), rounded outwards to 5 min under an hour and 15 min from an hour up. NC6 departs
  from plan §2.6 in one point: the plan counts 30–60 s for every action, which gave 2–4 hours for the full Hubble list and 3–6
  for the full Pleiades list; repeated cycles count a third of that. The user or their testers will time Stellar classification
  and Hubble quick (Q15); the table is the one place to change.

  | lab | full | quick | level |
  |---|---|---|---|
  | Hubble's law | 60–120 min | 20–40 min (3 galaxies) | 2 Some background helps |
  | Large-scale structure | 25–50 min | | 2 Some background helps |
  | Stellar classification (Start here) | 10–25 min | | 1 No background needed |
  | Pleiades photometry | 60–150 min | 35–75 min (8 stars) | 2 Some background helps |
  | Cluster HR diagrams | 10–30 min | | 3 Challenging |
  | Pulsars | 20–50 min | | 3 Challenging |
  | Object X | 30–75 min | | 3 Challenging |

- **Home cards:** inside each card's button, under the summary, «About 60–120 min · Some background helps · Quick version: about
  20–40 min» (`home-lab-<slug>-facts`; each part an inline block, `lab-fact`, so a line breaks only at « · », review N5); on Stellar classification a «Start here» badge before the name (`home-lab-<slug>-start`).
  The button's `aria-describedby` lists the badge, the summary and the facts; its name stays the lab's name. No new tab stop. The
  card order stays the /labs/ order.
- **Guide windows:** under the why-line (`<prefix>-why-facts`, `whyLead` in `src/guideLead.tsx`), the same facts line and the
  note; the why-line alone stays the dialog's description. On Hubble and Pleiades the facts give both times, so the version
  choice below needs no times of its own.
- **/labs/ pages** (`src/seo/pages.ts`): each lab page has the facts line and the note under its intro, and its JSON-LD
  `LearningResource` carries `timeRequired`, the full version's upper bound as an ISO 8601 duration (`PT2H`, `PT1H15M`, `PT20M`);
  the school levels (`educationalLevel`) are gone (Q9: the audience is the general public). The labs index and each language's
  home page show the facts on every card, Start here on one, and the note under the list. The English pre-render (`homeBoot`)
  mirrors the facts and the note from `en.json`.
- Nothing is stored and no file changes; no answer, expected value or grade is shown.
- **Tests:** `src/home/labFacts.test.ts` (every lab, low < high, outward rounding, quick below full and for the cores' goals,
  levels 1–3, the settled levels and full times, Start here on the shortest level-1 lab, ISO durations); `src/guideLead.test.ts` (each window's facts line after the
  why-line); `src/seo/pages.test.ts` and `src/seo/languages.test.ts` (facts and note on every page in every language,
  `timeRequired`, no `educationalLevel`, one Start here on the index, the pre-render); `tests/home.spec.ts` (each card's
  accessible description: badge, summary, facts; one badge; the note; each window's facts line).

## Words used in the guides

Front NEWCOMER NC7 (user decision, 2026-11-24, recorded in AGENTS.md: «sixteen technical terms show a one-line textbook
definition»; plan analysis/front-plans/front-newcomer.md §2.7, review M4, Q11 and Q12):

- **Sixteen terms** (`TERM_IDS` in `src/help/glossary.tsx`): reddening E(B−V), colour index B−V, distance modulus m−M, HR
  diagram, ZAMS, main sequence, isochrone, metallicity, dispersion measure DM, pulsar, the Ca II K and H lines and G band (one
  entry), absorption line, redshift, spectrum, photometer and magnitude. Each definition (`term.<id>`) is one line, textbook
  neutral, with no digit and no lab's result: no expansion, temperature sequence, distance, age, neutron star or electrons, and
  nothing that helps guess Object X. `src/guideLead.test.ts` checks every language's definitions against the result lists of the
  guides whose windows mark the term (the HR diagram, which no window marks, against all of them); only the dispersion measure
  may name its own «dispersion».

  | term | English definition |
  |---|---|
  | redshift | Redshift (z): a shift of the lines in an object’s spectrum toward longer, redder wavelengths. |
  | spectrum | Spectrum: the light of an object spread out by wavelength, from violet to red. |
  | absorptionLine | Absorption line: a narrow dark line in a spectrum, where less light arrives at one wavelength. |
  | caHK | Ca II K and H lines and G band: dark features in the violet part of a spectrum, made by ionized calcium (K and H) and by CH molecules (G band). |
  | magnitude | Magnitude: a measure of brightness on a scale where a smaller number means brighter; apparent magnitude (m) is how bright an object looks, absolute magnitude (M) how bright it would look from a standard distance. |
  | colorIndex | Color index (B−V): a star’s magnitude through a blue (B) filter minus its magnitude through a visual (V) filter; it measures the star’s color. |
  | photometer | Photometer: an instrument that measures how much light arrives from a source through a chosen filter. |
  | hrDiagram | HR diagram (color–magnitude diagram): a graph of stars’ magnitudes against their color index. |
  | mainSequence | Main sequence: the band in an HR diagram where most stars lie. |
  | zams | ZAMS (zero-age main sequence): a model curve showing where stars lie in an HR diagram when they begin to burn hydrogen in their cores. |
  | isochrone | Isochrone: a model curve showing where stars of one age and composition lie in an HR diagram. |
  | reddening | Reddening E(B−V): how much dust between a star and us makes its color index B−V larger than it would otherwise be. |
  | distanceModulus | Distance modulus (m−M): the difference between an object’s apparent magnitude m and its absolute magnitude M. |
  | metallicity | Metallicity: the share of a star’s material made of elements heavier than helium. |
  | pulsar | Pulsar: a radio source whose signal arrives as short pulses at a very regular interval. |
  | dispersionMeasure | Dispersion measure (DM): a number, in pc/cm³, that sets how much later a pulsar’s pulses arrive at lower radio frequencies than at higher ones. |

  The pulsar and dispersion measure lines are deliberately not the textbook's usual «rotating neutron star» and «free electrons
  along the line of sight»: those are what the pulsar guide's why-line asks the visitor to find. The later arrival at lower
  frequencies is what the guide's own delay step already says.
- **Where:** a guide window's why-line and the text of its steps (the folded More detail), and the companion strip's Step details,
  which show the same step text. Not the strip's line (a live region holds no buttons), not the formulas (they stay plain text),
  not the step titles, the instruments or files. A term is marked at its first occurrence in each step (and in the why-line).
- **No guide string changes.** Which words are marked comes from a reviewed snapshot per language (`src/i18n/terms.en.json`,
  `src/i18n/<dir>/terms.json`: catalog key, or Object X guide map path, → [term, matched text, occurrence]), carried in the
  language's core module. `src/help/glossary.test.ts` regenerates it from each language's patterns
  (`src/help/glossaryPatterns.ts`, seeded from the lint glossaries' stems) and fails when the committed one differs;
  `npm run i18n:terms` (or `OPENVIREO_REFRESH_PINS=1 npx vitest run src/help/glossary.test.ts`) rewrites it, and the diff is
  reviewed like a translation. The matching is key-gated: a language's string is searched for a term only when the English
  string of the same key has it. Quoted text, VIREO control names (the lint glossaries' names, in the language and in English,
  VIREO's English originals in parentheses or brackets, and the photometer's and analyser's control names of `CONTROL_KEYS`)
  are never searched, so «Calculate B−V» stays a button's name. The dev pseudo-locales take the English snapshot through their
  own transform. A word the snapshot does not name, or that the rendered text does not hold, stays plain: a miss is never a wrong
  mark. The HR diagram is marked nowhere: the guides name it only as controls (VIREO's HR Diagrams menu, Exercise color–magnitude
  analysis); a window that marks the main sequence, the ZAMS or an isochrone lists it in «Words used in this guide» (review N2).
- **A term is a real button** (`<button type="button" class="term" aria-expanded>`, made by plain functions, not one component per
  term) that reads as part of its sentence: the sentence's font and colour with a dotted underline (kept in forced colours),
  inline so it wraps with the text, and a target of at least 24 px from the window's line height. **One popover**
  (`src/components/TermPopover.tsx`, mounted once in the shell) handles presses by delegation: a click, a tap, Enter or Space
  opens the definition; a second press, a press elsewhere, the popover's × or Escape closes it. Escape closes only the
  definition, and only an Escape from the definition's own container (review N4): the guide window and Step details wait for the
  next Escape, and once nothing is open no Escape is taken. Nothing opens on hover or focus (Q12). The focus stays on the term,
  which carries the definition as its `aria-description` (so a screen reader gives it with the term, review N3) and, while open,
  is also described by the definition's text (`aria-describedby`); the popover (`role="note"`,
  named «Definition of …») holds no tab stop, so it is no focus trap. It is drawn inside the term's container (the guide
  `<dialog>`, which is in the top layer, or the strip's Step details), below the term or above it when there is no room, from the
  term's inline start, moved back inside the viewport, at most `min(320px, 90vw)` wide; it follows scrolling, and it closes when
  its window closes or when a MutationObserver on its container sees its term removed, hidden or replaced (the marks are keyed by
  term and place, so a step that moves on draws new buttons; review N1).
- **«Words used in this guide»:** a folded `<details>` at the end of each window, before its Return button, listing the terms
  marked in that window with their definitions, in the glossary's order (one tab stop). Printing opens it with the window's other
  folded parts (`help/printDetails.ts`).
- Nothing is stored; files the site writes, CLEA's bytes and the export identity are unchanged.
- **Tests:** `src/help/glossary.test.ts` (each snapshot equals its regeneration and never marks quoted text or names, key-gating,
  longer terms first, inflected and CJK matches, first occurrence per step, the strip's Step details, every language marks its
  words, the rendered windows marking exactly the snapshot's words after parameter substitution, the pseudo-locales, nineteen
  strings per language, no digit, the HR diagram beside its three terms); `src/guideLead.test.ts` (no definition states a result,
  with the check biting on textbook pulsar and dispersion-measure lines); `tests/glossary.spec.ts` (press, second press, Enter,
  Escape, Space, a press elsewhere, focus, no hover opening, Words used and print, the strip's Step details, a term replaced or
  removed under its open definition, 375 px, Japanese, qps-rtl).

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
