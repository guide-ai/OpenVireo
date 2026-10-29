/** Measuring engine (TSpectrumEngine) display window, zoom dialog, pan and cursor readout, as pure rules (Front S, S5;
 * docs/SPECTRUM-ENGINE-VIEW.md). Static reading of CLEA_VEO.exe (SHA-256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c),
 * research analysis/front-s-spectroscopy/RE-difference-and-engine-zoom.md Part 2; nothing executed or emulated. No equivalence
 * with the original program is claimed.
 *
 * The native plot is 600 × 200 pixels (x 26..626, y 20..220). Coordinates here are those native plot pixels (x 0..600 from the
 * left edge, y 0..200 from the top); the web chart maps them onto its own SVG. */

export const ENGINE_PLOT_WIDTH=600;
export const ENGINE_PLOT_HEIGHT=200;
/** Zoom dialog and pan step (Single 100.0 at 0x57a2cc, 0x5845d0, 0x584610) and the line pick tolerance (0x5849f4). */
export const ENGINE_STEP_ANGSTROM=100;
export const ENGINE_LINE_TOLERANCE_ANGSTROM=100;

/** lo..hi: the limits set when the spectrum is loaded (+0x495/+0x48b); min..max: the shown window (+0x477/+0x46d). */
export type EngineWindow=Readonly<{lo:number;hi:number;min:number;max:number}>;

export class EngineViewError extends Error{constructor(message:string){super(message);this.name='EngineViewError';}}
const finite=(v:number,what:string)=>{if(!Number.isFinite(v))throw new EngineViewError(`${what} must be finite`);return v;};

/** Initial window on load (0x582f00): min = the spectrum's first wavelength; max = the smallest floor100(min) + k·100 that
 * reaches the spectrometer's current maximum setting (not the file's last wavelength). Without a spectrum the window is the
 * spectrometer range itself. */
export function initialEngineWindow(firstWavelength:number|null,spectrometer:Readonly<{minimum:number;maximum:number}>):EngineWindow{
 const smax=finite(spectrometer.maximum,'spectrometer maximum'),smin=finite(spectrometer.minimum,'spectrometer minimum');
 if(firstWavelength===null)return Object.freeze({lo:smin,hi:smax,min:smin,max:smax});
 const min=finite(firstWavelength,'first wavelength');
 let max=Math.trunc(min/100)*100;
 while(max<smax)max+=ENGINE_STEP_ANGSTROM;
 if(max<=min)max+=ENGINE_STEP_ANGSTROM;// a window must have width; only reachable when the file starts at or past the setting [W]
 return Object.freeze({lo:min,hi:max,min,max});
}

/** SetWindow 0x5831b4: no clamping. */
export function setEngineWindow(w:EngineWindow,min:number,max:number):EngineWindow{
 finite(min,'minimum');finite(max,'maximum');
 if(!(max>min))throw new EngineViewError('window maximum must exceed its minimum');
 return Object.freeze({...w,min,max});
}
export const angstromPerPixel=(w:EngineWindow)=>(w.max-w.min)/ENGINE_PLOT_WIDTH;
/** LftBtn.Enabled = lo < min; RtBtn.Enabled = hi > max. */
export const canPanLeft=(w:EngineWindow)=>w.lo<w.min;
export const canPanRight=(w:EngineWindow)=>w.hi>w.max;
/** LftBtnClick 0x584594 / RtBtnClick 0x5845d4: both ends move 100 Å, width kept, no clamping (the button is disabled only
 * after the step, so the window may pass lo or hi by less than 100 Å). */
export function panEngineWindow(w:EngineWindow,direction:'left'|'right'):EngineWindow{
 if(direction==='left'?!canPanLeft(w):!canPanRight(w))return w;
 const d=direction==='left'?-ENGINE_STEP_ANGSTROM:ENGINE_STEP_ANGSTROM;
 return setEngineWindow(w,w.min+d,w.max+d);
}

