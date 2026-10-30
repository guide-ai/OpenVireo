import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {assembleFieldPack,type AssemblySources} from '../io/assembledFieldPack';
import {checkGscIndex,createGscTileStore} from '../io/gscTiles';
import {buildFieldPopulation,FIELD_HALF_DEGREES} from './fieldEngine';
import {buildPhotometerTargetField,photometerFieldFromPopulation,PLEIADES_PHOTOMETER_TARGETS,type PleiadesFieldKind} from './photometerField';

// Front G (G3a): the photometer field built from the compact GSC tiles by the general engine with the photometer field size
// equals every bundled Pleiades photometer field (24 HTL targets × object and sky), field for field.
const f=(p:string)=>new Uint8Array(readFileSync(p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const glx=f('public/original/catalogs/CLEA_GLX.DAT');
const sources=():AssemblySources=>{const v=f('public/original/variables/CLEA_VStrs.dat'),q=f('public/original/catalogs/CLEA_QSO.DAT');
 return {index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch,capacity:64}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:f('public/original/images/GLIMAGES.LST')};};
async function tiled(pointing:Readonly<{ra:number;dec:number}>,kind:PleiadesFieldKind,s:AssemblySources){
 const pack=await assembleFieldPack(pointing,s,undefined,FIELD_HALF_DEGREES.photometer);
 const built=buildFieldPopulation(pack,glx,pointing,{fieldHalfDegrees:FIELD_HALF_DEGREES.photometer,variableDispatch:'recovered'});
 return photometerFieldFromPopulation(built.population,built.reasons,pointing,kind);
}
describe('photometer fields from the tiles',()=>{
 it('equal every bundled Pleiades field (stars, neighbours, selection, fraction, magnitude, means)',async()=>{
  const s=sources();let n=0;
  for(const t of PLEIADES_PHOTOMETER_TARGETS)for(const kind of ['object','sky'] as const){
   const bundled=buildPhotometerTargetField(t.catalogId,kind),r=await tiled(bundled.pointing,kind,s);
   expect(r.reason,`${t.catalogId} ${kind}`).toBeUndefined();
   const {provenanceFile:_a,...want}=bundled,{provenanceFile:_b,...got}=r.field!;void _a;void _b;
   expect(got,`${t.catalogId} ${kind}`).toEqual(want);n++;
  }
  expect(n).toBe(48);
 },600_000);
 it('builds a field at another pointing, and types what the photometer path has not recovered',async()=>{
  const s=sources();
  // A star far from the Pleiades (N5230-00946, in the Star Data List of the 36773 field: 11 44 42.9 +55 22 43): the field builds
  // and the centre selects it, with a positive aperture fraction.
  const any=await tiled({ra:11+44/60+42.9/3600,dec:55+22/60+43/3600},'object',s);
  expect(any.reason).toBeUndefined();expect(any.field!.selected.nativeName).toBe('N5230-00946');
  expect(any.field!.centralFraction).toBeGreaterThan(0);expect(any.field!.sourceMean).toBeGreaterThan(0);
  // A sky reading takes whatever the aperture holds (VIREO's way, G3b): the same frame as an object reading at that pointing.
  const sky=await tiled({ra:11+44/60+42.9/3600,dec:55+22/60+43/3600},'sky',s);
  expect(sky.reason).toBeUndefined();expect(sky.field!.sourceMagnitude).toBe(any.field!.sourceMagnitude);expect(sky.field!.kind).toBe('sky');
  // M31's core (CLEA_GLX.DAT galaxies in the 0.05° field): typed, not approximated.
  expect((await tiled({ra:0.7123,dec:41.2692},'object',s)).reason).toBe('photometer-galaxy');
 },120_000);
});
