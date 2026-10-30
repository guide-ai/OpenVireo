import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {prepareFieldSpectrum,readFieldSpectrumSession,serializeFieldSpectrumSession,setFieldSpectrometerFiles,spectrometerInputs} from './fieldSpectrometer';
import {setTileSources} from './tileAssembly';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {assembleFieldPack} from './assembledFieldPack';
import {loadObjectXSpectrometerInputs} from './objectXSpectrometerInputs';
import {OBJECT_X_SPECTRUM_ROWS,objectXField,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import {spectrometerFieldResult,parseFieldSpectrumPolicy,fieldSpectrumPolicy} from '../core/fieldSpectrometer';
import {lssExposureEngine} from '../core/lssExposure';
import {activateJournal,pauseJournal,startJournal,tickJournal} from '../core/exposureJournal';
import type {FieldTelescope} from '../core/fieldEngine';
vi.setConfig({testTimeout:300000});

// Front G G4a (analysis/front-plans/front-g-gsc.md §11): the single-slit spectrometer at any pointing, from the compact GSC tiles.
const pub=(p:string)=>new Uint8Array(readFileSync('public'+p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const realFetch=globalThis.fetch;
let xInputs:ObjectXSpectrometerInputs;
beforeAll(async()=>{
 vi.stubGlobal('crypto',webcrypto);
 // Same-origin files from disk (the Object X mask reads ObjectX.HTL through fetch).
 globalThis.fetch=(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch;
 setFieldSpectrometerFiles(async p=>pub(p));
 setTileSources(async()=>{const v=pub('/original/variables/CLEA_VStrs.dat'),q=pub('/original/catalogs/CLEA_QSO.DAT'),g=pub('/original/images/GLIMAGES.LST');
  return {assembly:{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch,capacity:64}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:g},glx:pub('/original/catalogs/CLEA_GLX.DAT'),qso:{bytes:q,sha256:sha(q)},glimages:g};});
 const qb=pub('/original/catalogs/CLEA_QSO.DAT');
 xInputs=await loadObjectXSpectrometerInputs({glx:async()=>pub('/original/catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>pub(p),objectXHotList:async()=>pub('/original/hotlists/ObjectX.HTL')});
});
afterAll(()=>{globalThis.fetch=realFetch;setTileSources(null);setFieldSpectrometerFiles(null);vi.unstubAllGlobals();});

describe('the generic spectrometer',()=>{
 it('equals the Object X spectrometer at every Object X spectroscopy row and telescope (tiled pack vs bundled pack)',async()=>{
  const inputs=await spectrometerInputs(),s={index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch,capacity:64})};
  const v=pub('/original/variables/CLEA_VStrs.dat'),q=pub('/original/catalogs/CLEA_QSO.DAT'),g=pub('/original/images/GLIMAGES.LST');
  let compared=0,available=0;
  for(const row of OBJECT_X_SPECTRUM_ROWS){
   const pointing=xInputs.rowPointings.get(row.row)!,pack=await assembleFieldPack(pointing,{...s,variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:g});
   for(const telescope of [0,1,2] as FieldTelescope[]){
    const want=objectXField(xInputs,pointing,telescope)!.result,got=spectrometerFieldResult(inputs,pack,pointing,telescope);
    expect(got.reasons,`row ${row.row} T${telescope}`).toEqual(want.reasons);
    expect(got.calibration?.sourceMeans??null).toEqual(want.calibration?.sourceMeans??null);
    expect([got.target?.id,got.starTarget?.id,got.qsoTarget?.id]).toEqual([want.target?.id,want.starTarget?.id,want.qsoTarget?.id]);
    compared++;if(!want.reasons.length)available++;
   }
  }
  expect(compared).toBe(OBJECT_X_SPECTRUM_ROWS.length*3);expect(available).toBeGreaterThan(10);
 });
 it('policy codec: exact pointing and telescope round trip',()=>{
  const p={ra:11.74525,dec:55.37861111},policy=fieldSpectrumPolicy(p,2);
  expect(policy).toBe('openvireo-field-spectrum-v1:11.74525,55.37861111:T2');expect(parseFieldSpectrumPolicy(policy)).toEqual({pointing:p,telescope:2});
  for(const bad of ['openvireo-field-spectrum-v1:11.745250,55:T2','openvireo-field-spectrum-v1:24,0:T0','openvireo-field-spectrum-v1:1,0:T3',3])expect(parseFieldSpectrumPolicy(bad)).toBeNull();
 });
 it('at another pointing: a star (bundled template or typed), M31 typed, Object X masked; a session replays after re-preparing',async()=>{
  // NGC 4486 (M87) region, far from every Object X position: a field the student can point at freely.
  const star=await prepareFieldSpectrum({ra:11+44/60+42.9/3600,dec:55+22/60+43/3600},0);
  expect(star.status).toBe('ready');
  if(star.status==='ready'){
   expect(star.result.starTarget?.id??star.result.target?.id).toBeTruthy();
   expect(star.result.reasons.every(r=>r!=='star-selected'||!star.result.starTarget)).toBe(true);
  }
  // Object X positions stay masked here as in Field Information.
  expect((await prepareFieldSpectrum(xInputs.rowPointings.get(OBJECT_X_SPECTRUM_ROWS[0].row)!,0)).status).toBe('unavailable');
  // A galaxy at the centre of M31's field (its catalogue galaxy is selected; whatever the engine says is typed, never a guess).
  const m31=await prepareFieldSpectrum({ra:0.7123,dec:41.2692},2);
  expect(m31.status).toBe('ready');if(m31.status==='ready')expect(m31.result.target?.id??m31.result.reasons.join()).toBeTruthy();
 });
 it('a session file replays only after the field is prepared again at its policy pointing',async()=>{
  // Search a few pointings for an available spectrum (a galaxy or a star with a bundled template).
  let ready:Awaited<ReturnType<typeof prepareFieldSpectrum>>|null=null;
  // NGC 4874 (Coma – 1), the Hubble engine target's exact pointing: available on the 4 m in the existing route.
  for(const p of [{ra:12.99311111111111,dec:27.959722222222222}]){const r=await prepareFieldSpectrum(p,2);if(r.status==='ready'&&!r.result.reasons.length){ready=r;break;}}
  expect(ready?.status).toBe('ready');if(ready?.status!=='ready')return;
  const e=lssExposureEngine(ready.result,ready.policy),s=pauseJournal(tickJournal(startJournal(activateJournal(e.create(7))),1000));
  const text=serializeFieldSpectrumSession(s),back=await readFieldSpectrumSession(text);
  expect(back.state.exposure.counts).toEqual(s.exposure.counts);expect(back.prepared.policy).toBe(ready.policy);
  await expect(readFieldSpectrumSession(text.replace(ready.policy,ready.policy.replace(':T2',':T7')))).rejects.toThrow();
 });
});
