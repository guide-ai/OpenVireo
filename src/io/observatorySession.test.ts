import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {pulsarMemoryRecording} from '../core/pulsarCurrentData';
import {pulsarDataSnapshot} from '../core/radioInvestigation';
import {parseStationDraft,stationDraft} from '../core/observatorySite';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {compiledObservatorySite} from '../core/observatorySite';
import {OBSERVATORY_SESSION_POLICY,readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';

// Front B B10 (v26) chosen contract: options and site overrides wrap an unchanged base, outermost.
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
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

 it('F1: a Greenwich site entered with West, the equator with South and typed "-0" fields save and restore',async()=>{
  const d=stationDraft(compiledObservatorySite(0));
  const r=parseStationDraft({...d,name:'Greenwich',lngDeg:'0',lngMin:'0',lngSec:'0',ew:1,latDeg:'0',latMin:'0',latSec:'0',ns:1,utLocal:'-0',altitude:'-0',horizon:'-0'});
  expect(r.status).toBe('ok');if(r.status!=='ok')return;
  for(const v of [r.site.longitudeRadians,r.site.latitudeRadians,r.site.utMinusLocalHours,r.site.heightMetres,r.site.horizonRadians])expect(Object.is(v,0)).toBe(true);
  const text=await serializeAnalysisSession({...base,observatory:{options:{limitSlewing:false},siteOverrides:{0:r.site}}});
  expect((await read(text)).observatory?.siteOverrides[0]).toEqual(r.site);
  // A file that encodes −0 with the session codec ("-0") is admitted and normalized to 0.
  const v=JSON.parse(text);v.observatory.siteOverrides['0'].longitudeRadians='-0';
  expect(Object.is((await read(JSON.stringify(v))).observatory!.siteOverrides[0]!.longitudeRadians,0)).toBe(true);
 });
 it('F9: rejects a crafted longitude just over π (and latitude/horizon just over π/2)',async()=>{
  const v=JSON.parse(await serializeAnalysisSession({...base,observatory:{options:{limitSlewing:false},siteOverrides:{0:site}}}));
  const over=(x:number)=>{const b=new DataView(new ArrayBuffer(8));b.setFloat64(0,x);b.setBigUint64(0,b.getBigUint64(0)+1n);return b.getFloat64(0);};
  for(const [k,x] of [['longitudeRadians',over(Math.PI)],['latitudeRadians',over(Math.PI/2)],['horizonRadians',-over(Math.PI/2)]] as const){
   const bad=structuredClone(v);bad.observatory.siteOverrides['0'][k]=x;await expect(read(JSON.stringify(bad))).rejects.toBeTruthy();
  }
  const edge=structuredClone(v);edge.observatory.siteOverrides['0'].longitudeRadians=-Math.PI;expect((await read(JSON.stringify(edge))).observatory!.siteOverrides[0]!.longitudeRadians).toBe(-Math.PI);
 });
 it('wraps a v23 radio base unchanged',async()=>{
  const capture=pulsarMemoryRecording({captureId:3,name:'SYN',aperture:100,highestIndex:0,frequencies:[400,null,null],gains:[1,null,null],start:51544.5,interval:0.01,rows:[-0,1,2],full:false});
  const radio={snapshot:{workspace:null,data:pulsarDataSnapshot(capture),analysis:null},prepared:null};
  const v23=JSON.parse(await serializeAnalysisSession({...base,radio}));expect(v23.version).toBe(23);
  const text=await serializeAnalysisSession({...base,radio,observatory:{options:{limitSlewing:true},siteOverrides:{}}}),v=JSON.parse(text);
  expect(v.version).toBe(26);expect(v.base).toEqual(v23);
  const back=await read(text);expect(back.observatory?.options.limitSlewing).toBe(true);expect(back.radio).toBeDefined();
 });
});
