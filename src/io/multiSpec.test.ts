import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import engineTargets from '../../data/hubble/engine-targets.json';
import {multiSpecView,multiSpecSpectra,setMultiSpecResources,multiSpecFailure,MultiSpecEvidenceError} from './multiSpec';
import {loadMultiSpecInputs,MULTISPEC_STAR_TEMPLATES,MULTISPEC_GALAXY_SPECTRA,type MultiSpecResources} from './multiSpecInputs';
import {OBJECT_X_GALAXY_SPECTRA,OBJECT_X_PHOTOGRAPHS} from './objectXSpectrometerInputs';
import {multiSpecPick} from '../core/multiSpecSelect';
import {workerFailureKind} from './workerFailure';
import {lssFieldRows} from '../core/lssFields';
vi.setConfig({testTimeout:120000});
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const qb=file('catalogs/CLEA_QSO.DAT');
const paths=['spectra/QSOSpect.dat','images/GLIMAGES.LST','spectra/jspect2/JSPEC2.SPI','spectra/GLXYSP.LST',...[...MULTISPEC_STAR_TEMPLATES,...MULTISPEC_GALAXY_SPECTRA,...OBJECT_X_GALAXY_SPECTRA,...OBJECT_X_PHOTOGRAPHS].map(x=>x.path.replace('/original/',''))];
const byPath:Record<string,Uint8Array>=Object.fromEntries(paths.map(p=>['/original/'+p,file(p)]));
const resources=(over:Record<string,Uint8Array>={}):MultiSpecResources=>({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>over[p]??byPath[p],objectXHotList:async()=>file('hotlists/ObjectX.HTL')});
const coma=engineTargets.targets.find(t=>t.id==='NGC 4889')!;
describe('Front M: Multi-Spec inputs, view and spectra (in-process seam of the Worker path)',()=>{
 beforeAll(()=>{vi.stubGlobal('crypto',webcrypto);setMultiSpecResources(resources());});
 afterAll(()=>{setMultiSpecResources(null);vi.unstubAllGlobals();});
 it('the 115 bundled templates (48 earlier + 67 approved 2026-10-28) and the own spectra tables match the bundled bytes',()=>{
  expect(MULTISPEC_STAR_TEMPLATES).toHaveLength(115);
  for(const t of [...MULTISPEC_STAR_TEMPLATES,...MULTISPEC_GALAXY_SPECTRA]){const b=byPath[t.path];expect([t.file,b.byteLength,sha(b)]).toEqual([t.file,t.bytes,t.sha256]);}
 });
 it('a Hubble field: view, picks and spectra (own NGC4889.SP, star, sky, a star on a template approved 2026-10-28) on the 0.9 m',async()=>{
  const field={pack:'hubble-engine-coma' as const,pointing:coma.pointing,telescope:1 as const};
  const v=await multiSpecView(field);
  expect(v.reasons).toEqual([]);expect([v.viewport!.width,v.viewport!.height]).toEqual([312,312]);
  const f={population:v.population!,scene:v.scene!},g=multiSpecPick(f,468,468);expect([g.type,g.name]).toEqual([1,'NGC 4889']);
  const star=multiSpecPick(f,457,485),sky=multiSpecPick(f,312,620),typed=multiSpecPick(f,447,346);
  expect([star.type,sky.type,typed.type,typed.spectralIndex]).toEqual([0,4,0,50505000]);
  const e=await multiSpecSpectra(field,[{selection:g,seed:1,seconds:60},{selection:star,seed:2,seconds:60},{selection:sky,seed:3,seconds:60},{selection:typed,seed:4,seconds:60}]);
  expect(e.map(x=>x.status)).toEqual(['ready','ready','ready','ready']);// A0000061.SP (index 50505000) is bundled since the 2026-10-28 approval
  // Plain, cloneable data (what the Worker posts).
  expect(structuredClone(e)).toEqual(e);
 });
 it('an LSS field and an Object X row field build views with their routes’ options',async()=>{
  const row=lssFieldRows(1)[0],lss=await multiSpecView({pack:'lss-field-01',pointing:{ra:row.ra,dec:row.dec},telescope:0});
  expect(lss.population).not.toBeNull();expect(lss.reasons).not.toContain('outside-pack');
  const r=await loadMultiSpecInputs(resources()),p=r.objectX.rowPointings.get(10)!;
  const x=await multiSpecView({pack:'objectx-row-10',pointing:p,telescope:2});expect([x.reasons,!!x.viewport]).toEqual([[],true]);
 });
 it('a tampered template fails its hash check as a retryable load failure; an unknown pack is evidence',async()=>{
  const t=MULTISPEC_STAR_TEMPLATES[0],bad=byPath[t.path].slice();bad[100]^=1;
  const e=await loadMultiSpecInputs(resources({[t.path]:bad})).catch(x=>x);
  expect(e.name).toBe('MultiSpecInputError');expect(workerFailureKind(e)).toBe('load');
  const r=await loadMultiSpecInputs(resources());
  const unknown=await r.pack('objectx-row-2' as never).catch(x=>x);expect([unknown.message,workerFailureKind(unknown)]).toEqual(['Multi-Spec inputs: pack','evidence']);
  expect(multiSpecFailure(new MultiSpecEvidenceError())).toBe('evidence');
 });
});
