import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {buildPhotometerTargetField} from './photometerField';
import {photometerMaximumMean,PHOTOMETER_MEAN_BOUNDS} from './photometerUbvField';

// Front G G3b point 4: are the 0.9 m and 4 m photometer contracts generic? Their constants come from the optical profile, and
// their per-target exclusions must follow from the field and the telescope alone. photometerMaximumMean (largest per-callback
// mean over U/B/V × apertures 5/10/15, object reading) must reproduce every recorded maximumMean and reason.
describe('the 0.9 m and 4 m photometer target limits are generic',()=>{
 for(const [file,index] of [['kpno09-photometer-contract',1],['mayall-photometer-contract',2]] as const){
  it(`${file}: every recorded exclusion and every eligible target follows from the generic bounds`,()=>{
   const c=JSON.parse(readFileSync(`data/photometry/${file}.json`,'utf8'));
   for(const x of c.domain.excludedTargets){
    const max=photometerMaximumMean(buildPhotometerTargetField(x.targetId,'object'),index);
    // The contracts' generator used independent high-precision arithmetic; Number agrees to a relative 1e-8.
    expect(Math.abs(max/x.maximumMean-1),x.targetId).toBeLessThan(1e-8);
    const reason=max>PHOTOMETER_MEAN_BOUNDS.maximumPoissonMean?'Poisson-mean-bound':max*PHOTOMETER_MEAN_BOUNDS.callbacks>PHOTOMETER_MEAN_BOUNDS.countGuard?'all-duration-count-domain':null;
    expect(reason,x.targetId).toBe(x.reason);
   }
   let largest=0;
   for(const id of c.domain.eligibleTargetIds){const max=photometerMaximumMean(buildPhotometerTargetField(id,'object'),index);largest=Math.max(largest,max*PHOTOMETER_MEAN_BOUNDS.callbacks);expect(max).toBeLessThanOrEqual(PHOTOMETER_MEAN_BOUNDS.maximumPoissonMean);}
   expect(Math.abs(largest/c.domain.maximumExpected5000CallbackTotal-1)).toBeLessThan(1e-8);expect(c.domain.maximumPoissonMean).toBe(PHOTOMETER_MEAN_BOUNDS.maximumPoissonMean);expect(c.domain.actualCountsGuard).toBe(PHOTOMETER_MEAN_BOUNDS.countGuard);
  });
 }
});
