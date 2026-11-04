import {afterAll,beforeAll,beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {prepareFieldSpectrum,setFieldSpectrometerFiles} from './fieldSpectrometer';
import {setTileSources} from './tileAssembly';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {repositoryLssSpectrumInputs} from './lssSpectrumInputs.node';
import {setLssResources,type LssInvestigation} from './lssInvestigation';
import {LSS_FREE_SESSION_POLICY,splitLssInvestigation} from './lssFreeRecords';
import {AnalysisSessionError} from './analysisSessionLimits';
import {readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';
import {lssFreeCountsText,lssFreeSource,lssFreeDraft,type LssFreeSource} from '../core/lssFreeRecord';
import type {FieldSpectrumRecord} from './fieldSpectrometer';
import {lssExposureEngine,evaluateLssRow,lssPolicy} from '../core/lssExposure';
import {EMPTY_LSS_SURVEY,confirmLssDialog,editLssDraft,openLssRecord,type LssRecord,type LssSurveyState} from '../core/lssSurvey';
import {lssPrefilledVelocity} from '../core/lssRedshiftDialog';
import {lssFieldRows,type LssFieldNumber} from '../core/lssFields';
import {decodeFieldPack} from '../core/fieldPack';
import {GLIMAGES_LST,packWithPhotographs,parseGlimagesPositions} from '../core/lssLists';
import {INITIAL_CONTROL,configureStep,currentZ,moveControl,type ShiftControl} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import type {FieldTelescope} from '../core/fieldEngine';
vi.setConfig({testTimeout:300000});

// Front LSSFREE (analysis/front-lssfree/RECOVERY.md, plan front-plans/front-lssfree.md): real free-pointing exposures from the
// compact GSC tiles reaching the LSS list, and the v34 investigation wrapper that replays them.
const pub=(p:string)=>new Uint8Array(readFileSync('public'+p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const glx=pub('/original/catalogs/CLEA_GLX.DAT'),photos=parseGlimagesPositions(pub(GLIMAGES_LST.path)),spectra=repositoryLssSpectrumInputs();
const pack=(f:LssFieldNumber)=>packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(`data/lss/lss-field-0${f}.json`,'utf8'))),photos);
const realFetch=globalThis.fetch;
function tiles(fail=false){
 setTileSources(async()=>{const v=pub('/original/variables/CLEA_VStrs.dat'),q=pub('/original/catalogs/CLEA_QSO.DAT'),g=pub('/original/images/GLIMAGES.LST');
  const fetcher=(async(u:RequestInfo|URL)=>{if(fail)throw new TypeError('offline');return new Response(pub(String(u)));}) as typeof fetch;
  return {assembly:{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher,capacity:64}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:g},glx,qso:{bytes:q,sha256:sha(q)},glimages:g};});
}
beforeAll(()=>{globalThis.fetch=(async(u:RequestInfo|URL)=>new Response(pub(String(u)))) as typeof fetch;setFieldSpectrometerFiles(async p=>pub(p));tiles();});
afterAll(()=>{globalThis.fetch=realFetch;setTileSources(null);setFieldSpectrometerFiles(null);});
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);setLssResources({pack:async f=>pack(f),glx:async()=>glx,spectra:async()=>spectra});});
afterEach(()=>{vi.unstubAllGlobals();setLssResources(null);});

