import {test as base,expect} from '@playwright/test';
import type {BrowserContext,Page} from '@playwright/test';
// Front ES-SPLIT review (docs/I18N.md, "Spanish: the chunk split by route area"; plan §4.3): the Spanish specs import `test` and
// `expect` from here instead of @playwright/test. On the dev server a text, key or map read before its route area arrived throws
// and logs "OpenVireo: … was read before its area … loaded" (src/i18n/active.ts notePendingText). Every page of the worker is
// watched (the `page` fixture's and those a test opens with browser.newPage, also in beforeAll), and each test fails when one of
// its pages logged that line or raised it as a page error, even if the app caught the error or the spec does not look at errors.
const READ_TOO_EARLY=/was read before its area/;
type Reads={found:string[]};
export const test=base.extend<{areaTripwire:void},{areaReads:Reads}>({
 areaReads:[async({browser},use)=>{
  const reads:Reads={found:[]},pages=new WeakSet<Page>();
  const watchPage=(page:Page)=>{
   if(pages.has(page))return;pages.add(page);
   page.on('console',m=>{if(m.type()==='error'&&READ_TOO_EARLY.test(m.text()))reads.found.push(`console: ${m.text().split('\n')[0]} (${page.url()})`);});
   page.on('pageerror',e=>{if(READ_TOO_EARLY.test(e.message))reads.found.push(`pageerror: ${e.message} (${page.url()})`);});
  };
  const watchContext=(context:BrowserContext)=>{for(const p of context.pages())watchPage(p);context.on('page',watchPage);};
  for(const c of browser.contexts())watchContext(c);
  browser.on('context',watchContext);
  await use(reads);
  browser.off('context',watchContext);
 },{scope:'worker',auto:true}],
 areaTripwire:[async({areaReads},use)=>{
  await use();
  const found=areaReads.found.splice(0);
  expect([...new Set(found)],'text read before its route area loaded (src/i18n/active.ts)').toEqual([]);
 },{auto:true}],
});
export {expect};