/** TSpecDsplyRngDlg ("Set Wavelength Range") scroll positions, anchored on lo (FormActivate 0x579ec7..0x579fcd). */
export type ZoomDraft=Readonly<{minPosition:number;maxPosition:number;minLimit:number;maxLimit:number}>;
export function zoomDraft(w:EngineWindow):ZoomDraft{
 const steps=Math.round((w.hi-w.lo)/ENGINE_STEP_ANGSTROM);
 const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
 const maxLimit=Math.max(1,steps),minLimit=maxLimit-1;
 const minPosition=clamp(Math.trunc(Math.round(w.min-w.lo)/ENGINE_STEP_ANGSTROM),0,minLimit);
 const maxPosition=clamp(Math.trunc(Math.round(w.max-w.lo)/ENGINE_STEP_ANGSTROM),minPosition+1,maxLimit);
 return Object.freeze({minPosition,maxPosition,minLimit,maxLimit});
}
const position=(v:number,limit:number,lowest:number)=>{if(!Number.isInteger(v))throw new EngineViewError('position must be an integer');return Math.min(limit,Math.max(lowest,v));};
/** Min scroll (0x57a1ac): the maximum is pushed up to stay at least 100 Å above. */
export function moveZoomMinimum(d:ZoomDraft,next:number):ZoomDraft{
 const minPosition=position(next,d.minLimit,0);
 return Object.freeze({...d,minPosition,maxPosition:Math.max(d.maxPosition,minPosition+1)});
}
/** Max scroll (0x57a2d0): the minimum is pushed down to stay at least 100 Å below. */
export function moveZoomMaximum(d:ZoomDraft,next:number):ZoomDraft{
 const maxPosition=position(next,d.maxLimit,1);
 return Object.freeze({...d,maxPosition,minPosition:Math.min(d.minPosition,maxPosition-1)});
}
/** Reset (DfltBtn 0x57a078): the full lo..hi range. */
export const resetZoomDraft=(d:ZoomDraft):ZoomDraft=>Object.freeze({...d,minPosition:0,maxPosition:d.maxLimit});
export const zoomDraftWavelengths=(w:EngineWindow,d:ZoomDraft)=>Object.freeze({minimum:w.lo+ENGINE_STEP_ANGSTROM*d.minPosition,maximum:w.lo+ENGINE_STEP_ANGSTROM*d.maxPosition});
/** OK (0x57a164): min = lo + 100·MinPos, max = lo + 100·MaxPos. The caller first folds the Z slider (ZRstBtnClick). */
export function applyZoomDraft(w:EngineWindow,d:ZoomDraft):EngineWindow{const r=zoomDraftWavelengths(w,d);return setEngineWindow(w,r.minimum,r.maximum);}

/** Axis ticks (SetWindow and FormPaint 0x5832c4): majors every 100 Å from min; labels every s-th major, the smallest s with
 * n div s ≤ 15; labels with 0 decimals. */
export function engineTicks(w:EngineWindow):readonly Readonly<{wavelength:number;label:boolean}>[]{
 const n=Math.max(1,Math.round((w.max-w.min)/ENGINE_STEP_ANGSTROM));
 let s=1;while(Math.trunc(n/s)>15)s++;
 return Object.freeze(Array.from({length:n+1},(_,i)=>Object.freeze({wavelength:w.min+i*(w.max-w.min)/n,label:i%s===0})));
}

/** Cursor readout (0x583db8): wavelength = min + x·Å/px (observed wavelength, no z correction); "Rel. Intensity" =
 * (200 − y)/200, the cursor's height on the 0..1 axis, not the spectrum's value. Active only inside the plot. */
export type EngineCursor=Readonly<{x:number;y:number}>;
export const ENGINE_CURSOR_START:EngineCursor=Object.freeze({x:0,y:ENGINE_PLOT_HEIGHT});
export function insideEnginePlot(c:EngineCursor):boolean{return c.x>=0&&c.x<=ENGINE_PLOT_WIDTH&&c.y>=0&&c.y<=ENGINE_PLOT_HEIGHT;}
export function engineReadout(w:EngineWindow,c:EngineCursor):Readonly<{wavelength:number;relativeIntensity:number}>{
 return Object.freeze({wavelength:w.min+c.x*angstromPerPixel(w),relativeIntensity:(ENGINE_PLOT_HEIGHT-c.y)/ENGINE_PLOT_HEIGHT});
}
/** NumPad 4/6/8/2 (0x584054): one pixel per press, no bounds clamp. */
export function moveEngineCursor(c:EngineCursor,key:'left'|'right'|'up'|'down'):EngineCursor{
 const dx=key==='left'?-1:key==='right'?1:0,dy=key==='up'?-1:key==='down'?1:0;
 return Object.freeze({x:c.x+dx,y:c.y+dy});
}
/** Right click (0x583c83, 0x5849f4): the comparison line whose shifted wavelength is nearest the cursor wavelength, if it is
 * closer than 100 Å (fixed, whatever the zoom). Returns the line index or null. */
export function nearestComparisonLine(shifted:readonly number[],wavelength:number):number|null{
 let best:number|null=null,bestDistance=ENGINE_LINE_TOLERANCE_ANGSTROM;
 shifted.forEach((v,i)=>{const d=Math.abs(v-wavelength);if(d<bestDistance){best=i;bestDistance=d;}});
 return best;
}
