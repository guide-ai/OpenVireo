import {type Page,type Locator} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,langQuery} from '../fixtures/language';
import {layoutProblems,type LayoutOptions} from '../fixtures/layoutProblems';
import {readFile} from 'node:fs/promises';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import originals from '../../src/i18n/es/originals.json' with {type:'json'};
import {WEDGE_ES} from '../../src/i18n/es/maps/wedge';
import {SPECTRAL_RANGE_ES} from '../../src/i18n/es/maps/spectralRange';
import {OBSERVATORY_ES} from '../../src/i18n/es/maps/observatory';
import {POLISH_ES} from '../../src/i18n/es/maps/polish';
import {enterInstructorMode} from '../fixtures/instructor-mode';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front ES4 (docs/I18N.md): exercise E02, Large-Scale Structure, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk through the
// whole student flow runs in English, Spanish and the pseudo-locale: the LSS guide, the survey (field list, row statuses, pointing,
// exposure, the measurement panel, Record Z and VIREO's Measured Redshift Data with its refusal and its Z Measurement Saved box,
// Save Data (.TXT)), the wedge with the student's own records (Options, the Load Saved Data prompts and notices, a selected row,
// Print Wedge Plot), and the instructor's LSS Galaxy Data (Edit Mode: the region dialog, its Input Error and Search Results
// boxes and the Retain Current Data? prompt).
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and plain numbers with units, hashes and saved file lines (narrow regexes);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.
type Lang='en'|'es-419'|'qps';
const O=originals as Record<string,string>,E=en as Record<string,string>,S=es as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
const SAME=new Set<string>([
 // Formats, names, symbols and units.
 'VIREO','OpenVireo','SHA-256','CSV','JSON','SSP','TXT','(.TXT)','z','Z','V','Dec','Dec (°)','JD','#','?','↗','×','—','✳','·','km/s','V (km/s)','V / Z','Z(=V/C)','V(km/sec)',
 'V binary32','Z binary32','px','h','°',
 // The same word in Spanish (identical.json): a row status and VIREO's No button.
 'Observable','No',
 // The telescope names of the bundled optical profiles (identifiers, as on the observatory).
 '0.4m (16") Telescope','KPNO 0.9m (36") Telescope','KPNO 4m (158") Mayall Telescope',
 // Record identity as written in the student's files and the wedge's receipts (WEDGE_OWN_RECORDS_NAME), the LSS field lists' file
 // names, the LSS results file name, the catalogue galaxy ids of field 1 and the original line list's labels (GLXYLNS.LST).
 'OpenVireo LSS records','LSS_Redshifts.TXT','LSS_Galaxy_Data.TXT','bad.txt','bad.csv','LSSFields.LST','CLEA_GLX.DAT',
 'K Line','H Line','G Band','K Line (Ca II)','H Line (Ca II + H)','G Band (Blend)',
]);
/** Galaxy ids from the field lists (catalogue designations, e.g. 12021+3127, NGC 4080, IC 3046, UGC 7085, CGCG 158-084). */
const GALAXY=/^(?:\d{5}[+-]\d{4}|(?:NGC|IC|UGC|CGCG|MCG|MRK|KUG)\s?\d[\d+-]*(?:\s?[A-Z\d-]{1,4})?|A\d[\d+-]*)$/;
/** A hash (with or without its SHA-256 label), a binary32 bit pattern, the print date (en-US numbers in every language), a saved .TXT line (the wedge's Saved line), a field list file name
 * or the saved file's header. */
