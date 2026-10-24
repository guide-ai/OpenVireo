// Receiver bank: TRcvr_Form1 main + two child channels, the shared source buffer TRadioLab+0x5f7 and the signal chain
// (R-RX1). CLEA_VEO.exe SHA-256 781bc970…c54c. FormCreate 0x5721d8, Open 0x567958, Add Channel 0x574e90, Activate
// 0x5728dc, beam part of display refresh 0x573141..0x5732ed, Receive 0x5745f8, source refresh 0x574ba4, signal
// 0x573f5c, frame 0x573790, timer 0x574ad4, close query 0x5727e8, close 0x5726f0, scale steps 0x574470/0x5744c4/
// 0x574518/0x574588, clock reassociation 0x565723..0x5657cb and PulsarList1Click 0x567f80. Pure TypeScript, no UI,
// recording, PLR, audio or cadence. See docs/RADIO-RECEIVER-SIGNAL.md and RADIO-RECEIVER-SIGNAL-PROVENANCE.json.
// Every transition returns new frozen objects; a refusal leaves the input bank (and its random stream) untouched.
import {roundNearestEven} from './numericPolicy';
import type {RadioPointing} from './radioAntenna';
import type {PulsarCatalog,PulsarRecord} from './radioPulsarCatalog';
import {buildPulsarProfile,createPulsarProfile,currentPulsarSample,nextPulsarSample,type PulsarProfile} from './radioPulsarProfile';
import {CLOCK_REASSOCIATE_LIMIT,RECEIVER_OPEN_LIMIT,selectNearestPulsar} from './radioPulsarSelect';
import {RadioSignalError,radioPoisson,randomizeRadioStream,type RadioRandomStream,type RadioSignalErrorKind} from './radioRandom';
import {radioExtendedWords,radioPlanck,radioThermalRecord,type RadioThermalRecord} from './radioThermal';

export const RADIO_RECEIVER_CONSTANTS=Object.freeze({
 /** FormCreate immediates: +0x529 600 MHz (0x572258..0x57226a), +0x533 step 100 and index 5, +0x53d vertical 1.0,
  * +0x56f horizontal 4.0 (snapshot +0x579), Extended 50 for the +0x470 thermal record (0x57237b..0x572385). */
 frequencyMHz:radioExtendedWords(0,0x96000000,0x4008),stepMHz:radioExtendedWords(0,0xc8000000,0x4005),stepIndex:5,
 verticalGain:radioExtendedWords(0,0x80000000,0x3fff),horizontal:radioExtendedWords(0,0x80000000,0x4001),
 skyTemperatureK:radioExtendedWords(0,0xc8000000,0x4004),
 /** [D] TRCVR_FORM1 DFM Display1.Width 401; FormCreate stores Width − 1 at +0x51d. Later geometry writers not ported. */
 displayWidth:401,
 /** Single 16 / 24: FormCreate 0x5726e8/0x5726ec, refresh 0x574dc8/0x574dcc, timer 0x574ba0. */
 batchSpecialH:Math.fround(16),batchNumerator:Math.fround(24),
 /** Extended 0x5726b0 (K divisor) and Single 0x5726bc (area divisor). */
 backgroundDivisor:Number('1.000000000000000000018377930495836641360156492146227247275191984954290091991424560546875E-10'),
 areaDivisor:Math.fround(100),
 /** Singles 0x574dd0/0x574164 (0) and 0x574dd4/0x574168 (2) in the spatial factor. */
 spatialZero:Math.fround(0),spatialTwo:Math.fround(2),
 /** Single 0x57416c = 1e9 (cell 87de9f55…): signal frequency multiplier at 0x57409a. Kept as stored. */
 signalFrequencyMultiplier:Math.fround(1e9),
 /** Beam cells (BEAM-WIDTH-TYPED-CONSTANTS.json, BEAM-SEARCH-SCALAR-OPERANDS.json). */
 beamZero:Math.fround(0),beamFrequencyMultiplier:Math.fround(1e6),beamNumerator:Math.fround(366000000),
 radiansToDegrees:Number('57.2957795130823208766546184023127352702431380748748779296875'),
 sigmaDivisor:Number('1.177409999999999999989452881266061012865975499153137207031250000'),
 searchPositive:Math.fround(0.5),searchSigma:Math.fround(3),
 /** Frame: row = 0x6e − Round(signal · +0x565). */
 displayBaseline:0x6e,
 /** Extended 0x574b94 ≈ 3.5e-7 day (cell d33bb093…); decimal rounded to 70 digits by the typed-constant record. */
 timerGate:Number('3.500000000000000000075177482791269367203013107570086503983475267887115E-7'),
 /** Scale step cells (receiver-controls/CANONICAL-MANIFEST.json). */
 horizontalMin:Math.fround(0.5),horizontalMax:Math.fround(16),verticalMin:Math.fround(0.125),verticalMax:Math.fround(8),stepFactor:Math.fround(2),
 /** ShortString 0x574dd8, length 20 (cell cdf89e4d…), copied by rep movs at 0x574d18..0x574d2a. */
 noSourceIdentifier:'No Object Identified',
 /** Bounded ShortString copy 0x403c5c with cl = 0x14 at 0x574c9b. */
 identifierLimit:20,
});
/** Close-query literals 0x572878 (text) and 0x5728c4 (caption). */
export const RADIO_RECEIVER_LITERALS=Object.freeze({
 closeRefusalText:'Close the Lowest Receiver First, or Close the Master Receiver to Close All.',closeRefusalCaption:'Cannot Close Receiver!',
});

