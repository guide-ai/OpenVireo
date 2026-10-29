/** Front M: the Multi-Spec control form TMultSpCntrl and its spectra list (TMSpecDsplyList1) as a pure reducer, CLEA_VEO.exe
 * 781bc970…c54c, static reading only (plan analysis/front-plans/front-m-multispec.md §2.1, §2.3, §2.5; dossiers
 * multspcntrl-5299a0-52ab00.asm, mspeclist-*.asm, obsrvtry-crt1mouse-53cfa8-53d8b8.asm). No React; time arrives as SpecTimer
 * events (one per second of the observatory clock; Interval 1000 ms, 0x52a126).
 *
 * Recovered [D]:
 *  - FormCreate 0x5299a0: minutes := 1.0, first-time hint flag := 1, displays 0. FormShow: ExpEd := FloatToStrF(minutes, 2);
 *    Select1Click when Select is enabled; Init and Clear enabled iff the list is non-empty.
 *  - Select1Click 0x529c70: the hint box once, then selection mode (+0x650, LED) on; Init enabled iff the list is non-empty.
 *  - Add 0x52a61c (only when no selection is < 1.0 px away, 0x52a6d0 limit 1): Init and Clear enabled, Go disabled.
 *  - Right click: idx := nearest selection < 350 px; if the last spectrum index ≥ idx → "You Cannot Remove This Object!" (so,
 *    after Clear Objects, new selections 0..last of the old spectra cannot be removed: quirk kept); otherwise the
 *    "Remove Selection #n ?" question; Yes → delete (0x52a67c: Init/Clear by count, Go unchanged).
 *  - Clear1Click 0x529d98 (no confirmation, does not stop SpecTimer): empty list; Clear off, Select on, Init/Stop/Go off; clock
 *    0:00, S/N 0, Num 0; ExpEd := minutes; View/Save off; numbering base := ListBox.Count + 1 (0x5264dc).
 *  - InitBtnClick 0x529eb8: seconds := Round(StrToFloat(ExpEd)·60) is stored before the > 0 check (quirk kept); a parse error or
 *    seconds ≤ 0 → "Exposure Time must be numeric, > 0!" and nothing else changes; else minutes := value, clock :=
 *    Trunc(s/60):Round(Frac(s/60)·60), Num := count, S/N := 0; Select off, Go on, Init off, View/Save off.
 *  - GoBtnClick 0x52a0dc: Objects off, Stop on, Go off, remaining := seconds, clock red, S/N setup 0x52a430, elapsed 0, timer on,
 *    Select on, selection mode off.
 *  - SpecTimerTimer 0x52a1b4 (Test Mode off, decision D5): remaining −= 1, elapsed += 1, clock, S/N tick 0x52a58c; remaining ≤
 *    0.01 → timer off and StopBtnClick.
 *  - StopBtnClick 0x52a2d4: timer off; 0 < remaining < seconds → "Do You Want to Terminate the Current Exposure?" (No → timer on);
 *    else clock green, Objects on, Stop off, Go on iff remaining > 0, then 0x52a79c: for each selection in list order
 *    AddSpectrum(idx := numbering base + position, t := seconds − remaining), which appends only when idx > last + 1 (so a second
 *    Go on the same selections adds nothing); View/Save off; the list form is shown.
 *  - S/N estimate 0x52a430/0x52a58c (display only): faintest V (max from 0.0), m0 := zp − 2.5, A := 50·0.7·10^((faintest −
 *    m0)/−2.5)·1000/1, B := 50·10^((19 − m0)/−2.5)·1000/1; per tick Σ += Poisson(0.7·A) + Poisson(B); display √Σ.
 *  - Spectra list: Clear All (confirmed) frees everything and the numbering base := 1; Save marks "*".
 * Web [W]: one page seed (uint32) feeds, through the LCG 0x4035e4, each fibre's seed and the S/N stream (the native Randomize
 * seeds are not reproducible); StrToFloat accepts '.' only; a Sky selection (uninitialised V, D8) or an S/N mean above 10⁶ makes
 * the estimate typed 'indeterminate'. No Test Mode (D5); no session persistence (D6). */
