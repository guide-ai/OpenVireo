import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {buildPhotometerTargetField,PLEIADES_PHOTOMETER_TARGETS} from './photometerField';
import {photometerFullDomainExclusion,isPhotometerTelescopeTarget,type PhotometerTelescopeIndex} from './photometerTelescope';
import {buildPinnedPleiadesUbvField,drawPinnedPleiadesUbv,photometerMaximumMean,photometerSelectedFraction,PHOTOMETER_FILTERS,PINNED_UBV_SKY,type PhotometerFilter} from './photometerUbvField';
import {preparePhotometerBands,attenuatePhotometerMagnitude,combinePhotometerMagnitudes} from './photometerSource';
import {photometerApertureDomain,photometerApertureGeometry,validPhotometerAperture,PHOTOMETER_APERTURE_RANGE} from './photometerAperture';
import {APERTURE_DOMAIN_CONTRACT_SHA256,RI_CONTRACT_SHA256,photometerJournalHeader,photometerJournalVersion} from './photometerJournal';
import {createPhotometer,photometerEvent as step,releasePhotometer,replayPhotometer,type PhotometerEvent} from './photometer';
import {parsePhotometerSession,serializePhotometerSession} from '../io/photometerSession';

// Front P2 (apertures 5..150, R and I, VIREO's sky). Vectors: data/photometry/photometer-p2-vectors.json from the independent
// Decimal90 generator analysis/front-p2/scripts/independent_p2.py (synthetic; not original CLEA output).
const file=(n:string)=>readFileSync(`data/photometry/${n}`);
const sha=(n:string)=>createHash('sha256').update(file(n)).digest('hex');
const json=(n:string)=>JSON.parse(file(n).toString('utf8'));
const vectors=json('photometer-p2-vectors.json'),ri=json('ri-contract.json'),ap=json('aperture-domain-contract.json');
const rel=(a:number,b:number)=>Math.abs(a/b-1);
const hex=(x:number)=>{const b=new DataView(new ArrayBuffer(8));b.setFloat64(0,x);return b.getBigUint64(0).toString(16).padStart(16,'0');};

describe('Front P2 contracts',()=>{
 it('pins the two contracts and the vectors they cite; the earlier contracts are unchanged',()=>{
  expect(sha('ri-contract.json')).toBe(RI_CONTRACT_SHA256);
  expect(sha('aperture-domain-contract.json')).toBe(APERTURE_DOMAIN_CONTRACT_SHA256);
  expect(ri.vectors.sha256).toBe(sha('photometer-p2-vectors.json'));expect(ap.vectors.sha256).toBe(sha('photometer-p2-vectors.json'));
  expect(sha('aperture-contract.json')).toBe('cf9110d7d60adfd3899d96ed56bca91084d9f720f7ab18a4c4fecbe6ddf45772');
  for(const d of ri.telescopeDomain.domains)expect(sha(d.supersedes.file)).toBe(d.supersedes.sha256);
  expect(ri.captures.map((c:{sha256:string})=>c.sha256.slice(0,8))).toEqual(['fdb37e5a','248a2806','e7c12950','7fc991b6','b498b246','a6ebc4a5','54f44d3d','f7287fc8','244ad1ab','e6e26f39','39093638']);
 });
});