/** Subset of the TRadiOptsDlg record read by the receiver: Int32 +0x916, Single +0x924, Int32 +0x928, Single +0x92c,
 * Single +0x930. [I] Base binding per the compiled defaults routine 0x5a8ec4 (ebx = record). Other option fields
 * (91e/939/93f …) are not interpreted here. */
export type RadioReceiverOptions=Readonly<{
 provenance:'compiled-defaults-0x5a8ec4'|'supplied-record';
 dishDiameterMeters:number;gain924:number;background928:number;beamWidth92c:number;temperature930:number;
}>;
/** 0x5a9002..0x5a9064: +0x916 = 100, +0x924 = 1.0, +0x928 = 5, +0x92c = 0, +0x930 = 50.0. */
export const RADIO_RECEIVER_COMPILED_OPTIONS:RadioReceiverOptions=Object.freeze({
 provenance:'compiled-defaults-0x5a8ec4',dishDiameterMeters:100,gain924:Math.fround(1),background928:5,beamWidth92c:Math.fround(0),temperature930:Math.fround(50),
});
/** [W] Option admission: +0x916 integer 0..10000, +0x928 int32, Singles finite and Single-representable. */
export const RADIO_RECEIVER_WEB_POLICY=Object.freeze({maxDishMeters:10_000});

const isSingle=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&Math.fround(v)===v;
export function radioReceiverOptionsIssue(o:unknown):string|null{
 if(typeof o!=='object'||o===null)return 'not a record';
 const r=o as Record<string,unknown>;
 if(r.provenance!=='compiled-defaults-0x5a8ec4'&&r.provenance!=='supplied-record')return 'provenance';
 const d=r.dishDiameterMeters;
 if(typeof d!=='number'||!Number.isInteger(d)||d<0||d>RADIO_RECEIVER_WEB_POLICY.maxDishMeters)return 'dishDiameterMeters';
 const b=r.background928;if(typeof b!=='number'||!Number.isInteger(b)||b< -(2**31)||b>2**31-1)return 'background928';
 for(const f of ['gain924','beamWidth92c','temperature930'])if(!isSingle(r[f]))return f;
 return null;
}

/** +0x5f7: the single 96-byte buffer. record is null until the first full copy (no initial native contents claimed);
 * a miss or PulsarList clear writes only the length byte, kept as primaryName '' on the stale record. */
export type RadioSourceBuffer=Readonly<{record:PulsarRecord|null;primaryNameCleared:boolean}>;
export const INITIAL_RADIO_SOURCE_BUFFER:RadioSourceBuffer=Object.freeze({record:null,primaryNameCleared:false});

