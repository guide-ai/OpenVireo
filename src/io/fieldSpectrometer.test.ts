import {fieldSpectrumBytes,fieldSpectrumHeaderName} from '../core/exposureSpectrum';
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
import {fieldSpectrometerSkyReading,spectrometerIdText,spectrometerMagText,spectrometerPrintLines} from '../core/currentObject';
import {currentObjectAt} from './currentObjectAt';
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
 it('Front R4d review 1 M1: a star outside the slit is VIREO\'s sky reading, although the current object names it',async()=>{
  // 0.001 h east of N0000.DAT@63282 (beyond 0x50f338's 0.00028 h): the engine reports slit-empty for that same star.
  const at={ra:2.5135473,dec:0.25592},r=await prepareFieldSpectrum(at,0);
  expect(r.status).toBe('ready');if(r.status!=='ready')return;
  expect(r.result.starTarget?.id).toBe('N0000.DAT@63282');expect(r.result.reasons).toEqual(['slit-empty']);expect(fieldSpectrometerSkyReading(r.result)).toBe(true);
  const object=await currentObjectAt(at),on={showObjectId:true,showObjectMag:true,editMode:false};
  expect(object).toMatchObject({status:'object',name:'N0000-01634'});
  expect(spectrometerIdText(on,true,object,'HIDDEN')).toBe('Sky');expect(spectrometerMagText(on,true,object)).toBe('');
  expect(spectrometerPrintLines(on,true,object)).toEqual(['Reading Sky']);
  const exact=await prepareFieldSpectrum({ra:2.5125473,dec:0.25592},0);expect(exact.status==='ready'&&fieldSpectrometerSkyReading(exact.result)).toBe(false);
 });
 it('Front RE6 (U6): the field header names a GSC star as VIREO does (<band>-<name>), not the record locator',async()=>{
  const r=await prepareFieldSpectrum({ra:2.5125473,dec:0.25592},0);expect(r.status).toBe('ready');if(r.status!=='ready')return;
  expect(r.result.starTarget?.id).toBe('N0000.DAT@63282');expect(fieldSpectrumHeaderName(r.result)).toBe('N0000-01634');
 });
 it('Front C7: M31\'s field equals the same field without NGC 224, whole raster and galaxy layer; M31 alone gives no overlay',async()=>{
  const {evaluateFieldView}=await import('../core/fieldEngine'),{cameraOverlaySource}=await import('../core/cameraOverlaySource');
  const glx=pub('/original/catalogs/CLEA_GLX.DAT'),at={ra:0.7123,dec:41.2692},pack=await assembleFieldPack(at,(await tileSources()).assembly);
  const v=evaluateFieldView(pack,glx,at,0,{galaxyLayer:true});
  expect(v.reasons).toEqual([]);expect(v.m31Notice).toBe(true);expect(v.population!.galaxies.map(g=>g.id)).toEqual(['NGC 224']);
  // The same field with record 897 renamed and given a 0-px minor axis: an ordinary galaxy that composes nothing (Front L4).
  const other=glx.slice(),r=897*59,name=other.subarray(r+40,r+40+other[r+39]),k=name.lastIndexOf(0x34);name[k]=0x35;
  new DataView(other.buffer,r+20,4).setFloat32(0,0.001,true);
  const w=evaluateFieldView(pack,other,at,0,{galaxyLayer:true});
  expect(w.reasons).toEqual([]);expect(w.m31Notice).toBeUndefined();expect(w.population!.galaxies.map(g=>g.id)).toEqual(['NGC 225']);
  expect(Buffer.from(v.raster!.rgb).equals(Buffer.from(w.raster!.rgb))).toBe(true);
  expect(Buffer.from(v.galaxyRed!).equals(Buffer.from(w.galaxyRed!))).toBe(true);
  const overlay=cameraOverlaySource({anchor:at,galaxyIds:['NGC 224'],galaxyRed:v.galaxyRed!,unpaintedGalaxies:0},at,15,15);
  expect(overlay.status).toBe('off');
 });
 it('Front C7: M31 with M32 paints only M32, whose layer gives a ready overlay',async()=>{
  const {evaluateFieldView}=await import('../core/fieldEngine'),{cameraOverlaySource}=await import('../core/cameraOverlaySource');
  const glx=pub('/original/catalogs/CLEA_GLX.DAT'),at={ra:0.712,dec:41.05},pack=await assembleFieldPack(at,(await tileSources()).assembly);
  const v=evaluateFieldView(pack,glx,at,0,{galaxyLayer:true}),ids=v.population!.galaxies.map(g=>g.id);
  expect(v.reasons).toEqual([]);expect(v.m31Notice).toBe(true);expect(ids).toContain('NGC 224');expect(ids).toContain('NGC 221');
  expect(v.galaxyRed!.some(x=>x>0)).toBe(true);
  const overlay=cameraOverlaySource({anchor:at,galaxyIds:ids,galaxyRed:v.galaxyRed!,unpaintedGalaxies:v.outsideViewGalaxies?.length??0},at,15,15);
  expect(overlay.status).toBe('ready');
 });
 it('Front C7 [I]: a slit on M31 where other paint lies under it takes the generic galaxy path (level 82, fraction 0.168)',async()=>{
  const r=await prepareFieldSpectrum({ra:0.6916107,dec:41.37777},0);expect(r.status).toBe('ready');if(r.status!=='ready')return;
  expect(r.result.m31Notice).toBe(true);expect(r.result.target?.id).toBe('NGC 224');expect(r.result.reasons).toEqual([]);
  expect(r.result.calibration?.pixelLevel).toBe(82);expect(r.result.calibration?.fraction).toBeCloseTo(0.1681,4);
  expect(r.result.calibration?.sourceFile).toBe('GLXYTMPL.SP');
 });
 it('R4e review 1 L1: a field blocked before the slit selection (M31, a Virgo photograph) reads Sky for a star outside the strict cut',async()=>{
  const on={showObjectId:true,showObjectMag:true,editMode:false};
  // M31's field: N3730.DAT@36659 (0.6819933 h, 40.96142°) is the current object; 0.001 h east it is outside 0x50f338's cut.
  for(const [at,reason,sky] of [[{ra:0.6819933+0.001,dec:40.96142},'m31',true],[{ra:0.6819933,dec:40.96142+0.0065},'m31',true],[{ra:0.6819933,dec:40.96142},'m31',false],
   // photographic-image: NGC 4476 + 0.08° names a GSC star outside the cut.
   [{ra:12.499611111111111,dec:12.348055555555556+0.08},'photographic-image',true]] as const){
   const r=await prepareFieldSpectrum(at,0);expect(r.status).toBe('ready');if(r.status!=='ready')continue;
   // Front C7: M31's field is built now; the engine's own slit selection decides, and agrees with the looked-up current object.
   if(reason==='m31'){expect(r.result.m31Notice).toBe(true);const object=await currentObjectAt(at);expect(fieldSpectrometerSkyReading(r.result),JSON.stringify(at)).toBe(sky);expect(fieldSpectrometerSkyReading(r.result,object),JSON.stringify(at)).toBe(sky);continue;}
   expect(r.result.reasons).toEqual([reason]);expect(r.result.selection).toBeNull();expect(fieldSpectrometerSkyReading(r.result)).toBe(false);
   const object=await currentObjectAt(at);expect(object.status,JSON.stringify(at)).toBe('object');
   expect(fieldSpectrometerSkyReading(r.result,object),JSON.stringify(at)).toBe(sky);
   if(sky)expect(spectrometerIdText(on,true,object,'HIDDEN')).toBe('Sky');
  }
  // A galaxy current object with no selection stays named [W]; a hidden object stays hidden.
  // Front C7: M31's field is no longer blocked, so the blocked Virgo photograph field carries this case.
  const g=await prepareFieldSpectrum({ra:12.499611111111111,dec:12.348055555555556+0.08},0);if(g.status!=='ready')throw new Error();expect(g.result.reasons).toEqual(['photographic-image']);
  expect(fieldSpectrometerSkyReading(g.result,{status:'object',name:'NGC 4476',kind:1,v:12.2,ra:12.499611111111111,dec:12.348055555555556})).toBe(false);
  expect(fieldSpectrometerSkyReading(g.result,{status:'hidden'})).toBe(false);
 });
 it('Front R4e: the sky flag comes from the slit star\'s throughput, also where the engine returns first (star-index-invalid)',async()=>{
  // N0730.DAT@570187 (index above JSPEC2.SPI): the engine stops at star-index-invalid before 0x50f338, so its reasons say nothing
  // about the slit. Off its position by more than 0.00028 h the star is still the slit object and still the current object.
  const own=await prepareFieldSpectrum({ra:16.18146,dec:11.73154},0);expect(own.status).toBe('ready');if(own.status!=='ready')return;
  expect(own.result.reasons).toEqual(['star-index-invalid']);expect(fieldSpectrometerSkyReading(own.result)).toBe(false);
  for(const d of [0.0005,0.001,0.003]){
   const at={ra:16.18146+d,dec:11.73154},r=await prepareFieldSpectrum(at,0);expect(r.status,`${d}`).toBe('ready');if(r.status!=='ready')continue;
   expect(r.result.starTarget?.id,`${d}`).toBe('N0730.DAT@570187');expect(r.result.reasons,`${d}`).toEqual(['star-index-invalid']);
   expect(fieldSpectrometerSkyReading(r.result),`${d}`).toBe(true);
   const object=await currentObjectAt(at);expect(object,`${d}`).toMatchObject({status:'object',name:'N0730-00812'});
   expect(spectrometerIdText({showObjectId:true,showObjectMag:true,editMode:false},true,object,'HIDDEN')).toBe('Sky');
  }
 });
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
  expect(policy).toBe('openvireo-field-spectrum-v1:11.74525,55.37861111:T2');expect(parseFieldSpectrumPolicy(policy)).toEqual({pointing:p,telescope:2,range:{minimum:3700,maximum:4700}});
  const vt={jd:2460614.8125,source:'observatory-clock' as const},timed=fieldSpectrumPolicy(p,2,vt);
  expect(timed).toBe('openvireo-field-spectrum-v1:11.74525,55.37861111:T2:JD2460614.8125');expect(parseFieldSpectrumPolicy(timed)).toEqual({pointing:p,telescope:2,variableTime:vt,range:{minimum:3700,maximum:4700}});
  // Front S2: a non-default range is the #R mark after the policy; the default keeps the bytes; a forged range is refused.
  const ranged=fieldSpectrumPolicy(p,2,vt,{minimum:4000,maximum:5000});expect(ranged).toBe(`${timed}#R4000-5000`);
  expect(parseFieldSpectrumPolicy(ranged)).toEqual({pointing:p,telescope:2,variableTime:vt,range:{minimum:4000,maximum:5000}});
  for(const bad of [`${timed}#R4000-4050`,`${timed}#R3700-4700`,`${policy}#R`])expect(parseFieldSpectrumPolicy(bad)).toBeNull();
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
  // M31's field (Front C7 [D]): the painter sends NGC 224 to 0x53b848, which paints nothing, so the field is built without it. The slit
  // still selects M31 (0x59a0fc), but the 0x53e338 level under it is 0, so the throughput 0x50f338 is 0: VIREO's sky reading.
  for(const t of [0,1,2] as const){const m31=await prepareFieldSpectrum({ra:0.7123,dec:41.2692},t);
   expect(m31.status).toBe('ready');if(m31.status!=='ready')continue;
   expect(m31.result.m31Notice).toBe(true);expect(m31.result.target?.id).toBe('NGC 224');expect(m31.result.reasons).toEqual(['slit-empty']);expect(fieldSpectrometerSkyReading(m31.result)).toBe(true);}
 });
 it('Front S2: off the default a star is observed on the range (#R policy, its grid, a replayable session); Front S3: a galaxy too',async()=>{
  const r={minimum:4000,maximum:5000},at={ra:11+44/60+42.9/3600,dec:55+22/60+43/3600};
  const star=await prepareFieldSpectrum(at,0,{range:r});expect(star.status).toBe('ready');if(star.status!=='ready')return;
  expect(star.result.starTarget).toBeTruthy();expect(star.policy.endsWith('#R4000-5000')).toBe(true);
  if(!star.result.reasons.length){
   expect(star.result.calibration!.wavelengths[0]).toBe(4000);
   const e=lssExposureEngine(star.result,star.policy),s=pauseJournal(tickJournal(startJournal(activateJournal(e.create(3))),1000));
   const back=await readFieldSpectrumSession(serializeFieldSpectrumSession(s));expect(back.prepared.policy).toBe(star.policy);expect(back.state.exposure.counts).toEqual(s.exposure.counts);
  }
  // Re-pinned 2026-10-31 (Front S3): a galaxy is observed on any dialog range (galaxyRangeAll witness), with a #R policy that replays.
  const coma=await prepareFieldSpectrum({ra:12.99311111111111,dec:27.959722222222222},2,{range:r});
  expect(coma.status).toBe('ready');if(coma.status!=='ready')return;expect(coma.policy.endsWith('#R4000-5000')).toBe(true);expect(coma.result.target).toBeTruthy();expect(coma.result.calibration!.wavelengths[0]).toBe(4000);
  {const e=lssExposureEngine(coma.result,coma.policy),s=pauseJournal(tickJournal(startJournal(activateJournal(e.create(3))),1000));const back=await readFieldSpectrumSession(serializeFieldSpectrumSession(s));expect(back.prepared.policy).toBe(coma.policy);expect(back.state.exposure.counts).toEqual(s.exposure.counts);}
  expect((await prepareFieldSpectrum({ra:12.99311111111111,dec:27.959722222222222},2)).status).toBe('ready');
 });
 it('review 1 M1/M2: a field star on ranges of every width saves its .SSP from its own grid; below 3510 Å it gives no counts',async()=>{
  const at={ra:11+44/60+42.9/3600,dec:55+22/60+43/3600};
  for(const r of [{minimum:3600,maximum:3700},{minimum:3700,maximum:5700},{minimum:3500,maximum:7400},{minimum:3500,maximum:3600},{minimum:6400,maximum:7400}]){
   const star=await prepareFieldSpectrum(at,0,{range:r});expect(star.status,`${r.minimum}`).toBe('ready');if(star.status!=='ready')continue;
   expect(star.result.reasons,`${r.minimum}–${r.maximum}`).toEqual([]);const c=star.result.calibration!;
   if(r.minimum===3500)expect(c.sourceValues.slice(0,Math.ceil((3510-3500)/((r.maximum-r.minimum)/600)))).toEqual(expect.arrayContaining([0]));
   const e=lssExposureEngine(star.result,star.policy),s=pauseJournal(tickJournal(startJournal(activateJournal(e.create(3))),1000));
   const lines=new TextDecoder().decode(fieldSpectrumBytes(s,star.result,at)).split('\r\n');
   expect(lines[1].split(' ')[0]).toBe(r.minimum.toFixed(2));expect(Number(lines[600].split(' ')[0])).toBeCloseTo(r.minimum+599*(r.maximum-r.minimum)/600,1);
  }
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