/** A real exposure at a free pointing: 2 s of 100 ms ticks, paused. */
async function freeSource(ra:number,dec:number,telescope:FieldTelescope=0,seed=11):Promise<LssFreeSource>{
 const p=await prepareFieldSpectrum({ra,dec},telescope);if(p.status!=='ready'||p.result.reasons.length)throw Error('field');
 const e=lssExposureEngine(p.result,p.policy);let s=e.start(e.activate(e.create(seed)));for(let i=0;i<20;i++)s=e.tick(s,100);s=e.pause(s);
 return lssFreeSource(s,p.result,p.pointing,sha(new TextEncoder().encode(lssFreeCountsText(s.exposure.counts))));
}
function ok(s:LssSurveyState,velocity?:string):LssSurveyState{const r=confirmLssDialog(editLssDraft(s,{velocity:velocity??lssPrefilledVelocity(s.draft!.z),remarks:'r'+s.records.length}));if(!r.ok)throw Error(r.message);return r.state;}
const step=(size:number,position:number):ShiftControl=>moveControl(configureStep(INITIAL_CONTROL,size),position);
/** Field 1 row 1 (12021+3127) on the 0.4 m, as the hot-list route records it. */
function rowRecord(s:LssSurveyState):LssSurveyState{
 const row=lssFieldRows(1)[0],status=evaluateLssRow(pack(1),glx,row,0,spectra);if(status.kind==='unavailable')throw Error('row');
 const policy=lssPolicy(1,0,0),e=lssExposureEngine(status.result,policy);let j=e.start(e.activate(e.create(7)));for(let i=0;i<20;i++)j=e.tick(j,100);j=e.pause(j);
 const control=step(.001,20);
 return ok(openLssRecord(s,{field:1,row:0,telescope:0,object:status.selectedId,jd:2451545.25,ra:row.ra,dec:row.dec,z:currentZ(control),control,journal:{seedAtReset:j.seedAtReset,events:j.events},acquisitionPolicy:policy}));
}
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
const investigation=(records:readonly LssRecord[]):LssInvestigation=>({field:1,telescope:0,records,description:'free',wedgeOptions:null});
const read=(text:string)=>readAnalysisSession(new File([text],'lss.json'));

describe('free-pointing sources from the tiles',()=>{
 it('names a GSC star, a galaxy on no hot-list row and a hot-list galaxy as VIREO\'s proposed file name gives them back',async()=>{
  const star=await freeSource(2.5125473,.25592);
  // The header pointing (RA 6 decimals in hours, Dec 5 decimals) is what the saved file records.
  expect(star).toMatchObject({object:'N0000-01634',ra:2.512547,dec:.25592,telescope:0});
  expect(star.acquisitionPolicy).toBe('openvireo-field-spectrum-v1:2.5125473,0.25592:T0');
  expect((await freeSource(12.20525,29.18027777777778)).object).toBe('NGC 4169');
  // At a hot-list row's coordinates the ID equals the one the row route records, so find-or-add joins them.
  const row=lssFieldRows(1)[1],status=evaluateLssRow(pack(1),glx,row,0,spectra);
  expect(status.kind).not.toBe('unavailable');expect((await freeSource(row.ra,row.dec)).object).toBe(status.kind==='unavailable'?'':status.selectedId);
 });
});

