/** Links to the project's public GitHub repository (user decision, 2026-11-08) [W]: the source code and GitHub's new-issue page.
 * Both open in a new tab only when the visitor clicks them (rel="noopener noreferrer"). The only thing the site puts in the
 * address is the name of the current page, in the issue text, which the visitor sees and can edit on GitHub before sending;
 * GitHub asks the visitor to sign in to create an issue. Pure data; components/ProjectLinks.tsx and help/HelpMenus.tsx render it. */
export const PROJECT_REPO_URL='https://github.com/guide-ai/OpenVireo';

export const PROJECT_LINKS=Object.freeze({
 groupLabel:'OpenVireo on GitHub',
 repo:'Source code',
 repoMenu:'Source code on GitHub',
 report:'Report a problem',
 reportMenu:'Report a problem on GitHub',
 /** Read by screen readers after each link. */
 newTab:'(opens GitHub in a new tab)',
 recoveryReport:'Report this problem on GitHub',
 issue:Object.freeze({
  page:'Page',
  happened:'What happened?',
  expected:'What did you expect?',
  steps:'Steps to reproduce',
 }),
});

/** GitHub's new-issue page with a short template. `page` is the site's route name (for example "observatory"); nothing else
 * about the visitor or their work is included. */
export function newIssueUrl(page:string):string{
 const I=PROJECT_LINKS.issue;
 const body=`**${I.page}:** #${page}\n\n**${I.happened}**\n\n\n**${I.expected}**\n\n\n**${I.steps}**\n1. \n`;
 return `${PROJECT_REPO_URL}/issues/new?body=${encodeURIComponent(body)}`;
}

/** A route name as the site writes it (lowercase words joined by hyphens); anything else becomes "observatory", so a crafted
 * address cannot put its own text into the issue (review 1). */
export function routeName(candidate:string|null|undefined):string{
 return candidate&&/^[a-z0-9]+(-[a-z0-9]+)*$/.test(candidate)&&candidate.length<=40?candidate:'observatory';
}

/** The current route for links outside the header: the menu's current page (the same route the header uses), not the raw
 * address, which can also hold an in-page anchor such as #measurement-log. */
export function currentPage():string{
 return routeName(document.querySelector<HTMLElement>('.portal-header [data-route][aria-current="page"]')?.dataset.route);
}