/** One TRcvr_Form1. Offsets name the native fields; null means not yet written on any ported path. */
export type RadioReceiver=Readonly<{
 index:0|1|2;// +0x3e8
 frequencyMHz:number;stepMHz:number;stepIndex:number;// +0x529, +0x533, +0x3ed
 verticalGain:number;horizontal:number;horizontalSnapshot:number;// +0x53d, +0x56f, +0x579
 sweepWidth:number;position:number|null;batch:number;interval:number|null;// +0x51d, +0x3e9, +0x3eb, +0x419
 /** Caches frozen at FormCreate from the options record: +0x40f, +0x55b, +0x547, +0x484. */
 sensitivity:number;backgroundFactor:number;area:number;detectorThermal:RadioThermalRecord;
 displayGain:number;// +0x565
 skyThermal:RadioThermalRecord;// +0x470
 offset:number;searchRadius:number;beamRadius:number|null;beamSigma:number|null;spatial:number|null;// +0x51f, +0x405, +0x3f1, +0x3fb, +0x551
 sourceAttached:boolean;identifiedName:string|null;inSource:boolean|null;// +0x4a2 ≠ nil, +0x4a6, +0x583
 receiving:boolean;stopPending:boolean|null;// +0x584, +0x42d
 /** +0x42f: [W] false (no audio). +0x498: H = 16 alternation byte. +0x499: Double from Time 0x40d448 (local
  * time-of-day fraction), stamped at Receive start (0x57499b) and at each admitted tick (0x574b04). */
 audio:false;alternation:number;lastTick:number|null;
 lastSignal:number|null;lastRow:number|null;
}>;
export type RadioReceiverSlots=readonly [RadioReceiver|null,RadioReceiver|null,RadioReceiver|null];
export type RadioReceiverBank=Readonly<{
 /** Live options record view (0x5bce04); feeds the beam (+0x916, +0x92c) and the spatial factor (+0x92c). */
 options:RadioReceiverOptions|null;
 sourceBuffer:RadioSourceBuffer;
 /** 0x5bcdf4 main, 0x5bcdf8 and 0x5bcdfc children. */
 slots:RadioReceiverSlots;
 /** Main +0x519, aliased by the children (0x57235d..0x572368). */
 profile:PulsarProfile|null;
 random:RadioRandomStream|null;
 /** Main Timer1 (+0x3a4) Enabled. */
 timerEnabled:boolean;
 /** 0x5bce28: [W] always false; recording is not ported. */
 recording:false;
}>;

export type RadioReceiverFrame=Readonly<{slot:number;position:number;inSource:boolean;sourceTerm:number;background:number;signal:number;row:number|null}>;
export type RadioReceiverEvent=Readonly<
 |{kind:'created';slot:number}
 |{kind:'source-hit';limit:number;name:string;offset:number}
 |{kind:'source-miss';limit:number}
 |{kind:'buffer-overwritten';name:string}|{kind:'buffer-name-cleared'}
 |{kind:'reassociation-skipped'}
 |{kind:'refresh';cause:'receive'|'coupling';attached:boolean;name:string}
 |{kind:'beam';slot:number;changed:boolean}
 |{kind:'receive-started'}|{kind:'stop-requested'}
 |{kind:'sweep-reset';slot:number}|{kind:'sweep-finished';slot:number;position:number}
 |{kind:'step';slot:number;control:'horizontal'|'vertical';value:number}|{kind:'at-limit';slot:number;control:'horizontal'|'vertical'}
 |{kind:'timer-disabled'}|{kind:'timer-gated'}|{kind:'timer-batch';batch:number}
 |{kind:'closed';slot:number}|{kind:'post-0x53a'}
>;
export type RadioReceiverError=Readonly<{kind:RadioSignalErrorKind;detail:string}>;
export type RadioReceiverResult=Readonly<
 |{ok:true;bank:RadioReceiverBank;events:readonly RadioReceiverEvent[];frames:readonly RadioReceiverFrame[]}
 |{ok:false;error:RadioReceiverError}>;

type Mutable<T>={-readonly [K in keyof T]:T[K]};
type Draft={options:RadioReceiverOptions|null;buffer:RadioSourceBuffer;slots:(Mutable<RadioReceiver>|null)[];profile:PulsarProfile|null;stream:RadioRandomStream|null;timerEnabled:boolean};
type Run=(d:Draft,events:RadioReceiverEvent[],frames:RadioReceiverFrame[])=>void;
const fail=(kind:RadioSignalErrorKind,detail:string):never=>{throw new RadioSignalError(kind,detail);};
function seal(d:Draft):RadioReceiverBank{
 const slots=Object.freeze(d.slots.map(r=>r===null?null:Object.freeze({...r}))) as unknown as RadioReceiverSlots;
 return Object.freeze({options:d.options,sourceBuffer:d.buffer,slots,profile:d.profile,random:d.stream,timerEnabled:d.timerEnabled,recording:false});
}
function run(bank:RadioReceiverBank,body:Run):RadioReceiverResult{
 const d:Draft={options:bank.options,buffer:bank.sourceBuffer,slots:bank.slots.map(r=>r===null?null:{...r}),profile:bank.profile,stream:bank.random,timerEnabled:bank.timerEnabled};
 const events:RadioReceiverEvent[]=[],frames:RadioReceiverFrame[]=[];
 try{body(d,events,frames);}
 catch(error){if(error instanceof RadioSignalError)return Object.freeze({ok:false,error:Object.freeze({kind:error.kind,detail:error.detail})});throw error;}
 return Object.freeze({ok:true,bank:seal(d),events:Object.freeze(events.map(e=>Object.freeze(e))),frames:Object.freeze(frames)});
}
const main=(d:Draft)=>d.slots[0]??fail('receiver-unavailable','no main receiver');
const slotOf=(d:Draft,slot:number)=>(Number.isInteger(slot)&&slot>=0&&slot<=2?d.slots[slot]:null)??fail('receiver-unavailable',`no receiver in slot ${slot}`);
const batchFor=(h:number)=>h===RADIO_RECEIVER_CONSTANTS.batchSpecialH?1:roundNearestEven(RADIO_RECEIVER_CONSTANTS.batchNumerator/h)&0xffff;

