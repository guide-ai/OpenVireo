import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import record from '../../data/hubble/engine-targets.json';
import witnesses from '../../data/hubble/qso-merge-witnesses.json';
import {decodeFieldPack,type FieldPack} from './fieldPack';
import {prepareHubbleEngineTarget} from './hubbleEnginePrepare';
import {HUBBLE_EXTENDED_TARGETS,hubbleExtendedTarget,HubbleEngineError} from './hubbleEngineTargets';
import {parseLibrarySpectrum} from './spectrum';
import {parseGlxyspNames} from './lssLists';
import {HUBBLE_HOT_LIST,hubbleRowStatus} from './hubbleHotList';
import {galaxyDefinition,createGalaxyExposure,verifiedGalaxyConfiguration,engineGalaxyRegistered} from './galaxyExposure';
import {galaxyTelescopeIndex,galaxyTargetTelescopeSupported} from './galaxyTelescope';
import {galaxyDistanceReference} from './galaxyIdentity';
import {ensureHubbleEngineTargets,setHubbleEngineResources} from '../io/hubbleEngineTargets';
const sha=(v:string|NodeJS.ArrayBufferView)=>createHash('sha256').update(v).digest('hex');
const file=(p:string)=>readFileSync(new URL('../../'+p,import.meta.url));
const glx=new Uint8Array(file('public/original/catalogs/CLEA_GLX.DAT')),qb=new Uint8Array(file('public/original/catalogs/CLEA_QSO.DAT')),qsoCatalog={bytes:qb,sha256:sha(qb)};
const spectra=new Map([['NGC4889.SP',parseLibrarySpectrum(file('public/original/spectra/NGC4889.SP').toString('latin1'))]]);
const packs=new Map<string,FieldPack>(Object.entries(record.packs).map(([id,p])=>[id,decodeFieldPack(JSON.parse(file(p.file).toString()))]));
const COMA=['NGC 4874','NGC 4889'];
vi.setConfig({testTimeout:120000});// each field paints ~100 galaxies on a 936² raster
describe('Front F M3/M4: Coma – 1 and Coma – 2 through the general field engine with the QSO merge',()=>{
 it('the derived Coma pack is hash-recorded and every read is byte-equal to (or the position prefix of) a published LSS read',()=>{
  for(const p of Object.values(record.packs))expect(sha(file(p.file))).toBe(p.sha256);
  const lss=new Map<string,string[]>();for(let f=1;f<=9;f++)for(const b of JSON.parse(file(`data/lss/lss-field-0${f}.json`).toString()).bands)for(const [i,h] of b.reads)lss.set(`${b.name}@${i}`,[...(lss.get(`${b.name}@${i}`)??[]),h]);
  const coma=packs.get('hubble-engine-coma')!;
  for(const b of coma.bands)for(const [i,h] of b.reads){const got=lss.get(`${b.name}@${i}`)??[];expect(got.some(g=>g===h||g.startsWith(h))).toBe(true);}
  expect(coma.pointings).toEqual(COMA.map(id=>record.targets.find(t=>t.id===id)!.pointing));
 });
 it('prepares each recorded telescope; the 0.9 m is the existing mean bound; crops and integers are the recorded ones',()=>{
  for(const id of COMA){
   const p=prepareHubbleEngineTarget(id,{packs,glx,qsoCatalog,librarySpectra:spectra}),rec=record.targets.find(t=>t.id===id)!;
   expect(p.entries.map(e=>e.definition.domain.telescopeRecord)).toEqual([0,2]);
   expect(rec.telescopes.find(t=>t.telescope===1)).toMatchObject({status:'unavailable',reasons:['mean-bound']});
   for(const e of p.entries){const r=rec.telescopes.find(t=>t.telescope===e.definition.domain.telescopeRecord)! as {cropSHA256:string;qsoOperations:unknown};expect(sha(e.configuration.viewport.rgb)).toBe(r.cropSHA256);}
   // The independent Python witness of the same pointing: QSO operations and final star count.
   const w=witnesses.pointings.find(w=>w.pointing.ra===rec.pointing.ra&&w.pointing.dec===rec.pointing.dec)!;
   expect((rec.telescopes[0] as {qsoOperations:unknown[]}).qsoOperations).toEqual(w.qsoOperations);expect(p.entries[0].configuration.field.stars).toHaveLength(w.finalStars!);
   expect(p.entries[0].configuration.field.galaxies.map(g=>g.recordIndex)).toEqual(w.galaxies);
   expect(HUBBLE_HOT_LIST[rec.htlRow]).toMatchObject({id,recordSha256:rec.htlRecordSHA256,catalogIndex:rec.glxIndex});
   expect([0,1,2].map(i=>hubbleRowStatus(HUBBLE_HOT_LIST[rec.htlRow],i))).toEqual(['available','telescope','available']);
   expect([0,1,2].map(i=>galaxyTargetTelescopeSupported(id,i))).toEqual([true,false,true]);
  }
 });
 it('NGC 4889 uses its own NGC4889.SP (GLXYSP.LST Pos lookup, matched factor 1); NGC 4874 keeps GLXYTMPL.SP',()=>{
  const list=[...parseGlxyspNames(new Uint8Array(file('public/original/spectra/GLXYSP.LST')))];
  const lookup=(id:string)=>list.find(line=>line.includes(id.replace(/\(.*$/,'').replace(/ /g,'')))??null;
  expect(lookup('NGC 4889')).toBe('NGC4889.SP');expect(lookup('NGC 4874')).toBeNull();
  const own=record.targets.find(t=>t.id==='NGC 4889')!.librarySpectrum!;expect(own).toMatchObject({file:'NGC4889.SP',sha256:sha(file('public/original/spectra/NGC4889.SP'))});
  const p=prepareHubbleEngineTarget('NGC 4889',{packs,glx,qsoCatalog,librarySpectra:spectra});expect(p.entries.every(e=>e.definition.sourceFile==='NGC4889.SP'&&e.definition.sourceSnapshotSHA256===own.sha256)).toBe(true);
  expect(prepareHubbleEngineTarget('NGC 4874',{packs,glx,qsoCatalog,librarySpectra:spectra}).entries.every(e=>e.definition.sourceFile==='GLXYTMPL.SP')).toBe(true);
  expect(()=>prepareHubbleEngineTarget('NGC 4889',{packs,glx,qsoCatalog,librarySpectra:new Map()})).toThrow(HubbleEngineError);
 });
 it('workbook V references and the extended table',()=>{
  expect(galaxyDistanceReference('NGC 4874')).toMatchObject({apparentV:12.9,source:'Hubble Data.xls · Sheet1!C5'});expect(galaxyDistanceReference('NGC 4889')).toMatchObject({apparentV:12.5,source:'Hubble Data.xls · Sheet1!C6'});
  expect(HUBBLE_EXTENDED_TARGETS.filter(t=>t.route==='engine').map(t=>[t.id,t.telescopes])).toEqual([['NGC 4874',[0,2]],['NGC 4889',[0,2]]]);
  expect(hubbleExtendedTarget('NGC 4874')!.policies).toEqual({0:'openvireo-engine-galaxy-NGC4874-r0-v1',2:'openvireo-engine-galaxy-NGC4874-r2-v1'});
 });
});
describe('asynchronous registration (io/hubbleEngineTargets.ts)',()=>{
 beforeAll(()=>vi.stubGlobal('crypto',webcrypto));afterAll(()=>{vi.unstubAllGlobals();setHubbleEngineResources(null);});
 it('nothing is usable before registration; a mismatching catalogue is rejected and a later attempt succeeds',async()=>{
  expect(engineGalaxyRegistered('NGC 4874',0)).toBe(false);expect(()=>galaxyDefinition('NGC 4874',0)).toThrow();expect(()=>verifiedGalaxyConfiguration('NGC 4874',0)).toThrow();
  setHubbleEngineResources({glx:async()=>glx,qso:async()=>({bytes:qb,sha256:'0'.repeat(64)}),spectrum:async f=>spectra.get(f)!});
  await expect(ensureHubbleEngineTargets()).rejects.toThrow();expect(engineGalaxyRegistered('NGC 4874',0)).toBe(false);
  setHubbleEngineResources({glx:async()=>glx,qso:async()=>qsoCatalog,spectrum:async f=>spectra.get(f)!});
  await ensureHubbleEngineTargets();
  for(const id of COMA)for(const i of [0,2] as const){expect(engineGalaxyRegistered(id,i)).toBe(true);expect(galaxyTelescopeIndex(createGalaxyExposure(1,id,i))).toBe(i);}
  expect(()=>galaxyDefinition('NGC 4874',1)).toThrow();
 },60000);
});
