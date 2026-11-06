/** Front PHSKY (analysis/front-phsky/RECOVERY.md; CLEA_VEO.exe 781bc970…c54c, static reading only): the Telescope display that the
 * photometer's Sky-mode galaxy gate reads, painted for the photometer field, and that gate.
 *
 * What VIREO does [D]:
 * - TPhotometer 0x500568, galaxy branch (kind 1): in Sky mode (+0x41c ≠ 0) the fraction is 0 when 0x53e338 < Single 80.0
 *   (0x50066d..0x5006b3, constant 0x500898); otherwise the Object-mode galaxy fraction follows.
 * - 0x53e338 averages R+G+B over x = Round(W/2)−1..+1, y = Round(H/2)−9..+9 of the Telescope display TImage TObsrvtry+0x3d8
 *   (TCanvas.Pixels 0x42cea8 → GetPixel), divides by 57 and rounds (photons.slitPixelLevel). 0 when no object is selected.
 * - The display is the telescope view rendered by 0x53a40c: CopyRect (SRCCOPY 0xcc0020) of the 3W × 3H cache +0x550 from
 *   (Round(+0x6ba − W/2), Round(+0x6c4 − H/2)) (0x53a810..0x53a8d8; fresh field: +0x6ba = +0x6c4 = 3W/2, 0x53c55e..0x53c57a), then
 *   the instrument overlay of [Obs+0x41c54c]; the photometer is instrument 2 (jump table 0x53a947 → 0x53ad01): a red (TColor
 *   0x0000FF), 1-pixel, bsClear Ellipse(Round(W/2) − r, Round(H/2) − r, Round(W/2) + r + 1, Round(H/2) + r + 1) with r the aperture
 *   selector +0x41c481 (0x53a8dd..0x53a8f2, 0x53ad01..0x53ad70); then a green 15 × 15 mark when +0x633/+0x637 > 0 (0x53adf4 →
 *   0x53d648), set only by a click on the view and cleared by 0x53d8a4.
 * - The cache is the field painter 0x53b390: black fill (0x538420 → FillRect with brush 0), galaxies in list order (NGC 224
 *   skipped, 0x53b4fc; bank set 6, 0x53b432; level = bank(magnitude) − +0x6f8 clamped 0..14, 0x53b538..0x53b556; stamp
 *   0x59456c at the rounded projected position), then stars of kinds 0/2/3 (stored level +0x57 − +0x6f8 clamped 0..14, 99 × 99
 *   profile 0x59417c). The projection 0x5949c8 takes 3W, 3H and the field Field Creation Factor × Instr. Field / 60 degrees
 *   (0x53c51f..0x53c6ce), and the galaxy radius 0x5943d4 is major × (+0x41c4b7 = px per degree) / 60 / 2. With the photometer's
 *   declared 1′ Instr. Field (docs/PHOTOMETER-FIELD.md) that is 936 px over 0.05°, 312 px per arcminute; star stamps do not scale.
 *
 * What is not determinable and how it is handled:
 * - GDI's StretchBlt kernel for the galaxy stamp (TBitmap.Draw 0x431714: HALFTONE when the screen has ≤ 8 bits per pixel, else
 *   STRETCH_DELETESCANS; the pixel phase is not documented): each stamp pixel is bounded by the profile values over its source
 *   footprint widened by one source pixel on each side. The declared value (`declared`) is the engine's nearest-centre choice.
 * - The rotated readback 0x59456c rounds Extended FSIN/FCOS products (0x5946b9, 0x5946cd, Round 0x59471a/0x59473a); where a
 *   product lies within 1e-9 of a half-integer (possible when the rotation angle, position angle plus the dec-derived term, is a
 *   multiple of 30°: 518 catalogue galaxies by position angle and most widened rows by PA-0 dec-derived angles such as 120°/300°),
 *   both neighbouring readbacks bound the pixel. Limit: Number's binary64 dec term can shift the angle by about 5e-11 rad, so the
 *   1e-9 window covers readbacks only within about 20 px of a stamp's centre; beyond that a tie-prone pixel of a large stamp is not
 *   widened (measured: every widened gate is at least 160 levels from 80).
 * - GDI's Ellipse pen pixels for r ≤ 9 (r ≥ 10 cannot reach the 3 × 19 patch): a patch pixel within [r − 0.75, r + 1.25] of the
 *   centre may be red (255 + 0 + 0) or keep its colour [I].
 * - The decision is taken only when the whole level interval is on one side of 80; otherwise the gate is `undecided` and the Sky
 *   reading stays typed (`photometer-galaxy-sky`).
 * - Very large stamps: 0x59456c allocates two (2a+1)² bitmaps for every painted galaxy (0x5945b2, 0x594643; no size bound). At
 *   312 px per arcminute a 13′ galaxy needs 4095² pixels per bitmap; whether Windows can allocate that (and what the display shows
 *   when the paint fails) is not determinable here, so a field with a painted galaxy above `stampBound` (a ≤ 2047, 64 MB per
 *   bitmap at 32 bpp, a web bound [W]) leaves the gate typed (`photometer-galaxy-sky-stamp`).
 * Web choices [W]: a true-colour display (> 8 bpp; at ≤ 8 bpp HALFTONE and the palette change the pixels, at 16 bpp GetPixel
 * returns 5/6-bit channels; the measured margins are in RECOVERY.md), the fresh view (no drift: VIREO's +0x6a6/+0x6b0 drift
 * offsets are 0 after a field load, 0x53c581..0x53c5a4), the Telescope view in instrument mode (not the finder, +0x64a = 0; not
 * slewing, +0x64d = 0), and no click mark (+0x633 = +0x637 = 0). Number arithmetic, not x87 (declared photometer policy). */
