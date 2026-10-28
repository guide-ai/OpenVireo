import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import record from '../../data/hubble/engine-targets.json';
import witnesses from '../../data/hubble/bootes-witnesses.json';
import {decodeFieldPack} from './fieldPack';
import {evaluateField,outsideViewMargin,OUTSIDE_VIEW,createFieldExposure} from './fieldEngine';
import {activateJournal,startJournal,pauseJournal,tickJournal,resetJournal,replayJournal} from './exposureJournal';
import {createNativeSelectionScene} from './objectSelection';
import {HUBBLE_HOT_LIST} from './hubbleHotList';
import {isHubbleExtendedId} from './hubbleEngineTargets';
vi.setConfig({testTimeout:120000});
const sha=(v:string|NodeJS.ArrayBufferView)=>createHash('sha256').update(v).digest('hex');
const file=(p:string)=>readFileSync(new URL('../../'+p,import.meta.url));
const glx=new Uint8Array(file('public/original/catalogs/CLEA_GLX.DAT')),qb=new Uint8Array(file('public/original/catalogs/CLEA_QSO.DAT')),qsoCatalog={bytes:qb,sha256:sha(qb)};
const pack=decodeFieldPack(JSON.parse(file('data/hubble/engine-bootes.json').toString()));
describe('Front F M5: Boötes – 1/2 fields (RS Boo outside the view, QSO 1656 merged) with the start-time continuation',()=>{
 it('the pack adds exactly the approved whole records N3000 512620/512802 to published LSS reads',()=>{
  expect(sha(file('data/hubble/engine-bootes.json'))).toBe(record.packs['hubble-engine-bootes'].sha256);
  const lss=new Map<string,string[]>();for(let f=1;f<=9;f++)for(const b of JSON.parse(file(`data/lss/lss-field-0${f}.json`).toString()).bands)for(const [i,h] of b.reads)lss.set(`${b.name}@${i}`,[...(lss.get(`${b.name}@${i}`)??[]),h]);
  const extra:string[]=[];for(const b of pack.bands)for(const [i,h] of b.reads){const got=lss.get(`${b.name}@${i}`)??[];if(!got.some(g=>g===h||g.startsWith(h)))extra.push(`${b.name}@${i}:${h.length}`);}
  expect(extra).toEqual(['N3000@512620:54','N3000@512802:54']);
 });
 for(const w of witnesses.pointings)it(`GLX@${w.glxIndex}: population equals the independent witness; every unmodelled footprint misses the crop`,()=>{
  const r=evaluateField(pack,glx,w.pointing,0,{qso:'merge',qsoCatalog,variables:'outside-view'}),p=r.population!;
  expect(p.outsideViewVariable).toMatchObject({variable:w.variable,hitId:w.hitId,resolvedId:w.resolvedId,removedRunner:w.removedRunner[0],name:'RS Boo',classification:'RRAB'});
  expect(p.qsoStage!.witnesses.map(x=>[x.qso,x.operation,x.position])).toEqual(w.qsoOperations);
  expect(p.stars).toHaveLength(w.finalStars);expect(sha(p.stars.map(s=>s.id).join(','))).toBe(w.finalStarIdsSHA256);expect(p.galaxies.map(g=>g.recordIndex)).toEqual(w.galaxies);
  const project=(q:{ra:number;dec:number})=>createNativeSelectionScene([{id:'q',ra:q.ra,dec:q.dec}],[],r.scene!.frame).stars[0];
  for(const q of [p.variables[0],p.stars.find(s=>s.id===w.hitId)!,p.stars.find(s=>s.id===w.resolvedId)!])expect(outsideViewMargin(project(q))).toBeGreaterThan(0);
  expect(OUTSIDE_VIEW.crop).toEqual({first:312,last:623});
  expect(r.outsideViewGalaxies?.map(g=>g.galaxy)).toEqual(['14299+3148']);expect(r.outsideViewGalaxies![0].margin).toBeGreaterThan(0);
  // QSO 1656 lies inside the view and is painted as a type-3 point source.
  const q=p.stars.find(s=>s.id==='CLEA_QSO.DAT@1656')!;expect(q.type).toBe(3);expect(outsideViewMargin(project(q))).toBeLessThan(0);
  expect(r.reasons).toEqual(['spectrum-range']);// without the continuation option
  const full=evaluateField(pack,glx,w.pointing,0,{qso:'merge',qsoCatalog,variables:'outside-view',continuation:'start-time'});
  expect(full.reasons).toEqual([]);expect(full.target!.recordIndex).toBe(w.glxIndex);
  const rec=record.targets.find(t=>t.glxIndex===w.glxIndex)!.telescopes[0] as {cropSHA256:string;pixelLevel:number};expect(sha(full.viewport!.rgb)).toBe(rec.cropSHA256);expect(full.calibration!.pixelLevel).toBe(rec.pixelLevel);
  // With the earlier gate the field stays the typed variable gate. Under the default Front T TRUE branch RS Boo no longer gates
  // (outside the view); the galaxy 14299+3148 beyond the browser stamp bound does, since only the outside-view rule exempts it.
  expect(evaluateField(pack,glx,w.pointing,0,{qso:'merge',qsoCatalog,variables:'gate'}).reasons).toEqual(['variable-merge']);
  expect(evaluateField(pack,glx,w.pointing,0,{qso:'merge',qsoCatalog}).reasons).toEqual(['stamp-bound']);
 });
 it('recorded available on every telescope; the hot-list rows are engine targets',()=>{
  for(const id of ['51976','51975']){const t=record.targets.find(t=>t.id===id)!;expect(t.telescopes.map(x=>x.status)).toEqual(['available','available','available']);expect(isHubbleExtendedId(id)).toBe(true);}
  expect(HUBBLE_HOT_LIST.slice(5,7).map(r=>r.supported?[r.route,r.telescopes]:r.reason)).toEqual([['engine',[0,1,2]],['engine',[0,1,2]]]);
 });
 it('Go re-prepares the means from the current seed only when nothing was integrated since the last Go or reset (+0x312b)',()=>{
  const w=witnesses.pointings[0],r=evaluateField(pack,glx,w.pointing,0,{qso:'merge',qsoCatalog,variables:'outside-view',continuation:'start-time'});
  let s=activateJournal(createFieldExposure(r,'test-policy',12345));const before=s.exposure.seed;
  s=startJournal(s);expect(s.exposure.draws).toBeGreaterThan(0);expect(s.exposure.seed).not.toBe(before);const first=s.exposure.sourceMeans;
  s=startJournal(pauseJournal(s));expect(s.exposure.sourceMeans).not.toBe(first);// a Go with nothing integrated re-prepares again
  s=tickJournal(s,1000);const draws=s.exposure.draws,means=s.exposure.sourceMeans;s=startJournal(pauseJournal(s));expect(s.exposure.sourceMeans).toBe(means);expect(s.exposure.draws).toBe(draws);
  s=startJournal(resetJournal(pauseJournal(s)));expect(s.exposure.sourceMeans).not.toBe(means);
  // Deterministic replay of the same events.
  const events=[{kind:'start'},{kind:'tick',deltaMs:500},{kind:'pause'},{kind:'start'},{kind:'tick',deltaMs:500},{kind:'pause'}] as const;
  const a=replayJournal(seed=>createFieldExposure(r,'test-policy',seed),9,events),b=replayJournal(seed=>createFieldExposure(r,'test-policy',seed),9,events);
  expect(a.exposure).toEqual(b.exposure);expect(a.exposure.sourceTotal).toBeGreaterThan(0);
 });
});
