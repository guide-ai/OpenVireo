import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {env} from 'node:process';
import {parsePulsarCatalog,type PulsarCatalog} from './radioPulsarCatalog';
import {buildPulsarProfile,createPulsarProfile,pulsarActiveCount} from './radioPulsarProfile';
import {RadioSignalError,randomizeRadioStream} from './radioRandom';

// External original fixture (same hook as radioPulsarCatalog.original.test.ts): the shipped Pulsars.dat stays outside
// the repository. Unset OPENVIREO_PULSARS_DAT reports this suite as skipped by name; a supplied file of another
// SHA-256 fails. The aggregates below are ORIGINAL-CATALOG-DOMAIN-CONTROLS.json (independent input-domain counts, no
// profile execution); they are not a native profile oracle. No rows are embedded.
const FIXTURE=env.OPENVIREO_PULSARS_DAT;
const SHA256='ba94ee94c359e2afd4acce940266d69983d24a93893719cca20d3e23ef3dceaa';
const DOMAIN={
 x2a:{min:0.00155780644887275,max:5.09408,zero:0,negative:0},x34:{min:-3e-16,max:1.5401908e-12,zero:81,negative:5},
 epochRaw:{min:0,max:48861.3,zero:55,negative:0},s48:{min:13,max:569.7000122070312,zero:0,negative:0},
 s4c:{min:0,max:1074,zero:1,negative:0},s50:{min:0,max:740,zero:88,negative:0},
 s54:{min:0,max:5000,zero:109,negative:0},s58:{min:0,max:1350,zero:255,negative:0},s5c:{min:0,max:1100,zero:185,negative:0},
} as const;
const PERIOD_GREATER_THAN_5H={0.5:6,1:1,2:0,4:0,8:0,16:0} as const;
const ADMISSIBLE_REFUSALS=new Set(['poisson-mean-domain','integral-boundary','profile-period','profile-active-count','random-budget','poisson-numeric']);

describe.skipIf(!FIXTURE)('pulsar profile over the original Pulsars.dat (OPENVIREO_PULSARS_DAT; skipped when unset)',()=>{
 const load=():PulsarCatalog=>{
  const bytes=new Uint8Array(readFileSync(FIXTURE!));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(SHA256);
  const r=parsePulsarCatalog(bytes);if(!r.ok)throw new Error(JSON.stringify(r.error));return r.catalog;
 };
 it('has the independently counted scalar input domains',()=>{
  const c=load();expect(c).toHaveLength(558);
  for(const [field,d] of Object.entries(DOMAIN)){
   // The epoch is stored as column + Single 2400000; subtracting it back may differ from the column in the last bits.
   const v=c.map(r=>field==='epochRaw'?r.x3e-2400000:r[field as Exclude<keyof typeof DOMAIN,'epochRaw'>]),tol=field==='epochRaw'?1e-6:0;
   expect(Math.abs(Math.min(...v)-d.min),field).toBeLessThanOrEqual(tol);expect(Math.abs(Math.max(...v)-d.max),field).toBeLessThanOrEqual(tol);
   expect([v.filter(x=>x===0).length,v.filter(x=>x<0).length],field).toEqual([d.zero,d.negative]);
  }
 });
 it('yields N = 0 (refused as profile-active-count) exactly for the rows with P0 > 5H at dt = H/400',()=>{
  const c=load();
  for(const [h,count] of Object.entries(PERIOD_GREATER_THAN_5H))expect(c.filter(r=>pulsarActiveCount(Number(h)/400,r.x2a)===0).length,`H=${h}`).toBe(count);
 });
 it('builds every row at H = 4 (dt = 0.01) and a synthetic scenario JD, or refuses it with a bounded kind',()=>{
  const c=load(),kinds:Record<string,number>={};let resolved=0,unresolved=0;
  c.forEach((source,i)=>{
   try{
    const {profile}=buildPulsarProfile(createPulsarProfile(),{source,dt:0.01,jd:2451545},randomizeRadioStream(null,'receiver-create-0x572376',i),i+1);
    expect(profile.activeCount).toBeGreaterThanOrEqual(1);expect(profile.activeCount).toBeLessThanOrEqual(2000);
    expect(profile.cursor).toBe(profile.activeCount);
    expect(profile.samples!.every(v=>Number.isInteger(v)&&v>=0&&Math.fround(v)===v)).toBe(true);
    if(profile.resolved)resolved++;else unresolved++;
   }catch(e){
    if(!(e instanceof RadioSignalError))throw e;
    expect(ADMISSIBLE_REFUSALS.has(e.kind),`row ${i}: ${e.kind}`).toBe(true);kinds[e.kind]=(kinds[e.kind]??0)+1;
   }
  });
  expect(resolved+unresolved+Object.values(kinds).reduce((a,b)=>a+b,0)).toBe(558);
  expect(kinds['profile-active-count']??0).toBe(0);// P0 ≤ 5.1 s < 2000·dt
 });
});
