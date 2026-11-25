import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createElement,type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import en from './i18n/en.json';
import {LANGUAGES} from './i18n/languages';
import HubbleLabGuide from './HubbleLabGuide';
import LssLabGuide from './LssLabGuide';
import ObjectXLabGuide from './ObjectXLabGuide';
import ClassificationLabGuide from './ClassificationLabGuide';
import ClusterLabGuide from './ClusterLabGuide';
import PulsarLabGuide from './PulsarLabGuide';
import PleiadesLabGuide from './PleiadesLabGuide';
import {hubbleLabProgress,type HubbleLabProgress} from './core/hubbleLab';
import {EMPTY_HUBBLE} from './core/hubbleAnalysis';
import {INITIAL_LSS_LAB_SUMMARY,LSS_LAB_STEPS,lssLabProgress} from './core/lssLab';
import {INITIAL_OBJECT_X_LAB_SUMMARY,OBJECT_X_LAB_STEPS,objectXLabProgress} from './core/objectXLab';
import {CLASSIFICATION_LAB_STEPS,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY,classificationLabProgress} from './core/classificationLab';
import {EMPTY_CLASSIFICATION_WORKSPACE} from './core/classification';
import {CLUSTER_LAB_STEPS,clusterLabProgress,clusterOwnStatus} from './core/clusterLab';
import {EMPTY_PULSAR_MEASUREMENT_SUMMARY,INITIAL_RADIO_EXERCISE_SUMMARY,PULSAR_LAB_STEPS,pulsarLabProgress} from './core/pulsarLab';
import {EMPTY_PLEIADES_EXERCISE_SUMMARY,PLEIADES_LAB_STEPS,pleiadesLabProgress} from './core/pleiadesLab';
import {withoutStepNumber,type CompanionProgress} from './core/guideCompanion';
import {companionContent} from './components/guideCompanionContent';
import {openGuideDetailsForPrint,GUIDE_PRINT_DETAILS} from './help/printDetails';

// Front NEWCOMER NC3 (plan analysis/front-plans/front-newcomer.md §2.3): every step of the seven guide windows shows its title,
// status and button, and folds what the guide says under it into one «More detail», open for the current step only.
const E=en as Record<string,string>;
const ref={current:null};
const noop=()=>{};
const render=(el:ReactElement)=>renderToStaticMarkup(el);
/** Each `<li>` of the window's step list. */
const steps=(html:string)=>{const list=/<ol class="lab-steps[^"]*">([\s\S]*?)<\/ol>/.exec(html)![1];return list.split(/(?=<li(?: [^>]*)?><h3)/).filter(s=>s.startsWith("<li"));};

const WINDOWS:readonly (readonly [string,string,number,()=>string])[]=[
 ['hubble','hubble-lab-step',5,()=>render(createElement(HubbleLabGuide,{dialogRef:ref,progress:hubbleLabProgress([],[],EMPTY_HUBBLE),onNavigate:noop,onNext:noop,onVersion:noop}))],
 ['large-scale-structure','lss-lab-step',LSS_LAB_STEPS.length,()=>render(createElement(LssLabGuide,{dialogRef:ref,progress:lssLabProgress(INITIAL_LSS_LAB_SUMMARY),onNavigate:noop,onNext:noop}))],
 ['object-x','objectx-guide-step',OBJECT_X_LAB_STEPS.length,()=>render(createElement(ObjectXLabGuide,{dialogRef:ref,progress:objectXLabProgress(INITIAL_OBJECT_X_LAB_SUMMARY),onNavigate:noop,onNext:noop}))],
 ['stellar-classification','classification-lab-step',CLASSIFICATION_LAB_STEPS.length,()=>render(createElement(ClassificationLabGuide,{dialogRef:ref,progress:classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY),onNavigate:noop,onNext:noop}))],
 ['cluster-hr','cluster-lab-step',CLUSTER_LAB_STEPS.length,()=>render(createElement(ClusterLabGuide,{dialogRef:ref,progress:clusterLabProgress({loaded:true,inspected:false,validTrial:false,confirmed:false,reportOpened:false}),cluster:null,onNavigate:noop,own:clusterOwnStatus(0,10,false)}))],
 ['pulsars','pulsar-lab-step',PULSAR_LAB_STEPS.length,()=>render(createElement(PulsarLabGuide,{dialogRef:ref,progress:pulsarLabProgress({radio:INITIAL_RADIO_EXERCISE_SUMMARY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}),onNavigate:noop,onNext:noop}))],
 ['pleiades','pleiades-lab-step',PLEIADES_LAB_STEPS.length,()=>render(createElement(PleiadesLabGuide,{dialogRef:ref,progress:pleiadesLabProgress({list:true,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY}),onNavigate:noop,onNext:noop,onVersion:noop}))],
];

