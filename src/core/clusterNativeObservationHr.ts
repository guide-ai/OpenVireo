import{appendNativeResultList,buildNativeResultList,NativeResultListError,type NativeResultList}from'./nativeResultList';
import{NativeObservationError,type NativeObservationData,type NativeObservationRecord,type StoredNumber}from'./nativeObservationResults';
import{NATIVE_CLUSTER_MODELS}from'./nativeCluster';
/** Original HR "File>Load/Plot>Data from Observations" route and its
 * "Tools>View/Print Parameters" report. Evidence
 * VIREO-HR-OBSERVATION-PLOT-REPORT-STATIC-2026-10-21 against executable SHA256
 * 781bc970…c52c54c: MeasuredData1Click0x542ed8, redraw0x54235c, geometry0x5423dc,
 * frame0x542480, observation plot0x542990, report0x543d90. Static recovery only;
 * exact dyadic arithmetic with explicit 64-bit-significand rounding stands in for
 * x87 Extended under the compiled0x1332 control word. Not an original runtime oracle. */
export const CLUSTER_NATIVE_HR_EVIDENCE_ID='VIREO-HR-OBSERVATION-PLOT-REPORT-STATIC-2026-10-21';
export const CLUSTER_NATIVE_HR_EXECUTABLE_SHA256='781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c';
/** 0x5423dc writes the only screen geometry;0x542480 resets both origins on every repaint. */
export const CLUSTER_NATIVE_HR_GEOMETRY=Object.freeze({left:80,right:440,top:15,bottom:463,heightPx:448,widthPx:360,vOrigin:2,vSpan:16,colorOrigin:-0.5,colorSpan:3,pxPerMag:28,pxPerColor:120,marker:3});
const G=CLUSTER_NATIVE_HR_GEOMETRY;

// ---------------------------------------------------------------- exact Extended
/** value=n×2^e. Zero is {n:0n,e:0}. */
export type ClusterNativeDyadic=Readonly<{n:bigint;e:number}>;
export class ClusterNativeFpuGate extends Error{constructor(readonly code:'operand'|'overflow'|'int64'){super('Original FPU exception path '+code);this.name='ClusterNativeFpuGate';}}
const EXT_MAX_MSB=16383,EXT_MIN_LSB=-16445;
const bitLength=(m:bigint)=>m===0n?0:m.toString(2).length;
function dy(n:bigint,e:number):ClusterNativeDyadic{if(n===0n)return Object.freeze({n:0n,e:0});while((n&1n)===0n){n>>=1n;e++;}return Object.freeze({n,e});}
export function dyadicFromStored(s:StoredNumber):ClusterNativeDyadic{
 if(s.storage!=='extended80'&&s.storage!=='binary32'&&s.storage!=='binary64')throw new ClusterNativeFpuGate('operand');
 if(s.kind==='zero')return dy(0n,0);if((s.kind!=='normal'&&s.kind!=='subnormal')||s.coefficient===null||s.power===null)throw new ClusterNativeFpuGate('operand');
 const c=BigInt(s.coefficient);return dy(s.negative?-c:c,s.power);
}
export const dyadicFromInteger=(v:number)=>{if(!Number.isSafeInteger(v))throw new RangeError('integer');return dy(BigInt(v),0);};
export function dyadicAdd(a:ClusterNativeDyadic,b:ClusterNativeDyadic):ClusterNativeDyadic{if(a.n===0n)return b;if(b.n===0n)return a;const e=Math.min(a.e,b.e);return dy((a.n<<BigInt(a.e-e))+(b.n<<BigInt(b.e-e)),e);}
export const dyadicNeg=(a:ClusterNativeDyadic)=>dy(-a.n,a.e);
export const dyadicMul=(a:ClusterNativeDyadic,b:ClusterNativeDyadic)=>dy(a.n*b.n,a.e+b.e);
/** One x87 result rounded to a 64-bit significand,nearest-even(PC=11,RC=00 of0x1332).
 * Overflow is unmasked in0x1332 and is reported as an exception path,not a value. */