describe('P2.3 aperture domain 5..150',()=>{
 it('accepts integers 5..150 only; readout is the diameter in arc minutes',()=>{
  for(const v of [5,10,37,150])expect(validPhotometerAperture(v)).toBe(true);
  for(const v of [4,151,10.5,NaN,'10',null])expect(validPhotometerAperture(v)).toBe(false);
  expect(PHOTOMETER_APERTURE_RANGE).toEqual({min:5,max:150,default:10,smallChange:1,largeChange:10});
  expect(photometerApertureDomain()).toHaveLength(146);
  expect(photometerApertureGeometry(10).diameterArcMinutes.toFixed(3)).toBe('0.067');
  expect(photometerApertureGeometry(150).diameterArcMinutes.toFixed(3)).toBe('0.965');
 });
 it('the source fraction reaches 1 at size 39 with the 0.4 m and 23 with the 0.9 m and 4 m',()=>{
  const id='N2230.DAT@145877',f=(sel:number,tel:PhotometerTelescopeIndex)=>buildPinnedPleiadesUbvField('object','V',id,sel,tel).centralFraction;
  expect(f(38,0)).toBeLessThan(1);expect(f(39,0)).toBe(1);
  for(const tel of [1,2] as const){expect(f(22,tel)).toBeLessThan(1);expect(f(23,tel)).toBe(1);}
 });
 it('matches the independent vectors at every sampled size, filter, kind and telescope',()=>{
  let checked=0,blends=0;
  for(const r of vectors.rows){
   const [id,kind,tel]=r as [string,'object'|'sky',PhotometerTelescopeIndex];
   if(!isPhotometerTelescopeTarget(id,tel))continue;
   if(r[4]==='blend'){expect(()=>buildPinnedPleiadesUbvField(kind,'V',id,r[3],tel)).toThrow(/evidence/);blends++;continue;}
   const [,,,sel,filter,source,sky]=r as [string,string,number,number,PhotometerFilter,string,string];
   const f=buildPinnedPleiadesUbvField(kind,filter,id,sel,tel);
   expect(rel(f.sourceMean,Number(source)),`${id} ${kind} ${tel} ${sel} ${filter}`).toBeLessThan(2e-7);
   expect(rel(f.skyMean,Number(sky)),`${id} ${kind} ${tel} ${sel} ${filter} sky`).toBeLessThan(1e-12);
   checked++;
  }
  expect(checked).toBeGreaterThan(5000);expect(blends).toBe(0);
 });
 it('D2 (a): a large sky aperture measures the light inside it, at the thresholds the generator found',()=>{
  const lit=(id:string,sel:number)=>{const f=buildPinnedPleiadesUbvField('sky','V',id,sel,0);return f.centralFraction>0||f.includedNeighbors>0;};
  for(const t of ap.skyRule.thresholds){
   expect(lit(t.targetId,t.firstLightInSkyAperture),t.targetId).toBe(true);
   expect(lit(t.targetId,t.firstLightInSkyAperture-1),t.targetId).toBe(false);
  }
  expect(Math.min(...ap.skyRule.thresholds.map((t:{firstLightInSkyAperture:number})=>t.firstLightInSkyAperture))).toBe(25);
 });
 it('E04 and every earlier reading at sizes 5/10/15 (U/B/V, all admitted telescopes) are byte-identical to main 2270449',()=>{
  const snap=json('p2-legacy-identity.json');expect(snap.rows).toHaveLength(864);
  for(const [id,tel,kind,filter,sel,source,sky,sourceMag,skyMag,sc,kc,seed] of snap.rows){
   const f=buildPinnedPleiadesUbvField(kind,filter,id,sel,tel),d=drawPinnedPleiadesUbv(kind,filter,snap.seed,id,sel,tel);
   expect([hex(f.sourceMean),hex(f.skyMean),hex(f.sourceMagnitude),hex(f.skyMagnitude),d.sourceCount,d.skyCount,d.seed],`${id} ${tel} ${kind} ${filter} ${sel}`).toEqual([source,sky,sourceMag,skyMag,sc,kc,seed]);
  }
 });
 it('the 0.4 m maximum over the whole domain stays under the int32 count guard (η Tau, size 150)',()=>{
  expect(ri.telescope0.targetId).toBe('N2230.DAT@150112');expect(ri.telescope0.maximumExpected5000CallbackTotal).toBeLessThan(2147483647);
  // The maximum over all 24 targets, so the recorded target is checked rather than assumed.
  const means=PLEIADES_PHOTOMETER_TARGETS.map(t=>photometerMaximumMean(buildPhotometerTargetField(t.catalogId,'object'),0)),max=Math.max(...means);
  expect(means).toHaveLength(24);expect(PLEIADES_PHOTOMETER_TARGETS[means.indexOf(max)]!.catalogId).toBe(ri.telescope0.targetId);
  expect(rel(max,ri.telescope0.maximumMean)).toBeLessThan(2e-7);expect(max*5000).toBeLessThan(2147483647);
 });
 it('bundled sky fields hold no selected-star light at sizes 5/10/15; VIREO\'s sky-replace question appears from these sizes',()=>{
  // First size with selected-star light in the sky aperture (0: never). Four targets have a nearer star in their sky field.
  const early:Record<string,readonly [number,number]>={'N2230.DAT@146960':[25,41],'N2230.DAT@152292':[41,56],'N2230.DAT@149698':[91,106],'N2230.DAT@148468':[128,144]};
  for(const tel of [0,1,2] as const)for(const t of PLEIADES_PHOTOMETER_TARGETS){
   const first=photometerApertureDomain().find(a=>photometerSelectedFraction(t.catalogId,'sky',a,tel)>0)??0,e=early[t.catalogId];
   expect(first,`${t.catalogId} telescope ${tel}`).toBe(e?e[tel===0?0:1]:tel===0?148:0);
  }
 },60000);
});

