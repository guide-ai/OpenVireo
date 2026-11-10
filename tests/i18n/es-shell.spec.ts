import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,langQuery} from '../fixtures/language';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front ES1 (docs/I18N.md): the shell in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL, decision 5).
// Spanish strings come from the catalog and the maps, never hard-coded here except the few map texts named below.
// The untranslated check compares the same shell regions in English and in Spanish: no visible text, accessible name or title
// may read the same, except the names below that are the same in both languages.
const SAME=new Set(['OpenVireo','✳','?','↗','×','English','Español','Idioma / Language','NVO','—']);
const SHELL=['.portal-header','.investigation-toolbar','.observatory-heading','.first-steps'];
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const asVisitor=(page:Page)=>page.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'webdriver',{configurable:true,get:()=>false});});
async function open(page:Page,lang:'en'|'es-419',hash='observatory'){
 await page.goto(`/${langQuery(lang)}#${hash}`);
 await expect(page.getByRole('heading',{level:1,name:lang==='en'?en['sky.title']:es['sky.title']})).toBeVisible({timeout:15_000});
}
/** Visible text nodes, accessible names and titles inside the shell regions, in document order. */
const shellTexts=(page:Page)=>page.evaluate(regions=>{
 const out:string[]=[];
 for(const sel of regions)for(const root of document.querySelectorAll(sel))if(root.closest('[hidden]')===null){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n:Node|null;
  while((n=walker.nextNode())){const text=n.textContent?.trim();const el=n.parentElement;if(text&&el&&el.closest('[hidden],details:not([open])>:not(summary)')===null)out.push(text);}
  for(const el of root.querySelectorAll('[aria-label],[title],[placeholder]'))if(el.closest('[hidden]')===null)for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v)out.push(`@${a}:${v}`);}
 }
 return out;
},SHELL);

test('a Spanish browser fetches the Spanish chunk, sets <html lang="es-419"> and the Spanish title; ?lang=en never fetches it',async({page})=>{
 // Front ES-SPLIT: the chunk is the core module virtual:openvireo-i18n/es-419 (served as /@id/__x00__openvireo-i18n/i18n-es-419-core);
 // the whole bundle src/i18n/es/index.ts and the catalog es.json are never fetched, and the home page fetches no area module.
 const requested:string[]=[];page.on('request',r=>{if(/\/src\/i18n\/es\/|openvireo-i18n\/i18n-/.test(r.url()))requested.push(r.url());});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page,'en');
 await expect(page.locator('html')).toHaveAttribute('lang','en');expect(requested).toEqual([]);
 await open(page,'es-419');
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');await expect(page).toHaveTitle(es['app.documentTitle']);
 const language=requested.filter(u=>/openvireo-i18n\/i18n-/.test(u)).map(u=>/i18n-(es-419-[\w+-]+)/.exec(u)![1]);
 expect(language).toEqual(['es-419-core']);
 expect(requested.filter(u=>/\/src\/i18n\/es\/(?:index\.ts|es\.json)/.test(u))).toEqual([]);expect(errors).toEqual([]);
});

test('the shell is entirely Spanish: header, menu, home, toolbar and the first steps read differently from English',async({browser})=>{
 const texts:Record<'en'|'es-419',string[]>={en:[],'es-419':[]};
 for(const lang of ['en','es-419'] as const){
  const page=await browser.newPage();await open(page,lang);
  // ES-REL review 2: the selector arrives in its own chunk after first render; wait for it so both languages list the same texts.
  await expect(page.getByTestId('language-choice')).toBeVisible();texts[lang]=await shellTexts(page);await page.close();
 }
 expect(texts['es-419'].length).toBe(texts.en.length);
 const same=texts.en.map((t,i)=>t===texts['es-419'][i]&&!SAME.has(t.replace(/^@[a-z-]+:/,''))?t:null).filter(Boolean);
 expect(same).toEqual([]);
 expect(texts['es-419']).toContain(es['project.save']);expect(texts['es-419']).toContain(es['sky.local']);
});

