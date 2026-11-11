import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page,type Locator} from '@playwright/test';
import {expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import en from '../../../src/i18n/en.json' with {type:'json'};
import comparison from '../../../data/photometry/cluster-comparison-contract.json' with {type:'json'};
import {type LanguageText} from '../languageText';
import {isPseudo,pseudoName,htmlLangOf,type Pseudo} from '../../fixtures/pseudoNames';

// Front SC12 (docs/I18N.md): the walk of tests/i18n/e05.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
/** A test title: Spanish keeps its ES7 title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
export const E=en as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
export const SAME=new Set<string>([
 // Formats, names, symbols and units.
 'VIREO','OpenVireo','SHA-256','CSV','JSON','DAT','TXT','Å','×','÷','·','—','✳','↗','#','?','px','V','B','B−V','B − V','E(B−V)','V − Mv','log(age/yr)','GCVS','ZAMS',
 // The recorded metallicity model labels (native-cluster-contract.json), as read from the contract.
 '[Z=0.0004, Y=0.230]','[Z=0.001, Y=0.230]','[Z=0.004, Y=0.240]','[Z=0.008, Y=0.250]','[Z=0.019, Y=0.273] (Solar Values)','[Z=0.030, Y=0.300]',
 // File names the walk reads.
 'night1.dat','observation-results.dat','Dec:','Min:','magnitudes','B−V (mag)','E(B−V) (mag)','Dec (°)','E05 note','HD 1','HD 2','HD 3','HD 4',
]);
/** A hash, a file name read by the walk, a coordinate or a number with its unit, and nothing else that could be a word. */
export const RECORDED=/^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{12}$/;
/** The print previews' date line as the browser formats it (DateTimeToStr(Now) [W]), and the CLEA exercise title VIREO prints
 * above the light curve (a proper name, core/lightCurvePrint.ts). */
export const PRINT_DATE=/^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2}\s?[AP]M$/;
export const EXERCISE_TITLE='CLEA Exercise "VIREO - The VIRtual Educational Observatory"';
export const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→e*]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→e*]*(?:\s*(?:mag|pc|Myr|d|h|px|Å))*\s*$/;
/** The cluster names with their catalog suffix, exactly as the contract records them (the dataset selector's options). */
export const CLUSTER_NAMES=new Set<string>(comparison.clusters.map((c:{name:string})=>c.name));
/** The count and the zero-age line that VIREO draws on its own HR picture and prints (core/clusterHrPlot.ts, clusterHrPrint.ts): an image of VIREO's window, in English. */
export const PICTURE_TEXT=/^# of Stars: \d+$|^V - Mv = [\d.]+$|^E\(B-V\) = [\d.]+$/;
/** A reference star's recorded ID (N0730.DAT@379668) and a variable star's GCVS designation, name or type code (recorded GCVS data). */
/** A star's recorded spectral type (K1III). */
export const SPECTRAL=/^[OBAFGKM]\d(?:\.\d)?(?:I{1,3}|IV|V)$/;
export const RECORDED_ID=/^(?:@option:)?N\d{4}\.DAT@\d+$/;
export const GCVS_NAME=/^(?:[A-Z]{1,2}|[A-Z]{1,3}\d*|[a-z]{2,6}) [A-Z][a-z]{2}$/;
/** The GCVS variability types, read from the variable-star page's own type list (CLEA_VStrs.dat) during the walk, and a type
 * option ("DCEP — 1,234"); no ordinary word passes unless the catalog has it as a type. */
