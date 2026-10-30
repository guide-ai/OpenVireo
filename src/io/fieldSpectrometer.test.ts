import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {prepareFieldSpectrum,readFieldSpectrumSession,serializeFieldSpectrumSession,setFieldSpectrometerFiles,spectrometerInputs} from './fieldSpectrometer';
import {setTileSources,tileSources} from './tileAssembly';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {assembleFieldPack} from './assembledFieldPack';
import {loadObjectXSpectrometerInputs} from './objectXSpectrometerInputs';
import {OBJECT_X_SPECTRUM_ROWS,objectXField,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import {spectrometerFieldResult,parseFieldSpectrumPolicy,fieldSpectrumPolicy,fieldSpectrumCalibration,fieldSpectrumCsv} from '../core/fieldSpectrometer';
import {lssExposureEngine} from '../core/lssExposure';
import {activateJournal,pauseJournal,startJournal,tickJournal} from '../core/exposureJournal';
import type {FieldTelescope} from '../core/fieldEngine';
vi.setConfig({testTimeout:300000});
/** A minimal RFC 4180 reader (quoted fields, doubled quotes, CRLF rows). */
function parseCsv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],f='',q=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(q){if(c==='"'&&text[i+1]==='"'){f+='"';i++;}else if(c==='"')q=false;else f+=c;continue;}
  if(c==='"')q=true;else if(c===',' ){row.push(f);f='';}else if(c==='\r'&&text[i+1]==='\n'){row.push(f);rows.push(row);row=[];f='';i++;}else f+=c;}
 return rows;
}

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
    // Review 1 L5: everything the exposure and the CSV read (source and sky means, continuation) and the wavelengths.
    expect(fieldSpectrumCalibration(got)).toEqual(fieldSpectrumCalibration(want));
    expect(got.calibration?.wavelengths??null).toEqual(want.calibration?.wavelengths??null);
    expect([got.target?.id,got.starTarget?.id,got.qsoTarget?.id]).toEqual([want.target?.id,want.starTarget?.id,want.qsoTarget?.id]);
    compared++;if(!want.reasons.length)available++;
   }
  }
  expect(compared).toBe(OBJECT_X_SPECTRUM_ROWS.length*3);expect(available).toBeGreaterThan(10);
 });
 it('policy codec: exact pointing, telescope and frozen JD round trip',()=>{
  const p={ra:11.74525,dec:55.37861111},policy=fieldSpectrumPolicy(p,2);
  expect(policy).toBe('openvireo-field-spectrum-v1:11.74525,55.37861111:T2');expect(parseFieldSpectrumPolicy(policy)).toEqual({pointing:p,telescope:2});
  const vt={jd:2460614.8125,source:'observatory-clock' as const},timed=fieldSpectrumPolicy(p,2,vt);
  expect(timed).toBe('openvireo-field-spectrum-v1:11.74525,55.37861111:T2:JD2460614.8125');expect(parseFieldSpectrumPolicy(timed)).toEqual({pointing:p,telescope:2,variableTime:vt});
  for(const bad of ['openvireo-field-spectrum-v1:11.745250,55:T2','openvireo-field-spectrum-v1:24,0:T0','openvireo-field-spectrum-v1:1,0:T3',3,
   'openvireo-field-spectrum-v1:1,0:T0:JD2460614.81250','openvireo-field-spectrum-v1:1,0:T0:JD1','openvireo-field-spectrum-v1:1,0:T0:JDNaN','openvireo-field-spectrum-v1:1,0:T0:JD'])expect(parseFieldSpectrumPolicy(bad)).toBeNull();
 });
 it('review 1 M1: a field with a time-dependent variable needs the frozen observatory time, which then evaluates it',async()=>{
  const p={ra:19.86185,dec:16.8324},without=await prepareFieldSpectrum(p,0);
  expect(without.status).toBe('ready');if(without.status!=='ready')return;
  expect(without.result.reasons).toContain('variable-time-required');
  const vt={jd:2460614.8125,source:'observatory-clock' as const},timed=await prepareFieldSpectrum(p,0,{variableTime:vt});
  expect(timed.status).toBe('ready');if(timed.status!=='ready')return;
  expect(timed.result.reasons).not.toContain('variable-time-required');expect(timed.policy.endsWith(':JD2460614.8125')).toBe(true);
 });
 it('closure N1: the naked-eye repro stars get their template (exact x87 bucket), never an exception',async()=>{
  for(const [p,id] of [[{ra:2.5125473,dec:0.25592},'N0000.DAT@63282'],[{ra:3.2073193,dec:6.66083},'N0000.DAT@83847']] as const){
   const r=await prepareFieldSpectrum(p,0);expect(r.status,id).toBe('ready');if(r.status!=='ready')continue;
   expect(r.result.starTarget?.id,id).toBe(id);expect(r.result.reasons,id).not.toContain('star-index-invalid');
   expect(r.result.calibration?.sourceFile??r.result.reasons.join(),id).toMatch(/^A\d{7}\.SP$|slit-empty|mean-bound/);
  }
  // An index above JSPEC2.SPI's last row: 0x50d660 is nil, so VIREO's "Spectrum Index is Invalid!" (typed, nothing recorded).
  const tail=await prepareFieldSpectrum({ra:16.18146,dec:11.73154},0);expect(tail.status).toBe('ready');
  if(tail.status==='ready'){expect(tail.result.starTarget?.id).toBe('N0730.DAT@570187');expect(tail.result.reasons).toEqual(['star-index-invalid']);expect(tail.result.calibration??null).toBeNull();}
 });
 it('review 1 L5: every JSPEC2.SPI template is in the inputs; a context missing one is an input error, never another template',async()=>{
  const inputs=await spectrometerInputs();
  expect(new Set(inputs.starIndex.map(e=>e.file.toUpperCase()))).toEqual(new Set(inputs.starTemplates.keys()));
  const p={ra:11+44/60+42.9/3600,dec:55+22/60+43/3600},prepared=await prepareFieldSpectrum(p,0);
  expect(prepared.status==='ready'&&prepared.result.starTarget).toBeTruthy();if(prepared.status!=='ready')return;
  const s=await tileSources(),pack=await assembleFieldPack(p,s.assembly);
  expect(()=>spectrometerFieldResult({...inputs,starTemplates:new Map()},pack,p,0)).toThrow(/star template .* missing/);
 });
 it('at another pointing: a star (bundled template or typed), M31 typed, Object X masked; a session replays after re-preparing',async()=>{
  // N5230-00946 (11 h 44 m 42.9 s, +55° 22′ 43″), far from every Object X position: a field the student can point at freely.
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
  // Review 1 M2: the counts CSV is well formed (RFC 4180): the policy, which contains commas, is one quoted field.
  const csv=fieldSpectrumCsv(s,ready.result.calibration!.wavelengths),rows=parseCsv(csv);
  expect(csv.endsWith('\r\n')).toBe(true);expect(rows[0]).toHaveLength(7);expect(rows.length).toBe(s.exposure.counts.length+1);
  for(const r of rows.slice(1)){expect(r).toHaveLength(7);expect(r[0]).toBe(ready.policy);}
  expect(rows.slice(1).map(r=>Number(r[3]))).toEqual(s.exposure.counts);
 });
});
