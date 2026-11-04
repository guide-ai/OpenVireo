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
import {decodeStarIndexList} from '../core/starTemplates';
import {evaluateMultiSpecView} from './multiSpecEvaluate';
import {OBJECT_X_SPECTRUM_ROWS} from '../core/objectXSpectrometer';
vi.setConfig({testTimeout:120000});
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const qb=file('catalogs/CLEA_QSO.DAT');
const paths=['spectra/QSOSpect.dat','images/GLIMAGES.LST','spectra/jspect2/JSPEC2.SPI','spectra/GLXYSP.LST',...[...MULTISPEC_STAR_TEMPLATES,...MULTISPEC_GALAXY_SPECTRA,...OBJECT_X_GALAXY_SPECTRA,...OBJECT_X_PHOTOGRAPHS].map(x=>x.path.replace('/original/',''))];
const byPath:Record<string,Uint8Array>=Object.fromEntries(paths.map(p=>['/original/'+p,file(p)]));
const resources=(over:Record<string,Uint8Array>={}):MultiSpecResources=>({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>over[p]??byPath[p]??file(p.replace('/original/','')),objectXHotList:async()=>file('hotlists/ObjectX.HTL')});
const coma=engineTargets.targets.find(t=>t.id==='NGC 4889')!;
describe('Front M: Multi-Spec inputs, view and spectra (in-process seam of the Worker path)',()=>{
 beforeAll(()=>{vi.stubGlobal('crypto',webcrypto);setMultiSpecResources(resources());});
 afterAll(()=>{setMultiSpecResources(null);vi.unstubAllGlobals();});
 it('every template JSPEC2.SPI names is bundled (48 earlier + 67 approved 2026-10-28 + 17 approved 2026-10-30) and the own spectra tables match the bundled bytes',()=>{
  expect(MULTISPEC_STAR_TEMPLATES).toHaveLength(132);
  expect(MULTISPEC_STAR_TEMPLATES.map(t=>t.file)).toEqual(decodeStarIndexList(byPath['/original/spectra/jspect2/JSPEC2.SPI']).map(e=>e.file.toUpperCase()).sort());
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
 it('F4 review 1 H1: once the inputs are loaded, no Object X row field reads an image (no per-row network hint before Reveal)',async()=>{
  const reads:string[]=[],counting:MultiSpecResources={...resources(),file:async p=>{reads.push(p);return byPath[p]??file(p.replace('/original/',''));}};
  const inputs=await loadMultiSpecInputs(counting);
  expect(reads.filter(p=>p.startsWith('/original/images/')&&/\.bmp$/i.test(p)).sort()).toEqual(OBJECT_X_PHOTOGRAPHS.map(p=>p.path).sort());
  const after=reads.length;let photographed=0;
  for(const {row} of OBJECT_X_SPECTRUM_ROWS)for(const telescope of [0,1,2] as const){
   const v=await evaluateMultiSpecView(inputs,{pack:`objectx-row-${row}`,pointing:inputs.objectX.rowPointings.get(row)!,telescope});
   if(v.population?.photographAssociations?.length)photographed++;
  }
  expect(reads.slice(after)).toEqual([]);expect(photographed).toBeGreaterThan(0);
 });
 it('F4 review 1 L2: a photograph that does not load leaves only its LSS field photographic-image, not a load error',async()=>{
  let fail=true;
  const failing:MultiSpecResources={...resources(),file:async p=>{if(fail&&p==='/original/images/NGC4150.BMP')throw new TypeError('fetch failed');return byPath[p]??file(p.replace('/original/',''));}};
  const inputs=await loadMultiSpecInputs(failing),row=lssFieldRows(1).find(r=>r.id==='NGC 4150')!;
  const request={pack:'lss-field-01',pointing:{ra:row.ra,dec:row.dec},telescope:0} as const;
  const v=await evaluateMultiSpecView(inputs,request);
  expect(v.reasons).toEqual(['photographic-image']);
  // Closure L3: that view is not cached; once the photograph loads, the same inputs draw it.
  fail=false;const retried=await evaluateMultiSpecView(inputs,request);
  expect(retried.reasons).toEqual([]);expect(retried.population?.photographAssociations?.map(a=>a.file)).toContain('NGC4150.BMP');
  const ok=await evaluateMultiSpecView(await loadMultiSpecInputs(resources()),{pack:'lss-field-01',pointing:{ra:row.ra,dec:row.dec},telescope:0});
  expect(ok.reasons).toEqual([]);expect(ok.population?.photographAssociations?.map(a=>a.file)).toContain('NGC4150.BMP');
 });
 it('an LSS field and an Object X row field build views with their routes’ options',async()=>{
  const row=lssFieldRows(1)[0],lss=await multiSpecView({pack:'lss-field-01',pointing:{ra:row.ra,dec:row.dec},telescope:0});
  expect(lss.population).not.toBeNull();expect(lss.reasons).not.toContain('outside-pack');
  const r=await loadMultiSpecInputs(resources()),p=r.objectX.rowPointings.get(10)!;
  const x=await multiSpecView({pack:'objectx-row-10',pointing:p,telescope:2});expect([x.reasons,!!x.viewport]).toEqual([[],true]);
 });
 it('Front MSTNONE: the two stars past JSPEC2.SPI on the D3 field bases stay typed star-template-none; the other fibres of the exposure keep their spectra',async()=>{
  // analysis/front-mstnone/mstnone-hits.json: N2230-01637 (lss-field-03, two pointings) and N3000-02231 (lss-field-04). Natively
  // 0x52789c shows the "No Spectrum" box and the flux loop then reads through the nil template (an access violation that ends
  // the selection loop 0x52a79c); the web keeps the fibre typed and does not abort the others [W].
  const cases=[{field:3,ra:12.754694444444445,dec:27.12611111111111,x:375,y:465,v:8.5,index:70993000},
   {field:3,ra:12.759638888888889,dec:27.06111111111111,x:457,y:383,v:8.5,index:70993000},
   {field:4,ra:13.19425,dec:31.50138888888889,x:589,y:615,v:16.790000915527344,index:81990000}] as const;
  for(const c of cases){
   const row=lssFieldRows(c.field).find(r=>r.ra===c.ra&&r.dec===c.dec)!;expect(row).toBeDefined();
   const field={pack:`lss-field-0${c.field}` as const,pointing:{ra:row.ra,dec:row.dec},telescope:0 as const};
   const v=await multiSpecView(field);expect(v.reasons).toEqual([]);
   const f={population:v.population!,scene:v.scene!},star=multiSpecPick(f,c.x,c.y);
   expect([star.type,star.v,star.spectralIndex]).toEqual([0,c.v,c.index]);
   // Every other star of the 312² crop that a click selects, in its own fibre.
   const others=v.scene!.stars.map((p,i)=>({p,i})).filter(({p,i})=>{const x=Math.round(p.x),y=Math.round(p.y);if(x<312||x>623||y<312||y>623)return false;
    const s=multiSpecPick(f,x,y);return s.source.kind==='star'&&(s.source as {index:number}).index===i&&s.spectralIndex!==c.index;}).map(({p})=>multiSpecPick(f,Math.round(p.x),Math.round(p.y)));
   expect(others.length).toBeGreaterThan(0);
   const fibres=[star,...others].map((selection,i)=>({selection,seed:i+1,seconds:60}));
   const together=await multiSpecSpectra(field,fibres),alone=await multiSpecSpectra(field,fibres.slice(1));
   expect(together[0]).toEqual({status:'unavailable',reason:'star-template-none'});
   expect(together.slice(1)).toEqual(alone);
   expect(alone.every(e=>e.status==='ready'||e.status==='unavailable'&&e.reason!=='star-template-none')).toBe(true);
  }
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