/** New bank with an empty buffer and no receivers. options null stands for 0x5bce04 = nil. */
export function createRadioReceiverBank(options:RadioReceiverOptions|null):RadioReceiverResult{
 const empty:RadioReceiverBank=Object.freeze({options:null,sourceBuffer:INITIAL_RADIO_SOURCE_BUFFER,slots:Object.freeze([null,null,null]) as RadioReceiverSlots,
  profile:null,random:null,timerEnabled:false,recording:false});
 return run(empty,d=>{
  if(options!==null){const issue=radioReceiverOptionsIssue(options);if(issue)fail('options-domain',issue);}
  d.options=options===null?null:Object.freeze({...options});
 });
}

/** FormCreate 0x5721d8 for slot index (0x5bce00 is set by the caller first, so the 0xff guard is not reached). */
function formCreate(d:Draft,index:0|1|2,seed:number|undefined,events:RadioReceiverEvent[]){
 const k=RADIO_RECEIVER_CONSTANTS;
 const profile=index===0?createPulsarProfile():d.profile;// 0x562a70 or the master's +0x519
 d.stream=randomizeRadioStream(d.stream,'receiver-create-0x572376',seed);
 const skyThermal=radioThermalRecord(k.skyTemperatureK);
 const o=d.options??fail('options-missing','0x5bce04 is nil (error path 0x572441)');
 const q=o.dishDiameterMeters/k.areaDivisor,sensitivity=o.gain924,verticalGain=k.verticalGain;
 d.slots[index]={index,frequencyMHz:k.frequencyMHz,stepMHz:k.stepMHz,stepIndex:k.stepIndex,verticalGain,horizontal:k.horizontal,horizontalSnapshot:k.horizontal,
  sweepWidth:k.displayWidth-1,position:null,batch:batchFor(k.horizontal),interval:null,
  sensitivity,backgroundFactor:o.background928/k.backgroundDivisor,area:q*q,detectorThermal:radioThermalRecord(o.temperature930),
  displayGain:verticalGain*sensitivity,skyThermal,offset:0,searchRadius:0,beamRadius:null,beamSigma:null,spatial:null,
  sourceAttached:false,identifiedName:null,inSource:null,receiving:false,stopPending:null,audio:false,alternation:1,lastTick:null,lastSignal:null,lastRow:null};
 if(index===0)d.profile=profile;
 events.push({kind:'created',slot:index});
}

function clearName(b:RadioSourceBuffer):RadioSourceBuffer{
 return Object.freeze({record:b.record===null?null:Object.freeze({...b.record,primaryName:''}),primaryNameCleared:true});
}
const copyRecord=(r:PulsarRecord):RadioSourceBuffer=>Object.freeze({record:Object.freeze({...r}),primaryNameCleared:false});
/** Name behind +0x4a2 (the buffer's ShortString); null when nothing was ever written. */
const bufferName=(b:RadioSourceBuffer)=>b.record!==null?b.record.primaryName:b.primaryNameCleared?'':null;

/** Open 0x5679d6.. and clock 0x56575d..: hit copies the record into +0x5f7, attaches the main pointer and writes the
 * offset; miss detaches the pointer and clears the name byte, keeping the offset. Children are not touched. */
