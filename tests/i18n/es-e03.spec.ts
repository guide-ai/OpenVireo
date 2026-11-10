import {type Page,type Locator} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,langQuery} from '../fixtures/language';
import {layoutProblems,type LayoutOptions} from '../fixtures/layoutProblems';
import {readFileSync} from 'node:fs';
import {CLASSIFY_PROGRAM_LITERALS_RESTATED} from './classifyProgramLiterals';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import originals from '../../src/i18n/es/originals.json' with {type:'json'};
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front ES5 (docs/I18N.md): exercise E03, Spectral Classification, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk through the
// student flow runs in English, Spanish and the pseudo-locale: the classification guide, the lab (source, Program List with its
// dialog, VIREO's No More Spectra end box, atlas and standard pairs, Standard − practice, the line table, the wavelength window,
// the four renderings with their reverse options, the normalized sampled difference, the range dialog and its refusal, the
// sampled flux readout, the comparison cursor, the manual equivalent width with its cursor, review dialog and record, the
// comparison marks, the classification review, record and refusal, an imported spectrum, an acquired star and the two restore
// refusals).
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and the narrow patterns below (star names, spectral types as data, SPECLNS.LNL line labels, atlas labels,
//   hashes, numbers with units);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.
type Lang='en'|'es-419'|'qps';
/** VIREO's Program List... and Next on List items and the No More Spectra box (CLASSIFY_PROGRAM_LITERALS, restated). */
const P=CLASSIFY_PROGRAM_LITERALS_RESTATED;
const O=originals as Record<string,string>,E=en as Record<string,string>,S=es as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
const SAME=new Set<string>([
 // Formats, names, symbols and units.
 'VIREO','OpenVireo','SHA-256','CSV','JSON','SP','SSP','LST','Å','×','÷','·','—','✳','↗','#','?','px',
 // The atlas labels as recorded in the original atlas index (catalog.json `atlases`), shown in the atlas selector and records.
 'Main Sequence','Luminosity near O8','Luminosity near B2','Luminosity at A3','Luminosity at F5','Luminosity at G2','Luminosity at K0','Luminosity near M2',
 // The SPECLNS.LNL line labels as recorded (catalog.json `lines`), shown in the line table.
 'Ca II (K line)','He I','Ca II (H line)','H I (H Epsilon)','Mn I','Fe I','C III','O II','Si IV','N III','He II','H I (H Delta)','Si II','Ca I','CH & Metals (G Band)','H I (H Gamma)','Mg II',
 'H I (H Beta)','H I (H Alpha)','Na I (D lines)','TiO','Mg I (b lines)','Ca I (4227)','Na I',
 // File names the walk reads or writes (and the imported file's object ID, its name without extension), and the acquired
 // packet's recorded designation.
 'limited.sp','limited','bad.json','A0000021.SP','N0000.DAT@14428','MYLIST.LST','synthetic.dat','synthetic.txt','G2V','E03 remarks','First alias','Repeated alias','Last alias','A0000021.sp','A0000014.sp',
 // The stored text of the synthetic DAT record (object, remarks) and of the synthetic TXT row, shown as read from the files.
 'FORMAT-CHECK','SYNTHETIC: NOT OBSERVED','OWN-TEXT','Own G2V','My original comment',
]);
/** A star of the practice list or the standards (HD 124320, BD+…, a spectral type such as A1 V, B9.5 IV, M5 V, K0 III, O5 V((f))). */
const STAR=/^(?:HD|BD|HR|HZ|SAO|Feige|Gl|O)\s?[+-]?\d[\d.+-]*(?: \d{1,4})?\s?[A-Z]?$|^[OBAFGKM]\d(?:\.\d)?\s?(?:I{1,3}|IV|V|Ia|Ib|Iab|Ia0)(?:[ab]|-[IV]+)?(?:\(\(?f\)?\))?$/;
/** A hash (with or without its SHA-256 label), an imported file's source identity (imported:<SHA-256>), an acquisition identity, an original spectrum file (A0000021.SP) or the acquired
 * star's spectrum file name. */
const RECORDED=/^imported:[0-9a-f]{64}$|^[0-9a-f]{20}$|^(?:Single|Double) · (?:32|64) bits$|^\d{8} · [A-Z]{1,4}$|^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{12}$|^acq-[0-9a-z-]{8,}$|^A\d{7}\.SP$|^catalog-star-[0-9a-f]{12}\.sp$/;
/** A number with its unit or symbol, and nothing else that could be a word. */
const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→e]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→e]*(?:\s*(?:Å|ms|px|×))*\s*$/;
/** The acquired source option and the imported file's option (recorded designation or file name, then a hash prefix). */
const COMPOSED=/^N0000\.DAT@14428 · [0-9a-z-]{12}(?: · \d+ ms)?$|^limited\.sp · [0-9a-f]{12}$/;
const OWN='E03 own proposal';
/** The authored program list of docs/CLASSIFICATION-PROGRAM-IMPORT.md, a synthetic observation DAT (tests/fixtures) and a native
 * results TXT built as tests/native-text-results.spec.ts builds its example. */
