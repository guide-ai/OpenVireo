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

# Front PT-SEO: Brazilian Portuguese search pages

User decisions 8 of 2026-11-09 and of the same day on the next languages (AGENTS.md): after the Brazilian Portuguese release
(PT-REL), its home page `/pt-br/` and lab pages `/pt-br/labs/`, with `hreflang` and a Portuguese preview image, following the
Spanish architecture. Static site only; no new external service. The language rules are in `docs/I18N.md`, "Brazilian Portuguese:
search pages (PT-SEO)".

## What changed

- **Data only.** A `pt-BR` row in `src/seo/languages.ts` (`SEO_LANGUAGES`), its lab texts in `src/seo/labs.pt-br.ts`, its prefix
  `/pt-br` in `SEO_PATH_PREFIX` (`src/seo/labSlugs.ts`; equal to the registry's `pagePath`). `src/seo/pages.ts` and the Vite plugin
  are unchanged: they render the row.
- **Portuguese pages**: `/pt-br/` (static home: what OpenVireo is, «Abrir o observatório», the seven labs, how it works, the credit),
  `/pt-br/labs/` and `/pt-br/labs/<slug>/` with the English slugs. `<html lang="pt-BR">`, Portuguese titles (≤ 65 characters) and
  descriptions (110–160), self canonical, `og:locale` `pt_BR` with `og:locale:alternate` `en_US` and `es_LA`, Portuguese JSON-LD
  (`WebApplication` on `/pt-br/`, `ItemList` on the index, `LearningResource` with `inLanguage` `pt-BR`, `educationalLevel` «Ensino
  médio»/«Ensino superior» and breadcrumbs on each lab, `isBasedOn` crediting Project CLEA, Gettysburg College and the NSF as the
  English pages do). «Abrir a prática» goes to `/?lang=pt-BR#lab=<slug>`. The lab names are the app's own pt-BR names («Classificação
  estelar», «Fotometria das Plêiades», «Objeto X»…). The footer says the text is OpenVireo's web adaptation, not CLEA's.
- **hreflang** on every page pair (27 pages, 9 per language): `en`, `es`, `pt-BR`, `pt` and `x-default` → English. `pt-BR` is a
  valid Google `hreflang` (ISO 639-1 + ISO 3166-1 alpha-2) and names the Brazilian audience; `pt` is added for the same URL because
  the app opens pt-BR for every `pt`/`pt-*` browser (pt-PT, pt-AO, pt-MZ: PT-REL), so a Portuguese searcher outside Brazil is sent to
  the Portuguese page, not to the English x-default (as Spanish's `es` covers every `es-*`). Google accepts several `hreflang` values
  for one URL. The sitemap lists all 27 addresses with the same five alternates. English and Spanish pages gain `og:locale:alternate`
  `pt_BR` and a visible «Português (Brasil)» link (`hreflang`/`lang` `pt-BR`) to their Portuguese version; nothing else in their HTML
  changed, and `index.html`'s body is untouched (only its alternates, built from the table, gain the two Portuguese links).
- **App**: the observatory footer's labs link goes to `/pt-br/labs/` when the app is in Portuguese (`labsIndexUrl(uiLanguage())`,
  unchanged code: the prefix table).
- **Preview image** `public/og-image-pt-br.png` (1200×630, SHA-256 `e2cc4b78…d645d7`): the design of the other two with Portuguese
  text, rendered by `node scripts/render-og-image.mjs pt-BR` with the project's test fontconfig; an original drawing, no CLEA image.
  Two renders gave the same bytes.
- **Headers**: `/pt-br/*` is `no-cache`, like `/labs/*` and `/es/*` (`public/_headers`, `src/deployHeaders.test.ts`).

## Tests

- `src/seo/languages.test.ts`, generalised per language: the table (registry `released` and `pagePath`, `hreflang` codes, og
  locale and image); per language, title and description lengths and uniqueness (also across languages), the reconstruction
  phrase, the language's **SC4 lint profile and glossary** over every page string (glossary terms and names, forbidden forms,
  register, claims, typography, quotes, digits, NFC, invisible characters; glyph parity and the length ratio are left out, as the
  pages are free prose), no claim of being CLEA's, the adaptation sentence and the CLEA/Gettysburg/NSF credit; the dist-marker guard
  for **every registered language** (its markers only on its own `/<pagePath>/` pages); each page's lang, canonical, `og:*`, one
  `h1`, JSON-LD, links that stay in the language except one link to each other language; reciprocal `hreflang` on all 27 pages and
  the same alternates in the sitemap.
- `tests/i18n/seo.spec.ts` (was `es-seo.spec.ts`): the same flows for every language with pages; the Spanish tests keep their titles.
- `tests/release/pages-smoke.pages.ts`: the Portuguese pages and image with the release headers, the 308s, the five alternates on
  `/` and each home, the sitemap, and a Portuguese lab page opening the app under the release policy (only pt-BR chunks fetched).

## For the user (not done by the site)

After the deploy: in Google Search Console resubmit `https://openvireo.space/sitemap.xml` (it now lists 27 addresses) and use URL
Inspection on `https://openvireo.space/pt-br/` and one Portuguese lab page (for example `/pt-br/labs/hubble/`), then «Request
indexing». URL Inspection shows the canonical Google chose; an OpenSEO site audit can check the alternates. The same in Bing
Webmaster Tools if wanted. OpenSEO can track Brazilian keywords (for example «prática lei de Hubble», «CLEA astronomia», «diagrama
HR aglomerados») with Brazil as the market.

# Front FR-SEO: French search pages

User decision 8 of 2026-11-09 and the French decisions of 2026-11-11 (AGENTS.md): with the French release (FR-REL, the same front,
FR-REL+SEO), its home page `/fr/` and lab pages `/fr/labs/`, with `hreflang` and a French preview image, following PT-SEO's
data-driven design. Static site only; no new external service. The language rules are in `docs/I18N.md`, "French: release and
search pages (FR-REL+SEO)".

## What changed

- **Data only.** An `fr` row in `src/seo/languages.ts` (`SEO_LANGUAGES`), its lab texts in `src/seo/labs.fr.ts`, its prefix `/fr`
  in `SEO_PATH_PREFIX` (`src/seo/labSlugs.ts`; equal to the registry's `pagePath`). `src/seo/pages.ts`, the Vite plugin and the
  image renderer are unchanged: they render the row.
- **French pages**: `/fr/` (static home: what OpenVireo is, «Ouvrir l’observatoire», the seven labs, how it works, the credit),
  `/fr/labs/` and `/fr/labs/<slug>/` with the English slugs. `<html lang="fr">`, French titles (47–62 characters) and descriptions
  (154–159), self canonical, `og:locale` `fr_FR` (Open Graph needs a territory; `hreflang` stays `fr`) with `og:locale:alternate`
  `en_US`, `es_LA` and `pt_BR`, French JSON-LD (`WebApplication` on `/fr/`, `ItemList` on the index, `LearningResource` with
  `inLanguage` `fr`, `learningResourceType` «TP interactif», `educationalLevel` «Lycée»/«Enseignement supérieur» and breadcrumbs on
  each lab, `isBasedOn` crediting Project CLEA, Gettysburg College and the NSF as the English pages do). «Ouvrir le TP» goes to
  `/?lang=fr#lab=<slug>`. A lab is a «TP» (decision D4 of the French plan) and the lab names are the app's own French names
  («Classification stellaire», «Photométrie des Pléiades», «Diagrammes HR d’amas», «Objet X»…; «Pulsars» is the same word in both
  languages). The text addresses the reader as «vous», uses U+202F before `: ; ? !` and the apostrophe ’ (written as characters by
  the French typography fixer), and the home's «Comment ça marche» adds, as the Portuguese one does, that on screen numbers use a
  decimal point and a thin space between thousands («24 000», U+202F). The footer says «Ce texte en français est une adaptation web
  d’OpenVireo, pas un texte du CLEA.»
- **hreflang** on every page pair (36 pages, 9 per language): `en`, `es`, `pt-BR`, `pt`, `fr` and `x-default` → English. `fr` alone
  (ISO 639-1, valid for Google) names one neutral French that the app opens for every `fr`/`fr-*` browser (fr-FR, fr-CA, fr-BE,
  fr-CH, fr-SN…: FR-REL), so every French searcher is sent to it. The sitemap lists all 36 addresses with the same six alternates.
  English, Spanish and Portuguese pages gain `og:locale:alternate` `fr_FR` and a visible «Français» link (`hreflang`/`lang` `fr`) to
  their French version; nothing else in their HTML changed, and `index.html`'s body is untouched (only its alternates, built from the
  table, gain the French link).
- **App**: the observatory footer's labs link goes to `/fr/labs/` when the app is in French (`labsIndexUrl(uiLanguage())`, the
  prefix table, which the app bundle carries: one more entry, `fr:'/fr'`).