export function roundExtended(x:ClusterNativeDyadic):ClusterNativeDyadic{
 if(x.n===0n)return x;const negative=x.n<0n,m=negative?-x.n:x.n,msb=x.e+bitLength(m)-1,lsb=Math.max(msb-63,EXT_MIN_LSB);let result:ClusterNativeDyadic;
 if(x.e>=lsb)result=x;else{const shift=BigInt(lsb-x.e),q=m>>shift,r=m-(q<<shift),half=1n<<(shift-1n),up=r>half||r===half&&(q&1n)===1n;result=dy(negative?-(up?q+1n:q):(up?q+1n:q),lsb);}
 if(result.n!==0n&&result.e+bitLength(result.n<0n?-result.n:result.n)-1>EXT_MAX_MSB)throw new ClusterNativeFpuGate('overflow');return result;
}
/** 0x403700 Round:FISTP qword under RC nearest-even;invalid(out of Int64) is unmasked in0x1332. */
export function fistpInt64(x:ClusterNativeDyadic):bigint{
 let q:bigint;if(x.e>=0)q=x.n<<BigInt(x.e);else{const negative=x.n<0n,m=negative?-x.n:x.n,shift=BigInt(-x.e),f=m>>shift,r=m-(f<<shift),half=1n<<(shift-1n),v=r>half||r===half&&(f&1n)===1n?f+1n:f;q=negative?-v:v;}
 if(q<-(1n<<63n)||q>(1n<<63n)-1n)throw new ClusterNativeFpuGate('int64');return q;
}
/** Exact presentation only: cap decimal expansion like the DAT inspector.
 * Requires a rounded Extended coefficient (at most64bits);longer exponents keep an exact binary expression;arithmetic is unchanged. */
export function dyadicDecimal(x:ClusterNativeDyadic):string{
 if(x.n===0n)return'0';if(x.n>0xffffffffffffffffn||x.n< -0xffffffffffffffffn)throw new RangeError('HR presentation requires a rounded Extended coefficient');const fallback=()=>x.n.toString()+' × 2^'+x.e;
 if(x.e>256||x.e< -96)return fallback();const negative=x.n<0n,m=negative?-x.n:x.n;let s:string;
 if(x.e>=0){s=(m<<BigInt(x.e)).toString();if(s.length>120)return fallback();}else{const places=-x.e,digits=(m*5n**BigInt(places)).toString().padStart(places+1,'0');s=(digits.slice(0,-places)+'.'+digits.slice(-places)).replace(/0+$/,'').replace(/\.$/,'');}
 return(negative?'-':'')+s;
}
export function dyadicNumber(x:ClusterNativeDyadic):number{if(x.n===0n)return 0;const m=x.n<0n?-x.n:x.n,extra=Math.max(0,bitLength(m)-60),v=Number(m>>BigInt(extra))*2**(x.e+extra);return x.n<0n?-v:v;}

// ---------------------------------------------------------------- plot 0x542990
const SIGNED_PIXEL_LIMIT=2**31-1024;
const TWO=dyadicFromInteger(2),MINUS_HALF=dy(-1n,-1),PX_V=dyadicFromInteger(G.pxPerMag),PX_C=dyadicFromInteger(G.pxPerColor);
export type ClusterNativeHrStatus='plotted'|'skipped-v-zero'|'skipped-b-zero';
export type ClusterNativeHrRow=Readonly<{index:number;object:string;kind:number;status:ClusterNativeHrStatus;b:string|null;v:string|null;bMinusV:Readonly<{exact:string;value:number}>|null;pixel:Readonly<{x:number;y:number}>|null;inFrame:boolean}>;
export type ClusterNativeHrOperand='v'|'b'|'b-v';
export type ClusterNativeHrPlot=Readonly<{status:'plotted';rows:readonly ClusterNativeHrRow[];count:number;countLabel:string;plottedCountKind:number;plottedOtherKind:number}>|Readonly<{status:'blocked';reason:'operand'|'overflow'|'int64'|'pixel-range';recordIndex:number;field:ClusterNativeHrOperand;plottedBefore:number}>;
const field=(r:NativeObservationRecord,id:'b'|'v')=>r.fields.find(f=>f.id===id)!.value;
const shown=(s:StoredNumber)=>s.decimal??s.binary;
/** fcomp with Single0.0:NaN/unsupported raise IA(unmasked in0x1332);pseudo-denormals have
 * no admitted coefficient in the shared reader and are gated as a declared web choice. */
