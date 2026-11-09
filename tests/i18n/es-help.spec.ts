import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import witness from '../../src/help/helpAll.witness.json' with {type:'json'};

// Front ES-HELP (docs/I18N.md): VIREO's help files in Spanish on a `?lang=es-419` preview load. Every window's Help opens the
// translation (a web adaptation, labelled as such), "Ver original (inglés)" shows VIREO's exact English (the bundled file's own
// rows and text), the translation's search ignores accents, the Spectral Line Table is Spanish, and the windows fit at 320 and
// 1440 px. Run under a DejaVu-only fontconfig for the layout checks (see the ES-HELP section of docs/I18N.md).
const id=(p:Page,t:string)=>p.getByTestId(t);
const lists=witness.lists as Record<string,{rows:string[];topics:{index:number}[]}>;
const original=(path:string)=>readFileSync(new URL(`../../public/original/${path}`,import.meta.url),'latin1').split(/\r?\n/);
const WINDOWS=[['#photometer','photo-help','PHOTOHLP.LST'],['#spectrometer','spectrometer-index-help','SPECHLP.LST'],['#classification','class-help','CLASSHLP.LST'],
 ['#spectrum','measure-help','MEASHLP.LST'],['#lss-wedge','wedge-help','WDGPLTHLP.LST'],['#pulsar-analysis','pulsar-analysis-help','PLSANHLP.LST']] as const;
const LABEL='Traducción: adaptación web de OpenVireo (no es de CLEA)';
async function noHorizontalScroll(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
}

test('every instrument window opens its help in Spanish, and "Ver original (inglés)" shows VIREO\'s exact English',async({page})=>{
 test.setTimeout(120000);
 for(const [route,prefix,list] of WINDOWS){
  await page.goto('about:blank');// a hash-only change would keep the previous window's open dialog
  await page.goto(`/?lang=es-419${route}`);
  await id(page,`${prefix}-open`).click();
  const topics=id(page,`${prefix}-topics`),rows=id(page,`${prefix}-topic-list`).getByRole('option'),expected=lists[list].rows;
  await expect(rows).toHaveCount(expected.length);
  // Spanish rows: not VIREO's English, and labelled as a web adaptation.
  const spanishFirst=(await rows.first().textContent())!;
  expect(spanishFirst,list).not.toBe(expected[0]);
  await expect(id(page,`${prefix}-topics-view-label`)).toHaveText(LABEL);
  // Open the first topic in Spanish: the caption is VIREO's "Help - " in Spanish.
  const at=lists[list].topics[0].index,spanishTitle=((await rows.nth(at).textContent())!).trim();
  await rows.nth(at).dblclick();
  const window=id(page,`${prefix}-window`);
  await expect(window.getByRole('heading',{name:`Ayuda - ${spanishTitle}`})).toBeVisible();
  const spanishText=(await id(page,`${prefix}-topic-text`).textContent())!;
  // Ver original: the same topic, VIREO's exact English rows and text.
  await id(page,`${prefix}-view-switch`).click();
  await expect(id(page,`${prefix}-view-label`)).toHaveText('Original: el texto exacto de VIREO, en inglés');
  expect(await id(page,`${prefix}-topic-text`).textContent()).not.toBe(spanishText);
  await id(page,`${prefix}-topic-menu`).click();await window.getByRole('button',{name:/Mostrar los temas de ayuda|Show Help Topics/}).click();
  await expect(rows).toHaveCount(expected.length);
  expect((await rows.allTextContents()).map(t=>t.replace(/\u00a0/g,' ')),list).toEqual(expected.map(r=>r===''?' ':r));
  await expect(topics).toBeVisible();
 }
});

test('the original view shows the bundled file\'s own text, and the translation comes back',async({page})=>{
 await page.goto('/?lang=es-419#classification');
 await id(page,'class-help-open').click();
 await id(page,'class-help-topic-list').getByRole('option').nth(1).dblclick();
 await expect(id(page,'class-help-window')).toBeVisible();
 await expect(id(page,'class-help-view')).toHaveAttribute('data-view','translation');
 await id(page,'class-help-view-switch').click();
 await expect(id(page,'class-help-view')).toHaveAttribute('data-view','original');
 const text=original('help/CLASSHLP.TXT'),first=text.findIndex(l=>l==='**Load Spectrum**');
 const shown=await id(page,'class-help-topic-text').getByRole('option').allTextContents();
 const body=text.slice(first+1,first+1+12).map(l=>`  ${l}  `);
 expect(shown.slice(1,13).map(s=>s.trim())).toEqual(body.map(s=>s.trim()));
 await expect(id(page,'class-help-window').getByRole('heading')).toHaveText('Ayuda - Load Spectrum');
 await id(page,'class-help-view-switch').click();
 await expect(id(page,'class-help-view')).toHaveAttribute('data-view','translation');
 await expect(id(page,'class-help-topic-text')).toContainText('Para cargar un espectro');
});

