import {describe,expect,it} from 'vitest';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {compiledObservatorySite} from '../core/observatorySite';
import {OBSERVATORY_SESSION_POLICY,readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';

// Front B B10 (v26) chosen contract: options and site overrides wrap an unchanged base, outermost.
const read=(text:string)=>readAnalysisSession(new File([text],'observatory.json'));
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
const site={...compiledObservatorySite(1),name:'Student site',horizonRadians:5*Math.PI/180,utMinusLocalHours:Math.fround(-1)};
describe('v26 observatory session',()=>{
 it('round-trips options and site overrides around an unchanged base',async()=>{
  const plain=JSON.parse(await serializeAnalysisSession(base));
  const text=await serializeAnalysisSession({...base,observatory:{options:{limitSlewing:true},siteOverrides:{1:site}}}),v=JSON.parse(text);
  expect(v.version).toBe(26);expect(v.observatoryPolicy).toBe(OBSERVATORY_SESSION_POLICY);expect(v.base).toEqual(plain);
  const back=await read(text);expect(back.observatory).toEqual({options:{limitSlewing:true},siteOverrides:{1:site}});
  expect((await read(JSON.stringify(plain))).observatory).toBeUndefined();
 });
 it('rejects tampered policy, options, overrides and nesting atomically',async()=>{
  const v=JSON.parse(await serializeAnalysisSession({...base,observatory:{options:{limitSlewing:false},siteOverrides:{0:site}}}));
  for(const bad of [{...v,observatoryPolicy:'x'},{...v,observatory:{...v.observatory,options:{limitSlewing:'yes'}}},{...v,observatory:{...v.observatory,siteOverrides:{0:{...site,utMinusLocalHours:20}}}},{...v,observatory:{...v.observatory,extra:1}},{...v,base:v}])
   await expect(read(JSON.stringify(bad))).rejects.toBeTruthy();
 });
});
