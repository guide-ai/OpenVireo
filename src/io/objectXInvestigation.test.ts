import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {buildObservableList,movingPairs} from '../core/asteroidField';
import {ObjectXSessionError,OBJECT_X_INVESTIGATION_POLICY,admitObjectXInvestigation,portableObjectXInvestigation,setObjectXResources,type ObjectXInvestigation} from './objectXInvestigation';
import {readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';
import {LSS_INVESTIGATION_POLICY} from './lssInvestigation';

const sav=new Uint8Array(readFileSync(new URL('../../public/original/orbit/ObjX_MPC.CMO.sav',import.meta.url)));
const fetched:string[]=[];
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);fetched.length=0;setObjectXResources({orbit:async id=>{fetched.push(id);if(id!=='ObjX_MPC.CMO.sav')throw Error('not in test');return sav;}});});
afterEach(()=>{vi.unstubAllGlobals();setObjectXResources(null);});
const read=(text:string)=>readAnalysisSession(new File([text],'objx.json'));
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
const JD=2454983.5+4/24,EROS={ra:22.722017,dec:-8.03989};
const list=buildObservableList(sav,1,JD)!;
function exposure(jd:number,seconds=120){
 return {jd,seconds,filter:2,gain:2,telescope:0 as const,ra:EROS.ra,dec:EROS.dec,seed:12345,catalogMode:'live' as const,catalogSha256:'a'.repeat(64),extractId:null,
  listJd:JD,pairs:movingPairs(sav,list,EROS,jd,seconds).pairs.length,skipped:0,fitsSha256:'b'.repeat(64)};
}
function investigation():ObjectXInvestigation{
 const e1=exposure(JD),e2=exposure(JD+1/24);
 return {orbitFile:'ObjX_MPC.CMO.sav',id:'42',target:'X-1ABCD',startUtc:'2009-06-01T04:00:00',clockSet:true,listJd:JD,limit:16,exposures:[e1,e2],
  images:[{sha256:e1.fitsSha256,label:'ObjX-42-01',jd:e1.jd,exposure:0},{sha256:'c'.repeat(64),label:'ObjX-42-02',jd:e2.jd,exposure:1}],
  measure:{first:0,second:1},
  log:[{frame:0,role:'reference',x:10.5,y:20.25,jd:e1.jd,catalog:{raHours:22.7,decDeg:-8}},{frame:0,role:'target',x:512.2,y:511.9,jd:e1.jd},{frame:1,role:'target',x:512.2,y:520.1,jd:e2.jd}],
  answer:'asteroid',description:'It moved.\nTwo images.',revealed:true};
}

describe('v28 Object X investigation',()=>{
 it('round-trips around an unchanged base, also over a v27 LSS base, replaying the moving pairs',async()=>{
  const inv=investigation();expect(inv.exposures[0].pairs).toBeGreaterThan(0);
  const plain=JSON.parse(await serializeAnalysisSession(base)),text=await serializeAnalysisSession({...base,objectX:inv}),v=JSON.parse(text);
  expect(v.version).toBe(28);expect(v.objectXPolicy).toBe(OBJECT_X_INVESTIGATION_POLICY);expect(v.base).toEqual(plain);expect(v.objectXDigestSHA256).toMatch(/^[a-f0-9]{64}$/);
  const back=await read(text);expect(back.objectX).toEqual(inv);expect(fetched).toContain('ObjX_MPC.CMO.sav');
  const lss={field:null,telescope:0 as const,records:[],description:'notes',wedgeOptions:null};
  const both=JSON.parse(await serializeAnalysisSession({...base,lss,objectX:inv}));
  expect(both.version).toBe(28);expect(both.base.version).toBe(27);expect(both.base.lssPolicy).toBe(LSS_INVESTIGATION_POLICY);
  const restored=await read(JSON.stringify(both));expect(restored.objectX).toEqual(inv);expect(restored.lss?.description).toBe('notes');
  expect((await read(JSON.stringify(plain))).objectX).toBeUndefined();
 });
 it('needs no orbit file when no exposure used an asteroid list',async()=>{
  const inv={...investigation(),exposures:[],images:[],measure:null,log:[],listJd:null,revealed:false,answer:null};
  const {objectX,digest}=await portableObjectXInvestigation(inv);
  expect(await admitObjectXInvestigation(objectX,digest)).toEqual(inv);expect(fetched).toEqual([]);
 });
 it('rejects a tampered digest, pair count, nested v28, reveal before answer and out-of-range marks',async()=>{
  const {objectX,digest}=await portableObjectXInvestigation(investigation());
  await expect(admitObjectXInvestigation(objectX,'0'.repeat(64))).rejects.toMatchObject({code:'digest'});
  const tamper=(f:(o:any)=>void)=>{const o=JSON.parse(JSON.stringify(objectX));f(o);return admitObjectXInvestigation(o,digest);};
  await expect(tamper(o=>{o.exposures[0].pairs+=1;o.exposures[0].skipped=0;})).rejects.toMatchObject({code:'replay'});
  await expect(tamper(o=>{o.exposures[0].jd+=0.5;})).rejects.toMatchObject({code:'digest'});
  await expect(tamper(o=>{o.answer=null;})).rejects.toMatchObject({code:'record'});
  await expect(tamper(o=>{o.log[0].frame=2;})).rejects.toMatchObject({code:'record'});
  await expect(tamper(o=>{o.log[0].catalog={raHours:25,decDeg:0};})).rejects.toMatchObject({code:'record'});
  await expect(tamper(o=>{o.target='Eros';})).rejects.toMatchObject({code:'record'});
  await expect(tamper(o=>{o.extra=1;})).rejects.toMatchObject({code:'format'});
  await expect(tamper(o=>{o.description='x'.repeat(4001);})).rejects.toBeInstanceOf(ObjectXSessionError);
  const v=JSON.parse(await serializeAnalysisSession({...base,objectX:investigation()}));
  await expect(read(JSON.stringify({...v,base:v}))).rejects.toThrow();
  await expect(read(JSON.stringify({...v,objectXDigestSHA256:'f'.repeat(64)}))).rejects.toThrow();
 });
});