- **Preview image** `public/og-image-fr.png` (1200×630, SHA-256 `6468de69…47114d`): the design of the others with French text («TP d’astronomie
  CLEA VIREO dans votre navigateur»), rendered by `node scripts/render-og-image.mjs fr` with the project's test fontconfig; an
  original drawing, no CLEA image. Its second line first read «…non officielle, en français. Rien à installer.», which the renderer
  refused (two lines at 29 px); «en français» was dropped. Two renders gave the same bytes.
- **Headers**: `/fr/*` is `no-cache`, like `/labs/*`, `/es/*` and `/pt-br/*` (`public/_headers`, `src/deployHeaders.test.ts`).

## Tests

- `src/seo/languages.test.ts`: French joins the per-language checks with its own rules (profile `fr`, glossary field `fr`, the French
  claims, reconstruction phrase, adaptation and credit sentences, `fr_FR`, its image); titles may start «OpenVireo\u202f: »; a lab
  name may equal the English one only where the rule says so (French «Pulsars»). The alternates are `en`, `es`, `pt-BR`, `pt`, `fr`,
  `x-default` on all 36 pages and in the sitemap. `src/seo/pages.test.ts` (36 sitemap addresses) and `src/seo/direction.test.ts`
  (the French link in the RTL-fixture pages) follow.
- `tests/i18n/seo.spec.ts`: the same flows for French (`/fr/`, «Ouvrir le TP» on the pulsar and Object X pages, English back).
- `tests/release/pages-smoke.pages.ts`: the French pages and image with the release headers, the 308s, the six alternates on `/` and
  each home, the sitemap, and a French lab page opening the app under the release policy (only fr chunks fetched).

## For the user (not done by the site)

After the deploy: in Google Search Console resubmit `https://openvireo.space/sitemap.xml` (it now lists 36 addresses) and use URL
Inspection on `https://openvireo.space/fr/` and one French lab page (for example `/fr/labs/hubble/`), then «Request indexing». The
same in Bing Webmaster Tools if wanted. OpenSEO can track French keywords (for example «TP loi de Hubble», «CLEA astronomie», «TP
diagramme HR amas») with France, Belgium, Switzerland or Canada as the market.

# Front ID-SEO: Indonesian search pages

User decision 8 of 2026-11-09 and the Indonesian decisions of 2026-11-19 (AGENTS.md): with the Indonesian release (ID-REL, the same
front, ID-REL+SEO), its home page `/id/` and lab pages `/id/labs/`, with `hreflang` and an Indonesian preview image, following
PT-SEO's data-driven design as FR-SEO did. Static site only; no new external service. The language rules are in `docs/I18N.md`,
"Indonesian: release and search pages (ID-REL+SEO)".

## What changed

