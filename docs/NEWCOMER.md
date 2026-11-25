# Newcomer

Front NEWCOMER (user decisions of 2026-11-24 and 2026-11-25, recorded in AGENTS.md; plan
`analysis/front-plans/front-newcomer.md` in the research root, reviewed by an independent Fable 5.2 reader). Web presentation
only: it is not a VIREO feature, ports no CLEA resource and changes no numerical or recovered contract.

This page is the map of the front for a maintainer. The design and tests of each piece are in `docs/GUIDE-COMPANION.md`, its
strings in `docs/I18N.md` and its search-page changes in `docs/SEO.md`; the sections are linked below and not repeated here.

## Purpose

Before the front, a first-time visitor met long guide windows, a six-step tour, unexplained jargon and two labs of 13 galaxies and 24 stars, with no idea of the time or the level. The front gives that
visitor a way to start within a minute (a guided first look), to see why a lab matters before its first step, to read a short
guide (plain titles, folded detail, one-line definitions), to finish a shorter version of the two long labs, and to know what to
try next. Audience: the general public, not schools.

## The pieces and where they live

Each sub-front was implemented, reviewed independently and merged on its own, in this order.

| sub-front | what the visitor sees | code | details |
|---|---|---|---|
| NC1 first look | «Guide me (about 3 min)» in the observatory heading and Help › Take a first look: four steps (open the dome, choose M82 and point, look through the telescope, open its spectrum) shown by the guide companion strip as an eighth guide without a window, ending on VIREO's original library photograph and spectrum, labelled as library material, and on the welcome's lab list | `src/core/firstLook.ts` (pure: `firstLookProgress`, `observatoryBandStep`, `FIRST_LOOK_TARGET_ID`), `CompanionGuide` in `src/core/guideCompanion.ts`, `src/components/GuideCompanion.tsx`, `src/components/guideCompanionContent.tsx`, `src/help/guideTargets.ts`, strings `firstLook` in `src/components/AppShellMessages.ts` | GUIDE-COMPANION "First look"; I18N "First look: its strings in ten languages" |
| NC2 tour | Four steps instead of six; the last asks «How would you like to start?» with Take a first look or Choose a lab | `src/help/tour.ts`, `src/components/SiteTour.tsx` | GUIDE-COMPANION "The tour's last step"; I18N NC2 section |
| NC3 plain titles | Each step shows its title, status and button; the rest folds under More detail (the current step open); an open guide window prints whole; the strip's line is the step's title | `src/guideMoreDetail.tsx` (`moreDetail`, `stepTitle`), `src/help/printDetails.ts`, the print rule in `src/hubble-lab.css`, `withoutStepNumber` in `src/core/guideCompanion.ts`, `tests/fixtures/moreDetail.ts` | GUIDE-COMPANION "Plain step titles and More detail"; I18N NC3 section |
| NC4 why-lines and What next | Each window opens with a question («How far away is the Pleiades cluster? …») and ends, once done, with the visitor's own counts and one lab to try next | `src/guideLead.tsx` (`whyLead`, `whatNext`), `src/home/labNext.ts` (`LAB_NEXT`) | GUIDE-COMPANION "Why it matters, and what next"; I18N NC4 section |
| NC5 quick versions | Hubble's law (3 galaxies) and Pleiades photometry (8 stars) offer a quick version, open by default, labelled as a web suggestion and a part of the original exercise; the strip says «Quick version» | `src/core/labVersion.ts` (`DEFAULT_LAB_VERSIONS`, `hubbleGoal`, `pleiadesGoal`), `companionQuick` in `src/core/guideCompanion.ts`, the `goal` of `hubbleLabProgress` and `pleiadesLabProgress`, `HUBBLE_QUICK_GOAL` and `PLEIADES_QUICK_GOAL`, `versionChoice` in `src/guideLead.tsx` | GUIDE-COMPANION "Quick versions of the two long labs"; I18N NC5 section |
| NC6 time, level, Start here | Rough computed times, a level 1–3 and one Start here (Stellar classification) on the home cards, in each guide window and on the /labs/ pages, always with the note that the times are computed, not measured | `src/home/labFacts.ts` (the table, `START_HERE`, the method in its comment), `src/home/Welcome.tsx`, `src/seo/pages.ts` (JSON-LD `timeRequired`, no `educationalLevel`), the `ui` texts of `src/seo/languages.ts` | GUIDE-COMPANION "Time, level and Start here"; SEO "Front NEWCOMER NC6"; I18N NC6 section |
| /labs/ texts (2026-11-25) | The search pages ask and never answer: the sentences that stated a lab's result became questions or topics; the search keywords stay as questions | `src/seo/labs.ts` and the nine `src/seo/labs.<lang>.ts`; the check and its allowlist `KEPT_QUESTIONS` in `src/guideLead.test.ts` | SEO "Front NEWCOMER /labs/ texts"; I18N "The /labs/ texts that stated a result" |
| NC7 glossary | Sixteen terms in the guide windows and Step details are buttons that open a one-line textbook definition; «Words used in this guide» at the end of each window | `src/help/glossary.tsx` (`TERM_IDS`, `glossKey`, `wordsUsed`), `src/components/TermPopover.tsx` (one popover, mounted once in the shell), `src/help/glossaryPatterns.ts` (test-only), snapshots `src/i18n/terms.en.json` and `src/i18n/<dir>/terms.json` | GUIDE-COMPANION "Words used in the guides"; I18N "The glossary" |

