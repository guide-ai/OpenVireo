import type {Page} from '@playwright/test';

/** Front NEWCOMER NC3 (plan analysis/front-plans/front-newcomer.md §2.3 and §5): the guide windows fold each step's text under
 * «More detail» (src/guideMoreDetail.tsx), open only for the current step. The walks (tests/i18n/walks/*.ts, run by the
 * tests/i18n/e0x specs and tests/scripts/walks.scripts.ts) open every one of them before their translated-text and layout checks,
 * so folding hides nothing from those checks. */
export const openAllMoreDetail=(page:Page)=>page.evaluate(()=>{for(const d of document.querySelectorAll<HTMLDetailsElement>('details.lab-step-more'))d.open=true;});