import {AcquisitionError,poissonDraw,randomDraw} from './acquisition';
import {roundNearestEven} from './numericPolicy';
import {delphiFixed} from './variableStars';
import {multiSpecZeroPoint,MULTISPEC_OPTIONS,MULTISPEC_MEAN_LIMIT,type MultiSpecSelection} from './multiSpecSpectrum';
import {nearestSelection,MULTISPEC_SELECT} from './multiSpecSelect';
import type {FieldTelescope} from './fieldEngine';

export class MultiSpecStateError extends Error{constructor(readonly code:'action'|'seed'){super(`Multi-Spec state: ${code}`);this.name='MultiSpecStateError';}}
export type MultiSpecControls=Readonly<{
 /** Objects menu (disabled while exposing). */objects:boolean;
 select:boolean;clear:boolean;viewSave:boolean;init:boolean;go:boolean;stop:boolean}>;
export type MultiSpecEntry=Readonly<{
 /** Spectrum number (list +0x3ba base + selection position). */idx:number;
 selection:MultiSpecSelection;
 /** +0x63 Single seconds integrated (seconds − remaining). */seconds:number;
 /** [W] the fibre's seed. */seed:number;
 saved:boolean}>;
export type MultiSpecQuestion=
 |Readonly<{kind:'remove';index:number}>
 |Readonly<{kind:'terminate'}>
 |Readonly<{kind:'clear-all'}>;
export type MultiSpecMessage='select-hint'|'cannot-remove'|'invalid-exposure'|'no-spectra'|'cannot-close';
export type MultiSpecSignalToNoise=
 |Readonly<{status:'idle'}>
 |Readonly<{status:'running';a:number;b:number;sum:number;seed:number}>
 |Readonly<{status:'indeterminate';reason:'sky-selection'|'multispec-mean-bound'|'precision'}>;
export type MultiSpecState=Readonly<{
 telescope:FieldTelescope;open:boolean;
 /** +0x3c8: the first Select shows the hint box. */firstHint:boolean;
 /** Obsrvtry+0x650 and the LED. */selecting:boolean;
 selections:readonly MultiSpecSelection[];
 expText:string;minutes:number;seconds:number;remaining:number;elapsed:number;running:boolean;
 controls:MultiSpecControls;
 displays:Readonly<{objects:number;clock:Readonly<{minutes:number;seconds:number}>;clockColour:'default'|'red'|'green';snr:number|null}>;
 signalToNoise:MultiSpecSignalToNoise;
 /** Spectra list numbering base (+0x3ba). */numberingBase:number;
 entries:readonly MultiSpecEntry[];listShown:boolean;
 question:MultiSpecQuestion|null;message:MultiSpecMessage|null;
 /** [W] page stream. */seed:number}>;
export type MultiSpecAction=
 |Readonly<{type:'show'}>|Readonly<{type:'close'}>|Readonly<{type:'select'}>
 |Readonly<{type:'add';selection:MultiSpecSelection}>
 |Readonly<{type:'remove-at';x:number;y:number}>
 |Readonly<{type:'answer';yes:boolean}>
 |Readonly<{type:'dismiss'}>
 |Readonly<{type:'clear'}>|Readonly<{type:'field-regenerated'}>
 |Readonly<{type:'edit-exposure';text:string}>
 |Readonly<{type:'init'}>|Readonly<{type:'go'}>|Readonly<{type:'tick'}>|Readonly<{type:'stop'}>
 |Readonly<{type:'view-save'}>|Readonly<{type:'list-closed'}>|Readonly<{type:'clear-all'}>
 |Readonly<{type:'saved';idx:readonly number[]}>;

