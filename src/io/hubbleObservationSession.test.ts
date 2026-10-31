import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {createGalaxyObservation} from './galaxyObservation';
import {activateGalaxy,createGalaxyExposure,pauseGalaxy,startGalaxy,tickGalaxy} from '../core/galaxyExposure';
import {serializeAnalysisSession,readAnalysisSession,type AnalysisSession} from './analysisSession';
import {createMeasurement,INITIAL_CONTROL} from '../core/spectrum';
import {analyzeHubble} from '../core/hubbleAnalysis';
import {confirmHubbleObservation,openHubbleObservation,HUBBLE_OBSERVATION_POLICY,type HubbleObservation} from '../core/hubbleObservation';
import {hubbleObservationTarget} from './hubbleObservationTarget';
// Front H2: session v32 carries the Observational Data records of catalogue-galaxy measurements around an unchanged base.
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const read=(s:string)=>readAnalysisSession(new File([s],'hubble-observation.json'));
const acquire=(id:string)=>createGalaxyObservation(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(1,id))),1000)));
async function session(withObservation:boolean):Promise<AnalysisSession>{
 const a=await acquire('36773'),control={...INITIAL_CONTROL,step:.001,position:17};
 const m=createMeasurement(1,'36773',a.name,a.sha256,control,'GLXYLNS.LST',{kind:a.kind,acquisitionId:a.acquisitionId,targetId:a.targetId});
 let observation:HubbleObservation|undefined;
 if(withObservation){
  const t=hubbleObservationTarget(a),d=openHubbleObservation({id:m.object,jd:2455000.5,ra:t.ra,dec:t.dec,zSingle:m.zFloat32,targetMagnitude:t.magnitude,computeRedshiftVelocity:false,reused:null});
  const r=confirmHubbleObservation(d,{velocityText:String(Math.round(299792.458*m.zFloat32*1.004)),remarks:'typed',spText:''});if(!r.ok)throw Error(r.message);observation=r.observation;
 }
 const row=observation?{...m,observation}:m;
 const hubble={recipeId:'vireo' as const,rows:[{id:1,input:{kind:'measurement' as const,measurementId:1,apparentVText:'15.8',magnitudeSource:'Hubble Data.xls · Sheet1!C3',targetId:'36773'}}]};
 return {observation:a,acquisitions:[a],rows:[row],control,stepInput:'.001',reference:'galaxy',wide:false,object:'36773',hubble};
}
describe('Front H2 session v32 (Hubble Observational Data)',()=>{
 it('round-trips the typed velocity around an unchanged base; older sessions keep their version and bytes',async()=>{
  const plain=await serializeAnalysisSession(await session(false)),typed=await serializeAnalysisSession(await session(true)),v=JSON.parse(typed);
  expect(v.version).toBe(32);expect(v.hubbleObservationPolicy).toBe(HUBBLE_OBSERVATION_POLICY);expect(JSON.stringify(v.base,null,2)+'\n').toBe(plain);
  expect(v.observations).toHaveLength(1);expect(v.observations[0][0]).toBe(1);
  const restored=await read(typed);expect(restored.rows[0].observation?.remarks).toBe('typed');
  expect(await serializeAnalysisSession(restored)).toBe(typed);
  expect(await serializeAnalysisSession(await read(plain))).toBe(plain);// an older file restores and re-saves byte-identically
 },60000);
 it('rejects a velocity outside 1 %, a moved target position, an unknown row and nesting',async()=>{
  const v=JSON.parse(await serializeAnalysisSession(await session(true)));
  const hex=(x:number)=>{const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,x,false);return b.getUint32(0,false).toString(16).padStart(8,'0');};
  const bad=(f:(c:typeof v)=>void)=>{const c=structuredClone(v);f(c);return read(JSON.stringify(c));};
  await expect(bad(c=>{c.observations[0][1].velocityHex=hex(1);})).rejects.toThrow();
  await expect(bad(c=>{c.observations[0][1].ra+=1e-6;})).rejects.toThrow();
  await expect(bad(c=>{c.observations[0][0]=2;})).rejects.toThrow();
  await expect(bad(c=>{c.base={...c};})).rejects.toThrow();
 },60000);
 it('the Hubble analysis uses the typed velocity of a row that has one, and c·z otherwise',async()=>{
  const typed=await session(true),derived=await session(false);
  const vt=analyzeHubble(typed.hubble,typed.rows).rows[0],vd=analyzeHubble(derived.hubble,derived.rows).rows[0];
  expect(vt.velocityKmS).toBe(typed.rows[0].observation!.velocitySingle);expect(vt.velocitySource).toContain('typed in Observational Data');
  expect(vd.velocitySource).toContain('v = c z');expect(Math.abs(vt.velocityKmS!-vd.velocityKmS!)/vd.velocityKmS!).toBeLessThan(.01);
 });
});