const RECORDED=/^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{8}$|^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d\d:\d\d [AP]M$|^\S.{10}\s+\d{4}\.\d{6}\s+\d+h\d\dm\d\d\.\ds|^LSS_Field0\d\.HTL$|^Object ID +MJD\(Days\)/;
/** A number with its unit or symbol, and nothing else that could be a word. */
const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×/()[\]–%=→hms]*\d[-+−±\d\s.,:;°′″'"·×/()[\]–%=→hms]*(?:\s*(?:Å|km\/s|Mpc|ms|mag|h|s|m|JD|z|px|°))*\s*$/;
const same=(text:string)=>SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text)||GALAXY.test(text);
const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
const pseudo=(text:string)=>new RegExp(`^${MARK}${[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join(MARK)}${MARK}$`);
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** The accessible name of a catalog key in this language. */
const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(lang==='qps')return pseudo(fill(E[key],params));if(!Object.hasOwn(S,key))throw new Error(`No Spanish for ${key}`);return exact(fill(S[key],params));};
/** vireo() of a Spanish load, as src/i18n/vireo.ts computes it (the literal when there is no original). */
const vireoEs=(text:string,context?:string)=>{const key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();if(context!==undefined&&Object.hasOwn(O,`${context}|${key}`))return O[`${context}|${key}`];
 return Object.hasOwn(O,key)?/^\s*/.exec(text)![0]+O[key]+/\s*$/.exec(text)![0]:text;};
const button=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByRole('button',{name:N(lang,key)});

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native
 * `lang="en"` views. */
const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
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
const SEED_TXT='Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments\r\n';

