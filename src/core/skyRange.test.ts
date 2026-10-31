import {describe,expect,it} from 'vitest';
import {activateSky,createSkyExposure,pauseSky,skyCountsCsv,skySpectralRange,skyWavelengths,startSky,tickSky} from './skyExposure';
import {parseSkySession,serializeSkySession} from '../io/skySession';
import {DEFAULT_SPECTRAL_RANGE,sharedRestoredRange} from './spectralRange';

// Front S2 §6.1: the sky at any dialog range. 0x50df64 reads no range, so the counts at one seed are the same on every range.
const run=(range=DEFAULT_SPECTRAL_RANGE,index:0|1|2=0)=>pauseSky(tickSky(tickSky(startSky(activateSky(createSkyExposure(7,index,range))),100),100));
describe('Front S2: the sky route on a spectral range',()=>{
 it('counts do not depend on the range; the default keeps its policy, labels and session bytes',()=>{
  const d=run(),r=run({minimum:4000,maximum:5000});
  expect(r.exposure.counts).toEqual(d.exposure.counts);expect(r.exposure.seed).toBe(d.exposure.seed);
  expect(d.policy).not.toContain('#R');expect(r.policy).toBe(`${d.policy}#R4000-5000`);
  expect(skyWavelengths()).toEqual(skyWavelengths(DEFAULT_SPECTRAL_RANGE));expect(skyWavelengths()[0]).toBe(3700);
  const w=skyWavelengths({minimum:4000,maximum:5000});expect([w[0],w.length]).toEqual([4000,600]);expect(w[599]).toBeCloseTo(4998.333,3);
  expect(skyCountsCsv(r).split('\n')[1]).toContain(',4000,');
  for(const index of [0,1,2] as const){const s=run({minimum:4000,maximum:5000},index),back=parseSkySession(JSON.parse(serializeSkySession(s)));
   expect(skySpectralRange(back)).toEqual({minimum:4000,maximum:5000});expect(serializeSkySession(back)).toBe(serializeSkySession(s));}
  expect(serializeSkySession(parseSkySession(JSON.parse(serializeSkySession(d))))).toBe(serializeSkySession(d));
  const forged=JSON.parse(serializeSkySession(r));forged.policy=forged.policy.replace('#R4000-5000','#R4000-4050');expect(()=>parseSkySession(forged)).toThrow();
 });
 it('an investigation restore takes the one range its exposures share, else the default',()=>{
  const a=run({minimum:4000,maximum:5000}).policy,b=run().policy;
  expect(sharedRestoredRange([a,null,a])).toEqual({minimum:4000,maximum:5000});
  expect(sharedRestoredRange([a,b])).toEqual(DEFAULT_SPECTRAL_RANGE);expect(sharedRestoredRange([null])).toEqual(DEFAULT_SPECTRAL_RANGE);
 });
});
