/** Finite post-integration photometer slice, CLEA_VEO.exe 781bc970…c54c.
 * 0x500acc/0x501687–0x50187e. See docs/PHOTOMETRY-REDUCTION.md.
 * Explicit supplied counters/calibration only: no acquisition, new sky/source
 * model, conflated clock/count units or default telescope/filter zero point.
 * Number/Math are declared adaptations, not original Extended/x87 equivalence. */
export class PhotometryReductionError extends Error {
 constructor(readonly code:'counts'|'integration'|'aperture'|'counter'|'calibration'|'sky'|'overflow'|'color') {super(`Photometry reduction: ${code}`);this.name='PhotometryReductionError';}
}
export const MAX_PHOTOMETER_COUNT=2147483647;
export type SuppliedPhotometerReading=Readonly<{totalPhotonCount:number;integrations:number;secondsPerIntegration:number;apertureSelector:number}>;
/** Raw selector units are not asserted to be arcseconds/pixels. The upper
 * bound is a new finite-adapter guard, not a recovered native UI maximum. */
export function photometerApertureFactor(selector:number):number{
 if(!Number.isSafeInteger(selector)||selector<0||selector>1_000_000)throw new PhotometryReductionError('aperture');
 return ((selector+.5)**2)/(10.5**2);
}
function reading(input:SuppliedPhotometerReading){
 if(!Number.isInteger(input.totalPhotonCount)||input.totalPhotonCount<0||input.totalPhotonCount>MAX_PHOTOMETER_COUNT)throw new PhotometryReductionError('counts');
 if(!Number.isInteger(input.integrations)||input.integrations<1||input.integrations>5||![.1,1,10,100].includes(input.secondsPerIntegration))throw new PhotometryReductionError('integration');
 const apertureFactor=photometerApertureFactor(input.apertureSelector),integrationSeconds=input.integrations*input.secondsPerIntegration,meanCountRate=input.totalPhotonCount/integrationSeconds;
 return {apertureFactor,integrationSeconds,meanCountRate};
}
/** 0x501831–0x50186d stores the mean rate divided by aperture area factor.
 * The caller must bind that sky reading to the right filter/telescope context. */
export function reducePhotometerSky(input:SuppliedPhotometerReading){
 const r=reading(input),skyAtReferenceAperture=r.meanCountRate/r.apertureFactor;
 if(!Number.isFinite(skyAtReferenceAperture))throw new PhotometryReductionError('overflow');
 return Object.freeze({...r,skyAtReferenceAperture});
}
export type SuppliedPhotometerObject=SuppliedPhotometerReading&Readonly<{
 /** Native accumulator+0x4de: sum of BaseCountEd/global+0x2e53 per callback.
  * This is a base photon-count normalizer, NOT elapsed time. Timer seconds
  * accumulate separately at+0x48e using global+0x2e57 /1000. See
  * docs/PHOTOMETER-CONTEXT-RECOVERY.md; neither field is a clock substitute. */
 nativeBaseCountSum:number;
 /** Prepared magnitude field+0x483; supplied, not a guessed filter constant. */
 zeroPointMagnitude:number;
 /** Prior sky field+0x58a, already normalized to the 10.5 reference scale. */
 skyAtReferenceAperture:number|null;
}>;
export function reducePhotometerObject(input:SuppliedPhotometerObject){
 const r=reading(input);
 if(!Number.isInteger(input.nativeBaseCountSum)||input.nativeBaseCountSum<=0||input.nativeBaseCountSum>MAX_PHOTOMETER_COUNT)throw new PhotometryReductionError('counter');
 if(!Number.isFinite(input.zeroPointMagnitude))throw new PhotometryReductionError('calibration');
 if(input.skyAtReferenceAperture!==null&&(!Number.isFinite(input.skyAtReferenceAperture)||input.skyAtReferenceAperture<0))throw new PhotometryReductionError('sky');
 const baseCountRate=input.nativeBaseCountSum/r.integrationSeconds;
 // This is the native sqrt(total) display, NOT a new background-noise model.
 const nativeDisplaySnr=Math.sqrt(input.totalPhotonCount);
 const base={...r,baseCountRate,nativeDisplaySnr};
 if(input.skyAtReferenceAperture===null)return Object.freeze({...base,status:'missing-sky' as const,scaledSkyRate:null,netCountRate:null,ratio:null,magnitude:null});
 const scaledSkyRate=input.skyAtReferenceAperture*r.apertureFactor,netCountRate=r.meanCountRate-scaledSkyRate;
 if(!Number.isFinite(scaledSkyRate)||!Number.isFinite(netCountRate))throw new PhotometryReductionError('overflow');
 if(netCountRate<=0)return Object.freeze({...base,status:'nonpositive-net' as const,scaledSkyRate,netCountRate,ratio:null,magnitude:null});
 const ratio=netCountRate/baseCountRate,magnitude=input.zeroPointMagnitude-2.5*Math.log10(ratio);
 if(!Number.isFinite(ratio)||ratio<=0||!Number.isFinite(magnitude))throw new PhotometryReductionError('overflow');
 // 0x50179d compares the stored magnitude to zero. Do not certify a native
 // flag decision when the Number result lands on that x87-sensitive boundary.
 if(magnitude===0)return Object.freeze({...base,status:'zero-magnitude-boundary' as const,scaledSkyRate,netCountRate,ratio,magnitude:null});
 return Object.freeze({...base,status:'available' as const,scaledSkyRate,netCountRate,ratio,magnitude});
}
/** Original Pleiades student manual PDF pages4/10: B−V = supplied B minus supplied V.
 * No extinction, rounding, type, temperature, distance or automatic fit added. */
export function photometricBMinusV(b:number|null,v:number|null):number{
 if(b===null||v===null||!Number.isFinite(b)||!Number.isFinite(v))throw new PhotometryReductionError('color');
 const color=b-v;if(!Number.isFinite(color))throw new PhotometryReductionError('overflow');return color;
}