All of it is in the ten languages of the site; every new marker is an `id`, never a `data-testid`, because
`tests/fixtures/rtlKnown.ts` names known right-to-left problems by the nearest test id.

## Invariants and what enforces them

- **No answer, expected value or grade, and no result, not even qualitatively.**
  - `src/guideLead.test.ts` holds per-language result-word lists (`RESULT`), curated from each guide's reflect, interpret and
    outcome texts. Entries starting with `*` match inside a word, so negated forms are caught. Object X uses its five kind names.
  - The lists check every why-line (NC4, which must also be a question with no digit), the Hubble and LSS home cards, the
    version strings (NC5) and the glossary definitions (NC7, against the guides whose windows mark the term).
  - The same lists check every text of every /labs/ page (title, description, heading, intro, steps, learn), clause by clause.
    Only reviewed exceptions pass: kept keywords in `KEPT_QUESTIONS`, Object X's five kinds as the lab's question, the lab's own
    name, and a per-string allowlist.
  - Each check has a self-check that the old texts and textbook answers are caught.
  - What next shows only the guide's own counts line.
- **Nothing new is stored.**
  - The first look's flag, the guide in use and the quick/full choice (`labVersions`) are state of the tab. The glossary opens
    nothing persistent.
  - The tour keeps its existing `openvireo.tour.v1`. No `localStorage` key, cookie or service was added.
  - Tested where state could leak: `tests/hubble-guide.spec.ts` checks that a reload starts with the quick version again, and
    `tests/guide-companion.spec.ts` that Restart exercise is a fresh load. Elsewhere this rests on review.
- **Files the site writes are unchanged.**
  - TXT, FITS, CSV, saved investigations and other exports keep their bytes. `tests/i18n/exports-identity.spec.ts` was not
    changed by the front and still passes.
  - CLEA's bytes, hashes and provenance are untouched. The first look shows only library material the catalog already carries.
  - A saved investigation carries no version: Restore keeps the tab's choice.
- **Object X's identity stays hidden.**
  - Its why-line, time, level, glossary definitions and What next name no kind except as the question of all five.
  - The first look's M82 is 13.6° from the nearest ObjectX.HTL target, outside every masking radius. For an unrevealed target the
    spectrum step falls back to the picker (`spectrumAvailable`).
  - The /labs/ check fails on fewer than five kinds or on the Solar System.
- **The guide windows render closed on every load** (plain functions, not components per step or term), so
  `tests/render-budget.spec.ts` stays within its budget.

## Recorded departures from the plan

- **NC1, where Guide me sits.** The plan put it under the observatory's three-step band; there, and on a row of its own, it pushed
  Open dome off the first screen. It now shares the line of "What works in this version" and adds no height (GUIDE-COMPANION
  "First look").
- **NC1, M82 not required.** Only the point step names M82. M81 completes the look step and then waits on the spectrum step,
  whose Show me where points at the picker.
- **NC2.** The tour's old observatory step took LAUNCH-1's Show tracking control with it. The help topic's "Tools button" became
  "Menu button", the name the phone button shows.
- **NC3.** The intro paragraphs stayed visible until NC4 moved them to Research notes. The pulsar backup note moved into its Save
  step. A print rule hides the page behind an open guide window (review S1).
- **NC4.** Stellar classification, the Start-here lab, is suggested by no other lab, on purpose (`LAB_NEXT`).
- **NC5, Restore.** Plan §2.5 reset the version on Restore. Review N2 keeps the tab's version, because a reset made a restored full
  investigation read «You finished the quick version».
