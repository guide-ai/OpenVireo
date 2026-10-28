/** Photographic galaxy images in the telescope field (Front F), static reading of CLEA_VEO.exe 781bc970…c54c. The four bitmaps
 * associated with Object X areas (NGC2403/4262/4631/4656.BMP, user approval of 2026-10-28) are bundled byte-exact; the field
 * engine uses this module through its 'photographs' option.
 *
 * Association (galaxy loader 0x598ed2..0x599128): for each admitted galaxy, the area's photographic list (photographicList.ts,
 * selected by 0x596ab8) is scanned in order; the first photograph whose name contains the galaxy's name (Pos 0x40640c) gets an
 * image object (0x59721c, TBitmap) attached at galaxy +0x55, and the galaxy's name becomes the photograph's; the galaxy is then
 * inserted (0x492728) exactly as without a photograph — the population order does not change.
 * Load 0x597290: copy the 135-byte photo record, LoadFromFile(<images dir> + file) (a missing file raises; no kept row names one),
 * then rescale: factor = {0.7, 0.85, 1.2}[selected telescope record, env+0x3818] × 0.8 (0x597460); for y = 1..Height and
 * x = 1..Width (TBitmap VMT +0x20 GetHeight, +0x2c GetWidth): value = Round(red(Pixels[x,y]) × factor) clamped to 255, written
 * back as gray. Pixels at x = Width or y = Height are outside the bitmap (GetPixel CLR_INVALID, SetPixel ignored), so row 0 and
 * column 0 keep their original values.
 * Draw 0x597470 (called by the compositor 0x53b5d5..0x53b61c instead of the synthetic stamp, with the galaxy's cached projected
 * Double position): left = Round(x) − centreX, top = Round(y) − centreY (GLIMAGES columns 9/10, record +0x83/+0x85);
 * TCanvas.Draw copies the bitmap unscaled (SRCCOPY: it overwrites, unlike the synthetic stamp's larger-red replacement).
 * The written colour is a plain COLORREF RGB(v,v,v) (0x5973f5..0x597404: v | v<<8 | v<<16, no PALETTERGB flag) through
 * TCanvas.Pixels (0x42ced4 → Windows SetPixel). How GDI maps it onto the 8-bit bitmap's colour table happens inside Windows, not
 * in CLEA_VEO.exe, so it cannot be traced statically. Web adaptation (declared, not invented data): the nearest entry of the
 * bitmap's own palette (squared RGB distance, first on ties); no palette is added or changed. Other adaptations: 8-bit
 * palettized BMPs only; Round is nearest-even (FISTP under the session control word is not measured); the cached raster is 24-bit
 * RGB. */
import {roundNearestEven} from './numericPolicy';
import type {RgbImage} from './photons';

