import {roundHalfEven} from './radioAntenna';
import {delphiFixed,effectiveRiseWord,type VariableStarRecord} from './variableStars';
/** "Simulated Light Curve" (TLtCrvDsplyForm1) of CLEA_VEO.exe 781bc970…c54c. Recovery: research
 * analysis/front-v-variable-stars/RECOVERY.md §4–§5; docs/VARIABLE-STARS.md.
 * - FormCreate 0x52b6d9 always builds a CepheidTypeObj (class slot 0x51eb5c) — for every variability type;
 * - Init 0x51f0f8/0x51f298: bright/faint from the max/min magnitudes and their '(' amplitude flags; a zero M−m/D word
 *   becomes 50 (record mutation); f = 1 − word/100; A = (faint − bright)/2;
 * - Mag(t) 0x51f33c: φ = Frac((t − E)/P) (+1 when negative); φ ≤ f: m = F − A·exp(−φ/f)·(cos(πφ/f)+1); otherwise
 *   m = F − A·(cos(−π(1−φ)/(word/100))+1); stored as Single. No noise term exists.
 * - SetRecord 0x52b6f4: box 75/40/630/290 (scale 1.0), half-magnitude axis bounds; FormPaint 0x52b9cc/0x52c090: ticks,
 *   labels, 1.5 cycles sampled at every pixel column from the epoch.
 * Numeric policy (web): binary64 Number/Math replace x87 Extended; Single results through Math.fround; Round is half-even
 * (control word 0x1332); Frac is x − trunc(x). This is not x87 equivalence: a pixel may differ at an exact .5 boundary. */

export type LightCurveUnavailable=
 /** P = 0: Mag divides by the period; with control word 0x1332 the original raises a floating-point exception in the
  * paint handler after the axes are drawn, so no curve point is drawn [I: EZeroDivide/EInvalidOp dialog]. */
 'period-zero'|
 /** f = 0 (M−m/D = 100) with φ = 0 divides 0/0 in the decline branch: same failure. */
 'zero-decline-fraction'|
 /** Faint bound = bright bound: SetRecord 0x52b6f4 divides (bottom − top) by a zero range and the window is never shown
  * [I]. No bundled record has it (synthetic tests only). */
 'axis-range-zero'|
 /** A magnitude-system string of length 0: 0x52bddd reads its second character through a nil AnsiString and the paint
  * handler faults after the magnitude axis, GCVS ID and type are drawn [I]. None in the bundled file (synthetic only). */
 'magnitude-system-empty'|
 /** A non-finite intermediate that the original would also fault on (defensive). */
 'non-finite';
export class LightCurveError extends Error{constructor(readonly code:LightCurveUnavailable){super(`Light curve: ${code}`);this.name='LightCurveError';}}

export type CepheidModel=Readonly<{bright:number;faint:number;riseWord:number;riseDefaulted:boolean;declineFraction:number;halfAmplitude:number;epoch:number;period:number}>;
/** Init (0x51f0f8 base + 0x51f298). `riseDefaulted` reports the 0x51f2d8 replacement of a zero word by 50. */
export function cepheidModel(record:VariableStarRecord):CepheidModel{
 const bright=record.maxFlag==='('?Math.fround(record.min-record.max):record.max;
 const faint=record.minFlag==='('?Math.fround(record.max+record.min):record.min;
 const riseWord=effectiveRiseWord(record,true);
 return Object.freeze({bright,faint,riseWord,riseDefaulted:record.riseWord===0,declineFraction:1-riseWord/100,halfAmplitude:(faint-bright)/2,epoch:record.epoch.value,period:record.period.value});
}
const frac=(x:number)=>x-Math.trunc(x);
/** Mag(t) 0x51f33c; throws LightCurveError where the original faults. */
export function cepheidMagnitude(model:CepheidModel,t:number):number{
 if(model.period===0)throw new LightCurveError('period-zero');
 let phase=frac((t-model.epoch)/model.period);if(phase<0)phase+=1;
 const f=model.declineFraction,F=model.faint,A=model.halfAmplitude;let m:number;
 if(f>=phase){
  if(f===0)throw new LightCurveError('zero-decline-fraction');
  m=F-A*Math.exp(-(phase/f))*(Math.cos(Math.PI*phase/f)+1);
 }else m=F-A*(Math.cos((1-phase)*-Math.PI/(model.riseWord/100))+1);
 if(!Number.isFinite(m))throw new LightCurveError('non-finite');
 return Math.fround(m);
}

