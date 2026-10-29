import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import witness from '../../data/multispec/witness.json';
import coma from '../../data/hubble/engine-coma.json';
import engineTargets from '../../data/hubble/engine-targets.json';
import galaxySource from '../../data/hubble/galaxy-source.json';
import {decodeFieldPack} from './fieldPack';
import {evaluateFieldView,FIELD_CALIBRATIONS,type FieldTelescope} from './fieldEngine';
import {decodeStarIndexList,starTemplateSpectrum} from './starTemplates';
import {decodeQsoSpectrumFile} from './qsoSpectrum';
import {parseLibrarySpectrum} from './spectrum';
import {galaxyChannelGrid} from './galaxySpectrum';
import {catalogRecords} from './catalogObject';
import {randomDraw,type UniformSpectrum} from './acquisition';
import {multiSpecGrid,multiSpecK,multiSpecZeroPoint,multiSpecFluxFactor,prepareMultiSpecFibre,exposeMultiSpecFibre,multiSpecFibreSpectrum,multiSpecMeans,MULTISPEC_INTERVAL,type MultiSpecContext,type MultiSpecSelection} from './multiSpecSpectrum';
import {multiSpecPick} from './multiSpecSelect';
import {multiSpecSspBytes} from './multiSpecFormat';

const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const latin1=(b:Uint8Array)=>{let t='';for(const x of b)t+=String.fromCharCode(x);return t;};
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const glx=file('catalogs/CLEA_GLX.DAT'),qb=file('catalogs/CLEA_QSO.DAT');
const templates=new Map<string,UniformSpectrum>();
for(const f of readdirSync(new URL('../../public/original/classification/',import.meta.url)).filter(x=>/^A\d{7}\.SP$/.test(x)))templates.set(f,starTemplateSpectrum(latin1(file('classification/'+f))));
// A0000046.SP and the 67 templates approved on 2026-10-28 for Multi-Spec (public/original/spectra/jspect2).
for(const f of readdirSync(new URL('../../public/original/spectra/jspect2/',import.meta.url)).filter(x=>/^A\d{7}\.SP$/.test(x)))templates.set(f,starTemplateSpectrum(latin1(file('spectra/jspect2/'+f))));
const glxyspLines=latin1(file('spectra/GLXYSP.LST')).replace(/\x1a$/,'').split('\r\n').filter(Boolean);
const galaxyTemplate={file:'GLXYTMPL.SP',samples:galaxySource.samples.map(([wavelength,intensity])=>({wavelength,intensity}))};
const comaPack=decodeFieldPack(coma),comaTarget=engineTargets.targets.find(t=>t.id==='NGC 4874')!;
const view=evaluateFieldView(comaPack,glx,comaTarget.pointing,0,{qso:'merge',qsoCatalog:{bytes:qb,sha256:sha(qb)}});
const names=catalogRecords(view.population!).galaxies;
const context=(telescope:FieldTelescope):MultiSpecContext=>({telescope,starIndex:decodeStarIndexList(file('spectra/jspect2/JSPEC2.SPI')),starTemplates:templates,
 galaxies:view.population!.galaxies.map((galaxy,i)=>({name:names[i].id,galaxy})),glxyspLines,galaxySpectra:new Map([['NGC4889.SP',parseLibrarySpectrum(latin1(file('spectra/NGC4889.SP')))]]),galaxyTemplate,qsoSpectrum:decodeQsoSpectrumFile(file('spectra/QSOSpect.dat'))});
type Case=(typeof witness.results)[number]['case'];
/** The Hubble cases are picked on the engine view by clicking their positions; the Object X cases are numbers only. */
function selectionOf(c:Case):MultiSpecSelection{
 const x=c as Case&{v?:number;z?:number;spectralIndex?:number;magnitude?:number};
 if(c.field==='hubble-coma'){
  const field={population:view.population!,scene:view.scene!};
  if(c.kind==='sky'){
   // A raster point more than 10 px from every object of the view.
   for(let y=312;y<624;y++)for(let px=312;px<624;px++){const s=multiSpecPick(field,px,y);if(s.type===4)return s;}
   throw Error('no sky point');
  }
  const id=(c as Case&{id:string}).id;
  const at=c.kind==='galaxy'?view.scene!.galaxies[view.population!.galaxies.findIndex(g=>g.id===id)]:view.scene!.stars[view.population!.stars.findIndex(s=>s.id===id)];
  const s=multiSpecPick(field,Math.round(at.x),Math.round(at.y));
  // The engine pick carries exactly the witness's numeric inputs.
  if(c.kind==='galaxy'){const g=view.population!.galaxies[(s.source as {index:number}).index];expect([s.type,g.magnitude,g.majorArcminutes,g.minorArcminutes,g.redshift,g.morphology]).toEqual([1,x.magnitude,(c as {major:number}).major,(c as {minor:number}).minor,x.z,(c as {morphology:number}).morphology]);}
  else expect([s.type,s.v,s.spectralIndex]).toEqual([0,x.v,x.spectralIndex]);
  return s;
 }
 const kind=c.kind==='qso'?3:0;
 return {type:kind,name:'fibre',ra:0,dec:0,v:Math.fround(x.v!),z:kind===3?Math.fround(x.z!):null,spectralIndex:kind===3?99:x.spectralIndex!,x:0,y:0,source:{kind:'star',index:0}};
}
const close=(a:number,b:number)=>Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(b));

