import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {repositoryLssSpectrumInputs} from './lssSpectrumInputs.node';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {INITIAL_CONTROL,configureStep,moveControl,currentZ} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {decodeFieldPack} from '../core/fieldPack';
import {lssFieldRows,type LssFieldNumber} from '../core/lssFields';
import {GLIMAGES_LST,packWithPhotographs,parseGlimagesPositions} from '../core/lssLists';
import {evaluateLssRow,lssExposureEngine,lssPolicy} from '../core/lssExposure';
import {EMPTY_LSS_SURVEY,openLssRecord,confirmLssDialog,editLssDraft,encodeLssEvents,decodeLssEvents,lssEventTotal,type LssRecord} from '../core/lssSurvey';
import {LssSessionError,LSS_INVESTIGATION_POLICY,LSS_SESSION_LIMITS,admitLssInvestigation,portableLssInvestigation,setLssResources,type LssInvestigation} from './lssInvestigation';
import {OBSERVATORY_SESSION_POLICY,readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';
// Repository files feed the restore path in place of the same-origin fetches.
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../'+p,import.meta.url)));
const glx=file('public/original/catalogs/CLEA_GLX.DAT'),photos=parseGlimagesPositions(file('public'+GLIMAGES_LST.path)),spectra=repositoryLssSpectrumInputs();
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
import {VARIABLE_TIME_SESSION_POLICY} from './analysisSession';
describe('v30: the frozen observatory-clock JD of LSS fields (Front T)',()=>{
 // F8 row 22 (NGC 5924, index 21): S CrB is in view, so the field needs the time. 2451545.0 is a SYNTHETIC test time.
 const JD=2451545.0;
 function timedRecord(fieldJd:number|undefined):LssRecord{
  const row=lssFieldRows(8)[21],status=evaluateLssRow(pack(8),glx,row,0,spectra,fieldJd===undefined?undefined:{jd:fieldJd,source:'observatory-clock'});
  if(status.kind==='unavailable')throw Error(status.reasons.join('+'));
  const policy=lssPolicy(8,21,0),e=lssExposureEngine(status.result,policy);let s=e.start(e.activate(e.create(11)));for(let i=0;i<10;i++)s=e.tick(s,100);s=e.pause(s);
  const control=moveControl(configureStep(INITIAL_CONTROL,.001),15);
  const open=openLssRecord(EMPTY_LSS_SURVEY,{field:8,row:21,telescope:0,object:status.selectedId,jd:2451545.25,...(fieldJd!==undefined?{fieldJd}:{}),ra:row.ra,dec:row.dec,z:currentZ(control),control,journal:{seedAtReset:s.seedAtReset,events:s.events},acquisitionPolicy:policy});
  return confirmLssRecord(open).records[0];
 }
 it('the time row is unavailable without a JD and available with one',()=>{
  expect(evaluateLssRow(pack(8),glx,lssFieldRows(8)[21],0,spectra)).toMatchObject({kind:'unavailable',reasons:['variable-time-required']});
  expect(()=>timedRecord(JD)).not.toThrow();
 });
 it('saves v30 over the unchanged v27 layer, restores the same record, and older files fail closed',async()=>{
  const r=timedRecord(JD),inv:LssInvestigation={...investigation([r]),field:8};
  expect(r.fieldJd).toBe(JD);
  const text=await serializeAnalysisSession({...base,lss:inv}),v=JSON.parse(text);
  expect([v.version,v.variableTimePolicy,v.lssFieldJds,v.base.version]).toEqual([30,VARIABLE_TIME_SESSION_POLICY,[[1,JD]],27]);
  expect(JSON.stringify(v.base)).not.toContain('fieldJd');// the v27 payload itself is unchanged in shape
  expect((await read(text)).lss).toEqual(inv);
  // The same v27 layer without its frozen JD (an older file): the row needs the time, so the restore fails closed.
  await expect(read(JSON.stringify(v.base))).rejects.toThrow();
  // Another JD replays a different field: the stored digest no longer matches.
  await expect(read(JSON.stringify({...v,lssFieldJds:[[1,JD+0.37]]}))).rejects.toThrow();
  // Malformed or orphaned JDs, a nested or LSS-less v30: format errors.
  for(const bad of [[],[[2,JD]],[[1,'x']],[[1,NaN]],[[1,2400000]]])await expect(read(JSON.stringify({...v,lssFieldJds:bad}))).rejects.toThrow();
  await expect(read(JSON.stringify({...v,base:JSON.parse(await serializeAnalysisSession(base))}))).rejects.toThrow();
  await expect(read(JSON.stringify({...v,base:v}))).rejects.toThrow();
 },120000);
 it('a record without a frozen JD keeps the v27 file exactly',async()=>{
  const text=await serializeAnalysisSession({...base,lss:investigation([acquiredRecord()])});expect(JSON.parse(text).version).toBe(27);
 },60000);
});
import en from '../i18n/en.json';
import {lssDialogZ,LSS_DIALOG_TEXT} from '../core/lssRedshiftDialog';
import {hubbleVelocity} from '../core/hubbleVelocity';
import {LSS_DIALOG_SESSION_POLICY} from './analysisSession';
import type {LssSurveyState} from '../core/lssSurvey';
/** Front L2: a record as v27–v30 files store it (z and velocity = c·z from the control, no native dialog). The tests of the
 * older formats use these; the v31 tests below use the dialog's records. */
function legacy(r:LssRecord):LssRecord{
 const z=currentZ(r.control),v=hubbleVelocity(z),zSingle=Math.fround(z),{nativeDialog:_n,...rest}=r;void _n;
 const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,zSingle,false);
 return Object.freeze({...rest,zSingle,zHex:b.getUint32(0,false).toString(16).padStart(8,'0'),velocitySingle:v.storedKmS,velocityHex:v.storedHex});
}
function nativeConfirm(s:LssSurveyState,velocity?:string):LssSurveyState{
 const r=confirmLssDialog(editLssDraft(s,{velocity:velocity??String(299792.458*lssDialogZ(s.draft!.z))}));
 if(!r.ok)throw new Error(r.message);return r.state;
}
function confirmLssRecord(s:LssSurveyState):LssSurveyState{const n=nativeConfirm(s);return Object.freeze({...n,records:Object.freeze(n.records.map(legacy))});}

