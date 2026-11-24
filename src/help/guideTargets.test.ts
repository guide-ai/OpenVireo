import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {GUIDE_TARGETS,guideTargets} from './guideTargets';
import {LAB_SLUGS} from '../seo/labSlugs';
import {LSS_LAB_STEPS} from '../core/lssLab';
import {OBJECT_X_LAB_STEPS} from '../core/objectXLab';
import {CLASSIFICATION_LAB_STEPS} from '../core/classificationLab';
import {CLUSTER_LAB_STEPS} from '../core/clusterLab';
import {PULSAR_LAB_STEPS} from '../core/pulsarLab';
import {PLEIADES_LAB_STEPS} from '../core/pleiadesLab';
import {FIRST_LOOK_STEPS} from '../core/firstLook';
import {APP_SHELL_MESSAGES_EN} from '../components/AppShellMessages';
import {companionPlace} from '../components/guideCompanionRoute';
import {companionTarget,type CompanionGuide,type CompanionProgress} from '../core/guideCompanion';
import type {Route} from '../components/routePages';

const SRC=path.resolve(import.meta.dirname,'..');
/** Every guide the companion can show: the seven labs and the first look. */
const GUIDES:readonly CompanionGuide[]=[...LAB_SLUGS,'first-look'];
const files=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):/\.tsx$/.test(e.name)?[path.join(dir,e.name)]:[]);
const sources=files(SRC).map(f=>[path.relative(SRC,f).split(path.sep).join('/'),readFileSync(f,'utf8')] as const);
const source=sources.map(([,text])=>text).join('\n');

/** Targets whose `data-testid` or `id` is built at run time: the source text that builds each one. */
const BUILT:Readonly<Record<string,string>>={
 'objectx-measure-first':'data-testid={`objectx-measure-${part}`}',
 'pulsar-panel-1':'data-testid={`pulsar-panel-${n}`}',
 'receiver-frequency-0':'data-testid={`receiver-${control}-${slot}`}',
 'db-native-modulus':"id={prefix+'native-modulus'}",
 'db-native-confirm':"id={frame?prefix+'native-confirm':undefined}",
 'db-native-report':"id={prefix+'native-report'}",
};
/** The steps the companion can show for each guide: its list, plus the closing state that still has something to point at
 * and the keys of a cycle inside a step (core/guideCompanion.ts companionTarget). */
const STEPS:Readonly<Record<string,readonly string[]>>={
 // Front NEWCOMER NC1: the first look's closing line points at the welcome's lab list.
 'first-look':[...FIRST_LOOK_STEPS,'done'],
 hubble:['acquire','measure','dataset','recipe','inputs','interpret'],
 'large-scale-structure':LSS_LAB_STEPS,
 'object-x':[...OBJECT_X_LAB_STEPS,'image-copy','image-point','image-any'],
 'stellar-classification':CLASSIFICATION_LAB_STEPS,
 'cluster-hr':[...CLUSTER_LAB_STEPS,'preserve'],
 pulsars:[...PULSAR_LAB_STEPS,'setup-tracking'],
 pleiades:PLEIADES_LAB_STEPS,
};

describe('guide targets (Show me where)',()=>{
 it('every step of every guide has at least one target, and the table has no step the guides do not have',()=>{
  expect(Object.keys(GUIDE_TARGETS).sort()).toEqual([...LAB_SLUGS,'first-look'].sort());
  for(const lab of GUIDES){
   expect(Object.keys(GUIDE_TARGETS[lab]).sort(),lab).toEqual([...STEPS[lab]].sort());
   for(const step of STEPS[lab])expect(guideTargets(lab,step).length,`${lab}/${step}`).toBeGreaterThan(0);
  }
 });
 it('a step the table does not know (every step done, in the guides whose last step is saving) has no target',()=>{
  expect(guideTargets('large-scale-structure','done')).toEqual([]);
  expect(guideTargets('object-x','done')).toEqual([]);
 });
 it('every selector names an id or a test id that exists in the source',()=>{
  const names=new Set<string>();
  for(const lab of GUIDES)for(const selectors of Object.values(GUIDE_TARGETS[lab]))for(const selector of selectors){
   const found=[...selector.matchAll(/\[data-testid="([^"]+)"\]|#([a-z][a-z0-9-]*)|\[(data-htl-exercise)="[^"]+"\]/g)];
   expect(found.length,selector).toBeGreaterThan(0);
   for(const m of found)names.add(m[1]?`testid:${m[1]}`:m[2]?`id:${m[2]}`:`attr:${m[3]}`);
  }
  const missing=[...names].filter(n=>{
   const [kind,name]=n.split(':');
   if(BUILT[name])return !source.includes(BUILT[name]);
   return !source.includes(kind==='testid'?`data-testid="${name}"`:kind==='id'?`id="${name}"`:`${name}=`);
  });
  expect(missing).toEqual([]);
 });
});