describe('P2.2 R and I',()=>{
 it('five filters opening on V; sky R 15 and I 14.67',()=>{
  expect(PHOTOMETER_FILTERS).toEqual(['U','B','V','R','I']);expect(createPhotometer(1).filter).toBe('V');
  expect(PINNED_UBV_SKY.R).toBe(15);expect(PINNED_UBV_SKY.I).toBe(16-1-0.33);
 });
 it('reproduces dossier B\'s worked example (N2230.DAT@145877, 0.4 m, size 10)',()=>{
  for(const f of PHOTOMETER_FILTERS){
   const c=buildPinnedPleiadesUbvField('object',f,'N2230.DAT@145877',10,0),w=vectors.workedExample.bands[f];
   expect(rel(c.sourceMean,Number(w.sourceMean)),f).toBeLessThan(2e-9);// fraction quadrature vs Decimal90expect(Math.abs(c.skyMean-Number(w.skyMean)),f).toBeLessThan(1e-9);
  }
  expect(buildPinnedPleiadesUbvField('object','R','N2230.DAT@145877',10,0).sourceMean.toFixed(3)).toBe('828.807');
  expect(buildPinnedPleiadesUbvField('object','I','N2230.DAT@145877',10,0).sourceMean.toFixed(3)).toBe('345.504');
 });
 it('R = V − (B−V), I = V + (B−V) − (U−B); neighbour light reaches U/B/V only; a zero central fraction gives 30 plus neighbours',()=>{
  const star={v:10,bMinusV:0.5,uMinusB:0.25,fraction:0.5},neighbour={v:11,bMinusV:0.25,uMinusB:0.125,fraction:1};
  const alone=preparePhotometerBands(star,[]),blend=preparePhotometerBands(star,[neighbour]);
  expect(alone.r).toBe(attenuatePhotometerMagnitude(9.5,0.5));expect(alone.i).toBe(attenuatePhotometerMagnitude(10.25,0.5));
  expect([blend.r,blend.i]).toEqual([alone.r,alone.i]);expect(blend.v).toBe(combinePhotometerMagnitudes(11,alone.v));expect(blend.v).toBeLessThan(alone.v);
  const empty=preparePhotometerBands({...star,fraction:0},[neighbour]);
  expect([empty.r,empty.i]).toEqual([30,30]);expect(empty.v).toBe(combinePhotometerMagnitudes(11,30));expect(empty.includedNeighbors).toBe(1);
 });
});