- **Data only.** An `id` row in `src/seo/languages.ts` (`SEO_LANGUAGES`), its lab texts in `src/seo/labs.id.ts`, its prefix `/id`
  in `SEO_PATH_PREFIX` (`src/seo/labSlugs.ts`; equal to the registry's `pagePath`). `src/seo/pages.ts`, the Vite plugin and the
  image renderer are unchanged: they render the row.
- **Indonesian pages**: `/id/` (static home: what OpenVireo is, «Buka observatorium», the seven labs, «Cara kerja», the credit),
  `/id/labs/` and `/id/labs/<slug>/` with the English slugs. `<html lang="id">`, Indonesian titles (49–64 characters) and
  descriptions (146–160), self canonical, `og:locale` `id_ID` with `og:locale:alternate` `en_US`, `es_LA`, `pt_BR` and `fr_FR`,
  Indonesian JSON-LD (`learningResourceType` «Praktikum interaktif», `educationalLevel` «Sekolah menengah atas»/«Perguruan tinggi»,
  `isBasedOn` crediting Project CLEA, Gettysburg College and the NSF). «Buka praktikum» goes to `/?lang=id#lab=<slug>`. A lab is a
  «praktikum» (the app's word) and the lab names are the app's own Indonesian names («Hukum Hubble», «Struktur skala besar»,
  «Klasifikasi bintang», «Fotometri Pleiades», «Diagram HR gugus bintang», «Pulsar», «Objek X»). The text addresses the reader as
  «Anda» with base-form imperatives, uses the glossary's terms («pergeseran merah», «diagram kerucut», «lebar ekuivalen», «deret
  utama», «denyut», never «pulsa»), and the home's «Cara kerja» adds that on screen numbers use a decimal point and a thin space
  between thousands («24 000», U+202F). The footer says «Teks berbahasa Indonesia ini adalah adaptasi web OpenVireo, bukan teks
  CLEA.» «online» follows the app's own welcome rather than KBBI's «daring».
- **hreflang** on every page pair (45 pages, 9 per language): `en`, `es`, `pt-BR`, `pt`, `fr`, `id` and `x-default` → English. `id`
  alone names the one standard Indonesian that the app opens for every `id`/`id-*` browser and the withdrawn `in`/`in-*` (ID-REL);
  Malay searchers keep the English x-default, as Malay browsers keep English. The sitemap lists all 45 addresses with the same seven
  alternates. English, Spanish, Portuguese and French pages gain `og:locale:alternate` `id_ID` and a visible «Bahasa Indonesia» link
  (`hreflang`/`lang` `id`); `index.html`'s body is untouched (only its alternates, built from the table, gain the Indonesian link).
- **App**: the observatory footer's labs link goes to `/id/labs/` when the app is in Indonesian (the prefix table gains `id:'/id'`).
- **Preview image** `public/og-image-id.png` (1200×630, 279,971 bytes, SHA-256 `556893c3…94271dc3`): the design of the others with
  Indonesian text («Praktikum astronomi CLEA VIREO di browser Anda», with a no-break space keeping «CLEA VIREO» on one line), rendered by `node scripts/render-og-image.mjs id` with the
  project's test fontconfig; an original drawing, no CLEA image. Two renders gave the same bytes.
- **Headers**: `/id/*` is `no-cache`, like `/labs/*`, `/es/*`, `/pt-br/*` and `/fr/*` (`public/_headers`, `src/deployHeaders.test.ts`).

## Tests

- `src/seo/languages.test.ts`: Indonesian joins the per-language checks with its own rules (profile `id`, glossary field `id`, the
  Indonesian claims «versi resmi», «terjemahan resmi», «program resmi», the reconstruction phrase «Rekonstruksi web gratis», the
  adaptation and credit sentences, `id_ID`, its image); no rule needed an explicit Indonesian case. The alternates are `en`, `es`,
  `pt-BR`, `pt`, `fr`, `id`, `x-default` on all 45 pages and in the sitemap; the unreleased-language fallback of `labsIndexUrl` is
  checked with Hindi. `src/seo/pages.test.ts` (45 sitemap addresses, the five-language 404) and `src/seo/direction.test.ts` (the
  Indonesian link in the RTL-fixture pages) follow.
- `tests/i18n/seo.spec.ts`: the same flows for Indonesian (`/id/`, «Buka praktikum» on the pulsar and Object X pages, English back).
- `tests/release/pages-smoke.pages.ts`: the Indonesian pages and image with the release headers, the 308s, the seven alternates on
  `/` and each home, the sitemap, and an Indonesian lab page opening the app under the release policy (only id chunks fetched).

## For the user (not done by the site)

After the deploy: in Google Search Console resubmit `https://openvireo.space/sitemap.xml` (it now lists 45 addresses) and use URL
Inspection on `https://openvireo.space/id/` and one Indonesian lab page (for example `/id/labs/hubble/`), then «Request indexing».
The same in Bing Webmaster Tools if wanted. OpenSEO can track Indonesian keywords (for example «praktikum hukum Hubble», «CLEA
astronomi», «diagram HR gugus bintang») with Indonesia as the market.

# Front HI-SEO: Hindi search pages

User decision 8 of 2026-11-09 and the Hindi decisions of 2026-11-19 (AGENTS.md): with the Hindi release (HI-REL, the same front,
HI-REL+SEO), its home page `/hi/` and lab pages `/hi/labs/`, with `hreflang` and a Hindi preview image, following FR-SEO's
data-driven design. Static site only; no new external service. The language rules are in `docs/I18N.md`, "Hindi: release and
search pages (HI-REL+SEO)".

## What changed

- **Data only.** An `hi` row in `src/seo/languages.ts` (`SEO_LANGUAGES`), its lab texts in `src/seo/labs.hi.ts`, its prefix `/hi` in
  `SEO_PATH_PREFIX` (`src/seo/labSlugs.ts`; equal to the registry's `pagePath`). `src/seo/pages.ts`, the Vite plugin and the image
  renderer are unchanged: they render the row.
- **Hindi pages**: `/hi/` (static home), `/hi/labs/` and `/hi/labs/<slug>/` with the English slugs. `<html lang="hi">`, Hindi titles
  (51–63 characters) and descriptions (146–160), self canonical, `og:locale` `hi_IN` with the other languages' locales as
  alternates, Hindi JSON-LD (`learningResourceType` «इंटरैक्टिव प्रयोग», `educationalLevel` «हाई स्कूल»/«स्नातक स्तर»,
  `isBasedOn` crediting Project CLEA, Gettysburg College and the NSF). «प्रयोग खोलें» goes to `/?lang=hi#lab=<slug>`. A lab is a
  «प्रयोग», and the lab names are the app's own Hindi names («हबल का नियम», «बृहत् पैमाने की संरचना», «तारों का वर्गीकरण»,
  «कृत्तिका (Pleiades) फ़ोटोमेट्री», «तारागुच्छों के H-R आरेख», «पल्सर», «ऑब्जेक्ट X»). The text addresses the reader as आप
  with -एँ imperatives and ends sentences with «।»; the footer says «यह हिन्दी पाठ OpenVireo का वेब अनुकूलन है, CLEA का पाठ नहीं।»
- **hreflang** on every page pair (54 pages, 9 per language): `en`, `es`, `pt-BR`, `pt`, `fr`, `id`, `hi` and `x-default` → English. `hi`
  alone names the one Hindi that the app opens for every `hi`/`hi-*` browser (HI-REL). The sitemap lists all 54 addresses with the
  same eight alternates. The other languages' pages gain `og:locale:alternate` `hi_IN` and a visible «हिन्दी» link to their Hindi
  version; `index.html`'s body is untouched.
- **App**: the observatory footer's labs link goes to `/hi/labs/` when the app is in Hindi (the prefix table gains `hi:'/hi'`).
- **Preview image** `public/og-image-hi.png` (1200×630, SHA-256 `77547d02…d4870a`): the design of the others with Hindi text («आपके
  ब्राउज़र में CLEA VIREO खगोल प्रयोग»), rendered by `node scripts/render-og-image.mjs hi` under the scripts fontconfig of `npm run
  test-fonts` (Noto Sans Devanagari for the Hindi, DejaVu Sans for the Latin); an original drawing, no CLEA image. Two renders
  gave the same bytes. Its second line first read «…, बिना इंस्टॉल के।», which the review found colloquial; it now reads «…, बिना
  कुछ इंस्टॉल किए।», as the home's note does.
- **Styles**: `public/labs/labs.css` gains three rules for `lang="hi"` (the Hindi pages and the 404 page's Hindi block), as the
  app's `src/theme/scripts.css` does: Devanagari faces after the Latin ones, no letter-spacing or upper case on the eyebrow (Latin
  devices that break Devanagari), and heading lines of 1.5 for the marks above and below the line. Other languages' pages are
  unchanged.
- **Headers**: `/hi/*` is `no-cache`, like the other languages' pages (`public/_headers`, `src/deployHeaders.test.ts`).
- **404**: the shared page gains Hindi's block («पेज नहीं मिला», its title word «नहीं मिला»).

## Tests

- `src/seo/languages.test.ts`: Hindi joins the per-language checks with its own rules (profile `hi`, glossary field `hi`, Hindi
  claims, reconstruction phrase «मुफ़्त वेब पुनर्निर्माण», home description starting «मुफ़्त और गैर-आधिकारिक वेब पुनर्निर्माण»,
  adaptation and credit sentences, `hi_IN`, its image). `src/seo/pages.test.ts` (54 sitemap addresses, the 404 title) and
  `src/seo/direction.test.ts` follow.
- `tests/i18n/seo.spec.ts`: the same flows for Hindi (`/hi/`, «प्रयोग खोलें» on the pulsar and Object X pages, English back).
- `tests/scripts/hindi.scripts.ts` (`npm run test:scripts`): `/hi/`, `/hi/labs/` and `/hi/labs/object-x/` at 320 and 1440 px under
  Noto Sans Devanagari: no overflow, clipping or cut ink, the eyebrow without letter-spacing or upper case, the heading drawn by
  Noto Sans Devanagari (and DejaVu for its Latin).
- `tests/release/pages-smoke.pages.ts`: the Hindi pages and image with the release headers, the 308s, the eight alternates on `/`
  and each home, the sitemap, and a Hindi lab page opening the app under the release policy (only hi chunks fetched).

## For the user (not done by the site)

After the deploy: in Google Search Console resubmit `https://openvireo.space/sitemap.xml` (it now lists 54 addresses) and use URL
Inspection on `https://openvireo.space/hi/` and one Hindi lab page (for example `/hi/labs/hubble/`), then «Request indexing». OpenSEO
can track Hindi keywords (for example «हबल का नियम प्रयोग», «खगोल विज्ञान प्रयोग ऑनलाइन») with India as the market; most Indian
searchers use English (`en-IN`), which keeps the English pages.

# Front JA-SEO: Japanese search pages

Merged after HI-REL+SEO, so the counts below include Hindi's pages (seven languages, Japanese after Hindi in registry order).

User decision 8 of 2026-11-09 and the Japanese decisions of 2026-11-19 (AGENTS.md): with the Japanese release (JA-REL, the same
front, JA-REL+SEO), its home page `/ja/` and lab pages `/ja/labs/`, with `hreflang` and a Japanese preview image, following FR-SEO's and ID-SEO's
data-driven design. Static site only; no new external service. The language rules are in `docs/I18N.md`, "Japanese: release and
search pages (JA-REL+SEO)".

## What changed

- **Data only.** A `ja` row in `src/seo/languages.ts` (`SEO_LANGUAGES`), its lab texts in `src/seo/labs.ja.ts`, its prefix `/ja`
  in `SEO_PATH_PREFIX` (`src/seo/labSlugs.ts`; equal to the registry's `pagePath`). `src/seo/pages.ts` and the Vite plugin are
  unchanged: they render the row.
- **Japanese pages**: `/ja/` (static home: what OpenVireo is, «天文台を開く», the seven labs, «仕組み», the credit), `/ja/labs/` and
  `/ja/labs/<slug>/` with the English slugs. `<html lang="ja">`, Japanese titles and descriptions, self canonical, `og:locale`
  `ja_JP` with the other languages' `og:locale:alternate`, Japanese JSON-LD (`learningResourceType` «インタラクティブな実習»,
  `educationalLevel` «高校»/«大学», `isBasedOn` crediting Project CLEA, Gettysburg College and the NSF as the English pages do).
  «実習を開く» goes to `/?lang=ja#lab=<slug>`. A lab is a «実習» (the ja glossary) and the lab names are the app's own Japanese names
  (`home.hubble` … `home.objectX`: ハッブルの法則, 大規模構造, 恒星のスペクトル分類, プレアデス測光, 星団のHR図, パルサー, 天体X).
  です/ます in sentences, nouns in headings, no second-person pronoun; full-width 。、：（） next to Japanese and no space between
  Japanese and Latin text or digits (the ja lint profile and CJK fixer). The footer says «この日本語の文章は、OpenVireoがWeb向けに翻案したもので、CLEAの文章ではありません。»; «仕組み» adds that the screen and inputs use «.» as the decimal point with half-width digits, that the
  files the site writes stay English (its own item), and that the selector at the top switches to English.
- **Lengths in display columns** (plan front-i18n-ja.md §1.2 #7): `src/seo/languages.test.ts` now measures every language's titles
  and descriptions with `displayColumns` (a kanji or kana counts two, as a search result draws it; Latin text is unchanged, one per
  character). Japanese titles are 41–61 columns (≤ 65), descriptions 110–160 (about 70–90 characters, Latin letters counting one column). The plan suggested
  160–240 columns for CJK descriptions; the shared 110–160 band was kept, since Japanese results cut near 50 characters on phones and
  80–120 on desktops, so the whole description shows on desktop and its first sentence on phones.
- **Titles** end « · OpenVireo» (or start «OpenVireo: » on the home) with no 「（CLEA VIREO）」 bracket: the CJK fixer drops the space
  beside a full-width bracket, so «CLEA VIREO» is part of the phrase instead («…を学ぶCLEA VIREOの実習 · OpenVireo»).
- **Glossary**: the ja glossary requires 星団 where the English says "clusters"; in the large-scale-structure item "What clusters,
  walls, filaments and voids are" those are galaxy clusters (銀河団), so the ja rule's `english` hook hides that one word from the
  glossary check, with a comment in the test.
- **hreflang** on every page pair (63 pages, 9 per language): `en`, `es`, `pt-BR`, `pt`, `fr`, `id`, `hi`, `ja` and `x-default` → English. `ja`
  names the one Japanese that every `ja`/`ja-*` browser opens (JA-REL). The sitemap lists all 63 addresses with the same nine
  alternates; the other languages' pages gain `og:locale:alternate` `ja_JP` and a visible «日本語» link (`hreflang`/`lang` `ja`).
- **App**: the observatory footer's labs link goes to `/ja/labs/` when the app is in Japanese (the prefix table gains `ja:'/ja'`).
- **Preview image** `public/og-image-ja.png` (1200×630, SHA-256 `de28983f…b073c6`): the design of the others with Japanese text
  («CLEA VIREOの天文実習をブラウザーで»), rendered by `node scripts/render-og-image.mjs ja` under the CJK test fontconfig
  (`~/.cache/openvireo-test-fonts/scripts/fonts.conf`: Noto Sans CJK JP from the Ubuntu archive, OFL; the image ships no font file).
  The renderer's heading now has `word-break:auto-phrase`, which breaks Japanese between phrases (the first render split ブラウ|ザー)
  and leaves other languages as they were (the French image re-renders byte-identical). Two renders gave the same bytes.
- **Headers**: `/ja/*` is `no-cache`, like `/labs/*`, `/es/*`, `/pt-br/*`, `/fr/*`, `/id/*` and `/hi/*` (`public/_headers`, `src/deployHeaders.test.ts`).
- **404**: the shared 404 page gains a `<section lang="ja">` («ページが見つかりません», «このアドレスはOpenVireoのサイトにはありません。»,
  «天文台を開く» to `/?lang=ja#observatory`), and its title ends « · 見つかりません».

## Tests

- `src/seo/languages.test.ts`: Japanese joins the per-language checks with its own rules (profile `ja`, glossary field `ja`, the
  Japanese claims, reconstruction phrase, adaptation and credit sentences, `ja_JP`, its image); lengths in display columns for every
  language. `src/seo/pages.test.ts` (63 sitemap addresses, the seven-language 404) and `src/seo/direction.test.ts` (the Japanese link
  in the RTL-fixture pages) follow.
- `tests/i18n/seo.spec.ts`: the same flows for Japanese (`/ja/`, «実習を開く» on the pulsar and Object X pages, English back).
- `tests/release/pages-smoke.pages.ts`: the Japanese pages and image with the release headers, the 308s, the nine alternates on `/`
  and each home, the sitemap, the 404's Japanese section, and a Japanese lab page opening the app under the release policy.

# Front RU-SEO: Russian search pages

Merged before HI-REL+SEO, which reached main after it: with Hindi's pages the merged tree has eight languages (Hindi between
Indonesian and Japanese, Russian last), 72 pages with ten alternates each (`hi` among them), `/hi/*` in the headers list, an
eight-language 404 and 72 sitemap addresses. The counts below are those of the Russian front as reviewed.

User decision 8 of 2026-11-09 and the Russian decisions of 2026-11-19 (AGENTS.md): with the Russian release (RU-REL, the same front,
RU-REL+SEO), its home page `/ru/` and lab pages `/ru/labs/`, with `hreflang` and a Russian preview image, following PT-SEO's
data-driven design as FR-SEO and ID-SEO did. Static site only; no new external service. The language rules are in `docs/I18N.md`,
"Russian: release and search pages (RU-REL+SEO)".

## What changed

- **Data only.** A `ru` row in `src/seo/languages.ts` (`SEO_LANGUAGES`), its lab texts in `src/seo/labs.ru.ts`, its prefix `/ru`
  in `SEO_PATH_PREFIX` (`src/seo/labSlugs.ts`; equal to the registry's `pagePath`). `src/seo/pages.ts`, the Vite plugin and the
  image renderer are unchanged: they render the row.
- **Russian pages**: `/ru/` (static home: what OpenVireo is, «Открыть обсерваторию», the seven labs, «Как это работает», the
  credit), `/ru/labs/` and `/ru/labs/<slug>/` with the English slugs. `<html lang="ru">`, Russian titles (48–63 characters) and
  descriptions (149–160), self canonical, `og:locale` `ru_RU` with `og:locale:alternate` `en_US`, `es_LA`, `pt_BR`, `fr_FR`,
  `id_ID` and `ja_JP`, Russian JSON-LD (`learningResourceType` «Интерактивная лабораторная работа», `educationalLevel` «Старшая школа»/«Высшее
  образование», `isBasedOn` crediting Project CLEA, Gettysburg College and the NSF). «Открыть работу» goes to `/?lang=ru#lab=<slug>`.
  A lab is a «лабораторная работа», shortened to «работа» (the app's word since RU0), and the lab names are the app's own Russian
  names from its welcome («Закон Хаббла», «Крупномасштабная структура», «Классификация звёзд», «Фотометрия Плеяд», «Диаграммы
  Г — Р скоплений», «Пульсары», «Объект X»; the Object X guide the lab page opens is «Поиск Объекта X»). The text addresses the
  reader as lower-case «вы» with вы-imperatives («Измерьте», «Наведите», «Запишите»), writes ё, sentence case and « — » with a
  no-break space before it, and uses the glossary's terms («красное смещение», «клиновидная диаграмма», «эквивалентная ширина»,
  «главная последовательность», «мера дисперсии», «ПЗС-камера», «скопление», never «кластер»). The home's «Как это работает» carries
  the plan's numbers sentence (§4.1): the decimal point on screen and a narrow space between thousands («24 000», U+202F), decimals
  typed with a point, and files the site writes staying English as VIREO writes them. The footer says «Этот текст на русском языке —
  веб-адаптация OpenVireo, а не текст CLEA.»
- **hreflang** on every page pair (63 pages, 9 per language): `en`, `es`, `pt-BR`, `pt`, `fr`, `id`, `ja`, `ru` and
  `x-default` → English (`ja` since JA-REL+SEO, merged first). `ru` alone names the one Russian that the app opens for every `ru`/`ru-*` browser (RU-REL); Ukrainian, Belarusian and
  Kazakh searchers keep the English x-default, as those browsers keep English. The sitemap lists all 63 addresses with the same
  nine alternates. English, Spanish, Portuguese, French, Indonesian and Japanese pages gain `og:locale:alternate` `ru_RU` and a visible
  «Русский» link (`hreflang`/`lang` `ru`); `index.html`'s body is untouched (only its alternates, built from the table, gain the
  Russian link).
- **App**: the observatory footer's labs link goes to `/ru/labs/` when the app is in Russian (the prefix table gains `ru:'/ru'`).
- **Preview image** `public/og-image-ru.png` (1200×630, 282,495 bytes, SHA-256 `c3204bbb…86726261`): the design of the others with
  Russian text («Работы по астрономии CLEA VIREO в браузере», with no-break spaces keeping «CLEA VIREO» and «в браузере» together;
  the title fits two lines only without «вашем»), rendered by `node scripts/render-og-image.mjs ru` with the project's test
  fontconfig (DejaVu, which has Cyrillic); an original drawing, no CLEA image. Two renders gave the same bytes.
- **Headers**: `/ru/*` is `no-cache`, like `/labs/*`, `/es/*`, `/pt-br/*`, `/fr/*`, `/id/*` and `/ja/*`
  (`public/_headers`, `src/deployHeaders.test.ts`).

## Tests

- `src/seo/languages.test.ts`: Russian joins the per-language checks with its own rules (profile `ru`, glossary field `ru`, the
  Russian claims «официальная версия», «официальный перевод», «перевод CLEA», the reconstruction phrase «Бесплатная
  веб-реконструкция», the adaptation and credit sentences, `ru_RU`, its image). As for Spanish, "star cluster" is matched as
  "cluster" (the app's «Диаграммы Г — Р скоплений» reads «скопление» alone where the context is clear). The alternates are `en`,
  `es`, `pt-BR`, `pt`, `fr`, `id`, `ja`, `ru`, `x-default` on all 63 pages and in the sitemap. `src/seo/pages.test.ts` (63 sitemap
  addresses, the seven-language 404) and `src/seo/direction.test.ts` (the Russian link in the RTL-fixture pages) follow.
- `tests/i18n/seo.spec.ts`: the same flows for Russian (`/ru/`, «Открыть работу» on the pulsar and Object X pages, English back).
- `tests/release/pages-smoke.pages.ts`: the Russian pages and image with the release headers, the 308s, the nine alternates on
  `/` and each home, the sitemap, and a Russian lab page opening the app under the release policy (only ru chunks fetched).

## For the user (not done by the site)

After the deploy: in Google Search Console resubmit `https://openvireo.space/sitemap.xml` (it now lists 72 addresses, Hindi's
included) and use URL Inspection on `https://openvireo.space/ja/` and `https://openvireo.space/ru/` and one lab page of each (for example
`/ja/labs/hubble/`, `/ru/labs/hubble/`), then «Request indexing». The same in Bing Webmaster Tools if wanted; Yandex Webmaster is
the main Russian-language search console, and adding the site there would be a new external service that needs the user's own
decision. OpenSEO can track Japanese keywords (for example «ハッブルの法則 実習», «CLEA 天文», «HR図 星団 実習») with Japan as the
market, and Russian keywords (for example «закон Хаббла лабораторная работа», «CLEA астрономия», «диаграмма Герцшпрунга — Рассела
скопления») with Russia as the market.

# Front ZH-SEO: Simplified Chinese search pages

User decision 8 of 2026-11-09 and the Chinese decisions of 2026-11-19 (AGENTS.md): with the Simplified Chinese release (ZH-REL, the
same front, ZH-REL+SEO), its home page `/zh-hans/` and lab pages `/zh-hans/labs/`, with `hreflang` and a Chinese preview image,
following PT-SEO's data-driven design as the other languages did. Static site only; no new external service (Baidu is not targeted:
Baidu's webmaster tools would be one). The language rules are in `docs/I18N.md`, "Simplified Chinese: release and search pages
(ZH-REL+SEO)".

## What changed

- **Data only.** A `zh-Hans` row in `src/seo/languages.ts` (`SEO_LANGUAGES`, between Japanese and Russian, in registry order), its
  lab texts in `src/seo/labs.zh-hans.ts`, its prefix `/zh-hans` in `SEO_PATH_PREFIX` (`src/seo/labSlugs.ts`; equal to the
  registry's `pagePath`). `src/seo/pages.ts`, the Vite plugin and the image renderer are unchanged: they render the row.
- **Chinese pages**: `/zh-hans/` (static home: what OpenVireo is, «打开天文台», the seven labs, «使用方式», the credit),
  `/zh-hans/labs/` and `/zh-hans/labs/<slug>/` with the English slugs. `<html lang="zh-Hans">`, Chinese titles (38–47 display
  columns, a Han character counting two) and descriptions (112–120), self canonical, `og:locale` `zh_CN`, Chinese JSON-LD
  (`learningResourceType` «交互式实验», `educationalLevel` «高中»/«大学本科», `isBasedOn` crediting Project CLEA, Gettysburg College and
  the NSF). «打开实验» goes to `/?lang=zh-Hans#lab=<slug>`. A lab is a «实验» and an investigation a «探究» (the app's words since
  ZH0), and the lab names are the app's own Chinese names from its welcome («哈勃定律», «大尺度结构», «恒星分类», «昴星团测光»,
  «星团赫罗图», «脉冲星», «天体X»). The text addresses the reader as 你, writes full-width ，。、：；？！（） next to Han with no space
  between Han and Latin text or digits, and uses the glossary's terms («红移», «楔形图», «等值宽度», «主序», «色散量», «CCD相机»,
  «光谱分析器»). The home's «使用方式» carries the numbers sentence: the decimal point on screen and in typed input, half-width digits
  (Chinese writes «24,000» as English, so no thousands sentence), and files the site writes staying English. The footer says
  «本页中文文本是OpenVireo的网页改编，不是CLEA的文本。» (the plan's footer, without the spaces around OpenVireo that the CJK
  typography forbids).
- **hreflang** on every page pair (81 pages, 9 per language): `en`, `es`, `pt-BR`, `pt`, `fr`, `id`, `hi`, `ja`, `zh-Hans`, `ru` and
  `x-default` → English. `zh-Hans` is a script subtag, which Google's hreflang guide names for Simplified Chinese (checked on
  2026-11-21; it also derives the Simplified script from `zh-CN`, `zh-SG` and the like); the table's format check now admits an
  ISO 15924 script between language and region. Traditional searchers (`zh-TW`, `zh-HK`, `zh-MO`) keep the English x-default, as
  those browsers keep English until zh-Hant exists. The sitemap lists all 81 addresses with the same alternates. Every other
  language's pages gain `og:locale:alternate` `zh_CN` and a visible «简体中文» link (`hreflang`/`lang` `zh-Hans`).
