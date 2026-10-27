import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import field36773 from '../../data/hubble/pinned-galaxy-field.json';
import {EMPTY_LSS_SURVEY,selectLssField,markLssListLoaded,openLssRecord,editLssDraft,confirmLssRecord,cancelLssRecord,lssResultsCsv,pendingWedgeRecords,markLssHandedToWedge,LssSurveyError,LSS_LIMITS} from './lssSurvey';
import {hubbleVelocity} from './hubbleVelocity';
import {evaluateLssRow,lssExposureEngine,lssPolicy,parseLssPolicy,lssCountsCsv} from './lssExposure';
import {fieldPackFromSnapshot} from './fieldPack';
import {createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy} from './galaxyExposure';
import {EMPTY_WEDGE_WORKSPACE,appendOwnLssRecords,completeWedgeRead,beginWedgeRead,WEDGE_OWN_RECORDS_NAME} from './wedgeWorkspace';
import {wedgePlot,WEDGE_DEFAULT_OPTIONS} from './wedgePlot';
import type {LssRow} from './lssFields';
const glx=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
const code=(f:()=>unknown)=>{try{f();return 'ok';}catch(e){return e instanceof LssSurveyError?e.code:'other';}};
const draft={field:2 as const,row:4,telescope:0 as const,object:'NGC 4555',jd:2451545,ra:12.594,dec:26.523,z:.0224,acquisitionPolicy:'openvireo-lss-v1:F2:R5:T0'};
describe('E02 survey records (Record Z LSS branch, web adaptation)',()=>{
 it('selects a field, requires the loaded list to be the selected one, and keeps loaded on reselect',()=>{
  let s=selectLssField(EMPTY_LSS_SURVEY,2);expect(s.loaded).toBeNull();
  expect(code(()=>markLssListLoaded(s,3))).toBe('field');s=markLssListLoaded(s,2);expect(s.loaded).toBe(2);
  expect(selectLssField(s,2).loaded).toBe(2);expect(selectLssField(s,5).loaded).toBeNull();expect(code(()=>selectLssField(s,10))).toBe('field');
 });
 it('OK appends exactly one record with Single z and c·z velocity; Cancel adds nothing',()=>{
  let s=openLssRecord(EMPTY_LSS_SURVEY,draft);expect(code(()=>openLssRecord(s,draft))).toBe('pending');
  expect(cancelLssRecord(s).records).toEqual([]);expect(cancelLssRecord(s).draft).toBeNull();
  s=confirmLssRecord(editLssDraft(s,{remarks:'bright arm'}));
  expect(s.records).toHaveLength(1);const r=s.records[0];
  expect(r.zSingle).toBe(Math.fround(.0224));expect(r.velocitySingle).toBe(hubbleVelocity(.0224).storedKmS);expect(r.remarks).toBe('bright arm');expect([r.ra,r.dec,r.jd]).toEqual([12.594,26.523,2451545]);
  expect(code(()=>confirmLssRecord(s))).toBe('pending');
 });
 it('bounds text, values and the record count',()=>{
  expect(code(()=>openLssRecord(EMPTY_LSS_SURVEY,{...draft,z:-1}))).toBe('record');
  expect(code(()=>openLssRecord(EMPTY_LSS_SURVEY,{...draft,ra:24}))).toBe('record');
  const s=openLssRecord(EMPTY_LSS_SURVEY,draft);
  expect(code(()=>editLssDraft(s,{remarks:'x'.repeat(LSS_LIMITS.remarks+1)}))).toBe('record');
  expect(code(()=>editLssDraft(s,{remarks:'a\nb'}))).toBe('record');
  let full={...EMPTY_LSS_SURVEY};for(let i=0;i<LSS_LIMITS.records;i++)full=confirmLssRecord(openLssRecord(full,draft));
  expect(code(()=>confirmLssRecord(openLssRecord(full,draft)))).toBe('limit');
 });
 it('writes a formula-neutral results CSV',()=>{
  const s=confirmLssRecord(editLssDraft(openLssRecord(EMPTY_LSS_SURVEY,{...draft,object:'=HYPERLINK("x")'}),{remarks:'+cmd'}));
  const csv=lssResultsCsv(s.records);
  expect(csv.split('\r\n')[0]).toMatch(/^schema,id,field,row,/);
  expect(csv).toContain(`"'=HYPERLINK(""x"")"`);expect(csv).toContain(`"'+cmd"`);
 });
 it('hands only new records to the wedge, with exact values, and plots them like an equivalent Z text row',async()=>{
  let s=confirmLssRecord(openLssRecord(EMPTY_LSS_SURVEY,{...draft,ra:12.5,dec:27.25}));
  expect(pendingWedgeRecords(s)).toHaveLength(1);s=markLssHandedToWedge(s);expect(pendingWedgeRecords(s)).toHaveLength(0);
  const w=appendOwnLssRecords(EMPTY_WEDGE_WORKSPACE,s.records.map(r=>({object:r.object,jd:r.jd,ra:r.ra,dec:r.dec,zSingle:r.zSingle,remarks:r.remarks})),{sha256:'a'.repeat(64),bytes:10});
  expect(w.receipts[0]).toMatchObject({name:WEDGE_OWN_RECORDS_NAME,action:'first',hasZ:true,rows:1});
  // Same values written as a native Z-column text row (12h30m0s, 27°15'0", z as its shortest decimal).
  const text=new TextEncoder().encode(`Object ID    MJD(Days)      RA           Dec     Z  Comments\nNGC4555    51544.5 12h30m0s 27°15'0" ${String(Math.fround(.0224))} -\n`.replace('°','°'));
  const bytes=Uint8Array.from([...new TextDecoder().decode(text)].map(c=>c.charCodeAt(0)));
  const fromText=completeWedgeRead(beginWedgeRead(EMPTY_WEDGE_WORKSPACE,1,'x.txt'),1,{name:'x.txt',sha256:'b'.repeat(64),bytes});
  expect(fromText.records).toHaveLength(1);
  const a=wedgePlot(w.records,WEDGE_DEFAULT_OPTIONS).points[0],b=wedgePlot(fromText.records,WEDGE_DEFAULT_OPTIONS).points[0];
  expect({...a,index:0}).toEqual({...b,index:0});
  // Adding later records uses 'add' without the file-load prompts.
  expect(appendOwnLssRecords(w,[{object:'x',jd:1,ra:13,dec:28,zSingle:Math.fround(.01),remarks:''}],{sha256:'c'.repeat(64),bytes:1}).receipts[1].action).toBe('add');
 });
});
describe('LSS row evaluation and exposure',()=>{
 // A verified existing field stands in for an LSS pack here; LSS packs are exercised by their own suite.
 const pack=fieldPackFromSnapshot('s',field36773 as Parameters<typeof fieldPackFromSnapshot>[1]);
 const row:LssRow={field:1,index:0,id:'36773',remarks:'',ra:field36773.domain.pointing.ra,dec:field36773.domain.pointing.dec,recordSha256:'0'.repeat(64),catalogIndex:12119,exact:true,near:[]};
 it('reports available when the slit selects the row galaxy, neighbour otherwise, and unavailable outside the pack',()=>{
  expect(evaluateLssRow(pack,glx,row,0,new Set()).kind).toBe('available');
  const other=evaluateLssRow(pack,glx,{...row,catalogIndex:1},0,new Set());expect(other.kind).toBe('neighbour');
  expect(evaluateLssRow(pack,glx,{...row,ra:row.ra+.01},0,new Set())).toMatchObject({kind:'unavailable',reasons:['outside-pack']});
  expect(evaluateLssRow(pack,glx,row,0,new Set(['36773.SP']))).toMatchObject({kind:'unavailable',reasons:['spectrum-mapping']});
 });
 it('runs the same journal draws as the verified galaxy exposure and checks its policy',()=>{
  const st=evaluateLssRow(pack,glx,row,0,new Set());if(st.kind==='unavailable')throw Error();
  const policy=lssPolicy(1,0,0),e=lssExposureEngine(st.result,policy);
  const run=(s:ReturnType<typeof e.create>)=>e.tick(e.start(e.activate(s)),700).exposure.counts;
  expect(run(e.create(7))).toEqual(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(7,'36773',0))),700).exposure.counts);
  expect(()=>e.activate(createGalaxyExposure(7,'36773',0))).toThrow();
  const paused=e.pause(e.tick(e.start(e.activate(e.create(7))),500));
  expect(e.replay(7,paused.events).exposure.counts).toEqual(paused.exposure.counts);
  expect(lssCountsCsv(paused,st.result,row).split('\r\n')).toHaveLength(602);
  expect(parseLssPolicy(policy)).toEqual({field:1,row:0,telescope:0});expect(()=>parseLssPolicy('openvireo-lss-v1:F1:R99:T0')).toThrow();
 });
});
