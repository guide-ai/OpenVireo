import { roundNearestEven } from './numericPolicy';
import type { RgbImage } from './photons';

/** Post-color-conversion RGB contracts only. These helpers do not reproduce a
 * device palette, stretched Gaussian, original catalog or complete detector. */
export class DetectorRasterError extends Error {
  constructor(readonly code:'image'|'rectangle'|'profile'|'coordinate'){super(`Detector raster contract: ${code}`);this.name='DetectorRasterError';}
}
function image(value:RgbImage):void {
  if(!Number.isSafeInteger(value.width)||!Number.isSafeInteger(value.height)||value.width<1||value.height<1||value.width*value.height>4_000_000||!(value.rgb instanceof Uint8Array||value.rgb instanceof Uint8ClampedArray)||value.rgb.length!==value.width*value.height*3)throw new DetectorRasterError('image');
}
function integer(value:number):void {if(!Number.isInteger(value)||value<-2147483648||value>2147483647)throw new DetectorRasterError('coordinate');}
export type NativeRectangle=Readonly<{left:number;top:number;right:number;bottom:number}>;
/**0x53a880..0x53a8d8 and0x42c7e0: SRCCOPY with equal positive source and
 * destination sizes, after native color conversion. Rect edges here are
 * exclusive, as the original call subtracts right-left and bottom-top.
 * Unsupported clipping/source holes are rejected, never filled with black. */
export function cropNativeFrame(source:RgbImage,rectangle:NativeRectangle):RgbImage {
  image(source);const {left,top,right,bottom}=rectangle;
  for(const v of [left,top,right,bottom])integer(v);
  if(left<0||top<0||right<=left||bottom<=top||right>source.width||bottom>source.height)throw new DetectorRasterError('rectangle');
  const width=right-left,height=bottom-top,rgb=new Uint8Array(width*height*3);
  for(let y=0;y<height;y++)rgb.set(source.rgb.subarray(((top+y)*source.width+left)*3,((top+y)*source.width+right)*3),y*width*3);
  return Object.freeze({width,height,rgb});
}
/** Fresh-render crop at0x53a810..0x53a83d. Caller supplies the actual native
 * anchor+0x6ba/+0x6c4; it is not inferred from an SVG or cached bitmap size.
 * Explicit nearest-even Number policy, not a verified x87 control word. */
export function freshNativeViewport(width:number,height:number,anchor:Readonly<{x:number;y:number}>):NativeRectangle {
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>4_000_000)throw new DetectorRasterError('image');
  if(!Number.isFinite(anchor.x)||!Number.isFinite(anchor.y))throw new DetectorRasterError('coordinate');
  const left=roundNearestEven(anchor.x-width/2),top=roundNearestEven(anchor.y-height/2),right=left+width,bottom=top+height;
  for(const v of [left,top,right,bottom])integer(v);return Object.freeze({left,top,right,bottom});
}
function inside(target:RgbImage,x:number,y:number):boolean{return x>=0&&y>=0&&x<target.width&&y<target.height;}
/**0x59417c:99×99 grayscale profile, x-major (y fastest), center offset50
 * with loops1..99. Values<30 are suppressed. Strictly brighter red replaces
 * the complete RGB triplet. Off-image reads return CLR_INVALID with red255,
 * so no 0..255 source can win there; clipping implements that supported case. */
export function paintNativeStar(target:RgbImage,levels:Uint8Array,center:Readonly<{x:number;y:number}>):RgbImage {
  image(target);integer(center.x);integer(center.y);
  if(!(levels instanceof Uint8Array)||levels.length!==99*99)throw new DetectorRasterError('profile');
  const rgb=new Uint8Array(target.rgb);
  for(let x=0;x<99;x++)for(let y=0;y<99;y++){
    const value=levels[x*99+y],dx=center.x-49+x,dy=center.y-49+y;
    if(value<30||!inside(target,dx,dy))continue;
    const at=(dy*target.width+dx)*3;
    if(value>rgb[at])rgb[at]=rgb[at+1]=rgb[at+2]=value;
  }
  return Object.freeze({width:target.width,height:target.height,rgb});
}
/** Front G5: paintNativeStar on a raster the caller owns (no copy per star; the same pixels). The finder cache paints thousands
 * of stars into one 936² raster, where a copy per star dominated the cost. */
export function paintNativeStarInPlace(target:RgbImage,levels:Uint8Array,center:Readonly<{x:number;y:number}>):void {
  image(target);integer(center.x);integer(center.y);
  if(!(levels instanceof Uint8Array)||levels.length!==99*99)throw new DetectorRasterError('profile');
  const rgb=target.rgb;
  for(let x=0;x<99;x++){const dx=center.x-49+x;if(dx<0||dx>=target.width)continue;
    for(let y=0;y<99;y++){
      const value=levels[x*99+y],dy=center.y-49+y;
      if(value<30||dy<0||dy>=target.height)continue;
      const at=(dy*target.width+dx)*3;
      if(value>rgb[at])rgb[at]=rgb[at+1]=rgb[at+2]=value;
    }}
}
/**0x594808 uses INCLUSIVE source-region spans, unlike CopyRect. Require all
 * queried source pixels; out-of-source GetPixel/CLR_INVALID is not silently
 * replaced with a black pixel. Source coordinates start at0,0. */
export function composeNativeGalaxy(target:RgbImage,source:RgbImage,rectangle:NativeRectangle):RgbImage {
  image(target);image(source);const {left,top,right,bottom}=rectangle;
  for(const v of [left,top,right,bottom])integer(v);
  const width=right-left+1,height=bottom-top+1;
  if(width<1||height<1||width>source.width||height>source.height)throw new DetectorRasterError('rectangle');
  const rgb=new Uint8Array(target.rgb);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const dx=left+x,dy=top+y;if(!inside(target,dx,dy))continue;
    const from=(y*source.width+x)*3,to=(dy*target.width+dx)*3;
    if(source.rgb[from]>rgb[to])rgb.set(source.rgb.subarray(from,from+3),to);
  }
  return Object.freeze({width:target.width,height:target.height,rgb});
}