/** The page each source file's controls are shown on. A file of the shell holds controls of several pages: those are named. */
const FILE_ROUTE:Readonly<Record<string,Route>>={
 'ClassificationLab.tsx':'classification','ClassificationLineTable.tsx':'classification',
 'ClusterDatabaseLab.tsx':'cluster-database','NativeClusterAnalysis.tsx':'cluster-database',
 'HotListEditor.tsx':'observatory','CameraControl.tsx':'observatory','observatory/TrackingShortcut.tsx':'observatory',
 'HubbleAnalysis.tsx':'spectrum','SpectrumInstrument.tsx':'spectrum','GalaxyExposure.tsx':'galaxy-exposure',
 'LssSurvey.tsx':'lss-survey','LssMeasurement.tsx':'lss-survey','LssAcquisition.tsx':'lss-survey',
 'Photometer.tsx':'photometer','PleiadesAnalysis.tsx':'photometer',
 'components/RadioControlPanel.tsx':'radio-control','components/RadioTelescopeRoute.tsx':'radio-control','components/RadioPulsarParameters.tsx':'radio-control','components/RadioReceiverWindows.tsx':'radio-control',
 'components/PulsarAnalysis.tsx':'pulsar-analysis',
 'ObjectXLab.tsx':'object-x','ObjectXMeasure.tsx':'object-x',
 'TargetPicker.tsx':'observatory','home/Welcome.tsx':'home',
};
const SHELL_ROUTE:Readonly<Record<string,Route>>={'id:acquisition-galaxy':'galaxy-exposure','testid:galaxy-exposure-page':'galaxy-exposure','testid:dome-open':'observatory','testid:point-coordinates':'observatory','testid:htl-details':'observatory','attr:data-htl-exercise':'observatory',
 // Front NEWCOMER NC1: the first look's markers in the observatory's target and reference cards.
 'id:point-target':'observatory','id:to-telescope':'observatory','id:open-analyzer':'observatory'};
/** Save investigation is in the page bar of every page. */
const EVERYWHERE='testid:investigation-save';
function routeOf(name:string):Route|undefined{
 if(SHELL_ROUTE[name])return SHELL_ROUTE[name];
 const [kind,bare]=name.split(':'),needle=BUILT[bare]??(kind==='testid'?`data-testid="${bare}"`:`id="${bare}"`);
 const routes=new Set(sources.filter(([,text])=>text.includes(needle)).map(([file])=>FILE_ROUTE[file]));
 return routes.size===1?[...routes][0]:undefined;
}
/** A progress object holding only what companionPlace reads: the current step (and, for the LSS wedge step, whether records are plotted). */
const at=(lab:string,next:string,done:Readonly<Record<string,boolean>>={},extra:Readonly<Record<string,unknown>>={})=>({lab,progress:{next,done,imageAction:null,sampleNeed:null,...extra}}) as unknown as CompanionProgress;
/** The guide states at which Show me where uses a key (core/guideCompanion.ts companionTarget). A key is the step of its name,
 * except the keys of a cycle inside a step, which are listed here with every state that leads to them. */