- **App**: the observatory footer's labs link goes to `/zh-hans/labs/` when the app is in Simplified Chinese (the prefix table gains
  `'zh-Hans':'/zh-hans'`).
- **404 page**: an eighth `<section>` (the ninth language, after the English block), «找不到页面 · 此地址不属于OpenVireo。», under `lang="zh-Hans"`, linking `/?lang=zh-Hans#observatory`
  («打开天文台»), and «未找到» in the title.
- **Preview image** `public/og-image-zh-hans.png` (1200×630, 276,670 bytes, SHA-256 `546fa792…b3e3ae9`): the design of the others
  with Chinese text («浏览器中的CLEA VIREO天文实验», shortened from «在浏览器中进行…» because that title broke inside «天文实验» at 1040
  px), rendered by `node scripts/render-og-image.mjs zh-Hans` with the scripts fontconfig (Noto Sans CJK SC for `lang="zh-Hans"`);
  an original drawing, no CLEA image. Two renders gave the same bytes.
- **Headers**: `/zh-hans/*` is `no-cache`, like the other language prefixes (`public/_headers`, `src/deployHeaders.test.ts`).

## Tests

- `src/seo/languages.test.ts`: Simplified Chinese joins the per-language checks with its own rules (profile `zh-Hans`, glossary field
  `zh-Hans`, the claims «官方翻译», «官方版本», «CLEA的翻译» and the like, never «非官方», the reconstruction phrase «免费网页重建版»,
  the home's «免费、非官方的网页重建版», the adaptation and credit sentences, `zh_CN`, its image). `src/seo/pages.test.ts` (81 sitemap
  addresses, the nine-language 404) and `src/seo/direction.test.ts` (the Chinese link in the RTL-fixture pages) follow.