describe('Front M: Multi-Spec grid, constants and flux factors (0x526e6c, 0x526fb4)',()=>{
 it('400-bin grid at the recovered 3700–4700 Å; the same rounding as galaxyChannelGrid at 600 bins',()=>{
  const g=multiSpecGrid(MULTISPEC_INTERVAL.minimum,MULTISPEC_INTERVAL.maximum);
  expect([g.lower,g.upper,g.dispersion,g.wavelengths.length,g.wavelengths[0],g.wavelengths[399]]).toEqual([3700,4700,2.5,400,3700,4697.5]);
  for(const [lo,hi] of [[4000,5000],[3700,4700],[3650.5,4720.25],[1000,1200],[3999.9,4000.1]] as const){
   const a=multiSpecGrid(lo,hi,600),b=galaxyChannelGrid(lo,hi);expect(a.dispersion).toBe(b.step);expect(a.wavelengths).toEqual(b.wavelengths);
  }
  expect(()=>multiSpecGrid(4700,3700)).toThrow();
 });
 it('K = 50·t·1000/1 with Single t; zero points 4/6/9; skyF = 10^((19 − zp)/−2.5)',()=>{
  expect(multiSpecK(60)).toBe(3_000_000);expect(multiSpecK(0.1)).toBe(50*Math.fround(0.1)*1000);
  expect([0,1,2].map(t=>multiSpecZeroPoint(t as FieldTelescope))).toEqual([4,6,9]);
  expect(multiSpecFluxFactor(19,4)).toBe(Math.pow(10,15/-2.5));
  expect(FIELD_CALIBRATIONS.map(c=>c.meanBound)).toEqual([12,12,1_000_000]);
 });
});

describe('Front M: fibre spectra equal the independent Python witness (data/multispec/witness.json)',()=>{
 it('the witness read the bundled files this test reads',()=>{
  for(const [name,i] of Object.entries(witness.inputs))expect([name,sha(file(i.path.replace('public/original/','')))]).toEqual([name,i.sha256]);
  // galaxy-source.json carries the same samples as the bundled GLXYTMPL.SP the witness parsed.
  expect(parseLibrarySpectrum(latin1(file('spectra/GLXYTMPL.SP')))).toEqual(galaxyTemplate.samples);
 });
 for(const r of witness.results)it(`${r.case.field} ${r.case.label} on telescope ${r.telescope}`,()=>{
  const sel=selectionOf(r.case),ctx=context(r.telescope as FieldTelescope),w=r.result as Record<string,unknown>&typeof r.result;
  const prepared=prepareMultiSpecFibre(sel,ctx,r.case.seed),e=exposeMultiSpecFibre(prepared,witness.seconds);
  if(w.status!=='ready'){expect(e).toEqual({status:'unavailable',reason:w.reason});return;}
  if(prepared.status!=='ready'||e.status!=='ready')throw Error(JSON.stringify(e));
  const means=multiSpecMeans(prepared,witness.seconds),wm=w.means as {bins:number[];values:number[];max:number;sky:number};
  expect(means.K).toBe(w.K);expect(close(prepared.fluxFactor,w.fluxFactor as number)).toBe(true);expect(close(prepared.skyFactor,w.skyFactor as number)).toBe(true);
  wm.bins.forEach((b,i)=>expect(close(means.object[b],wm.values[i])).toBe(true));
  expect(close(Math.max(...means.object),wm.max)).toBe(true);expect(close(means.sky,wm.sky)).toBe(true);
  expect(prepared.draws).toBe(w.setupDraws);expect(prepared.sourceFile).toBe(w.source);
  const s=e.spectrum;
  expect(s.counts).toEqual(w.counts);
  expect([s.signal,s.skySum,s.total,s.plotMaximum,s.draws,s.seed]).toEqual([w.signal,w.skySum,w.total,w.plotMaximum,w.draws,w.seedAfter]);
  expect(close(s.average,w.average as number)&&close(s.snr,w.snr as number)).toBe(true);
  const bytes=multiSpecSspBytes(s),ssp=w.ssp as {bytes:number;sha256:string};expect([bytes.byteLength,sha(bytes)]).toEqual([ssp.bytes,ssp.sha256]);
 });
 it('D3: the rejection branch (mean ≥ 12) is exercised with its draw order; the field-engine guard would type these fibres',()=>{
  const ready=witness.results.filter(r=>r.result.status==='ready');
  expect(witness.branches.rejection).toBeGreaterThan(0);expect(witness.branches.product).toBeGreaterThan(0);
  // Every non-sky fibre that is ready on the 0.4 m has a largest mean ≥ 12: the spectrometer's per-record meanBound (12) would
  // make it 'mean-bound'; Multi-Spec draws it. On the 4 m both rules are the 10⁶ admission.
  for(const r of ready)if(r.telescope===0&&r.case.kind!=='sky')expect((r.result as {means:{max:number}}).means.max).toBeGreaterThanOrEqual(12);
  expect(witness.results.filter(r=>r.result.status!=='ready'&&(r.result as {reason:string}).reason==='multispec-mean-bound').map(r=>[r.case.label,r.telescope])).toEqual([['bright star N2230.DAT@503415 (mean bound on the 4 m)',2]]);
 });
});

