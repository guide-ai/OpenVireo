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
- **Open the lab** links to `/#lab=<slug>`. At load the app opens that lab's guide exactly as its Guides menu button does
  (`startExercise` and the guide dialog; the cluster guide through its own button), then removes the hash so a reload shows the
  plain observatory. Unknown slugs are ignored.
- **Home page** (`index.html` through `src/i18n/html.ts`): new title and description naming CLEA VIREO; canonical, Open Graph and
  Twitter card tags; `WebApplication` JSON-LD (free, browser-based, based on Project CLEA's VIREO); favicon and Apple touch icon;
  and crawlable text with links to every lab inside `#root`, which React replaces when it starts. The observatory footer links to
  `/labs/` ("About the seven labs").
- **Files**: `sitemap.xml` (generated from the same list), `robots.txt` (allows everything and names the sitemap; Cloudflare adds
  its managed AI-crawler rules above it), `favicon.svg`, `apple-touch-icon.png` and `og-image.png` (1200×630, an original
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

Independent review: see the review section added after the reviewer's report.
