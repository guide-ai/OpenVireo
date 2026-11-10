import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE} from '../fixtures/language';
import en from '../../src/i18n/en.json' with {type:'json'};
import {TRANSLATED,type LanguageText} from './languageText';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts). Front PT0: the same browser opens a language
// before its release (pt-BR) with its `?lang=` preview, which beats the browser language, and English with `?lang=en`.
test.use({locale:SPANISH_LOCALE});

// Front ES1 (docs/I18N.md): the shell in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL, decision 5).
// Front PT0: the spec runs for every translated language (tests/i18n/languageText.ts: the language's own catalog, maps and
// originals, never hard-coded text); the Spanish tests keep their titles, and the Brazilian Portuguese preview runs the same checks
// under its own. The untranslated check compares the same shell regions in English and in the language: no visible text, accessible
// name or title may read the same, except the names below that are the same in every language. The selector's options are each
// language's own name (its autonym, never translated) and a preview lists one more, so option text is left out of the comparison.
const SAME=new Set(['OpenVireo','✳','?','↗','×','English','Español','Idioma / Language','NVO','—']);
const SHELL=['.portal-header','.investigation-toolbar','.observatory-heading','.first-steps'];
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const asVisitor=(page:Page)=>page.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'webdriver',{configurable:true,get:()=>false});});
/** A test title: Spanish keeps its ES1 title; another language names itself and its preview. */
const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
async function open(page:Page,lang:LanguageText|'en',hash='observatory'){
 await page.goto(`/${lang==='en'?'?lang=en':lang.query}#${hash}`);
 await expect(page.getByRole('heading',{level:1,name:lang==='en'?en['sky.title']:lang.catalog['sky.title']})).toBeVisible({timeout:15_000});
}
/** Visible text nodes, accessible names and titles inside the shell regions, in document order (the language options left out). */
const shellTexts=(page:Page)=>page.evaluate(regions=>{
 const out:string[]=[];
 for(const sel of regions)for(const root of document.querySelectorAll(sel))if(root.closest('[hidden]')===null){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n:Node|null;
  while((n=walker.nextNode())){const text=n.textContent?.trim();const el=n.parentElement;if(text&&el&&el.closest('[hidden],details:not([open])>:not(summary),.language-select option')===null)out.push(text);}
  for(const el of root.querySelectorAll('[aria-label],[title],[placeholder]'))if(el.closest('[hidden]')===null)for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v)out.push(`@${a}:${v}`);}
 }
 return out;
},SHELL);

/** Layout problems in the header: elements of the top row that overlap, the status line or a theme or language option cut
 * off or crossing its pill, and horizontal page overflow. Run with the CI's DejaVu fonts (docs/I18N.md). */
const headerProblems=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 if(document.documentElement.scrollWidth>document.documentElement.clientWidth)out.push('page overflows horizontally');
 const rect=(s:string)=>{const e=document.querySelector<HTMLElement>(s);return e&&e.offsetParent?e.getBoundingClientRect():null;};
 const top=['.portal-brand','.portal-help','.portal-header .tools-toggle'].map(rect);
 for(let i=0;i<top.length;i++)for(let j=i+1;j<top.length;j++){const a=top[i],b=top[j];if(a&&b&&a.right>b.left+.5&&b.right>a.left+.5&&a.bottom>b.top+.5&&b.bottom>a.top+.5)out.push(`top row ${i}/${j} overlap`);}
 const status=document.querySelector<HTMLElement>('.portal-status');if(status?.offsetParent&&status.scrollWidth>status.clientWidth+1)out.push('status line cut off');
 for(const pill of document.querySelectorAll<HTMLElement>('.portal-footer .theme-switch')){if(!pill.offsetParent)continue;const r=pill.getBoundingClientRect();
  for(const o of pill.querySelectorAll<HTMLElement>('.theme-option')){const q=o.getBoundingClientRect(),span=o.querySelector('span');if(q.right>r.right+.5||q.left<r.left-.5)out.push(`${o.textContent?.trim()} crosses its pill`);if(span&&span.scrollWidth>span.clientWidth+1)out.push(`${o.textContent?.trim()} cut off`);}}
 return out;
});

