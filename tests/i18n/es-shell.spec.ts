import {test,expect,type Page} from '@playwright/test';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};

// Front ES1 (docs/I18N.md): the shell in Spanish on a `?lang=es-419` preview load (Spanish is hidden until ES-REL, decision 5).
// Spanish strings come from the catalog and the maps, never hard-coded here except the few map texts named below.
// The untranslated check compares the same shell regions in English and in Spanish: no visible text, accessible name or title
// may read the same, except the names below that are the same in both languages.
const SAME=new Set(['OpenVireo','✳','?','↗','×','English','Español','Idioma / Language','NVO','—']);
const SHELL=['.portal-header','.investigation-toolbar','.observatory-heading','.first-steps'];
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const asVisitor=(page:Page)=>page.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'webdriver',{configurable:true,get:()=>false});});
async function open(page:Page,lang:'en'|'es-419',hash='observatory'){
 await page.goto(`/?lang=${lang}#${hash}`);
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

test('a Spanish preview load fetches the Spanish chunk, sets <html lang="es-419"> and the Spanish title; English never fetches it',async({page})=>{
 const requested:string[]=[];page.on('request',r=>{if(r.url().includes('/src/i18n/es/'))requested.push(r.url());});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page,'en');
 await expect(page.locator('html')).toHaveAttribute('lang','en');expect(requested).toEqual([]);
 await open(page,'es-419');
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');await expect(page).toHaveTitle(es['app.documentTitle']);
 expect(requested.some(u=>u.includes('/src/i18n/es/index.ts'))).toBe(true);expect(errors).toEqual([]);
});

test('the shell is entirely Spanish: header, menu, home, toolbar and the first steps read differently from English',async({browser})=>{
 const texts:Record<'en'|'es-419',string[]>={en:[],'es-419':[]};
 for(const lang of ['en','es-419'] as const){
  const page=await browser.newPage();await open(page,lang);texts[lang]=await shellTexts(page);await page.close();
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
 await expect(id(page,'help-website-twoMass')).toContainText('Catálogo 2MASS');await expect(id(page,'help-website-clea')).toContainText('Proyecto CLEA');
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
 await expect(notice).toContainText('El resto del sitio y tu demás trabajo en esta pestaña siguen aquí.');
 await expect(id(page,'recovery-reload')).toHaveText('Volver a cargar la página');await expect(id(page,'recovery-save')).toHaveText('Guardar investigación');
});

test('at 320 px the Spanish shell lays out without horizontal overflow, with the menu open',async({page})=>{
 await page.setViewportSize({width:320,height:700});await open(page,'es-419');
 const fits=()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
 expect(await fits()).toBe(true);
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
