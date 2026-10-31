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
/** maxMajor: the web's bound on the stamp's major axis [W] (VIREO's 0x59456c/StretchDraw has none): 100 px in the telescope cache
 * (typed stamp-bound beyond it); the finder cache's half, 468 px, so every finder galaxy is drawn (M31 is about 185 px; Front G5
 * review 1 M1). */
export const GALAXY_STAMP_SCALES=Object.freeze({telescope:Object.freeze({pixelsPerArcminute:936/.75/60,bankOffset:6,maxMajor:100}),finder:Object.freeze({pixelsPerArcminute:936/7.5/60,bankOffset:1,maxMajor:468})});
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
