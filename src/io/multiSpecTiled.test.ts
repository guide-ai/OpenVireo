import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {multiSpecView,multiSpecSpectra,setMultiSpecResources} from './multiSpec';
import {MULTISPEC_STAR_TEMPLATES,MULTISPEC_GALAXY_SPECTRA,loadMultiSpecInputs,type MultiSpecResources} from './multiSpecInputs';
import {OBJECT_X_GALAXY_SPECTRA,OBJECT_X_PHOTOGRAPHS} from './objectXSpectrometerInputs';
import {setTileSources} from './tileAssembly';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {multiSpecPick} from '../core/multiSpecSelect';
import {anyMultiSpecField,observatoryMultiSpecField} from '../multispec/multiSpecFields';
import engineTargets from '../../data/hubble/engine-targets.json';
vi.setConfig({testTimeout:300000});

// Front G G4b (analysis/front-plans/front-g-gsc.md §11): Multi-Spec at any pointing, from a pack assembled from the compact GSC
// tiles in the Multi-Spec evaluation (in process here; the Worker in the browser). No catalogue value is asserted.
const pub=(p:string)=>new Uint8Array(readFileSync('public'+p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const qb=pub('/original/catalogs/CLEA_QSO.DAT');
const paths=['/original/spectra/QSOSpect.dat','/original/images/GLIMAGES.LST','/original/spectra/jspect2/JSPEC2.SPI','/original/spectra/GLXYSP.LST',...[...MULTISPEC_STAR_TEMPLATES,...MULTISPEC_GALAXY_SPECTRA,...OBJECT_X_GALAXY_SPECTRA,...OBJECT_X_PHOTOGRAPHS].map(x=>x.path)];
const byPath:Record<string,Uint8Array>=Object.fromEntries(paths.map(p=>[p,pub(p)]));
const resources:MultiSpecResources={glx:async()=>pub('/original/catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>byPath[p],objectXHotList:async()=>pub('/original/hotlists/ObjectX.HTL')};
let tileFetches=0,failTiles=false;
function tiles(){
 const v=pub('/original/variables/CLEA_VStrs.dat'),g=pub('/original/images/GLIMAGES.LST');
 const fetcher=(async(u:RequestInfo|URL)=>{tileFetches++;if(failTiles)throw new TypeError('fetch failed');return new Response(pub(String(u)));}) as typeof fetch;
 setTileSources(async()=>({assembly:{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher,capacity:64}),variables:v,variablesSha256:sha(v),qso:qb,qsoSha256:sha(qb),glimages:g},glx:pub('/original/catalogs/CLEA_GLX.DAT'),qso:{bytes:qb,sha256:sha(qb)},glimages:g}));
}
const STAR={ra:11.74525,dec:55.37861111};
beforeAll(()=>{vi.stubGlobal('crypto',webcrypto);setMultiSpecResources(resources);tiles();});
afterAll(()=>{setMultiSpecResources(null);setTileSources(null);vi.unstubAllGlobals();});

describe('Front G G4b: Multi-Spec at any pointing',()=>{
 it('a certified pointing keeps its bundled pack; any other pointing asks for an assembled field',()=>{
  const coma=engineTargets.targets.find(t=>t.id==='NGC 4889')!;
  expect(anyMultiSpecField(coma.pointing,1).pack).toBe(observatoryMultiSpecField(coma.pointing,1)!.pack);
  expect(anyMultiSpecField(STAR,2)).toEqual({pack:'gsc-tiles',pointing:STAR,telescope:2});
 });
 it('at an Object X row pointing the assembled view equals the bundled row pack’s view (same options)',async()=>{
  const p=(await loadMultiSpecInputs(resources)).objectX.rowPointings.get(10)!;
  for(const telescope of [0,2] as const){
   const want=await multiSpecView({pack:'objectx-row-10',pointing:p,telescope}),got=await multiSpecView({pack:'gsc-tiles',pointing:p,telescope});
   expect(got.fieldRead).toBeUndefined();expect(got.reasons).toEqual(want.reasons);
   expect(JSON.stringify(got.population)).toBe(JSON.stringify(want.population));
   expect(sha(got.viewport!.rgb as Uint8Array)).toBe(sha(want.viewport!.rgb as Uint8Array));
  }
 });
 it('at another pointing: the view is ready and a star fibre and a sky fibre give spectra',async()=>{
  const field={pack:'gsc-tiles' as const,pointing:STAR,telescope:2 as const},v=await multiSpecView(field);
  expect([v.fieldRead,v.reasons,v.viewport?.width]).toEqual([undefined,[],312]);
  const f={population:v.population!,scene:v.scene!},star=multiSpecPick(f,468,468),sky=multiSpecPick(f,40,40);
  expect([star.type,sky.type]).toEqual([0,4]);
  const e=await multiSpecSpectra(field,[{selection:star,seed:1,seconds:30},{selection:sky,seed:2,seconds:30}]);
  expect(e.map(x=>x.status)).toEqual(['ready','ready']);expect(structuredClone(e)).toEqual(e);
 });
 it('typed field reads: the polar web limit; a tile failure is retryable and not cached',async()=>{
  const polar=await multiSpecView({pack:'gsc-tiles',pointing:{ra:3,dec:89.99},telescope:0});
  expect([polar.fieldRead,polar.population]).toEqual([{reason:'field-polar'},null]);
  failTiles=true;tiles();
  const p={ra:20.5,dec:-30.25},failed=await multiSpecView({pack:'gsc-tiles',pointing:p,telescope:0});
  expect(failed.fieldRead?.reason).toBe('field-tiles');
  failTiles=false;tiles();const before=tileFetches;
  const ok=await multiSpecView({pack:'gsc-tiles',pointing:p,telescope:0});
  expect(ok.fieldRead).toBeUndefined();expect(tileFetches).toBeGreaterThan(before);
 });
});