describe('Front M: fibre contract',()=>{
 const ctx=context(0),star=(over:Partial<MultiSpecSelection>):MultiSpecSelection=>({type:0,name:'s',ra:13,dec:28,v:12,z:null,spectralIndex:40305000,x:0,y:0,source:{kind:'star',index:0},...over});
 it('each fibre has its own stream: one fibre’s draws do not depend on another’s',()=>{
  const a=multiSpecFibreSpectrum(star({}),ctx,7,10),b=multiSpecFibreSpectrum(star({v:13}),ctx,7,10),a2=multiSpecFibreSpectrum(star({}),ctx,7,10);
  expect(a).toEqual(a2);if(a.status!=='ready'||b.status!=='ready')throw Error();
  expect(a.spectrum.counts).not.toEqual(b.spectrum.counts);
 });
 it('draw order per bin: object then sky, all from the fibre seed',()=>{
  const p=prepareMultiSpecFibre(star({}),ctx,99),e=exposeMultiSpecFibre(p,0.5);if(p.status!=='ready'||e.status!=='ready')throw Error();
  // At t = 0 every mean is 0: the product branch takes exactly one uniform per draw (two per bin).
  const z=exposeMultiSpecFibre(p,0);if(z.status!=='ready')throw Error();
  expect(z.spectrum.draws).toBe(800);let s=99;for(let i=0;i<800;i++)s=randomDraw(s).seed;expect(z.spectrum.seed).toBe(s);
  expect(z.spectrum.counts.every(c=>c===0)).toBe(true);expect(z.spectrum.plotMaximum).toBe(1);expect(()=>multiSpecSspBytes(z.spectrum)).toThrow(/zero-maximum/);
 });
 it('a sky fibre draws only the sky and has F = 0; S/N = √(total/400); plot y = 170 − Round(c·150/max)',()=>{
  const e=multiSpecFibreSpectrum({type:4,name:'Sky',ra:null,dec:null,v:null,z:null,spectralIndex:null,x:400,y:400,source:{kind:'sky'}},ctx,5,60);
  if(e.status!=='ready')throw Error();
  expect(e.spectrum.signal).toBe(0);expect(e.spectrum.total).toBe(e.spectrum.skySum);expect(e.spectrum.snr).toBe(Math.sqrt(e.spectrum.total/400));
  const m=e.spectrum.plotMaximum;expect(e.spectrum.plotY).toEqual(e.spectrum.counts.map(c=>170-Math.round(c*(150/m))));
 });
 it('typed reasons: nil lookup, index 0, template not bundled (D2), unknown galaxy, own spectrum not bundled, type ≥ 5, variable',()=>{
  expect(prepareMultiSpecFibre(star({spectralIndex:5}),ctx,1)).toEqual({status:'unavailable',reason:'star-template-none'});
  expect(prepareMultiSpecFibre(star({spectralIndex:0}),ctx,1)).toEqual({status:'unavailable',reason:'star-template-random'});
  // A0000003.SP (index 10655000) is outside every approval: still typed (no published star requires it).
  expect(prepareMultiSpecFibre(star({spectralIndex:10655000}),ctx,1)).toEqual({status:'unavailable',reason:'spectrum-template-unapproved'});
  expect(prepareMultiSpecFibre(star({type:1,name:'no such galaxy'}),ctx,1)).toEqual({status:'unavailable',reason:'galaxy-lookup'});
  const own={...ctx,galaxySpectra:new Map()};
  expect(prepareMultiSpecFibre(star({type:1,name:'NGC 4889'}),own,1)).toEqual({status:'unavailable',reason:'spectrum-mapping'});
  expect(prepareMultiSpecFibre(star({type:5}),ctx,1)).toEqual({status:'unavailable',reason:'object-type'});
  expect(prepareMultiSpecFibre(star({variableReason:'variable-time-required',v:null,spectralIndex:null}),ctx,1)).toEqual({status:'unavailable',reason:'variable-time-required'});
 });
 it('decision D3: a mean above 10⁶ in any bin is typed before any draw',()=>{
  expect(multiSpecFibreSpectrum(star({v:2}),context(2),1,60)).toEqual({status:'unavailable',reason:'multispec-mean-bound'});
 });
});