- `tests/i18n/seo.spec.ts`: the same flows for Simplified Chinese (`/zh-hans/`, «打开实验» on the pulsar and Object X pages, English
  back).
- `tests/release/pages-smoke.pages.ts`: the Chinese pages and image with the release headers, the 308s, the alternates on `/` and
  each home, the sitemap, the 404's Chinese section, and a Chinese lab page opening the app under the release policy.

## For the user (not done by the site)

After the deploy: in Google Search Console resubmit `https://openvireo.space/sitemap.xml` (it now lists 81 addresses) and use URL
Inspection on `https://openvireo.space/zh-hans/` and one Chinese lab page (for example `/zh-hans/labs/hubble/`), then «Request
indexing». Google is not reachable from mainland China without a VPN, so Chinese search there runs on Baidu (and Bing, which serves
the mainland); adding the site to Baidu's webmaster tools would be a new external service that needs the user's own decision.
OpenSEO can track Simplified Chinese keywords (for example «哈勃定律 实验», «CLEA 天文», «赫罗图 星团 实验») with Singapore and Malaysia,
where Simplified Chinese is written, as markets, since mainland Google results are not available.

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

### Merge with PT-SEO

PT-SEO (main `8d8ba01`) generalised the static pages per language and replaced `tests/i18n/es-seo.spec.ts` with the
parameterised `tests/i18n/seo.spec.ts`. On merging, the coordinator carried HOME's expectations into the new spec and
`src/seo/languages.test.ts` for every language (the app's plain address opens the welcome; "Open the observatory" and a lab
link leave `#observatory`), and added the welcome's two facts (no Windows or virtual machine; the recovered behaviour and the
unofficial reconstruction) to the Portuguese static home page `/pt-br/`, as on `/es/`.

# Front LAZY-OBS: the welcome loads only the shell

Front HOME's independent review measured that the welcome (`/`) loaded exactly what the observatory loads: the observatory view
stayed mounted (hidden) in `OpenVireo.tsx`, and every observatory module, catalog and data module sat in the entry chunk's static
import graph (78 `<link rel=modulepreload>` in the built `index.html`). The site is about to be announced to the general public,
many on phones and mobile data, so the welcome should open fast and cheap. VIREO has no welcome page; this is web delivery only,
and nothing in the exercises, their data or their numerics changed.

Workflow (REVIEW.md): plan by the coordinator (Claude Opus 5.5, high effort); implementation by a subagent (Claude Opus 5.5,
medium effort); independent review pending (below).

## Baseline and mechanism

Measured on a production build (`vite build`, served by `vite preview` on loopback; Chromium; requests of the page's own origin
until the network is idle). Raw is the bytes of the files served; brotli is each file compressed at quality 5, an estimate of what
Cloudflare sends.

