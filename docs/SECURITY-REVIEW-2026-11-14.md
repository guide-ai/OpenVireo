# Security review of 2026-11-14

Requested by the user ("run a security review and possible improvements"). This file records what was found, what was
changed, and the independent review of the change (REVIEW.md, step 3). The user's actions that remain are in
docs/DEPLOY.md § 13.

## Models and effort

- Audit: the coordinator (Claude Fable 5.2, session effort) checked production headers, DNS, TLS, the GitHub repository
  settings, CI/CD, dependencies and git history; two Opus subagents audited the file and network readers and the (then
  present) optional backend.
- Implementation: the coordinator (Claude Fable 5.2, session effort), branch `claude/security-hardening`.
- Independent review: an Opus subagent at high effort that did not write the code.

## Findings on the published site and their resolution

| Finding | Resolution |
|---|---|
| No `Strict-Transport-Security` header | Added in `public/_headers` (one year, subdomains, no preload) |
| MX records without SPF or DMARC; `docs/DEPLOY.md` said the MX were deleted | User action (DEPLOY.md § 13.1) |
| `main` unprotected, secret scanning off, write-by-default workflow token | Applied on 2026-11-16 with the user's approval: secret scanning and push protection on (no alerts), ruleset `Protect main` (no force-push, no deletion), read-only default workflow token (DEPLOY.md § 13) |
| Object X › Load FITS read each file before checking its size | `readFitsBytes` checks the size first |
| The VizieR VOTable reader was quadratic on hostile markup | Forward-only scans (`src/core/markupScan.ts`) with the same matches |
| Deploy rebuilt instead of publishing the tested build; actions pinned by tag; no update mechanism | Tested `dist/` is published; actions pinned to commits; Dependabot |
| DNSSEC off, no CAA | User action (DEPLOY.md § 13.2) |
| Cloud-free build check could skip itself | Moot: the backend and the check were removed |
| CSV formula text in the VIREO-exact exports | Not changed: those files reproduce VIREO's bytes; the web's own CSVs already neutralise it |
| No private reporting channel | `SECURITY.md` and `/.well-known/security.txt` |

Found sound and left as they are: the Content-Security-Policy and the other headers, the absence of HTML sinks, the size and
shape checks of every other file reader, the URL and local-storage inputs, the VizieR request, the scope of the deploy
secrets, the lockfile and `npm audit` of the site (0 advisories).

The optional accounts backend had four findings that mattered only if it were ever deployed (a global sign-in limit one
client could exhaust, a sign-in confirmation that a look-alike address could fool, no global storage ceiling, e-mail bombing
of third parties). The user then decided that no sign-in or backend is foreseen and asked for the code to be removed
(AGENTS.md, 2026-11-14), which closes them.

## Independent review: findings and resolution

The reviewer found nothing blocking. It compared the linear scans with the regular expressions they replace on about five
million generated and exhaustive inputs (no difference), timed the reader on 23 MiB hostile inputs (under one second each),
checked the pinned action commits against their tags, the artifact paths of the deploy job, the trimmed wrangler lockfile
(a strict subset of the old one) and the Save/Restore/Cancel code paths after the backend removal (unchanged for the
ordinary build).

| Reviewer finding | Resolution |
|---|---|
| The private report form the policy points to is switched off in the repository | `security.txt` keeps the form as first contact and adds a working fallback (an issue asking for a private contact, as `SECURITY.md` says); the form was enabled on 2026-11-16 with the user's approval (DEPLOY.md § 13) |
| The second `Contact:` was the policy page, not a channel | Replaced by the fallback above |
| `Expires` exactly one year away (RFC 9116 recommends less) | 2027-11-01 |
| Re-running only the deploy job after a day fails with "artifact not found" | Documented in DEPLOY.md § 11 (use Re-run all jobs) |
| The upload, download and publish path first runs on `main` | Accepted: a mistake fails the deploy and publishes nothing; the first run on `main` is watched |
| The 684 MB artifact is zipped at the default level | `compression-level: 1` |
| Docs name commit 4c71975 as the last one holding the backend | The branch is merged without rebase or squash, so the commit stays |

## Not covered

Cloudflare dashboard settings (TLS mode, the real scope of the API token), a full read of every version branch of the
investigation restore (sampled), and what the Cloudflare Web Analytics beacon sends.
