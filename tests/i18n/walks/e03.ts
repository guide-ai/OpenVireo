import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page,type Locator} from '@playwright/test';
import {expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import {readFileSync} from 'node:fs';
import {CLASSIFY_PROGRAM_LITERALS_RESTATED} from '../classifyProgramLiterals';
import en from '../../../src/i18n/en.json' with {type:'json'};
import {type LanguageText} from '../languageText';
import {isPseudo,pseudoName,htmlLangOf,type Pseudo} from '../../fixtures/pseudoNames';

// Front SC12 (docs/I18N.md): the walk of tests/i18n/e03.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
/** A test title: Spanish keeps its ES5 title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
/** VIREO's Program List... and Next on List items and the No More Spectra box (CLASSIFY_PROGRAM_LITERALS, restated). */
export const P=CLASSIFY_PROGRAM_LITERALS_RESTATED;
export const E=en as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
export const SAME=new Set<string>([
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
export const STAR=/^(?:HD|BD|HR|HZ|SAO|Feige|Gl|O)\s?[+-]?\d[\d.+-]*(?: \d{1,4})?\s?[A-Z]?$|^[OBAFGKM]\d(?:\.\d)?\s?(?:I{1,3}|IV|V|Ia|Ib|Iab|Ia0)(?:[ab]|-[IV]+)?(?:\(\(?f\)?\))?$/;
/** A hash (with or without its SHA-256 label), an imported file's source identity (imported:<SHA-256>), an acquisition identity, an original spectrum file (A0000021.SP) or the acquired
 * star's spectrum file name. */
export const RECORDED=/^imported:[0-9a-f]{64}$|^[0-9a-f]{20}$|^(?:Single|Double) · (?:32|64) bits$|^\d{8} · [A-Z]{1,4}$|^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{12}$|^acq-[0-9a-z-]{8,}$|^A\d{7}\.SP$|^catalog-star-[0-9a-f]{12}\.sp$/;
/** A number with its unit or symbol, and nothing else that could be a word. */
export const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→e]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→e]*(?:\s*(?:Å|ms|px|×))*\s*$/;
/** The acquired source option and the imported file's option (recorded designation or file name, then a hash prefix). */
export const COMPOSED=/^N0000\.DAT@14428 · [0-9a-z-]{12}(?: · \d+ ms)?$|^limited\.sp · [0-9a-f]{12}$/;
export const OWN='E03 own proposal';
/** The authored program list of docs/CLASSIFICATION-PROGRAM-IMPORT.md, a synthetic observation DAT (tests/fixtures) and a native
 * results TXT built as tests/native-text-results.spec.ts builds its example. */
export const LST=Buffer.from("'First alias' 'A0000021.sp'\r\n'Repeated alias' 'A0000021.sp'\r\n'Last alias' 'A0000014.sp'\r\n",'latin1');
export const DAT=readFileSync(new URL('../../fixtures/observation-results-synthetic.dat',import.meta.url));
export const TXT=(()=>{const row=Array(240).fill(' '),put=(at:number,text:string)=>[...text].forEach((c,i)=>row[at-1+i]=c);put(1,'OWN-TEXT');put(13,'1179.125000');put(26,'05h30m12.3s');put(38,'-06°15\'30"');for(let i=0;i<3;i++)put(49+10*i,'1.25');put(79,'0.125');put(91,'Own G2V');put(104,'My original comment');
 return Buffer.from('Object ID    MJD(Days)      RA           Dec         U         B         V         Z      Spectrum     Comments\r\n'+row.join('').trimEnd()+'\r\n','latin1');})();
export const TXT_LINES=new Set(TXT.toString('latin1').split('\r\n').filter(Boolean).map(l=>l.trim()));
/** Front PT3: texts of the walk that are the same words in another language (its identical.json, with a reason each). Spanish
 * adds none (ES5's SAME is unchanged). */
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set([])};
export const same=(text:string,L?:LanguageText)=>{
 if(TXT_LINES.has(text))return true;// the synthetic TXT's header and row, shown as read
 if(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false))return true;
 if(SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text)||STAR.test(text)||COMPOSED.test(text)||text===OWN)return true;
 let m=/^\d{1,2} · (.+)$/.exec(text);if(m&&(STAR.test(m[1])||SAME.has(m[1])))return true;// a program-list row ("10 · BD+63 137", "1 · First alias") or a TXT row choice
 m=/^(.+) · E03 own proposal$/.exec(text);if(m&&STAR.test(m[1]))return true;// a record: the star and the student's own type
 m=/^\d{4}(?:\.\d{1,3})? Å · (.+)$/.exec(text);if(m&&SAME.has(m[1]))return true;// a line-table row's name: wavelength and SPECLNS.LNL label
 m=/^(.+) \/ (.+)$/.exec(text);return !!m&&STAR.test(m[1])&&STAR.test(m[2]);// a standard pair: "A1 V / A3 V"
};
export const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
/** Front SC12: an English text's name in any pseudo-locale (qps and the script variants; tests/fixtures/pseudoNames.ts). */
export const pseudo=pseudoName;
export const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
export const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** A catalog key's text in this language: its translation, or, for a language before its release, the English the page then
 * shows for the star exposure route the walk passes through (E01's, a later front). A released language must have it. FR3 review:
 * only a `starExposure.` key may fall back, and only while the language has not done `e01`; any other key the walk names is E03's
 * own (or the shell's), so a missing one fails instead of matching the preview's English. */
export const textIn=(L:LanguageText,key:string)=>{const C=L.catalog as Record<string,string>;if(Object.hasOwn(C,key))return C[key];if(L.entry.released||!key.startsWith('starExposure.')||L.done.has('e01'))throw new Error(`No ${L.entry.englishName} for ${key}`);return E[key];};
/** The accessible name of a catalog key in this language. */
export const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(isPseudo(lang))return pseudo(E[key],params);return exact(fill(textIn(lang,key),params));};
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
export const vireoOf=(L:LanguageText)=>(text:string)=>{const key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();return Object.hasOwn(L.originals,key)?L.originals[key]:key;};
export const button=(scope:Page|Locator,lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>scope.getByRole('button',{name:N(lang,key,params)});
export const label=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByLabel(N(lang,key));

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native
 * `lang="en"` views. */
export const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;if(e.tagName==='DIALOG'&&!(e as HTMLDialogElement).open)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,[data-i18n-shell],script,style,[data-testid=site-tour]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 for(const t of document.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 return out;
});
export const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
export const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
export const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:N(lang,key)}).click();
};
export const main=(page:Page)=>page.locator('main.classification-main');
export const ready=async(page:Page,lang:Lang)=>{await expect(main(page)).toHaveAttribute('aria-busy','false',{timeout:30_000});await expect(button(main(page),lang,'class.review')).toBeEnabled({timeout:30_000});};
export const programButton=(page:Page,original:string)=>page.locator('.classification-program .class-actions button').nth(original===P.programList?0:1);
export const programDialog=(page:Page)=>page.locator('dialog.program-list-modal');
export async function gesture(page:Page,s:Locator,x:number,y:number){await s.scrollIntoViewIfNeeded();const b=(await s.boundingBox())!;await page.mouse.move(b.x+b.width*x+.25,b.y+b.height*y);await page.mouse.down();await page.mouse.move(b.x+b.width*x+.25,b.y+b.height*y);await page.mouse.up();}

/** The walk through E03. Each step leaves the screen in the state its texts are read in. */
export const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
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
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#classification`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 await ready(page,lang);
 for(const [step,run] of STEPS){await run(page,lang);await page.waitForTimeout(200);await each(step);}
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy was the fixture's default. Run with the CI's DejaVu fonts (docs/I18N.md). */
export const LAYOUT:LayoutOptions={};
