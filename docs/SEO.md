# Front SEO: lab pages and search metadata

User request, 2026-11-08: improve how search engines and link previews see https://openvireo.space. Static site only, as AGENTS.md
allows; no new external service is contacted by the site.

## Why

OpenSEO's audit of the live site (2026-11-08, project "OpenVireo") found one page with **0 words** in its HTML: the app renders
everything with JavaScript, and its routes are `#hash` addresses that search engines do not treat as pages. Keyword research
(DataForSEO through OpenSEO, United States, English) showed small but exact demand: "clea astronomy", "clea astronomy labs" and
"astronomy virtual lab" (about 10 searches a month each), plus long-tail searches such as "clea astronomy mac", "clea astronomy
software free download" and "clea radio astronomy of pulsars", from people who want CLEA's labs and cannot run the Windows
program. The goal is to be the first result for CLEA, VIREO and each lab name, not general astronomy traffic.

## What changed

- **Lab pages** `/labs/` and `/labs/<slug>/` for the seven exercises (E01–E06, E08): plain HTML, no script, readable without
  JavaScript. Each has its own title, description, canonical address, Open Graph tags, a `LearningResource` and breadcrumb JSON-LD,
  what the student does and learns, links to the other labs, and the credit and "not the original program" notice.
  Source: `src/seo/labs.ts` (texts and slugs), `src/seo/pages.ts` (HTML), `src/seo/vitePlugin.ts` (dev server and `dist/`),
  `public/labs/labs.css`.
- **Open the lab** links to `/#lab=<slug>`. At load the app opens that lab's guide through the same opener as its Guides menu
  button (`openGuide` in `OpenVireo.tsx`: `startExercise` and the guide dialog; `openClusterGuide` for the cluster guide), skips
  the first-visit tour, then removes the hash so a reload shows the plain observatory. Unknown slugs are ignored.
