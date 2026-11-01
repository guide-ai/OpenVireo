import {galaxyToneProfile} from './galaxyRaster';
import {galaxyCatalogAxes,catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import type {NativeGalaxy} from './pinnedGalaxyField';
import type {RgbImage} from './photons';
import {composeNativeGalaxy} from './detectorRaster';
import {roundNearestEven as round} from './numericPolicy';
/** Recovered0x5943d4,0x53b94c,0x53ba5c,0x594994 and0x53b538.
 * Supplied axes or bounded morphology0 zero-axis branch. Number/Math is an explicit browser policy. */
/** The telescope cache's stamp scale (0x53b390: 936 px for 0.75°, galaxy bank set 6) and the finder's (0x53b058: 936 px for
 * 7.5° = Field Creation Factor × Finder Field, set 1; Front G5). */
/** maxMajor: VIREO's 0x5943d4 has no bound on the major axis and its draw 0x59456c..0x594805 none either (Front L4, re-read
 * 2026-10-31: the only branches are axis 0 → 0.5 and radius < 3 → 3; the rotation clips |sx| ≤ a, |sy| ≤ b). The telescope cache
 * is therefore unbounded since Front L4 and paints in place, clipped to the cache (paintAdaptedGalaxyInPlace). The finder keeps
 * 1200 px [W], which covers every V ≤ 12 catalogue galaxy (the LMC, A0524-6948, ≈1099 px; G5 closure N1). A galaxy whose minor
 * axis rounds to 0 px (1010-0122, 900′ × 0) is still outside the stamp: 0x594488 stretches into a zero-height rect, so it
 * composes nothing [I]; callers list it as unpainted.
 * (L4 review L1) That is the code: VIREO's draw also allocates two (2a+1)² bitmaps per galaxy (0x5945b2, 0x594643), about 4.8×10⁸ px each for the LMC (and the SMC is of the same order), which Win32 would very likely fail to allocate [I]; the web's acquiring of fields that hold them is therefore [W]/[I], not a recovered VIREO outcome. */
export const GALAXY_STAMP_SCALES=Object.freeze({telescope:Object.freeze({pixelsPerArcminute:936/.75/60,bankOffset:6,maxMajor:Number.POSITIVE_INFINITY}),finder:Object.freeze({pixelsPerArcminute:936/7.5/60,bankOffset:1,maxMajor:1200})});
export type GalaxyStampScale=typeof GALAXY_STAMP_SCALES[keyof typeof GALAXY_STAMP_SCALES];
export function galaxyStampGeometry(g:NativeGalaxy,magnitudeShift=-2,scale:GalaxyStampScale=GALAXY_STAMP_SCALES.telescope){
 if(magnitudeShift!==-2&&magnitudeShift!==0&&magnitudeShift!==3)throw Error('Unsupported telescope paint shift.');
 const axes=galaxyCatalogAxes(g),magnitude=catalogGalaxyMagnitude(g).magnitude;
 const radius=Math.max(3,axes.major*scale.pixelsPerArcminute/2),major=round(radius),minor=round(radius*axes.ratio);
 const angle=g.positionAngleDegrees!==0?g.positionAngleDegrees*(Math.PI/180)+Math.PI/2:((1000*g.dec)-Math.trunc(1000*g.dec))*(2*Math.PI);
 const level=Math.min(14,Math.max(0,Math.max(0,round(magnitude)-scale.bankOffset)-magnitudeShift));
 if(!Number.isFinite(angle)||major<3||major>scale.maxMajor||minor<1||minor>major)throw Error('Outside bounded galaxy stamp.');
 return Object.freeze({major,minor,angle,level,magnitude});
}
/** Declared nearest-center replacement for the unmeasured GDI StretchDraw
 * kernel. Source249² to exclusive2a×2b rectangle; extra native bitmap row and
 * column remain black. Recovered inverse rotation rounds coordinates, clips
 * to a/b, reads a+x,a+y and composes the inclusive2a+1 square by red maximum.
 * This is a reproducible browser raster, not native Windows pixel identity. */
export function paintAdaptedGalaxy(target:RgbImage,g:NativeGalaxy,center:Readonly<{x:number;y:number}>,magnitudeShift=-2,scale:GalaxyStampScale=GALAXY_STAMP_SCALES.telescope){
 const geometry=galaxyStampGeometry(g,magnitudeShift,scale),{major:a,minor:b,angle,level}=geometry,size=2*a+1,profile=galaxyToneProfile(level),resized=new Uint8Array(size*size);
 for(let y=0;y<2*b;y++)for(let x=0;x<2*a;x++){
  const sx=Math.min(248,Math.floor((x+.5)*249/(2*a))),sy=Math.min(248,Math.floor((y+.5)*249/(2*b)));
  resized[(a-b+y)*size+x]=profile[sy*249+sx];
 }
 const rgb=new Uint8Array(size*size*3),sin=Math.sin(angle),cos=Math.cos(angle);
 for(let y=-a;y<=a;y++)for(let x=-a;x<=a;x++){
  const sx=round(x*cos-y*sin),sy=round(y*cos+x*sin);
  if(Math.abs(sx)>a||Math.abs(sy)>b)continue;
  const value=resized[(a+sy)*size+a+sx],at=((y+a)*size+x+a)*3;
  rgb[at]=rgb[at+1]=rgb[at+2]=value;
 }
 return {geometry,image:composeNativeGalaxy(target,{width:size,height:size,rgb},{left:center.x-a,top:center.y-a,right:center.x+a,bottom:center.y+a})};
}
/** Front G5 closure N1: paintAdaptedGalaxy + composeNativeGalaxy on a raster the caller owns, computed only over the target pixels
 * the stamp covers (the same pixels: the stamp is grey, so the red-maximum compose copies the value into all three channels). It
 * never builds the (2a+1)² stamp, so a stamp much larger than the cache (the LMC in the finder, any large galaxy in the
 * telescope cache since Front L4) costs only the cache pixels it covers. */
export function paintAdaptedGalaxyInPlace(target:RgbImage,g:NativeGalaxy,center:Readonly<{x:number;y:number}>,magnitudeShift=-2,scale:GalaxyStampScale=GALAXY_STAMP_SCALES.telescope){
 const geometry=galaxyStampGeometry(g,magnitudeShift,scale),{major:a,minor:b,angle,level}=geometry,profile=galaxyToneProfile(level);
 // The resized stamp of paintAdaptedGalaxy, read on demand (Front L4: no (2a+1)² buffer, so a stamp far larger than the cache
 // costs only the pixels it covers): row a+sy, column a+sx holds the profile in rows a−b..a+b−1 and columns 0..2a−1, else 0.
 const resizedAt=(sx:number,sy:number)=>{const y=b+sy,x=a+sx;if(y<0||y>=2*b||x<0||x>=2*a)return 0;
  return profile[Math.min(248,Math.floor((y+.5)*249/(2*b)))*249+Math.min(248,Math.floor((x+.5)*249/(2*a)))];};
 const sin=Math.sin(angle),cos=Math.cos(angle),rgb=target.rgb,w=target.width,h=target.height;
 const y0=Math.max(-a,-center.y),y1=Math.min(a,h-1-center.y),x0=Math.max(-a,-center.x),x1=Math.min(a,w-1-center.x);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const sx=round(x*cos-y*sin),sy=round(y*cos+x*sin);
  if(Math.abs(sx)>a||Math.abs(sy)>b)continue;
  const value=resizedAt(sx,sy),at=((center.y+y)*w+center.x+x)*3;
  if(value>rgb[at])rgb[at]=rgb[at+1]=rgb[at+2]=value;
 }
 return geometry;
}