type Context={txt?:Buffer};
/** The walk through E02. Each step leaves the screen in the state its texts are read in. */
const STEPS:readonly (readonly [string,(page:Page,lang:Lang,c:Context)=>Promise<void>])[]=[
 ['LSS lab guide',async(page,lang)=>{await tool(page,lang,'lssLab.nav');await expect(id(page,'lss-lab')).toBeVisible();}],
 ['LSS survey',async(page,lang)=>{await button(id(page,'lss-lab').locator('[data-testid=lss-lab-step-load]'),lang,'lssLab.goSurvey').click();await expect(id(page,'lss-lab')).toBeHidden();
  await expect(page.getByRole('heading',{name:N(lang,'lss.title')})).toBeVisible();await expect(page.locator('#lss-field')).toBeEnabled({timeout:30_000});}],
 ['field list loaded',async(page,lang)=>{await page.locator('#lss-field').selectOption('1');await button(page,lang,'lss.load').click();await expect(id(page,'lss-rows')).toBeVisible({timeout:30_000});
  await expect(page.locator('[data-testid^="lss-row-"]')).toHaveCount(23);}],
 ['exposure paused',async(page,lang)=>{await button(id(page,'lss-row-1'),lang,'lss.point').click();await button(page,lang,'lss.exposure.activate').click();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,lang,'lss.exposure.start').click();
  await page.clock.runFor(2000);await button(page,lang,'lss.exposure.pause').click();await expect(id(page,'lss-elapsed')).toContainText('2000');await page.clock.resume();
  await openAll(page.locator('body'));}],
 ['measurement panel',async(page,lang)=>{await page.locator('#lss-step').fill('.001');await button(page,lang,'lss.measure.setStep').click();await page.locator('#lss-shift').fill('20');
  await expect(id(page,'lss-current-z')).toContainText('+0.020');}],
 ['Measured Redshift Data',async page=>{await page.locator('.lss-measure button.primary-button').click();await expect(page.locator('dialog.lss-dialog[open]')).toBeVisible();}],
 ['velocity refusal',async page=>{await page.locator('dialog.lss-dialog[open] button[type=submit]').click();await expect(page.locator('#lss-dialog-error')).toBeVisible();}],
 ['velocity invalid',async page=>{await id(page,'lss-dialog-velocity').fill('5000');await page.locator('dialog.lss-dialog[open] button[type=submit]').click();
  await expect(page.locator('#lss-dialog-error')).toBeVisible();}],
 ['redshift recorded',async page=>{const z=Number(await id(page,'lss-dialog-z').inputValue());await id(page,'lss-dialog-velocity').fill(String(Math.round(299792.458*z*100)/100));
  await page.locator('dialog.lss-dialog[open] button[type=submit]').click();await expect(page.locator('dialog.lss-dialog[open]')).toHaveCount(0);await expect(page.locator('[data-testid=lss-results] tbody tr')).toHaveCount(1);}],
 ['Save Data (.TXT)',async(page,_lang,c)=>{const d=page.waitForEvent('download');await id(page,'lss-results-txt').click();c.txt=await readFile((await(await d).path())!);}],
 ['wedge with own records',async(page,lang)=>{await button(page,lang,'lss.results.plot').click();await expect(id(page,'wedge-count')).toBeVisible({timeout:30_000});
  await expect(page.getByRole('heading',{level:1,name:N(lang,'wedge.routeTitle')})).toBeVisible();await openAll(page.locator('body'));}],
 ['wedge options',async page=>{await id(page,'wedge-options-open').click();await expect(id(page,'wedge-options')).toBeVisible();}],
 ['Retain Current Data?',async(page,_lang,c)=>{await id(page,'wedge-options-cancel').click();await expect(id(page,'wedge-options')).toHaveCount(0);
  await id(page,'wedge-file').setInputFiles({name:'LSS_Redshifts.TXT',mimeType:'text/plain',buffer:c.txt!});await expect(id(page,'wedge-prompt')).toHaveAttribute('data-stage','retain');}],
 ['Confirm Deletion!',async page=>{await id(page,'wedge-prompt-no').click();await expect(id(page,'wedge-prompt')).toHaveAttribute('data-stage','confirm-delete');}],
 ['Saved Data Loaded',async page=>{await id(page,'wedge-prompt-yes').click();await expect(id(page,'wedge-notice')).toHaveAttribute('data-kind','loaded');}],
 ['TXT Files Only',async page=>{await id(page,'wedge-notice-dismiss').click();await id(page,'wedge-file').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from(SEED_TXT)});
  await expect(id(page,'wedge-notice')).toHaveAttribute('data-cause','extension');}],
 ['No Data Loaded!',async page=>{await id(page,'wedge-notice-dismiss').click();await id(page,'wedge-file').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('hello\r\n')});
  await expect(id(page,'wedge-notice')).toHaveAttribute('data-cause','header');}],
 ['wedge row selected',async page=>{await id(page,'wedge-notice-dismiss').click();await id(page,'wedge-row-0').getByRole('button').click();await expect(id(page,'wedge-details')).toBeVisible();await openAll(page.locator('body'));}],
 ['Print Wedge Plot',async page=>{await id(page,'wedge-print').click();await expect(id(page,'wedge-print-preview')).toBeVisible();}],
 // LSS Galaxy Data shows only with Edit Mode (an instructor option, VIREO's LargeScaleStructure1Click).
 ['LSS Galaxy Data (Edit Mode)',async(page,lang)=>{await id(page,'wedge-print-preview-close').click();await tool(page,lang,'sky.observatory');
  const dome=page.getByRole('button',{name:new RegExp(N(lang,'sky.open').source.replace(/\$$/,'').concat(' ↗$'))});if(await dome.isVisible())await dome.click();
  await enterInstructorMode(page);await page.getByTestId('ob-options').first().click();await page.getByTestId('ob-options-edit-mode').check();await page.getByTestId('ob-options-ok').click();
  await tool(page,lang,'lss.nav');await expect(id(page,'lss-region-card')).toBeVisible();}],
 ['Extract LSS Galaxy Data for Region',async page=>{await id(page,'lss-region-open').click();await expect(id(page,'lss-region-ok')).toBeVisible();}],
 ['Input Error!',async page=>{await id(page,'lss-region-ok').click();await expect(id(page,'lss-region-box')).toBeVisible();}],
 ['non-numeric data',async page=>{await id(page,'lss-region-box').getByRole('button').click();await expect(id(page,'lss-region-box')).toBeHidden();
  await id(page,'lss-region-raMin').fill('abc');await id(page,'lss-region-ok').click();await expect(id(page,'lss-region-box')).toBeVisible();}],
 ['Search Results',async page=>{await id(page,'lss-region-box').getByRole('button').click();await expect(id(page,'lss-region-box')).toBeHidden();
  for(const [k,v] of [['raMin','12'],['raMax','12.5'],['decMin','27'],['decMax','29']])await id(page,`lss-region-${k}`).fill(v);
  await id(page,'lss-region-ok').click();await expect(id(page,'lss-region-box')).toContainText('24069',{timeout:30_000});}],
 ['region rows',async page=>{await id(page,'lss-region-box').getByRole('button').click();await expect(id(page,'lss-region-rows')).toBeVisible();}],
 ['region Retain Current Data?',async page=>{await id(page,'lss-region-open').click();await id(page,'lss-region-ok').click();await expect(id(page,'lss-region-box').getByRole('button')).toHaveCount(3);}],
];
async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(lang)}#lss-survey`);
 await expect(page.locator('html')).toHaveAttribute('lang',lang==='es-419'?'es-419':'en');
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 const c:Context={};
 for(const [step,run] of STEPS){await run(page,lang,c);await page.waitForTimeout(200);await each(step);}
}