it('the variable-time-required reason has its student text (shown in the row status when the list has no time)',()=>{
 expect((en as Record<string,string>)['lss.reason.variable-time-required']).toBe('a variable star in view whose brightness depends on the observatory clock, which gave no time');
});

describe('v31: records made with the recovered Measured Redshift Data rules (Front L2)',()=>{
 function nativeRecord(velocity?:string,position=20):LssRecord{
  const row=lssFieldRows(1)[0],status=evaluateLssRow(pack(1),glx,row,0,spectra);if(status.kind==='unavailable')throw Error('row');
  const policy=lssPolicy(1,0,0),e=lssExposureEngine(status.result,policy);let st=e.start(e.activate(e.create(7)));for(let i=0;i<20;i++)st=e.tick(st,100);st=e.pause(st);
  const control=moveControl(configureStep(INITIAL_CONTROL,.001),position);
  const open=openLssRecord(EMPTY_LSS_SURVEY,{field:1,row:0,telescope:0,object:status.selectedId,jd:2451545.25,ra:row.ra,dec:row.dec,z:currentZ(control),control,journal:{seedAtReset:st.seedAtReset,events:st.events},acquisitionPolicy:policy});
  return nativeConfirm(open,velocity).records[0];
 }
 it('a typed velocity within 1 % is stored as typed; outside it, or unreadable, OK keeps the dialog with the native message',()=>{
  const r=nativeRecord('6000');expect(r.nativeDialog).toBe(true);expect(r.velocitySingle).toBe(Math.fround(6000));
  expect(r.zSingle).toBe(Math.fround(0.02));// 2.000E-02
  const row=lssFieldRows(1)[0],control=moveControl(configureStep(INITIAL_CONTROL,.001),20),status=evaluateLssRow(pack(1),glx,row,0,spectra);if(status.kind==='unavailable')throw Error();
  const open=openLssRecord(EMPTY_LSS_SURVEY,{field:1,row:0,telescope:0,object:status.selectedId,jd:2451545.25,ra:row.ra,dec:row.dec,z:currentZ(control),control,journal:{seedAtReset:1,events:[]},acquisitionPolicy:lssPolicy(1,0,0)});
  expect(confirmLssDialog(editLssDraft(open,{velocity:'5000'}))).toEqual({ok:false,caption:null,message:LSS_DIALOG_TEXT.velocityInvalid});
  expect(confirmLssDialog(editLssDraft(open,{velocity:''}))).toEqual({ok:false,caption:LSS_DIALOG_TEXT.velocityCaption,message:LSS_DIALOG_TEXT.velocityMissing});
 });
 it('saves v31 around the v27 layer, restores the typed velocity, and rejects tampering; v27 files keep the c·z rule',async()=>{
  const r=nativeRecord('6010'),inv=investigation([r]);
  const text=await serializeAnalysisSession({...base,lss:inv}),v=JSON.parse(text);
  expect([v.version,v.lssDialogPolicy,v.lssNativeDialogIds,v.base.version]).toEqual([31,LSS_DIALOG_SESSION_POLICY,[1],27]);
  expect((await read(text)).lss).toEqual(inv);
  // The v27 layer alone applies the c·z rule: a typed velocity no longer matches.
  await expect(read(JSON.stringify(v.base))).rejects.toThrow();
  for(const bad of [[],[2],[1,1],['1']])await expect(read(JSON.stringify({...v,lssNativeDialogIds:bad}))).rejects.toThrow();
  await expect(read(JSON.stringify({...v,base:JSON.parse(await serializeAnalysisSession(base))}))).rejects.toThrow();
  await expect(read(JSON.stringify({...v,base:v}))).rejects.toThrow();
  // A velocity outside 1 % in the file is refused.
  const tampered=structuredClone(v),hex=(x:number)=>{const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,x,false);return b.getUint32(0,false).toString(16).padStart(8,'0');};
  tampered.base.lss.records[0].velocityHex=hex(5000);await expect(read(JSON.stringify(tampered))).rejects.toThrow();
  // Mixed: a legacy record and a native one in one file.
  const mixed=investigation([legacy(nativeRecord()),{...nativeRecord('5990',20),id:2}]);
  const m=JSON.parse(await serializeAnalysisSession({...base,lss:mixed}));expect(m.lssNativeDialogIds).toEqual([2]);
  expect((await read(JSON.stringify(m))).lss).toEqual(mixed);
 },120000);
 it('a native record with a frozen field JD saves v31 over v30 over v27 and restores',async()=>{
  const JD=2451545.0,row=lssFieldRows(8)[21],status=evaluateLssRow(pack(8),glx,row,0,spectra,{jd:JD,source:'observatory-clock'});if(status.kind==='unavailable')throw Error();
  const policy=lssPolicy(8,21,0),e=lssExposureEngine(status.result,policy);let st=e.start(e.activate(e.create(11)));for(let k=0;k<10;k++)st=e.tick(st,100);st=e.pause(st);
  const control=moveControl(configureStep(INITIAL_CONTROL,.001),15);
  const open=openLssRecord(EMPTY_LSS_SURVEY,{field:8,row:21,telescope:0,object:status.selectedId,jd:2451545.25,fieldJd:JD,ra:row.ra,dec:row.dec,z:currentZ(control),control,journal:{seedAtReset:st.seedAtReset,events:st.events},acquisitionPolicy:policy});
  const r=nativeConfirm(open).records[0],inv:LssInvestigation={...investigation([r]),field:8};
  const v=JSON.parse(await serializeAnalysisSession({...base,lss:inv}));
  expect([v.version,v.base.version,v.base.base.version]).toEqual([31,30,27]);
  expect((await read(JSON.stringify(v))).lss).toEqual(inv);
 },120000);
});

