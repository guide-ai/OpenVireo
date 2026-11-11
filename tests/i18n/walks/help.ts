import {expect,type Page} from '@playwright/test';
import witness from '../../../src/help/helpAll.witness.json' with {type:'json'};
import en from '../../../src/i18n/en.json' with {type:'json'};
import {langQuery} from '../../fixtures/language';
import {htmlLangOf,isPseudo,pseudoName,type Pseudo} from '../../fixtures/pseudoNames';
import type {LanguageText} from '../languageText';

// Front SC12 (docs/I18N.md): the help windows of tests/i18n/help.spec.ts (which has no step walk of its own) as one walk, so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales: every instrument window's help topic list and its
// first topic (WINDOWS, shared with the spec), the radio Help topics, the Exit Observatory reminder, the Spectral Line Table with
// its help, and OpenVireo's own help with a topic. Under a pseudo-locale the help files themselves stay VIREO's English (no
// pseudo-locale translates them); the viewer around them is translated.
export type Lang='en'|Pseudo|LanguageText;
export const WINDOWS=[['#observatory','telescope-help','OBSRVHLP.LST'],['#observatory','camera-help','CAMHLP.LST'],['#cluster-database','cluster-help','HRANALHLP.LST'],
 ['#photometer','photo-help','PHOTOHLP.LST'],['#spectrometer','spectrometer-index-help','SPECHLP.LST'],['#classification','class-help','CLASSHLP.LST'],
 ['#spectrum','measure-help','MEASHLP.LST'],['#lss-wedge','wedge-help','WDGPLTHLP.LST'],['#pulsar-analysis','pulsar-analysis-help','PLSANHLP.LST']] as const;
const lists=witness.lists as Record<string,{rows:string[];topics:{index:number}[]}>;
const id=(p:Page,t:string)=>p.getByTestId(t);
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
/** A catalog key's accessible name in this language. */
const N=(lang:Lang,key:keyof typeof en)=>isPseudo(lang)?pseudoName(en[key]):exact(typeof lang==='string'?en[key]:lang.catalog[key]??lang.text(en[key]));
async function load(page:Page,lang:Lang,route:string){
 await page.goto('about:blank');// a hash-only change would keep the previous window's open dialog
 await page.goto(`/${langQuery(typeof lang==='string'?lang:lang.tag)}${route}`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
}
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>{try{localStorage.setItem('openvireo.tour.v1','done');}catch{/* about:blank between windows has no storage */}});page.setDefaultTimeout(20_000);
 for(const [route,prefix,list] of WINDOWS){
  await load(page,lang,route);
  if(prefix==='cluster-help'){// the cluster window's Help needs a loaded dataset (tests/cluster-hr-help.spec.ts)
   const lab=page.locator('.cluster-database-lab');
   await lab.getByLabel(N(lang,'db.choose')).selectOption('m67');await lab.getByRole('button',{name:N(lang,'db.load')}).click();
  }
  await id(page,`${prefix}-open`).click({timeout:20_000});
  const rows=id(page,`${prefix}-topic-list`).getByRole('option');
  await expect(rows).toHaveCount(lists[list].rows.length);await each(`${list} topics`);
  await rows.nth(lists[list].topics[0].index).dblclick();await expect(id(page,`${prefix}-window`)).toBeVisible();await each(`${list} first topic`);
 }
 await load(page,lang,'#radio-control');
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'radio-panel-window')).toBeVisible();
 await id(page,'radio-help-menu').click();await id(page,'radio-help-menu-topics').click();
 await expect(id(page,'radio-help-topic-list').getByRole('option')).toHaveCount(lists['PULSRHLP.LST'].rows.length);await each('PULSRHLP.LST topics');
 await load(page,lang,'#observatory');
 await id(page,'fi-file-menu').click({timeout:20_000});await id(page,'ob-exit').click();await expect(id(page,'exit-reminder')).toBeVisible();await each('Exit Observatory reminder');
 await load(page,lang,'#classification');
 await id(page,'spl-open').click();const lines=id(page,'spl-rows').getByRole('option');await expect(lines).toHaveCount(30);await each('Spectral Line Table');
 await lines.nth(2).dblclick();await expect(id(page,'spl-help')).toBeVisible();await each('Spectral Line Help');
 await load(page,lang,'');
 await id(page,'main-help-menu').click();await id(page,'main-help-web').click();await expect(id(page,'web-help')).toBeVisible();
 await id(page,'web-help-topics').getByRole('button').nth(3).click();await expect(id(page,'web-help-topic')).toBeVisible();await each('OpenVireo help topic');
}
/** The help windows' own texts with Latin letters that carry no pseudo marker (the walk's marker check): every visible text,
 * accessible name and title inside a help window, its topic list, the reminder, the Spectral Line Table and OpenVireo's help,
 * outside the help file's own lines (VIREO's English under a pseudo-locale: the topic rows and text, the topic title, the
 * reminder's text, the line table's rows and help text) and native English views. */
export const unmarkedHelpTexts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const scopes='[data-testid$="-help-topics"],[data-testid$="-help-window"],[data-testid=exit-reminder],[data-testid=spl-list],[data-testid=spl-help],[data-testid=web-help]';
 const helpFile='[role=listbox],h3[id$="-topic"] > span,[data-testid=exit-reminder-text],[data-testid=spl-help-text],[lang=en]:not(html)';
 const shown=(el:Element)=>el.checkVisibility({visibilityProperty:true});
 const latin=(t:string|null|undefined)=>!!t&&/[A-Za-z]{2}/.test(t)&&!/[⟦⟧]/.test(t);
 for(const scope of document.querySelectorAll(scopes)){if(!shown(scope))continue;
  const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n:Node|null;
  while((n=walker.nextNode())){const el=n.parentElement,t=n.textContent?.trim();if(el&&latin(t)&&!el.closest(helpFile)&&shown(el))out.push(t!);}
  for(const el of [scope,...scope.querySelectorAll('[aria-label],[title]')])if(!el.closest(helpFile)&&shown(el))for(const a of ['aria-label','title']){const v=el.getAttribute(a)?.trim();if(latin(v))out.push(`@${a}:${v}`);}
 }
 return [...new Set(out)];
});