- **Home page** (`index.html` through `src/i18n/html.ts`): new title and description naming CLEA VIREO; canonical, Open Graph and
  Twitter card tags; `WebApplication` JSON-LD (free, browser-based, based on Project CLEA's VIREO); favicon and Apple touch icon;
  and crawlable text with links to every lab inside `#root`, which React replaces when it starts. The observatory footer links to
  `/labs/` ("About the seven labs") in a new tab, so unsaved work stays.
- **Files**: `sitemap.xml` (generated from the same list), `robots.txt` (allows everything and names the sitemap; Cloudflare adds
  its managed AI-crawler rules above it), `favicon.svg`, `favicon.ico` (16, 32 and 48 px renderings of `favicon.svg`, only for browsers and crawlers that request `/favicon.ico` whatever the page declares), `apple-touch-icon.png` and `og-image.png` (1200×630, an original
  design rendered with Playwright; no CLEA image is used).
- **Headers**: `/labs/*`, `/sitemap.xml` and `/robots.txt` are `no-cache`, like the page. JSON-LD blocks are data and are never
  run, so the Content-Security-Policy needs no new entry; `src/deployHeaders.test.ts` now counts only runnable inline scripts.

Web presentation only: the lab texts summarise each exercise's student path (docs/STUDENT-EXERCISES.md) and claim no
equivalence with the original program.

## Tests

- `src/seo/pages.test.ts`: one page per exercise with unique titles and descriptions within search-result lengths, canonical and
  preview tags, one `h1`, the `#lab=` link, the credit notice, valid JSON-LD, escaping, no runnable script or inline style; the
  sitemap matches the emitted files; `robots.txt` names the sitemap; `index.html` tags and pre-render links; image sizes.
- `tests/seo-labs.spec.ts`: a lab page's Open the lab opens its guide and clears the hash; each `#lab=` opens its guide; the
  cluster link opens the database guide; unknown slugs do nothing; index, sitemap and robots links; footer link; 320 px layout.
- `tests/release/pages-smoke.pages.ts`: the built lab pages, sitemap, robots.txt and images are served by `wrangler pages dev`
  with the release headers, and a lab page plus Open the lab pass the policy with no violation or outside request.

## For the user (not done by the site)

1. **Google Search Console**: add the domain property `openvireo.space`, verify it with the TXT record Google gives (Cloudflare
   › openvireo.space › DNS › Add record › TXT), then submit `https://openvireo.space/sitemap.xml`. The same for Bing Webmaster
   Tools if wanted. Connecting Search Console to OpenSEO lets it report which pages are indexed.
2. **Links from other sites** matter most for a niche topic: for example telling Project CLEA or astronomy teachers about the site.
   Any such message is the user's decision.

## Review

Workflow (REVIEW.md): plan and implementation by the coordinator (Claude Opus 5.5); independent review 1 by a separate
subagent (Claude Opus, high effort) that did not write the code, over commit `d6cde55`. Raw findings, then the resolution.

### Review 1 findings (raw summary)

- **M1 major**: the footer link `/labs/` left the single-page app in the same tab, discarding unsaved work (no unload guard).
- **m2**: search snippets ("A free web version of CLEA's VIREO … lab", "A free web CLEA VIREO lab") and the home description,
  which dropped "not the original program", read as an official or equivalent CLEA product; the preview image said "on any
  computer".
- **m3**: the footer sentence "Where the web version behaves differently, the app says so" promised complete labelling.
- **m4**: `#lab=cluster-hr` opens its guide only after a lazy route loads, so on a slow first visit the first-visit tour could
  open under it.
- **m5**: the `#lab=` handlers duplicated the Guides menu handlers, and the cluster link clicked a test id.
- **m6**: light-mode focus ring on the dark page header was about 2.8:1.
- **m7**: no `WebSite` JSON-LD on the home page (site name in results); the structured credit omitted the supporters.
- **m8**: test gaps (cluster guide text, exercise side effects of `#lab=`, guide labels tied to the app, index description length,
  no `style=` in the pre-render content).
- Nits: public "E01…E08" board codes; dev server did not redirect `/labs` like Pages; lab texts pulled into the app bundle for
  the slug check; a 66-character title.

### Resolution

- M1: the footer link opens a new tab (`target="_blank" rel="noopener noreferrer"`, with "(opens in a new tab)" for screen
  readers), as the project's other outbound links do; the e2e test checks the app stays.
- m2: every lab description now says "A free web reconstruction of …"; the index says "rebuilt for the browser"; the home
  description starts "Unofficial free web reconstruction"; "in any browser"/"any computer" became "in a modern browser"; the
  preview image says "An unofficial, free web reconstruction". A unit test forbids the old phrasings.
- m3: "The app labels its known web adaptations."
- m4: the tour is not scheduled when the page opens with a `#lab=` address.
- m5: one `openGuide` map in `OpenVireo.tsx` serves both the Guides menu buttons and the `#lab=` effect; the cluster opener is
  exported from `ClusterGuideNavButton.tsx` (`openClusterGuide`) instead of clicking its button.
- m6: header links get a light focus outline (#9cc8ff).
- m7: home JSON-LD is a graph of `WebApplication` and `WebSite`; the credit lists the NSF and Gettysburg College as funders. No
  rating is added.
- m8: tests added for each gap (`#lab=pleiades` forces Show Object ID as the menu does; cluster guide title; labels; lengths;
  no inline style).
- Nits: the eyebrow reads "Lab based on a CLEA VIREO exercise"; the dev server answers `/labs` and `/labs/<slug>` with 308 like
  Pages; slugs live in `src/seo/labSlugs.ts`, so the app bundle no longer includes the page texts; the LSS title is shorter.

# Front ES-SEO: Spanish search pages

User decision 8 of 2026-11-09 (AGENTS.md): after the Spanish release, a Spanish home page `/es/` and the Spanish lab pages
`/es/labs/`, with `hreflang` and a Spanish preview image. Static site only; no new external service. The language rules (how
`/es/` opens the app, the precedence, the dist check) are in `docs/I18N.md`, "Spanish: search pages (ES-SEO)".

## What changed

- **One table for every language** (`src/seo/languages.ts`, `SEO_LANGUAGES`): English (the x-default, whose home page is the app)
  and Spanish (`es-419`, prefix `/es`). Each row holds its tag, `hreflang` codes, `og:locale`, path prefix, the address that opens
  the app in that language, the lab texts, the page and footer texts, and its preview image. `src/seo/pages.ts` renders every page
  of every row; a later language adds a row and its texts (`src/seo/labs.<dir>.ts`), not code. Path prefixes are in
  `src/seo/labSlugs.ts` (`SEO_PATH_PREFIX`), which the app may import (no text).
- **Spanish pages**: `/es/` (a static home page: what OpenVireo is, «Abrir el observatorio», the seven labs as cards, how it works,
  the credit), `/es/labs/` and `/es/labs/<slug>/` with the English slugs. `<html lang="es-419">`, Spanish titles and descriptions
  within search-result lengths, self canonical, `og:locale` `es_LA` with `og:locale:alternate` `en_US`, the Spanish preview image,
  Spanish JSON-LD (`WebApplication` on `/es/`, `ItemList` on the index, `LearningResource` with `inLanguage` `es-419` and
  breadcrumbs on each lab). «Abrir la práctica» goes to `/?lang=es-419#lab=<slug>`. Texts: `src/seo/labs.es.ts` and the `es-419`
  row; the footer says they are OpenVireo's web adaptation, not CLEA's text.
- **hreflang** on every page pair (`/` ↔ `/es/`, `/labs/` ↔ `/es/labs/`, each lab): `en`, `es` and `x-default` → the English URL.
  The Spanish alternate is `es`, not `es-419`: Google's `hreflang` takes an ISO 639-1 language with an optional ISO 3166-1 alpha-2
  region, and 419 is a UN M.49 region, so `es-419` would be ignored (and audit tools flag it); `es` matches every Spanish
  searcher, as the app opens Spanish for any `es-*` browser (review). `<html lang>`, the JSON-LD `inLanguage` and the
  `hreflang` attribute of the visible «Español» link stay `es-419`, where BCP 47 tags are valid. The sitemap lists all 18
  addresses with the same alternates as `xhtml:link` entries. English pages also get `og:locale` `en_US` / `es_LA` and a visible
  «Español» link to their Spanish version; nothing else in their HTML changed.
- **App**: the observatory footer's labs link goes to `/es/labs/` when the app is in Spanish.
- **Preview image** `public/og-image-es.png` (1200×630): the design of `og-image.png` with Spanish text, rendered by the new
  `scripts/render-og-image.mjs <tag>` (Playwright's Chromium with no network, DejaVu Sans through the project's test fontconfig,
  seeded stars, so a render is repeatable); an original drawing, no CLEA image. The English image predates the script and is not
  re-rendered (the script refuses to overwrite it).
- **Headers**: `/es/*` is `no-cache`, like `/labs/*` (`public/_headers`, `src/deployHeaders.test.ts`).

## Tests

- `src/seo/languages.test.ts`: the table (English first, prefixes, each language in `src/i18n/languages.json`, the same labs and
  steps); Spanish lengths, uniqueness, «Reconstrucción web gratuita», the glossary lint, no claim of being CLEA's, no app text copied
  into the pages (the dist check's markers); each Spanish page's lang, canonical, `og:*`, one `h1`, JSON-LD, links that stay Spanish
  except the one English link; reciprocal `hreflang` on all 18 pages and the same alternates in the sitemap.
- `src/seo/pages.test.ts`: the sitemap now lists both languages, and every emitted page is in it.
- `tests/i18n/es-seo.spec.ts`: `/es/` opens the app in Spanish without storing a choice and English goes back (also from a Spanish
  browser); «Abrir la práctica» opens the Spanish pulsar, Object X and cluster guides and keeps `?lang=es-419`; the dev server's
  308 for `/es`, `/es/labs`, `/es/labs/<slug>`; the language links between page pairs; the Spanish footer link; 320 px layout.
- `tests/release/pages-smoke.pages.ts`: the Spanish pages and image with the release headers, the 308s, `hreflang` on `/` and
  `/es/`, the sitemap, and a Spanish lab page opening the app under the release policy in an English browser.

## For the user (not done by the site)

After the deploy: in Google Search Console (once the `openvireo.space` property exists, see above) submit or resubmit
`https://openvireo.space/sitemap.xml`, and inspect `https://openvireo.space/es/` and a Spanish lab page with URL Inspection
(«Request indexing»); Search Console no longer reports `hreflang` (its International Targeting report was retired in 2022): URL Inspection shows the canonical Google chose, and a site audit (OpenSEO) can check the alternates. The same in Bing Webmaster Tools if
wanted. OpenSEO can track Spanish keywords (for example «práctica ley de Hubble», «CLEA astronomía») for a Spanish-speaking market.

# Front HOME: a welcome on the observatory's first screen

User request, 2026-11-10: before the site is announced to the general public (curious adults and hobby learners, for example
someone whose cosmology course uses CLEA's labs, a Windows program that today needs a virtual machine), `https://openvireo.space/`
must say what it is. Until now `/` opened straight on the observatory, whose first screen ("Start with the sky.") never said what
the site is, and crawlers read about 30 words before the app started. User decisions (2026-11-10): keep `/` as the app (no new HTML
route, no redirect); then, on seeing the first layout, make the welcome its own screen instead of a block above the observatory.

Workflow (REVIEW.md): plan by the coordinator (Claude Opus 5.5, high effort), with the user's design change relayed mid-front;
implementation by a subagent (Claude Opus 5.5, medium effort); independent review pending (below).

## What changed

- **A welcome page** (`src/home/Welcome.tsx`), the app's page `home`: the address `/` with no hash, `#` or `#home`. An eyebrow and
  an `h1` ("Project CLEA's VIREO astronomy labs, rebuilt for your browser"; review 1 finding 5), a lead, three facts (nothing to install, no Windows or virtual
  machine, Mac/Windows/Linux/Chromebook; free with no account, work saved as files on your own computer; an unofficial
  reconstruction that follows the recovered behaviour and labels its web adaptations), one primary button **Explore the sky** to
  the exploration page (`#observatory`), and the seven labs as cards with a one-line summary each. A card is a `<button>` named by
  the lab (its summary is the description) that calls the lab's entry of the one `openGuide` map in `OpenVireo.tsx`, the same
  opener as the Guides menu button and `#lab=` (the cluster card goes to the cluster database, as its menu button does). The
  welcome's footer repeats the observatory's credit line and "About the seven labs" link. Its text is new web text (`home.*` keys
  in English, es-419 and pt-BR), with no wording about classes, students or teachers, and no claim of equivalence with or
  endorsement by CLEA (review m2's rules above).
- **Routing**: `home` joins the route table (`src/components/routePages.ts`) with no section (`group:null`): the page bar shows
  "Welcome" alone, and no sidebar section lists it; the brand link (✳ OpenVireo) opens it (`#home`). The welcome is the default
  only for an empty hash: `#observatory` and every other route open as before, an unknown hash still opens the observatory, and
  `#lab=<slug>` still opens its guide over the observatory and then leaves `#observatory` in the address (review 1 finding 2). Browser Back from `#observatory` returns to the welcome (a hash
  change). A restore does not change the page. The route-change focus goes to the welcome's `h1` as to every page's.
- **The exploration page** (`#observatory`, Optical observatory › Observatory) keeps its heading ("Start with the sky.", the
  subtitle, "What works in this version"), its first steps and the telescope, unchanged.
- **First-visit tour**: it no longer starts on load. It is scheduled the first time the visitor reaches the exploration page in a
  load (`src/home/firstVisit.ts`, `firstVisitTourDue`), under the old conditions (not in an automated browser, not once seen) and
  never in a load where a guide was opened (a welcome card, the Guides menu or `#lab=`; review 1 finding 1). Leaving before its
  timer has run cancels it and lets the next visit there schedule it again (this also survives React's development double effect). Every part the tour points at (sidebar sections, Exercise guides, first
  steps, Save investigation, Help) is on the exploration page; its text already says "On the Observatory page", so it is unchanged.
  Help › Tour still replays it from any page.
- **Pre-render** (`homeBoot` in `src/seo/pages.ts`, injected by `src/i18n/html.ts`): the English welcome from the same catalog keys
  (eyebrow, `h1`, lead, the three facts, "The seven labs" with each lab's name linking to `/labs/<slug>/` and its summary), plain
  escaped HTML with no inline style or script; it is shown as a plain list until the app replaces it (`base.css`). The document
  title and description are unchanged.
- **`/es/`**: «Cómo funciona» gains two items: no Windows or virtual machine on Mac, Windows, Linux or a Chromebook; follows the
  recovered behaviour, labels its adaptations, unofficial. Portuguese search pages remain front PT-SEO.

Web presentation only (an adaptation of the site's own shell): VIREO has no welcome page; nothing about the exercises changed.

## Tests

- `src/seo/pages.test.ts`: the pre-render's `h1`, lead and facts once each; the seven labs in the `/labs/` order with the welcome's
  names and summaries (each ≤ 120 characters) and their `/labs/` links; escaping; a missing key throws; no inline style, script or
  handler; no classroom words or equivalence claims in `home.*`.
- `src/home/firstVisit.test.ts`: the tour condition (only on `observatory`; automated, seen, `#lab=` arrival and once-per-load each
  block it). `src/components/routePages.test.ts`: 17 pages, the welcome in no section.
- `tests/home.spec.ts`: `/` shows the welcome (facts, seven named and described cards, the button, "Welcome" in the page bar, no
  first steps or telescope, the cards within 1050 px at 1440 px); each card opens the same guide, at the same address, as its
  Guides menu button; Explore the sky goes to `#observatory` and focuses its `h1`, Back returns to the welcome, the brand link opens
  it, `#observatory` and `#home` open directly; 320 px with no horizontal scroll and one card per row; es-419 and pt-BR (preview)
  translations; as a visitor's browser, no tour on the welcome, the tour on reaching exploration with every target visible, and no
  tour after a `#lab=` arrival.
- Existing specs: a spec that loaded `/` to use the observatory now loads `/#observatory` (the address the specs already use most);
  the five that load `/` only to wait for an `h1` and then mount a test host keep `/`. `tests/seo-labs.spec.ts`: after `#lab=` the
  address is `#observatory` (review 1). `tests/i18n/es-seo.spec.ts`: `/` and `/?lang=en` open the welcome; «Abrir el observatorio»
  opens the observatory (review 1). `tests/china-fail-soft.spec.ts`: the home page is the welcome.

## Review

Independent review 1 by a separate subagent (Claude Opus, high effort) that did not write the code, over commit `36d2bad`. The
coordinator decided the resolution; the implementer (Claude Opus 5.5, medium effort) applied it. Raw findings, then the resolution.

### Review 1 findings (raw summary)

1. **MAJOR**: the first-visit tour opens over a lab the visitor picked from the welcome: card → guide → "Go to observatory" reaches
   `#observatory` and 700 ms later the tour opens (also any guide step whose destination is the observatory, and the Guides menu).
   Only the `#lab=` arrival is excluded. (OpenVireo.tsx:986-991, home/firstVisit.ts:6)
2. MINOR: after a `#lab=` arrival the hash is replaced with `/` while the view stays observatory; reload/copied link then shows the
   welcome, Back history is wrong, the comment "leaves the plain observatory address" is false. (OpenVireo.tsx:993-997)
3. MINOR: Help › Report a problem on the welcome reports "#observatory" because `currentPage()` (src/help/projectLinks.ts:47-49)
   reads the sidebar button with `aria-current="page"` and the welcome has none; the sidebar's ProjectLinks says `#home`.
4. MINOR: "Open the observatory" / «Abrir el observatorio» on the static pages (src/seo/pages.ts:91 header, :132 /labs/ CTA, :146
   /es/ CTA) now land on the welcome; /es/ then shows a second welcome.
5. MINOR (SEO m2 wording): h1 "Project CLEA's VIREO astronomy labs, in your browser" leads with the third party's possessive and is
   the crawler h1; "unofficial" appears only in the third muted fact; the lead doesn't say unofficial.
6. MINOR test gaps: tests/release/pages-smoke.pages.ts ROUTES (~line 110) has no welcome entry; no per-language untranslated-text
   walk visits `#home` (home.spec checks only facts, Object X card and page name in es/pt); nothing tests finding 1 or Help › Tour
   replay from the welcome.
7. NIT: tour cleanup decides "fired" from elapsed time (`performance.now()-since<700`), not whether the timer ran; with throttled
   background timers the tour can be lost for that load. (OpenVireo.tsx:990)
8. NIT: tour copy (src/help/tour.ts:17-27) step 1 repeats the welcome; step 4 "Or explore the sky freely" comes after the visitor
   chose to explore.
9. NIT: pre-render still says "Loading the observatory…" (src/seo/pages.ts:75).
10. NIT (visual): 4+3 grid leaves an empty cell at 1440 px; otherwise design, contrast (light ≥5.3:1, dark ≥7.8:1), focus order,
    320 px fine.
11. NIT i18n: /es/ lead says «mides el brillo de las estrellas», app `home.lead` says «mides la luz de las estrellas»; pt-BR
    `home.objectXSummary` «Um mistério a partir só das coordenadas» is awkward (suggest «Um mistério só com as coordenadas»).
- Info: the welcome eagerly loads exactly what the observatory loads (~13 MB data modules) because the observatory stays mounted
  hidden; not a regression.

### Resolution

1. Fixed. Every guide opener starts its exercise through `guideStart` in `OpenVireo.tsx`, which records that a guide was opened in
   this load: the `openGuide` map (welcome cards, Guides menu buttons, `#lab=`) and the cluster menu button (`onOpen`), whose opener
   `openClusterGuide` receives it too. `firstVisitTourDue` takes `guideOpened` instead of `arrivedWithLab` (a `#lab=` arrival
   counts from the start). Tests: the unit test; `tests/home.spec.ts` "a visitor who chose a lab card and follows its guide to the
   observatory gets no tour" (Pleiades card → Go to observatory → no tour after 1.5 s); Explore the sky still shows the tour.
2. Fixed. The `#lab=` effect replaces the address with `#observatory`; the comment says so. `tests/seo-labs.spec.ts` expects
   `#observatory` and "Start with the sky." after a reload; `tests/i18n/es-seo.spec.ts` expects `#observatory` after a Spanish
   «Abrir la práctica».
3. Fixed without touching the help files: on the welcome the brand link carries `data-route="home"` and `aria-current="page"`, so
   `currentPage()` returns `home`. `tests/home.spec.ts` checks Help › Report a problem and the sidebar's report link name `#home`
   on the welcome, and that the mark leaves the brand link on the observatory.
4. Fixed. The header link, the /labs/ index button and the /es/ button go to `<app>#observatory` (`openObservatoryHref` in
   `src/seo/pages.ts`), labels unchanged. `src/seo/pages.test.ts` checks every static page's links; `languages.test.ts` and
   `tests/i18n/es-seo.spec.ts` (Spanish observatory heading and `#observatory`) were updated.
5. Fixed. h1 "Project CLEA's VIREO astronomy labs, rebuilt for your browser" (es «Las prácticas de astronomía de VIREO, de Project
   CLEA, reconstruidas para tu navegador»; pt-BR «As práticas de astronomia do VIREO, do Project CLEA, reconstruídas para o seu
   navegador»); the lead starts "OpenVireo is an unofficial web reconstruction of VIREO, Project CLEA's virtual observatory." (es
   «OpenVireo es una reconstrucción web no oficial de VIREO…», pt-BR «O OpenVireo é uma reconstrução web não oficial do VIREO…»).
   `src/seo/pages.test.ts` requires "unofficial" / «no oficial» / «não oficial» in the h1 or lead of each language and "rebuilt" /
   «reconstruid…» / «reconstruíd…» in the h1. The pre-render follows from the same keys.
6. Fixed. `tests/release/pages-smoke.pages.ts` ROUTES includes `#home` (English and es-MX); the per-language observatory walk
   (`tests/i18n/observatory.spec.ts`, es-419 and pt-BR, and qps) visits the welcome first; `tests/home.spec.ts` covers finding 1
   and Help › Tour replay from the welcome.
7. Fixed. `scheduleFirstVisitTour` (src/components/SiteTour.tsx) takes an optional `ran` callback, called when its timer runs; the
   cleanup resets the scheduled flag only if the timer has not run.
8. Deferred: rewording the tour touches the es and pt-BR tour maps and is not needed for the release.
9. Fixed: "Loading OpenVireo…".
10. No change (accepted as is).
11. Fixed: es-419 `home.lead` says «mides el brillo de las estrellas», as /es/ does; pt-BR «Um mistério só com as coordenadas: …».
- Info: no change in this front; lazily mounting the observatory is a separate follow-up.

### After review: CI on the merged branch

The full CI run on `claude/front-home` (after merging main at `dd96cc4`) failed one test: `tests/render-budget.spec.ts`, "openDome
renders 31 components; budget 30". The hidden welcome re-rendered on every observatory state change because it was not memoised
and received an inline `onExplore`. Fix by the coordinator (Claude Opus 5.5): `Welcome` is exported through `memo`, like the other
route views, and `onExplore` is the stable handler `stable.explore`; `openGuide` was already memoised over stable callbacks. A
language change reloads the page (`LanguageChoice.tsx`), so the memoised text cannot go stale. The budget is unchanged.
`render-budget.spec.ts` and `home.spec.ts` pass (19/19).
