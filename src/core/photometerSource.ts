/** Pinned VIREO finite point-source slice. docs/PHOTOMETER-SOURCE.md.
 * Number adaptation; supplied aperture geometry and known native Single colors.
 * No object selection, new PSF, acquisition, time or default calibration. */
export class PhotometerSourceError extends Error {
 constructor(readonly code:'geometry'|'boundary'|'convergence'|'magnitude'|'fraction'|'missing-color'|'overflow'|'neighbors') {super(`Photometer source: ${code}`);this.name='PhotometerSourceError';}
}
//0x55f7d4, startup0x5ad159: exp(-x*x/2)/sqrt(2*pi).
function density(x:number){return Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);}
/**0x55f5b8: trapezoid refinement, (4*T-oldT)/3, strict relative1e-7,
 * max10 iterations. Constructor stores integral(-5,x), NOT a modern CDF.
 * New guard rejects nonconvergence instead of consuming an unchecked table. */
function integrate(x:number):number {
 let t=0,oldT=-1e30,oldS=-1e30,n=1;
 for(let iteration=1;iteration<=10;iteration++){
  if(iteration===1)t=(density(-5)+density(x))*(x+5)*.5;
  else{const step=(x+5)/n;let at=-5+step*.5,sum=0;for(let j=0;j<n;j++){sum+=density(at);at+=step;}t=(t+(x+5)*sum/n)*.5;n*=2;}
  const s=(4*t-oldT)/3;
  if(Math.abs(s-oldS)<Math.abs(oldS)*1e-7)return s;
  oldS=s;oldT=t;
 }
 throw new PhotometerSourceError('convergence');
}
let table:readonly number[]|undefined;
function normalTable():readonly number[]{
 // Original builds0..100 by repeated Extended0.1 additions; Number uses
 // explicit index coordinates instead of a guessed x87 accumulation trajectory.
 if(!table)table=Object.freeze([0,...Array.from({length:100},(_,i)=>integrate(-5+(i+1)/10))]);
 return table;
}
/**0x55f91c: clipped lookup with linear interpolation. Native inclusive+5 can
 * address table101; the bounded port explicitly withholds that boundary. */
export function photometerNormalIntegral(x:number):number {
 if(!Number.isFinite(x))throw new PhotometerSourceError('geometry');
 if(x < -5)return 0;if(x > 5)return 1;
 const q=(x+5)*10,i=Math.floor(q);
 if(i>=100)throw new PhotometerSourceError('boundary');
 const values=normalTable();return values[i]+(q-i)*(values[i+1]-values[i]);
}
/**0x59a49c: recovered flat tangent-distance convention, not a new spherical
 * distance. Wrap |RA difference| at12h, multiply15*cos(pointing declination),
 * combine with declination difference. Original object fields are Double. */
export function photometerSeparation(pointingRaHours:number,pointingDecDegrees:number,objectRaHours:number,objectDecDegrees:number):number {
 for(const ra of [pointingRaHours,objectRaHours])if(!Number.isFinite(ra)||ra<0||ra>24)throw new PhotometerSourceError('geometry');
 for(const dec of [pointingDecDegrees,objectDecDegrees])if(!Number.isFinite(dec)||Math.abs(dec)>90)throw new PhotometerSourceError('geometry');
 let delta=Math.abs(pointingRaHours-objectRaHours);if(delta>12)delta=24-delta;
 const x=Math.cos(pointingDecDegrees*0.017453292519943295)*delta*15,y=pointingDecDegrees-objectDecDegrees;
 return Math.sqrt(x*x+y*y);
}
/**0x50059f–0x500668. Tracking stack pushes establishes the signed limits:
 * I((r-d)/s) - I(-(r+d)/s). Supplied geometry has matching units;
 * seeingScale is a prepared width, not an assumed FWHM or sigma. */