export class PhotographError extends Error{constructor(readonly code:'bmp'|'telescope'|'geometry'){super(`Photograph: ${code}`);this.name='PhotographError';}}
export type Bitmap8=Readonly<{width:number;height:number;palette:readonly (readonly [number,number,number])[];indices:Uint8Array}>;// indices row-major, top row first
/** BITMAPFILEHEADER + BITMAPINFOHEADER, 8 bits, BI_RGB, bottom-up or top-down, rows padded to 4 bytes. */
export function decodeBitmap8(bytes:Uint8Array):Bitmap8{
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.byteLength<54||bytes[0]!==0x42||bytes[1]!==0x4d)throw new PhotographError('bmp');
 const offset=v.getUint32(10,true),header=v.getUint32(14,true),width=v.getInt32(18,true),rawHeight=v.getInt32(22,true),bits=v.getUint16(28,true),compression=v.getUint32(30,true);
 const height=Math.abs(rawHeight),colours=v.getUint32(46,true)||256;
 if(header<40||bits!==8||compression!==0||width<1||height<1||width>4096||height>4096||colours>256)throw new PhotographError('bmp');
 const palette:[number,number,number][]=[];for(let i=0;i<colours;i++){const at=14+header+i*4;if(at+3>bytes.byteLength)throw new PhotographError('bmp');palette.push([bytes[at+2],bytes[at+1],bytes[at]]);}
 const stride=(width+3)&~3;if(offset+stride*height>bytes.byteLength)throw new PhotographError('bmp');
 const indices=new Uint8Array(width*height);
 for(let y=0;y<height;y++){const src=offset+(rawHeight>0?height-1-y:y)*stride;for(let x=0;x<width;x++){const i=bytes[src+x];if(i>=colours)throw new PhotographError('bmp');indices[y*width+x]=i;}}
 return Object.freeze({width,height,palette:Object.freeze(palette.map(p=>Object.freeze(p))),indices});
}
export const PHOTOGRAPH_FACTORS=Object.freeze([0.7*0.8,0.85*0.8,1.2*0.8]);
function nearest(palette:Bitmap8['palette'],gray:number):number{let best=0,d=Infinity;for(let i=0;i<palette.length;i++){const [r,g,b]=palette[i],e=(r-gray)**2+(g-gray)**2+(b-gray)**2;if(e<d){d=e;best=i;}}return best;}
/** 0x597290's rescale for the telescope record selected when the field is built. */
export function scaleNativePhotograph(bmp:Bitmap8,telescope:number):Bitmap8{
 if(telescope!==0&&telescope!==1&&telescope!==2)throw new PhotographError('telescope');
 const factor=PHOTOGRAPH_FACTORS[telescope],indices=Uint8Array.from(bmp.indices);
 for(let y=1;y<bmp.height;y++)for(let x=1;x<bmp.width;x++){
  const red=bmp.palette[bmp.indices[y*bmp.width+x]][0],value=Math.min(255,roundNearestEven(red*factor));
  indices[y*bmp.width+x]=nearest(bmp.palette,value);
 }
 return Object.freeze({...bmp,indices});
}
/** 0x597470: copy the photograph so its listed centre lands on the rounded projected galaxy position (clipped to the raster). */
export function drawNativePhotograph(raster:RgbImage,bmp:Bitmap8,projected:Readonly<{x:number;y:number}>,centre:Readonly<{x:number;y:number}>):RgbImage{
 if(!Number.isFinite(projected.x)||!Number.isFinite(projected.y)||!Number.isInteger(centre.x)||!Number.isInteger(centre.y))throw new PhotographError('geometry');
 const left=roundNearestEven(projected.x)-centre.x,top=roundNearestEven(projected.y)-centre.y,rgb=new Uint8Array(raster.rgb);
 for(let y=0;y<bmp.height;y++){const ty=top+y;if(ty<0||ty>=raster.height)continue;
  for(let x=0;x<bmp.width;x++){const tx=left+x;if(tx<0||tx>=raster.width)continue;const [r,g,b]=bmp.palette[bmp.indices[y*bmp.width+x]],at=(ty*raster.width+tx)*3;rgb[at]=r;rgb[at+1]=g;rgb[at+2]=b;}}
 return Object.freeze({width:raster.width,height:raster.height,rgb});
}
/** The galaxy's name as 0x598e58..0x598ecd builds it from the 59-byte CLEA_GLX.DAT record (not trimmed, unlike glxCatalog.ts):
 * name kind 0 → ('NGC ' + String@39) limited to 11 characters, 1 → ('IC ' + String@39) limited to 10, otherwise String@47
 * (stored as String[18]). */
export function nativeGalaxyName(raw:Uint8Array):string{
 if(raw.length!==59)throw new PhotographError('geometry');
 const text=(at:number)=>{const n=raw[at];if(at+1+n>raw.length)throw new PhotographError('geometry');return String.fromCharCode(...raw.subarray(at+1,at+1+n));};
 const kind=raw[38];return kind===0?('NGC '+text(39)).slice(0,11):kind===1?('IC '+text(39)).slice(0,10):text(47).slice(0,18);
}
/** The association rule: first kept photograph whose file-list name contains the galaxy name (Pos), or null. */
/** 0x5990a3..0x5990cc: Pos(galaxy name, photograph name) over the area's photographic sublist in its order (an empty galaxy name
 * never matches: Pos returns 0 for an empty substring). */
export function associatePhotograph<T extends Readonly<{name:string}>>(galaxyName:string,photographs:readonly T[]):T|null{
 return galaxyName?photographs.find(p=>p.name.includes(galaxyName))??null:null;
}
