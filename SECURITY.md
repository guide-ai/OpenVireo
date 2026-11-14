# Security policy

OpenVireo is a static website (https://openvireo.space): it has no accounts and no server-side code, and everything a
visitor saves stays in their own browser or in files they download. The optional accounts backend in `worker/` is not
deployed.

## Reporting a vulnerability

Please report security problems privately, not in a public issue:

1. Use **Report a vulnerability** on the repository's Security tab
   (https://github.com/guide-ai/OpenVireo/security/advisories/new). GitHub keeps the report private between you and the
   maintainer.
2. If that form is not available to you, open an ordinary issue that only says you have a security report and asks for a
   private contact. Do not include the details in the issue.

Reports in English or Spanish are welcome. This is a volunteer project with one maintainer: expect a first answer within
about a week.

## What is in scope

- The site at https://openvireo.space and the code in this repository: for example a way to run script in a visitor's
  browser, a file that makes the site misbehave when a visitor opens it, or a way to change what the site serves.
- The build and deploy pipeline (`.github/workflows/ci-cd.yml`).
- The optional backend in `worker/`, although it is not deployed: a report before it is ever published is useful.

Out of scope: Cloudflare's and GitHub's own platforms, the VizieR catalogue servers, and reports that need a visitor's
device or browser to be compromised already.

## Supported versions

Only the version published at https://openvireo.space (the `main` branch) is supported.
