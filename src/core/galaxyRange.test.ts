import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import witness from './galaxyRange.witness.json';
import frozen from './galaxyRange.fingerprints.json';
import {parseLibrarySpectrum} from './spectrum';
import {DEFAULT_SPECTRAL_RANGE,LEGACY_GALAXY_RANGE} from './spectralRange';
import {verifiedGalaxyConfiguration,replayGalaxy,galaxyCountsCsv,galaxyDefinition,galaxySpectralRange,createGalaxyExposure} from './galaxyExposure';
import {prepareCatalogGalaxyChannels} from './galaxyContinuum';
import {evaluateLssRow,lssPolicy,parseLssPolicy} from './lssExposure';
import {decodeFieldPack} from './fieldPack';
import {packWithPhotographs,parseGlimagesPositions} from './lssLists';
import {lssFieldRows,type LssFieldNumber} from './lssFields';
import {HUBBLE_EXTENDED_TARGETS} from './hubbleEngineTargets';
import {repositoryLssSpectrumInputs} from '../io/lssSpectrumInputs.node';
import {ensureHubbleEngineTargets,setHubbleEngineResources} from '../io/hubbleEngineTargets';
import {createGalaxyObservation} from '../io/galaxyObservation';
import {parseGalaxySession,serializeGalaxySession} from '../io/galaxySession';
import type {JournalEvent} from './exposureJournal';
import type {FieldContinuationSource} from './fieldContinuation';
import {analyzeHubble} from './hubbleAnalysis';
import {hubbleVelocity} from './hubbleVelocity';
import {galaxyDistanceReference} from './galaxyIdentity';
vi.setConfig({testTimeout:900000});

// Front S2 round 2 (analysis/front-plans/front-s2-range.md §6.2): the Hubble and LSS routes at VIREO's 3700–4700 Å with the
// start-time continuation (0x55e97c). Legacy exposures (no range mark) keep 4000–5000 Å and their fingerprints
// (hubbleExistingTargets.test.ts). Regenerate galaxyRange.fingerprints.json only with OPENVIREO_FREEZE_RANGE_FINGERPRINTS=1.
const V=DEFAULT_SPECTRAL_RANGE;
const sha=(v:string|NodeJS.ArrayBufferView)=>createHash('sha256').update(v).digest('hex');
const f64=(values:readonly number[])=>sha(new Uint8Array(Float64Array.from(values).buffer));
const file=(p:string)=>readFileSync(new URL('../../'+p,import.meta.url));
const glx=new Uint8Array(file('public/original/catalogs/CLEA_GLX.DAT')),qb=new Uint8Array(file('public/original/catalogs/CLEA_QSO.DAT'));
const spectra=new Map([['NGC4889.SP',parseLibrarySpectrum(file('public/original/spectra/NGC4889.SP').toString('latin1'))]]);
/** E01: every Hubble.HTL target on every telescope it is acquired on today. */
const PINNED:readonly (readonly [string,0|1|2])[]=[['36773',0],['36773',1],['36773',2],['36747',0],['36747',1],['36747',2],['54876',0],['54876',1],['54876',2],['54875',0],['54891',0],['NGC 7501',0],['NGC 7499',0],['NGC 7503',0],['36805',0]];
const ENGINE=HUBBLE_EXTENDED_TARGETS.filter(t=>t.route==='engine').flatMap(t=>t.telescopes.map(i=>[t.id,i] as const));
const PAIRS=[...PINNED,...ENGINE];
const LINES=[['K',3933.682],['H',3968.492],['G',4305.001]] as const;
const visible=(z:number,r=V)=>LINES.filter(([,l])=>l*(1+z)>=r.minimum&&l*(1+z)<=r.maximum).map(([n])=>n).join('');
const TRAJECTORY:readonly JournalEvent[]=[{kind:'start'},{kind:'tick',deltaMs:1000},{kind:'tick',deltaMs:1000},{kind:'pause'}];
function targetOf(id:string,t:0|1|2){const c=verifiedGalaxyConfiguration(id,t,V);return c.field.galaxies.find((g:{id:string})=>g.id===id) as {id:string;redshift:number;morphology:number;recordIndex:number};}
function lssStatuses(range=V){
 const photographs=parseGlimagesPositions(file('public/original/images/GLIMAGES.LST')),inputs=repositoryLssSpectrumInputs(),out=[];
 for(let f=1;f<=9;f++){
  const pack=packWithPhotographs(decodeFieldPack(JSON.parse(file(`data/lss/lss-field-0${f}.json`).toString())),photographs);
  for(const row of lssFieldRows(f as LssFieldNumber))for(const t of [0,1,2] as const)out.push({f,row,t,s:evaluateLssRow(pack,glx,row,t,inputs,undefined,range)});
 }
 return out;
}
beforeAll(async()=>{
 vi.stubGlobal('crypto',webcrypto);
 setHubbleEngineResources({glx:async()=>glx,qso:async()=>({bytes:qb,sha256:sha(qb)}),spectrum:async f=>spectra.get(f)!});
 await ensureHubbleEngineTargets();
});
afterAll(()=>{setHubbleEngineResources(null);vi.unstubAllGlobals();});

