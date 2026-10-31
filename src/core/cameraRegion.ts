/** Front C6: VIREO's region record [0x5b5b30] (global 0x61fd44) and the camera selection bounds it gives (static reading,
 * analysis/front-plans/front-c6.md §1). The telescope field load 0x53be70 writes it before reading the catalogue, so a load writes
 * it whether or not the field can be built:
 *   +0x24/+0x2c Double centre := telescope RA/Dec; +0x34 Single env+0x2508/120; +0x20 Single 20.0;
 *   h = Extended(3 · 15.0 / 120.0) = 0.375 (env+0x279b, env+0x2508, 0x53c098);
 *   +0x10/+0x18 Double Dec ∓ h; +0/+8 Double RA ∓ h / (Cos(Dec · π/180) · 15.0), with one fold each: +0 < 0 → +24, +8 > 24 → −24.
 * CCD Select 0x522309 and IR Select 0x51df28 copy its first 9 dwords (the four bounds and the Single limit) into the catalogue
 * request and then raise the limit to 21.5; the selection 0x59cc88 tests rows with 0x59cf58 (nativeNomadCandidateInSelection).
 * Unlike fieldEngine.freshFieldArea (same values), this never throws near the pole: VIREO keeps min < 0 or max > 24 there, and
 * the selection's min < max branch then passes every RA. Number arithmetic stands in for x87 Extended [W]. */
import type {NomadSelection} from './nativeNomadRows';
import type {Pointing} from './sky';

export type CameraRegionRecord=Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number;limitingMagnitude:number;centreRa:number;centreDec:number}>;
/** h of 0x53be70: env+0x279b (3) × env+0x2508 (15.0) / 120.0. */
export const CAMERA_REGION_HALF_DEGREES=3*15/120;
export const CAMERA_REGION_LIMIT=20;

export function cameraRegionRecord(anchor:Pointing):CameraRegionRecord{
 if(!anchor||!Number.isFinite(anchor.ra)||!Number.isFinite(anchor.dec)||anchor.ra<0||anchor.ra>=24||Math.abs(anchor.dec)>90)throw new RangeError('Camera region: anchor');
 const h=CAMERA_REGION_HALF_DEGREES,hr=h/(Math.cos(anchor.dec*(Math.PI/180))*15);
 let minimumRa=anchor.ra-hr,maximumRa=hr+anchor.ra;
 if(minimumRa<0)minimumRa+=24;
 if(maximumRa>24)maximumRa-=24;
 return Object.freeze({minimumRa,maximumRa,minimumDec:anchor.dec-h,maximumDec:anchor.dec+h,limitingMagnitude:CAMERA_REGION_LIMIT,centreRa:anchor.ra,centreDec:anchor.dec});
}
/** The camera request's bounds: the record's four bounds with Select's raised limit (21.5, `selectionMagnitudeLimit`). */
export function cameraRegionSelection(region:CameraRegionRecord,magnitudeLimit:number):NomadSelection{
 return Object.freeze({minRAHours:region.minimumRa,maxRAHours:region.maximumRa,minDecDegrees:region.minimumDec,maxDecDegrees:region.maximumDec,magnitudeLimit:Math.fround(magnitudeLimit)});
}
