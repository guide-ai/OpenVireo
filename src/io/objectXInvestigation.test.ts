import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {buildObservableList,movingPairs,type ObservableList} from '../core/asteroidField';
import {createHash} from 'node:crypto';
import {replayStaticExposure} from './objectXImage';
import type {CameraExtract} from './cameraCatalog';
import {ObjectXSessionError,OBJECT_X_INVESTIGATION_POLICY,admitObjectXInvestigation,portableObjectXInvestigation,setObjectXResources,type ObjectXInvestigation} from './objectXInvestigation';
import {readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';
import {LSS_INVESTIGATION_POLICY} from './lssInvestigation';

const orbitBytes=(id:string)=>new Uint8Array(readFileSync(new URL(`../../public/original/orbit/${id}`,import.meta.url)));
const sav=orbitBytes('ObjX_MPC.CMO.sav'),ast=orbitBytes('ObjX_AST.CMO');
const fetched:string[]=[];
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);fetched.length=0;setObjectXResources({orbit:async id=>{fetched.push(id);if(id==='ObjX_MPC.CMO.sav')return sav;if(id==='ObjX_AST.CMO')return ast;throw Error('not in test');}});});
afterEach(()=>{vi.unstubAllGlobals();setObjectXResources(null);});
const read=(text:string)=>readAnalysisSession(new File([text],'objx.json'));
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
const JD=2454983.5+4/24,EROS={ra:22.722017,dec:-8.03989};
const list=buildObservableList(sav,1,JD)!;
function exposure(jd:number,seconds=120,orbit:{id:'ObjX_MPC.CMO.sav'|'ObjX_AST.CMO';bytes:Uint8Array;list:ObservableList;limit:number}={id:'ObjX_MPC.CMO.sav',bytes:sav,list,limit:16}){
 return {jd,seconds,filter:2,gain:2,telescope:0 as const,ra:EROS.ra,dec:EROS.dec,seed:12345,catalogMode:'live' as const,catalogSha256:'a'.repeat(64),extractId:null,
  listJd:JD,orbitFile:orbit.id,limit:orbit.limit,pairs:movingPairs(orbit.bytes,orbit.list,EROS,jd,seconds).pairs.length,skipped:[] as readonly ('moving-pair-budget')[],fitsSha256:'b'.repeat(64)};
}
function investigation():ObjectXInvestigation{
 const e1={...exposure(JD),skipped:['moving-pair-budget'] as const},e2=exposure(JD+1/24);
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
  await expect(tamper(o=>{o.exposures[0].pairs+=1;})).rejects.toMatchObject({code:'replay'});
  await expect(tamper(o=>{o.exposures[0].jd+=0.5;})).rejects.toMatchObject({code:'digest'});
  await expect(tamper(o=>{o.exposures[0].skipped=['moving-pair-elsewhere'];})).rejects.toMatchObject({code:'record'});
  await expect(tamper(o=>{o.exposures[0].skipped=Array(o.exposures[0].pairs+1).fill('moving-pair-budget');})).rejects.toMatchObject({code:'record'});
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

describe('v28 review 2 fixes',()=>{
 it('H2: changing the limiting magnitude after an exposure keeps Save working and replays the exposure with its own limit',async()=>{
  const inv={...investigation(),limit:12};// the student lowered the limit after imaging Eros (V 14.2) at 16
  expect(inv.exposures[0].pairs).toBeGreaterThan(0);
  const v=JSON.parse(await serializeAnalysisSession({...base,objectX:inv}));
  expect(v.objectX.limit).toBe(12);expect(v.objectX.exposures[0].limit).toBe(16);
  expect((await read(JSON.stringify(v))).objectX).toEqual(inv);
 });
 it('H2: changing the orbit file after an exposure keeps Save working and the file names the orbit file each image used',async()=>{
  const astList=buildObservableList(ast,0,JD)!;
  const e=exposure(JD,120,{id:'ObjX_AST.CMO',bytes:ast,list:astList,limit:16});
  const inv={...investigation(),orbitFile:'ObjX_MPC.CMO.sav' as const,exposures:[e,investigation().exposures[1]]};
  const v=JSON.parse(await serializeAnalysisSession({...base,objectX:inv}));
  expect(v.objectX.exposures.map((x:{orbitFile:string})=>x.orbitFile)).toEqual(['ObjX_AST.CMO','ObjX_MPC.CMO.sav']);
  expect((await read(JSON.stringify(v))).objectX).toEqual(inv);expect(fetched).toContain('ObjX_AST.CMO');
  // Claiming the other orbit file for that image changes the replayed pairs: the digest no longer matches.
  const forged=JSON.parse(JSON.stringify(v));forged.objectX.exposures[0].orbitFile='ObjX_MPC.CMO.sav';
  await expect(read(JSON.stringify(forged))).rejects.toThrow();
  // A list is date, orbit file and limit together, or nothing.
  const half=JSON.parse(JSON.stringify(v));half.objectX.exposures[0].limit=null;
  await expect(read(JSON.stringify(half))).rejects.toThrow();
 });
 it('M3: the answer, reveal flag, marks, object code and ID are in the digest',async()=>{
  const {objectX,digest}=await portableObjectXInvestigation(investigation());
  for(const edit of [(o:any)=>{o.answer='star';},(o:any)=>{o.revealed=false;},(o:any)=>{o.log[1].x+=5;},(o:any)=>{o.target='X-ZZZZZ';},(o:any)=>{o.id='99';},(o:any)=>{o.description='edited';}]){
   const o=JSON.parse(JSON.stringify(objectX));edit(o);
   await expect(admitObjectXInvestigation(o,digest)).rejects.toMatchObject({code:'digest'});
  }
 },30_000);// About 4.8 s alone: five digest re-checks of a full investigation; the 5 s default fails under any load.
 it('M3: a static-catalogue exposure is recomposed on restore and must give its FITS SHA-256',async()=>{
  // AUTHORED extract over the recorded VizieR response (tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml); not a bundled extract.
  const xml=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
  const sha=createHash('sha256').update(xml).digest('hex');
  const extract:CameraExtract={id:'test-pleiades',catalog:'I/297',raDegrees:56.75,decDegrees:24.12,radiusDegrees:1,file:'test.xml',sha256:sha,bytes:xml.length,recordedAt:'2026-10-27',request:'https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.75&DEC=24.12&SR=1',host:'vizier.cds.unistra.fr'};
  const catalog={extracts:[extract],extractBase:'/',fetchImpl:(async()=>new Response(xml)) as unknown as typeof fetch};
  setObjectXResources({orbit:async()=>sav,catalog});
  const recipe={camera:'ccd' as const,opticalIndex:0 as const,filterPosition:2,seconds:5,gain:2,centerRaHours:56.75/15,centerDecDegrees:24.12,seed:99};
  const jd=2454983.7,made=await replayStaticExposure(recipe,jd,[],catalog);if(!made.ok)throw Error(made.reason);
  const fitsSha256=createHash('sha256').update(made.fits).digest('hex');
  const e={jd,seconds:5,filter:2,gain:2,telescope:0 as const,ra:recipe.centerRaHours,dec:24.12,seed:99,catalogMode:'static' as const,catalogSha256:sha,extractId:'test-pleiades',
   listJd:null,orbitFile:null,limit:null,pairs:0,skipped:[],fitsSha256};
  const inv={...investigation(),exposures:[e],images:[{sha256:fitsSha256,label:'ObjX-42-01',jd,exposure:0}],measure:null,log:[]};
  const {objectX,digest}=await portableObjectXInvestigation(inv);
  expect(await admitObjectXInvestigation(objectX,digest)).toEqual(inv);
  const o=JSON.parse(JSON.stringify(objectX));o.exposures[0].seed=100;
  await expect(admitObjectXInvestigation(o,digest)).rejects.toMatchObject({code:'replay'});
 },30_000);
 it('Front C6: an exposure records its field anchor and replays with that region; records without one replay with the whole sky',async()=>{
  const xml=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
  const sha=createHash('sha256').update(xml).digest('hex');
  const extract:CameraExtract={id:'test-pleiades',catalog:'I/297',raDegrees:56.75,decDegrees:24.12,radiusDegrees:1,file:'test.xml',sha256:sha,bytes:xml.length,recordedAt:'2026-10-27',request:'https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.75&DEC=24.12&SR=1',host:'vizier.cds.unistra.fr'};
  const catalog={extracts:[extract],extractBase:'/',fetchImpl:(async()=>new Response(xml)) as unknown as typeof fetch};
  setObjectXResources({orbit:async()=>sav,catalog});
  const recipe={camera:'ccd' as const,opticalIndex:0 as const,filterPosition:0,seconds:5,gain:2,centerRaHours:56.75/15,centerDecDegrees:24.12,seed:99};
  // NF selects the recorded row (R band). A telescope that drifted 0.38° north of the loaded field: the recorded row (Dec 24.12) is outside its region and is dropped.
  const fieldAnchor={ra:recipe.centerRaHours,dec:24.12-.38},jd=2454983.7;
  const whole=await replayStaticExposure(recipe,jd,[],catalog),cut=await replayStaticExposure(recipe,jd,[],catalog,fieldAnchor),same=await replayStaticExposure(recipe,jd,[],catalog,{ra:recipe.centerRaHours,dec:24.12});
  if(!whole.ok||!cut.ok||!same.ok)throw Error('replay');
  const h=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
  expect(h(cut.fits)).not.toBe(h(whole.fits));expect(h(same.fits)).toBe(h(whole.fits));
  const e={jd,seconds:5,filter:0,gain:2,telescope:0 as const,ra:recipe.centerRaHours,dec:24.12,seed:99,catalogMode:'static' as const,catalogSha256:sha,extractId:'test-pleiades',
   listJd:null,orbitFile:null,limit:null,pairs:0,skipped:[],fitsSha256:h(cut.fits),fieldAnchor};
  const inv={...investigation(),exposures:[e],images:[],measure:null,log:[]};
  const {objectX,digest}=await portableObjectXInvestigation(inv);
  expect((objectX as {exposures:{fieldAnchor?:unknown}[]}).exposures[0].fieldAnchor).toEqual(fieldAnchor);
  expect(await admitObjectXInvestigation(objectX,digest)).toEqual(inv);
  const o=JSON.parse(JSON.stringify(objectX));delete o.exposures[0].fieldAnchor;
  await expect(admitObjectXInvestigation(o,digest)).rejects.toMatchObject({code:'replay'});
  const bad=JSON.parse(JSON.stringify(objectX));bad.exposures[0].fieldAnchor={ra:24,dec:0};
  await expect(admitObjectXInvestigation(bad,digest)).rejects.toThrow();
 },30_000);
});

// Review 3 L2 timing (opt-in, slow by design): Save of a v28 part with 64 static-catalogue exposures recomposes all 64 images.
// Run with OBJX_SAVE_TIMING=1; the measured time is reported in docs/OBJECT-X.md.
describe.runIf(process.env.OBJX_SAVE_TIMING)('v28 Save timing',()=>{
 it('64 static exposures',async()=>{
  const xml=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
  const sha=createHash('sha256').update(xml).digest('hex');
  const extract:CameraExtract={id:'test-pleiades',catalog:'I/297',raDegrees:56.75,decDegrees:24.12,radiusDegrees:1,file:'test.xml',sha256:sha,bytes:xml.length,recordedAt:'2026-10-27',request:'https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.75&DEC=24.12&SR=1',host:'vizier.cds.unistra.fr'};
  const catalog={extracts:[extract],extractBase:'/',fetchImpl:(async()=>new Response(xml)) as unknown as typeof fetch};
  setObjectXResources({orbit:async()=>sav,catalog});
  const exposures=[];
  for(let k=0;k<64;k++){
   const recipe={camera:'ccd' as const,opticalIndex:0 as const,filterPosition:2,seconds:60,gain:2,centerRaHours:56.75/15,centerDecDegrees:24.12,seed:1000+k};
   const jd=2454983.7+k/1440,made=await replayStaticExposure(recipe,jd,[],catalog);if(!made.ok)throw Error(made.reason);
   exposures.push({jd,seconds:60,filter:2,gain:2,telescope:0 as const,ra:recipe.centerRaHours,dec:24.12,seed:recipe.seed,catalogMode:'static' as const,catalogSha256:sha,extractId:'test-pleiades',
    listJd:null,orbitFile:null,limit:null,pairs:0,skipped:[],fitsSha256:createHash('sha256').update(made.fits).digest('hex')});
  }
  const inv={...investigation(),exposures,images:[],measure:null,log:[]};
  const t0=performance.now();await portableObjectXInvestigation(inv);const ms=performance.now()-t0;
  process.stderr.write(`OBJX_SAVE_TIMING 64 static exposures: ${(ms/1000).toFixed(1)} s (${(ms/64).toFixed(0)} ms each)\n`);
  expect(ms).toBeGreaterThan(0);
 },600_000);
});

describe('RE5 review 1 M1: exposures saved before the 59:59 limit',()=>{
 it('a v28 session file with a 60:00 exposure (written before RE5) still restores, with its Hubble base, and replays',async()=>{
  const text=readFileSync(new URL('../../tests/fixtures/objectx-v28-60min.json',import.meta.url),'utf8');
  expect(JSON.parse(text).objectX.exposures[0].seconds).toBe(3600);
  const back=await read(text);expect(back.objectX?.exposures[0].seconds).toBe(3600);expect(back.objectX?.exposures[0].pairs).toBe(exposure(JD,3600).pairs);
  expect(back.hubble).toEqual(EMPTY_HUBBLE);
  const over=JSON.parse(text);over.objectX.exposures[0].seconds=3601;await expect(read(JSON.stringify(over))).rejects.toBeTruthy();
 });
});