const LST=Buffer.from("'First alias' 'A0000021.sp'\r\n'Repeated alias' 'A0000021.sp'\r\n'Last alias' 'A0000014.sp'\r\n",'latin1');
const DAT=readFileSync(new URL('../fixtures/observation-results-synthetic.dat',import.meta.url));
const TXT=(()=>{const row=Array(240).fill(' '),put=(at:number,text:string)=>[...text].forEach((c,i)=>row[at-1+i]=c);put(1,'OWN-TEXT');put(13,'1179.125000');put(26,'05h30m12.3s');put(38,'-06°15\'30"');for(let i=0;i<3;i++)put(49+10*i,'1.25');put(79,'0.125');put(91,'Own G2V');put(104,'My original comment');
 return Buffer.from('Object ID    MJD(Days)      RA           Dec         U         B         V         Z      Spectrum     Comments\r\n'+row.join('').trimEnd()+'\r\n','latin1');})();
const TXT_LINES=new Set(TXT.toString('latin1').split('\r\n').filter(Boolean).map(l=>l.trim()));
const same=(text:string)=>{
 if(TXT_LINES.has(text))return true;// the synthetic TXT's header and row, shown as read
 if(SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text)||STAR.test(text)||COMPOSED.test(text)||text===OWN)return true;
 let m=/^\d{1,2} · (.+)$/.exec(text);if(m&&(STAR.test(m[1])||SAME.has(m[1])))return true;// a program-list row ("10 · BD+63 137", "1 · First alias") or a TXT row choice
 m=/^(.+) · E03 own proposal$/.exec(text);if(m&&STAR.test(m[1]))return true;// a record: the star and the student's own type
 m=/^\d{4}(?:\.\d{1,3})? Å · (.+)$/.exec(text);if(m&&SAME.has(m[1]))return true;// a line-table row's name: wavelength and SPECLNS.LNL label
 m=/^(.+) \/ (.+)$/.exec(text);return !!m&&STAR.test(m[1])&&STAR.test(m[2]);// a standard pair: "A1 V / A3 V"
};
const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
const pseudo=(text:string)=>new RegExp(`^${MARK}${[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join(MARK)}${MARK}$`);
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** The accessible name of a catalog key in this language. */
const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(lang==='qps')return pseudo(fill(E[key],params));if(!Object.hasOwn(S,key))throw new Error(`No Spanish for ${key}`);return exact(fill(S[key],params));};
/** vireo() of a Spanish load, as src/i18n/vireo.ts computes it (the literal when there is no original). */
const vireoEs=(text:string)=>{const key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();return Object.hasOwn(O,key)?O[key]:key;};
const button=(scope:Page|Locator,lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>scope.getByRole('button',{name:N(lang,key,params)});
const label=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByLabel(N(lang,key));

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native
 * `lang="en"` views. */
const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;if(e.tagName==='DIALOG'&&!(e as HTMLDialogElement).open)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,script,style,[data-testid=site-tour]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 for(const t of document.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 return out;
});
const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:N(lang,key)}).click();
};
const main=(page:Page)=>page.locator('main.classification-main');
const ready=async(page:Page,lang:Lang)=>{await expect(main(page)).toHaveAttribute('aria-busy','false',{timeout:30_000});await expect(button(main(page),lang,'class.review')).toBeEnabled({timeout:30_000});};
const programButton=(page:Page,original:string)=>page.locator('.classification-program .class-actions button').nth(original===P.programList?0:1);
const programDialog=(page:Page)=>page.locator('dialog.program-list-modal');
async function gesture(page:Page,s:Locator,x:number,y:number){await s.scrollIntoViewIfNeeded();const b=(await s.boundingBox())!;await page.mouse.move(b.x+b.width*x+.25,b.y+b.height*y);await page.mouse.down();await page.mouse.move(b.x+b.width*x+.25,b.y+b.height*y);await page.mouse.up();}