| Load | Before (main f404879) | After |
|---|---|---|
| `/` (welcome) | 121 requests, 5.13 MB raw, 1.18 MB brotli: 112 JS chunks (the entry `index` 946 kB with `OpenVireo.tsx`, `SpectrumInstrument`, `CameraControl`…; `slitThroughput` 943 kB with the Hubble fields and native regions; `photometerField` 914 kB with the Pleiades fields; the pinned galaxy and Pegasus fields), 7 CSS, `ObjectX.HTL` | 16 requests, 0.93 MB raw, 0.26 MB brotli: the HTML, the entry and the small chunks it shares with the app's entry (React DOM, the shell, help menus), the English catalog chunk, `LanguageChoice`, 3 CSS |
| `/#observatory` | 121 requests, 5.13 MB raw, 1.18 MB brotli | 123 requests, 5.13 MB raw, 1.18 MB brotli (the same modules; with two entries the bundler splits a few shared chunks more finely) |

Time until the page is usable, three cold loads each with the cache off under a throttled network (150 ms RTT, 1.6 Mbit/s down,
uncompressed as `vite preview` serves it, so absolute times are pessimistic): the welcome's Explore button 6.52 s → 1.98 s;
`#observatory`'s Open dome button 6.56 s → 6.50 s (no regression).

Where the cost came from: the static import graph, not the hidden subtree. The welcome itself fetched only `ObjectX.HTL` at run
time (the shared hot list); everything else was modules the entry imported statically, so mounting the observatory later inside
`OpenVireo.tsx` would have saved almost nothing. The gate therefore sits one level up, at the module boundary:

- **`src/App.tsx`** (the entry's default export, was a re-export of `OpenVireo`) decides once per load with `shellFirst`
  (`src/home/appGate.ts`, pure): the welcome's addresses (no hash, `#`, `#home`) start on the light shell, unless the browser
  remembers instructor mode (VIREO's Demonstration Mode opens it at page load, with its banner). (Until 2026-11-14 the optional
  cloud build, since removed, also loaded the app at once.) Every other address loads the app at once: `src/main.tsx` adds the app's own module entry (`src/appEntry.ts`: `boot`, then
  `OpenVireo`) as a module `<script>` while the page is still loading, and waits for the app (with a language chunk, if any)
  before the first render. A script element delays the load event and a bare dynamic `import()` does not, so the app renders
  before the load event exactly as when it was a static import (measured: header at 260–350 ms, load at 264–358 ms on the
  production build). The first full e2e run without this rendered the app after the load event and failed ~900 specs that act
  right after `page.goto` (an unopened phone Tools menu, `page.clock.pauseAt` before the page existed). `scripts/app-entry-plugin.mjs`
  emits `appEntry` as a chunk of its own in a build and writes its hashed address into `main.tsx`; on the dev server the address
  is the source module. The script is external and same-origin, so the CSP (`script-src 'self'`) is unchanged. `OpenVireo.tsx` is
  a chunk of its own; nothing in the shell imports it.
- **`src/home/WelcomeShell.tsx`**: the sidebar, the page bar and the welcome with the same markup as the app, built by the shared
  **`src/components/AppChrome.tsx`** (moved out of `OpenVireo.tsx`: `siteHeader`, `welcomeMain`, the language slots and the
  failure notices). The screen is pixel-identical (a 1280 × 900 screenshot of the shell equals the app's welcome after
  Explore → brand link). Controls that need nothing more work in place: the theme switch, the project links, the language select,
  View original, the Help menu's files and About this site. Every other control reports what was asked as a `ShellIntent`: a page
  (sidebar, Explore the sky, the results editors), a guide (the seven cards and the Guides menu, the cluster button included),
  Save investigation, Restore investigation (with the chosen file), Instructor mode, Help › Tour, or an address change (Back,
  Forward, an edited hash) to another page.
