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
import {APP_SHELL_MESSAGES_EN} from '../components/AppShellMessages';

const SRC=path.resolve(import.meta.dirname,'..');
const files=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):/\.tsx$/.test(e.name)?[path.join(dir,e.name)]:[]);
const source=files(SRC).map(f=>readFileSync(f,'utf8')).join('\n');

/** Targets whose `data-testid` or `id` is built at run time: the source text that builds each one. */
const BUILT:Readonly<Record<string,string>>={
 'objectx-measure-first':'data-testid={`objectx-measure-${part}`}',
 'pulsar-panel-1':'data-testid={`pulsar-panel-${n}`}',
 'receiver-frequency-0':'data-testid={`receiver-${control}-${slot}`}',
 'db-native-modulus':"id={prefix+'native-modulus'}",
 'db-native-confirm':"id={frame?prefix+'native-confirm':undefined}",
 'db-native-report':"id={prefix+'native-report'}",
};
/** The steps the companion can show for each guide: its list, plus the closing state that still has something to point at. */
const STEPS:Readonly<Record<string,readonly string[]>>={
 hubble:['acquire','measure','dataset','recipe','inputs','interpret'],
 'large-scale-structure':LSS_LAB_STEPS,
 'object-x':OBJECT_X_LAB_STEPS,
 'stellar-classification':CLASSIFICATION_LAB_STEPS,
 'cluster-hr':[...CLUSTER_LAB_STEPS,'preserve'],
 pulsars:[...PULSAR_LAB_STEPS,'setup-tracking'],
 pleiades:PLEIADES_LAB_STEPS,
};

describe('guide targets (Show me where)',()=>{
 it('every step of every guide has at least one target, and the table has no step the guides do not have',()=>{
  expect(Object.keys(GUIDE_TARGETS).sort()).toEqual([...LAB_SLUGS].sort());
  for(const lab of LAB_SLUGS){
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
  for(const lab of LAB_SLUGS)for(const selectors of Object.values(GUIDE_TARGETS[lab]))for(const selector of selectors){
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
});