function associate(d:Draft,catalog:PulsarCatalog|null,pointing:RadioPointing,limit:number,events:RadioReceiverEvent[]){
 const m=main(d),hit=selectNearestPulsar(catalog,pointing,limit);
 if(hit===null){m.sourceAttached=false;d.buffer=clearName(d.buffer);events.push({kind:'source-miss',limit});return;}
 d.buffer=copyRecord(hit.record);m.sourceAttached=true;m.offset=hit.separation;
 events.push({kind:'source-hit',limit,name:hit.record.primaryName,offset:hit.separation});
}

/** Beam part of 0x572f8c (0x573141..0x5732ed) with the live options. f = 0 (or unordered) or dish 0 keeps the fields. */
function beam(d:Draft,r:Mutable<RadioReceiver>,events:RadioReceiverEvent[]){
 const k=RADIO_RECEIVER_CONSTANTS,o=d.options??fail('options-missing','beam');
 const f=r.frequencyMHz;
 if(f===k.beamZero||Number.isNaN(f)||o.dishDiameterMeters===0){events.push({kind:'beam',slot:r.index,changed:false});return;}
 const radius=((k.beamNumerator/(f*k.beamFrequencyMultiplier))/o.dishDiameterMeters)*k.radiansToDegrees,sigma=radius/k.sigmaDivisor;
 r.beamRadius=radius;r.beamSigma=sigma;
 r.searchRadius=o.beamWidth92c>k.beamZero?k.searchPositive*o.beamWidth92c:sigma*k.searchSigma;
 events.push({kind:'beam',slot:r.index,changed:true});
}

/** 0x574cb7..0x574d15 and 0x57400b..0x574063: 1 when live +0x92c > 0, else Exp(−(o/σ)²/2) with this receiver's σ.
 * [W] σ unset (no ported path wrote +0x3fb) or 0 is refused. The native pre-activation +0x3fb value is not
 * established here; a native division would depend on the unknown FPU control word. */
function spatial(d:Draft,r:Mutable<RadioReceiver>):number{
 const k=RADIO_RECEIVER_CONSTANTS,o=d.options??fail('options-missing','spatial factor');
 if(o.beamWidth92c>k.spatialZero)return 1;
 if(r.beamSigma===null||r.beamSigma===0)fail('beam-not-prepared',`slot ${r.index}: beam sigma ${r.beamSigma}`);
 const q=r.offset/r.beamSigma!;return Math.exp(-(q*q)/k.spatialTwo);
}

/** Source refresh 0x574ba4 (main only). [W] JD from the caller (radio clock scenario), never the host clock. */
function refresh(d:Draft,cause:'receive'|'coupling',jd:number|null,allocateSeed:number|undefined,events:RadioReceiverEvent[]){
 const k=RADIO_RECEIVER_CONSTANTS,m=main(d);
 // fild Word +0x51d; fld +0x56f; fdivrp → H/N into +0x419
 const dt=m.horizontal/m.sweepWidth;
 m.position=m.sweepWidth;m.interval=dt;m.batch=batchFor(m.horizontal);
 if(jd===null||!Number.isFinite(jd))fail('clock-required','source refresh JD (0x487bcc)');
 const source=m.sourceAttached?d.buffer.record:null;
 if(m.sourceAttached&&source===null)fail('receiver-unavailable','attached pointer without a copied record');
 const built=buildPulsarProfile(d.profile??fail('receiver-unavailable','no profile owner'),{source,dt,jd:jd!},d.stream,allocateSeed);
 d.profile=built.profile;d.stream=built.stream;
 if(source!==null){
  m.identifiedName=source.primaryName.slice(0,k.identifierLimit);m.skyThermal=radioThermalRecord(source.s48);m.spatial=spatial(d,m);
 }else{
  m.identifiedName=k.noSourceIdentifier;m.skyThermal=radioThermalRecord(k.skyTemperatureK);m.spatial=0;
 }
 for(const child of [d.slots[1],d.slots[2]])if(child){child.sourceAttached=m.sourceAttached;child.offset=m.offset;}
 events.push({kind:'refresh',cause,attached:source!==null,name:m.identifiedName});
}