/** The walk through E03. Each step leaves the screen in the state its texts are read in. */
const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
 ['classification guide',async(page,lang)=>{await tool(page,lang,'classLab.nav');await expect(id(page,'classification-lab-dialog')).toBeVisible();await openAll(id(page,'classification-lab-dialog'));}],
 ['classification lab',async(page,lang)=>{await id(page,'classification-lab-continue').click();await expect(id(page,'classification-lab-dialog')).toBeHidden();await ready(page,lang);await openAll(main(page));}],
 ['answer required',async(page,lang)=>{await button(main(page),lang,'class.review').click();await expect(main(page).locator('.class-feedback [role=alert]')).toBeVisible();}],
 ['Program List',async page=>{await programButton(page,P.programList).click();await expect(programDialog(page)).toBeVisible();}],
 ['program list imported',async page=>{await programDialog(page).locator('input[type=file]').setInputFiles({name:'MYLIST.LST',mimeType:'text/plain',buffer:LST});
  await expect(programDialog(page).locator('code')).toBeVisible();}],
 ['original program list',async(page,lang)=>{await button(programDialog(page),lang,'programImport.original').click();await expect(programDialog(page).locator('code')).toHaveCount(0);}],
 ['program row chosen',async page=>{await page.locator('#program-list-practice').selectOption('u25');await expect(programDialog(page).locator('p').filter({hasText:'A0000011'})).toBeVisible();}],
 ['program row loaded',async(page,lang)=>{await button(programDialog(page),lang,'program.confirm').click();await expect(programDialog(page)).toBeHidden();await ready(page,lang);}],
 ['No More Spectra',async page=>{await programButton(page,P.nextOnList).click();await expect(page.locator('.classification-program [role=status]')).toBeVisible();}],
 ['Standard − practice',async(page,lang)=>{await page.locator('#class-standard').selectOption('3');await ready(page,lang);await page.locator('#class-mode').selectOption('difference');await ready(page,lang);
  await page.locator('.class-line-table input[type=radio]').nth(1).check();}],
 ['wavelength window zoomed',async(page,lang)=>{await page.locator('#class-mode').selectOption('bracket');await ready(page,lang);await button(main(page),lang,'viewport.in').click();}],
 ['sampled traces reversed',async(page,lang)=>{await button(main(page),lang,'viewport.reset').click();await page.locator('#class-rendering').selectOption('sampled-trace');await id(page,'reverse-trace').check();await openAll(main(page));}],
 ['grayscale photo reversed',async page=>{await page.locator('#class-rendering').selectOption('photo');await page.locator('.photo-reverse:not(.trace-reverse) input').check();await openAll(main(page));}],
 ['combined photo and trace',async page=>{await page.locator('#class-rendering').selectOption('combined');await openAll(main(page));}],
 ['normalized sampled difference',async page=>{await page.locator('#class-rendering').selectOption('trace');await page.locator('.sampled-difference-option input').check();await openAll(main(page));}],
 ['range refused',async(page,lang)=>{await page.locator('.sampled-difference-option input').uncheck();await openAll(main(page));await page.locator('#classification-range-min').fill('5000');await page.locator('#classification-range-max').fill('4000');
  await button(main(page),lang,'range.apply').click();await expect(page.locator('.classification-range [role=alert]')).toBeVisible();}],
 ['range applied',async(page,lang)=>{await page.locator('#classification-range-min').fill('3800');await page.locator('#classification-range-max').fill('4600');await button(main(page),lang,'range.apply').click();await ready(page,lang);}],
 ['sampled flux read',async(page,lang)=>{await page.locator('#probe-wavelength').fill('4000');await button(main(page),lang,'probe.read').click();await expect(id(page,'sampled-flux-result')).toBeVisible();}],
 ['sampled flux refused',async(page,lang)=>{await page.locator('#probe-wavelength').fill('9000');await button(main(page),lang,'probe.read').click();await expect(page.locator('#probe-error')).toBeVisible();}],
 ['comparison cursor',async page=>{await gesture(page,page.locator('.class-comparison').getByTestId('inspection-unknown'),.4,.5);await expect(id(page,'comparison-inspection-result').locator('p')).toHaveCount(4);}],
 ['feature cursor',async(page,lang)=>{const c=page.locator('details.feature-cursor');if(await c.getAttribute('open')===null)await c.locator('summary').click();await button(c,lang,'cursor.center').click();await gesture(page,id(page,'feature-cursor-surface'),.5,.5);
  await expect(id(page,'feature-cursor-surface')).toBeVisible();}],
 ['width refused',async(page,lang)=>{const f=page.locator('.feature-measurement');for(const [k,v] of [['feature.center','4150'],['feature.left','4100'],['feature.leftContinuum','0'],['feature.right','4200'],['feature.rightContinuum','1']] as const)await label(f,lang,k).fill(v);
  await button(f,lang,'feature.calculate').click();await expect(f.locator('[role=alert]')).toBeVisible();}],
 ['width review',async(page,lang)=>{const f=page.locator('.feature-measurement');await label(f,lang,'feature.leftContinuum').fill('1');await button(f,lang,'feature.calculate').click();await expect(f.locator('dialog[open]')).toBeVisible();}],
 ['width saved',async(page,lang)=>{const f=page.locator('.feature-measurement');await button(f,lang,'feature.save').click();await expect(f.locator('dialog[open]')).toHaveCount(0);await expect(f.locator('ol li')).toHaveCount(1);await openAll(f);}],
 ['comparison marks',async(page,lang)=>{await button(page.locator('.feature-measurement'),lang,'comparisonMark.center').click();await expect(page.locator('.comparison-marking-status')).toBeVisible();}],
 ['classification review',async(page,lang)=>{await button(page.locator('.feature-measurement'),lang,'comparisonMark.inspect').click();await page.locator('#class-type').fill(OWN);await page.locator('#class-reason').fill(OWN);
  await button(main(page),lang,'class.review').click();await expect(page.locator('dialog[aria-labelledby=class-confirm-heading]')).toBeVisible();}],
 ['classification recorded',async(page,lang)=>{await button(page.locator('dialog[aria-labelledby=class-confirm-heading]'),lang,'class.confirmSave').click();await expect(page.locator('.class-records ol li')).toHaveCount(1);}],
 ['observation results',async(page,lang)=>{await button(main(page),lang,'obs.open').click();await expect(page.locator('dialog.observation-dialog')).toBeVisible();await label(page,lang,'obs.type').fill('G2V');
  await label(page,lang,'obs.remarks').fill('E03 remarks');}],
 ['observation recorded',async(page,lang)=>{await button(page.locator('dialog.observation-dialog'),lang,'obs.confirm').click();await expect(page.locator('dialog.observation-dialog')).toBeHidden();await openAll(main(page));}],
 ['observation DAT inspected',async(page,lang)=>{await label(page,lang,'nativeResults.fileLabel').setInputFiles({name:'synthetic.dat',mimeType:'application/octet-stream',buffer:DAT});
  await expect(page.locator('.native-results code').first()).toBeVisible();await openAll(page.locator('.native-results'));}],
 ['DAT text fields edit',async(page,lang)=>{await button(page,lang,'nativeEdit.open').click();await expect(page.locator('dialog[open]')).toBeVisible();await openAll(page.locator('dialog[open]'));}],
 ['DAT record delete',async(page,lang)=>{await button(page.locator('dialog[open]'),lang,'nativeEdit.cancel').click();await expect(page.locator('dialog[open]')).toHaveCount(0);await button(page,lang,'nativeDelete.open').click();await expect(page.locator('dialog[open]')).toBeVisible();}],
 ['DAT results ordering',async(page,lang)=>{await button(page.locator('dialog[open]'),lang,'nativeDelete.cancel').click();await expect(page.locator('dialog[open]')).toHaveCount(0);await button(page,lang,'nativeList.build').click();await page.waitForTimeout(300);await openAll(page.locator('.native-results'));}],
 ['observation edit',async(page,lang)=>{const d=page.locator('dialog[open]');if(await d.count())await page.keyboard.press('Escape');await button(page,lang,'obs.edit',{id:'1'}).click();await expect(page.locator('dialog.observation-dialog')).toBeVisible();}],
 ['observation delete',async(page,lang)=>{await button(page.locator('dialog.observation-dialog'),lang,'obs.cancel').click();await expect(page.locator('dialog.observation-dialog')).toBeHidden();await button(page,lang,'obs.delete.open',{id:'1'}).click();await expect(page.locator('dialog[open]')).toBeVisible();}],
 ['results TXT inspected',async(page,lang)=>{await button(page.locator('dialog[open]'),lang,'obs.delete.cancel').click();await expect(page.locator('dialog[open]')).toHaveCount(0);await label(page,lang,'nativeText.fileLabel').setInputFiles({name:'synthetic.txt',mimeType:'text/plain',buffer:TXT});
  await expect(page.locator('.native-text-results code').first()).toBeVisible();await openAll(page.locator('.native-text-results'));}],
 ['session refused',async page=>{await page.locator('.class-records input[accept=".json"]').first().setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});
  await expect(main(page).locator('.class-feedback [role=alert]')).toBeVisible();}],
 ['investigation refused',async page=>{await page.locator('.class-records input[accept=".json"]').nth(1).setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});
  await expect(main(page).locator('.class-feedback [role=alert]')).toBeVisible();}],
 ['imported spectrum',async(page,lang)=>{await page.locator('.class-source input[type=file]').setInputFiles({name:'limited.sp',mimeType:'text/plain',buffer:Buffer.from('3900 .2\n4200 .8\n4500 .4\n')});
  await ready(page,lang);await expect(page.locator('#class-source')).toHaveValue(/^imported:/);await openAll(main(page));}],
 ['imported spectrum observation',async(page,lang)=>{await button(main(page),lang,'obs.open').click();await expect(page.locator('dialog.observation-dialog')).toBeVisible();
  await expect(id(page,'observation-jd')).toBeVisible();}],
 ['acquired star',async(page,lang)=>{await button(page.locator('dialog.observation-dialog'),lang,'obs.cancel').click();await expect(page.locator('dialog.observation-dialog')).toBeHidden();await tool(page,lang,'starExposure.nav');await button(page,lang,'starExposure.activate').click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await button(page,lang,'starExposure.start').click();await page.clock.runFor(1000);await button(page,lang,'classLink.open').click();await page.clock.resume();await ready(page,lang);
  await expect(page.locator('#class-source')).not.toHaveValue(/^(?:practice|imported:)/);await openAll(main(page));}],
];
async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(lang)}#classification`);
 await expect(page.locator('html')).toHaveAttribute('lang',lang==='es-419'?'es-419':'en');
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 await ready(page,lang);
 for(const [step,run] of STEPS){await run(page,lang);await page.waitForTimeout(200);await each(step);}
}