export function photometerPointFraction(radius:number,separation:number,seeingScale:number):number {
 if(!Number.isFinite(radius)||radius<0||!Number.isFinite(separation)||separation<0||!Number.isFinite(seeingScale)||seeingScale<=0)throw new PhotometerSourceError('geometry');
 const a=(radius-separation)/seeingScale,b=-(radius+separation)/seeingScale;
 if(!Number.isFinite(a)||!Number.isFinite(b))throw new PhotometerSourceError('overflow');
 const value=photometerNormalIntegral(a)-photometerNormalIntegral(b);
 if(!Number.isFinite(value)||value<0||value>1)throw new PhotometerSourceError('overflow');return value;
}
function magnitude(m:number){if(!Number.isFinite(m))throw new PhotometerSourceError('magnitude');}
function fraction(f:number){if(!Number.isFinite(f)||f<0||f>1)throw new PhotometerSourceError('fraction');}
/**0x5953a0: fraction<=0 returns literal30, not a zero-flux observation. */
export function attenuatePhotometerMagnitude(m:number,f:number):number {
 magnitude(m);fraction(f);if(f===0)return 30;
 const value=m-2.5*Math.log10(f);if(!Number.isFinite(value))throw new PhotometerSourceError('overflow');return value;
}
/**0x595338. Caller order retained: near=attenuated neighbor, far=current.
 * No log1p/log-sum-exp replacement: this is the recovered finite expression. */
export function combinePhotometerMagnitudes(near:number,far:number):number {
 magnitude(near);magnitude(far);
 const ratio=10**((far-near)/-2.5);
 if(!Number.isFinite(ratio)||ratio<=0)throw new PhotometerSourceError('overflow');
 const value=near-2.5*Math.log10(1+ratio);
 if(!Number.isFinite(value))throw new PhotometerSourceError('overflow');return value;
}
export type SuppliedPhotometerStar=Readonly<{v:number;bMinusV:number;uMinusB:number;fraction:number}>;
function bands(s:SuppliedPhotometerStar){
 const v=Math.fround(s.v),bv=Math.fround(s.bMinusV),ub=Math.fround(s.uMinusB);
 if(!Number.isFinite(v)||!Number.isFinite(bv)||!Number.isFinite(ub))throw new PhotometerSourceError('magnitude');
 // Native central fallback clones V/B; neighbors do not use the same check.
 // Withhold that domain instead of silently manufacturing known UBV colors.
 if(bv>=30||ub>=30)throw new PhotometerSourceError('missing-color');
 return {u:v+bv+ub,b:v+bv,v};
}
/** Bounded0x4ffa30 UBV fold: complete ordered supplied neighbors, distinct from
 * selected source, positive central fraction and known colors required.
 * Zero-fraction neighbors are skipped before inspecting color as in native.
 * Completeness and source identities remain a future caller contract. */
export function prepareKnownColorPhotometerUbv(central:SuppliedPhotometerStar,neighbors:readonly SuppliedPhotometerStar[]){
 fraction(central.fraction);if(central.fraction===0)throw new PhotometerSourceError('fraction');
 if(!Array.isArray(neighbors)||neighbors.length>10000)throw new PhotometerSourceError('neighbors');
 const original=bands(central);let u=attenuatePhotometerMagnitude(original.u,central.fraction),b=attenuatePhotometerMagnitude(original.b,central.fraction),v=attenuatePhotometerMagnitude(original.v,central.fraction),includedNeighbors=0;
 for(const neighbor of neighbors){fraction(neighbor.fraction);if(neighbor.fraction===0)continue;const n=bands(neighbor);u=combinePhotometerMagnitudes(attenuatePhotometerMagnitude(n.u,neighbor.fraction),u);b=combinePhotometerMagnitudes(attenuatePhotometerMagnitude(n.b,neighbor.fraction),b);v=combinePhotometerMagnitudes(attenuatePhotometerMagnitude(n.v,neighbor.fraction),v);includedNeighbors++;}
 return Object.freeze({u,b,v,includedNeighbors});
}