describe('P2 D1 (a): the 0.9 m and 4 m domain over U..I and apertures 5..150',()=>{
 it('changes exactly three 4 m targets; the 0.9 m set is unchanged',()=>{
  const [k,m]=ri.telescopeDomain.domains;
  expect(k.changedTargets).toEqual([]);
  expect(m.changedTargets.map((c:{targetId:string;after:string})=>[c.targetId,c.after])).toEqual([['N2230.DAT@144496','all-duration-count-domain'],['N2230.DAT@150246','Poisson-mean-bound'],['N2230.DAT@152989','all-duration-count-domain']]);
 });
 it('the student-facing reasons for the three new 4 m exclusions match the field: first size per filter over each limit',()=>{
  // Text in ph.limits and ph.domainAdded: 144496 R over the count at every size; 150246 R over the count at every size and the draw
  // limit from 11; 152989 R over the count from 75 and I from 100. Every other filter stays within both limits.
  const first=(id:string)=>Object.fromEntries(PHOTOMETER_FILTERS.map(f=>{let count=0,draw=0;for(const a of photometerApertureDomain()){const o=buildPinnedPleiadesUbvField('object',f,id,a,2),mean=o.sourceMean+o.skyMean;if(!count&&mean*5000>2147483647)count=a;if(!draw&&mean>1e6)draw=a;}return [f,[count,draw]];}));
  const none=[0,0];
  expect(first('N2230.DAT@144496')).toEqual({U:none,B:none,V:none,R:[5,0],I:none});
  expect(first('N2230.DAT@150246')).toEqual({U:none,B:none,V:none,R:[5,11],I:none});
  expect(first('N2230.DAT@152989')).toEqual({U:none,B:none,V:none,R:[75,0],I:[100,0]});
 },60000);
 it('every recorded maximum follows from photometerMaximumMean over the full domain',()=>{
  for(const d of ri.telescopeDomain.domains){
   for(const x of d.excludedTargets){
    expect(photometerFullDomainExclusion(x.targetId,d.telescopeIndex)).toBe(x.reason);
    expect(rel(photometerMaximumMean(buildPhotometerTargetField(x.targetId,'object'),d.telescopeIndex),x.maximumMean),x.targetId).toBeLessThan(2e-7);
   }
   for(const id of d.eligibleTargetIds){expect(photometerFullDomainExclusion(id,d.telescopeIndex)).toBeNull();expect(photometerMaximumMean(buildPhotometerTargetField(id,'object'),d.telescopeIndex)*5000).toBeLessThanOrEqual(2147483647);}
  }
  expect(PLEIADES_PHOTOMETER_TARGETS.every(t=>photometerFullDomainExclusion(t.catalogId,0)===null)).toBe(true);
 });
 it('a live Start of a newly excluded 4 m target is refused; a history recorded before P2 still replays',()=>{
  let s=step(step(createPhotometer(7),{type:'telescope',index:2}),{type:'activate'});
  s=step(s,{type:'target',targetId:'N2230.DAT@144496'});s=step(s,{type:'point',kind:'sky'});
  expect(()=>step(s,{type:'start'})).toThrow(/field/);
  const events:PhotometerEvent[]=[...s.events,{type:'start'},{type:'complete'}];
  const old=replayPhotometer(7,events);expect(old.readings).toHaveLength(1);expect(old.readings[0].targetId).toBeNull();
 });
});

describe('P2 journal owners 13 and 14',()=>{
 it('a size outside 5/10/15 is owner 13; an R or I filter is owner 14; both round trip',()=>{
  let s=step(createPhotometer(11),{type:'activate'});s=step(s,{type:'aperture',selector:37});
  expect(photometerJournalVersion(s.events)).toBe(13);
  s=step(step(s,{type:'start'}),{type:'complete'});
  const t13=serializePhotometerSession(releasePhotometer(s));expect(JSON.parse(t13)).toMatchObject({version:13,apertureDomainContractSHA256:APERTURE_DOMAIN_CONTRACT_SHA256});
  expect(parsePhotometerSession(JSON.parse(t13))).toEqual(releasePhotometer(s));
  s=step(s,{type:'filter',filter:'R'});s=step(step(s,{type:'start'}),{type:'complete'});
  expect(s.current!.filter).toBe('R');expect(s.skies.R).not.toBeNull();
  const t14=serializePhotometerSession(releasePhotometer(s));expect(JSON.parse(t14)).toMatchObject({version:14,riContractSHA256:RI_CONTRACT_SHA256});
  expect(parsePhotometerSession(JSON.parse(t14))).toEqual(releasePhotometer(s));
  expect(photometerJournalVersion([{type:'activate'},{type:'filter',filter:'I'}])).toBe(14);
  expect(photometerJournalVersion([{type:'activate'},{type:'aperture',selector:15}])).toBe(8);
 });
 it('an earlier owner cannot carry a new size or filter (the header no longer matches)',()=>{
  const events=[{type:'activate'},{type:'aperture',selector:37},{type:'deactivate'}];
  expect(()=>parsePhotometerSession({...photometerJournalHeader(8),seedAtStart:1,events})).toThrow(/session/);
  const r=[{type:'activate'},{type:'filter',filter:'R'},{type:'deactivate'}];
  expect(()=>parsePhotometerSession({...photometerJournalHeader(2),seedAtStart:1,events:r})).toThrow(/session/);
 });
});