const compareClass=(s:StoredNumber)=>s.kind==='nan'||s.kind==='unsupported'||s.kind==='pseudo-denormal'?'invalid':s.kind==='zero'?'zero':s.kind==='infinity'?'infinite':'finite';
class PixelRange extends Error{}
function pixel(value:ClusterNativeDyadic,origin:ClusterNativeDyadic,scale:ClusterNativeDyadic):number{
 const r=fistpInt64(roundExtended(dyadicMul(roundExtended(dyadicAdd(value,dyadicNeg(origin))),scale)));
 // Callers use only EAX;the web refuses values whose low-32 wrap the original would draw.
 if(r< -BigInt(SIGNED_PIXEL_LIMIT)||r>BigInt(SIGNED_PIXEL_LIMIT))throw new PixelRange();return Number(r)+0;
}
/** Head-to-tail(0x492628/0x492634/0x49271c);V tested before B;Single0.0 equality
 * (both signed zeros) skips before any arithmetic. B−V,V−2 and the products are separate
 * rounded x87 results. An infinite operand that survives the skips reaches Round(±∞)→IA.
 * Photometry kind(+0x5e) is NOT tested by the original;counts are shown with their kind. */
export function clusterNativeHrPlot(data:NativeObservationData):ClusterNativeHrPlot{
 const rows:ClusterNativeHrRow[]=[];let count=0,plottedCountKind=0,plottedOtherKind=0;
 for(const record of data.records){
  const sv=field(record,'v'),sb=field(record,'b'),base={index:record.index,object:record.object,kind:record.kind,b:shown(sb),v:shown(sv)};
  let operand:ClusterNativeHrOperand='v';
  const blocked=(reason:'operand'|'overflow'|'int64'|'pixel-range')=>Object.freeze({status:'blocked' as const,reason,recordIndex:record.index,field:operand,plottedBefore:count});
  const cv=compareClass(sv);if(cv==='invalid')return blocked('operand');if(cv==='zero'){rows.push(Object.freeze({...base,status:'skipped-v-zero',bMinusV:null,pixel:null,inFrame:false}));continue;}
  operand='b';const cb=compareClass(sb);if(cb==='invalid')return blocked('operand');if(cb==='zero'){rows.push(Object.freeze({...base,status:'skipped-b-zero',bMinusV:null,pixel:null,inFrame:false}));continue;}
  if(cv==='infinite'){operand='v';return blocked('operand');}if(cb==='infinite')return blocked('operand');
  try{
   const v=dyadicFromStored(sv),b=dyadicFromStored(sb);operand='b-v';const bv=roundExtended(dyadicAdd(b,dyadicNeg(v)));operand='v';const y=pixel(v,TWO,PX_V)+G.top;operand='b-v';const x=pixel(bv,MINUS_HALF,PX_C)+G.left;
   count++;if(record.kind===0)plottedCountKind++;else if(record.kind!==1)plottedOtherKind++;
   rows.push(Object.freeze({...base,status:'plotted',bMinusV:Object.freeze({exact:dyadicDecimal(bv),value:dyadicNumber(bv)}),pixel:Object.freeze({x,y}),inFrame:x>=G.left&&x<=G.right&&y>=G.top&&y<=G.bottom}));
  }catch(error){
   if(error instanceof ClusterNativeFpuGate)return blocked(error.code);if(error instanceof PixelRange)return blocked('pixel-range');throw error;
  }
 }
 return Object.freeze({status:'plotted',rows:Object.freeze(rows),count,countLabel:'# of Stars: '+count,plottedCountKind,plottedOtherKind});
}

/** Web diagnostic rows when the whole plot is withheld. These labels are not
 * claims about native partial drawing or exception recovery. No B−V is evaluated. */
export function clusterNativeHrBlockedRows(data:NativeObservationData,blocked:Extract<ClusterNativeHrPlot,{status:'blocked'}>){
 return Object.freeze(data.records.map(r=>Object.freeze({index:r.index,object:r.object,kind:r.kind,b:shown(field(r,'b'))??field(r,'b').kind,v:shown(field(r,'v'))??field(r,'v').kind,bMinusV:null,pixel:null,inFrame:false,status:r.index<blocked.recordIndex?'before-block' as const:r.index===blocked.recordIndex?'blocking' as const:'after-block' as const})));
}

