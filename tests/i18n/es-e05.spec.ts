import {type Page,type Locator} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,langQuery} from '../fixtures/language';
import {writeFileSync} from 'node:fs';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import comparison from '../../data/photometry/cluster-comparison-contract.json' with {type:'json'};
import {CLUSTER_HR_ES} from '../../src/i18n/es/maps/clusterHr';
import originals from '../../src/i18n/es/originals.json' with {type:'json'};
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front ES7 (docs/I18N.md): exercise E05, the cluster HR diagram and variable stars, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One
// walk runs in English, Spanish and the pseudo-locale over the cluster guide, the reference database lab (dataset, point
// inspection, Possible Cluster Member, Select Cluster Data, Display/Print Data, exclusions, the native ZAMS/isochrone fit, the
// parameter report and its print preview, the help viewer), the own-observation HR panel, the saved-observation HR tool with
// Observational Data, File › Cluster Data… and the variable-star route.
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and the narrow patterns below (star names, cluster names, catalog and VIREO list lines);
// - qps: every visible text is marked ⟦…⟧, with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.
type Lang='en'|'es-419'|'qps';
const O=originals as Record<string,string>,E=en as Record<string,string>,S=es as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
const SAME=new Set<string>([
 // Formats, names, symbols and units.
 'VIREO','OpenVireo','SHA-256','CSV','JSON','DAT','TXT','Å','×','÷','·','—','✳','↗','#','?','px','V','B','B−V','B − V','E(B−V)','V − Mv','log(age/yr)','GCVS','ZAMS',
 // The recorded metallicity model labels (native-cluster-contract.json), as read from the contract.
 '[Z=0.0004, Y=0.230]','[Z=0.001, Y=0.230]','[Z=0.004, Y=0.240]','[Z=0.008, Y=0.250]','[Z=0.019, Y=0.273] (Solar Values)','[Z=0.030, Y=0.300]',
 // File names the walk reads.
 'night1.dat','observation-results.dat','Dec:','Min:','No','magnitudes','B−V (mag)','E(B−V) (mag)','Dec (°)','E05 note','HD 1','HD 2','HD 3','HD 4',
]);
/** A hash, a file name read by the walk, a coordinate or a number with its unit, and nothing else that could be a word. */
const RECORDED=/^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{12}$/;
/** The print previews' date line as the browser formats it (DateTimeToStr(Now) [W]), and the CLEA exercise title VIREO prints
 * above the light curve (a proper name, core/lightCurvePrint.ts). */
const PRINT_DATE=/^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2}\s?[AP]M$/;
const EXERCISE_TITLE='CLEA Exercise "VIREO - The VIRtual Educational Observatory"';
const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→e*]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→e*]*(?:\s*(?:mag|pc|Myr|d|h|px|Å))*\s*$/;
/** The cluster names with their catalog suffix, exactly as the contract records them (the dataset selector's options). */
const CLUSTER_NAMES=new Set<string>(comparison.clusters.map((c:{name:string})=>c.name));
/** The count and the zero-age line that VIREO draws on its own HR picture and prints (core/clusterHrPlot.ts, clusterHrPrint.ts): an image of VIREO's window, in English. */
const PICTURE_TEXT=/^# of Stars: \d+$|^V - Mv = [\d.]+$|^E\(B-V\) = [\d.]+$/;
/** A reference star's recorded ID (N0730.DAT@379668) and a variable star's GCVS designation, name or type code (recorded GCVS data). */
/** A star's recorded spectral type (K1III). */
const SPECTRAL=/^[OBAFGKM]\d(?:\.\d)?(?:I{1,3}|IV|V)$/;
const RECORDED_ID=/^(?:@option:)?N\d{4}\.DAT@\d+$/;
const GCVS_NAME=/^(?:[A-Z]{1,2}|[A-Z]{1,3}\d*|[a-z]{2,6}) [A-Z][a-z]{2}$/;
/** The GCVS variability types, read from the variable-star page's own type list (CLEA_VStrs.dat) during the walk, and a type
 * option ("DCEP — 1,234"); no ordinary word passes unless the catalog has it as a type. */