const CYCLE_STATES:Readonly<Record<string,Readonly<Record<string,readonly (readonly [next:string,extra:Readonly<Record<string,unknown>>])[]>>>>={
 'object-x':{
  image:[['image',{imageAction:'expose'}],['repeat',{imageAction:'expose'}]],
  'image-copy':[['image',{imageAction:'copy'}],['repeat',{imageAction:'copy'}]],
  'image-point':[['image',{imageAction:'point'}],['repeat',{imageAction:'point'}]],
  'image-any':[['image',{imageAction:'any'}],['repeat',{imageAction:'any'}]],
  repeat:[['repeat',{imageAction:'clock'}]],
 },
 pulsars:{'setup-tracking':[['setup',{trackingOff:true}]]},
 pleiades:{
  measure:[['measure',{}],['sample',{sampleNeed:'measure'}]],record:[['record',{}],['sample',{sampleNeed:'record'}]],color:[['color',{}],['sample',{sampleNeed:'color'}]],
  sample:[['sample',{sampleNeed:'done'}],['sample',{}]],
 },
};
const statesOf=(lab:string,key:string):readonly CompanionProgress[]=>(CYCLE_STATES[lab]?.[key]??[[key,{}]]).map(([next,extra])=>at(lab,next,{},extra));

describe('guide targets are on the page of their step',()=>{
 it('every control a step points at is on the page Show me where goes to; a step with no page points only at Save investigation',()=>{
  const wrong:string[]=[];
  for(const lab of GUIDES)for(const [key,selectors] of Object.entries(GUIDE_TARGETS[lab]))for(const state of statesOf(lab,key)){
   // The state really leads to this key: the table below is checked against the rule, not against itself.
   if(companionTarget(state)!==key)wrong.push(`${lab}/${key}: the state ${JSON.stringify(state.progress)} uses the key ${companionTarget(state)}`);
   const place=companionPlace(state);
   for(const selector of selectors)for(const m of selector.matchAll(/\[data-testid="([^"]+)"\]|#([a-z][a-z0-9-]*)|\[(data-htl-exercise)="[^"]+"\]/g)){
    const name=m[1]?`testid:${m[1]}`:m[2]?`id:${m[2]}`:`attr:${m[3]}`;
    if(name===EVERYWHERE){if(place)wrong.push(`${lab}/${key}: Save investigation, but the step has the page ${place.route}`);continue;}
    const route=routeOf(name);
    if(!place)wrong.push(`${lab}/${key}: ${name} needs a page, the step has none`);
    else if(route!==place.route)wrong.push(`${lab}/${key}: ${name} is on ${route??'an unknown page'}, Show me where goes to ${place.route}`);
   }
  }
  expect(wrong).toEqual([]);
 });
 it('Object X "repeat" goes to the Object X page (its first action), although the guide\'s own button returns to the observatory',()=>{
  expect(companionPlace(at('object-x','repeat',{},{imageAction:'clock'}))).toEqual({route:'object-x'});
  // Both imaging steps: Copy the coordinates is on the Object X page, pointing and the exposure in the observatory.
  for(const next of ['image','repeat']){
   expect(companionPlace(at('object-x',next,{},{imageAction:'copy'}))).toEqual({route:'object-x'});
   for(const imageAction of ['point','expose','any'])expect(companionPlace(at('object-x',next,{},{imageAction}))).toEqual({route:'observatory'});
  }
  expect(companionPlace(at('object-x','done'))).toBeNull();
 });
 it('the first look stays in the observatory, and its closing line goes to the welcome\'s lab list',()=>{
  for(const next of FIRST_LOOK_STEPS)expect(companionPlace(at('first-look',next))).toEqual({route:'observatory'});
  expect(companionPlace(at('first-look','done'))).toEqual({route:'home'});
  // Point telescope only once M82 is the selected object; the picker before that.
  expect(GUIDE_TARGETS['first-look'].point).toEqual(['#point-target[data-target="NGC3034"]','#target']);
 });
 it('the Hubble workspace steps go to the spectrum page, the LSS wedge step to the survey until records are plotted, and the Pleiades list step opens the hot list',()=>{
  for(const phase of ['dataset','recipe','inputs','interpret','measure'])expect(companionPlace(at('hubble',phase))).toEqual({route:'spectrum'});
  expect(companionPlace(at('hubble','acquire'))).toEqual({route:'galaxy-exposure'});
  expect(companionPlace(at('large-scale-structure','wedge',{wedge:false}))).toEqual({route:'lss-survey'});
  expect(companionPlace(at('large-scale-structure','wedge',{wedge:true}))).toEqual({route:'lss-wedge'});
  expect(companionPlace(at('pleiades','list'))).toEqual({route:'observatory',hotList:true});
  expect(companionPlace(at('pleiades','save'))).toBeNull();
 });
});