test('E02 reads differently in Spanish from English: guide, survey, Measured Redshift Data, wedge and LSS Galaxy Data',async({browser})=>{
 test.setTimeout(300_000);
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
 // The field selector's options: Spanish wording around the recorded LSSFields.LST items.
 const options=[...seen['es-419'].get('field list loaded')!].filter(t=>t.startsWith('@option:'));
 expect(options.length).toBeGreaterThanOrEqual(10);
 for(const o of options.filter(o=>/\d galax/.test(o)))expect(o).toMatch(/ \(\d+ galaxias\)$/);
});

test('qps: every text of the E02 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

/** VIREO's captions on each step, in English (View original) or in this load's Spanish. */
const captions=(page:Page,T:(original:string,context?:string)=>string):Record<string,()=>Promise<void>>=>({
 'measurement panel':async()=>{await expect(page.locator('.lss-measure button.primary-button')).toHaveText(T('Record Z'));},
 'Measured Redshift Data':async()=>{const d=page.locator('dialog.lss-dialog[open]');await expect(d.locator('h2')).toHaveText(T('Measured Redshift Data'));
  // VIREO's Object: and Remarks: without their colon (the web form of the labels).
  await expect(d.locator('label[for=lss-object]')).toHaveText(T('Object:').replace(/:$/,''));await expect(d.locator('label[for=lss-remarks]')).toHaveText(T('Remarks:').replace(/:$/,''));
  await expect(d.locator('label[for=lss-jd]')).toHaveText(T('Observation Time (JD)'));await expect(d.locator('label[for=lss-z]')).toHaveText(T('Redshift (Z):'));
  await expect(d.locator('label[for=lss-velocity]')).toHaveText(T('Velocity (km/sec):'));await expect(d.locator('legend')).toHaveText([T('Right Ascension'),T('Declination')]);
  await expect(d.locator('.sky-actions button')).toHaveText([T('OK'),T('Cancel')]);},
 'velocity refusal':async()=>{await expect(page.locator('#lss-dialog-error')).toHaveText(`${T('Velocity Error!')} ${T('Velocity is incorrect or missing!\r\nYou must supply a valid velocity for plotting.').replace(/\r\n/g,' ')}`);},
 'velocity invalid':async()=>{await expect(page.locator('#lss-dialog-error')).toHaveText(T('Velocity calculation is invalid!'));},
 'redshift recorded':async()=>{await expect(page.locator('.observatory-feedback [role=status]')).toContainText(`${T('Z Measurement Saved')}: ${T('Z Measurement added to results list.\r\n\r\nSave, plot, view list under "Tools"->\r\n"Results Editors"->"Observational \r\nResults" on main Window.').replace(/\s*\r\n\s*/g,' ')}`);
  await expect(id(page,'lss-results-txt')).toHaveText(`${T('Save Data')} (.TXT)`);await expect(id(page,'lss-results-txt')).toHaveAttribute('title',T('Save Reshift Measurements in Text File'));},
 'wedge with own records':async()=>{const w=id(page,'wedge-lab');await expect(w.locator('h2').first()).toHaveText(T('LSS Wedge Plot'));
  await expect(id(page,'wedge-plot-data')).toHaveText(T('Plot Data'));await expect(id(page,'wedge-options-open')).toHaveText(T('Options...'));await expect(id(page,'wedge-print')).toHaveText(T('Print Wedge Plot...'));
  await expect(id(page,'wedge-count')).toHaveText(`${T('Points Plotted: ')}1`);await expect(w.locator('svg text[data-role=ra-title]')).toHaveText(T('RA (Hours)'));
  await expect(w.locator('svg text[data-role=axis-title]')).toHaveText('V(km/sec)');},
 'wedge options':async()=>{const d=id(page,'wedge-options');await expect(d.locator('h3')).toHaveText(T('Wedge Plot Options'));
  await expect(d.locator('legend')).toHaveText([T('Grid Type'),T('Plotted Points'),T('Size'),T('Style'),T('Auto Plot Parameters')]);
  await expect(d.locator('label.wedge-radio')).toHaveText([T('Velocity'),T('Red Shift (Z)'),T('No Grid'),'1','2','3','4','5',T('Open','pointStyle'),T('Filled','pointStyle'),T('Auto Plot On')]);
  await expect(id(page,'wedge-options-ok')).toHaveText(T('OK'));await expect(id(page,'wedge-options-cancel')).toHaveText(T('Cancel'));},
 'Retain Current Data?':async()=>{const p=id(page,'wedge-prompt');await expect(p.locator('h3')).toHaveText(T('Retain Current Data?'));
  await expect(p.locator('.wedge-pre')).toHaveText(T('Do you want to add the file data to your current data?\r\n\r\n"Yes" - Add to current data.\r\n"No" - Clear current data.').replace(/\r\n/g,'\n'));
  await expect(p.getByRole('button')).toHaveText([T('Yes'),T('No'),T('Cancel')]);},
 'Confirm Deletion!':async()=>{const p=id(page,'wedge-prompt');await expect(p.locator('h3')).toHaveText(T('Confirm Deletion!'));
  await expect(p.locator('.wedge-pre')).toHaveText(T('Are you SURE you want to delete your current data?'));await expect(p.getByRole('button')).toHaveText([T('Yes'),T('No')]);},
 'Saved Data Loaded':async()=>{await expect(id(page,'wedge-notice').locator('p')).toHaveText(`${T('Saved Data Loaded')} ${T('Saved observations file "','fragment')}LSS_Redshifts.TXT${T('" loaded.','fragment')}`);},
 'TXT Files Only':async()=>{await expect(id(page,'wedge-notice').locator('p')).toHaveText([`${T('TXT Files Only')} ${T('LSS observation files must be in text format.')}`,`${T('No Data Loaded')} ${T('Data was not loaded.')}`]);},
 'No Data Loaded!':async()=>{await expect(id(page,'wedge-notice').locator('p').first()).toHaveText(`${T('No Data Loaded!')} ${T('File ','fragment')}bad.txt${T(' does not contain LSS redshift data!','fragment')}`);},
 'Print Wedge Plot':async()=>{await expect(id(page,'wedge-print-preview').locator('.web-print-header.ob-native')).toHaveText(T('LSS Wedge Plot'));},
 'LSS Galaxy Data (Edit Mode)':async()=>{await expect(id(page,'lss-region-open')).toHaveText(T('LSS Galaxy Data...'));await expect(page.locator('#lss-dialog-title')).toHaveCount(0);},
 'Extract LSS Galaxy Data for Region':async()=>{await expect(page.locator('#lss-region-title')).toHaveText(T('Extract LSS Galaxy Data for Region'));
  await expect(page.locator('.lss-region-grid thead th')).toHaveText(['',T('Minimum'),T('Maximum')]);
  await expect(page.locator('.lss-region-grid tbody th')).toHaveText([T('Right Ascension (Hrs):'),T('Declination (Degs):'),T('Redshift (Z):')]);
  await expect(id(page,'lss-region-raMin')).toHaveAccessibleName(`${T('Right Ascension (Hrs):')} ${T('Minimum')}`);
  await expect(id(page,'lss-region-ok')).toHaveText(T('OK'));await expect(id(page,'lss-region-ok').locator('xpath=following-sibling::button')).toHaveText(T('Cancel'));},
 'Input Error!':async()=>{const b=id(page,'lss-region-box');await expect(b.locator('h2')).toHaveText(T('Input Error!'));await expect(b.locator('p')).toHaveText(T('Parameters are inconsistant!'));await expect(b.getByRole('button')).toHaveText(T('OK'));},
 'non-numeric data':async()=>{const b=id(page,'lss-region-box');await expect(b.locator('h2')).toHaveText(T('Input Error!'));await expect(b.locator('p')).toHaveText(T('Parameters contain non-numeric data!'));},
 'Search Results':async()=>{const b=id(page,'lss-region-box');await expect(b.locator('h2')).toHaveText(T('Search Results'));
  const lines=(await b.locator('p').textContent())!.split('\n');expect(lines[0]).toBe(`${T('Galaxy Records Searched: ')}24069`);
  expect(lines[1]).toMatch(/\d+$/);expect(lines[1].startsWith(T('Galaxies Found in Region: '))).toBe(true);expect(lines[2].startsWith(T('Range in Z: '))).toBe(true);},
 'region Retain Current Data?':async()=>{const b=id(page,'lss-region-box');await expect(b.locator('h2')).toHaveText(T('Retain Current Data?'));
  await expect(b.getByRole('button')).toHaveText([T('Yes'),T('No'),T('Cancel')]);},
});

// "View original (English)" (decision 9): with the stored option on, every VIREO caption of the walk is VIREO's English, checked
// one by one, and no Spanish original appears anywhere; OpenVireo's own web text stays Spanish.
test('View original (English) on: every VIREO caption in the E02 walk reads in English, the web text stays Spanish',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const leaves=(v:unknown):string[]=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(leaves):[];
 const web=new Set([...Object.values(S),...[WEDGE_ES,SPECTRAL_RANGE_ES,OBSERVATORY_ES,POLISH_ES].flatMap(leaves),...Object.keys(O)].map(plain));
 const spanish=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t);
 const left=new Map<string,string>();
 await walk(page,'es-419',async step=>{
  for(const t of await texts(page))if(spanish.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  // Web text around the VIREO captions stays Spanish.
  if(step==='LSS survey')await expect(page.getByRole('heading',{name:N('es-419','lss.title')})).toBeVisible();
  if(step==='wedge with own records')await expect(id(page,'wedge-persistence')).toHaveText(WEDGE_ES.persistenceNote);
  if(step==='Measured Redshift Data')await expect(page.locator('#lss-velocity-help')).toHaveText(S['lss.dialog.velocityHelp']);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

test('Spanish: every VIREO caption in the E02 walk is its Spanish original; English shows the originals unchanged',async({browser})=>{
 test.setTimeout(300_000);
 for(const lang of ['es-419','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,(t,context)=>lang==='en'?t:vireoEs(t,context));
  await walk(page,lang,async step=>{await checks[step]?.();if(lang==='en')await expect(page.locator('.native-mirror-caption')).toHaveCount(0);});
  await page.close();
 }
});

// LSSFields.LST that cannot be read: VIREO's "File Error!" box (its caption and its prefix are VIREO's, the reason is the web's).
for(const original of [false,true])test(`the LSS fields file error box ${original?'follows View original (English)':'reads in Spanish'}`,async({page})=>{
 await page.addInitScript(on=>{localStorage.setItem('openvireo.tour.v1','done');if(on)localStorage.setItem('openvireo-vireo-originals','1');},original);
 await page.route('**/original/hotlists/LSSFields.LST*',r=>r.abort());
 await page.goto('/#lss-survey');await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 const box=id(page,'lss-fields-error');await expect(box).toBeVisible({timeout:30_000});
 const T=(t:string)=>original?t:O[t];
 await expect(box.locator('strong')).toHaveText(T('File Error!'));
 await expect(box.locator('p')).toHaveText(`${T('Cannot access LSS fields file')} /original/hotlists/LSSFields.LST\n\n${S['lss.fieldsError']}`);
 await expect(box.getByRole('button')).toHaveText(T('OK'));
});

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy exempted the wedge table from the crossing check and reported a crossing inside a sideways scroller
 * too. Run with the CI's DejaVu fonts (docs/I18N.md). */
const LAYOUT:LayoutOptions={crossingExempt:'.wedge-table-wrap',crossingInScrollers:true};
for(const width of [320,1440])test(`at ${width} px the Spanish E02 screens lay out without overflow, clipping or crossing`,async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 await walk(page,(process.env.ES4_LAYOUT_LANG as Lang|undefined)??'es-419',async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  if(/guide|survey|Measured|refusal|recorded|wedge|Retain|Deletion|Loaded|Only|Region|Error|Results/.test(step))await page.screenshot({path:test.info().outputPath(`es-e02-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});