describe('Front S2 round 2: Hubble and LSS at VIREO 3700–4700 Å',()=>{
 it('E01: all 13 Hubble.HTL targets stay acquirable on the same telescopes, observable in the analyser, with K and H in range',async()=>{
  const ids=new Set<string>();
  for(const [id,t] of PAIRS){
   const s=replayGalaxy(5,TRAJECTORY,id,t,V);
   expect(s.policy,`${id}@${t}`).toBe(`${galaxyDefinition(id,t).policyId}#R3700-4700`);expect(galaxySpectralRange(s)).toEqual(V);
   expect(verifiedGalaxyConfiguration(id,t,V).wavelengths[0]).toBe(3700);
   expect(serializeGalaxySession(parseGalaxySession(JSON.parse(serializeGalaxySession(s))))).toBe(serializeGalaxySession(s));
   const o=await createGalaxyObservation(s);expect(o.samples[0].wavelength).toBe(3700);
   expect(visible(targetOf(id,t).redshift)).toMatch(/^KH/);ids.add(id);
  }
  expect(ids.size).toBe(13);
  // The two Boötes targets (z ≈ 0.13) lose the G band at 3700–4700 Å; every other target keeps K, H and G.
  expect(PAIRS.filter(([id,t])=>visible(targetOf(id,t).redshift)!=='KHG').map(([id])=>id).filter((x,i,a)=>a.indexOf(x)===i).sort()).toEqual(['51975','51976']);
  // A legacy exposure (no mark) keeps 4000–5000 Å.
  expect(galaxySpectralRange(createGalaxyExposure(1,'36773',0))).toEqual(LEGACY_GALAXY_RANGE);
 });
 it('E01: H0 does not change (its inputs, the redshifts and V magnitudes of the 13 targets, are the same on both intervals)',()=>{
  const h0=(range:typeof V)=>{
   const ids=[...new Set(PAIRS.map(([id])=>id))],rows=ids.map((id,i)=>{const t=PAIRS.find(([x])=>x===id)![1];
    const g=verifiedGalaxyConfiguration(id,t,range).field.galaxies.find((x:{id:string})=>x.id===id) as {redshift:number};
    return {id:i+1,input:{kind:'manual' as const,object:id,velocityText:String(hubbleVelocity(g.redshift).storedKmS),velocitySource:'catalogue z',apparentVText:String(galaxyDistanceReference(id).apparentV),magnitudeSource:'workbook',targetId:id}};});
   return analyzeHubble({recipeId:'vireo',rows},[]);
  };
  const v=h0(V),legacy=h0(LEGACY_GALAXY_RANGE);
  // Review 2 nit: pinned to main's value before S2 (re-measured independently in review 2), not only compared with itself.
  expect(v.rows).toHaveLength(13);expect(v.value).toBe(52.50880276737093);expect(v.value).toBe(legacy.value);expect(v.rows.map(r=>r.velocityKmS)).toEqual(legacy.rows.map(r=>r.velocityKmS));
 });
 it('E02: 196 / 93 / 198 rows on the three telescopes (as at 4000–5000 Å), and every available row shows K, H and G',()=>{
  // As lssPacks.test.ts: a spectrum-mapping row would count (its own spectrum is the original's), and there is none (NGC 4670 and
  // NGC 4889 are observed with their bundled own spectra), so every counted row is an acquirable one (review 2 nit).
  const counts=[0,0,0],legacy=[0,0,0],lines=new Set<string>(),mapped:string[]=[];
  for(const {s,t,row} of lssStatuses())if(s.kind!=='unavailable'||s.reasons.includes('spectrum-mapping')){counts[t]++;if(s.kind!=='unavailable')lines.add(visible(s.result.target!.redshift));else mapped.push(`${row.id}@${t}`);}
  expect(mapped).toEqual([]);
  for(const {s,t} of lssStatuses(LEGACY_GALAXY_RANGE))if(s.kind!=='unavailable'||s.reasons.includes('spectrum-mapping'))legacy[t]++;
  expect(counts).toEqual([196,93,198]);expect(legacy).toEqual(counts);expect([...lines]).toEqual(['KHG']);
  const p=lssPolicy(1,0,0,V);expect(p).toBe('openvireo-lss-v1:F1:R1:T0#R3700-4700');expect(parseLssPolicy(p).range).toEqual(V);
  expect(()=>parseLssPolicy('openvireo-lss-v1:F1:R1:T0#R3600-4600')).toThrow();
 });
 const lssContinuation=new Map<string,FieldContinuationSource>();
 it('the continuation values equal the independent Decimal witness (Hubble targets and a sample of LSS galaxies)',()=>{
  for(const {s:st,t} of lssStatuses())if(t===0&&st.kind!=='unavailable'&&st.result.calibration?.continuationSource)lssContinuation.set(st.result.target!.id,st.result.calibration.continuationSource);
  expect(witness.tool).toBe('galaxy_range_witness.py');expect(witness.targets.length).toBeGreaterThanOrEqual(13);
  for(const w of witness.targets){
   const bytes=file(w.sourcePath);expect(sha(bytes),w.id).toBe(w.sourceSha256);
   const samples=parseLibrarySpectrum(bytes.toString('latin1'));
   const p=prepareCatalogGalaxyChannels(samples,w.matched,w.morphology,w.catalogZ,3700,4700,w.initialSeed);
   // Review 2 L4: the route's own continuation source has the witness's context, and drawing from it gives the same values.
   const own=w.route==='hubble'?(()=>{const t=PAIRS.find(([id])=>id===w.id)![1];return (verifiedGalaxyConfiguration(w.id,t,V) as {continuationSource?:FieldContinuationSource}).continuationSource;})():lssContinuation.get(w.id);
   if(w.id!=='NGC 4889'){expect(own,w.id).toBeDefined();expect([own!.redshift,own!.morphology,own!.matched,own!.minimum,own!.maximum]).toEqual([w.catalogZ,w.morphology,w.matched,3700,4700]);
    const q=prepareCatalogGalaxyChannels(own!.samples,own!.matched,own!.morphology,own!.redshift,own!.minimum,own!.maximum,w.initialSeed);for(let i=0;i<600;i++)expect(q.values[i],`${w.id} route channel ${i}`).toBeCloseTo(w.values[i],9);}
   expect([p.draws,p.seed],w.id).toEqual([w.draws,w.seed]);expect(p.temperature).toBeCloseTo(w.temperature,9);
   for(let i=0;i<600;i++)expect(p.values[i],`${w.id} channel ${i}`).toBeCloseTo(w.values[i],9);
  }
 });
 it('exports the catalogue contexts the witness reads (OPENVIREO_S2_EXPORT only)',()=>{
  if(!process.env.OPENVIREO_S2_EXPORT)return;
  const contexts=new Map<string,unknown>();
  for(const [id,t] of PAIRS){const g=targetOf(id,t),c=verifiedGalaxyConfiguration(id,t,V) as {ownSamples?:unknown};contexts.set(id,{id,route:'hubble',catalogZ:g.redshift,morphology:g.morphology,source:c.ownSamples?'NGC4889.SP':'GLXYTMPL.SP'});}
  const lss=lssStatuses().filter(x=>x.t===0&&x.s.kind!=='unavailable'&&x.s.result.calibration?.continuationSource).map(x=>x.s.kind!=='unavailable'?x.s.result:null!);
  lss.sort((a,b)=>a.target!.redshift-b.target!.redshift);
  for(const [i,r] of lss.entries()){const c=r.calibration!.continuationSource!;if(i%6===0||c.matched)contexts.set(r.target!.id,{id:r.target!.id,route:'lss',catalogZ:c.redshift,morphology:c.morphology,source:c.matched?`${r.target!.id.replace(/ /g,'')}.SP`:'GLXYTMPL.SP'});}
  writeFileSync(process.env.OPENVIREO_S2_EXPORT,JSON.stringify([...contexts.values()],null,1));
 });
 it('fingerprints at 3700–4700 Å (dated v2; the legacy v1 fingerprints stay in existing-target-fingerprints.json)',()=>{
  const pairs=PAIRS.map(([id,t])=>{const c=verifiedGalaxyConfiguration(id,t,V),s=replayGalaxy(5,TRAJECTORY,id,t,V),e=s.exposure;
   return {id,telescope:t,policy:s.policy,cropSHA256:sha(c.viewport.rgb),pixelLevel:c.pixelLevel,fraction:c.fraction,zeroPoint:c.zeroPoint,instrumentMagnitude:c.instrumentMagnitude,sourceAmplitude:c.amplitude.source,skyAmplitude:c.amplitude.sky,meansSHA256:f64(c.sourceMeans),wavelengthsSHA256:f64(c.wavelengths),continuation:!!(c as {continuationSource?:unknown}).continuationSource,countsSHA256:f64(e.counts),sourceTotal:e.sourceTotal,skyTotal:e.skyTotal,draws:e.draws,finalSeed:e.seed,csvSHA256:sha(galaxyCountsCsv(s))};});
  const lss=lssStatuses().map(({f,row,t,s})=>[`F${f}R${row.index+1}T${t}`,s.kind,s.kind==='unavailable'?s.reasons.join('+'):s.selectedIndex,s.result?.calibration?`${s.result.calibration.continuationSource?'cont':'prof'}/${f64(s.result.calibration.sourceMeans)}`:'-'].join('|'));
  if(process.env.OPENVIREO_FREEZE_RANGE_FINGERPRINTS==='1'){writeFileSync(new URL('./galaxyRange.fingerprints.json',import.meta.url),JSON.stringify({schema:'openvireo-range-fingerprints-v2',date:'2026-10-31',range:'3700-4700',pairs,lssRows:lss.length,lssSHA256:sha(lss.join('\n')),lss},null,1)+'\n');return;}
  expect(pairs).toEqual(frozen.pairs);expect(lss).toEqual(frozen.lss);expect(sha(lss.join('\n'))).toBe(frozen.lssSHA256);
 });
});