describe('companion strings',()=>{
 // WCAG 2.5.3: the Hide button's accessible name starts with its visible label, in every language.
 const maps=import.meta.glob<Record<string,unknown>>('../i18n/*/maps/appShell.ts',{eager:true});
 it('the Hide button\'s name starts with its label, and the step counter keeps both numbers, in every language',()=>{
  const all=[APP_SHELL_MESSAGES_EN,...Object.values(maps).flatMap(m=>Object.values(m))] as (typeof APP_SHELL_MESSAGES_EN)[];
  expect(all.length).toBeGreaterThanOrEqual(10);
  for(const m of all){
   expect(m.companion.hideName.startsWith(m.companion.hide),m.companion.hideName).toBe(true);
   expect(m.companion.hideName).not.toBe(m.companion.hide);
   const counter=m.companion.stepOf(3,9);
   expect(counter,counter).toMatch(/3.*9/);
   for(const text of [m.companion.label,m.companion.actions,m.companion.show,m.companion.details,m.companion.full,m.companion.notYet,m.companion.allDone])expect(text.trim().length).toBeGreaterThan(0);
  }
 });
 it('First look: every language has its nine strings, the pointing line names M82 and the detail names VIREO\'s library',()=>{
  const all=[APP_SHELL_MESSAGES_EN,...Object.values(maps).flatMap(m=>Object.values(m))] as (typeof APP_SHELL_MESSAGES_EN)[];
  const KEYS=['name','dome','point','look','spectrum','spectrumDetail','closing','start','help'] as const;
  for(const m of all){
   const f=m.firstLook;
   for(const key of KEYS)expect(f[key].trim().length,key).toBeGreaterThan(0);
   expect(f.point).toContain('M82');expect(f.spectrumDetail).toContain('M82');expect(f.spectrumDetail).toContain('VIREO');
   // The start button gives the rough time with a digit 3, never a figure the visitor must convert.
   expect(f.start).toMatch(/3/);
   if(m!==APP_SHELL_MESSAGES_EN)for(const key of KEYS)expect(f[key],key).not.toBe(APP_SHELL_MESSAGES_EN.firstLook[key]);
  }
 });
 it('Restart exercise: every language has the button and its confirmation, names its own Save investigation, and tells Restart from Cancel',()=>{
  const all=[APP_SHELL_MESSAGES_EN,...Object.values(maps).flatMap(m=>Object.values(m))] as (typeof APP_SHELL_MESSAGES_EN)[];
  const KEYS=['restart','restartTitle','restartWhat','restartLost','restartSave','restartConfirm','restartCancel'] as const;
  for(const m of all){
   const c=m.companion;
   for(const key of KEYS)expect(c[key].trim().length,key).toBeGreaterThan(0);
   // The way to keep the work is the page bar's button, by the name it has in that language.
   expect(c.restartSave,c.restartSave).toContain(m.recovery.save);
   expect(c.restartConfirm).not.toBe(c.restartCancel);
   // The button and the confirming answer say the same thing: every word of the answer is in the button.
   expect(c.restartConfirm.split(/\s+/).every(word=>c.restart.includes(word)),`${c.restart} / ${c.restartConfirm}`).toBe(true);
   if(m!==APP_SHELL_MESSAGES_EN)for(const key of KEYS)expect(c[key],key).not.toBe(APP_SHELL_MESSAGES_EN.companion[key]);
  }
 });
});