/** Signal 0x573f5c: source term only when in source, background every call, SUM then positive clamp. */
function signal(d:Draft,r:Mutable<RadioReceiver>,jd:number|null,events:RadioReceiverEvent[]){
 const k=RADIO_RECEIVER_CONSTANTS,m=main(d);
 let sourceTerm=0;
 if(r.inSource===true){
  let sample:number;
  if(r.index===0){
   // 0x573f78..0x573f91: ShortString compare of +0x4a6 with the name behind the pointer (primary name only).
   const name=bufferName(d.buffer);
   if(r.identifiedName===null||name===null||r.identifiedName!==name)refresh(d,'coupling',jd,undefined,events);
   const next=nextPulsarSample(d.profile??fail('receiver-unavailable','no profile owner'),r.frequencyMHz);
   d.profile=next.profile;sample=next.value;
  }else{
   r.offset=m.offset;// 0x573fc1
   sample=currentPulsarSample(d.profile??fail('receiver-unavailable','no profile owner'),r.frequencyMHz);
  }
  r.spatial=spatial(d,r);
  sourceTerm=(sample*r.area)*r.spatial;
 }
 const nu=r.frequencyMHz*k.signalFrequencyMultiplier;
 const mean=(radioPlanck(r.detectorThermal,nu)*r.area+radioPlanck(r.skyThermal,nu))*(r.horizontal*r.backgroundFactor);
 const draw=radioPoisson(d.stream,mean,r.index);d.stream=draw.stream;
 const total=sourceTerm+draw.value;
 return {sourceTerm,background:draw.value,signal:total>0?total:0};
}

/** Frame 0x573790 (display, labels and recording omitted). */
function frame(d:Draft,slot:number,jd:number|null,events:RadioReceiverEvent[],frames:RadioReceiverFrame[]){
 const m=main(d),r=slotOf(d,slot);
 if(r.index===0){if(r.position===null)fail('receiver-unavailable','frame before any refresh');r.position=(r.position!+1)&0xffff;}
 else r.position=m.position;
 // 0x5737f3..0x573816: pointer set and +0x405 > +0x51f (ja: NaN and equality false); children copy the master flag.
 r.inSource=r.index===0?r.sourceAttached&&r.searchRadius>r.offset:m.inSource;
 const s=signal(d,r,jd,events);
 const rounded=roundNearestEven(s.signal*r.displayGain),row=RADIO_RECEIVER_CONSTANTS.displayBaseline-rounded;
 r.lastSignal=s.signal;r.lastRow=Number.isSafeInteger(row)&&row>=-(2**31)&&row<=2**31-1?row:null;
 const position=r.position??0;
 frames.push(Object.freeze({slot:r.index,position,inSource:r.inSource===true,sourceTerm:s.sourceTerm,background:s.background,signal:s.signal,row:r.lastRow}));
 if(position>=r.sweepWidth){
  if(r.stopPending===true){if(r.index===0)d.timerEnabled=false;events.push({kind:'sweep-finished',slot:r.index,position});}
  else{r.position=0;events.push({kind:'sweep-reset',slot:r.index});}
 }
}

export type ReceiverSourceInput=Readonly<{catalog:PulsarCatalog|null;pointing:RadioPointing}>;
/** Rcvr1Btn 0x567958: FormCreate when the main slot is empty (needs createSeed), then the picker with limit 2. */
export function openMainReceiver(bank:RadioReceiverBank,input:ReceiverSourceInput&Readonly<{createSeed?:number}>):RadioReceiverResult{
 return run(bank,(d,events)=>{if(d.slots[0]===null)formCreate(d,0,input.createSeed,events);associate(d,input.catalog,input.pointing,RECEIVER_OPEN_LIMIT,events);});
}
/** 0x574e90: first empty child slot; the child's FormCreate (Randomize) runs first, then the master's pointer and
 * offset are copied. [W] Refused without a main, while the main timer runs (Add disabled from Receive to the sweep
 * finish, RC-REC-09) and when both slots are used (the button is disabled after slot 2). */
