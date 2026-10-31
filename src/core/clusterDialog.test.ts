import {describe,expect,it} from 'vitest';
import contract from '../../data/photometry/cluster-comparison-contract.json';
import comments from '../../data/clusters/cluster-comments.json';
import certificate from '../../data/clusters/cluster-dialog-certificate.json';
import witness from './clusterList.witness.json';
import {clusterEmptyFieldText,CLUSTER_EMPTY_FIELD_CAPTION,CLUSTER_DIALOG_LITERALS as L,EMPTY_CLUSTER_RECORD,addClusterStudyRecord,clusterDataReport,clusterDialogActivate,clusterDialogKey,clusterDialogValidate,clusterEntireListStem,clusterStudyList,clusterUseTelescope,type ClusterDialogState} from './clusterDialog';
import type {ClusterReferencePoint} from './clusterDatabase';

const records=contract.clusters.map(c=>({id:c.id,name:c.name,ra:c.catalogRa,dec:c.catalogDec,diam:c.angularLimitArcmin,ebv:c.catalogEbvSingle,comment:comments.clusters.find(x=>x.id===c.id)!.comment}));
const state=(over:Partial<ClusterDialogState['fields']>={},type:0|1=1,sort:0|1=1):ClusterDialogState=>{
 const s=clusterDialogActivate({...EMPTY_CLUSTER_RECORD,name:'X',ra:5.5,dec:-12.25,diam:10,limit:0},false,false).state;
 return {...s,type,sort,fields:{...s.fields,...over}};
};

describe('TClstrDlgForm1 FormActivate 0x535a90 and OK 0x535e0c',()=>{
 it('fills the edits, sets a zero limit to 20.0, and without Edit Mode forces Student/RA disabled',()=>{
  const {record,state:s}=clusterDialogActivate({...EMPTY_CLUSTER_RECORD,name:'NGC 752',ra:1.9633333333333334,dec:37.68333333333333,diam:75,type:0,sort:0},false,true);
  expect(record.limit).toBe(20);expect(s.fields).toEqual({name:'NGC 752',raHours:'1',raMinutes:'57',raSeconds:'48.00',decDegrees:'37',decMinutes:'41',decSeconds:'0.0',diameter:'75.0',limit:'20.0'});
  expect([s.type,s.sort,s.groupsEnabled,s.useTelescope,s.useTelescopeEnabled]).toEqual([1,1,false,false,true]);
  const e=clusterDialogActivate({...EMPTY_CLUSTER_RECORD,type:0,sort:0,limit:12.5,dec:-0.5},true,false).state;
  expect([e.type,e.sort,e.groupsEnabled,e.fields.limit,e.fields.decDegrees]).toEqual([0,0,true,'12.5','0']);// −0°30′ shows "0"
 });
 it('Use Telescope Coordinates copies the pointing in the same formats',()=>{
  expect(clusterUseTelescope(state(),true,{ra:12.5,dec:-1.25}).fields).toMatchObject({raHours:'12',raMinutes:'30',raSeconds:'0.00',decDegrees:'-1',decMinutes:'15',decSeconds:'0.0'});
 });
 it('validates in VIREO order with its literals; a zero diameter is refused after name/RA/Dec/Diam are stored',()=>{
  const v=(o:Partial<ClusterDialogState['fields']>)=>clusterDialogValidate(EMPTY_CLUSTER_RECORD,state(o));
  expect(v({diameter:'x',limit:'x',raHours:'x'})).toMatchObject({status:'error',text:L.diameterInvalid});
  expect(v({limit:'x',raHours:'x'})).toMatchObject({text:L.limitInvalid});
  expect(v({raHours:'25'})).toMatchObject({text:L.raInvalid});expect(v({raHours:'24',raMinutes:'0',raSeconds:'0'}).status).toBe('ok');// 24 h accepted
  expect(v({decDegrees:'91'})).toMatchObject({text:L.decInvalid});
  const neg=v({decDegrees:'-0',decMinutes:'30',decSeconds:'0'});expect(neg.status==='ok'&&neg.record.dec).toBe(-0.5);
  const zero=v({diameter:'0',name:'Zed'});expect(zero).toMatchObject({status:'error',text:L.diameterZero});expect(zero.record).toMatchObject({name:'Zed',ra:5.5,dec:-12.25,diam:0,area:null});
  const ok=v({diameter:'10'});expect(ok.status).toBe('ok');
  if(ok.status==='ok'){const h=1.1*10/60;expect(ok.record.area).toEqual({minimumRa:5.5-h/(Math.cos(-12.25*Math.PI/180)*15),maximumRa:5.5+h/(Math.cos(-12.25*Math.PI/180)*15),minimumDec:-12.25-h,maximumDec:-12.25+h});expect([ok.record.type,ok.record.sort,ok.record.limit]).toEqual([1,1,20]);}
 });
});