export const GCVS_TYPES=new Set<string>();
export const gcvsType=(text:string)=>{const m=/^(.+?)(?: — [\d,]+)?$/.exec(text)!;return GCVS_TYPES.has(m[1]!);};
/** The light curve's own plot text (VIREO's TLtCrvDsplyForm1 picture). */
export const CURVE_TEXT=new Set(['V mag','Phase']);
/** The steps on the variable-star route, where GCVS names and type codes (recorded catalog data) are on screen. */
export const VARIABLE_STEPS=new Set(['variable stars','variable star data','variable list saved','variable list print preview','light curve','light curve print preview']);
/** The Cluster Data steps (#observatory), where the cluster names of CLUSTERS.DAT and the Guide Star Catalog IDs are data. */
export const CD_NAME=/^(?:NGC|IC|M|Mel|Cr|Tr|Stock|Mine) ?\d*(?: \(NGC \d+\))?$/;
/** Front PT4: texts of the walk that are the same words in one language (its identical.json, with a reason each): Spanish's No
 * (VIREO's No button, ES7's SAME); Portuguese's Item (Possible Cluster Member's menu, VIREO's word kept as PT1 did), OK (the hot
 * list entry dialog's button, as Windows pt-BR writes it) and the «Pixel (x, y)» column header (pixel is the same word, as PT2
 * kept it). */
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'es-419':new Set(['No']),'pt-BR':new Set(['Item','OK','Pixel (x, y)'])};
export const same=(text:string,step:string,L?:LanguageText)=>(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false))||CLUSTER_NAMES.has(text.replace(/^@option:/,''))||PICTURE_TEXT.test(text)||SPECTRAL.test(text)||RECORDED_ID.test(text)||(VARIABLE_STEPS.has(step)&&(GCVS_NAME.test(text)||gcvsType(text.replace(/^@option:/,''))||CURVE_TEXT.has(text)))||(step.startsWith('Cluster Data')&&CD_NAME.test(text))||PRINT_DATE.test(text)||text===EXERCISE_TITLE||SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text);
export const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
/** Front SC12: an English text's name in any pseudo-locale (qps and the script variants; tests/fixtures/pseudoNames.ts). */
export const pseudo=pseudoName;
export const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
export const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** A catalog key's text in this language (every E05 key: the walk fails on a missing one). */
export const textIn=(L:LanguageText,key:string)=>{const C=L.catalog as Record<string,string>;if(!Object.hasOwn(C,key))throw new Error(`No ${L.entry.englishName} for ${key}`);return C[key];};
/** The accessible name of a catalog key in this language. */
export const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(isPseudo(lang))return pseudo(E[key],params);return exact(fill(textIn(lang,key),params));};
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
export const vireoOf=(L:LanguageText)=>(text:string)=>{const key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();return Object.hasOwn(L.originals,key)?L.originals[key]:key;};
export const button=(scope:Page|Locator,lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>scope.getByRole('button',{name:N(lang,key,params)});
export const label=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByLabel(N(lang,key));

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native
 * `lang="en"` views. */
/** On #observatory only the Cluster Data windows and their boxes are this front's (the rest of the page is ES2's, observatory.spec.ts). */
export const CD_ROOTS='[data-testid=cd-dialog],[data-testid=cd-study-list],[data-testid=cluster-data],[data-testid=fi-box]';
export const texts=(page:Page,step='')=>page.evaluate(roots=>{
 const out:string[]=[];
 const inScope=(el:Element)=>!roots||el.closest(roots)!==null;
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;if(e.tagName==='DIALOG'&&!(e as HTMLDialogElement).open)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>!inScope(el)||el.closest('.portal-header,[data-i18n-shell],script,style,[data-testid$="-topic-list"],[data-testid$="-topic-text"],[data-testid=site-tour]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 for(const t of document.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 return out;
},step.startsWith('Cluster Data')?CD_ROOTS:'');
export const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
export const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
export const main=(page:Page)=>page.locator('main.cluster-database-lab');
// Synthetic 144-byte observation records (format vectors only, as tests/cluster-native-observation-hr.spec.ts builds them).
export function extended(value:number):Buffer{const out=Buffer.alloc(10),d=Buffer.alloc(8);d.writeDoubleLE(value,0);const bits=d.readBigUInt64LE(0),sign=Number(bits>>63n),exp=Number(bits>>52n&0x7ffn),frac=bits&((1n<<52n)-1n);
 out.writeBigUInt64LE(1n<<63n|frac<<11n,0);out.writeUInt16LE(exp-1023+16383|sign<<15,8);return out;}
export const record=(r:{time:number;object:string;kind:number;v:number;b:number})=>{const b=Buffer.alloc(144);b[0]=r.object.length;b.write(r.object,1,'latin1');b.writeDoubleLE(r.time,16);extended(r.b).copy(b,54);extended(r.v).copy(b,64);b[94]=r.kind;return b;};
export const DAT=Buffer.concat([{time:3,object:'HD 3',kind:0,v:12,b:12.25},{time:1,object:'HD 1',kind:1,v:10,b:10.5},{time:2,object:'HD 2',kind:1,v:0,b:11}].map(record));
export const BAD=Buffer.alloc(100);

export const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
 ['cluster guide',async(page)=>{await expect(main(page).getByRole('heading',{level:1})).toBeVisible();await id(page,'cluster-lab-open').click();await expect(id(page,'cluster-lab-dialog')).toBeVisible();await openAll(id(page,'cluster-lab-dialog'));}],
 ['lab before a dataset',async(page)=>{await id(page,'cluster-lab-close').click();await expect(id(page,'cluster-lab-dialog')).toBeHidden();}],
 ['dataset loaded',async(page,lang)=>{await page.locator('#cluster-database-choice').selectOption('m67');await button(main(page),lang,'db.load').click();await expect(id(page,'cluster-reference-count')).toBeVisible({timeout:30_000});}],
 ['point inspected',async(page)=>{const v=await page.locator('#cluster-point-choice option').nth(3).getAttribute('value');await page.locator('#cluster-point-choice').selectOption(v!);await expect(id(page,'cluster-selected-point')).toBeVisible();}],
 ['Possible Cluster Member',async(page)=>{await id(page,'cluster-member-open').click();await expect(id(page,'cluster-member')).toBeVisible();await expect(id(page,'cluster-member-id')).not.toHaveText('',{timeout:20_000});await id(page,'cluster-member-menu').click();}],
 ['Remove from HR Diagram asked',async(page)=>{await id(page,'cluster-member-remove').click();await expect(id(page,'cluster-member-question')).toBeVisible();}],
 ['star removed',async(page)=>{await id(page,'cluster-member-question').locator('.primary-button').click();await expect(id(page,'cluster-member-status')).not.toHaveText('');}],
 ['Add to Hot List',async(page)=>{await id(page,'cluster-member-menu').click();await id(page,'cluster-member-add-hot-list').click();await expect(id(page,'cluster-entry')).toBeVisible();}],
 ['hot list entry cancelled',async(page)=>{await page.keyboard.press('Escape');await expect(id(page,'cluster-entry')).toBeHidden();await id(page,'cluster-member-menu').click();await id(page,'cluster-member-exit').click();await expect(id(page,'cluster-member')).toHaveCount(0);}],
 ['exclusion confirmation',async(page,lang)=>{const v=await page.locator('#cluster-point-choice option').nth(5).getAttribute('value');await page.locator('#cluster-point-choice').selectOption(v!);await button(main(page),lang,'ce.exclude').click();await expect(page.locator('dialog[open]')).toBeVisible();}],
 ['point excluded',async(page,lang)=>{await button(page.locator('dialog[open]'),lang,'ce.confirm').click();await expect(page.locator('dialog[open]')).toHaveCount(0);}],
 ['values table',async(page,lang)=>{await main(page).locator('summary').filter({hasText:N(lang,'db.values')}).click();await expect(main(page).locator('.photometer-table tbody tr').first()).toBeVisible();}],
 ['Select Cluster Data',async(page)=>{await id(page,'cluster-select-data').click();await expect(id(page,'cluster-list')).toBeVisible({timeout:20_000});await id(page,'cluster-list-list-menu').click();}],
 ['cluster list print preview',async(page)=>{await id(page,'cluster-list-print').click();await expect(id(page,'cluster-list-print-preview')).toBeVisible();}],
 ['Plot with no selection',async(page)=>{await id(page,'cluster-list-print-preview-close').click();await id(page,'cluster-list-selection-menu').click();await id(page,'cluster-list-plot').click();await expect(id(page,'cluster-list-box')).toBeVisible();}],
 ['cluster list closed',async(page)=>{await id(page,'cluster-list-box').locator('button').click();await id(page,'cluster-list-list-menu').click();await id(page,'cluster-list-close').click();await expect(id(page,'cluster-list')).toHaveCount(0);}],
 ['Display/Print Data',async(page)=>{await id(page,'cluster-display-data').click();await expect(id(page,'cluster-report')).toBeVisible({timeout:20_000});}],
 ['listing saved',async(page)=>{await id(page,'cluster-report-list-menu').click();await id(page,'cluster-report-save-menu').click();await id(page,'cluster-report-save-displayed').click();await expect(id(page,'fi-box')).toBeVisible();}],
 ['listing closed',async(page)=>{await id(page,'fi-box').getByRole('button').first().click();await expect(id(page,'fi-box')).toHaveCount(0);await id(page,'cluster-report-list-menu').click();await id(page,'cluster-report-close').click();await expect(id(page,'cluster-report')).toHaveCount(0);}],
 ['trial fit',async(page)=>{await page.locator('#db-native-modulus').fill('9.5');await page.locator('#db-native-logage').fill('9.65');await page.locator('#db-native-model').selectOption('4');await expect(id(page,'native-preview')).toBeVisible({timeout:20_000});await openAll(main(page));}],
 ['fit confirmed',async(page,lang)=>{await page.locator('#db-native-interpretation').fill('E05 note');await button(main(page),lang,'nc.confirm').click();await expect(id(page,'native-confirmed-age')).toBeVisible();await expect(id(page,'cluster-comparison-table')).toBeVisible();}],
 ['parameter report',async(page)=>{await expect(id(page,'db-hr-report')).toBeVisible();await id(page,'db-hr-report-print').click();await expect(id(page,'db-hr-report-print-preview')).toBeVisible();}],
 ['HR print preview',async(page)=>{await id(page,'db-hr-report-print-preview').locator('button').last().click();await id(page,'db-hr-print-open').scrollIntoViewIfNeeded();await id(page,'db-hr-print-open').click();await expect(id(page,'db-hr-print')).toBeVisible();}],
 ['cluster help',async(page)=>{await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);await id(page,'cluster-help-open').click();await expect(id(page,'cluster-help-topics')).toBeVisible({timeout:20_000});await id(page,'cluster-help-topics-menu').click();}],
 ['own observations HR',async(page)=>{await page.keyboard.press('Escape');await page.keyboard.press('Escape');await id(page,'own-hr-summary').click();await expect(id(page,'own-hr-adaptation')).toBeVisible({timeout:20_000});await openAll(page.locator('.own-hr-disclosure'));}],
 ['observation HR tool',async(page,lang)=>{await id(page,'own-hr-summary').click();await page.locator('summary').filter({hasText:N(lang,'obsHr.workspaceSummary')}).click();await expect(page.getByRole('heading',{name:N(lang,'obsHr.title')})).toBeVisible({timeout:20_000});}],
 ['observation file refused',async(page,lang)=>{await label(page,lang,'obsHr.chooseFile').setInputFiles({name:'bad.dat',mimeType:'application/octet-stream',buffer:BAD});await expect(page.getByRole('alert').first()).toBeVisible();}],
 ['observation file reviewed',async(page,lang)=>{await button(page,lang,'obsHr.dismiss').click();await label(page,lang,'obsHr.chooseFile').setInputFiles({name:'night1.dat',mimeType:'application/octet-stream',buffer:DAT});await expect(id(page,'cnhr-pending')).toBeVisible();}],
 ['observation file added',async(page,lang)=>{await button(page,lang,'obsHr.addPending').click();await expect(id(page,'cnhr-pending')).toHaveCount(0);}],
 ['observations plotted',async(page,lang)=>{await button(page,lang,'obsHr.plotButton').click();await expect(id(page,'cnhr-count')).toBeVisible();await openAll(page.locator('.cnhr,section').filter({has:id(page,'cnhr-count')}).first());}],
 ['Recorded Results',async(page)=>{await id(page,'cnhr-display-data').click();await expect(id(page,'cnhr-results')).toBeVisible();}],
 ['Recorded Results closed',async(page)=>{await id(page,'cnhr-results-list-menu').click();await id(page,'cnhr-results-close').click();await expect(id(page,'cnhr-results')).toHaveCount(0);}],
 ['Observational Data',async(page)=>{await page.locator('[data-testid=cnhr-point]').first().click({button:'right'});await expect(page.locator('dialog.obsd')).toBeVisible();}],
 ['observation overlays',async(page,lang)=>{await page.locator('dialog.obsd').locator('button').last().click();await expect(page.locator('dialog.obsd')).toHaveCount(0);await page.getByLabel(N(lang,'obsHr.zams')).check();await page.getByLabel(N(lang,'obsHr.isochrone')).check();await page.waitForTimeout(500);}],
 ['variable stars',async(page)=>{await page.evaluate(()=>{location.hash='#variable-stars';});await expect(id(page,'variable-count')).toContainText(/\d/,{timeout:30_000});
  for(const v of await page.locator('[data-testid=variable-type] option').evaluateAll(o=>o.map(x=>(x as HTMLOptionElement).value)))if(v.startsWith('='))GCVS_TYPES.add(v.slice(1));}],
 ['variable star data',async(page)=>{await id(page,'variable-name').fill('del Cep');await page.locator('[data-testid=variable-results] tbody button').first().click();await expect(id(page,'vstar-list-window')).toBeVisible();await id(page,'vstar-data-menu').click();}],
 ['variable list saved',async(page)=>{await id(page,'vstar-save-menu').click();await id(page,'vstar-save-displayed').click();await expect(id(page,'vstar-notice')).not.toHaveText('');}],
 ['variable list print preview',async(page)=>{await id(page,'vstar-data-menu').click();await id(page,'vstar-print').click();await expect(id(page,'variable-print-preview')).toBeVisible();}],
 ['light curve',async(page)=>{await id(page,'variable-print-close').click();await expect(id(page,'variable-print-preview')).toHaveCount(0);await id(page,'vstar-data-menu').click();await id(page,'vstar-display-curve').click();await expect(id(page,'light-curve-window')).toBeVisible();await id(page,'curve-file-menu').click();}],
 ['light curve print preview',async(page)=>{await id(page,'curve-print').click();await expect(id(page,'variable-print-preview')).toBeVisible();await page.locator('[data-testid=variable-print-orientation] input').last().check();}],
 // File › Cluster Data… (Front K) on the observatory route: the dialog, VIREO's study list, the field report and its boxes.
 ['Cluster Data dialog',async(page,lang)=>{await page.goto(`/${langQuery(tagOf(lang))}#observatory`);await expect(page.locator('.sky-card .card-heading > button')).toBeVisible({timeout:30_000});await page.locator('.sky-card .card-heading > button').click();await id(page,'fi-file-menu').click();await id(page,'cluster-data-menu').click();await expect(id(page,'cd-dialog')).toBeVisible();await id(page,'cd-file').click();}],
 ['Cluster Data study list',async(page)=>{await id(page,'cd-view-select').click();await expect(id(page,'cd-study-list')).toBeVisible();await id(page,'cd-study-selection-menu').click();}],
 ['Cluster Data report',async(page)=>{await page.keyboard.press('Escape');await id(page,'cd-study-lines').getByText('NGC 752',{exact:false}).first().dblclick();await expect(id(page,'cd-study-list')).toHaveCount(0);await id(page,'cd-ok').click();await expect(id(page,'cluster-data-lines')).toBeVisible({timeout:30_000});await id(page,'cluster-data-line-7').click();await id(page,'cluster-data-selection-menu').click();}],
 ['Cluster Data added to hot list',async(page)=>{await id(page,'cluster-data-add').click();await expect(id(page,'fi-box')).toBeVisible();}],
 ['Cluster Data hot list not saved',async(page)=>{await id(page,'fi-box').getByRole('button').first().click();await id(page,'cluster-data-selection-menu').click();await id(page,'cluster-data-entire').click();await expect(id(page,'cd-hot-unsaved-no')).toBeVisible();}],
 ['Cluster Data new hot list',async(page)=>{await id(page,'cd-hot-unsaved-no').click();await expect(id(page,'fi-box')).toBeVisible();}],
 ['Cluster Data no stars',async(page)=>{await id(page,'fi-box').getByRole('button').first().click();await id(page,'fi-file-menu').click();await id(page,'cluster-data-menu').click();await expect(id(page,'cd-dialog')).toBeVisible();await id(page,'cd-limit').fill('5.0');await id(page,'cd-ok').click();await expect(id(page,'fi-box')).toBeVisible({timeout:30_000});}],
 ['Cluster Data invalid diameter',async(page)=>{await id(page,'fi-box').getByRole('button').first().click();await id(page,'fi-file-menu').click();await id(page,'cluster-data-menu').click();await expect(id(page,'cd-dialog')).toBeVisible();await id(page,'cd-diameter').fill('x');await id(page,'cd-ok').click();await expect(id(page,'fi-box')).toBeVisible();}],
 ['Cluster Data unsaved list',async(page)=>{await id(page,'fi-box').getByRole('button').first().click();await id(page,'cd-name').fill('Mine');await id(page,'cd-diameter').fill('5');await id(page,'cd-file').click();await id(page,'cd-add-to-list').click();await id(page,'cd-file').click();await id(page,'cd-view-select').click();await expect(id(page,'cd-study-list')).toBeVisible();await page.keyboard.press('Escape');await expect(id(page,'cd-unsaved-yes')).toBeVisible();}],
 ['Cluster Data Save List unavailable',async(page)=>{await id(page,'cd-unsaved-yes').click();await expect(id(page,'fi-box')).toBeVisible();}],
];
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#cluster-database`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 await expect(main(page)).toBeVisible({timeout:30_000});
 for(const [step,run] of STEPS){await run(page,lang);await page.waitForTimeout(200);await each(step);}
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy was the fixture's default. Run with the CI's DejaVu fonts (docs/I18N.md). */
export const LAYOUT:LayoutOptions={};