export function addReceiverChannel(bank:RadioReceiverBank,input:Readonly<{createSeed?:number}>):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const m=main(d);
  if(d.timerEnabled)fail('receiver-unavailable','Add Channel is disabled while receiving or finishing a sweep');
  const slot=d.slots[1]===null?1:d.slots[2]===null?2:fail('receiver-unavailable','both child slots are used');
  formCreate(d,slot,input.createSeed,events);
  const c=d.slots[slot]!;c.sourceAttached=m.sourceAttached;c.offset=m.offset;
 });
}
/** FormActivate 0x5728dc with 0x5b584c+5 false [W]: a child copies the master's +0x584 and +0x56f; then the beam. */
export function activateReceiver(bank:RadioReceiverBank,slot:number):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const r=slotOf(d,slot);
  if(r.index!==0){const m=main(d);r.receiving=m.receiving;r.horizontal=m.horizontal;}
  beam(d,r,events);
 });
}
/** Live options copy (OA-03): caches already taken by existing receivers are unchanged. */
export function copyLiveRadioOptions(bank:RadioReceiverBank,options:RadioReceiverOptions):RadioReceiverResult{
 return run(bank,d=>{const issue=radioReceiverOptionsIssue(options);if(issue)fail('options-domain',issue);d.options=Object.freeze({...options});});
}
/** PulsarList1Click 0x567f80 (limit 2): overwrites or clears +0x5f7 only; no receiver field and no refresh. */
export function overwriteSourceBufferFromPulsarList(bank:RadioReceiverBank,input:ReceiverSourceInput):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const hit=selectNearestPulsar(input.catalog,input.pointing,RECEIVER_OPEN_LIMIT);
  if(hit===null){d.buffer=clearName(d.buffer);events.push({kind:'buffer-name-cleared'});}
  else{d.buffer=copyRecord(hit.record);events.push({kind:'buffer-overwritten',name:hit.record.primaryName});}
 });
}
/** ClocktimerTimer 0x565715..0x5657cb: skipped while [[0x5b5b44]] is nil, else the picker with limit 5. */
export function reassociateReceiverOnClock(bank:RadioReceiverBank,input:ReceiverSourceInput):RadioReceiverResult{
 return run(bank,(d,events)=>{if(d.slots[0]===null){events.push({kind:'reassociation-skipped'});return;}associate(d,input.catalog,input.pointing,CLOCK_REASSOCIATE_LIMIT,events);});
}

export type ReceiveToggleInput=Readonly<{jd:number|null;now:number;allocateSeed?:number}>;
/** Mode 0x5745f8 on the main receiver, then each child in slot order. Start: clear +0x42d, snapshot +0x579, refresh
 * (first build Randomizes with allocateSeed), stamp +0x499 := now (caller-supplied scalar for Time 0x40d448, see
 * receiverTimerTick), enable the timer. Stop: +0x42d := 1 only.
 * [W] Refused while a stop is pending and the timer still runs (the Mode control stays disabled until the finish);
 * after the finish a new Receive is admitted and clears the stale flag. */
export function toggleReceive(bank:RadioReceiverBank,input:ReceiveToggleInput):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const m=main(d);
  if(m.stopPending===true&&d.timerEnabled)fail('receiver-unavailable','stop pending until the sweep finishes');
  m.receiving=!m.receiving;
  if(m.receiving){
   if(!Number.isFinite(input.now))fail('clock-required','timer stamp (0x40d448)');
   m.stopPending=false;m.horizontalSnapshot=m.horizontal;
   refresh(d,'receive',input.jd,input.allocateSeed,events);
   m.lastTick=input.now;d.timerEnabled=true;events.push({kind:'receive-started'});
  }else{m.stopPending=true;events.push({kind:'stop-requested'});}
  beam(d,m,events);
  for(const c of [d.slots[1],d.slots[2]])if(c){
   c.receiving=m.receiving;
   if(c.receiving){c.stopPending=false;c.horizontalSnapshot=c.horizontal;}else c.stopPending=true;
   beam(d,c,events);
  }
 });
}

/** 0x574ae9..0x574afb: proceed unless Extended 3.5e-7 > now − last. [W] An unset +0x499 admits the tick. With
 * time-of-day fractions, a backward or post-midnight delta is negative, so the tick is gated. */
export function receiverTimerGate(lastTick:number|null,now:number):boolean{
 return lastTick===null||!(RADIO_RECEIVER_CONSTANTS.timerGate>now-lastTick);
}
/** Timer 0x574ad4 on the main receiver. Natively both now and +0x499 come from Time 0x40d448: GetLocalTime (thunk
 * 0x4083f4, IAT 0x620fd0) hour/minute/second/ms → Double fraction of the local day (RX-TIME-BASIS); not the DateTime
 * Now routine 0x40d47c. [W] now is caller-supplied and used as given (no wrapping, host clock or cadence). A
 * native-like replay supplies local day fractions and inherits the backward/midnight gate. A caller supplying a
 * monotonic day scalar instead takes an explicit web deviation with no native authority. jd feeds any coupling
 * refresh. At H = 16 the batch alternates 1, 2 (+0x498 xor 1). Each iteration runs the main frame, then
 * slot 1, then slot 2; the loop finishes the batch even after a sweep finish disables the timer. */