import {galaxyStampGeometry,type GalaxyStampScale} from './galaxyScene';
import {galaxyCatalogAxes} from './galaxyCatalogAxes';
import {galaxyToneProfile,GALAXY_STAMP_SIZE} from './galaxyRaster';
import {nativeStellarPaintLevel,nativeStoredStellarLevel} from './catalogPopulation';
import {prepareNativeStarProfile} from './starProfiles';
import {createNativeSelectionScene} from './objectSelection';
import {roundNearestEven} from './numericPolicy';
import type {NativeGalaxy} from './pinnedGalaxyField';
import type {Pointing} from './sky';

export class PhotometerDisplayError extends Error{constructor(readonly code:'input'|'evidence'){super(`Photometer display: ${code}`);this.name='PhotometerDisplayError';}}
/** The photometer field's Telescope display: TImage 312², cache 3 × 312 = 936² over Field Creation Factor 3 × 1′ = 0.05°. */
export const PHOTOMETER_DISPLAY=Object.freeze({cache:936,viewport:312,anchor:468,fieldDegrees:3*1/60,
 /** 0x53e338's patch in cache pixels: display x 155..157, y 147..165 plus the crop origin 312. */patch:Object.freeze({x0:467,x1:469,y0:459,y1:477}),
 /** 0x500898: Single 80.0; the gate passes when the level is ≥ 80 (jae at 0x5006a3). */threshold:80,pixels:57,
 /** The Ellipse pen band [I]: patch pixels at a distance d with r − inner ≤ d ≤ r + outer may be pen pixels. */penBand:Object.freeze({inner:.75,outer:1.25}),
 /** [W] The largest stamp half-size a (0x5943d4) for which the paint is taken to succeed: (2a+1)² ≤ 4095² pixels per bitmap. */stampBound:2047});
/** 0x5943d4 with +0x41c4b7 = 936 / (3·1/60) px per degree: 312 px per arcminute; galaxy bank set 6 (0x53b432); no size bound. */
export const PHOTOMETER_GALAXY_STAMP_SCALE:GalaxyStampScale=Object.freeze({pixelsPerArcminute:PHOTOMETER_DISPLAY.cache/PHOTOMETER_DISPLAY.fieldDegrees/60,bankOffset:6,maxMajor:Number.POSITIVE_INFINITY});
/** The telescope records' +0x6f8 (FIELD_CALIBRATIONS[t].magnitudeShift; checked by a test against the field engine). */
export const PHOTOMETER_DISPLAY_SHIFTS=Object.freeze([-2,0,3] as const);
export type PhotometerDisplayStar=Readonly<{id:string;ra:number;dec:number;type:number;magnitude:number}>;
export type PhotometerDisplayInput=Readonly<{pointing:Pointing;stars:readonly PhotometerDisplayStar[];galaxies:readonly NativeGalaxy[];
 /** Stars whose values are unknown (a TRUE-dispatch variable without a JD): never painted; their stamp must miss the patch. */unknownStars?:ReadonlySet<string>}>;