// ---------------------------------------------------------------- frame 0x542480
/** 0x486268→FloatToStrF(value,ffFixed,18,1). Host DecimalSeparator is not recovered;'.' is used. */
const fixed1=(tenths:number)=>(tenths<0?'-':'')+Math.floor(Math.abs(tenths)/10)+'.'+Math.abs(tenths)%10;
export type ClusterNativeHrTick=Readonly<{x1:number;y1:number;x2:number;y2:number}>;
export type ClusterNativeHrText=Readonly<{x:number;y:number;text:string}>;
export function clusterNativeHrFrame():Readonly<{axis:readonly(readonly[number,number])[];ticks:readonly ClusterNativeHrTick[];texts:readonly ClusterNativeHrText[]}>{
 const ticks:ClusterNativeHrTick[]=[],texts:ClusterNativeHrText[]=[],q=G.pxPerMag>>2;
 texts.push({x:G.left-60,y:q+G.top,text:'V'});
 for(let i=0;i<G.vSpan;i++){let y=i*G.pxPerMag+G.top;ticks.push({x1:G.left,y1:y,x2:G.left+15,y2:y});texts.push({x:G.left-35,y:y-5,text:fixed1((i+G.vOrigin)*10)});for(const len of[5,10,5]){y+=q;ticks.push({x1:G.left,y1:y,x2:G.left+len,y2:y});}}
 const step=Math.trunc(G.pxPerColor/10),start=G.left-(G.pxPerColor>>1);
 for(let i=0;i<=G.colorSpan;i++){
  let x=i*G.pxPerColor+start;const major=i-1;
  if(x>G.left){ticks.push({x1:x,y1:G.bottom,x2:x,y2:G.bottom-15});if(major===0)texts.push({x:x-9,y:G.bottom+5,text:fixed1(0)});else if(major>0){texts.push({x:x-15,y:G.bottom+5,text:'+'+fixed1(major*10)});if(major===1)texts.push({x:x-14,y:G.bottom+20,text:'(B-V)'});}}
  for(let j=1;j<10;j++){x+=step;if(x<G.left||x>G.right)continue;if(j===5){ticks.push({x1:x,y1:G.bottom,x2:x,y2:G.bottom-10});const tenths=major*10+5;texts.push({x:x-15,y:G.bottom+5,text:(tenths>0?'+':'')+fixed1(tenths)});}else ticks.push({x1:x,y1:G.bottom,x2:x,y2:G.bottom-5});}
 }
 return Object.freeze({axis:Object.freeze([[G.left,G.top],[G.left,G.bottom],[G.right,G.bottom]]as const),ticks:Object.freeze(ticks),texts:Object.freeze(texts)});
}
/** Presentation mapping for curves only(no Round),same origins/scales as the points. */
export const clusterNativeHrX=(color:number)=>(color-G.colorOrigin)*G.pxPerColor+G.left;
export const clusterNativeHrY=(v:number)=>(v-G.vOrigin)*G.pxPerMag+G.top;

// ---------------------------------------------------------------- trial + report 0x543d90
export type ClusterNativeHrTrial=Readonly<{zamsShown:boolean;modulusTicks:number;ebvTicks:number;isochroneShown:boolean;modelIndex:number;ageIndex:number;offsetTicks:number;distanceOption:boolean}>;
/** V−Mv=0 at first display follows the help;E/age/model/offset start values are web choices. */
export const CLUSTER_NATIVE_HR_INITIAL_TRIAL:ClusterNativeHrTrial=Object.freeze({zamsShown:false,modulusTicks:0,ebvTicks:0,isochroneShown:false,modelIndex:4,ageIndex:0,offsetTicks:0,distanceOption:false});
const intIn=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
export function validClusterNativeHrTrial(t:ClusterNativeHrTrial):boolean{return typeof t.zamsShown==='boolean'&&typeof t.isochroneShown==='boolean'&&typeof t.distanceOption==='boolean'&&intIn(t.modulusTicks,0,1500)&&intIn(t.ebvTicks,0,250)&&intIn(t.modelIndex,0,5)&&intIn(t.ageIndex,0,49)&&intIn(t.offsetTicks,-100,100);}
export const clusterNativeHrHundredths=(ticks:number)=>(ticks<0?'-':'')+Math.floor(Math.abs(ticks)/100)+'.'+String(Math.abs(ticks)%100).padStart(2,'0');
export const clusterNativeHrLogAgeTicks=(ageIndex:number)=>780+5*ageIndex;
/** Number/Math replaces the native Extended Power(0x42703c);FloatToStrF ffFixed0
 * decimal rounding is approximated by toFixed(0)(half-up for positive values). */
