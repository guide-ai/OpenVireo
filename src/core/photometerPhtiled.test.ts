import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterEach,describe,expect,it} from 'vitest';
import {assembleFieldPack,type AssemblySources} from '../io/assembledFieldPack';
import {checkGscIndex,createGscTileStore} from '../io/gscTiles';
import {buildFieldPopulation,FIELD_HALF_DEGREES} from './fieldEngine';
import {clearTiledPhotometerFields,photometerFieldFromPopulation,photometerGalaxyWidthDegrees,queryPhotometerNeighbors,registerTiledPhotometerField,type PinnedPleiadesField} from './photometerField';
import {buildPinnedPleiadesUbvField,photometerSelectedFraction,tiledPhotometerReason} from './photometerUbvField';
import {attenuatePhotometerMagnitude,combinePhotometerMagnitudes,photometerPointFraction,photometerSeparation} from './photometerSource';
import {photometerApertureGeometry} from './photometerAperture';
import {photometerTelescope} from './photometerTelescope';
import {morphologyAxisRatio} from './galaxyCatalogAxes';
import {galaxyColours} from './catalogObject';

// Front PHTILED (analysis/front-phtiled/RECOVERY.md): the photometer at tiled pointings where the centre selects a galaxy or a QSO,
// and blended apertures at the 0.9 m and 4 m. Real catalogue positions from the bundled files; the expected values are recomputed
// here from the raw catalogue bytes with the decoded formulas (a check of the port against the reading, not of the original).
const f=(p:string)=>new Uint8Array(readFileSync(p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const glx=f('public/original/catalogs/CLEA_GLX.DAT'),qso=f('public/original/catalogs/CLEA_QSO.DAT'),vars=f('public/original/variables/CLEA_VStrs.dat');
const sources:AssemblySources={index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch,capacity:64}),variables:vars,variablesSha256:sha(vars),qso,qsoSha256:sha(qso),glimages:f('public/original/images/GLIMAGES.LST')};
async function frame(p:Readonly<{ra:number;dec:number}>){
 const pack=await assembleFieldPack(p,sources,undefined,FIELD_HALF_DEGREES.photometer);
 const b=buildFieldPopulation(pack,glx,p,{fieldHalfDegrees:FIELD_HALF_DEGREES.photometer,variableDispatch:'recovered',qso:'merge',qsoCatalog:{bytes:qso,sha256:sha(qso)}});
 return photometerFieldFromPopulation(b.population,b.reasons,p,'object',{qso,glx});
}
const g=new DataView(glx.buffer,glx.byteOffset,glx.byteLength);
const galaxyAt=(i:number)=>{const o=i*59;let ra=g.getFloat64(o,true);const raw=ra;if(ra>=24)ra-=24;return {pointing:{ra,dec:g.getFloat64(o+8,true)},raw,major:g.getFloat32(o+16,true),minor:g.getFloat32(o+20,true),v:g.getFloat32(o+24,true),t:g.getInt8(o+34)};};
const R10=photometerApertureGeometry(10).radiusDegrees;
afterEach(()=>clearTiledPhotometerFields());
/** Independent recomputation: 0x4ffbc8..0x4ffd52 for the selected object, then the neighbour fold 0x4ffdbb..0x4ffee0. */
function expectedV(field:PinnedPleiadesField,centralFraction:number,seeing:number,radius:number){
 let v=attenuatePhotometerMagnitude(field.selected.magnitude,centralFraction);
 for(const n of queryPhotometerNeighbors(field.pointing,radius,field.stars,field.qsos??[])){
  if(n.nativeName===field.selected.nativeName)continue;
  const fn=photometerPointFraction(radius,photometerSeparation(field.pointing.ra,field.pointing.dec,n.ra,n.dec),seeing);
  if(fn>0)v=combinePhotometerMagnitudes(attenuatePhotometerMagnitude(n.magnitude,fn),v);
 }
 return v;
}
describe('Front PHTILED: a selected galaxy (kind 1) at its catalogue position',()=>{
 for(const [i,label,kind] of [[23,'NGC 7805','both axes'],[37,'00002+1837','zero minor axis: 0x53b94c ratio × a'],[41,'A0000-3600','zero axes: a = 1/120, ratio × a']] as const)it(`${label} (CLEA_GLX.DAT record ${i}, ${kind})`,async()=>{
  const r=galaxyAt(i),got=await frame(r.pointing);
  expect(got.reason).toBeUndefined();const fr=got.field!;
  expect(fr.selected.type).toBe(1);expect(fr.selected.id).toBe(`CLEA_GLX.DAT@${i}`);expect(fr.selected.nativeName.trim()).toBe(label);
  // 0x53cf4d..0x53cf59: V from the record's +0x18 Single, colours from the morphology table of 0x598f35.
  expect(fr.selected.magnitude).toBe(r.v);expect([fr.selected.photometry2Single,fr.selected.photometry3Single]).toEqual([galaxyColours(r.t)!.bv,galaxyColours(r.t)!.ub]);
  // 0x500700..0x5007af, recomputed from the raw axes.
  let a=r.major/60;if(a===0)a=1/120;let b=r.minor/60;if(b===0)b=morphologyAxisRatio(r.t,r.raw)*a;
  const w=.6*((a+b)/4);expect(fr.selectedGalaxy!.widthDegrees).toBe(w);
  expect(photometerGalaxyWidthDegrees({majorArcminutes:r.major,minorArcminutes:r.minor,morphology:r.t,ra:r.raw})).toBe(w);
  // d = 0 (the object is a copy of the named record): the fraction is independent of the offset and of the telescope.
  expect(fr.centralFraction).toBe(photometerPointFraction(R10,0,w));
  const id=registerTiledPhotometerField(fr);
  expect([0,1,2].map(t=>photometerSelectedFraction(id,'object',10,t as 0|1|2))).toEqual([fr.centralFraction,fr.centralFraction,fr.centralFraction]);
  expect(fr.sourceMagnitude).toBe(expectedV(fr,fr.centralFraction,photometerTelescope(0).seeingWidthDegrees,R10));
  // An Object reading is admitted on every telescope; a Sky reading while the galaxy is selected needs the Telescope display (0x53e338).
  for(const t of [0,1,2] as const){expect(tiledPhotometerReason(id,t,10,'object')).toBeNull();expect(tiledPhotometerReason(id,t,10,'sky')).toBe('photometer-galaxy-sky');}
  const r150=photometerApertureGeometry(150).radiusDegrees,c=buildPinnedPleiadesUbvField('object','V',id,150,1);
  expect(c.sourceMagnitude).toBe(expectedV(fr,photometerPointFraction(r150,0,w),photometerTelescope(1).seeingWidthDegrees,r150));
 },120_000);
 it('a galaxy whose catalogue name another record shares is typed (NGC 190, records 784 and 787)',async()=>{
  for(const i of [784,787])expect((await frame(galaxyAt(i).pointing)).reason).toBe('photometer-galaxy-name');
 },120_000);
});
describe('Front PHTILED: QSOs (the telescope field merges them, mode 1)',()=>{
 it('a selected QSO is prepared from its own V and colours, and the QSO list is the second neighbour list',async()=>{
  const q=new DataView(qso.buffer,qso.byteOffset,qso.byteLength),o=2*52,p={ra:q.getFloat64(o+0x12,true),dec:q.getFloat64(o+0x1a,true)};
  const fr=(await frame(p)).field!;
  expect(fr.selected.type).toBe(3);expect(fr.selected.id).toBe('CLEA_QSO.DAT@2');expect(fr.selected.nativeName).toHaveLength(qso[o]);
  expect([fr.selected.magnitude,fr.selected.photometry2Single,fr.selected.photometry3Single]).toEqual([q.getFloat32(o+0x22,true),q.getFloat32(o+0x26,true),q.getFloat32(o+0x2a,true)]);
  expect(fr.qsos!.map(x=>x.id)).toEqual(['CLEA_QSO.DAT@2']);
  // 0x59ac54 lists the merged star-list copy and the QSO-list record; both carry the selected name, so neither is added.
  expect(queryPhotometerNeighbors(fr.pointing,R10,fr.stars,fr.qsos!).filter(n=>n.nativeName===fr.selected.nativeName)).toHaveLength(2);
  const fs=photometerPointFraction(R10,photometerSeparation(p.ra,p.dec,fr.selected.ra,fr.selected.dec),photometerTelescope(0).seeingWidthDegrees);
  expect(fr.centralFraction).toBe(fs);expect(fr.sourceMagnitude).toBe(expectedV(fr,fs,photometerTelescope(0).seeingWidthDegrees,R10));
 },120_000);
 it('a QSO that is not selected reaches the aperture through the QSO list even when its star-list copy is gone (CLEA_QSO.DAT 2132)',async()=>{
  const q=new DataView(qso.buffer,qso.byteOffset,qso.byteLength),o=2132*52,p={ra:q.getFloat64(o+0x12,true),dec:q.getFloat64(o+0x1a,true)};
  const fr=(await frame(p)).field!;expect(fr.selected.type).toBe(0);
  // The galaxy cleanup 0x5980cc of galaxy 69457 pruned the inserted star-list copy as its runner; field+0x35 keeps the record.
  expect(fr.stars.some(s=>s.type===3)).toBe(false);expect(fr.qsos!.map(x=>x.id)).toEqual(['CLEA_QSO.DAT@2132']);
  const id=registerTiledPhotometerField(fr);
  // The smallest aperture whose neighbour query reaches the QSO.
  const a=[...Array(146).keys()].map(k=>k+5).find(s=>queryPhotometerNeighbors(fr.pointing,photometerApertureGeometry(s).radiusDegrees,fr.stars,fr.qsos!).some(n=>n.type===3))!;
  expect(a).toBeDefined();const radius=photometerApertureGeometry(a).radiusDegrees;
  const hits=queryPhotometerNeighbors(fr.pointing,radius,fr.stars,fr.qsos!).filter(n=>n.type===3);expect(hits.map(n=>n.id)).toEqual(['CLEA_QSO.DAT@2132']);
  expect(buildPinnedPleiadesUbvField('object','V',id,a,0).sourceMagnitude).toBe(expectedV(fr,photometerPointFraction(radius,photometerSeparation(p.ra,p.dec,fr.selected.ra,fr.selected.dec),photometerTelescope(0).seeingWidthDegrees),photometerTelescope(0).seeingWidthDegrees,radius));
 },120_000);
});
describe('Front PHTILED: blends at the 0.9 m and 4 m are read as at the 0.4 m (the former web limit is lifted)',()=>{
 it('the CLEA_VStrs.dat 20193 position: another star shares the aperture; each telescope folds it with its own seeing width',async()=>{
  const p={ra:18.389641190591252,dec:-12.681682560966975},fr=(await frame(p)).field!,id=registerTiledPhotometerField(fr);
  expect(fr.neighbors.filter(n=>n.nativeName!==fr.selected.nativeName).length).toBeGreaterThan(0);
  for(const t of [0,1,2] as const){
   expect(tiledPhotometerReason(id,t,10)).toBeNull();
   const seeing=photometerTelescope(t).seeingWidthDegrees,fs=photometerPointFraction(R10,photometerSeparation(p.ra,p.dec,fr.selected.ra,fr.selected.dec),seeing);
   expect(buildPinnedPleiadesUbvField('object','V',id,10,t).sourceMagnitude).toBe(expectedV(fr,fs,seeing,R10));
  }
 },120_000);
});