- **The one gate**: the first intent loads the app (`import('./OpenVireo')`, once per page). Until it is in, the shell stays
  mounted, marked `aria-busy`, with a status line "Loading the observatory…" (`home.loadingObservatory`, new in en, es-419 and
  pt-BR, and French since the merge with FR6's complete French catalog: «Chargement de l’observatoire…»). The app then mounts in place of the shell and performs the intent once, through the same
  handler its own control has (`stable.navigate`, `openGuide[lab]`, `stable.saveProject`, `stable.restoreProject(file)`,
  `stable.askInstructor`, the tour, or the address), so guides that go on to act (Pleiades: the observatory, its hot list and a
  pointing; Hubble's analyzer; the cluster guide's wait for its button), the route-change focus (the observatory's `h1`), the
  first-visit tour's scheduling and the clocks behave exactly as when the app was already there. Before that, the focused control
  is found again in the app's identical chrome (same element, test id, route and name), so the focus stays on More after a
  restore and a guide closed with Escape returns to its card. If the import fails (an old tab after a redeploy), the shell shows
  the site's own notice ("site updated", Reload) from `RouteErrorBoundary`, with the welcome still there.

Behaviour that changed: on the welcome, the first click that needs the app waits for it (about 4.5 s on the throttled network
above, a few hundred ms on broadband; it was instantaneous because everything had been loaded upfront), with the loading line
shown. Nothing is prefetched on idle, on purpose (mobile data). After that first load everything is as before; the welcome after
the app is in is the app's own (no shell, no loading line). Render counts: each load counts 2–3 more components (`App` ×2 among them)
(classificationLoad 173 → 175–176, observatoryLoad 102 → 104–105, varying by one between runs, within their budgets; docs/RENDER-BUDGET.md).

## Tests

- `src/home/appGate.test.ts`: the welcome addresses; the shell only at the welcome, not with Demonstration Mode or the cloud
  build.
- `tests/lazy-observatory.spec.ts` (dev server): `/` requests nothing heavy (no `OpenVireo` module, no `/data/`, `/original/` or
  `/camera/` request, no sky, spectrometer, camera or telescope module); Explore the sky then loads them, focuses "Start with the
  sky.", and the observatory works (dome, target, point, telescope view, camera). The Pleiades card from the welcome opens its
  guide, which reaches the observatory, loads PLEIADES.HTL, opens the dome and points at its first row. `#lab=hubble` and
  `#spectrum` load the app at once (a direct `#spectrum` load shows its page when `page.goto` returns); Back to the welcome afterwards is the app's; a hash change from the shell loads the app.
  Save from the shell downloads an investigation, and Restore from a fresh shell restores it with the focus on More. A guide card
  closed with Escape gets its focus back. A held app request shows the loading line and `aria-busy`; an aborted one shows the
  site-updated notice with Reload.
- `tests/home.spec.ts` (16) and `tests/render-budget.spec.ts` pass unchanged; no existing spec was changed.
- Full runs by the implementer: `npx tsc -b`; `npm test` (5696 tests: the 12 failures of a run under machine load, timeouts and
  pins, pass when their 10 files are rerun alone, after moving the build plugin out of `src/`, where the i18n source scan read its
  template as a dynamic key site); `npm run test:e2e --workers=4` 1763 passed, 4 failed, 5 skipped, the 4 (`app-shell` phone Tools
  menu closing, `camera-overlay-region` galaxy overlay, `exports-identity` CCD camera under `qps`, `pleiades-analysis` full18)
  passing alone; `npm run build` (dist, i18n and deploy-limit checks); `npm run test:pages` 77 passed (with the main checkout's
  pinned wrangler, loopback).

## Review

Pending: independent review by a separate subagent (Claude Opus, high effort) that did not write the code.

### Independent review 1 (raw findings)

Reviewer: a separate subagent (Claude Opus 5.5, high effort) that did not write the code, over `git diff f404879..54d0631`. Checks
run: `npx vitest run src/home/appGate.test.ts src/i18n/coverage.test.ts` (7 pass); `npm run build` (pass, with the cloud-free,
i18n-dist and deploy-limit checks); `tests/lazy-observatory.spec.ts`, `tests/home.spec.ts` and `tests/render-budget.spec.ts` on the
dev server, Chromium, 2 workers (25 pass); throwaway Playwright probes against `vite preview` of the build, with the CSP of
`public/_headers` added to the document response (no CSP violation or console error on `/` or `/#observatory`), in Chromium and,
for the direct load and Explore, Firefox (WebKit could not start here: missing system libraries). `npm run test:pages` was not run
(no pinned wrangler in this worktree). Confirmed by running unless marked "reading".

Nothing found ships a wrong numeric, a lost investigation or a CSP/hosting change. Two items block the merge itself, not the code.

1. **High (merge, reading): the branch breaks `src/i18n/fr/fr.test.ts` on current main.** The base f404879 is behind origin/main,
   where FR6 completed the French catalog: `fr.test.ts` asserts 26 `home.*` keys all present in French (`home.length` toBe 26) and
   that every `en.json` key has its French (FR6 test). This front adds `home.loadingObservatory` to `en.json` only, so after the
   merge both assertions fail (27 ≠ 26; missing `home.loadingObservatory`) and CI, hence the deploy, stops. docs/SEO.md's "French
   has no `home.*` keys yet" is stale for the same reason. Needs the French string (vous-form, e.g. «Chargement de l’observatoire…»
   with the fr typography rules) and the count 26 → 27.
2. **High (merge, `git merge-tree` + reading): `src/OpenVireo.tsx` conflicts with RT9 on main, and the naive resolution silently
   drops RT9.** RT9 changed the very `failureNotice` this front moved into `src/components/AppChrome.tsx`: on main it is
   `failureNotice(testId,kind,tag)` and gives each half `dir={directionWithin(…, uiDirection())}`. The moved copy keeps the old
   signature and no `dir`, and `src/home/WelcomeShell.tsx:44` calls it the old way. Taking this branch's side of the conflict loses
   RT9's `dir` in both the app and the shell, and no test on main checks that `dir` (grep of tests and `*.test.ts`), so nothing would
   catch it. Port RT9's version into AppChrome.tsx (with its `uiDirection`/`directionWithin` imports) and update both call sites.
3. **Medium (confirmed): Tools › Results Editors from the shell lose their reveal.** `ResultsEditorsNav` (src/polish/ResultsEditorsNav.tsx:19)
   calls `navigate(route)` and then `reveal(selector)` two frames later. On the shell `navigate` only records the intent
   (WelcomeShell.tsx:30), the reveal runs against the shell, finds nothing and gives up; the app then only navigates. Observational
   Results from the shell ends on `#spectrum` with `.own-results-card` closed and the focus on the h1; from the app's welcome the card
   is open and its summary focused. Pulsar Results: `saved-rows-disclosure` closed, focus on the h1. docs/SEO.md lists the results
   editors among the intents that "behave exactly as" in the app. The ShellIntent needs the reveal (or the reveal must wait for its
   element).
4. **Low–medium (confirmed): the language dialog's Save from the shell closes the dialog and loses the focus.** Choosing another
   language on the shell opens LanguageSelect's reload dialog; its Save (`onSave`, WelcomeShell.tsx:38) is a `save` intent, so the
   shell (and with it the dialog) unmounts; the download happens but the dialog is gone, the visitor has to choose the language again,
   and the focus is on `<body>` (`language-save` has no counterpart in the app). In the app the dialog stays open for Change language.
   There is nothing on the shell to save, so the shell could keep the dialog (or hide Save there).
5. **Low (confirmed): offline or a flaky connection is reported as "A new version of OpenVireo was published", with no retry.** With the
   network off after the welcome loaded, Explore shows the site-updated notice. `loadApp` keeps the rejected import for the page's
   life (App.tsx:13), so a second click (or Save, any guide) silently does nothing more (hash stays empty, same notice). The
   message predates this front for route chunks, but the front makes the first click on the welcome the common place to meet it
   (mobile data, and an old welcome tab after any push to `main`, which CI deploys several times a day). The shell has no state to
   lose, so a later click could retry, or the text could name both causes.
6. **Low (confirmed): a direct load of another address whose app chunk fails shows the welcome.** `/#observatory` with the
   `OpenVireo` chunk answering 404: the shell renders with the welcome's h1, the sidebar marks Welcome as the current page
   (`aria-current` on `home`) while the address is `#observatory`, plus the notice. Better than a blank page, but the page claims
   to be the welcome.
7. **Low (confirmed): on a phone, controls in the open Tools menu lose their focus return.** The swap remounts PortalHeader with the
   menu closed, so `findFocus` (App.tsx:27, needs client rects) cannot find the clicked control. Instructor mode… from the phone
   menu: the app closes the menu, the dialog opens, and after Cancel the focus is on `<body>`; from the app's own welcome the menu
   stays open and the focus returns to the Instructor mode item. The Guides buttons there (no `data-route`, so the app does not close
   the menu for them) should behave the same way (reading).
8. **Low (confirmed, design note): only the last intent survives.** Explore and then a Pleiades card while the app is held: only the
   Pleiades guide opens, on the welcome (`intent.current` is overwritten, App.tsx:34). After a navigate intent, an address edited
   during the load is overridden (Explore, then `#pulsar-analysis` typed while loading → `#observatory`). A Restore whose file was
   chosen is dropped by any later click before the app arrives. Reasonable, but undocumented.
9. **Nit (reading): the loading line is a `role="status"` element mounted together with its text** (WelcomeShell.tsx:43); some
   screen readers announce only changes to a live region that already exists. `aria-busy` is set correctly and cleared on failure.
10. **Nit (confirmed): render counts.** This review's run measured classificationLoad 175 and observatoryLoad 104 (doc: 176, 105);
    both within budget. The +3 explanation fits; the exact numbers vary by one between runs.

Checked and fine: the welcome makes 16 same-origin requests with no `OpenVireo`/`appEntry`; `/#observatory` fetches `appEntry` and the
`OpenVireo` chunk once each (no double evaluation: `appEntry` only imports the shared boot chunk and `OpenVireo`), and the built
entry carries the hashed absolute `/assets/appEntry-<hash>.js`; the dev path is the source module; the cloud config merges the
base plugins. The shell's sidebar, page bar and welcome `main` are identical to the app's welcome (outerHTML with React ids
normalised) in English and `?lang=es-419`. A Save from the shell equals a Save from the app's welcome (3216 bytes, identical after
timestamps). Restore, the Instructor confirmation (focus back on the item after Cancel at desktop width), Help › Tour, the seven
guide openers (the cluster one through `openGuide['cluster-hr']`, the same `openClusterGuide` as its menu button), `#lab=`, Back to
the welcome while loading, and the first-visit tour (scheduled only when the app reaches the observatory; home.spec passes) behave
as before. StrictMode's second effect run cannot replay an intent (the ref is cleared first). Demonstration Mode and the cloud
build start the app at once (unit test; reading).

### Resolution

By the implementer (Claude Opus 5.5, medium effort), after merging origin/main into the branch. Each finding was checked against
the code and confirmed before the fix.

1. **French (fixed in the merge commit).** `home.loadingObservatory` is added to `src/i18n/fr/fr.json` (add-only, «Chargement de
   l’observatoire…», the ellipsis as in the other `…loading` entries), and `src/i18n/fr/fr.test.ts` counts 27 `home.*` keys. The
   stale "French has no `home.*` keys yet" above is corrected.