/** One patch pixel: the grey value (R = G = B) bounds and the declared nearest-centre value. */
export type PhotometerDisplayPixel=Readonly<{x:number;y:number;lo:number;hi:number;declared:number}>;
/** 0x53e338's result bounds: Round(ΣRGB / 57) for the smallest and largest admitted patch, and the declared patch. */
export type PhotometerDisplayLevel=Readonly<{min:number;max:number;declared:number}>;
/** Per telescope record: the level for apertures ≥ 10 (the Ellipse misses the patch) and for apertures 5..9. */
export type PhotometerDisplayLevels=Readonly<{wide:PhotometerDisplayLevel;small:readonly PhotometerDisplayLevel[];/** The largest stamp half-size a among the painted galaxies (0 when none). */largestStamp:number}>;
export type PhotometerSkyGate='open'|'closed'|'undecided';
const SMALL_APERTURES=Object.freeze([5,6,7,8,9]);
const isNgc224=(id:string)=>id.includes('NGC 224');
/** The source index range a GDI stretch of 249 source pixels onto `dest` pixels may read for destination pixel `c`: its
 * proportional footprint widened by one source pixel on each side, inside 0..248. */
function footprint(c:number,dest:number):readonly [number,number]{
 const s=GALAXY_STAMP_SIZE/dest;
 return [Math.max(0,Math.floor(c*s)-1),Math.min(GALAXY_STAMP_SIZE-1,Math.ceil((c+1)*s))];
}
type Painted={lo:Float64Array;hi:Float64Array;declared:Float64Array};
const tones=new Map<number,Uint8Array>();
/** galaxyToneProfile, kept per level (read only here). */
function toneProfile(level:number){let p=tones.get(level);if(!p){p=galaxyToneProfile(level);tones.set(level,p);}return p;}
const PATCH_W=3,PATCH_H=19;
function patchIndex(x:number,y:number){const {x0,x1,y0,y1}=PHOTOMETER_DISPLAY.patch;return x<x0||x>x1||y<y0||y>y1?-1:(y-y0)*PATCH_W+(x-x0);}
/** 0x59456c → 0x594488 → 0x594808 on the patch only: the rotated readback of the stretched 249² tone profile, composed by red
 * maximum. Out-of-stamp or black readbacks leave the pixel. */