- **NC6, time method.** Plan §2.6 counted 30–60 s for every action, which gave 2–4 hours for the full Hubble list and 3–6 for
  Pleiades. Repeated galaxies and stars now count 10–20 s per action. Repeated tries count 30–60 s each (classification's
  standard pairs, cluster HR's fits; review N1).
- **NC6, levels.** Large-scale structure is level 2, not the draft's 1 (review N2). The times replace the plan's provisional ranges.
  They were computed in NC6 on 2026-11-25 from the whole-exercise walks (no NC0 spike was merged; plan §6 kept it scratch only).
- **NC6, Japanese ranges.** They keep the en dash of the ja plan (§4.1, «約{low}–{high}分»), not the wave dash that review N4
  proposed.
- **NC7, the HR diagram.** It is defined but marked nowhere: the guides name it only as controls (VIREO's HR Diagrams menu).
  A window that marks the main sequence, the ZAMS or an isochrone lists it in «Words used in this guide» (review N2).
- **NC7, pulsar and dispersion measure definitions.** They avoid the textbook «rotating neutron star» and «free electrons along the
  line of sight» (the plan's example), since those are what the pulsar guide asks the visitor to find.
- **NC7, magnitude.** The definition covers apparent and absolute magnitude, since the Hubble guide marks «absolute magnitude»
  (review S1).
- **NC7, naming.** The plan named `help/glossary.ts` with `gloss(key, params)` and a snapshot script under `scripts/`. The code is
  `help/glossary.tsx` with `glossKey`/`glossText`, and the snapshots are regenerated by `src/help/glossary.test.ts`
  (`npm run i18n:terms`).
- **/labs/ texts.** Added by the user's 2026-11-25 decision, after the plan. The LSS guide step «Describe the structures you see…»
  became «Describe what you see on your map…» in every language.
- **Translations.** Plan §4 had nine Sonnet batches per sub-front and one Opus reviewer. Instead, the Opus implementers wrote all
  ten languages with each language's glossary, profile and lints, and independent Opus reviewers checked them. No Sonnet batch
  was used.
- **No `tests/newcomer.spec.ts`.** Plan §5's single end-to-end newcomer path was not written as one spec. Its parts are covered
  by `tests/onboarding.spec.ts`, `tests/first-look.spec.ts`, `tests/home.spec.ts`, `tests/classification-guide.spec.ts` and
  `tests/glossary.spec.ts`.

## Open items

- **Timing with people (Q15).** The user or testers they know will time Stellar classification and Hubble quick against the
  computed estimates. Until then every place that shows a time says it is computed, not measured.
- **WebKit not run locally.** The NC3 print tests and the NC7 glossary keyboard tests were not run in WebKit on the implementers'
  machine, which lacks its system libraries. They passed in Chromium; print also passed with `--browser=firefox`.
- **Observation (plan §7).** Plan §7 proposes walk-throughs and aggregate analytics read cautiously, before and after. The front
  added no analytics and no service.

## How to change things

- **Add a glossary term.**
  - Add its id to `TERM_IDS` and its definition to `termDefinition` (`src/help/glossary.tsx`), and add `term.<id>` to `en.json`
    and all nine catalogs.
  - Add the English gate pattern and each language's pattern in `src/help/glossaryPatterns.ts`.
  - Run `npm run i18n:terms` and review the snapshot diff like a translation.
  - Update the counts the tests pin (nineteen strings in `src/help/glossary.test.ts` and `src/i18n/hi/hi.test.ts`).
  - The definition must pass the result-word check in `src/guideLead.test.ts`. Add a `TERM_ALLOWED` entry only for a reviewed
    exception, like the dispersion measure's «dispersion».
- **Change a time or a level.**
  - Edit `src/home/labFacts.ts` only, and update the method, the object counts and the date in its comment.
  - `src/home/labFacts.test.ts` pins the settled values and checks outward rounding and quick below full.
  - The /labs/ JSON-LD `timeRequired` follows the table.
- **Add a kept keyword to a /labs/ page.** A result word may stay only inside a question. Add the exact clause, in every
  language, to `KEPT_QUESTIONS` (and the word to `KEPT` if new) in `src/guideLead.test.ts`. The test requires each listed clause
  to be on a page and each page to keep its keyword. Never list a statement.
- **Refresh the glossary snapshots** after a guide string changes: `npm run i18n:terms` (or
  `OPENVIREO_REFRESH_PINS=1 npx vitest run src/help/glossary.test.ts`; refused in CI), then review the diff. A word the snapshot
  misses stays unmarked, never wrongly marked.
- **Change a guide's next lab:** `LAB_NEXT` in `src/home/labNext.ts`. Its test requires each lab to suggest another lab.
- **Change the quick goals:** `HUBBLE_QUICK_GOAL` (`src/core/hubbleLab.ts`) and `PLEIADES_QUICK_GOAL` (`src/core/pleiadesLab.ts`).
  Then recompute the quick times in `labFacts.ts`.
