import {describe,it,expect} from 'vitest';
import vectors from '../../data/hubble/sky-exposure-vectors.json';
import {activateSky,cancelSky,createSkyExposure,deactivateSky,parseSkySeed,pauseSky,replaySky,resetSky,skyCountsCsv,skyWavelengths,startSky,tickSky,verifiedSkyConfiguration} from './skyExposure';
import {nativeStellarAngularAdmission} from './slitThroughput';
import {parseSkySession,serializeSkySession,readSkySession,MAX_SKY_SESSION_BYTES} from '../io/skySession';
describe('supported calibrated sky exposure',()=>{
 it('proves non-null native selection and zero angular admission for the complete field',()=>{
  const c=verifiedSkyConfiguration();expect(c.field.stars).toHaveLength(132);expect(c.field.galaxies).toHaveLength(0);expect(c.scene.frame.width).toBe(936);expect(c.selectedId).toBe('N0000.DAT@14428');expect(c.selectedDistance).toBeCloseTo(50.809495548,8);expect(c.skyMean).toBe(1e-6);
  expect(c.field.stars.every(s=>!nativeStellarAngularAdmission({raHours:s.ra,decDegrees:s.dec},{raHours:.5,decDegrees:0}))).toBe(true);
 });
 for(const v of vectors.vectors)it(`matches independent Decimal100 vector ${v.seed}/${v.deltas.join(',')}`,()=>{
  let s=startSky(activateSky(createSkyExposure(v.seed)));for(const dt of v.deltas)s=tickSky(s,dt);s=pauseSky(s);
  expect(s.exposure.counts.flatMap((c,i)=>c?[[i,c]]:[])).toEqual(v.nonzero);expect(s.exposure.seed).toBe(v.finalSeed);expect(s.exposure.draws).toBe(v.draws);expect(s.exposure.skyTotal).toBe(v.total);expect(s.exposure.sourceTotal).toBe(0);expect(s.exposure.sourceMeans).toBeNull();expect(s.exposure.elapsedMs).toBe(v.deltas.reduce((a,b)=>a+b,0));expect(replaySky(v.seed,s.events).exposure).toEqual(s.exposure);
 });
 it('activation, pause, reset during exposure and cancellation preserve RNG',()=>{
  const initial=createSkyExposure(1);expect(()=>startSky(initial)).toThrow();expect(activateSky(activateSky(initial)).armed).toBe(true);
  let s=tickSky(startSky(activateSky(initial)),100);const seed=s.exposure.seed;const paused=pauseSky(s);expect(pauseSky(paused)).toBe(paused);expect(paused.exposure.elapsedMs).toBe(100);
  s=resetSky(s);expect(s.exposure.seed).toBe(seed);expect(s.seedAtReset).toBe(seed);expect(s.events).toEqual([]);expect(s.exposure.counts.every(n=>n===0)).toBe(true);expect(s.exposure.draws).toBe(0);expect(s.armed).toBe(true);
  s=tickSky(startSky(s),100);const stopped=deactivateSky(s);expect(stopped.armed).toBe(false);expect(stopped.exposure.phase).toBe('paused');expect(()=>startSky(stopped)).toThrow();expect(cancelSky(stopped).exposure.draws).toBe(0);
 });
 it('rejects invalid deltas/seeds atomically; committed zero deltas still consume uniforms',()=>{
  const s=startSky(activateSky(createSkyExposure(0)));for(const dt of [-1,.1,1001,NaN,Infinity])expect(()=>tickSky(s,dt)).toThrow();expect(s.exposure.draws).toBe(0);expect(s.events).toHaveLength(1);expect(tickSky(s,0).exposure.draws).toBe(600);
  for(const seed of ['-1','1.2','4294967296','','1e2'])expect(()=>parseSkySeed(seed)).toThrow();expect(parseSkySeed(' 4294967295 ')).toBe(4294967295);
 });
 it('restores unarmed, rejects altered domain/cached counts and preserves repeated exports',()=>{
  const s=pauseSky(tickSky(startSky(activateSky(createSkyExposure(1))),1000)),text=serializeSkySession(s),restored=parseSkySession(JSON.parse(text));expect(restored.armed).toBe(false);expect(restored.exposure).toEqual(s.exposure);expect(serializeSkySession(restored)).toBe(text);expect(skyCountsCsv(restored)).toBe(skyCountsCsv(s));
  const original=JSON.parse(text) as Record<string,unknown>;
  for(const patch of [{counts:[1]},{policy:'unknown'},{seedAtReset:-1},{events:[{kind:'tick',deltaMs:100}]},{events:[{kind:'start'}]},{events:[{kind:'start',extra:true}]},{domain:{}}])expect(()=>parseSkySession({...original,...patch})).toThrow();
 });
 it('exports 600 raw bins including all-zero counts with the exclusive upper grid',()=>{
  const s=pauseSky(tickSky(startSky(activateSky(createSkyExposure(0))),0)),csv=skyCountsCsv(s);expect(csv.split('\r\n')).toHaveLength(602);expect(csv).toContain('browser-sky-background-exposure');expect(csv).not.toContain('N0000.DAT');expect(skyWavelengths()[0]).toBe(3700);expect(skyWavelengths()[599]).toBeCloseTo(4698.333333333,7);expect(()=>skyCountsCsv(createSkyExposure(1))).toThrow();
 });
 it('bounds journal replay and leaves room to pause before its cap',()=>{
  const events=Array.from({length:11998},(_,i)=>({kind:i%2===0?'start' as const:'pause' as const}));const stopped=replaySky(1,events);expect(stopped.events).toHaveLength(11998);expect(()=>startSky(activateSky(stopped))).toThrow();expect(resetSky(stopped).events).toHaveLength(0);expect(()=>replaySky(1,Array(12001).fill({kind:'start'}))).toThrow();
 });
 it('bounds file size and rejects malformed UTF-8 before replay',async()=>{
  await expect(readSkySession({size:MAX_SKY_SESSION_BYTES+1,arrayBuffer:()=>{throw Error('must not read');}} as unknown as File)).rejects.toThrow();await expect(readSkySession({size:1,arrayBuffer:async()=>Uint8Array.of(255).buffer} as unknown as File)).rejects.toThrow();
 });
});