function paintGalaxy(out:Painted,g:NativeGalaxy,center:Readonly<{x:number;y:number}>,shift:number){
 let geometry;
 try{geometry=galaxyStampGeometry(g,shift,PHOTOMETER_GALAXY_STAMP_SCALE);}
 catch(e){
  // As the field engine (fieldEngine.ts telescopeGalaxyGate): only a minor axis that rounds to 0 px composes nothing [I];
  // anything else is an evidence error.
  if(!(e instanceof Error&&e.message==='Outside bounded galaxy stamp.'))throw e;
  const axes=galaxyCatalogAxes(g),r=Math.max(3,axes.major*PHOTOMETER_GALAXY_STAMP_SCALE.pixelsPerArcminute/2);
  if(roundNearestEven(r*axes.ratio)>=1)throw new PhotometerDisplayError('evidence');
  return;
 }
 const {major:a,minor:b,angle,level}=geometry,profile=toneProfile(level),sin=Math.sin(angle),cos=Math.cos(angle);
 const {x0,x1,y0,y1}=PHOTOMETER_DISPLAY.patch;
 /** The stretched bitmap at (col a+sx, row a+sy) of the readback: bounds over the footprint, and the declared value; null when the
  * readback is outside the stamp or on the black extra row/column (the pixel is left). */
 const read=(sx:number,sy:number)=>{
  if(Math.abs(sx)>a||Math.abs(sy)>b)return null;
  const row=b+sy,col=a+sx;if(row<0||row>=2*b||col<0||col>=2*a)return null;
  const declared=profile[Math.min(248,Math.floor((row+.5)*249/(2*b)))*249+Math.min(248,Math.floor((col+.5)*249/(2*a)))];
  const [r0,r1]=footprint(row,2*b),[c0,c1]=footprint(col,2*a);let lo=255,hi=0;
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const v=profile[r*249+c];if(v<lo)lo=v;if(v>hi)hi=v;}
  return {lo,hi,declared};
 };
 for(let Y=y0;Y<=y1;Y++)for(let X=x0;X<=x1;X++){
  const x=X-center.x,y=Y-center.y;if(Math.abs(x)>a||Math.abs(y)>a)continue;// outside the composed (2a+1)² square
  // 0x59456c: Round of Extended FSIN/FCOS products (0x5946b9, 0x5946cd, 0x59471a, 0x59473a). Within 1e-9 of a half-integer the
  // x87 result may round the other way than Number's, so both neighbours bound the pixel (review 1 L3); the declared value keeps
  // Number's rounding.
  const u=x*cos-y*sin,v=y*cos+x*sin,su=photometerRoundCandidates(u),sv=photometerRoundCandidates(v);
  let lo=255,hi=0,any=false,miss=false;
  for(const sx of su)for(const sy of sv){const q=read(sx,sy);if(!q){miss=true;continue;}any=true;lo=Math.min(lo,q.lo);hi=Math.max(hi,q.hi);}
  if(!any)continue;if(miss)lo=0;
  const d=read(roundNearestEven(u),roundNearestEven(v));
  const i=patchIndex(X,Y);
  out.lo[i]=Math.max(out.lo[i],lo);out.hi[i]=Math.max(out.hi[i],hi);if(d)out.declared[i]=Math.max(out.declared[i],d.declared);
 }
}
/** Round's result, or both neighbours within 1e-9 of a half-integer (an x87 near-tie). */
export function photometerRoundCandidates(t:number):readonly number[]{
 const f=Math.floor(t);return Math.abs(t-f-.5)<1e-9?[f,f+1]:[roundNearestEven(t)];
}
/** 0x59417c on the patch: a 99 × 99 level table at the rounded position, values ≥ 30 composed by maximum (paintNativeStar). */
function paintStar(out:Painted,levels:Uint8Array,center:Readonly<{x:number;y:number}>){
 const {x0,x1,y0,y1}=PHOTOMETER_DISPLAY.patch;
 for(let Y=y0;Y<=y1;Y++)for(let X=x0;X<=x1;X++){
  const x=X-center.x+49,y=Y-center.y+49;if(x<0||x>98||y<0||y>98)continue;
  const v=levels[x*99+y];if(v<30)continue;
  const i=patchIndex(X,Y);out.lo[i]=Math.max(out.lo[i],v);out.hi[i]=Math.max(out.hi[i],v);out.declared[i]=Math.max(out.declared[i],v);
 }
}
const starReachesPatch=(c:Readonly<{x:number;y:number}>)=>{const {x0,x1,y0,y1}=PHOTOMETER_DISPLAY.patch;return c.x+49>=x0&&c.x-49<=x1&&c.y+49>=y0&&c.y-49<=y1;};
/** The 57 patch pixels of the photometer-field Telescope display for one telescope record (+0x6f8 = `shift`). */
export function photometerDisplayPatch(input:PhotometerDisplayInput,shift:number):readonly PhotometerDisplayPixel[]{
 if(!input||!PHOTOMETER_DISPLAY_SHIFTS.includes(shift as -2|0|3)||!Array.isArray(input.stars)||!Array.isArray(input.galaxies))throw new PhotometerDisplayError('input');
 const {cache,fieldDegrees}=PHOTOMETER_DISPLAY,unknown=input.unknownStars??new Set<string>();
 const scene=createNativeSelectionScene(input.stars,input.galaxies,{width:cache,height:cache,fieldDegrees,center:input.pointing,population:{coverage:'complete',provenance:'photometer field display (Front PHSKY)'}});
 const n=PATCH_W*PATCH_H,out:Painted={lo:new Float64Array(n),hi:new Float64Array(n),declared:new Float64Array(n)};
 input.galaxies.forEach((g,i)=>{if(isNgc224(g.id))return;const p=scene.galaxies[i];paintGalaxy(out,g,{x:roundNearestEven(p.x),y:roundNearestEven(p.y)},shift);});
 const profiles=new Map<number,Uint8Array>();
 input.stars.forEach((s,i)=>{
  const p=scene.stars[i],c={x:roundNearestEven(p.x),y:roundNearestEven(p.y)};
  if(unknown.has(s.id)){if(starReachesPatch(c))throw new PhotometerDisplayError('evidence');return;}
  const level=nativeStellarPaintLevel(s.type,nativeStoredStellarLevel(s.magnitude,1,'round'),shift);if(level===null)return;
  if(!profiles.has(level))profiles.set(level,prepareNativeStarProfile(level));paintStar(out,profiles.get(level)!,c);
 });
 const {x0,y0}=PHOTOMETER_DISPLAY.patch;
 return Object.freeze(Array.from({length:n},(_,i)=>Object.freeze({x:x0+i%PATCH_W,y:y0+Math.floor(i/PATCH_W),lo:out.lo[i],hi:out.hi[i],declared:out.declared[i]})));
}
/** Patch pixels the aperture's Ellipse may cover [I]: none for r ≥ 10. */
export function photometerPenCandidate(pixel:Readonly<{x:number;y:number}>,apertureSelector:number):boolean{
 if(apertureSelector>=10)return false;
 const d=Math.hypot(pixel.x-PHOTOMETER_DISPLAY.anchor,pixel.y-PHOTOMETER_DISPLAY.anchor),{inner,outer}=PHOTOMETER_DISPLAY.penBand;
 return d>=apertureSelector-inner&&d<=apertureSelector+outer;
}
/** 0x53e338 bounds with the overlay of this aperture. The declared patch lights the pen pixels within half a pixel of r. */
export function photometerDisplayLevel(patch:readonly PhotometerDisplayPixel[],apertureSelector:number):PhotometerDisplayLevel{
 if(!Array.isArray(patch)||patch.length!==PHOTOMETER_DISPLAY.pixels||!Number.isInteger(apertureSelector)||apertureSelector<5||apertureSelector>150)throw new PhotometerDisplayError('input');
 let min=0,max=0,declared=0;
 for(const p of patch){
  if(photometerPenCandidate(p,apertureSelector)){
   min+=Math.min(3*p.lo,255);max+=Math.max(3*p.hi,255);
   declared+=Math.abs(Math.hypot(p.x-PHOTOMETER_DISPLAY.anchor,p.y-PHOTOMETER_DISPLAY.anchor)-apertureSelector)<.5?255:3*p.declared;
  }else{min+=3*p.lo;max+=3*p.hi;declared+=3*p.declared;}
 }
 const r=(v:number)=>roundNearestEven(v/PHOTOMETER_DISPLAY.pixels);
 return Object.freeze({min:r(min),max:r(max),declared:r(declared)});
}
/** The largest stamp half-size a = Round(max(3, major × 312 / 2)) (0x5943d4; zero major 0.5) among the galaxies 0x53b390 paints
 * (all but NGC 224), including those whose minor axis rounds to 0 px: both bitmaps are allocated before anything is composed. */
