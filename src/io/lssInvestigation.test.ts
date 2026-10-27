import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {INITIAL_CONTROL,configureStep,moveControl,currentZ} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {decodeFieldPack} from '../core/fieldPack';
import {lssFieldRows,type LssFieldNumber} from '../core/lssFields';
import {GLIMAGES_LST,GLXYSP_LST,packWithPhotographs,parseGlimagesPositions,parseGlxyspNames} from '../core/lssLists';
import {evaluateLssRow,lssExposureEngine,lssPolicy} from '../core/lssExposure';
import {EMPTY_LSS_SURVEY,openLssRecord,confirmLssRecord,editLssDraft,encodeLssEvents,decodeLssEvents,lssEventTotal,type LssRecord} from '../core/lssSurvey';
import {LssSessionError,LSS_INVESTIGATION_POLICY,LSS_SESSION_LIMITS,admitLssInvestigation,portableLssInvestigation,setLssResources,type LssInvestigation} from './lssInvestigation';
import {OBSERVATORY_SESSION_POLICY,readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';
// Repository files feed the restore path in place of the same-origin fetches.
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../'+p,import.meta.url)));
const glx=file('public/original/catalogs/CLEA_GLX.DAT'),photos=parseGlimagesPositions(file('public'+GLIMAGES_LST.path)),spectra=parseGlxyspNames(file('public'+GLXYSP_LST.path));
const pack=(f:LssFieldNumber)=>packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(new URL(`../../data/lss/lss-field-0${f}.json`,import.meta.url),'utf8'))),photos);
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);setLssResources({pack:async f=>pack(f),glx:async()=>glx,spectra:async()=>spectra});});
afterEach(()=>{vi.unstubAllGlobals();setLssResources(null);});
const read=(text:string)=>readAnalysisSession(new File([text],'lss.json'));
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
/** A real acquisition of field 1 row 1 on the 0.4 m: 2 s of 100 ms ticks, paused; z from a student control. */
function acquiredRecord(seed=7,position=20,remarks='first'):LssRecord{
 const row=lssFieldRows(1)[0],status=evaluateLssRow(pack(1),glx,row,0,spectra);if(status.kind==='unavailable')throw Error('row');
 const policy=lssPolicy(1,0,0),e=lssExposureEngine(status.result,policy);let s=e.start(e.activate(e.create(seed)));for(let i=0;i<20;i++)s=e.tick(s,100);s=e.pause(s);
 const control=moveControl(configureStep(INITIAL_CONTROL,.001),position);
 const open=openLssRecord(EMPTY_LSS_SURVEY,{field:1,row:0,telescope:0,object:status.selectedId,jd:2451545.25,ra:row.ra,dec:row.dec,z:currentZ(control),control,journal:{seedAtReset:s.seedAtReset,events:s.events},acquisitionPolicy:policy});
 return confirmLssRecord(editLssDraft(open,{remarks})).records[0];
}
const investigation=(records:readonly LssRecord[]):LssInvestigation=>({field:1,telescope:0,records,description:'Line one\nline two',wedgeOptions:{grid:1,pointSize:3,pointStyle:1}});
describe('v27 LSS investigation',()=>{
 it('round-trips records (replayed), description and wedge options around an unchanged base, also over a v26 base',async()=>{
  const r=acquiredRecord(),inv=investigation([r]);
  const plain=JSON.parse(await serializeAnalysisSession(base)),text=await serializeAnalysisSession({...base,lss:inv}),v=JSON.parse(text);
  expect(v.version).toBe(27);expect(v.lssPolicy).toBe(LSS_INVESTIGATION_POLICY);expect(v.base).toEqual(plain);expect(v.lssDigestSHA256).toMatch(/^[a-f0-9]{64}$/);
  const back=await read(text);expect(back.lss).toEqual(inv);
  const both=JSON.parse(await serializeAnalysisSession({...base,observatory:{options:{limitSlewing:true},siteOverrides:{}},lss:inv}));
  expect(both.version).toBe(27);expect(both.base.version).toBe(26);expect(both.base.observatoryPolicy).toBe(OBSERVATORY_SESSION_POLICY);
  const restored=await read(JSON.stringify(both));expect(restored.lss).toEqual(inv);expect(restored.observatory?.options.limitSlewing).toBe(true);
  // Older files are untouched: no lss part.
  expect((await read(JSON.stringify(plain))).lss).toBeUndefined();
 },60000);
 it('stores one compact journal per exposure: two records of one exposure share it',async()=>{
  const a=acquiredRecord(7,20,'first'),b={...acquiredRecord(7,22,'again'),id:2};
  const {lss}=await portableLssInvestigation(investigation([a,b]));const p=lss as {journals:{events:string}[];records:{journal:number}[]};
  expect(p.journals).toHaveLength(1);expect(p.records.map(r=>r.journal)).toEqual([0,0]);expect(p.journals[0].events).toBe('s 100*20 p');
  expect(lssEventTotal([a,b])).toBe(a.journal.events.length);
 },60000);
 it('keeps the full event budget far inside the 16 MiB cap even when every tick differs',()=>{
  const events=Array.from({length:12000},(_,i)=>({kind:'tick' as const,deltaMs:90+(i%23)}));
  const text=encodeLssEvents([{kind:'start'},...events,{kind:'pause'}]);
  expect(decodeLssEvents(text,12002)).toHaveLength(12002);
  // 150 000 events at this worst-case spelling: under the 4 MiB E02 cap.
  expect(text.length*150000/12002).toBeLessThan(LSS_SESSION_LIMITS.bytes);
  for(const bad of ['x','s 100*1','s 0100','s 100*0','s 1e3'])expect(()=>decodeLssEvents(bad,100)).toThrow();
  expect(()=>decodeLssEvents('s 100*101',100)).toThrow();
 });
 it('rejects tampered journals, z, digest, policy, nesting and bounds atomically',async()=>{
  const v=JSON.parse(await serializeAnalysisSession({...base,lss:investigation([acquiredRecord()])}));
  const rec=v.lss.records[0],j=v.lss.journals[0];
  const bad=[
   {...v,lssDigestSHA256:'0'.repeat(64)},{...v,lssPolicy:'x'},{...v,base:v},
   {...v,lss:{...v.lss,journals:[{...j,seedAtReset:j.seedAtReset+1}]}},
   {...v,lss:{...v.lss,journals:[{...j,events:'s 100*19 p'}]}},
   {...v,lss:{...v.lss,journals:[{...j,events:'s 100 100*19 p'}]}},
   {...v,lss:{...v.lss,journals:[j,j]}},
   {...v,lss:{...v.lss,records:[{...rec,journal:1}]}},
   {...v,lss:{...v.lss,records:[{...rec,zHex:'3d000000'}]}},
   {...v,lss:{...v.lss,records:[{...rec,control:{...rec.control,position:21}}]}},
   {...v,lss:{...v.lss,records:[{...rec,object:'NGC 4080'}]}},
   {...v,lss:{...v.lss,records:[{...rec,remarks:'a\tb'}]}},
   {...v,lss:{...v.lss,records:[{...rec,ra:rec.ra+1e-9}]}},
   {...v,lss:{...v.lss,description:'x'.repeat(LSS_SESSION_LIMITS.description+1)}},
   {...v,lss:{...v.lss,description:'bad\u0001'}},
   {...v,lss:{...v.lss,extra:1}},
  ];
  for(const b of bad)await expect(read(JSON.stringify(b))).rejects.toBeTruthy();
 },60000);
 it('enforces the record and event budgets before any replay',async()=>{
  const {lss,digest}=await portableLssInvestigation(investigation([acquiredRecord()]));
  const p=lss as {records:{id:number}[];journals:{policy:string;seedAtReset:number;events:string}[]};
  const many={...p,records:Array.from({length:LSS_SESSION_LIMITS.records+1},(_,i)=>({...p.records[0],id:i+1}))};
  await expect(admitLssInvestigation(many,digest)).rejects.toMatchObject({code:'bounds'});
  const heavy={...p,records:Array.from({length:13},(_,i)=>({...p.records[0],id:i+1,journal:i})),journals:Array.from({length:13},(_,i)=>({...p.journals[0],seedAtReset:i,events:'s 100*11998 p'}))};
  await expect(admitLssInvestigation(heavy,digest)).rejects.toMatchObject({code:'bounds'});
  expect(await admitLssInvestigation(lss,digest)).toMatchObject({field:1,telescope:0});
 },60000);
 it('save refuses an over-budget survey with its own error type',async()=>{
  const r=acquiredRecord(),evs=Array.from({length:12000},()=>({kind:'tick' as const,deltaMs:100}));
  const records=Array.from({length:13},(_,i)=>({...r,id:i+1,journal:{seedAtReset:i,events:evs}}));
  await expect(serializeAnalysisSession({...base,lss:investigation(records)})).rejects.toBeInstanceOf(LssSessionError);
 },60000);
});
