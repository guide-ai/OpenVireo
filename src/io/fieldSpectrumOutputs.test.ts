import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {prepareFieldSpectrum,setFieldSpectrometerFiles,spectrometerInputs} from './fieldSpectrometer';
import {AnalysisSessionError,readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {setTileSources} from './tileAssembly';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {assembleFieldPack} from './assembledFieldPack';
import {loadObjectXSpectrometerInputs} from './objectXSpectrometerInputs';
import {OBJECT_X_SPECTRUM_ROWS,evaluateObjectXSpectrum,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import {spectrometerFieldResult} from '../core/fieldSpectrometer';
import {lssExposureEngine} from '../core/lssExposure';
import {activateJournal,pauseJournal,startJournal,tickJournal} from '../core/exposureJournal';
import {fieldSpectrumBytes,fieldSpectrumFileName,objectXSpectrumBytes} from '../core/exposureSpectrum';
import type {FieldTelescope} from '../core/fieldEngine';
vi.setConfig({testTimeout:300000});

// Front G G4a (analysis/front-plans/front-g-gsc.md §11): the single-slit spectrometer at any pointing, from the compact GSC tiles.
const pub=(p:string)=>new Uint8Array(readFileSync('public'+p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const realFetch=globalThis.fetch;
let xInputs:ObjectXSpectrometerInputs;
let sources:Parameters<typeof setTileSources>[0]=null;
beforeAll(async()=>{
 vi.stubGlobal('crypto',webcrypto);
 // Same-origin files from disk (the Object X mask reads ObjectX.HTL through fetch).
 globalThis.fetch=(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch;
 setFieldSpectrometerFiles(async p=>pub(p));
 setTileSources(sources=async()=>{const v=pub('/original/variables/CLEA_VStrs.dat'),q=pub('/original/catalogs/CLEA_QSO.DAT'),g=pub('/original/images/GLIMAGES.LST');
  return {assembly:{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch,capacity:64}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:g},glx:pub('/original/catalogs/CLEA_GLX.DAT'),qso:{bytes:q,sha256:sha(q)},glimages:g};});
 const qb=pub('/original/catalogs/CLEA_QSO.DAT');
 xInputs=await loadObjectXSpectrometerInputs({glx:async()=>pub('/original/catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>pub(p),objectXHotList:async()=>pub('/original/hotlists/ObjectX.HTL')});
});
afterAll(()=>{globalThis.fetch=realFetch;setTileSources(null);setFieldSpectrometerFiles(null);vi.unstubAllGlobals();});

describe('field spectrometer Save .SSP (G4c)',()=>{
 it('writes the recovered SSP; at every Object X row it equals the Object X save after the reveal, for galaxies, stars and QSOs',async()=>{
  const inputs=await spectrometerInputs(),s={index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch,capacity:64})};
  const v=pub('/original/variables/CLEA_VStrs.dat'),q=pub('/original/catalogs/CLEA_QSO.DAT'),g=pub('/original/images/GLIMAGES.LST');
  const kinds=new Set<string>();
  for(const row of OBJECT_X_SPECTRUM_ROWS){
   const pointing=xInputs.rowPointings.get(row.row)!,pack=await assembleFieldPack(pointing,{...s,variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:g});
   for(const telescope of [0,1,2] as FieldTelescope[]){
    const r=spectrometerFieldResult(inputs,pack,pointing,telescope);if(r.reasons.length||!r.calibration)continue;
    const o=r.qsoTarget??r.starTarget??r.target!;kinds.add(r.qsoTarget?'qso':r.starTarget?'star':'galaxy');
    const e=lssExposureEngine(r,'p'),st=pauseJournal(tickJournal(tickJournal(startJournal(activateJournal(e.create(11))),1000),1000));
    const bytes=fieldSpectrumBytes(st,r,pointing),text=new TextDecoder().decode(bytes),lines=text.split('\r\n');
    expect(lines[0],o.id).toContain(o.id.slice(0,24));
    // G4c review 1 L4: the witness is the Object X route's own reveal (revealObjectXSpectrum's recordId/headerMagnitude) and
    // its display wavelengths, not the generic result's target.
    const x=evaluateObjectXSpectrum(xInputs,pointing,telescope);
    expect(x.display.status,`${row.row}/${telescope}`).toBe('available');
    if(x.display.status!=='available')continue;
    expect([x.reveal.recordId,x.reveal.headerMagnitude]).toEqual([o.id,o.magnitude]);
    expect(bytes).toEqual(objectXSpectrumBytes(st,'unused',pointing,x.display.wavelengths[0],{object:x.reveal.recordId!,magnitude:x.reveal.headerMagnitude!}));
    expect(()=>fieldSpectrumBytes(e.start(e.activate(e.create(1))),r,pointing)).toThrow();
   }
  }
  expect([...kinds].sort()).toEqual(['galaxy','qso','star']);
 });
 it('names the file so that the file-name ID keeps the whole locator',()=>{
  expect(fieldSpectrumFileName('N0000.DAT@63282')).toBe('field-N0000-DAT-63282.ssp');
  expect(fieldSpectrumFileName('NGC 4874')).toBe('field-NGC-4874.ssp');
  expect(fieldSpectrumFileName('a_b')).not.toContain('_');
 });
});

const empty:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
const read=(text:string)=>readAnalysisSession(new File([text],'investigation.json'));
describe('field spectrometer in the investigation (session v33, G4c)',()=>{
 it('round trips byte-identically, re-assembling the field; a session without it keeps its older version and bytes',async()=>{
  const ready=await prepareFieldSpectrum({ra:12.99311111111111,dec:27.959722222222222},2,{variableTime:{jd:2451546.25,source:'observatory-clock'}});
  expect(ready.status).toBe('ready');if(ready.status!=='ready')return;
  const e=lssExposureEngine(ready.result,ready.policy),state=pauseJournal(tickJournal(tickJournal(startJournal(activateJournal(e.create(5))),1000),700));
  const before=await serializeAnalysisSession(empty);
  const text=await serializeAnalysisSession({...empty,fieldSpectrum:{prepared:ready,state}}),v=JSON.parse(text);
  expect(v.version).toBe(33);expect(v.fieldSpectrumPolicy).toBe('openvireo-field-spectrum-investigation-v33');
  expect(JSON.stringify(v.base,null,2)+'\n').toBe(before);expect(v.fieldSpectrum.policy).toBe(ready.policy);
  const back=await read(text);
  expect(back.fieldSpectrum!.state.exposure.counts).toEqual(state.exposure.counts);expect(back.fieldSpectrum!.prepared.policy).toBe(ready.policy);
  expect(await serializeAnalysisSession(back)).toBe(text);
  expect(await serializeAnalysisSession({...back,fieldSpectrum:undefined})).toBe(before);
  // Edited, nested or misplaced parts are rejected whole.
  const edit=(f:(x:typeof v)=>void)=>{const c=JSON.parse(text);f(c);return JSON.stringify(c);};
  for(const bad of [edit(x=>{x.fieldSpectrum.events.push({kind:'start'});}),edit(x=>{x.fieldSpectrum.seedAtReset=6;}),edit(x=>{x.fieldSpectrumPolicy='x';}),edit(x=>{x.fieldSpectrumDigestSHA256='0'.repeat(64);}),edit(x=>{x.base={...x};}),edit(x=>{x.fieldSpectrum.policy=x.fieldSpectrum.policy.replace(':T2',':T1');})])
   await expect(read(bad)).rejects.toBeInstanceOf(AnalysisSessionError);
 });
 it('an Object X position masks the field on restore; tiles that do not arrive are a resource failure',async()=>{
  const ready=await prepareFieldSpectrum({ra:12.99311111111111,dec:27.959722222222222},2);if(ready.status!=='ready')throw Error();
  const e=lssExposureEngine(ready.result,ready.policy),state=pauseJournal(tickJournal(startJournal(activateJournal(e.create(5))),500));
  const text=await serializeAnalysisSession({...empty,fieldSpectrum:{prepared:ready,state}});
  // 3C 273 (an ObjectX.HTL QSO): a part pointed there is refused, never replayed.
  const masked=text.replace(String(ready.pointing.ra),'12.485194444444444').replace(String(ready.pointing.dec),'2.0522222222222224');
  await expect(read(masked)).rejects.toMatchObject({code:'state'});
  setTileSources(async()=>{throw new TypeError('Failed to fetch');});
  try{await expect(read(text)).rejects.toMatchObject({code:'resources'});}finally{setTileSources(sources);}
 });
});