export function photometerLargestStamp(galaxies:readonly NativeGalaxy[]):number{
 let largest=0;
 for(const g of galaxies){if(isNgc224(g.id))continue;const axes=galaxyCatalogAxes(g);largest=Math.max(largest,roundNearestEven(Math.max(3,axes.major*PHOTOMETER_GALAXY_STAMP_SCALE.pixelsPerArcminute/2)));}
 return largest;
}
/** The display levels a selected galaxy's frame needs: per telescope record, apertures ≥ 10 and 5..9. */
export function photometerDisplayLevels(input:PhotometerDisplayInput):readonly PhotometerDisplayLevels[]{
 const largestStamp=photometerLargestStamp(input.galaxies);
 return Object.freeze(PHOTOMETER_DISPLAY_SHIFTS.map(shift=>{
  const patch=photometerDisplayPatch(input,shift);
  return Object.freeze({wide:photometerDisplayLevel(patch,10),small:Object.freeze(SMALL_APERTURES.map(a=>photometerDisplayLevel(patch,a))),largestStamp});
 }));
}
export const photometerStampWithinBound=(levels:PhotometerDisplayLevels)=>levels.largestStamp<=PHOTOMETER_DISPLAY.stampBound;
export function photometerDisplayLevelFor(levels:readonly PhotometerDisplayLevels[],telescopeIndex:number,apertureSelector:number):PhotometerDisplayLevel{
 const l=levels?.[telescopeIndex];if(!l||!Number.isInteger(apertureSelector)||apertureSelector<5||apertureSelector>150)throw new PhotometerDisplayError('input');
 return apertureSelector>=10?l.wide:l.small[apertureSelector-5];
}
/** 0x50066d..0x5006b3 on the bounds: open (level ≥ 80 for every admitted patch), closed (< 80 for every one) or undecided. */
export function photometerSkyGate(level:PhotometerDisplayLevel):PhotometerSkyGate{
 const t=PHOTOMETER_DISPLAY.threshold;
 return level.min>=t?'open':level.max<t?'closed':'undecided';
}