describe('v34 investigation wrapper',()=>{
 async function mixed(){
  let s=rowRecord(EMPTY_LSS_SURVEY);
  s=ok(openLssRecord(s,lssFreeDraft(await freeSource(2.5125473,.25592),step(.0001,1),2451545.5)));
  s=ok(openLssRecord(s,lssFreeDraft(await freeSource(12.20525,29.18027777777778,2,5),step(.001,7),2451545.6)));
  return investigation(s.records);
 }
 it('round-trips hot-list and free records in list order; the base keeps the hot-list records renumbered; re-save is byte-stable',async()=>{
  const inv=await mixed();expect(inv.records.map(r=>[r.id,r.free??false])).toEqual([[1,false],[2,true],[3,true]]);
  const text=await serializeAnalysisSession({...base,lss:inv}),v=JSON.parse(text);
  expect(v.version).toBe(34);expect(v.lssFreePolicy).toBe(LSS_FREE_SESSION_POLICY);expect(v.lssFreeDigestSHA256).toMatch(/^[0-9a-f]{64}$/);
  expect(v.lssFree.records.map((r:{at:number;object:string})=>[r.at,r.object])).toEqual([[2,'N0000-01634'],[3,'NGC 4169']]);
  // The base is exactly what the hot-list record alone would write (v31 → v27).
  expect(v.base).toEqual(JSON.parse(await serializeAnalysisSession({...base,lss:splitLssInvestigation(inv).rows})));
  const back=await read(text);expect(back.lss).toEqual(inv);
  expect(await serializeAnalysisSession(back)).toBe(text);
 });
 it('restores a list whose every record is free (an empty v27 layer), and a free record in front of a hot-list one',async()=>{
  const star=await freeSource(2.5125473,.25592);
  let s=ok(openLssRecord(EMPTY_LSS_SURVEY,lssFreeDraft(star,step(.0001,2),2451545.5)));
  const only=investigation(s.records),t1=await serializeAnalysisSession({...base,lss:only});
  expect(JSON.parse(t1).base.lss.records).toEqual([]);expect((await read(t1)).lss).toEqual(only);
  s=rowRecord(s);const front=investigation(s.records);expect(front.records.map(r=>r.free??false)).toEqual([true,false]);
  expect((await read(await serializeAnalysisSession({...base,lss:front}))).lss).toEqual(front);
 });
 it('writes the older format exactly when no record is free',async()=>{
  const inv=investigation(rowRecord(EMPTY_LSS_SURVEY).records),v=JSON.parse(await serializeAnalysisSession({...base,lss:inv}));
  expect(v.version).toBe(31);expect(JSON.stringify(v)).not.toContain(LSS_FREE_SESSION_POLICY);
  expect((await read(JSON.stringify(v))).lss).toEqual(inv);
 });
 it('rejects edited objects, pointings, z, velocities, journals, positions, digests and nesting',async()=>{
  const v=JSON.parse(await serializeAnalysisSession({...base,lss:await mixed()}));
  const edits:((x:typeof v)=>void)[]=[
   x=>{x.lssFree.records[0].object='N0000-01635';},
   x=>{x.lssFree.records[0].ra=2.512548;},
   x=>{x.lssFree.records[1].zHex='3c23d70b';},
   x=>{x.lssFree.records[1].velocityHex='45000000';},
   x=>{x.lssFree.records[0].exposure.events='s 100*21 p';},
   x=>{x.lssFree.records[0].exposure.seedAtReset=12;},
   x=>{x.lssFree.records[0].at=1;},
   x=>{x.lssFree.records[1].at=4;},
   x=>{x.lssFree.records[0].jd=1e9;},
   x=>{x.lssFreeDigestSHA256='0'.repeat(64);},
   x=>{x.lssFree.records[0].extra=1;},
   x=>{x.base={...x,base:x.base};},
   x=>{x.base.version=26;},
  ];
  for(const edit of edits){const c=structuredClone(v);edit(c);await expect(read(JSON.stringify(c))).rejects.toBeInstanceOf(AnalysisSessionError);}
 });
 it('review 1 M1: an over-budget part is refused before any field is prepared',async()=>{
  const v=JSON.parse(await serializeAnalysisSession({...base,lss:await mixed()}));
  // 14 distinct free journals of 12 000 events each (each within the per-journal cap, 168 000 together over the 150 000 budget).
  // With every tile failing, replaying the first one would surface as a missing resource; the budget check refuses the file
  // first, as a bad file.
  const first=v.lssFree.records[0];
  v.lssFree.records=Array.from({length:14},(_,i)=>({...structuredClone(first),at:i+2,exposure:{...first.exposure,seedAtReset:100+i,events:'s 100*11998 p'}}));
  tiles(true);
  try{await expect(read(JSON.stringify(v))).rejects.toMatchObject({code:'state'});}finally{tiles();}
 });
 it('review 1 M2: Save needs no tile (an open tab saves offline); the same bytes as with the tiles',async()=>{
  const inv=await mixed(),online=await serializeAnalysisSession({...base,lss:inv});
  tiles(true);
  try{expect(await serializeAnalysisSession({...base,lss:inv})).toBe(online);}finally{tiles();}
 });
 it('nests with the field spectrometer\'s own part: v34 { v33 { … } }',async()=>{
  const p=await prepareFieldSpectrum({ra:12.20525,dec:29.18027777777778},0);if(p.status!=='ready')throw Error('field');
  const e=lssExposureEngine(p.result,p.policy);let j=e.start(e.activate(e.create(9)));for(let i=0;i<10;i++)j=e.tick(j,100);j=e.pause(j);
  const fieldSpectrum:FieldSpectrumRecord={prepared:p,state:j},inv=await mixed(),text=await serializeAnalysisSession({...base,lss:inv,fieldSpectrum}),v=JSON.parse(text);
  expect([v.version,v.base.version,v.base.base.version]).toEqual([34,33,31]);
  const back=await read(text);expect(back.lss).toEqual(inv);expect(back.fieldSpectrum?.state.exposure.counts).toEqual(j.exposure.counts);
  expect(await serializeAnalysisSession(back)).toBe(text);
 });
 it('a tile that does not arrive is a missing resource, not a bad file',async()=>{
  const text=await serializeAnalysisSession({...base,lss:await mixed()});
  tiles(true);
  try{await expect(read(text)).rejects.toMatchObject({code:'resources'});}finally{tiles();}
 });
});
