import {describe,expect,it} from 'vitest';
import {EMPTY_OBSERVATION_LIST,OBSERVATION_LIST_MAX,observationListAnsi,ObservationListError,migrateObservationList,observationListActivate,observationListClassifier,observationListData,observationListFind,observationListFindOrAdd,observationListHubble,observationListInsertionIndex,observationListJd,observationListOk,observationListPhotometer,portableObservationList,readObservationList,sameObservationList,type ObservationList,type ObservationListRecord} from './sharedObservationList';
import {observationalDataFields} from './clusterNativeHrSelect';
import {clusterNativeHrPlot} from './clusterNativeObservationHr';
import {listOrderNativeResultList,appendNativeResultList,buildNativeResultList,refreshNativeResultList} from './nativeResultList';
import {commitNativeRecordEdit,openNativeRecordEdit} from './nativeObservationResults';
import {recordedResultsLines} from './recordedResults';
// Front ONERESULTS (analysis/front-oneresults/RECOVERY.md): one list and one ID space for the three Record routes. These tests
// pin the ported contract; they are not an oracle for the original.

const JD=2460000.5;
const band=(b:number,v:number)=>[0,b,v,0,0];
/** The photometer's Record1Click (0x501e7c) on the shared list. */
function photometer(list:ObservationList,id:string,jd:number,td:boolean,w:{ra:number;dec:number;bands:number[]},ok?:{remarks:string;spectralCode:number}){
 const p=observationListFindOrAdd(list,id,jd,td);let next=observationListPhotometer(p.list,p.index,{...w,kind:1});
 if(ok)next=observationListOk(next,p.index,ok);return {list:next,index:p.index,created:p.created};
}
function classifier(list:ObservationList,id:string,jd:number|null,td:boolean,w:{ra:number;dec:number},ok:{remarks:string;spectralCode:number}){
 const p=observationListFindOrAdd(list,id,jd,td);return {list:observationListOk(observationListClassifier(p.list,p.index,w),p.index,ok),index:p.index,created:p.created};
}
function hubble(list:ObservationList,id:string,jd:number,td:boolean,w:{z:number;ra:number;dec:number;vMagnitude:number|null},cz=false,velocity?:number){
 const p=observationListFindOrAdd(list,id,jd,td);let next=observationListActivate(observationListHubble(p.list,p.index,w),p.index,cz);
 next=observationListOk(next,p.index,{remarks:'z',spectralCode:0,...(velocity!==undefined?{velocity}:{})});return {list:next,index:p.index,created:p.created};
}
const ids=(l:ObservationList)=>l.records.map(r=>r.id);

