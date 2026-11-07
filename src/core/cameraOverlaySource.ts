/** Front C6: the CCD overlay's post-GDI low bytes at the loaded telescope field (analysis/front-plans/front-c6.md §2).
 * - Gate form+0x412 [D]: set by every galaxy of the loaded field's list that is not 'NGC 224' (painter 0x53b390, store 0x53b628).
 * - Source obs+0x550 [D]: the 936² field paint after the galaxy loop and before the stars (fieldEngine `galaxyLayer`, red channel).
 * - Rect [D] (0x5216a4..0x521889): w = Int 312 × Single CCD width′ (obs+0x6ce) / Single 15.0 (env+0x2508), h likewise
 *   (obs+0x6d2); left/top = Round(X − w/2)/Round(Y − h/2) (constant 2.0 at 0x521c68), size Round(w) × Round(h); Round is
 *   0x403700 (x87 half-even); X, Y are the telescope projected in the field (0x594a44/0x594b04).
 * - bmpB 1024² (cfg+0x49/+0x4d); StretchBlt of the rect to (0,0,1023,1023), COLORONCOLOR replication [D code, I runtime]; column
 *   and row 1023 keep bmpB's white fill [D code, I VCL default], r = 255.
 * Web [W]: GDI's replication phase is not specified, so the declared nearest-centre phase ⌊(d + ½)·n/1023⌋ is used (as the other
 * StretchDraw paths); a 24/32-bpp display (GetPixel returns the exact red byte); the pointing is projected with the field's own
 * projection (objectSelection.ts), without the native x87 rounding at an exact .5. Pure; no field is loaded here. */
import {roundNearestEven} from './numericPolicy';
import {hourDifference,type Pointing} from './sky';

export const OVERLAY_FRAME=Object.freeze({width:936,height:936,fieldDegrees:.75});
/** TImage obs+0x3d8 Width and the calibration divisor env+0x2508 (compiled 15.0). */
export const OVERLAY_VIEW_WIDTH=312,OVERLAY_SCALE_DIVISOR=15;
/** bmpB's compiled size (cfg+0x49/+0x4d) and the StretchBlt destination extent (cam+0x3e/+0x42 = size − 1). */
export const OVERLAY_SIZE=1024,OVERLAY_STRETCH=1023,OVERLAY_BORDER_RED=255;
export const M31_ID='NGC 224';

export type CameraOverlayReason='object-x'|'field'|'no-load'|'telescope'|'outside'|'unpainted';
/** What the loaded telescope field gives the overlay. */
export type OverlayField=Readonly<{anchor:Pointing;galaxyIds:readonly string[];galaxyRed:Uint8Array|null;unpaintedGalaxies:number}>;
export type CameraOverlayRect=Readonly<{left:number;top:number;width:number;height:number;exactWidth:number;exactHeight:number}>;
export type CameraOverlaySource=
 |Readonly<{status:'off'}>
 |Readonly<{status:'ready';rect:CameraOverlayRect;red:Uint8Array}>
 |Readonly<{status:'unavailable';reason:CameraOverlayReason}>;

/** Gate 0x53b628: any galaxy other than NGC 224 (Front C7: the field engine leaves NGC 224 out of the paint, so the overlay of a
 * field with M31 and other galaxies is their layer, as in VIREO; M31 alone gives no overlay). */
export const overlayGate=(galaxyIds:readonly string[])=>galaxyIds.some(id=>!id.includes(M31_ID));

export function overlayRect(anchor:Pointing,pointing:Pointing,widthArcminutes:number,heightArcminutes:number):CameraOverlayRect{
 const {width:W,height:H,fieldDegrees:F}=OVERLAY_FRAME;
 const w=OVERLAY_VIEW_WIDTH*widthArcminutes/OVERLAY_SCALE_DIVISOR,h=OVERLAY_VIEW_WIDTH*heightArcminutes/OVERLAY_SCALE_DIVISOR;
 const x=W/2+hourDifference(anchor.ra,pointing.ra)*Math.cos(pointing.dec*Math.PI/180)*W*15/F,y=H/2+(anchor.dec-pointing.dec)*H/F;
 if(![w,h,x,y].every(Number.isFinite))throw new RangeError('Camera overlay: geometry');
 return Object.freeze({left:roundNearestEven(x-w/2),top:roundNearestEven(y-h/2),width:roundNearestEven(w),height:roundNearestEven(h),exactWidth:w,exactHeight:h});
}
/** The 1024² GetPixel low bytes after StretchBlt: the rect replicated to 1023², the last column and row white. Front T7: bmpB is
 * the CCD record's width × height (0x5216ce..0x5216ed) and the destination its (width − 1) × (height − 1) (cam+0x3e/+0x42), so an
 * instructor size stretches to that plane [D code, I runtime]; the compiled call is the 1024² one. */
export function overlayStretch(red:Uint8Array,rect:CameraOverlayRect,planeWidth=OVERLAY_SIZE,planeHeight=OVERLAY_SIZE):Uint8Array{
 const {width:W}=OVERLAY_FRAME,Dx=planeWidth-1,Dy=planeHeight-1,out=new Uint8Array(planeWidth*planeHeight).fill(OVERLAY_BORDER_RED);
 const column=new Int32Array(Dx),row=new Int32Array(Dy);
 for(let d=0;d<Dx;d++)column[d]=rect.left+Math.floor((d+.5)*rect.width/Dx);
 for(let d=0;d<Dy;d++)row[d]=rect.top+Math.floor((d+.5)*rect.height/Dy);
 for(let y=0;y<Dy;y++){const source=row[y]*W,target=y*planeWidth;for(let x=0;x<Dx;x++)out[target+x]=red[source+column[x]];}
 return out;
}
/** The overlay of one CCD exposure, or why it cannot be drawn exactly. `field` is null when the loaded field is not available
 * (the reason is the caller's). With no gate there is no overlay, as in VIREO. */
export function cameraOverlaySource(field:OverlayField,pointing:Pointing,widthArcminutes:number,heightArcminutes:number,planeWidth=OVERLAY_SIZE,planeHeight=OVERLAY_SIZE):CameraOverlaySource{
 const unavailable=(reason:CameraOverlayReason)=>Object.freeze({status:'unavailable' as const,reason});
 if(!overlayGate(field.galaxyIds))return Object.freeze({status:'off' as const});
 if(field.unpaintedGalaxies>0)return unavailable('unpainted');
 const {width:W,height:H}=OVERLAY_FRAME;
 if(!field.galaxyRed||field.galaxyRed.length!==W*H)return unavailable('field');
 const rect=overlayRect(field.anchor,pointing,widthArcminutes,heightArcminutes);
 if(rect.left<0||rect.top<0||rect.width<1||rect.height<1||rect.left+rect.width>W||rect.top+rect.height>H)return unavailable('outside');
 return Object.freeze({status:'ready' as const,rect,red:overlayStretch(field.galaxyRed,rect,planeWidth,planeHeight)});
}
