import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterEach,describe,expect,it} from 'vitest';
import {assembleFieldPack,type AssemblySources} from '../io/assembledFieldPack';
import {checkGscIndex,createGscTileStore} from '../io/gscTiles';
import {buildFieldPopulation,FIELD_HALF_DEGREES} from './fieldEngine';
import {clearTiledPhotometerFields,photometerFieldFromPopulation,registerTiledPhotometerField} from './photometerField';
import {photometerDisplayLevel,photometerDisplayPatch,photometerSkyGate,PHOTOMETER_DISPLAY,PHOTOMETER_DISPLAY_SHIFTS} from './photometerDisplay';
import {photometerGalaxySkyGate,tiledPhotometerReason} from './photometerUbvField';
import {createNativeSelectionScene} from './objectSelection';
import {roundNearestEven} from './numericPolicy';
import type {NativeGalaxy} from './pinnedGalaxyField';
import witness from './photometerDisplay.witness.json';

// Front PHSKY (analysis/front-phsky/RECOVERY.md §6): the photometer-field display patch and 0x53e338 bounds against an independent
// Python model of the recovered paint (analysis/front-phsky/tools/phsky_witness.py, run on the bundled CLEA_GLX.DAT; it reads the
// catalogue bytes and the recovered rules, not this port). Cases where only galaxies reach the patch (checked here on the
// engine's population): galaxies at their catalogue positions (both axes, zero minor, zero axes, PA ≠ 0), and pointings off the
// galaxy. These check the port against the reading, not against the original program.
// Review 1 L2: the witness re-derives the paint from the disassembly, but its bounding model is the same by construction (source
// footprint ± 1 pixel for GDI's stretch, the Ellipse pen band, the declared nearest-centre value, red-maximum compose, x87 near-tie
// widening, and only fields where no star stamp reaches the patch). It confirms that the port implements that model; it cannot show
// that the bounds contain what GDI really draws, and nothing static can.
const f=(p:string)=>new Uint8Array(readFileSync(p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const glx=f('public/original/catalogs/CLEA_GLX.DAT'),qso=f('public/original/catalogs/CLEA_QSO.DAT'),vars=f('public/original/variables/CLEA_VStrs.dat');
const sources:AssemblySources={index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch,capacity:64}),variables:vars,variablesSha256:sha(vars),qso,qsoSha256:sha(qso),glimages:f('public/original/images/GLIMAGES.LST')};
afterEach(()=>clearTiledPhotometerFields());
describe('Front PHSKY: the photometer-field display against the independent witness',()=>{
 it('the witness was made from the bundled CLEA_GLX.DAT',()=>{expect(witness.glxSha256).toBe(sha(glx));expect(witness.cases.length).toBe(11);});
 for(const c of witness.cases)it(c.label,async()=>{
  const p={ra:c.ra,dec:c.dec},pack=await assembleFieldPack(p,sources,undefined,FIELD_HALF_DEGREES.photometer);
  const b=buildFieldPopulation(pack,glx,p,{fieldHalfDegrees:FIELD_HALF_DEGREES.photometer,variableDispatch:'recovered',qso:'merge',qsoCatalog:{bytes:qso,sha256:sha(qso)}});
  const pop=b.population!;expect(b.reasons).toEqual([]);
  // The witness paints exactly the engine's galaxies, and no star stamp (99 × 99) reaches the patch.
  expect(pop.galaxies.map(g=>g.recordIndex).sort((x,y)=>x-y)).toEqual(c.galaxies);
  const scene=createNativeSelectionScene(pop.stars,[],{width:936,height:936,fieldDegrees:.05,center:p,population:{coverage:'complete',provenance:'witness'}}),{x0,x1,y0,y1}=PHOTOMETER_DISPLAY.patch;
  for(const s of scene.stars){const x=roundNearestEven(s.x),y=roundNearestEven(s.y);expect(x+49<x0||x-49>x1||y+49<y0||y-49>y1).toBe(true);}
  const r=photometerFieldFromPopulation(pop,b.reasons,p,'object',{qso,glx});expect(r.field?.selected.id).toBe(`CLEA_GLX.DAT@${c.record}`);
  const id=registerTiledPhotometerField(r.field!);
  PHOTOMETER_DISPLAY_SHIFTS.forEach((shift,t)=>{
   const w=c.telescopes[t];expect(w.shift).toBe(shift);
   const patch=photometerDisplayPatch({pointing:p,stars:pop.stars.map(s=>({id:s.id,ra:s.ra,dec:s.dec,type:s.type,magnitude:s.magnitude})),galaxies:pop.galaxies as readonly NativeGalaxy[]},shift);
   expect(patch.map(q=>({x:q.x,y:q.y,lo:q.lo,hi:q.hi,declared:q.declared}))).toEqual(w.patch);
   expect(photometerDisplayLevel(patch,10)).toEqual(w.wide);expect([5,6,7,8,9].map(a=>photometerDisplayLevel(patch,a))).toEqual(w.small);
   // The frame stores the same levels, and the Sky-mode gate and reason follow them.
   const tel=t as 0|1|2;
   for(const a of [5,7,9,10,25,150]){
    const l=a>=10?w.wide:w.small[a-5],gate=photometerSkyGate(l);
    expect(photometerGalaxySkyGate(id,tel,a)).toEqual({gate,level:l,stampBeyond:false});
    expect(tiledPhotometerReason(id,tel,a,'sky')).toBe(gate==='undecided'?'photometer-galaxy-sky':tiledPhotometerReason(id,tel,a,'object'));
   }
  });
 },120_000);
});
describe('Front PHSKY: a galaxy too large for a determined display',()=>{
 it('CLEA_GLX.DAT record 3770 (57.8′): stamps of half-size 9017 px exceed the web bound, so its Sky reading stays typed',async()=>{
  const g=new DataView(glx.buffer,glx.byteOffset,glx.byteLength);let ra=g.getFloat64(3770*59,true);if(ra>=24)ra-=24;const p={ra,dec:g.getFloat64(3770*59+8,true)};
  const pack=await assembleFieldPack(p,sources,undefined,FIELD_HALF_DEGREES.photometer);
  const b=buildFieldPopulation(pack,glx,p,{fieldHalfDegrees:FIELD_HALF_DEGREES.photometer,variableDispatch:'recovered',qso:'merge',qsoCatalog:{bytes:qso,sha256:sha(qso)}});
  const r=photometerFieldFromPopulation(b.population,b.reasons,p,'object',{qso,glx});expect(r.field?.selected.id).toBe('CLEA_GLX.DAT@3770');
  // 0x5943d4: a = Round(57.8 × 312 / 2) (Single 57.8 widened).
  const a=roundNearestEven(Math.fround(57.8)*312/2);expect(r.field!.selectedGalaxy!.display.map(d=>d.largestStamp)).toEqual([a,a,a]);expect(a).toBeGreaterThan(PHOTOMETER_DISPLAY.stampBound);
  const id=registerTiledPhotometerField(r.field!);
  for(const t of [0,1,2] as const){expect(photometerGalaxySkyGate(id,t,10)?.gate).toBe('undecided');expect(tiledPhotometerReason(id,t,10,'sky')).toBe('photometer-galaxy-sky-stamp');expect(tiledPhotometerReason(id,t,10,'object')).not.toBe('photometer-galaxy-sky-stamp');}
 },120_000);
});