export function clusterNativeHrDistance(t:ClusterNativeHrTrial):number{return 10**((t.modulusTicks/100+5-(t.ebvTicks/100)*3)/5);}
export function clusterNativeHrAgeMyr(t:ClusterNativeHrTrial):number{return 10**(clusterNativeHrLogAgeTicks(t.ageIndex)/100-6);}
export type ClusterNativeHrReport=Readonly<{caption:string;lines:readonly string[];clusterNameGap:true}>;
export function clusterNativeHrReport(t:ClusterNativeHrTrial):ClusterNativeHrReport{
 if(!validClusterNativeHrTrial(t))throw new RangeError('trial');
 // Line1 copies the database-selection record(0x5b5c30);its observation-mode content is not recovered.
 const lines=['Cluster: '];
 if(t.zamsShown){lines.push('','From ZAMS fit:','  V-Mv = '+clusterNativeHrHundredths(t.modulusTicks),'  E(B-V) = '+clusterNativeHrHundredths(t.ebvTicks));if(t.distanceOption)lines.push('  Estimated Cluster Distance: '+clusterNativeHrDistance(t).toFixed(0)+' Parsecs');}
 if(t.isochroneShown)lines.push('','Isochrone Model Parameters:','  Metallicity: '+NATIVE_CLUSTER_MODELS[t.modelIndex]!.label,'  Log(Age/yrs): '+clusterNativeHrHundredths(clusterNativeHrLogAgeTicks(t.ageIndex)),'  Estimated Cluster Age: '+clusterNativeHrAgeMyr(t).toFixed(0)+' Million Years','  (B-V) Adjustment: '+clusterNativeHrHundredths(t.offsetTicks));
 return Object.freeze({caption:'Cluster Age/Distance Parameters',lines:Object.freeze(lines),clusterNameGap:true});
}