describe('Front NEWCOMER NC3: plain step titles, detail folded under More detail',()=>{
 for(const [lab,prefix,count,html] of WINDOWS)it(`${lab}: one More detail per step, open only on the current step; title, status and button stay outside it`,()=>{
  const items=steps(html());
  expect(items).toHaveLength(count);
  let open=0;
  for(const li of items){
   const at=li.indexOf('<details class="lab-step-more"');
   expect(at,li.slice(0,120)).toBeGreaterThan(0);
   expect(li.split('<details class="lab-step-more"')).toHaveLength(2);
   const before=li.slice(0,at),details=li.slice(at);
   expect(before).toMatch(/<h3>[\s\S]*<span id="[a-z-]+-title">[^<]+<\/span>/);
   // The Go/Continue button is never folded (Hubble's save and interpret items and LSS/Object X save have none).
   expect(details).not.toMatch(/<button/);
   const isOpen=/^<details class="lab-step-more" open=""/.test(details);
   if(isOpen){open++;expect(li).toMatch(/^<li[^>]* data-next="true"/);}
   else expect(li).not.toMatch(/^<li[^>]* data-next="true"/);
   // The summary's name: its visible text, then the step's title.
   const [,more,title]=/<summary aria-labelledby="([^" ]+) ([^" ]+)"><span id="\1">More detail<\/span><\/summary>/.exec(details)!;
   expect(more.startsWith(prefix)&&title.startsWith(prefix)).toBe(true);
   expect(before).toContain(`id="${title}"`);
  }
  expect(open).toBe(1);
 });
 it('every status line and test id of a step body is still rendered (folded, not deleted)',()=>{
  const pulsar=WINDOWS.find(w=>w[0]==='pulsars')![3]();
  for(const id of ['pulsar-lab-add-disarms','pulsar-lab-period-formula','pulsar-lab-delay-formula','pulsar-lab-investigation-note','pulsar-lab-save-optional','pulsar-lab-backup','pulsar-lab-status-setup'])expect(pulsar).toContain(`data-testid="${id}"`);
  const pleiades=WINDOWS.find(w=>w[0]==='pleiades')![3]();
  for(const id of ['pleiades-lab-fit-minimum','pleiades-lab-distance-formula','pleiades-lab-e05','pleiades-lab-adaptation','pleiades-lab-observations','pleiades-lab-continue'])expect(pleiades).toContain(`data-testid="${id}"`);
  const classification=WINDOWS.find(w=>w[0]==='stellar-classification')![3]();
  for(const id of ['classification-lab-tools','classification-lab-adaptation'])expect(classification).toContain(`data-testid="${id}"`);
 });
});

describe('Front NEWCOMER NC3 review: texts kept where they explain something',()=>{
 it('Hubble opens Save your work together with Interpret; it stays closed before',()=>{
  const save=(next:HubbleLabProgress['next'])=>/<details class="lab-step-more" open=""><summary aria-labelledby="hubble-lab-step-save-more/.test(render(createElement(HubbleLabGuide,{dialogRef:ref,progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE),next},onNavigate:noop,onNext:noop,onVersion:noop})));
  expect(save('acquire')).toBe(false);expect(save('inputs')).toBe(false);expect(save('interpret')).toBe(true);
 });
 it('the pulsar backup note is in the body of Save the investigation; the Pleiades E05 note is beside Data from Observations',()=>{
  const pulsar=WINDOWS.find(w=>w[0]==='pulsars')![3]();
  const step=steps(pulsar).find(li=>li.includes('data-testid="pulsar-lab-step-investigation"'))!;
  expect(step.slice(step.indexOf('<details class="lab-step-more"'))).toContain('data-testid="pulsar-lab-backup"');
  expect(/<section class="lab-progress"[\s\S]*?<\/section>/.exec(pulsar)![0]).not.toContain('pulsar-lab-backup');
  const pleiades=WINDOWS.find(w=>w[0]==='pleiades')![3]();
  expect(pleiades).toMatch(/<p class="lab-recovery" data-testid="pleiades-lab-e05">[^<]*<\/p><button [^>]*data-testid="pleiades-lab-observations"/);
 });
});