for(const L of TRANSLATED){
 const C=L.catalog,M=L.maps,O=L.originals,chunk=new RegExp(`openvireo-i18n/i18n-${L.tag}-core`);

 test(title(L,'a Spanish browser fetches the Spanish chunk, sets <html lang="es-419"> and the Spanish title; ?lang=en never fetches it','a ?lang=<tag> preview fetches the <L> chunk, sets <html lang="<tag>"> and the <L> title; ?lang=en never fetches it'),async({page})=>{
  // Front ES-SPLIT: the chunk is the core module virtual:openvireo-i18n/<tag> (served as /@id/__x00__openvireo-i18n/i18n-<tag>-core);
  // the whole bundle src/i18n/<dir>/index.ts and the catalog are never fetched, and the home page fetches no area module.
  const sources=new RegExp(`/src/i18n/${L.entry.dir}/`),whole=new RegExp(`/src/i18n/${L.entry.dir}/(?:index\\.ts|${L.entry.catalog.replace('.','\\.')})`);
  const requested:string[]=[];page.on('request',r=>{if(sources.test(r.url())||/openvireo-i18n\/i18n-/.test(r.url()))requested.push(r.url());});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page,'en');
  await expect(page.locator('html')).toHaveAttribute('lang','en');expect(requested).toEqual([]);
  await open(page,L);
  await expect(page.locator('html')).toHaveAttribute('lang',L.entry.htmlLang);await expect(page).toHaveTitle(C['app.documentTitle']);
  const language=requested.filter(u=>/openvireo-i18n\/i18n-/.test(u)).map(u=>new RegExp(`i18n-(${L.tag}-[\\w+-]+)`).exec(u)![1]);
  expect(language).toEqual([`${L.tag}-core`]);
  expect(requested.filter(u=>whole.test(u))).toEqual([]);expect(errors).toEqual([]);
 });

 test(title(L,'the shell is entirely Spanish: header, menu, home, toolbar and the first steps read differently from English','the shell is entirely <L> in the <tag> preview: header, menu, home, toolbar and the first steps read differently from English'),async({browser})=>{
  const texts:Record<'en'|'own',string[]>={en:[],own:[]};
  for(const lang of ['en','own'] as const){
   const page=await browser.newPage({locale:SPANISH_LOCALE});await open(page,lang==='en'?'en':L);
   // ES-REL review 2: the selector arrives in its own chunk after first render; wait for it so both languages list the same texts.
   await expect(page.getByTestId('language-choice')).toBeVisible();texts[lang]=await shellTexts(page);await page.close();
  }
  expect(texts.own.length).toBe(texts.en.length);
  const same=texts.en.map((t,i)=>t===texts.own[i]&&!SAME.has(t.replace(/^@[a-z-]+:/,''))?t:null).filter(Boolean);
  expect(same).toEqual([]);
  expect(texts.own).toContain(C['project.save']);expect(texts.own).toContain(C['sky.local']);
 });

 test(title(L,'Help menu, the tour, instructor mode and the project links are Spanish','Help menu, the tour, instructor mode and the project links are <L> in the <tag> preview'),async({page})=>{
  await asVisitor(page);await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
  await open(page,L);
  const help=id(page,'main-help-menu');await expect(help).toHaveAccessibleName(M.helpMenu.menuName.main);await expect(help).toContainText(O.Help);
  await help.click();
  await expect(id(page,'main-help-web')).toContainText(M.helpMenu.webTopics);await expect(id(page,'main-help-tour')).toHaveText(M.helpMenu.tour);
  await expect(id(page,'main-help-site-about')).toHaveText(M.helpMenu.siteAbout);
  await expect(id(page,'main-help-websites')).toHaveText(`${O.Websites} ›`);await id(page,'main-help-websites').click();
  await expect(id(page,'help-website-twoMass')).toContainText(O['2MASS Catalog']);await expect(id(page,'help-website-clea')).toContainText('Project CLEA');
  await expect(id(page,'help-websites-note')).toContainText(M.helpMenu.websitesNote);
  await expect(id(page,'main-help-repo')).toContainText(M.projectLinks.repoMenu);await expect(id(page,'main-help-report')).toContainText(M.projectLinks.reportMenu);
  // The issue text stays English (docs/I18N.md F5): only the route name and the fixed English headings.
  expect(decodeURIComponent((await id(page,'main-help-report').getAttribute('href'))!)).toContain('What happened?');
  await id(page,'main-help-tour').click();
  const card=id(page,'site-tour-card');await expect(card).toHaveAccessibleName(`${M.tour.progress(1,6)} ${M.tour.steps.welcome.title}`);
  await expect(id(page,'site-tour-next')).toHaveText(M.tour.next);await expect(id(page,'site-tour-skip')).toHaveText(M.tour.skip);
  await id(page,'site-tour-next').click();await expect(card).toContainText(M.tour.steps.sections.title);
  await id(page,'site-tour-skip').click();await expect(id(page,'site-tour')).toHaveCount(0);
  await id(page,'instructor-mode-open').click();
  const confirm=id(page,'instructor-mode-confirm');await expect(confirm).toContainText(C['instructorMode.confirm.title']);
  await expect(confirm).toContainText(C['instructorMode.confirm.lock']);await expect(id(page,'instructor-mode-confirm-on')).toHaveText(C['instructorMode.confirm.on']);
  await id(page,'instructor-mode-confirm-on').click();await expect(id(page,'instructor-mode-banner')).toContainText(C['instructorMode.banner.text']);
 });

 test(title(L,'the recovery notice of a part that cannot load is Spanish','the recovery notice of a part that cannot load is <L> in the <tag> preview'),async({page})=>{
  await open(page,L);
  await page.route(/\/src\/ClassificationLab\.tsx/,route=>route.abort('failed'));
  await page.evaluate(()=>{location.hash='#classification';});
  const notice=id(page,'site-updated');
  await expect(notice).toContainText(M.appShell.recovery.updatedTitle,{timeout:15_000});
  await expect(notice).toContainText(M.appShell.recovery.kept);
  await expect(id(page,'recovery-reload')).toHaveText(M.appShell.recovery.reload);await expect(id(page,'recovery-save')).toHaveText(M.appShell.recovery.save);
 });

 test(title(L,'at 1440 px the header sidebar lays out in English and in Spanish: no overlap, nothing cut off, the theme options inside their pill','at 1440 px the header sidebar lays out in English and in the <L> preview: no overlap, nothing cut off, the theme options inside their pill'),async({page})=>{
  for(const lang of ['en',L] as const){await open(page,lang);expect(await headerProblems(page),lang==='en'?lang:lang.tag).toEqual([]);}
  await page.locator('.portal-header').screenshot({path:test.info().outputPath(`${L.tag}-shell-1440-sidebar.png`)});
 });

 test(title(L,'at 1440 px keyboard focus moving up the scrolled sidebar is never hidden under the pinned top row (WCAG 2.4.11), in English and in Spanish','at 1440 px keyboard focus moving up the scrolled sidebar is never hidden under the pinned top row (WCAG 2.4.11), in English and in the <L> preview'),async({page})=>{
  for(const lang of ['en',L] as const){
   await open(page,lang);
   await page.locator('.portal-header nav button:visible').last().focus();
   await page.evaluate(()=>{const h=document.querySelector('.portal-header')!;h.scrollTop=h.scrollHeight;});
   const hidden:string[]=[];let steps=0;
   for(;steps<60;steps++){
    const r=await page.evaluate(()=>{const a=document.activeElement as HTMLElement|null,row=document.querySelector('.portal-top')!.getBoundingClientRect();
     if(!a?.closest('.portal-header nav'))return null;const q=a.getBoundingClientRect();return {text:a.textContent?.trim()??'',top:q.top,rowBottom:row.bottom};});
    if(!r)break;if(r.top<r.rowBottom-.5)hidden.push(`${r.text}: ${Math.round(r.rowBottom-r.top)} px under the row`);
    await page.keyboard.press('Shift+Tab');
   }
   const name=lang==='en'?lang:lang.tag;expect(steps,name).toBeGreaterThan(20);expect(hidden,name).toEqual([]);
  }
 });

 test(title(L,'at 320 px the Spanish shell lays out without horizontal overflow, with the menu open','at 320 px the <L> shell (<tag> preview) lays out without horizontal overflow, with the menu open'),async({page})=>{
  await page.setViewportSize({width:320,height:700});await open(page,L);
  const fits=()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
  expect(await fits()).toBe(true);expect(await headerProblems(page)).toEqual([]);
  // The top row (brand, Help, the menu button) does not overlap.
  const boxes=await Promise.all(['.portal-brand-block','.portal-help','.portal-header .tools-toggle'].map(s=>page.locator(s).boundingBox()));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i]!,b=boxes[j]!;expect(a.x+a.width<=b.x+.5||b.x+b.width<=a.x+.5||a.y+a.height<=b.y+.5||b.y+b.height<=a.y+.5,`${i}/${j} overlap`).toBe(true);}
  await page.locator('.portal-header .tools-toggle').click();await expect(page.locator('.portal-header')).toHaveClass(/tools-open/);
  expect(await fits()).toBe(true);
  const clipped=await page.evaluate(()=>[...document.querySelectorAll('.portal-header button, .portal-header a, .portal-header label, .investigation-toolbar button, .investigation-toolbar label')]
   .filter(el=>(el as HTMLElement).offsetParent!==null&&el.scrollWidth>el.clientWidth+1&&getComputedStyle(el).overflow==='hidden').map(el=>el.textContent?.trim()));
  expect(clipped).toEqual([]);
  await page.screenshot({path:test.info().outputPath(`${L.tag}-shell-320.png`),fullPage:false});
 });

 // ES1 review 1, C1 and C4: a language chunk that fails or does not arrive within 10 s leaves the page in English with a
 // bilingual one-line notice; a chunk that arrives later is never activated. Front ES-SPLIT: the chunk is the core module.
 // Front SC8: the notices come from the registry (src/i18n/languages.json `notices` and `englishName`).
 const notice=L.notices.language;
 test(title(L,'a Spanish chunk that fails to load shows English with the bilingual notice','a <L> chunk that fails to load shows English with the bilingual notice'),async({page})=>{
  await page.route(chunk,route=>route.abort('failed'));
  await page.goto(`/${L.query}#observatory`);
  await expect(page.getByRole('heading',{level:1,name:en['sky.title']})).toBeVisible({timeout:15_000});
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  const shown=id(page,'language-failure');await expect(shown).toContainText(notice.en);await expect(shown).toContainText(notice.own);
  await expect(shown.locator(`[lang=${notice.lang}]`)).toHaveText(notice.own);
 });
 test(title(L,'a Spanish chunk that does not arrive within 10 s shows English with the notice, and a late chunk changes nothing','a <L> chunk that does not arrive within 10 s shows English with the notice, and a late chunk changes nothing'),async({page})=>{
  let release:(()=>void)|undefined;
  await page.route(chunk,async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.continue().catch(()=>{});});
  await page.clock.install();
  await page.goto(`/${L.query}#observatory`);
  await expect.poll(()=>release!==undefined).toBe(true);
  await expect(page.locator('.investigation-toolbar')).toHaveCount(0);// nothing renders while the chunk is awaited
  await page.clock.runFor(10_000);
  await expect(page.getByRole('heading',{level:1,name:en['sky.title']})).toBeVisible({timeout:15_000});
  await expect(id(page,'language-failure')).toContainText(notice.en);await expect(page.locator('html')).toHaveAttribute('lang','en');
  release!();await page.waitForTimeout(500);
  await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.investigation-toolbar')).toContainText(en['project.save']);
 });
 test(title(L,'a Spanish load that works shows no failure notice','a <L> preview load that works shows no failure notice'),async({page})=>{
  await open(page,L);await expect(id(page,'language-failure')).toHaveCount(0);
 });
}
