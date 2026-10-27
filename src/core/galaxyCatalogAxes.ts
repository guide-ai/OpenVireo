import {galaxyInstrumentMagnitude} from './galaxyCalibration';
import {decodeHtlExtended} from './hotList';
import type {NativeGalaxy} from './pinnedGalaxyField';
/** Axis-ratio fallback 0x53b94c (multi-galaxy-recovery/axis-fallback.asm; constants read statically from CLEA_VEO.exe
 * 781bc970…c54c): when the Single major (+0x2f) or minor (+0x33) equals 0.0 (0x53ba54), the ratio comes from the signed
 * morphology byte (+0x3d): ≤−4 → 1.0; −3/−2/−1/0 → Extended 0.9/0.8/0.7/0.6 (stored as 10-byte immediates); 1..8 or 20 →
 * Frac(1000·RA) with Single 1000 at 0x53ba58 and helper 0x40365c (x − trunc(x) under a chop control word); otherwise 1.0.
 * The Extended immediates are projected to binary64 nearest-even (decodeHtlExtended). 1000·RA is exact in the 64-bit
 * Extended significand, so the fraction is computed exactly (BigInt) and then rounded once to binary64: a declared Number
 * policy, not x87 execution of later products.
 * Consumers: geometry 0x5943d4 (galaxy-geometry.asm) substitutes Extended 0.5 for a zero major and multiplies the radius by
 * this ratio; magnitude 0x55ea94 (surface-brightness.asm) substitutes 0.5 for a zero major and ratio·major for a zero minor
 * only. So `major`/`minor` here are the magnitude axes and `ratio` the geometry ratio. */
const extended=(hex:string)=>decodeHtlExtended(Uint8Array.from(hex.match(/../g)!,x=>parseInt(x,16)));
export const AXIS_FALLBACK_RATIOS=Object.freeze({
 '-3':extended('66666666666666e6fe3f'),'-2':extended('cdccccccccccccccfe3f'),'-1':extended('33333333333333b3fe3f'),'0':extended('9a99999999999999fe3f'),
});
/** Exact Frac(1000·ra) of a binary64 RA, rounded once to binary64. */
export function raFractionRatio(ra:number):number{
 if(!Number.isFinite(ra)||ra<0)throw Error('Invalid galaxy RA.');
 const v=new DataView(new ArrayBuffer(8));v.setFloat64(0,ra);const bits=v.getBigUint64(0),e=Number(bits>>52n&0x7ffn),f=bits&((1n<<52n)-1n);
 if(e===0&&f===0n)return 0;
 const m=e?f|1n<<52n:f,shift=(e?e:1)-1075;// ra = m·2^shift
 if(shift>=0)return 0;
 const den=1n<<BigInt(-shift),num=(1000n*m)%den;
 return Number(num)/Number(den);
}
/** 0x53b94c ratio for a record with a zero axis. */
export function morphologyAxisRatio(morphology:number,ra:number):number{
 if(!Number.isInteger(morphology)||morphology<-128||morphology>127)throw Error('Invalid galaxy morphology.');
 if(morphology<=-4)return 1;
 if(morphology<=0)return AXIS_FALLBACK_RATIOS[String(morphology) as keyof typeof AXIS_FALLBACK_RATIOS];
 if(morphology<=8||morphology===20)return raFractionRatio(ra);
 return 1;
}
/** 0x53b94c, 0x5943d4, 0x599324 and 0x55ea94. Supplied axes, or the recovered zero-axis branches. The zero-minor substitution
 * is Extended/Number, never narrowed to Single. */
export function galaxyCatalogAxes(g:NativeGalaxy){
 const major=Math.fround(g.majorArcminutes),minor=Math.fround(g.minorArcminutes);
 if(!Number.isFinite(major)||!Number.isFinite(minor)||major<0||minor<0)throw Error('Invalid galaxy axes.');
 if(major>0&&minor>0)return Object.freeze({major,minor,ratio:minor/major,fallback:false});
 const ratio=morphologyAxisRatio(g.morphology,g.ra),usedMajor=major===0?.5:major,usedMinor=minor===0?ratio*usedMajor:minor;
 return Object.freeze({major:usedMajor,minor:usedMinor,ratio,fallback:true});
}
export function catalogGalaxyMagnitude(g:NativeGalaxy){
 const axes=galaxyCatalogAxes(g);
 if(!axes.fallback)return galaxyInstrumentMagnitude({apparentMagnitude:g.magnitude,majorArcminutes:g.majorArcminutes,minorArcminutes:g.minorArcminutes});
 const apparentMagnitude=Math.fround(g.magnitude),area=((Math.PI*axes.major)*axes.minor)/4,magnitude=Math.log10(area)*2.5+apparentMagnitude;
 if(!Number.isFinite(magnitude))throw Error('Invalid galaxy magnitude.');
 return Object.freeze({magnitude,area,apparentMagnitude,majorArcminutes:axes.major,minorArcminutes:axes.minor});
}