describe('Front NEWCOMER NC3: the strip\'s line is the step title',()=>{
 const line=(p:CompanionProgress)=>companionContent(p).line;
 it('the step title in every guide, without the classification number; warning and closing states keep their own line',()=>{
  expect(line({lab:'hubble',progress:hubbleLabProgress([],[],EMPTY_HUBBLE)})).toBe(E['lab.acquireTitle']);
  expect(line({lab:'hubble',progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE),next:'recipe'}})).toBe(E['lab.hubbleTitle']);
  expect(line({lab:'hubble',progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE),next:'dataset'}})).toBe(E['lab.next.dataset']);
  expect(line({lab:'hubble',progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE),next:'interpret'}})).toMatch(/^Your dataset of 0 galaxies/);
  expect(line({lab:'stellar-classification',progress:classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY)})).toBe('Choose a practice');
  const cluster=clusterLabProgress({loaded:true,inspected:true,validTrial:false,confirmed:false,reportOpened:false});
  expect(line({lab:'cluster-hr',progress:cluster})).toBe(E['clusterLab.step.trial.title']);
  const radio=INITIAL_RADIO_EXERCISE_SUMMARY;
  expect(line({lab:'pulsars',progress:pulsarLabProgress({radio,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0})})).toBe(E['pulsarLab.step.setup.title']);
  expect(line({lab:'pulsars',progress:{...pulsarLabProgress({radio,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}),trackingOff:true}})).toBe(E['pulsarLab.next.tracking']);
  expect(line({lab:'pulsars',progress:{...pulsarLabProgress({radio,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}),next:'save'}})).toBe(E['pulsarLab.next.save']);
  expect(line({lab:'pleiades',progress:pleiadesLabProgress({list:false,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY})})).toBe(E['pleiadesLab.step.list.title']);
  expect(line({lab:'pleiades',progress:{...pleiadesLabProgress({list:false,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY}),next:'save'}})).toBe(E['pleiadesLab.next.save']);
  // Review N2: the sample step's line is its telescope warning, not its title.
  expect(line({lab:'pleiades',progress:{...pleiadesLabProgress({list:false,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY}),next:'sample'}})).toBe(E['pleiadesLab.next.sample']);
  expect(line({lab:'large-scale-structure',progress:lssLabProgress(INITIAL_LSS_LAB_SUMMARY)})).toBe(E['lssLab.step.load']);
 });
 it('Step details open with the guide\'s "Next:" line where the line is the title',()=>{
  const details=renderToStaticMarkup(companionContent({lab:'pleiades',progress:pleiadesLabProgress({list:false,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY})}).details as ReactElement);
  expect(details.startsWith(`<p>${E['pleiadesLab.next.list']}</p><p>${E['pleiadesLab.step.list.help']}</p>`)).toBe(true);
 });
 it('withoutStepNumber leaves out the classification guide\'s «n · » number in all ten languages, and nothing else',()=>{
  const dirs=['en',...LANGUAGES.map(l=>l.dir)];
  expect(dirs).toHaveLength(10);
  for(const dir of dirs){
   const file=dir==='en'?'en.json':`${dir}/${dir}.json`;
   const catalog=JSON.parse(readFileSync(path.join(import.meta.dirname,'i18n',file),'utf8')) as Record<string,string>;
   CLASSIFICATION_LAB_STEPS.forEach((step,i)=>{
    const title=catalog[`classLab.step.${step}.title`]!,plain=withoutStepNumber(title);
    if(step==='save')expect(plain,dir).toBe(title);
    else{expect(title.startsWith(`${i+1} · `),`${dir} ${title}`).toBe(true);expect(plain,dir).toBe(title.slice(`${i+1} · `.length));}
   });
  }
  expect(withoutStepNumber('Measure B−V · 2 filters')).toBe('Measure B−V · 2 filters');
 });
});

describe('Front NEWCOMER NC3: print opens the folded details of an open guide window and closes exactly those again',()=>{
 it('opens the closed ones, then closes only those still open',()=>{
  const d=(open:boolean)=>({open,isConnected:true});
  const opened=[d(false),d(false),d(false)];
  let selector='';
  const root={querySelectorAll:(s:string)=>{selector=s;return opened;}} as unknown as ParentNode;
  const restore=openGuideDetailsForPrint(root);
  expect(selector).toBe(GUIDE_PRINT_DETAILS);
  expect(opened.map(x=>x.open)).toEqual([true,true,true]);
  opened[1]!.open=false;// closed by the visitor while printing: stays closed
  restore();
  expect(opened.map(x=>x.open)).toEqual([false,false,false]);
 });
});
