import {galaxyToneProfile} from './galaxyRaster';
import {galaxyCatalogAxes,catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import type {NativeGalaxy} from './pinnedGalaxyField';
import type {RgbImage} from './photons';
import {composeNativeGalaxy} from './detectorRaster';
import {roundNearestEven as round} from './numericPolicy';
/** Recovered0x5943d4,0x53b94c,0x53ba5c,0x594994 and0x53b538.
 * Supplied axes or bounded morphology0 zero-axis branch. Number/Math is an explicit browser policy. */
export function galaxyStampGeometry(g:NativeGalaxy,magnitudeShift=-2){
 if(magnitudeShift!==-2&&magnitudeShift!==0&&magnitudeShift!==3)throw Error('Unsupported telescope paint shift.');
 const axes=galaxyCatalogAxes(g),magnitude=catalogGalaxyMagnitude(g).magnitude;
 const radius=Math.max(3,axes.major*(936/.75/60)/2),major=round(radius),minor=round(radius*axes.ratio);
 const angle=g.positionAngleDegrees!==0?g.positionAngleDegrees*(Math.PI/180)+Math.PI/2:((1000*g.dec)-Math.trunc(1000*g.dec))*(2*Math.PI);
 const level=Math.min(14,Math.max(0,Math.max(0,round(magnitude)-6)-magnitudeShift));
 if(!Number.isFinite(angle)||major<3||major>100||minor<1||minor>major)throw Error('Outside bounded galaxy stamp.');
 return Object.freeze({major,minor,angle,level,magnitude});
}
/** Declared nearest-center replacement for the unmeasured GDI StretchDraw
 * kernel. Source249² to exclusive2a×2b rectangle; extra native bitmap row and
 * column remain black. Recovered inverse rotation rounds coordinates, clips
 * to a/b, reads a+x,a+y and composes the inclusive2a+1 square by red maximum.
 * This is a reproducible browser raster, not native Windows pixel identity. */
export function paintAdaptedGalaxy(target:RgbImage,g:NativeGalaxy,center:Readonly<{x:number;y:number}>,magnitudeShift=-2){
 const geometry=galaxyStampGeometry(g,magnitudeShift),{major:a,minor:b,angle,level}=geometry,size=2*a+1,profile=galaxyToneProfile(level),resized=new Uint8Array(size*size);
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