export function receiverTimerTick(bank:RadioReceiverBank,input:Readonly<{now:number;jd:number|null}>):RadioReceiverResult{
 return run(bank,(d,events,frames)=>{
  const m=main(d);
  if(!d.timerEnabled){events.push({kind:'timer-disabled'});return;}
  if(!Number.isFinite(input.now))fail('clock-required','timer now (0x40d448)');
  if(!receiverTimerGate(m.lastTick,input.now)){events.push({kind:'timer-gated'});return;}
  m.lastTick=input.now;
  if(m.horizontal===RADIO_RECEIVER_CONSTANTS.batchSpecialH){m.alternation^=1;m.batch=(m.alternation&0x7f)+1;}
  const batch=m.batch;events.push({kind:'timer-batch',batch});
  for(let i=0;i<batch;i++){
   frame(d,0,input.jd,events,frames);
   for(const slot of [1,2])if(d.slots[slot])frame(d,slot,input.jd,events,frames);
  }
 });
}

export type ReceiverCloseQuery=Readonly<{canClose:true}|{canClose:false;text:string;caption:string}>;
/** FormCloseQuery 0x5727e8: slot 1 cannot close while slot 2 exists. */
export function queryCloseReceiver(bank:RadioReceiverBank,slot:number):ReceiverCloseQuery{
 if(slot===1&&bank.slots[2]!==null)return Object.freeze({canClose:false,text:RADIO_RECEIVER_LITERALS.closeRefusalText,caption:RADIO_RECEIVER_LITERALS.closeRefusalCaption});
 return Object.freeze({canClose:true});
}
/** Close query, then FormClose 0x5726f0. Main: timer off, profile freed, children closed slot 2 then 1, slot cleared,
 * message 0x53a posted (its handler is not ported). Child: slot cleared. The buffer and random stream stay. */
export function closeReceiver(bank:RadioReceiverBank,slot:number):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const r=slotOf(d,slot);
  if(!queryCloseReceiver(bank,slot).canClose)fail('close-refused',RADIO_RECEIVER_LITERALS.closeRefusalText);
  if(r.index===0){
   d.timerEnabled=false;d.profile=null;
   for(const s of [2,1])if(d.slots[s]){d.slots[s]=null;events.push({kind:'closed',slot:s});}
   d.slots[0]=null;events.push({kind:'closed',slot:0},{kind:'post-0x53a'});
  }else{d.slots[r.index]=null;events.push({kind:'closed',slot:r.index});}
 });
}

/** Horizontal 0x574518 (down: H > 0.5 → H/2) and 0x574588 (up: H < 16 → 2H); the master then runs the same handler
 * on each child. [W] Refused while the main timer runs (RC-REC-09 disables the control until the finish). */
export function stepHorizontal(bank:RadioReceiverBank,slot:number,direction:'down'|'up'):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const k=RADIO_RECEIVER_CONSTANTS,r=slotOf(d,slot);
  if(d.timerEnabled)fail('receiver-unavailable','horizontal scale is disabled while receiving');
  const apply=(x:Mutable<RadioReceiver>)=>{
   const can=direction==='down'?x.horizontal>k.horizontalMin:!(x.horizontal>=k.horizontalMax);
   if(!can){events.push({kind:'at-limit',slot:x.index,control:'horizontal'});return false;}
   x.horizontal=direction==='down'?x.horizontal/k.stepFactor:x.horizontal*k.stepFactor;
   events.push({kind:'step',slot:x.index,control:'horizontal',value:x.horizontal});beam(d,x,events);return true;
  };
  if(apply(r)&&r.index===0)for(const c of [d.slots[1],d.slots[2]])if(c)apply(c);
 });
}
/** Vertical 0x574470 (down: gain > 0.125) and 0x5744c4 (up: gain < 8); +0x565 := gain · +0x40f. */
export function stepVertical(bank:RadioReceiverBank,slot:number,direction:'down'|'up'):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const k=RADIO_RECEIVER_CONSTANTS,r=slotOf(d,slot);
  const can=direction==='down'?r.verticalGain>k.verticalMin:!(r.verticalGain>=k.verticalMax);
  if(!can){events.push({kind:'at-limit',slot:r.index,control:'vertical'});return;}
  r.verticalGain=direction==='down'?r.verticalGain/k.stepFactor:r.verticalGain*k.stepFactor;
  r.displayGain=r.verticalGain*r.sensitivity;
  events.push({kind:'step',slot:r.index,control:'vertical',value:r.verticalGain});beam(d,r,events);
 });
}