// ---------------------------------------------------------------- workspace
export type ClusterNativeHrErrorCode='size'|'layout'|'text'|'key'|'limit'|'read';
export type ClusterNativeHrReceipt=Readonly<{name:string;sha256:string;records:number;action:'add'|'replace'}>;
export type ClusterNativeHrPending=Readonly<{name:string;sha256:string;data:NativeObservationData;ordered:NativeResultList}>;
export type ClusterNativeHrWorkspace=Readonly<{list:NativeResultList|null;receipts:readonly ClusterNativeHrReceipt[];reading:Readonly<{token:number;name:string}>|null;pending:ClusterNativeHrPending|null;replaceArmed:boolean;error:ClusterNativeHrErrorCode|null;observationsPlotted:boolean;trial:ClusterNativeHrTrial}>;
export const EMPTY_CLUSTER_NATIVE_HR:ClusterNativeHrWorkspace=Object.freeze({list:null,receipts:Object.freeze([]),reading:null,pending:null,replaceArmed:false,error:null,observationsPlotted:false,trial:CLUSTER_NATIVE_HR_INITIAL_TRIAL});
export class ClusterNativeHrStateError extends Error{constructor(readonly code:'busy'|'pending'|'trial'){super('Cluster native HR state '+code);this.name='ClusterNativeHrStateError';}}
const MAX_RECEIPTS=1000;
const next=(w:ClusterNativeHrWorkspace,c:Partial<ClusterNativeHrWorkspace>):ClusterNativeHrWorkspace=>Object.freeze({...w,...c});
export const clusterNativeHrRecords=(w:ClusterNativeHrWorkspace)=>w.list?.data.records.length??0;
/** Starting a read keeps current results;a reviewed file must be resolved first. */
export function beginClusterNativeHrRead(w:ClusterNativeHrWorkspace,token:number,name:string){if(w.pending||w.reading)throw new ClusterNativeHrStateError('busy');return next(w,{reading:Object.freeze({token,name:name.slice(0,160)}),error:null});}
export function cancelClusterNativeHrRead(w:ClusterNativeHrWorkspace){return w.reading?next(w,{reading:null}):w;}
/** Late or cancelled completions are ignored without touching current results. */
export function completeClusterNativeHrRead(w:ClusterNativeHrWorkspace,token:number,file:Readonly<{name:string;sha256:string;data:NativeObservationData}>){
 if(w.reading?.token!==token)return w;
 try{return next(w,{reading:null,error:null,pending:Object.freeze({name:file.name.slice(0,160),sha256:file.sha256,data:file.data,ordered:buildNativeResultList(file.data)})});}
 catch(error){if(error instanceof NativeResultListError)return next(w,{reading:null,error:error.code==='limit'?'limit':'key'});throw error;}
}
export function failClusterNativeHrRead(w:ClusterNativeHrWorkspace,token:number,error:unknown){
 if(w.reading?.token!==token)return w;const code:ClusterNativeHrErrorCode=error instanceof NativeObservationError&&(error.code==='size'||error.code==='layout'||error.code==='text')?error.code:'read';return next(w,{reading:null,error:code});
}
export function cancelClusterNativeHrPending(w:ClusterNativeHrWorkspace){return w.pending?next(w,{pending:null,replaceArmed:false}):w;}
/** Native add path:each record enters through the recovered insertion(0x492728). */
export function addClusterNativeHrPending(w:ClusterNativeHrWorkspace){
 const p=w.pending;if(!p)throw new ClusterNativeHrStateError('pending');if(w.receipts.length>=MAX_RECEIPTS)return next(w,{error:'limit'});
 try{const list=w.list?appendNativeResultList(w.list,p.data):p.ordered;return next(w,{list,pending:null,replaceArmed:false,error:null,receipts:Object.freeze([...w.receipts,Object.freeze({name:p.name,sha256:p.sha256,records:p.data.records.length,action:'add' as const})])});}
 catch(error){if(error instanceof NativeResultListError)return next(w,{error:error.code==='limit'?'limit':'key'});throw error;}
}
/** Native clear asks a second confirmation;without current records it is the same as add. */
export function armClusterNativeHrReplace(w:ClusterNativeHrWorkspace){if(!w.pending)throw new ClusterNativeHrStateError('pending');return clusterNativeHrRecords(w)===0?replaceNow(w,w.pending):next(w,{replaceArmed:true});}
export function disarmClusterNativeHrReplace(w:ClusterNativeHrWorkspace){return w.replaceArmed?next(w,{replaceArmed:false}):w;}
export function confirmClusterNativeHrReplace(w:ClusterNativeHrWorkspace){if(!w.pending||!w.replaceArmed)throw new ClusterNativeHrStateError('pending');return replaceNow(w,w.pending);}
function replaceNow(w:ClusterNativeHrWorkspace,p:ClusterNativeHrPending){return next(w,{list:p.ordered,pending:null,replaceArmed:false,error:null,receipts:Object.freeze([Object.freeze({name:p.name,sha256:p.sha256,records:p.data.records.length,action:'replace' as const})])});}
/** MeasuredData1Click0x542ed8:+0x40c←0,+0x40d←1,refresh. No emptiness check or prompt.
 * Web preselection flag only: redraw0x54235c actually selects by +0x40c alone;
 * unconditional AL=1 at0x542380 defeats the earlier +0x40d test. Initial +0x40c unknown. */
export function plotClusterNativeHrObservations(w:ClusterNativeHrWorkspace){return w.observationsPlotted?w:next(w,{observationsPlotted:true});}
export function setClusterNativeHrTrial(w:ClusterNativeHrWorkspace,change:Partial<ClusterNativeHrTrial>){const trial=Object.freeze({...w.trial,...change});if(!validClusterNativeHrTrial(trial))throw new ClusterNativeHrStateError('trial');return next(w,{trial});}
/** Help topic "Remove ZAMS, Isochrone from Display":Tools>Clear removes both overlays. */
export function clearClusterNativeHrOverlays(w:ClusterNativeHrWorkspace){return setClusterNativeHrTrial(w,{zamsShown:false,isochroneShown:false});}
export function dismissClusterNativeHrError(w:ClusterNativeHrWorkspace){return w.error?next(w,{error:null}):w;}