2. **RT9 (fixed in the merge commit).** RT9's `failureNotice(testId,kind,tag)`, with `dir={directionWithin(…,uiDirection())}` on
   each half, now lives in `src/components/AppChrome.tsx`. The app (main's call sites, unchanged) and `WelcomeShell.tsx` call that
   version; `OpenVireo.tsx` no longer has its own copy.
3. **Results Editors.** `reveal` in `src/polish/ResultsEditorsNav.tsx` no longer gives up when its disclosure is missing after two
   frames. While the welcome shell is up, or when the route's part is not mounted yet, it waits (MutationObserver) until the
   disclosure is shown, then opens it and focuses its summary two frames later as before. A newer reveal or 30 s cancel the wait.
   From the app, with the disclosure already there, nothing changed.
4. **Language dialog.** `LanguageSelect`'s `onSave` is optional. The shell passes none, so its reload dialog shows neither Save nor
   the save note: there is nothing on screen to save before the app is loaded, and the dialog never unmounts under the visitor. The
   app's dialog is unchanged (Save, Change and reload, Cancel).
5. **Retry.** `loadApp` forgets a rejected import, and a click on the shell after a failure clears the notice and fetches again
   (`attempt` re-runs the load effect). The notice's wording, which predates this front, is unchanged.
6. **Direct load failure.** When the first load of another address cannot fetch the app, `App` renders `AppFailed`: the
   site-updated notice in the page's `main`, with no sidebar, no welcome `h1` and nothing marked as the current page.
7. **Phone Tools menu.** When the clicked control was in the open Tools menu and is not a page button, the app opens its menu again
   one frame after mounting (after the header's own mount effects, StrictMode's second run included, have closed it). It then
   focuses the control and only then performs the intents. Instructor mode… returns the focus to its item after Cancel, and a guide
   closed with Escape returns it to its button. Page buttons still close the menu, as in the app.
8. **Intents during the load.** Intents are queued (`queueIntent` in `src/home/appGate.ts`) and performed in order:
   - an address change (Back, Forward, an edited hash, also while the app is loading) drops the page changes queued before it, so
     the address reached last is the page shown;
   - a Restore with its chosen file is never dropped: a later Restore replaces it, and nothing queued after it is kept (in the app
     every control is inert while a restore runs);
   - everything else is appended.

   The app now registers a performer in its mount effect, and `App` calls it from its own effect, which runs after its children's,
   once the focus is back. Explore followed by a lab card gives the observatory with the guide over it.
9. **Live region.** The shell's `role="status"` element (`app-loading-region`) is mounted empty from the first render, and the
   loading line appears inside it.
10. **Render counts.** The docs give the measured counts as ranges: classificationLoad 175–176, observatoryLoad 104–105 (this run:
    175 and 104). The budgets are unchanged.

New coverage: `src/home/appGate.test.ts` (the queue rules) and seven tests in `tests/lazy-observatory.spec.ts` for findings 3–9
(Results Editors from the shell, no Save in the shell's language dialog, retry after a failed fetch, a failed direct load,
intents in order with an address winning and a kept Restore, the phone menu's Instructor mode and guide focus, the live region).


# Front SEO-TITLES: generic search terms in four English titles

User request, 2026-11-21, after the first Search Console data: the site is indexed and already appears for "clea vireo"
(average position 4.5) and "clea astronomy" (10), but those searches are rare. Titles and descriptions only; no page, route or
behaviour changes.

## Why

Keyword research through OpenSEO (DataForSEO, United States, English, 2026-11-21) gave monthly searches and difficulty (0–100):

| Search | Monthly | Difficulty |
|---|---|---|
| astronomy lab | 720 | 10 |
| astronomy simulation | 720 | 32 |
| astronomy simulator | 590 | 53 |
| telescope simulator | 480 | 9 |
| naap labs | 390 | 6 |
| spectral classification of stars | 260 | 7 |
| hr diagram simulator, hr diagram interactive, hr diagram simulation, hr diagram lab | 40 each | 0 |
| pulsar simulation | 40 | 0 |
| hubble's law lab | 20 | 0 |
| project clea, clea labs | 20 each | 16–17 |
| clea vireo, clea astronomy | 10 each | n/a, 17 |

"virtual observatory" (60 500) and "clea" (12 100) mean other things and are not targets. Only English in the United States was
researched; no other language or country. The first front's goal (first result for CLEA, VIREO and each lab name) stays: every
changed title still names CLEA, and each page's heading keeps the lab's own name.

## What changed

| Page | Before | After |
|---|---|---|
| `/` title (`app.documentTitle`) | OpenVireo · CLEA VIREO astronomy labs in your browser | OpenVireo · CLEA VIREO astronomy labs & telescope simulator |
| `/labs/` title | CLEA VIREO astronomy labs online · OpenVireo | Astronomy simulation labs online (CLEA VIREO) · OpenVireo |
| `/labs/stellar-classification/` title | Classification of stellar spectra lab (CLEA VIREO) · OpenVireo | Spectral classification of stars lab (CLEA) · OpenVireo |
| `/labs/cluster-hr/` title | HR diagrams of star clusters lab (CLEA VIREO) · OpenVireo | Interactive HR diagram lab: star clusters (CLEA) · OpenVireo |

The four descriptions follow their titles: the home page says "astronomy labs with simulated telescopes", the index "Seven CLEA
VIREO astronomy simulations rebuilt for the browser", the classification page "Learn spectral classification of stars" and the
cluster page "Plot interactive HR diagrams of star clusters". The home page and the two lab pages still say the site is a free web reconstruction (the home page still starts with
"Unofficial"), and the index still says "rebuilt for the browser". The other five lab pages are unchanged: the research gave no better term for them.
The words are descriptions of what the web does (the observatory simulates its telescopes and instruments; the cluster tool
plots catalogue data the visitor can fit by hand): the cluster page says "interactive", not "simulator".

The preview image and its text (`ogImageText`, `ogImageAlt`) are unchanged.

## Visible text

User request, 2026-11-21: the phrases the titles name were barely in the pages' own text (the live pages said "telescope
simulator", "astronomy simulation" and "spectral classification" nowhere). One clause per page now carries them. Headings are
unchanged, so each page keeps the lab's own name as its `h1`.

| Page | Text | Added |
|---|---|---|
| `/` (welcome and crawlable text) | `home.lead` | "…Project CLEA's virtual observatory: a telescope simulator with seven astronomy labs." |
| `/labs/` | `labsIndex.lead` | "Each lab is an astronomy simulation that follows one of the student exercises…" |
| `/labs/stellar-classification/` | `intro` | "Try the spectral classification of stars yourself: load one of the 25…" |
| `/labs/cluster-hr/` | `intro` | "Work on an interactive HR diagram: plot a reference cluster…" |

The same clause is added to `home.lead` in the eight translated catalogs (the app's welcome in that language) and to the labs
index lead and the two intros of the seven languages with search pages, each with that language's existing terms (for example
«diagrama H-R», «diagramme HR», «HR図», «диаграмма Г — Р»). Each language's static home page (`home.lead` in
`src/seo/languages.ts`) is unchanged.

Third pass by the same reviewer, over `e3814963`: ship. Its optional wording changes are applied: the Japanese welcome joins
its two sentences, the Russian classification intro says «Попробуйте сами выполнить…», and the Spanish one «Prueba por tu
cuenta…».

## Translations that follow the English

The translation lints require a translation to carry the glossary term of each word its English has, so the new English words
("telescope", "labs" in the home description; "stars" and "spectral classification" in the classification title) changed these
texts, as web adaptations of the new English (no keyword research was done for them):

- `app.documentTitle` and `app.description` in Spanish, Brazilian Portuguese, French, Indonesian, Hindi, Japanese, Russian and
  Simplified Chinese (the app's tab title and description in that language; each language's static home page under
  `src/seo/languages.ts` has its own title and is unchanged).
- The classification page: its Spanish title («Clasificación espectral de estrellas: práctica CLEA · OpenVireo»), its Hindi
  title and its Japanese title and description.

## Tests

`src/seo` and `src/i18n` unit tests (lengths, uniqueness across languages, the reconstruction sentence, every language's lint
profile and glossary). `src/i18n/coverage.test.ts` compares the served title and description with their escaped text, since the
title now has an ampersand. `tests/p01.spec.ts`, `tests/observatory.spec.ts` and `tests/project-naming.spec.ts` expect the new
tab title (p01 also the new description), and `tests/release/pages-smoke.pages.ts` reads the Spanish and Portuguese tab titles
from their catalogs, as it already did for the later languages.

## Review

Workflow (REVIEW.md): plan and implementation by the session that ran the research (Claude Fable 5.2); independent review 1 by a
separate subagent (Claude Opus, high effort) that did not write the change, over commit `b04ff865`.

### Review 1 findings (raw summary)

Verdict: do not ship as is.

1. Blocker: `tests/p01.spec.ts` still expected the old meta description.
2. Blocker: `tests/project-naming.spec.ts` still expected the old tab title.
3. Blocker: `tests/release/pages-smoke.pages.ts` still expected the old Spanish (two places) and Portuguese tab titles.
4. Should fix: the Russian description read as "a telescope modelled after Hubble's law".
5. Should fix: this section said every description keeps "free web reconstruction" (the index says "rebuilt") and listed only two
   of the changed specs.
6. Nit: "astronomy labs, telescope simulator" read like a keyword list; "a simulated telescope" is singular although the
   observatory has several telescopes.
7. Nit: calling all seven labs "astronomy simulations" is a mild stretch, acceptable because CLEA calls its labs simulations.
8. Nit: two titles say "(CLEA)" without VIREO and one no longer holds the lab's own name; headings and descriptions keep them.
9. Nit: the Hindi description made Hubble's law "an example of an experiment".
10. Nit: the Chinese description had a double 的.
11. Nit: Spanish «para la ley de Hubble» reads better as «sobre la ley de Hubble».
12. Fine: the Japanese texts, the Hindi and Spanish classification titles, French typography, Portuguese and Indonesian; leaving
    the preview-image text and each language's static home title unchanged.

### Resolution

Each finding was checked against the source before the fix.

- 1–3 fixed: the three specs expect the new texts; the release smoke test reads the Spanish and Portuguese titles from their
  catalogs.
- 4 fixed with the reviewer's word order, in the plural («…и многому другому со смоделированными телескопами»).
- 5 fixed in this section.
- 6 fixed: the title is "OpenVireo · CLEA VIREO astronomy labs & telescope simulator" (59 characters) and the description says
  "simulated telescopes"; the translations say "and" and use the plural where the language marks it.
- 7 and 8 kept as they are, for the reasons the reviewer gives.
- 9 fixed differently from the suggestion, which the Hindi glossary lint rejects (it needs «हबल का नियम» unchanged): the
  description is now two sentences, and the lab names follow a colon.
- 10 fixed by dropping the second 的 («Project CLEA的VIREO非官方免费网页重建版»), which keeps VIREO as Project CLEA's.
- 11 fixed («sobre»), and the same preposition in Portuguese, French and Indonesian.

Second look by the same reviewer over `54ce3142`: ship. Its one remaining nit is applied: in Spanish, Portuguese, French and
Indonesian the telescopes close the sentence (as in Russian), so the topics cannot be read as describing the telescopes.