const fixed2=(x:number)=>delphiFixed(x,2);
function clock(seconds:number){const m=seconds/60,whole=Math.trunc(m);return Object.freeze({minutes:whole,seconds:roundNearestEven((m-whole)*60)});}
export function createMultiSpecState(telescope:FieldTelescope,seed:number):MultiSpecState{
 if(!Number.isInteger(seed)||seed<0||seed>0xffff_ffff)throw new MultiSpecStateError('seed');
 multiSpecZeroPoint(telescope);
 return Object.freeze({telescope,open:false,firstHint:true,selecting:false,selections:Object.freeze([]),expText:'0.0',minutes:1,seconds:0,remaining:0,elapsed:0,running:false,
  controls:Object.freeze({objects:true,select:true,clear:false,viewSave:false,init:false,go:false,stop:false}),
  displays:Object.freeze({objects:0,clock:clock(0),clockColour:'default' as const,snr:0}),signalToNoise:Object.freeze({status:'idle' as const}),
  numberingBase:1,entries:Object.freeze([]),listShown:false,question:null,message:null,seed});
}
const set=(s:MultiSpecState,patch:Partial<MultiSpecState>):MultiSpecState=>Object.freeze({...s,...patch});
const ctl=(s:MultiSpecState,patch:Partial<MultiSpecControls>)=>Object.freeze({...s.controls,...patch});
function nextSeed(seed:number){const d=randomDraw(seed);return d.seed;}
/** Strict StrToFloat subset (dot decimal). */
function parseExposure(text:string):number|null{
 if(!/^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/.test(text))return null;
 const v=Number(text.trim());return Number.isFinite(v)?v:null;
}
function selectClick(s:MultiSpecState):MultiSpecState{
 return set(s,{message:s.firstHint?'select-hint':s.message,firstHint:false,selecting:true,controls:ctl(s,{init:s.selections.length>0})});
}
function setupSignalToNoise(s:MultiSpecState,seed:number):MultiSpecSignalToNoise{
 if(s.selections.some(x=>x.v===null))return Object.freeze({status:'indeterminate',reason:'sky-selection'});
 let faintest=0;for(const x of s.selections)if(Math.fround(x.v!)>faintest)faintest=Math.fround(x.v!);
 const m0=multiSpecZeroPoint(s.telescope)-2.5,obj=Math.pow(10,(faintest-m0)/-2.5),sky=Math.pow(10,(MULTISPEC_OPTIONS.skyMagnitude-m0)/-2.5);
 const a=MULTISPEC_OPTIONS.baseCount*0.7*obj*1000/MULTISPEC_OPTIONS.timerMs,b=MULTISPEC_OPTIONS.baseCount*sky*1000/MULTISPEC_OPTIONS.timerMs;
 if(!(0.7*a<=MULTISPEC_MEAN_LIMIT)||!(b<=MULTISPEC_MEAN_LIMIT))return Object.freeze({status:'indeterminate',reason:'multispec-mean-bound'});
 return Object.freeze({status:'running',a,b,sum:0,seed});
}
function tickSignalToNoise(sn:MultiSpecSignalToNoise):MultiSpecSignalToNoise{
 if(sn.status!=='running')return sn;
 try{const d1=poissonDraw(0.7*sn.a,sn.seed),d2=poissonDraw(sn.b,d1.seed);return Object.freeze({...sn,sum:d1.value+sn.sum+d2.value,seed:d2.seed});}
 catch(e){if(e instanceof AcquisitionError&&e.code==='precision')return Object.freeze({status:'indeterminate',reason:'precision'});throw e;}
}
const snrDisplay=(sn:MultiSpecSignalToNoise)=>sn.status==='running'?Math.sqrt(sn.sum):sn.status==='idle'?0:null;
function clearObjects(s:MultiSpecState):MultiSpecState{
 return set(s,{selections:Object.freeze([]),controls:ctl(s,{clear:false,select:true,init:false,stop:false,go:false,viewSave:false}),
  displays:Object.freeze({...s.displays,clock:clock(0),snr:0,objects:0}),expText:fixed2(s.minutes),numberingBase:s.entries.length+1});
}
function finishStop(s:MultiSpecState):MultiSpecState{
 let entries=[...s.entries],seed=s.seed;
 const t=Math.fround(s.seconds-s.remaining);
 s.selections.forEach((selection,position)=>{
  const idx=s.numberingBase+position;
  if(idx<=entries.length)return;// AddSpectrum: idx ≤ last + 1 (last = count − 1)
  seed=nextSeed(seed);entries.push(Object.freeze({idx,selection,seconds:t,seed,saved:false}));
 });
 return set(s,{running:false,question:null,seed,entries:Object.freeze(entries),listShown:true,
  displays:Object.freeze({...s.displays,clockColour:'green' as const}),controls:ctl(s,{objects:true,stop:false,go:s.remaining>0,viewSave:false})});
}
function stopClick(s:MultiSpecState):MultiSpecState{
 const stopped=set(s,{running:false});
 if(s.remaining>0&&s.remaining<s.seconds)return set(stopped,{question:Object.freeze({kind:'terminate' as const})});
 return finishStop(stopped);
}
export function multiSpecReducer(s:MultiSpecState,a:MultiSpecAction):MultiSpecState{
 if(s.question&&a.type!=='answer')return s;// modal box
 switch(a.type){
 case 'show':{
  let n=set(s,{open:true,expText:fixed2(s.minutes),controls:ctl(s,{init:s.selections.length>0,clear:s.selections.length>0})});
  if(n.controls.select)n=selectClick(n);
  return n;
 }
 case 'close':return s.controls.objects?set(s,{open:false}):set(s,{message:'cannot-close'});
 case 'select':return s.controls.select&&s.controls.objects?selectClick(s):s;
 case 'dismiss':return set(s,{message:null});
 case 'add':{
  if(!s.open||!s.selecting)return s;
  const x=roundNearestEven(a.selection.x),y=roundNearestEven(a.selection.y);
  if(nearestSelection(s.selections,x,y,MULTISPEC_SELECT.duplicateRadius)>=0)return s;
  return set(s,{selections:Object.freeze([...s.selections,a.selection]),controls:ctl(s,{init:true,clear:true,go:false})});
 }
 case 'remove-at':{
  if(!s.open||!s.selecting)return s;
  const i=nearestSelection(s.selections,a.x,a.y,0);if(i<0)return s;
  if(s.entries.length-1>=i)return set(s,{message:'cannot-remove'});
  return set(s,{question:Object.freeze({kind:'remove' as const,index:i})});
 }
 case 'answer':{
  const q=s.question;if(!q)return s;
  if(q.kind==='remove'){
   if(!a.yes)return set(s,{question:null});
   const selections=s.selections.filter((_,i)=>i!==q.index);
   return set(s,{question:null,selections:Object.freeze(selections),controls:ctl(s,{init:selections.length>0,clear:selections.length>0})});
  }
  if(q.kind==='terminate')return a.yes?finishStop(set(s,{question:null})):set(s,{question:null,running:true});
  if(!a.yes)return set(s,{question:null});
  return set(s,{question:null,entries:Object.freeze([]),numberingBase:1});// Clear All: Save All/Clear All off in the list form
 }
 case 'clear':return s.controls.clear&&s.controls.objects?clearObjects(s):s;
 case 'field-regenerated':return s.selections.length?clearObjects(s):s;
 case 'edit-exposure':return set(s,{expText:String(a.text).slice(0,64)});
 case 'init':{
  if(!s.controls.init)return s;
  const v=parseExposure(s.expText);
  if(v===null)return set(s,{message:'invalid-exposure'});
  const scaled=v*60;
  if(!(Math.abs(scaled)<2**31))return set(s,{message:'invalid-exposure'});
  const seconds=roundNearestEven(scaled);
  if(seconds<=0)return set(s,{seconds,message:'invalid-exposure'});
  return set(s,{seconds,minutes:v,signalToNoise:Object.freeze({status:'idle' as const}),displays:Object.freeze({...s.displays,clock:clock(seconds),objects:s.selections.length,snr:0}),
   controls:ctl(s,{select:false,go:true,init:false,viewSave:false})});
 }
 case 'go':{
  if(!s.controls.go)return s;
  const seed=nextSeed(s.seed),sn=setupSignalToNoise(s,seed);
  return set(s,{seed,signalToNoise:sn,remaining:s.seconds,elapsed:0,running:true,selecting:false,
   displays:Object.freeze({...s.displays,clockColour:'red' as const}),controls:ctl(s,{objects:false,stop:true,go:false,select:true})});
 }
 case 'tick':{
  if(!s.running)return s;
  const remaining=s.remaining-1,sn=tickSignalToNoise(s.signalToNoise);
  const n=set(s,{remaining,elapsed:s.elapsed+1,signalToNoise:sn,displays:Object.freeze({...s.displays,clock:clock(remaining),snr:snrDisplay(sn)})});
  return remaining<=0.01?stopClick(n):n;
 }
 case 'stop':return s.controls.stop?stopClick(s):s;
 case 'view-save':return s.entries.length?set(s,{listShown:true}):set(s,{message:'no-spectra'});
 case 'list-closed':return set(s,{listShown:false,controls:ctl(s,{viewSave:true})});
 case 'clear-all':return s.entries.length?set(s,{question:Object.freeze({kind:'clear-all' as const})}):s;
 case 'saved':{const done=new Set(a.idx);return set(s,{entries:Object.freeze(s.entries.map(e=>done.has(e.idx)?Object.freeze({...e,saved:true}):e))});}
 default:throw new MultiSpecStateError('action');
 }
}