const GCVS_TYPES=new Set<string>();
const gcvsType=(text:string)=>{const m=/^(.+?)(?: — [\d,]+)?$/.exec(text)!;return GCVS_TYPES.has(m[1]!);};
/** The light curve's own plot text (VIREO's TLtCrvDsplyForm1 picture). */
const CURVE_TEXT=new Set(['V mag','Phase']);
/** The steps on the variable-star route, where GCVS names and type codes (recorded catalog data) are on screen. */
const VARIABLE_STEPS=new Set(['variable stars','variable star data','variable list saved','variable list print preview','light curve','light curve print preview']);
/** The Cluster Data steps (#observatory), where the cluster names of CLUSTERS.DAT and the Guide Star Catalog IDs are data. */
const CD_NAME=/^(?:NGC|IC|M|Mel|Cr|Tr|Stock|Mine) ?\d*(?: \(NGC \d+\))?$/;
const same=(text:string,step:string)=>CLUSTER_NAMES.has(text.replace(/^@option:/,''))||PICTURE_TEXT.test(text)||SPECTRAL.test(text)||RECORDED_ID.test(text)||(VARIABLE_STEPS.has(step)&&(GCVS_NAME.test(text)||gcvsType(text.replace(/^@option:/,''))||CURVE_TEXT.has(text)))||(step.startsWith('Cluster Data')&&CD_NAME.test(text))||PRINT_DATE.test(text)||text===EXERCISE_TITLE||SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text);
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
/** On #observatory only the Cluster Data windows and their boxes are this front's (the rest of the page is ES2's, es-observatory.spec.ts). */
const CD_ROOTS='[data-testid=cd-dialog],[data-testid=cd-study-list],[data-testid=cluster-data],[data-testid=fi-box]';
const texts=(page:Page,step='')=>page.evaluate(roots=>{
 const out:string[]=[];
 const inScope=(el:Element)=>!roots||el.closest(roots)!==null;
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;if(e.tagName==='DIALOG'&&!(e as HTMLDialogElement).open)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>!inScope(el)||el.closest('.portal-header,script,style,[data-testid$="-topic-list"],[data-testid$="-topic-text"],[data-testid=site-tour]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 for(const t of document.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 return out;
},step.startsWith('Cluster Data')?CD_ROOTS:'');
const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
const main=(page:Page)=>page.locator('main.cluster-database-lab');
// Synthetic 144-byte observation records (format vectors only, as tests/cluster-native-observation-hr.spec.ts builds them).
function extended(value:number):Buffer{const out=Buffer.alloc(10),d=Buffer.alloc(8);d.writeDoubleLE(value,0);const bits=d.readBigUInt64LE(0),sign=Number(bits>>63n),exp=Number(bits>>52n&0x7ffn),frac=bits&((1n<<52n)-1n);
 out.writeBigUInt64LE(1n<<63n|frac<<11n,0);out.writeUInt16LE(exp-1023+16383|sign<<15,8);return out;}
const record=(r:{time:number;object:string;kind:number;v:number;b:number})=>{const b=Buffer.alloc(144);b[0]=r.object.length;b.write(r.object,1,'latin1');b.writeDoubleLE(r.time,16);extended(r.b).copy(b,54);extended(r.v).copy(b,64);b[94]=r.kind;return b;};
const DAT=Buffer.concat([{time:3,object:'HD 3',kind:0,v:12,b:12.25},{time:1,object:'HD 1',kind:1,v:10,b:10.5},{time:2,object:'HD 2',kind:1,v:0,b:11}].map(record));
const BAD=Buffer.alloc(100);

const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
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
 ['Cluster Data dialog',async(page,lang)=>{await page.goto(`/${langQuery(lang)}#observatory`);await expect(page.locator('.sky-card .card-heading > button')).toBeVisible({timeout:30_000});await page.locator('.sky-card .card-heading > button').click();await id(page,'fi-file-menu').click();await id(page,'cluster-data-menu').click();await expect(id(page,'cd-dialog')).toBeVisible();await id(page,'cd-file').click();}],
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
async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(lang)}#cluster-database`);
 await expect(page.locator('html')).toHaveAttribute('lang',lang==='es-419'?'es-419':'en');
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 await expect(main(page)).toBeVisible({timeout:30_000});
 for(const [step,run] of STEPS){await run(page,lang);await page.waitForTimeout(200);await each(step);}
}
test('E05 reads differently in Spanish from English',async({browser})=>{
 test.setTimeout(360_000);
 const seen:Record<'en'|'es-419',Map<string,Set<string>>>={en:new Map(),'es-419':new Map()};
 for(const lang of ['en','es-419'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{await walk(page,lang,async step=>{seen[lang].set(step,new Set(await texts(page,step)));});}catch(e){console.log('FAILED at',[...seen[lang].keys()].pop(),lang);throw e;}
  expect(errors,lang).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();
 for(const [step,list] of seen['es-419'])for(const t of list)if(english.has(bare(t))&&!same(bare(t),step)&&!left.has(t))left.set(t,step);
 if(process.env.E05_DUMP)writeFileSync(process.env.E05_DUMP,[...left].map(([t,step])=>`${step}: ${t}`).join('\n'));
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

test('qps: every text of the E05 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page,step))if(!/[⟦⟧]/.test(t)&&!same(bare(t),step)&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

const NO_SELECTION='Please select (highlight) an item on the list, then select "Selection" -> "Plot" from the menu.';
/** VIREO's captions on each step, in English (View original) or in this load's Spanish. Each is asserted by itself. */
const captions=(page:Page,T:(original:string)=>string):Record<string,()=>Promise<void>>=>({
 'dataset loaded':async()=>{await expect(id(page,'cluster-select-data')).toHaveText(T('Select Cluster Data...'));await expect(id(page,'cluster-display-data')).toHaveText(T('Display/Print Data'));await expect(id(page,'db-hr-print-open')).toHaveText(T('Print'));},
 'Possible Cluster Member':async()=>{const m=id(page,'cluster-member');await expect(m.getByRole('heading',{level:3})).toHaveText(T('Possible Cluster Member'));await expect(id(page,'cluster-member-menu')).toHaveText(T('Item'));
  const f=m.locator('.cluster-member-field span');for(const [i,c] of ['Cluster Name:','ID #:','RA:','V:','Dec:','B-V:','U-B:','Spectral Type:'].entries())await expect(f.nth(i)).toHaveText(T(c));
  await expect(id(page,'cluster-member-add-hot-list')).toHaveText(T('Add to Hot List'));await expect(id(page,'cluster-member-remove')).toHaveText(T('Remove from HR Diagram'));await expect(id(page,'cluster-member-exit')).toHaveText(T('Exit'));},
 'Remove from HR Diagram asked':async()=>{const q=id(page,'cluster-member-question');await expect(q.getByRole('heading')).toHaveText(T('Verify Removal from Plot'));
  await expect(q.locator('.cluster-hr-message')).toHaveText(T('Are you sure you want to remove this star from the HR diagram?\r\n\r\n(Restore via "File"->"Restore Removed Points")').replace(/\r\n/g,'\n'));
  await expect(q.locator('button').nth(0)).toHaveText(T('Yes'));await expect(q.locator('button').nth(1)).toHaveText(T('No'));},
 'Add to Hot List':async()=>{await expect(id(page,'cluster-entry').getByRole('heading').first()).toHaveText(T('Add/Edit Hot List Entry'));},
 'Select Cluster Data':async()=>{await expect(id(page,'cluster-list').getByRole('heading',{level:2})).toHaveText(T('Clusters for Study'));await expect(id(page,'cluster-list-list-menu')).toHaveText(T('List'));await expect(id(page,'cluster-list-print')).toHaveText(T('Print...'));await expect(id(page,'cluster-list-close')).toHaveText(T('Close'));await expect(id(page,'cluster-list-selection-menu')).toHaveText(T('Selection'));},
 'Plot with no selection':async()=>{const b=id(page,'cluster-list-box');await expect(b.getByRole('heading')).toHaveText(T('Information'));await expect(b.locator('p')).toHaveText(T(NO_SELECTION));},
 'Display/Print Data':async()=>{await expect(id(page,'cluster-report').getByRole('heading',{level:2})).toHaveText(T('CLEA Cluster Data'));},
 'HR print preview':async()=>{const p=id(page,'db-hr-print');await expect(p.getByRole('heading',{level:2})).toContainText(T('Color-Magnitude Diagram'));await expect(p.locator('[data-kind=date]')).toContainText(T('     Laboratory Table Number (Not Recorded)'));
  await expect(p.locator('[data-kind=zams]')).toHaveText(T('Fit of Zero-Age Main Sequence:'));await expect(p.locator('[data-kind=caption]')).toHaveText(T('Color-Magnitude Diagram'));},
 'cluster help':async()=>{await expect(id(page,'cluster-help-topics-menu')).toHaveText(T('Topics'));await expect(id(page,'cluster-help-topics').getByRole('heading',{level:2})).toHaveText(T('Select Help Topic'));},
 'observation HR tool':async()=>{await expect(page.locator('#cnhr-plot')).toHaveText(T('Load/Plot'));await expect(page.locator('#cnhr-report')).toHaveText(T('View/Print Parameters'));},
 'observation file added':async()=>{await expect(page.getByRole('heading',{name:T('Recorded Results - Computed Magnitudes')})).toBeVisible();},
 'Observational Data':async()=>{await expect(page.locator('dialog.obsd').getByRole('heading').first()).toHaveText(T('Observational Data'));},
 'variable star data':async()=>{await expect(id(page,'vstar-list-window').getByRole('heading',{level:2})).toHaveText(T('Variable Star Data'));await expect(id(page,'vstar-data-menu')).toHaveText(T('Data'));},
 'light curve':async()=>{await expect(id(page,'light-curve-window').getByRole('heading',{level:2})).toHaveText(T('Simulated Light Curve'));await expect(id(page,'curve-file-menu')).toHaveText(T('File'));await expect(id(page,'curve-exit')).toHaveText(T('Exit'));},
 'listing saved':async()=>{const b=id(page,'fi-box');await expect(b.getByRole('heading')).toHaveText(T('Text File Written'));await expect(id(page,'fi-box-text')).toHaveText(new RegExp(`^${esc(T('Report Text Written to '))} ?.+\\.TXT${esc(T('.'))}$`));},
 'parameter report':async()=>{await expect(id(page,'db-hr-report-print-preview')).toContainText(T('Cluster Age/Distance Parameters'));},
 'Recorded Results':async()=>{await expect(id(page,'cnhr-results').getByRole('heading',{level:2})).toHaveText(T('Recorded Results - Computed Magnitudes'));},
 'variable list saved':async()=>{await expect(id(page,'vstar-notice')).toHaveText(new RegExp(`^${esc(T('Report Text Written to '))} ?.+\\.TXT${esc(T('.'))}$`));},
 'variable list print preview':async()=>{await expect(id(page,'variable-print-date')).toContainText(T('     Laboratory Table Number ').trim());await expect(id(page,'variable-print-date')).toContainText(T('(Not Recorded)'));},
 'light curve print preview':async()=>{await expect(id(page,'variable-print-next-page')).toHaveText(T('(Screen Image Printed on Next Page)'));await expect(id(page,'variable-print-date')).toContainText(T('(Not Recorded)'));},
 'Cluster Data dialog':async()=>{const d=id(page,'cd-dialog');await expect(d.getByRole('heading').first()).toHaveText(T('Cluster Data Parameters'));await expect(id(page,'cd-view-select')).toHaveText(T('View/&Select Cluster from List'));await expect(id(page,'cd-add-to-list')).toHaveText(T('&Add Cluster to List'));
  for(const c of ['Cluster Name or ID','Cluster Center','Type of Listing','Sort By','Use Telescope Coordinates',"Diameter ('):",'Mag. Limit:','&Student (Finding List)'])await expect(d,c).toContainText(T(c));},
 'Cluster Data study list':async()=>{await expect(id(page,'cd-study-list').getByRole('heading').first()).toHaveText(T('Clusters for Study'));},
 'Cluster Data added to hot list':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('Confirmation'));},
 'Cluster Data hot list not saved':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('Current Hot List not Saved!'));},
 'Cluster Data new hot list':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('New Hot List Created'));await expect(id(page,'fi-box-text')).toHaveText(new RegExp(`^${esc(T('All stars from cluster ').trim())}\\s+NGC 752\\s+${esc(T(' placed in Hot List').trim())}$`));},
 'Cluster Data no stars':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('No Stars Found in Field!'));const t=id(page,'fi-box-text');await expect(t).toContainText(T('Possible Error in Field Parameters:'));for(const l of ['MinRA: ','MaxDec: ','LimitMag: '])await expect(t).toContainText(`${T(l).trim()} `);await expect(t).toContainText('5.000');},
 'Cluster Data invalid diameter':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('Input Error!'));await expect(id(page,'fi-box-text')).toHaveText(T('Diameter is Invalid!'));},
 'Cluster Data unsaved list':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('Cluster List not Saved!'));},
});
const esc=(text:string)=>text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&');
// "View original (English)" (decision 9): every VIREO caption of the walk is VIREO's English, checked one by one, and no Spanish
// original appears anywhere; OpenVireo's own web text stays Spanish.
test('View original (English) on: every VIREO caption in the E05 walk reads in English, the web text stays Spanish',async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const web=new Set([...Object.values(S),...Object.keys(O)].map(plain));
 const spanish=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t.replace(/&(&?)/g,(_,d:string)=>d));
 const left=new Map<string,string>();
 await walk(page,'es-419',async step=>{
  for(const t of await texts(page,step))if(spanish.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  if(step==='cluster guide')await expect(page.getByRole('heading',{level:1,name:N('es-419','db.title')})).toBeVisible();
  if(step==='dataset loaded')await expect(id(page,'cluster-reference-count')).toContainText('M 67');
  if(step==='Possible Cluster Member')await expect(id(page,'cluster-member').locator('p.cluster-hr-note').last()).toHaveText(CLUSTER_HR_ES.memberRemoveNote);
  if(step==='observation HR tool')await expect(page.getByRole('heading',{name:N('es-419','obsHr.title')})).toBeVisible();
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

test('Spanish: every VIREO caption in the E05 walk is its Spanish original; English shows the originals unchanged',async({browser})=>{
 test.setTimeout(360_000);
 for(const lang of ['es-419','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,t=>lang==='en'?t.replace(/&(&?)/g,(_,d:string)=>d):vireoEs(t));
  await walk(page,lang,async step=>{await checks[step]?.();});
  await page.close();
 }
 for(const t of ['Possible Cluster Member','Item','Clusters for Study','Display/Print Data','Observational Data','Load/Plot','View/Print Parameters','Variable Star Data','Simulated Light Curve','Select Cluster Data...'])expect(vireoEs(t),t).not.toBe(t);
});

/** Layout problems at this width: page overflow; dialogs that leave the viewport or scroll sideways; buttons, labels, selects,
 * inputs and headings that are clipped, cross their card or dialog, or leave the viewport; plot text outside its SVG. Run with
 * the CI's DejaVu fonts (docs/I18N.md). */
const layoutProblems=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[],width=document.documentElement.clientWidth;
 const visible=(el:Element)=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const name=(el:Element)=>`${el.tagName.toLowerCase()} “${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,40)}”`;
 if(document.documentElement.scrollWidth>width)out.push(`page overflows horizontally (${document.documentElement.scrollWidth} > ${width})`);
 for(const d of document.querySelectorAll<HTMLElement>('dialog[open],[role=dialog][aria-modal=true]')){const r=d.getBoundingClientRect();if(!r.width)continue;
  const id=d.getAttribute('data-testid')??d.className;
  if(r.left<-.5||r.right>width+.5)out.push(`${id} leaves the viewport (${Math.round(r.left)}–${Math.round(r.right)})`);
  if(d.scrollWidth>d.clientWidth+1&&getComputedStyle(d).overflowX!=='visible')out.push(`${id} scrolls horizontally`);}
 const root=document.querySelector('dialog[open],[role=dialog][aria-modal=true]')??document.body;
 for(const c of root.querySelectorAll<HTMLElement>('button,label,legend,h1,h2,h3,h4,select,input,summary,th')){
  if(c.closest('.portal-header,[lang=en]:not(html)')||!visible(c))continue;
  const q=c.getBoundingClientRect(),cs=getComputedStyle(c);
  if(q.width<=2||(cs.clip!=='auto'&&cs.position==='absolute'))continue;// visually hidden (an accessible name only)
  let scroller=false;for(let e=c.parentElement;e&&e!==document.body;e=e.parentElement){const o=getComputedStyle(e).overflowX;if((o==='auto'||o==='scroll')&&e.scrollWidth>e.clientWidth){scroller=true;break;}}
  if(!scroller&&(q.left<-.5||q.right>width+.5))out.push(`${name(c)} leaves the viewport`);
  if(c.scrollWidth>c.clientWidth+1&&['hidden','clip'].includes(getComputedStyle(c).overflowX)&&!['INPUT','SELECT'].includes(c.tagName))out.push(`${name(c)} clipped`);
  const box=c.parentElement?.closest('dialog,.card,details,fieldset,[role=dialog],[role=alertdialog]');
  if(box&&!scroller&&!c.closest('table,.table-scroll,[role=region]')){const b=box.getBoundingClientRect();if(q.right>b.right+1||q.left<b.left-1)out.push(`${name(c)} crosses its ${box.tagName.toLowerCase()}`);}
 }
 for(const t of root.querySelectorAll<SVGTextElement>('svg text')){if(!visible(t)||t.closest('[lang=en]:not(html)'))continue;
  const svg=t.ownerSVGElement!,b=svg.getBoundingClientRect(),q=t.getBoundingClientRect();
  if(q.left<b.left-1||q.right>b.right+1||q.top<b.top-1||q.bottom>b.bottom+1)out.push(`plot text “${t.textContent?.trim().slice(0,40)}” outside its plot ${svg.closest("figure,section")?.className??""} (${[q.left-b.left,b.right-q.right,q.top-b.top,b.bottom-q.bottom].map(Math.round).join(', ')})`);}
 return out;
});
for(const width of [320,1440])test(`at ${width} px the Spanish E05 screens lay out without overflow, clipping or crossing`,async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 await walk(page,'es-419',async step=>{for(const p of await layoutProblems(page))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`es-e05-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});
