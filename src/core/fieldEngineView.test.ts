import {describe,it,expect,vi,beforeAll} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import coma from '../../data/hubble/engine-coma.json';
import bootes from '../../data/hubble/engine-bootes.json';
import engineTargets from '../../data/hubble/engine-targets.json';
import {decodeFieldPack,type FieldPack} from './fieldPack';
import {evaluateField,evaluateFieldView,type FieldOptions,type FieldResult,type FieldTelescope,type FieldView} from './fieldEngine';
import {lssFieldRows,type LssFieldNumber} from './lssFields';
import {OBJECT_X_SPECTRUM_ROWS,objectXField,type ObjectXSpectrometerInputs} from './objectXSpectrometer';
import {loadObjectXSpectrometerInputs} from '../io/objectXSpectrometerInputs';
import {OBJECT_X_STAR_TEMPLATES,OBJECT_X_GALAXY_SPECTRA,OBJECT_X_PHOTOGRAPHS} from '../io/objectXSpectrometerInputs';
vi.setConfig({testTimeout:600_000});
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array|Uint8ClampedArray)=>createHash('sha256').update(b).digest('hex');
const glx=file('catalogs/CLEA_GLX.DAT'),qb=file('catalogs/CLEA_QSO.DAT'),qsoCatalog={bytes:qb,sha256:sha(qb)};
const lssPack=(n:LssFieldNumber)=>decodeFieldPack(JSON.parse(readFileSync(new URL(`../../data/lss/lss-field-0${n}.json`,import.meta.url),'utf8')));
/** The view equals evaluateField up to the crop: population, scene and viewport; field-level reasons when the crop is not reached. */
function same(view:FieldView,full:FieldResult){
 expect(view.population).toEqual(full.population);
 expect(view.scene).toEqual(full.scene);
 if(full.viewport===null){expect(view.viewport).toBeNull();expect(view.reasons).toEqual(full.reasons);return 'gated';}
 expect(view.reasons).toEqual([]);
 expect([view.viewport!.width,view.viewport!.height,sha(view.viewport!.rgb)]).toEqual([full.viewport.width,full.viewport.height,sha(full.viewport.rgb)]);
 expect(view.outsideViewGalaxies).toEqual(full.outsideViewGalaxies);
 return 'view';
}
describe('Front M: evaluateFieldView equals evaluateField’s population, scene and viewport',()=>{
 it('every LSS pointing (default options) on the 0.4 m; field 1 also on the 4 m (the paint differs only by the magnitude shift)',()=>{
  const tally={view:0,gated:0};
  for(const n of [1,2,3,4,5,6,7,8,9] as const){const pack=lssPack(n);
   for(const row of lssFieldRows(n))for(const t of n===1?[0,2] as const:[0] as const){const p={ra:row.ra,dec:row.dec};tally[same(evaluateFieldView(pack,glx,p,t),evaluateField(pack,glx,p,t))]++;}}
  expect(tally.view+tally.gated).toBe(219+lssFieldRows(1).length);expect(tally.view).toBeGreaterThan(0);expect(tally.gated).toBeGreaterThan(0);
 });
 it('every LSS pointing in the QSO merge mode Multi-Spec uses (io/multiSpecInputs.multiSpecFieldOptions), 0.4 and 0.9 m',()=>{
  const tally={view:0,gated:0},options:FieldOptions={qso:'merge',qsoCatalog};
  for(const n of [1,2,3,4,5,6,7,8,9] as const){const pack=lssPack(n);
   for(const row of lssFieldRows(n))for(const t of [0,1] as const){const p={ra:row.ra,dec:row.dec};tally[same(evaluateFieldView(pack,glx,p,t,options),evaluateField(pack,glx,p,t,options))]++;}}
  expect(tally.view+tally.gated).toBe(219*2);expect(tally.view).toBeGreaterThan(0);expect(tally.gated).toBeGreaterThan(0);
 });
 it('the four Hubble engine targets with their recorded options, every telescope',()=>{
  const packs=new Map<string,FieldPack>([['hubble-engine-coma',decodeFieldPack(coma)],['hubble-engine-bootes',decodeFieldPack(bootes)]]);
  for(const rec of engineTargets.targets){
   const options:FieldOptions={qso:'merge',qsoCatalog,...((rec as {variables?:string}).variables==='outside-view'?{variables:'outside-view' as const}:{})};
   for(const t of [0,1,2] as FieldTelescope[])expect(same(evaluateFieldView(packs.get(rec.pack)!,glx,rec.pointing,t,options),evaluateField(packs.get(rec.pack)!,glx,rec.pointing,t,options))).toBe('view');
  }
 });
 describe('the Object X spectroscopy pointings (rows only; same population options as the spectrometer)',()=>{
  let inputs:ObjectXSpectrometerInputs;
  beforeAll(async()=>{
   vi.stubGlobal('crypto',webcrypto);
   const paths=['spectra/QSOSpect.dat','images/GLIMAGES.LST','spectra/jspect2/JSPEC2.SPI','spectra/GLXYSP.LST',...[...OBJECT_X_STAR_TEMPLATES,...OBJECT_X_GALAXY_SPECTRA,...OBJECT_X_PHOTOGRAPHS].map(x=>x.path.replace('/original/',''))];
   const byPath=Object.fromEntries(paths.map(p=>['/original/'+p,file(p)]));
   inputs=await loadObjectXSpectrometerInputs({glx:async()=>glx,qsoCatalog:async()=>qsoCatalog,file:async p=>byPath[p],objectXHotList:async()=>file('hotlists/ObjectX.HTL')});
  });
  it('every row and telescope',()=>{
   for(const {row,pack} of OBJECT_X_SPECTRUM_ROWS)for(const t of [0,1,2] as FieldTelescope[]){
    const p=inputs.rowPointings.get(row)!,full=objectXField(inputs,p,t)!.result;
    const options:FieldOptions={variableDispatch:'recovered',photographs:inputs.photographs,qso:'merge',qsoCatalog:inputs.qsoCatalog};
    expect(same(evaluateFieldView(inputs.packs.get(pack)!,inputs.glx,p,t,options),full)).toBe('view');
   }
  });
 });
});