describe('one list, one ID space across the photometer, the classifier and Hubble Record (0x54a73c)',()=>{
 it('Time-Dependent Data off: the three routes reuse the first record of the same name',()=>{
  let l=photometer(EMPTY_OBSERVATION_LIST,'N4889',JD,false,{ra:13.01,dec:27.98,bands:band(14.2,0)},{remarks:'B',spectralCode:0}).list;
  const h=hubble(l,'N4889',JD+1,false,{z:Math.fround(0.0216),ra:13.0125,dec:27.9769,vMagnitude:Math.fround(12.6)});
  expect(h.created).toBe(false);l=h.list;
  let r=l.records[0]!;
  expect(r.jd).toBe(JD);// the first time is kept
  expect([r.ra,r.dec]).toEqual([13.0125,27.9769]);// Record Z writes RA/Dec always
  expect(r.bands).toEqual([0,14.2,Math.fround(12.6),0,0]);expect(r.z).toBe(Math.fround(0.0216));expect(r.remarks).toBe('z');
  const c=classifier(l,'N4889',null,false,{ra:0,dec:0},{remarks:'class',spectralCode:0});
  expect(c.created).toBe(false);l=c.list;r=l.records[0]!;
  expect([r.ra,r.dec]).toEqual([0,0]);// 0x50b1dc writes RA/Dec always, even unknown ones
  // A photometer reading afterwards fills RA/Dec only because one of them is 0, and keeps the other bands.
  l=photometer(l,'N4889',JD+2,false,{ra:13.02,dec:28,bands:band(0,13.1)}).list;r=l.records[0]!;
  expect(l.records).toHaveLength(1);expect([r.ra,r.dec]).toEqual([13.02,28]);expect(r.bands).toEqual([0,14.2,13.1,0,0]);expect(r.remarks).toBe('class');
 });
 it('Time-Dependent Data on: every Record adds a record; an ID longer than 15 never reuses its own record',()=>{
  let l=photometer(EMPTY_OBSERVATION_LIST,'N4889',JD,true,{ra:1,dec:2,bands:band(1,0)}).list;
  l=hubble(l,'N4889',JD+1,true,{z:Math.fround(0.01),ra:1,dec:2,vMagnitude:null}).list;
  l=classifier(l,'N4889',JD+2,true,{ra:1,dec:2},{remarks:'',spectralCode:0}).list;
  expect(ids(l)).toEqual(['N4889','N4889','N4889']);
  l=photometer(l,'ABCDEFGHIJKLMNOP',JD+3,false,{ra:1,dec:2,bands:band(1,0)}).list;
  l=photometer(l,'ABCDEFGHIJKLMNOP',JD+4,false,{ra:1,dec:2,bands:band(1,0)}).list;
  expect(ids(l).slice(3)).toEqual(['ABCDEFGHIJKLMNO','ABCDEFGHIJKLMNO']);
  expect(observationListFind(l,'ABCDEFGHIJKLMNO',false)).toBe(l.records[3]);expect(observationListFind(l,'N4889',true)).toBeNull();
 });
 it('a new record is placed by 0x546db4 from the tail with RA = 0, not in insertion order',()=>{
  let l=photometer(EMPTY_OBSERVATION_LIST,'late',JD+3,false,{ra:5,dec:1,bands:band(1,2)}).list;
  l=photometer(l,'early',JD+1,false,{ra:6,dec:1,bands:band(1,2)}).list;
  l=photometer(l,'middle',JD+2,false,{ra:7,dec:1,bands:band(1,2)}).list;
  l=classifier(l,'nodate',null,false,{ra:0,dec:0},{remarks:'',spectralCode:0}).list;// time 0 → head
  expect(ids(l)).toEqual(['nodate','early','middle','late']);
  // Equal times: the new key (t, 0) is below an equal-time record whose RA was written afterwards.
  let e=photometer(EMPTY_OBSERVATION_LIST,'a',JD,false,{ra:3,dec:1,bands:band(1,2)}).list;
  e=photometer(e,'b',JD,false,{ra:2,dec:1,bands:band(1,2)}).list;
  expect(ids(e)).toEqual(['b','a']);// head (t,3) > (t,0): before the head
  e=photometer(e,'c',JD,false,{ra:1,dec:1,bands:band(1,2)}).list;
  expect(ids(e)).toEqual(['c','b','a']);
  // An equal minimum head is followed (0x4927d3–0x4927f2): a record with no time after one with no time.
  let z=classifier(EMPTY_OBSERVATION_LIST,'x',null,false,{ra:0,dec:0},{remarks:'',spectralCode:0}).list;
  z=classifier(z,'y',null,false,{ra:0,dec:0},{remarks:'',spectralCode:0}).list;expect(ids(z)).toEqual(['x','y']);
  // Backward walk: after the first record the key exceeds.
  const recs=[{jd:JD,ra:9},{jd:JD+1,ra:9},{jd:JD+2,ra:9}].map((x,i)=>({...EMPTY_REC,id:'r'+i,jd:x.jd,ra:x.ra}));
  expect(observationListInsertionIndex(recs,JD+1.5)).toBe(2);expect(observationListInsertionIndex(recs,JD+1)).toBe(1);expect(observationListInsertionIndex(recs,JD+5)).toBe(3);expect(observationListInsertionIndex(recs,JD-1)).toBe(0);
 });
 it('route writes: Hubble without a catalogue V leaves V and kind; FormActivate stores c·z only with the option, z ≠ 0 and velocity 0',()=>{
  let l=photometer(EMPTY_OBSERVATION_LIST,'G',JD,false,{ra:1,dec:1,bands:band(15,14)}).list;
  l=hubble(l,'G',JD,false,{z:Math.fround(0.02),ra:2,dec:2,vMagnitude:null},true).list;
  expect(l.records[0]!.bands).toEqual(band(15,14));expect(l.records[0]!.velocity).toBe(Math.fround(299792.458*Math.fround(0.02)));
  const off=hubble(EMPTY_OBSERVATION_LIST,'G',JD,false,{z:Math.fround(0.02),ra:2,dec:2,vMagnitude:null},false).list;expect(off.records[0]!.velocity).toBe(0);
  const typed=hubble(EMPTY_OBSERVATION_LIST,'G',JD,false,{z:Math.fround(0.02),ra:2,dec:2,vMagnitude:null},true,Math.fround(6000)).list;expect(typed.records[0]!.velocity).toBe(6000);
  expect(observationListActivate(typed,0,true)).toBe(typed);// a velocity already there is kept
 });
 it('the 144-byte records feed the dialog, the Recorded Results list and the HR plot in list order',()=>{
  let l=photometer(EMPTY_OBSERVATION_LIST,'second',JD+1,false,{ra:3.75,dec:24.1,bands:band(11.2,10.5)},{remarks:'r2',spectralCode:0}).list;
  l=photometer(l,'first',JD,false,{ra:3.76,dec:24.2,bands:band(10.4,10)}).list;
  l=hubble(l,'galaxy',JD+0.5,false,{z:Math.fround(0.01),ra:12,dec:30,vMagnitude:Math.fround(13)}).list;
  const data=observationListData(l),view=observationalDataFields(data,2);
  expect(view.kind).toBe('ready');if(view.kind==='ready'){expect(view.fields.id).toBe('second');expect(view.fields.remarks).toBe('r2');expect(view.fields.b.trim()).toBe('11.200');}
  const plot=clusterNativeHrPlot(data);expect(plot.status).toBe('plotted');
  if(plot.status==='plotted'){expect(plot.rows.map(r=>[r.object,r.status])).toEqual([['first','plotted'],['galaxy','skipped-b-zero'],['second','plotted']]);expect(plot.count).toBe(2);}
  const lines=recordedResultsLines(data);expect(lines.kind).toBe('ready');
  // The HR workspace takes the list as it stands; a DAT Add on an unsorted base walks it as 0x492728 does; an Sp edit refreshes.
  // 'b' enters before 'a' with RA 0 and then gets RA 5: the list (t,5),(t,3) is not sorted under 0x546db4.
  let u=photometer(EMPTY_OBSERVATION_LIST,'a',JD,false,{ra:3,dec:1,bands:band(1,2)}).list;u=photometer(u,'b',JD,false,{ra:5,dec:1,bands:band(1,2)}).list;
  const wrapped=listOrderNativeResultList(observationListData(u));expect(wrapped.data.records.map(r=>r.object)).toEqual(['b','a']);
  const edited=commitNativeRecordEdit(wrapped.data,openNativeRecordEdit(wrapped.data,0),{remarks:'ok'});
  expect(refreshNativeResultList(wrapped,edited).data.records[0]!.remarks).toBe('ok');
  const add=(ra:number)=>appendNativeResultList(wrapped,observationListData(photometer(EMPTY_OBSERVATION_LIST,'c',JD,false,{ra,dec:1,bands:band(1,2)}).list)).data.records.map(r=>r.object);
  expect(add(4)).toEqual(['b','a','c']);// (t,4) > the tail (t,3): after it
  expect(add(1)).toEqual(['c','b','a']);// back to the head (t,5) > (t,1): before it
  expect(add(5)).toEqual(['b','a','c']);
  // A sorted base is still ordered by the reader's insertion.
  expect(buildNativeResultList(observationListData(u)).data.records.map(r=>r.object)).toEqual(['a','b']);
 });
 it('migration of an older file: photometer rows, then Hubble records, each through 0x54a814, never merged across routes',()=>{
  const m=migrateObservationList({photometer:[{id:'N4889',time:JD+2,ra:13,dec:28,kind:1,bands:band(14,13),spectralCode:0,remarks:'p'}],
   hubble:[{id:'N4889',jd:JD+1,ra:13.01,dec:27.9,zSingle:Math.fround(0.02),velocitySingle:Math.fround(6000),spectralCode:0,remarks:'h',vMagnitude:null},{id:'N4874',jd:JD+3,ra:13,dec:27.9,zSingle:Math.fround(0.024),velocitySingle:0,spectralCode:0,remarks:'',vMagnitude:Math.fround(12.6)}]});
  expect(m.records.map(r=>[r.id,r.remarks])).toEqual([['N4889','h'],['N4889','p'],['N4874','']]);
  expect(m.records[2]!.bands).toEqual([0,0,Math.fround(12.6),0,0]);
  expect(sameObservationList(m,migrateObservationList({photometer:[{id:'N4889',time:JD+2,ra:13,dec:28,kind:1,bands:band(14,13),spectralCode:0,remarks:'p'}],hubble:[{id:'N4889',jd:JD+1,ra:13.01,dec:27.9,zSingle:Math.fround(0.02),velocitySingle:Math.fround(6000),spectralCode:0,remarks:'h',vMagnitude:null},{id:'N4874',jd:JD+3,ra:13,dec:27.9,zSingle:Math.fround(0.024),velocitySingle:0,spectralCode:0,remarks:'',vMagnitude:Math.fround(12.6)}]}))).toBe(true);
  expect(migrateObservationList({photometer:[],hubble:[]}).records).toEqual([]);
 });
 it('the portable form round-trips exactly and refuses what the list cannot hold',()=>{
  let l=photometer(EMPTY_OBSERVATION_LIST,'S',JD,false,{ra:1.5,dec:-0,bands:band(Math.PI,1/3)},{remarks:'é €',spectralCode:0}).list;
  l=hubble(l,'G',JD+1,false,{z:Math.fround(0.123),ra:23.9,dec:-45,vMagnitude:null},true).list;
  expect(l.records[0]!.dec).toBe(0);expect(Object.is(l.records[0]!.dec,-0)).toBe(false);
  const text=JSON.stringify(portableObservationList(l)),back=readObservationList(JSON.parse(text));
  expect(sameObservationList(back,l)).toBe(true);expect(JSON.stringify(portableObservationList(back))).toBe(text);
  const bad=(f:(r:Record<string,unknown>)=>void)=>{const v=JSON.parse(text);f(v[0]);return ()=>readObservationList(v);};
  expect(bad(r=>{r.kind=2;})).toThrow(ObservationListError);expect(bad(r=>{r.id='';})).toThrow();expect(bad(r=>{r.id='x'.repeat(16);})).toThrow();
  expect(bad(r=>{r.z=0.1;})).toThrow();expect(bad(r=>{r.ra=24;})).toThrow();expect(bad(r=>{r.jd=1;})).toThrow();expect(bad(r=>{r.extra=1;})).toThrow();
  expect(bad(r=>{r.remarks='\u0001';})).toThrow();expect(bad(r=>{(r.bands as number[]).pop();})).toThrow();expect(bad(r=>{r.spectralCode=-1;})).toThrow();
  expect(()=>readObservationList(Array(OBSERVATION_LIST_MAX+1).fill(JSON.parse(text)[0]))).toThrow();
  expect(observationListJd(1)).toBeNull();expect(observationListJd(null)).toBeNull();expect(observationListJd(JD)).toBe(JD);
 });
 it('review 1: −0 is stored as +0 on every route; Cancel keeps the pre-dialog record; ANSI copy; shared Dec bound; migration limit',()=>{
  // H1: a Single z of −0 (reachable in the analyzer), −0 bands and pointing.
  let l=hubble(EMPTY_OBSERVATION_LIST,'G',JD,false,{z:-0,ra:-0,dec:-0,vMagnitude:-0}).list;
  const r=l.records[0]!;expect([r.z,r.ra,r.dec,r.bands[2]].every(v=>Object.is(v,0))).toBe(true);
  l=photometer(l,'G',JD,false,{ra:1,dec:-0,bands:[-0,-0,-0,-0,-0]}).list;expect(l.records[0]!.bands.every(v=>Object.is(v,0))).toBe(true);
  expect(sameObservationList(readObservationList(JSON.parse(JSON.stringify(portableObservationList(l)))),l)).toBe(true);
  expect(migrateObservationList({photometer:[],hubble:[{id:'G',jd:JD,ra:1,dec:-0,zSingle:-0,velocitySingle:-0,spectralCode:0,remarks:'',vMagnitude:null}]}).records[0]!.z).toBe(0);
  // M1: Cancel commits what 0x54a73c and the route wrote before ShowModal, without OK's remarks or Sp.
  const p=observationListFindOrAdd(EMPTY_OBSERVATION_LIST,'HD 1',null,false),cancelled=observationListClassifier(p.list,p.index,{ra:4,dec:5});
  expect(cancelled.records[0]).toMatchObject({id:'HD 1',jd:null,ra:4,dec:5,remarks:'',spectralCode:0});
  // H2: the migrated copy of remarks; L4: the classifier metadata's Dec bound.
  expect(observationListAnsi('Hα line 😀 é')).toBe('H? line ? é');
  expect(observationListClassifier(p.list,p.index,{ra:4,dec:90.00000005}).records[0]!.dec).toBe(90.00000005);
  expect(()=>observationListClassifier(p.list,p.index,{ra:4,dec:90.0000001})).toThrow(ObservationListError);
  // L3: more records than the list holds.
  const many=Array.from({length:OBSERVATION_LIST_MAX+1},(_,i)=>({id:'H'+i,jd:JD+i/10000,ra:1,dec:1,zSingle:0,velocitySingle:0,spectralCode:0,remarks:'',vMagnitude:null}));
  expect(()=>migrateObservationList({photometer:[],hubble:many})).toThrow(ObservationListError);
 });
 it('a full list refuses a new record but still reuses one',()=>{
  const records=Array.from({length:OBSERVATION_LIST_MAX},(_,i)=>Object.freeze({...EMPTY_REC,id:'s'+i,jd:JD+i/1000}));
  const full:ObservationList=Object.freeze({records:Object.freeze(records)});
  expect(()=>observationListFindOrAdd(full,'new',JD,false)).toThrow(ObservationListError);
  expect(observationListFindOrAdd(full,'s5',JD,false).index).toBe(5);
  expect(()=>observationListFindOrAdd(full,'s5',JD,true)).toThrow(ObservationListError);
 });
});
const EMPTY_REC:ObservationListRecord=Object.freeze({id:'x',jd:null,ra:0,dec:0,bands:Object.freeze([0,0,0,0,0]),kind:1,spectralCode:0,z:0,velocity:0,remarks:''});