describe('Front K census certificate (dialog route at the parsed key)',()=>{
 it('the web dialog key of every published cluster equals the certified key, and all 16 are certified equal',()=>{
  expect(certificate.clusters).toHaveLength(16);
  for(const c of contract.clusters){
   const cert=certificate.clusters.find(x=>x.id===c.id)!,key=clusterDialogKey({ra:c.catalogRa,dec:c.catalogDec,diam:c.angularLimitArcmin})!;
   expect([key.ra,key.dec,key.diam]).toEqual([cert.keyRa,cert.keyDec,cert.keyDiam]);expect(cert.equal).toBe(true);expect(cert.publishedCount).toBe(c.rows);expect(cert.recordsFainterThan25).toBe(0);
  }
 });
 it('carries no distance, age or modulus field',()=>{
  const text=JSON.stringify(certificate);for(const k of ['dist','logage','age','modulus','bv0','msto'])expect(text.toLowerCase()).not.toContain(`"${k}`);
 });
});

describe('TClstrListForm1 fill 0x532de8 / row 0x5333e4',()=>{
 it('student lines equal the witness for all 16 records',()=>{
  const l=clusterStudyList(records,false);expect(l.lines).toEqual(witness.listStudent);expect([l.first,l.last]).toEqual([7,22]);
 });
 it('Edit Mode shows E(B−V) but none of the unpublished catalogue columns',()=>{
  const l=clusterStudyList(records,true);
  expect(l.lines[5]).toBe('Name/ID                  Right Ascn. Declination Diam  E(B-V)  Comments ');
  expect(l.lines[7]).toBe('NGC 752                  01 57 48.0   +37 41 00    75   0.03   Old cluster');
  for(const s of ['MS TO','Dist','(V-Mv)','Age','parsecs','Distance Modulus','millions'])expect(l.lines.join('\n')).not.toContain(s);
 });
 it('Add Cluster to List inserts by RA with only name/RA/Dec/Diam; an empty list says so',()=>{
  const r=clusterDialogValidate(EMPTY_CLUSTER_RECORD,state({name:'Mine',raHours:'2',raMinutes:'0',raSeconds:'0',diameter:'5'}));
  if(r.status!=='ok')throw new Error();const next=addClusterStudyRecord(records,r.record);
  expect(next[1]).toMatchObject({name:'Mine',ra:2,ebv:null,comment:''});expect(clusterStudyList([],false).lines.at(-1)).toBe('No Clusters in Current List!');
 });
});

describe('TClstrRptForm1 from the dialog (0x534680, AL = 1)',()=>{
 const pts:ClusterReferencePoint[]=[{id:'N1@1',ra:3,dec:1,v:12,bMinusV:.5},{id:'N1@2',ra:1,dec:1,v:9,bMinusV:.1},{id:'N1@3',ra:2,dec:1,v:15,bMinusV:.9}] as unknown as ClusterReferencePoint[];
 const detail=(id:string)=>[`N0000-0000${id.slice(-1)}`,100,0,0] as const;
 it('Type 1 RA: the finding list (ID, RA, Dec), RA order, no photometry lines',()=>{
  const r=clusterDataReport('Test',1,1,20,pts,detail);if('unavailable' in r)throw new Error();
  expect(r.lines.slice(0,6)).toEqual(['Cluster Name/ID: Test','3 Stars','Positions are J2000.0','List sorted by Right Ascension.','','Name/ID           Right Ascn. Declination ']);
  expect(r.lines.slice(r.first).map(l=>l.slice(0,11))).toEqual(['N0000-00002','N0000-00003','N0000-00001']);expect(r.lines[r.first]).toBe('N0000-00002       01 00 00.0   +01 00 00   ');// three spaces appended at 0x53575f
 });
 it('Type 0 V with a limit: V ≤ limit only, V order, ranges and notes',()=>{
  const r=clusterDataReport('Test',0,0,12,pts,detail);if('unavailable' in r)throw new Error();
  expect(r.lines.slice(0,3)).toEqual(['Cluster Name/ID: Test','2 Stars','V = +9.00 to +12.00']);expect(r.lines).toContain('List sorted by apparent magnitude (V).');
  // Front G5: the bank carries the listed positions (ra 1 is N1@2, ra 3 is N1@1).
  expect(r.bank.map(p=>p.ra)).toEqual([1,3]);
 });
 it('Entire-list stem cuts before "("',()=>{expect(clusterEntireListStem('M 34 (NGC 1039)')).toBe('M 34');expect(clusterEntireListStem('Hyades')).toBe('Hyades');});
});

describe('empty reader result 0x53435b–0x534452 (review M1)',()=>{
 it('box text with the rectangle (6, 6, 5, 5 decimals) and the limit (3 decimals)',()=>{
  expect(CLUSTER_EMPTY_FIELD_CAPTION).toBe('No Stars Found in Field!');
  expect(clusterEmptyFieldText({minimumRa:1.5,maximumRa:2.25,minimumDec:-3.125,maximumDec:4},Math.fround(5))).toBe('Possible Error in Field Parameters:\r\n\r\nMinRA: 1.500000\r\nMaxRA: 2.250000\r\nMinDec: -3.12500\r\nMaxDec: 4.00000\r\nLimitMag: 5.000');
 });
 it('the certificate says for which clusters an empty filtered bank is exactly the empty reader result',()=>{
  expect(certificate.clusters.filter(c=>!c.brightestRectangleRecordInBank).map(c=>c.id).sort()).toEqual(['30dor','ic4665','m67','mel111']);
 });
});