test('Help menu, the tour, instructor mode and the project links are Spanish',async({page})=>{
 await asVisitor(page);await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await open(page,'es-419');
 const help=id(page,'main-help-menu');await expect(help).toHaveAccessibleName('Menú de Ayuda del observatorio');await expect(help).toContainText('Ayuda');
 await help.click();
 await expect(id(page,'main-help-web')).toContainText('Temas de ayuda…');await expect(id(page,'main-help-tour')).toHaveText('Hacer el recorrido por el sitio');
 await expect(id(page,'main-help-site-about')).toHaveText('Acerca de OpenVireo y la privacidad');
 await expect(id(page,'main-help-websites')).toHaveText('Sitios web ›');await id(page,'main-help-websites').click();
 await expect(id(page,'help-website-twoMass')).toContainText('Catálogo 2MASS');await expect(id(page,'help-website-clea')).toContainText('Project CLEA');
 await expect(id(page,'help-websites-note')).toContainText('se abren en una pestaña nueva solo cuando haces clic');
 await expect(id(page,'main-help-repo')).toContainText('Código fuente en GitHub');await expect(id(page,'main-help-report')).toContainText('Informar un problema en GitHub');
 // The issue text stays English (docs/I18N.md F5): only the route name and the fixed English headings.
 expect(decodeURIComponent((await id(page,'main-help-report').getAttribute('href'))!)).toContain('What happened?');
 await id(page,'main-help-tour').click();
 const card=id(page,'site-tour-card');await expect(card).toHaveAccessibleName('Paso 1 de 6 Te damos la bienvenida a OpenVireo');
 await expect(id(page,'site-tour-next')).toHaveText('Siguiente');await expect(id(page,'site-tour-skip')).toHaveText('Saltar el recorrido');
 await id(page,'site-tour-next').click();await expect(card).toContainText('Todas las páginas están en el menú');
 await id(page,'site-tour-skip').click();await expect(id(page,'site-tour')).toHaveCount(0);
 await id(page,'instructor-mode-open').click();
 const confirm=id(page,'instructor-mode-confirm');await expect(confirm).toContainText(es['instructorMode.confirm.title']);
 await expect(confirm).toContainText(es['instructorMode.confirm.lock']);await expect(id(page,'instructor-mode-confirm-on')).toHaveText(es['instructorMode.confirm.on']);
 await id(page,'instructor-mode-confirm-on').click();await expect(id(page,'instructor-mode-banner')).toContainText(es['instructorMode.banner.text']);
});

test('the recovery notice of a part that cannot load is Spanish',async({page})=>{
 await open(page,'es-419');
 await page.route(/\/src\/ClassificationLab\.tsx/,route=>route.abort('failed'));
 await page.evaluate(()=>{location.hash='#classification';});
 const notice=id(page,'site-updated');
 await expect(notice).toContainText('Se publicó una nueva versión de OpenVireo',{timeout:15_000});
 await expect(notice).toContainText('El resto del sitio y el resto de tu trabajo en esta pestaña siguen aquí.');
 await expect(id(page,'recovery-reload')).toHaveText('Volver a cargar la página');await expect(id(page,'recovery-save')).toHaveText('Guardar investigación');
});

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

test('at 1440 px the header sidebar lays out in English and in Spanish: no overlap, nothing cut off, the theme options inside their pill',async({page})=>{
 for(const lang of ['en','es-419'] as const){await open(page,lang);expect(await headerProblems(page),lang).toEqual([]);}
 await page.locator('.portal-header').screenshot({path:test.info().outputPath('es-shell-1440-sidebar.png')});
});

test('at 1440 px keyboard focus moving up the scrolled sidebar is never hidden under the pinned top row (WCAG 2.4.11), in English and in Spanish',async({page})=>{
 for(const lang of ['en','es-419'] as const){
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
  expect(steps,lang).toBeGreaterThan(20);expect(hidden,lang).toEqual([]);
 }
});

test('at 320 px the Spanish shell lays out without horizontal overflow, with the menu open',async({page})=>{
 await page.setViewportSize({width:320,height:700});await open(page,'es-419');
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
 await page.screenshot({path:test.info().outputPath('es-shell-320.png'),fullPage:false});
});

// ES1 review 1, C1 and C4: a Spanish chunk that fails or does not arrive within 10 s leaves the page in English with a
// bilingual one-line notice; a chunk that arrives later is never activated. Front ES-SPLIT: the chunk is the core module.
const FAILURE_EN='Spanish could not be loaded; English is shown. Reload to try again.';
const FAILURE_ES='No se pudo cargar el español; se muestra en inglés. Recarga para intentarlo de nuevo.';
test('a Spanish chunk that fails to load shows English with the bilingual notice',async({page})=>{
 await page.route(/openvireo-i18n\/i18n-es-419-core/,route=>route.abort('failed'));
 await page.goto('/#observatory');
 await expect(page.getByRole('heading',{level:1,name:en['sky.title']})).toBeVisible({timeout:15_000});
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 const notice=id(page,'language-failure');await expect(notice).toContainText(FAILURE_EN);await expect(notice).toContainText(FAILURE_ES);
 await expect(notice.locator('[lang=es]')).toHaveText(FAILURE_ES);
});
test('a Spanish chunk that does not arrive within 10 s shows English with the notice, and a late chunk changes nothing',async({page})=>{
 let release:(()=>void)|undefined;
 await page.route(/openvireo-i18n\/i18n-es-419-core/,async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.continue().catch(()=>{});});
 await page.clock.install();
 await page.goto('/#observatory');
 await expect.poll(()=>release!==undefined).toBe(true);
 await expect(page.locator('.investigation-toolbar')).toHaveCount(0);// nothing renders while the chunk is awaited
 await page.clock.runFor(10_000);
 await expect(page.getByRole('heading',{level:1,name:en['sky.title']})).toBeVisible({timeout:15_000});
 await expect(id(page,'language-failure')).toContainText(FAILURE_EN);await expect(page.locator('html')).toHaveAttribute('lang','en');
 release!();await page.waitForTimeout(500);
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.investigation-toolbar')).toContainText(en['project.save']);
});
test('a Spanish load that works shows no failure notice',async({page})=>{
 await open(page,'es-419');await expect(id(page,'language-failure')).toHaveCount(0);
});