// ------------------------------------------------------------------ plot
/** Plot box after SetRecord with scale 1.0 and zero offsets (FormCreate 0x52b6c3: right 630, bottom 290). */
export const LIGHT_CURVE_BOX=Object.freeze({left:75,top:40,right:630,bottom:290});
/** Display1 TImage client size (DFM). */
export const LIGHT_CURVE_DISPLAY=Object.freeze({width:654,height:336});
/** Phase span drawn from the epoch (0x52c10d: 1.5 Single). */
export const LIGHT_CURVE_CYCLES=1.5;
/** Axis bounds of SetRecord 0x52b6f4 (constants 0.5, 1.0 Single and 0.6 Extended). */
export function lightCurveBounds(faint:number,bright:number):Readonly<{faintBound:number;brightBound:number}>{
 let faintBound=roundHalfEven(faint)+(frac(faint)<0.5?1:0.5);if(faintBound-faint>0.6)faintBound-=0.5;
 let brightBound=roundHalfEven(bright)-(frac(bright)<0.5?0.5:1);if(bright-brightBound>0.6)brightBound+=0.5;
 return Object.freeze({faintBound,brightBound});
}
export type PlotText=Readonly<{x:number;y:number;text:string;anchor:'start'|'end'|'middle'}>;
export type PlotSegment=Readonly<{x1:number;y1:number;x2:number;y2:number}>;
export type LightCurvePlot=Readonly<{
 box:typeof LIGHT_CURVE_BOX;faintBound:number;brightBound:number;pixelsPerMagnitude:number;
 /** Axis labels and the GCVS ID / type / magnitude-system / "Phase" texts; x,y is the text's top-left unless anchored. */
 texts:readonly PlotText[];
 /** Tick marks (the box outline is `box`). */
 ticks:readonly PlotSegment[];
 /** Polyline points (x = left + i, i = 0..right−left), or why the original draws none. */
 curve:Readonly<{points:readonly (readonly [number,number])[]}>|Readonly<{unavailable:LightCurveUnavailable}>;
 model:CepheidModel;
}>;
/** SetRecord + FormPaint as data. Throws LightCurveError('axis-range-zero') when the original never shows the window. Text widths are not known on the web: the type label is right-aligned at right − 15
 * and "Phase" centred, which is what the native TextWidth arithmetic produces (WEB). */
export function lightCurvePlot(record:VariableStarRecord):LightCurvePlot{
 const model=cepheidModel(record),{left,top,right,bottom}=LIGHT_CURVE_BOX;
 const {faintBound,brightBound}=lightCurveBounds(model.faint,model.bright),range=faintBound-brightBound;
 if(range===0)throw new LightCurveError('axis-range-zero');
 // Records with min = 0 and a blank flag (155) have bright > faint, a negative range and a negative step count: the
 // tick loop runs zero times (0x52bbeb jl), the labels swap places and the curve leaves the box (no clipping).
 const pixelsPerMagnitude=(bottom-top)/range,texts:PlotText[]=[],ticks:PlotSegment[]=[];
 const label=(x:number,y:number,text:string,anchor:PlotText['anchor']='start')=>texts.push(Object.freeze({x,y,text,anchor}));
 const tick=(x1:number,y1:number,x2:number,y2:number)=>ticks.push(Object.freeze({x1,y1,x2,y2}));
 // Magnitude axis 0x52bae5..0x52bd64.
 const steps=roundHalfEven(range/0.5),yStep=roundHalfEven((bottom-top)/steps),yMinor=(bottom-top)/(range*5/0.5);
 label(left-40,bottom-8,delphiFixed(faintBound,2));label(left-40,top-8,delphiFixed(brightBound,2));
 let y=top,value=brightBound;
 for(let k=0;k<steps;k++){
  if(k>0){y+=yStep;value+=0.5;label(left-40,y-8,delphiFixed(value,2));}
  const major=frac(value)<0.01?15:10;tick(left,y,left+major,y);tick(right,y,right-major,y);
  for(let j=1;j<5;j++){const yy=roundHalfEven(j*yMinor)+y;tick(left,yy,left+5,yy);tick(right,yy,right-5,yy);}
 }
 // Titles 0x52bd6a..0x52be1a.
 label(left+15,top+4,record.name);label(right-15,top+4,record.type,'end');
 if(record.system.length===0)return Object.freeze({box:LIGHT_CURVE_BOX,faintBound,brightBound,pixelsPerMagnitude,texts:Object.freeze(texts),ticks:Object.freeze(ticks),curve:Object.freeze({unavailable:'magnitude-system-empty' as const}),model});
 const system=record.system.length>=2&&record.system[1]===' '?record.system.slice(0,1)+record.system.slice(2):record.system;
 label(left-45,top-30,system+' mag');
 // Phase axis 0x52be1f..0x52c014.
 const xSteps=3,xStep=roundHalfEven((right-left)/xSteps),xMinor=xStep/5;
 label(left-10,bottom+5,'0.0');label(right-10,bottom+5,'1.5');
 let x=left;value=0;
 for(let k=0;k<xSteps;k++){
  if(k>0){x+=xStep;value+=0.5;label(x-10,bottom+5,delphiFixed(value,1));}
  tick(x,bottom,x,bottom-(frac(value)<0.01?15:10));
  for(let j=1;j<5;j++){const xx=roundHalfEven(j*xMinor)+x;tick(xx,bottom,xx,bottom-5);}
 }
 label(Math.trunc((left+right)/2),bottom+20,'Phase','middle');// (left+right) sar 1 − TextWidth sar 1 (0x52bfed)
 // Curve 0x52c090.
 let curve:LightCurvePlot['curve'];
 try{
  if(model.period===0)throw new LightCurveError('period-zero');
  const width=right-left,step=model.period*LIGHT_CURVE_CYCLES/width,points:(readonly [number,number])[]=[];
  for(let i=0;i<=width;i++){const m=cepheidMagnitude(model,i*step+model.epoch);points.push(Object.freeze([left+i,roundHalfEven((m-brightBound)*pixelsPerMagnitude)+top] as const));}
  curve=Object.freeze({points:Object.freeze(points)});
 }catch(error){if(!(error instanceof LightCurveError))throw error;curve=Object.freeze({unavailable:error.code});}
 return Object.freeze({box:LIGHT_CURVE_BOX,faintBound,brightBound,pixelsPerMagnitude,texts:Object.freeze(texts),ticks:Object.freeze(ticks),curve,model});
}