test('E03 reads differently in Spanish from English: guide, Program List, comparison, displays, width, records, import and acquisition',async({browser})=>{
 test.setTimeout(360_000);
 const seen:Record<'en'|'es-419',Map<string,Set<string>>>={en:new Map(),'es-419':new Map()};
 for(const lang of ['en','es-419'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();// each text once, with the first step that shows it
 for(const [step,list] of seen['es-419'])for(const t of list)if(english.has(bare(t))&&!same(bare(t))&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 // The rendering selector's options are Spanish; the atlas selector keeps the recorded atlas labels.
 const options=[...seen['es-419'].get('classification lab')!].filter(t=>t.startsWith('@option:'));
 for(const key of ['photo.trace','sampledTrace.option','photo.photo','combined.option','class.bracket','class.difference'])expect(options).toContain(`@option:${S[key]}`);
 expect(options).toContain('@option:Main Sequence');
});

test('qps: every text of the E03 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

/** VIREO's captions on each step, in English (View original) or in this load's Spanish. */
const captions=(page:Page,T:(original:string)=>string):Record<string,()=>Promise<void>>=>({
 'classification lab':async()=>{await expect(id(page,'spl-open')).toHaveText(T('Spectral Line &Table'));await expect(programButton(page,P.programList)).toHaveText(T(P.programList).replace(/\.\.\.$/,''));await expect(programButton(page,P.nextOnList)).toHaveText(T(P.nextOnList));},
 'observation results':async()=>{await expect(page.locator('#observation-dialog-title')).toHaveText(T('Observational Data'));},
 'observation edit':async()=>{await expect(page.locator('#observation-dialog-title')).toHaveText(T('Observational Data'));},
 // VIREO's Observational Data field captions for a loaded file (TObsRsltsDlg1, OBSERVATIONAL_DATA_LITERALS), in the web notebook.
 'imported spectrum observation':async()=>{const d=page.locator('dialog.observation-dialog');await expect(page.locator('#observation-dialog-title')).toHaveText(T('Observational Data'));
  await expect(d.locator('dt').nth(2)).toHaveText(T('Observation Time (JD)'));await expect(d.locator('dt').nth(3)).toHaveText(T('Right Ascension:'));await expect(d.locator('dt').nth(4)).toHaveText(T('Declination:'));
  await expect(d.locator('dt').nth(5)).toHaveText(T('Observed Magnitudes'));await expect(d.locator('dt').nth(6)).toHaveText(T('Redshift (Z):'));await expect(d.locator('dt').nth(7)).toHaveText(T('Velocity (V):'));},
 'No More Spectra':async()=>{await expect(page.locator('.classification-program [role=status]')).toHaveText(`${T(P.noMoreSpectra)}. ${T(P.endOfList)} ${S['program.end']}`);},
});

// "View original (English)" (decision 9): with the stored option on, every VIREO caption of the walk is VIREO's English, checked
// one by one, and no Spanish original appears anywhere; OpenVireo's own web text stays Spanish.
test('View original (English) on: every VIREO caption in the E03 walk reads in English, the web text stays Spanish',async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const web=new Set([...Object.values(S),...Object.keys(O)].map(plain));
 const spanish=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t.replace(/&(&?)/g,(_,d:string)=>d));
 const left=new Map<string,string>();
 await walk(page,'es-419',async step=>{
  for(const t of await texts(page))if(spanish.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  // Web text around the VIREO captions stays Spanish.
  if(step==='classification lab'){await expect(page.getByRole('heading',{level:1,name:N('es-419','class.title')})).toBeVisible();await expect(page.locator('#classification-program-title')).toHaveText(S['program.title']);}
  if(step==='No More Spectra')await expect(page.locator('.classification-program [role=status]')).toContainText(S['program.end']);
  if(step==='imported spectrum observation')await expect(page.locator('dialog.observation-dialog p').first()).toHaveText(S['obs.temporary']);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

test('Spanish: every VIREO caption in the E03 walk is its Spanish original; English shows the originals unchanged',async({browser})=>{
 test.setTimeout(360_000);
 for(const lang of ['es-419','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,t=>lang==='en'?t.replace(/&(&?)/g,(_,d:string)=>d):vireoEs(t));
  // English shows the web sentence of the end box in English.
  if(lang==='en')checks['No More Spectra']=async()=>{await expect(page.locator('.classification-program [role=status]')).toHaveText(`${P.noMoreSpectra}. ${P.endOfList} ${E['program.end']}`);};
  await walk(page,lang,async step=>{await checks[step]?.();});
  await page.close();
 }
 expect(vireoEs(P.programList)).not.toBe('Program List...');expect(vireoEs('Observational Data')).not.toBe('Observational Data');for(const t of ['Observation Time (JD)','Right Ascension:','Declination:','Observed Magnitudes','Redshift (Z):','Velocity (V):'])expect(vireoEs(t)).not.toBe(t);expect(vireoEs('Spectral Line &Table')).not.toBe('Spectral Line Table');expect(vireoEs(P.noMoreSpectra)).not.toBe(P.noMoreSpectra);
});

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy was the fixture's default. Run with the CI's DejaVu fonts (docs/I18N.md). */
const LAYOUT:LayoutOptions={};
for(const width of [320,1440])test(`at ${width} px the Spanish E03 screens lay out without overflow, clipping or crossing`,async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 await walk(page,(process.env.ES5_LAYOUT_LANG as Lang|undefined)??'es-419',async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  if(/guide|lab|Program|Spectra|practice|photo|traces|range|cursor|width|review|imported|acquired/.test(step))await page.screenshot({path:test.info().outputPath(`es-e03-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});