test('the translation\'s search ignores accents; the original keeps VIREO\'s rule',async({page})=>{
 await page.goto('/?lang=es-419#classification');
 await id(page,'class-help-open').click();
 await id(page,'class-help-topic-list').getByRole('option',{name:/Medir y marcar/}).dblclick();
 await id(page,'class-help-topic-menu').click();await id(page,'class-help-search-text').click();
 await expect(id(page,'cluster-help-search-note')).toBeVisible();
 await id(page,'cluster-help-search-query').fill('POSICION VERTICAL');
 await id(page,'cluster-help-search-top').click();
 const hit=id(page,'class-help-topic-text').getByRole('option',{selected:true});
 await expect(hit).toContainText('posición vertical');
 // Not found: VIREO's box text in Spanish, with the query as typed.
 await id(page,'class-help-topic-menu').click();await id(page,'class-help-search-text').click();
 await id(page,'cluster-help-search-query').fill('zzzqq');await id(page,'cluster-help-search-top').click();
 await expect(id(page,'cluster-help-message')).toContainText('"zzzqq" no se encontró.');
 await id(page,'cluster-help-message').getByRole('button').click();
 // The original view: VIREO's A-Z rule, so an accent is not ignored (and the note is not shown).
 await id(page,'class-help-view-switch').click();
 await id(page,'class-help-topic-menu').click();await id(page,'class-help-search-text').click();
 await expect(id(page,'cluster-help-search-note')).toHaveCount(0);
 await id(page,'cluster-help-search-query').fill('FINE TUNE');await id(page,'cluster-help-search-top').click();
 await expect(id(page,'class-help-topic-text').getByRole('option',{selected:true})).toContainText('fine tune');
});

test('the Spectral Line Table is Spanish, with its help, and the original view is VIREO\'s English',async({page})=>{
 await page.goto('/?lang=es-419#classification');
 await id(page,'spl-open').click();
 const rows=id(page,'spl-rows').getByRole('option');
 await expect(rows).toHaveCount(30);await expect(rows.first()).toHaveText('3759.87   O III');
 await expect(rows.nth(2)).toHaveText('3933.68   Ca II (línea K)');
 await expect(id(page,'spl-view-label')).toHaveText(LABEL);
 await rows.nth(2).dblclick();
 await expect(id(page,'spl-help').getByRole('heading',{name:'Ayuda de líneas espectrales'})).toBeFocused();
 await expect(id(page,'spl-help-text')).toContainText('Visible por primera vez alrededor de A0');
 await id(page,'spl-view-switch').click();
 await expect(rows.nth(2)).toHaveText('3933.68   Ca II (K line)');
 await rows.nth(2).dblclick();
 await expect(id(page,'spl-help-text')).toContainText('First visible around A0');
 await expect(id(page,'spl-close')).toHaveText('Cerrar');
});

test('OpenVireo\'s own help opens in Spanish',async({page})=>{
 await page.goto('/?lang=es-419');
 await id(page,'main-help-menu').click();await id(page,'main-help-web').click();
 const dialog=id(page,'web-help');
 await expect(dialog.getByRole('heading',{name:'Ayuda de OpenVireo',level:2})).toBeVisible();
 await expect(id(page,'web-help-topics')).toContainText('Empieza aquí');
 await id(page,'web-help-topics').getByRole('button').nth(3).click();
 await expect(id(page,'web-help-topic')).toBeVisible();
});

for(const width of [320,1440])test(`help windows fit at ${width} px`,async({page})=>{
 await page.setViewportSize({width,height:width===320?700:1050});
 await page.goto('/?lang=es-419#classification');
 await id(page,'class-help-open').click();
 await id(page,'class-help-topic-list').getByRole('option',{name:/Controles/}).dblclick();
 await expect(id(page,'class-help-window')).toBeVisible();
 await noHorizontalScroll(page);
 await page.screenshot({path:`test-results/es-help-${width}-topic.png`});
 await id(page,'class-help-topic-menu').click();await id(page,'class-help-close-topic').click();
 await id(page,'spl-open').click();
 await expect(id(page,'spl-list')).toBeVisible();await noHorizontalScroll(page);
 await id(page,'spl-rows').getByRole('option').nth(2).dblclick();
 await expect(id(page,'spl-help')).toBeVisible();await noHorizontalScroll(page);
 await id(page,'spl-help').scrollIntoViewIfNeeded();
 await page.screenshot({path:`test-results/es-help-${width}-lines.png`});
});
