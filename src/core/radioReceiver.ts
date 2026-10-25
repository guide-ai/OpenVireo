// Receiver bank: TRcvr_Form1 main + two child channels, the shared source buffer TRadioLab+0x5f7 and the signal chain
// (R-RX1). CLEA_VEO.exe SHA-256 781bc970…c54c. FormCreate 0x5721d8, Open 0x567958, Add Channel 0x574e90, Activate
// 0x5728dc, beam part of display refresh 0x573141..0x5732ed, Receive 0x5745f8, source refresh 0x574ba4, signal
// 0x573f5c, frame 0x573790, timer 0x574ad4, close query 0x5727e8, close 0x5726f0, scale steps 0x574470/0x5744c4/
// 0x574518/0x574588, clock reassociation 0x565723..0x5657cb and PulsarList1Click 0x567f80. Pure TypeScript, no UI,
// recording, PLR, audio or cadence. See docs/RADIO-RECEIVER-SIGNAL.md and RADIO-RECEIVER-SIGNAL-PROVENANCE.json.
// R-RX2 (docs/RADIO-RECEIVER-MONITOR.md): the state part of the parameter refresh 0x572f8c (aperture/beam text, +0x583,
// titles, the title-change lastX reset), the trace store +0x587 (reset inside the source refresh, append in the frame),
// the Freq and Freq Incr. steps, Paint's refresh, the own SlaveBtn enable and the corrected Add/Close ends.
// R-RX3 (docs/RADIO-RECEIVER-MARKS.md): the two manual marks +0x430/+0x434 with their drag flags +0x586/+0x585, Display1
// MouseDown 0x5750c8, MouseMove 0x575200, MouseUp 0x575334, FormDblClick 0x57546c, Paint's tail 0x572d63..0x572daa and the
// Receive-start index reset; the line and label helpers are in radioReceiverMarks.
// R-RX4 (docs/RADIO-RECEIVER-RECORD.md): the recording byte 0x5bce28 (Record 0x57581c toggle, FormCreate disarm 0x572622),
// the scratch triple 0x5bce10 (frame store 0x573a30..0x573a4a), the Receive header write 0x574766..0x574969, the timer
// append 0x574b6d..0x574b82 into the bounded append 0x56a92c and the finish 0x573bbd..0x573bfc (disarm, RcrdDisp Off). The
// capture rows stay in this bank until the session commits them (WEB buffered commit); dialogs are the session's.
// Every transition returns new frozen objects; a refusal leaves the input bank (and its random stream) untouched.
import {roundNearestEven} from './numericPolicy';
import type {RadioPointing} from './radioAntenna';
import type {PulsarCatalog,PulsarRecord} from './radioPulsarCatalog';
import {buildPulsarProfile,createPulsarProfile,currentPulsarSample,nextPulsarSample,type PulsarProfile} from './radioPulsarProfile';
import {CLOCK_REASSOCIATE_LIMIT,RECEIVER_OPEN_LIMIT,selectNearestPulsar} from './radioPulsarSelect';
import {RadioSignalError,radioPoisson,randomizeRadioStream,type RadioRandomStream,type RadioSignalErrorKind} from './radioRandom';
import {radioExtendedWords,radioPlanck,radioThermalRecord,type RadioThermalRecord} from './radioThermal';
import {
 RECEIVER_DISPLAY_LITERALS,createReceiverTrace,receiverApertureBase,receiverChildTitle,receiverFovText,receiverHpbwText,receiverMainTitle,resetReceiverTrace,type RadioReceiverTrace,
} from './radioReceiverDisplay';
import {RECEIVER_MARK_CONSTANTS,attemptMarkLine,isReceiverMarkInt32,receiverMarkTimeText,type ReceiverMarkLineOutcome,type ReceiverMarkPair,type ReceiverMarkSelector} from './radioReceiverMarks';

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
 /** Freq clamps: Singles 0x5742ec = 400 and 0x57446c = 1400 (the clamped value is an Extended immediate of the same
  * value). Freq Incr. index bounds 1..5 (0x574df4/0x574e44). */
 frequencyMinMHz:Math.fround(400),frequencyMaxMHz:Math.fround(1400),stepIndexMin:1,stepIndexMax:5,
 /** ShortString 0x574dd8, length 20 (cell cdf89e4d…), copied by rep movs at 0x574d18..0x574d2a. */
 noSourceIdentifier:'No Object Identified',
 /** Bounded ShortString copy 0x403c5c with cl = 0x14 at 0x574c9b. */
 identifierLimit:20,
 /** R-RX4 0x56a92c: insert while the signed last index +0x84 is below 0x640 (so 1601 triples at most, static conditional
  * deduction RC-REC-07; the box literal 0x573e38 says 1600); ShortString[40] header name (cl = 0x28 at 0x5747da). */
 recordLastIndexBound:0x640,recordNameLimit:40,
});
/** [W-NUM] Freq Incr. step per index: exact binary64 10^(index − 3). 0x4270c0(Single 10, Single(i − 3)) is not identified
 * and its Extended result is not claimed (WEB-RX-NUM-01). Index 0 is not a table entry. */
export const RADIO_RECEIVER_STEP_VALUES=Object.freeze([Number.NaN,0.01,0.1,1,10,100] as const);
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
 /** +0x4bb ShortString[32] title and +0x4dc ShortString[60] aperture text: '' before the first parameter refresh as a web
  * initial state [W]. The generic InitInstance zero-fill 0x404f1c (runtime-init-instance.asm) is recovered, but the
  * receiver form's creation path is not independently linked to it, so no native initial value is claimed. Activation
  * refreshes both before the card is shown. */
 title:string;apertureText:string;
 /** +0x587 display trace store (constructor 0x5720cc at FormCreate). */
 trace:RadioReceiverTrace;
 /** Own SlaveBtn (Add Channel) Enabled: DFM True; Receive, slot 2, the sweep finish and a child close write it. */
 addEnabled:boolean;
 /** R-RX3 Int32 +0x430 (first) and +0x434 (second) mark columns; −1 unset (FormCreate 0x572675/0x57267f, Receive start). */
 marks:ReceiverMarkPair;
 /** R-RX3 drag flags +0x586 (first) and +0x585 (second). FormCreate does not write them: the initial false is web policy [W]
  * (same caveat as the InitInstance zero-fill 0x404f1c). Receive does not reset them (not in the captured block). */
 markDrag:readonly [boolean,boolean];
 /** R-RX4 RcrdDisp caption: 'On'/'Off' (0x573668/0x573674) from 0x5bce28 at each refresh 0x572f8c, 'Off' (0x573e20) at the
  * finish. '' before the first refresh [W] (FormCreate does not write it); a FormCreate disarm leaves it stale. */
 recordLabel:string;
}>;
export type RadioReceiverSlots=readonly [RadioReceiver|null,RadioReceiver|null,RadioReceiver|null];
type Cells<T>=readonly [T,T,T];
/** R-RX4 header cells at data object +4 as the capture sees them: seeded at arming from the current dataset, written by
 * Receive 0x574766..0x574969 (name, aperture, highest, present receivers' frequency and gain, start, interval). null: a cell
 * no ported path has written. Absent receivers keep the seeded cells (the native loop skips them). */
export type RadioRecordHeader=Readonly<{name:string|null;aperture:number|null;highestIndex:0|1|2|null;frequencies:Cells<number|null>;gains:Cells<number|null>;
 start:number|null;interval:number|null}>;
export const EMPTY_RADIO_RECORD_HEADER:RadioRecordHeader=Object.freeze({name:null,aperture:null,highestIndex:null,frequencies:Object.freeze([null,null,null] as const),
 gains:Object.freeze([null,null,null] as const),start:null,interval:null});
/** R-RX4 recording state of the bank. armed: 0x5bce28 (.bss, initially 0). scratch: the three Doubles 0x5bce10 (.bss, 0.0).
 * rows: the capture's appended triples, flat (WEB: held here until the session commits them to the current dataset).
 * full: +0x98 of that capture. */
export type RadioRecording=Readonly<{armed:boolean;scratch:Cells<number>;header:RadioRecordHeader|null;rows:readonly number[];full:boolean}>;
export const INITIAL_RADIO_RECORDING:RadioRecording=Object.freeze({armed:false,scratch:Object.freeze([0,0,0] as const),header:null,rows:Object.freeze([]),full:false});
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
 /** R-RX4 0x5bce28, 0x5bce10 and the working capture. */
 recording:RadioRecording;
}>;

/** erasePosition: the position before the signal (erase band); position: re-read after it (a coupling refresh may
 * rewrite it). wrapErase: position = N with no pending stop (FRAME step 9). */
export type RadioReceiverFrame=Readonly<{slot:number;position:number;inSource:boolean;sourceTerm:number;background:number;signal:number;row:number|null;
 erasePosition:number;wrapErase:boolean}>;
export type RadioReceiverControl='horizontal'|'vertical'|'frequency'|'frequency-step';
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
 |{kind:'step';slot:number;control:RadioReceiverControl;value:number}|{kind:'at-limit';slot:number;control:RadioReceiverControl}
 |{kind:'timer-disabled'}|{kind:'timer-gated'}|{kind:'timer-batch';batch:number}
 |{kind:'closed';slot:number}
 /** Close 0x5726f0 → 0x40516c: synchronous virtual dispatch of 0x53a to Application+0x44; the recipient is not modelled. */
 |{kind:'send-0x53a'}
 /** Paint 0x572a20 ran (its refresh included): the presentation draws receiverPaintOps for the slot. painted: the receiver
  * as Paint drew it, when a later step of the same transition changes it (Clear Paints several receivers in turn). */
 |{kind:'paint';slot:number;painted?:RadioReceiver}
 /** R-RX3 MouseDown refused while the main Timer1 runs (0x5750dc..0x5750e0): no flag, mark or label written. */
 |{kind:'mark-gated';slot:number}
 /** R-RX3 one line helper 0x575510 call with its outcome (stored also when x is negative or beyond the canvas). */
 |{kind:'mark-line';slot:number;selector:ReceiverMarkSelector;x:number;outcome:ReceiverMarkLineOutcome}
 /** R-RX3 one label helper 0x575684 call that drew (x in 0..N). Calls with an invalid x draw nothing and emit nothing. */
 |{kind:'mark-label';slot:number;selector:ReceiverMarkSelector;x:number;text:string}
 /** R-RX3 FormDblClick wrote −1 to a mark before that receiver's Paint. */
 |{kind:'mark-cleared';slot:number;selector:ReceiverMarkSelector}
 /** R-RX3 FormDblClick with neither origin mark set: nothing happens. */
 |{kind:'marks-none';slot:number}
 /** 0x572e24 ran (a frequency change while receiving): receiverAnnotationOps for the slot. */
 |{kind:'annotation';slot:number}
 /** The main title changed while not receiving: every lastX := 0 (refresh 0x572f8c). */
 |{kind:'trace-cleared';cause:'title'}
 |{kind:'trace-reset';slot:0}
 /** Add Channel with no empty slot: nothing is created (0x574ead..0x574eaf). */
 |{kind:'add-nothing'}
 /** R-RX4 FormCreate 0x572622 cleared a set recording byte (Open of a new main or Add of a child). */
 |{kind:'record-disarmed';slot:number}
 /** R-RX4 Receive 0x574766..0x574969 wrote the header (the byte was set at the start). */
 |{kind:'record-header'}
 /** R-RX4 0x56a92c at the bound: +0x98 := 1, the sample is not stored. */
 |{kind:'record-full'}
 /** R-RX4 finish 0x573bbd..0x573bfc in the main frame: byte := 0, RcrdDisp 'Off'; the session runs the dialogs. */
 |{kind:'record-finished';full:boolean}
 /** R-RX4 the main window closed with the byte set (receiving: Receive had started). The byte stays set until a FormCreate. */
 |{kind:'record-orphaned';receiving:boolean}
>;
export type RadioReceiverError=Readonly<{kind:RadioSignalErrorKind;detail:string}>;
export type RadioReceiverResult=Readonly<
 |{ok:true;bank:RadioReceiverBank;events:readonly RadioReceiverEvent[];frames:readonly RadioReceiverFrame[]}
 |{ok:false;error:RadioReceiverError}>;

type Mutable<T>={-readonly [K in keyof T]:T[K]};
/** Recording draft: rows are copied on the first append of the transition. */
type RecordingDraft={armed:boolean;scratch:[number,number,number];header:RadioRecordHeader|null;rows:readonly number[];full:boolean;ownRows:number[]|null};
type Draft={options:RadioReceiverOptions|null;buffer:RadioSourceBuffer;slots:(Mutable<RadioReceiver>|null)[];profile:PulsarProfile|null;stream:RadioRandomStream|null;timerEnabled:boolean;
 /** Trace stores copied in this transition (copy on first write; sealed and frozen at the end). */
 traces:Set<RadioReceiverTrace>;recording:RecordingDraft};
type Run=(d:Draft,events:RadioReceiverEvent[],frames:RadioReceiverFrame[])=>void;
type TraceDraft={maxIndex:number;dt:number|null;rows:(number|null)[];lastX:number};
const fail=(kind:RadioSignalErrorKind,detail:string):never=>{throw new RadioSignalError(kind,detail);};
/** The receiver's trace store, writable for the rest of this transition. */
function ownTrace(d:Draft,r:Mutable<RadioReceiver>):TraceDraft{
 if(!d.traces.has(r.trace)){const copy:TraceDraft={...r.trace,rows:r.trace.rows.slice()};r.trace=copy;d.traces.add(copy);}
 return r.trace as TraceDraft;
}
function seal(d:Draft):RadioReceiverBank{
 const trace=(t:RadioReceiverTrace)=>d.traces.has(t)?Object.freeze({...t,rows:Object.freeze(t.rows.slice())}):t;
 const slots=Object.freeze(d.slots.map(r=>r===null?null:Object.freeze({...r,trace:trace(r.trace)}))) as unknown as RadioReceiverSlots;
 const rd=d.recording;
 const recording:RadioRecording=Object.freeze({armed:rd.armed,scratch:Object.freeze([...rd.scratch] as [number,number,number]),header:rd.header,
  rows:rd.ownRows?Object.freeze(rd.ownRows):rd.rows,full:rd.full});
 return Object.freeze({options:d.options,sourceBuffer:d.buffer,slots,profile:d.profile,random:d.stream,timerEnabled:d.timerEnabled,recording});
}
function run(bank:RadioReceiverBank,body:Run):RadioReceiverResult{
 const r0=bank.recording;
 const d:Draft={options:bank.options,buffer:bank.sourceBuffer,slots:bank.slots.map(r=>r===null?null:{...r}),profile:bank.profile,stream:bank.random,timerEnabled:bank.timerEnabled,traces:new Set(),
  recording:{armed:r0.armed,scratch:[...r0.scratch] as [number,number,number],header:r0.header,rows:r0.rows,full:r0.full,ownRows:null}};
 const events:RadioReceiverEvent[]=[],frames:RadioReceiverFrame[]=[];
 try{body(d,events,frames);}
 catch(error){if(error instanceof RadioSignalError)return Object.freeze({ok:false,error:Object.freeze({kind:error.kind,detail:error.detail})});throw error;}
 return Object.freeze({ok:true,bank:seal(d),events:Object.freeze(events.map(e=>Object.freeze(e))),frames:Object.freeze(frames)});
}
const main=(d:Draft)=>d.slots[0]??fail('receiver-unavailable','no main receiver');
const slotOf=(d:Draft,slot:number)=>(Number.isInteger(slot)&&slot>=0&&slot<=2?d.slots[slot]:null)??fail('receiver-unavailable',`no receiver in slot ${slot}`);
const UNSET_MARKS:ReceiverMarkPair=Object.freeze([RECEIVER_MARK_CONSTANTS.unset,RECEIVER_MARK_CONSTANTS.unset] as const);
const NO_MARK_DRAG:readonly [boolean,boolean]=Object.freeze([false,false] as const);
const batchFor=(h:number)=>h===RADIO_RECEIVER_CONSTANTS.batchSpecialH?1:roundNearestEven(RADIO_RECEIVER_CONSTANTS.batchNumerator/h)&0xffff;

/** New bank with an empty buffer and no receivers. options null stands for 0x5bce04 = nil. */
export function createRadioReceiverBank(options:RadioReceiverOptions|null):RadioReceiverResult{
 const empty:RadioReceiverBank=Object.freeze({options:null,sourceBuffer:INITIAL_RADIO_SOURCE_BUFFER,slots:Object.freeze([null,null,null]) as RadioReceiverSlots,
  profile:null,random:null,timerEnabled:false,recording:INITIAL_RADIO_RECORDING});
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
  sourceAttached:false,identifiedName:null,inSource:null,receiving:false,stopPending:null,audio:false,alternation:1,lastTick:null,lastSignal:null,lastRow:null,
  title:'',apertureText:'',trace:createReceiverTrace(k.displayWidth-1),addEnabled:true,
  marks:UNSET_MARKS,markDrag:NO_MARK_DRAG,recordLabel:''};
 if(index===0)d.profile=profile;
 events.push({kind:'created',slot:index});
 // R-RX4 0x572622: 0x5bce28 := 0 on the main and on the child path; RcrdDisp is not rewritten here.
 if(d.recording.armed){d.recording.armed=false;events.push({kind:'record-disarmed',slot:index});}
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

/** State part of the parameter refresh 0x572f8c with the live options: the aperture text, the beam (0x573141..0x5732ed;
 * f = 0 or unordered, or dish 0, keeps the beam fields and the base text), +0x583 := pointer set and +0x405 > +0x51f
 * (strict; NaN false), then the title: the main rewrites it and, when it changed while not receiving, sets every
 * receiver's lastX := 0; a child writes its fixed title. Labels and the caption derive from these fields. */
function displayRefresh(d:Draft,r:Mutable<RadioReceiver>,events:RadioReceiverEvent[]){
 const k=RADIO_RECEIVER_CONSTANTS,o=d.options??fail('options-missing','display refresh');
 const base=receiverApertureBase(o.dishDiameterMeters),f=r.frequencyMHz;
 r.apertureText=base;
 let changed=false;
 if(!(f===k.beamZero||Number.isNaN(f)||o.dishDiameterMeters===0)){
  const radius=((k.beamNumerator/(f*k.beamFrequencyMultiplier))/o.dishDiameterMeters)*k.radiansToDegrees,sigma=radius/k.sigmaDivisor;
  r.beamRadius=radius;r.beamSigma=sigma;changed=true;
  if(o.beamWidth92c>k.beamZero){r.searchRadius=k.searchPositive*o.beamWidth92c;r.apertureText=receiverFovText(base,o.beamWidth92c);}
  else{r.searchRadius=sigma*k.searchSigma;r.apertureText=receiverHpbwText(base,2*radius);}
 }
 r.inSource=r.sourceAttached&&r.searchRadius>r.offset;
 if(r.index===0){
  const title=receiverMainTitle(r.inSource,d.buffer.record);
  if(title!==r.title&&!r.receiving){
   for(const x of d.slots)if(x)ownTrace(d,x).lastX=0;
   events.push({kind:'trace-cleared',cause:'title'});
  }
  r.title=title;
 }else r.title=receiverChildTitle(r.index);
 // R-RX4 RcrdDisp from the recording byte (0x573668 'On' / 0x573674 'Off').
 r.recordLabel=d.recording.armed?RECEIVER_DISPLAY_LITERALS.on:RECEIVER_DISPLAY_LITERALS.off;
 events.push({kind:'beam',slot:r.index,changed});
}

/** 0x574cb7..0x574d15 and 0x57400b..0x574063: 1 when live +0x92c > 0, else Exp(−(o/σ)²/2) with this receiver's σ.
 * [W] σ unset (no ported path wrote +0x3fb) or 0 is refused. The generic 0x404f1c zero-fill is recovered, but its link
 * to receiver creation is not closed, so no native pre-activation +0x3fb value is claimed; a native division would depend
 * on the unknown FPU control word. */
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
 // 0x574c0c: the main trace store is reset before the profile build; children are never reset (RXD-02).
 m.trace=resetReceiverTrace(m.trace,dt);events.push({kind:'trace-reset',slot:0});
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

/** Frame 0x573790 (labels, audio and recording omitted; the drawing is receiverFrameOps on the frame record). */
function frame(d:Draft,slot:number,jd:number|null,events:RadioReceiverEvent[],frames:RadioReceiverFrame[]){
 const m=main(d),r=slotOf(d,slot);
 if(r.index===0){if(r.position===null)fail('receiver-unavailable','frame before any refresh');r.position=(r.position!+1)&0xffff;}
 else r.position=m.position;
 // 0x5737f3..0x573816: pointer set and +0x405 > +0x51f (ja: NaN and equality false); children copy the master flag.
 const prior=r.inSource??false;
 r.inSource=r.index===0?r.sourceAttached&&r.searchRadius>r.offset:m.inSource;
 // The main title is rewritten when +0x583 changed; the frame resets no lastX [S].
 if(r.index===0&&r.inSource!==prior)r.title=receiverMainTitle(r.inSource===true,d.buffer.record);
 const erasePosition=r.position??0;
 const s=signal(d,r,jd,events);
 const rounded=roundNearestEven(s.signal*r.displayGain),row=RADIO_RECEIVER_CONSTANTS.displayBaseline-rounded;
 r.lastSignal=s.signal;r.lastRow=Number.isSafeInteger(row)&&row>=-(2**31)&&row<=2**31-1?row:null;
 // R-RX4 0x573a30..0x573a4a: when the byte is set, the signal before display gain goes to 0x5bce10 + 8·index (binary64 here,
 // an Extended → Double fstp natively; no x87 store emulation).
 if(d.recording.armed)d.recording.scratch[r.index]=s.signal;
 // A coupling refresh inside the signal may rewrite the position, so it is read again (FRAME step 6).
 const position=r.position??0;
 // Append 0x5721a8 (as appendReceiverTrace): only x ≤ max; rows[x] := Word(row), lastX := x. A null row stays null [W].
 const ix=position&0xffff;
 if(ix<=r.trace.maxIndex){const t=ownTrace(d,r);t.rows[ix]=r.lastRow===null?null:r.lastRow&0xffff;t.lastX=ix;}
 const wrapErase=position===r.sweepWidth&&r.stopPending!==true;
 frames.push(Object.freeze({slot:r.index,position,inSource:r.inSource===true,sourceTerm:s.sourceTerm,background:s.background,signal:s.signal,row:r.lastRow,erasePosition,wrapErase}));
 if(position>=r.sweepWidth){
  if(r.stopPending===true){
   // FINISH: timer off; the idle helper 0x575a38 with Self = main enables the main's own SlaveBtn.
   if(r.index===0){d.timerEnabled=false;r.addEnabled=true;}
   events.push({kind:'sweep-finished',slot:r.index,position});
   // R-RX4 0x573bbd..0x573bfc (any frame that finishes; the main runs first, so later frames see the byte clear): byte := 0,
   // RcrdDisp := 'Off'. The full box, Identify, Properties and the Save question follow in the session (WEB-REC-BATCH).
   if(d.recording.armed){d.recording.armed=false;r.recordLabel=RECEIVER_DISPLAY_LITERALS.off;events.push({kind:'record-finished',full:d.recording.full});}
  }
  else{r.position=0;events.push({kind:'sweep-reset',slot:r.index});}
 }
}

// ---------------------------------------------------------------- R-RX3 marks
/** One line helper 0x575510 call on r: the main Timer1 gate, the collision compare with lastBackupY = 141 [S/D], the store. */
function markLine(d:Draft,r:Mutable<RadioReceiver>,selector:ReceiverMarkSelector,x:number,events:RadioReceiverEvent[]){
 const a=attemptMarkLine(r.marks,selector,x,d.timerEnabled,RECEIVER_MARK_CONSTANTS.markBackupLastY);
 r.marks=a.marks;events.push({kind:'mark-line',slot:r.index,selector,x,outcome:a.outcome});
}
/** One label helper 0x575684 call on r with r's own snapshot +0x579 and N +0x51d; no timer test. */
function markLabel(r:Mutable<RadioReceiver>,selector:ReceiverMarkSelector,x:number,events:RadioReceiverEvent[]){
 const text=receiverMarkTimeText(r.horizontalSnapshot,r.sweepWidth,x);
 if(text!==null)events.push({kind:'mark-label',slot:r.index,selector,x,text});
}
/** One target of a mouse handler: line(sel, x), label(sel, x) with the requested x even when the line was refused, then
 * label(1 − sel, the target's stored other mark). */
function markTarget(d:Draft,r:Mutable<RadioReceiver>,selector:ReceiverMarkSelector,x:number,events:RadioReceiverEvent[]){
 markLine(d,r,selector,x,events);markLabel(r,selector,x,events);
 const other=(1-selector) as ReceiverMarkSelector;markLabel(r,other,r.marks[other],events);
}
/** Second-mark attempts: the origin, then the main when the origin is a child, then the other present children in slot
 * order 1, 2. Each target has its own collision compare and snapshot; a refusal never stops the later calls. clearDrag:
 * MouseUp clears the origin's +0x585 after its own attempt and before the broadcast. */
function markSecondBroadcast(d:Draft,origin:Mutable<RadioReceiver>,x:number,events:RadioReceiverEvent[],clearDrag:boolean){
 markTarget(d,origin,1,x,events);
 if(clearDrag)origin.markDrag=withDrag(origin.markDrag,1,false);
 if(origin.index!==0)markTarget(d,main(d),1,x,events);
 for(const s of [1,2]){const c=d.slots[s];if(s!==origin.index&&c)markTarget(d,c,1,x,events);}
}
const withDrag=(f:readonly [boolean,boolean],selector:ReceiverMarkSelector,v:boolean):readonly [boolean,boolean]=>{
 if(f[selector]===v)return f;const n=[...f] as [boolean,boolean];n[selector]=v;return Object.freeze(n);
};
const withMark=(m:ReceiverMarkPair,selector:ReceiverMarkSelector,v:number):ReceiverMarkPair=>{
 const n=[...m] as [number,number];n[selector]=v;return Object.freeze(n);
};
/** Paint's tail 0x572d63..0x572daa: line(first) when first ≥ 0, line(second) when second ≥ 0 (the same helper, so the timer
 * gate and collision compare apply), then label(first) and label(second) with the stored values. */
function paintMarks(d:Draft,r:Mutable<RadioReceiver>,events:RadioReceiverEvent[]){
 for(const sel of [0,1] as const)if(r.marks[sel]>=0)markLine(d,r,sel,r.marks[sel],events);
 markLabel(r,0,r.marks[0],events);markLabel(r,1,r.marks[1],events);
}
/** A frozen copy of r as Paint drew it, with its own frozen trace copy. */
function paintedSnapshot(r:Mutable<RadioReceiver>):RadioReceiver{
 return Object.freeze({...r,trace:Object.freeze({...r.trace,rows:Object.freeze(r.trace.rows.slice())})});
}
/** Paint 0x572a20 inside a transition: refresh, the drawing (paint event) and the mark tail. */
function paint(d:Draft,r:Mutable<RadioReceiver>,events:RadioReceiverEvent[],snapshot=false){
 displayRefresh(d,r,events);
 events.push(snapshot?{kind:'paint',slot:r.index,painted:paintedSnapshot(r)}:{kind:'paint',slot:r.index});
 paintMarks(d,r,events);
}
/** A result with the same bank object (no transition). */
const same=(bank:RadioReceiverBank,events:readonly RadioReceiverEvent[]):RadioReceiverResult=>
 Object.freeze({ok:true,bank,events:Object.freeze(events.map(e=>Object.freeze(e))),frames:Object.freeze([])});
const markSlot=(bank:RadioReceiverBank,slot:number)=>Number.isInteger(slot)&&slot>=0&&slot<=2?bank.slots[slot]:null;
const refuseSlot=(slot:number):RadioReceiverResult=>Object.freeze({ok:false,error:Object.freeze({kind:'receiver-unavailable' as const,detail:`no receiver in slot ${slot}`})});
const refuseX=(x:number):RadioReceiverResult=>Object.freeze({ok:false,error:Object.freeze({kind:'receiver-unavailable' as const,detail:`mark x ${x} is not an Int32`})});

/** Display1 MouseDown 0x5750c8 with TMouseButton code 0 (first) or 1 (second). The main Timer1 gate returns before any
 * write (same bank object, mark-gated). Code 0: +0x586 := 1 and one local target. Code 1: +0x585 := 1 and the
 * second-mark broadcast. Requested Y is not read by the helpers and is not an input. Non-Int32 x is refused atomically
 * (structural; the session admits only 0..400). */
export function receiverMarkDown(bank:RadioReceiverBank,slot:number,button:ReceiverMarkSelector,x:number):RadioReceiverResult{
 const r0=markSlot(bank,slot);if(!r0)return refuseSlot(slot);
 if(!isReceiverMarkInt32(x))return refuseX(x);
 if(button!==0&&button!==1)return Object.freeze({ok:false,error:Object.freeze({kind:'receiver-unavailable' as const,detail:`mark button ${String(button)}`})});
 if(bank.timerEnabled)return same(bank,[{kind:'mark-gated',slot:r0.index}]);
 return run(bank,(d,events)=>{
  const r=slotOf(d,slot);
  r.markDrag=withDrag(r.markDrag,button,true);
  if(button===0)markTarget(d,r,0,x,events);else markSecondBroadcast(d,r,x,events,false);
 });
}
export type ReceiverMarkShift=Readonly<{left:boolean;right:boolean}>;
/** Display1 MouseMove 0x575200: +0x586 with ssLeft (0x8) runs the first branch; otherwise +0x585 with ssRight (0x10) the
 * second-mark broadcast; otherwise nothing (same bank). No timer test: the line refuses but the labels still run. */
export function receiverMarkMove(bank:RadioReceiverBank,slot:number,shift:ReceiverMarkShift,x:number):RadioReceiverResult{
 const r0=markSlot(bank,slot);if(!r0)return refuseSlot(slot);
 if(!isReceiverMarkInt32(x))return refuseX(x);
 const first=r0.markDrag[0]&&shift.left,second=!first&&r0.markDrag[1]&&shift.right;
 if(!first&&!second)return same(bank,[]);
 return run(bank,(d,events)=>{const r=slotOf(d,slot);if(first)markTarget(d,r,0,x,events);else markSecondBroadcast(d,r,x,events,false);});
}
/** Display1 MouseUp 0x575334: +0x586 with code 0: one local target, then +0x586 := 0. Otherwise +0x585 with code 1: the
 * origin target, +0x585 := 0, then the broadcast. Otherwise nothing (same bank). No timer test. */
export function receiverMarkUp(bank:RadioReceiverBank,slot:number,button:ReceiverMarkSelector,x:number):RadioReceiverResult{
 const r0=markSlot(bank,slot);if(!r0)return refuseSlot(slot);
 if(!isReceiverMarkInt32(x))return refuseX(x);
 const first=r0.markDrag[0]&&button===0,second=!first&&r0.markDrag[1]&&button===1;
 if(!first&&!second)return same(bank,[]);
 return run(bank,(d,events)=>{
  const r=slotOf(d,slot);
  if(first){markTarget(d,r,0,x,events);r.markDrag=withDrag(r.markDrag,0,false);}
  else markSecondBroadcast(d,r,x,events,true);
 });
}
/** [W] WEB-MARK-CANCEL: one drag flag := false with no attempt (a cancelled browser gesture, or the end of a keyboard
 * placement). This is not a native drag-flag cancellation claim. Unchanged flags return the same bank. */
export function endReceiverMarkDrag(bank:RadioReceiverBank,slot:number,selector:ReceiverMarkSelector):RadioReceiverResult{
 const r0=markSlot(bank,slot);if(!r0)return refuseSlot(slot);
 if(!r0.markDrag[selector])return same(bank,[]);
 return run(bank,d=>{const r=slotOf(d,slot);r.markDrag=withDrag(r.markDrag,selector,false);});
}
/** FormDblClick 0x57546c (no timer test). Origin second ≥ 0: second := −1 and Paint for the origin, then the main when the
 * origin is a child, then the other present children in slot order, each set to −1 and Painted whether or not it had a
 * second mark. Otherwise origin first ≥ 0: first := −1 and Paint the origin. Otherwise nothing (same bank, marks-none).
 * Each Paint is a full state transition (refresh: title, beam, +0x583, a title-change lastX reset); its paint event
 * carries the receiver as drawn at that stage. */
export function clearReceiverMarks(bank:RadioReceiverBank,slot:number):RadioReceiverResult{
 const r0=markSlot(bank,slot);if(!r0)return refuseSlot(slot);
 const selector:ReceiverMarkSelector|null=r0.marks[1]>=0?1:r0.marks[0]>=0?0:null;
 if(selector===null)return same(bank,[{kind:'marks-none',slot:r0.index}]);
 return run(bank,(d,events)=>{
  const clear=(r:Mutable<RadioReceiver>)=>{
   r.marks=withMark(r.marks,selector,RECEIVER_MARK_CONSTANTS.unset);events.push({kind:'mark-cleared',slot:r.index,selector});
   paint(d,r,events,true);
  };
  const origin=slotOf(d,slot);clear(origin);
  if(selector===1){
   if(origin.index!==0)clear(main(d));
   for(const s of [1,2]){const c=d.slots[s];if(s!==origin.index&&c)clear(c);}
  }
 });
}

export type ReceiverSourceInput=Readonly<{catalog:PulsarCatalog|null;pointing:RadioPointing}>;
/** Rcvr1Btn 0x567958: FormCreate when the main slot is empty (needs createSeed), then the picker with limit 2. */
export function openMainReceiver(bank:RadioReceiverBank,input:ReceiverSourceInput&Readonly<{createSeed?:number}>):RadioReceiverResult{
 return run(bank,(d,events)=>{if(d.slots[0]===null)formCreate(d,0,input.createSeed,events);associate(d,input.catalog,input.pointing,RECEIVER_OPEN_LIMIT,events);});
}
/** 0x574e90: first empty child slot; the child's FormCreate (Randomize) runs first, then the master's pointer and
 * offset are copied; creating slot 2 disables the main's Add. No empty slot creates nothing (add-nothing, 0x574ead..
 * 0x574eaf): reachable once the sweep finish re-enabled Add with both slots used. [W] Refused without a main, while the
 * main timer runs (WEB-RX-ADD-01, RC-REC-09) and while the main's Add is disabled. */
export function addReceiverChannel(bank:RadioReceiverBank,input:Readonly<{createSeed?:number}>):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const m=main(d);
  if(d.timerEnabled)fail('receiver-unavailable','Add Channel is disabled while receiving or finishing a sweep');
  if(!m.addEnabled)fail('receiver-unavailable','Add Channel is disabled');
  const slot=d.slots[1]===null?1:d.slots[2]===null?2:null;
  if(slot===null){events.push({kind:'add-nothing'});return;}
  formCreate(d,slot,input.createSeed,events);
  const c=d.slots[slot]!;c.sourceAttached=m.sourceAttached;c.offset=m.offset;
  if(slot===2)m.addEnabled=false;
 });
}
/** FormActivate 0x5728dc with 0x5b584c+5 false [W]: a child copies the master's +0x584 and +0x56f; then the parameter
 * refresh (title, +0x583 and, for the main, the title-change lastX reset: activation is not idempotent). */
export function activateReceiver(bank:RadioReceiverBank,slot:number):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const r=slotOf(d,slot);
  if(r.index!==0){const m=main(d);r.receiving=m.receiving;r.horizontal=m.horizontal;}
  displayRefresh(d,r,events);
 });
}
/** Paint 0x572a20 state part: the parameter refresh 0x572f8c, then the drawing (paint event → receiverPaintOps), then the
 * mark tail (R-RX3). [W] The web paints at canvas mount (first WM_PAINT after Show [I]), at Receive start [S] and in the
 * mark Clear [S] only (WEB-RX-PAINT-01). */
export function paintReceiver(bank:RadioReceiverBank,slot:number):RadioReceiverResult{
 return run(bank,(d,events)=>{paint(d,slotOf(d,slot),events);});
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

/** R-RX4 Receive header 0x574766..0x574969, after the source refresh. Name: with the pointer +0x4a2 set, exercise byte 6
 * (≠ 1, RECEIVER_WEB_DISPLAY_POLICY) and +0x939 = 1, ShortString[40] of the buffer's legacy name (+0xd); without the
 * pointer ''. Aperture Word +0x916. Highest: contiguous children from slot 1. Frequency +0x529 and gain +0x53d × +0x40f of
 * the main and of each present child; absent receivers keep their cells. Start: profile owner +0x12; interval: main
 * +0x419. The +0x99 := 1, +0x96/+0x97 := 0 stores have their web counterpart in the commit (WEB buffered commit). */
function writeRecordHeader(d:Draft,events:RadioReceiverEvent[]){
 const k=RADIO_RECEIVER_CONSTANTS,m=main(d),o=d.options??fail('options-missing','record header'),seed=d.recording.header??EMPTY_RADIO_RECORD_HEADER;
 const source=m.sourceAttached?d.buffer.record:null;
 let highest=0;while(highest<2&&d.slots[highest+1])highest++;
 const frequencies=[...seed.frequencies] as [number|null,number|null,number|null],gains=[...seed.gains] as [number|null,number|null,number|null];
 for(const r of d.slots)if(r){frequencies[r.index]=r.frequencyMHz;gains[r.index]=r.verticalGain*r.sensitivity;}
 d.recording.header=Object.freeze({name:source?source.legacyName.slice(0,k.recordNameLimit):'',aperture:o.dishDiameterMeters,highestIndex:highest as 0|1|2,
  frequencies:Object.freeze(frequencies),gains:Object.freeze(gains),start:(d.profile??fail('receiver-unavailable','no profile owner')).start,interval:m.interval});
 events.push({kind:'record-header'});
}
/** R-RX4 append 0x56a92c of the scratch triple. +0x96/+0x97 are 0 during a web capture (the lease refuses imports), so
 * its clear-and-drop branch is not reached. Insert while the last index (rows − 1) is below 0x640, else +0x98 := 1. */
function appendRecord(d:Draft,events:RadioReceiverEvent[]){
 const rd=d.recording;
 if(rd.rows.length/3-1<RADIO_RECEIVER_CONSTANTS.recordLastIndexBound){
  if(!rd.ownRows){rd.ownRows=rd.rows.slice();rd.rows=rd.ownRows;}
  rd.ownRows.push(rd.scratch[0],rd.scratch[1],rd.scratch[2]);
 }else if(!rd.full){rd.full=true;events.push({kind:'record-full'});}
}

export type ReceiveToggleInput=Readonly<{jd:number|null;now:number;allocateSeed?:number}>;
/** Mode 0x5745f8 on the main receiver, then each child in slot order. Start: receiving helper 0x575c6c (Add off), clear
 * +0x42d, marks := −1 (R-RX3), Paint (refresh + drawing), snapshot +0x579, source refresh (trace reset; first build Randomizes with
 * allocateSeed), stamp +0x499 := now (caller-supplied scalar for Time 0x40d448, see receiverTimerTick), enable the timer,
 * refresh. Each child: copy +0x584, Add off, clear +0x42d, Paint, snapshot, refresh. Stop: +0x42d := 1 and the refresh
 * (whose title change may clear lastX).
 * [W] Refused while a stop is pending and the timer still runs (the Mode control stays disabled until the finish);
 * after the finish a new Receive is admitted and clears the stale flag. A refusal is atomic (no Paint, no trace reset). */
export function toggleReceive(bank:RadioReceiverBank,input:ReceiveToggleInput):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const m=main(d);
  if(m.stopPending===true&&d.timerEnabled)fail('receiver-unavailable','stop pending until the sweep finishes');
  m.receiving=!m.receiving;
  if(m.receiving){
   if(!Number.isFinite(input.now))fail('clock-required','timer stamp (0x40d448)');
   m.addEnabled=false;m.stopPending=false;
   // R-RX3: +0x430/+0x434 := −1 before this receiver's Paint (0x5746c8/0x5746d2); the drag flags are not written.
   m.marks=UNSET_MARKS;paint(d,m,events);
   m.horizontalSnapshot=m.horizontal;
   refresh(d,'receive',input.jd,input.allocateSeed,events);
   if(d.recording.armed)writeRecordHeader(d,events);
   m.lastTick=input.now;d.timerEnabled=true;events.push({kind:'receive-started'});
  }else{m.stopPending=true;events.push({kind:'stop-requested'});}
  displayRefresh(d,m,events);
  for(const c of [d.slots[1],d.slots[2]])if(c){
   c.receiving=m.receiving;
   if(c.receiving){
    c.addEnabled=false;c.stopPending=false;
    c.marks=UNSET_MARKS;paint(d,c,events);
    c.horizontalSnapshot=c.horizontal;
   }else c.stopPending=true;
   displayRefresh(d,c,events);
  }
 });
}

// ---------------------------------------------------------------- R-RX4 Record button 0x57581c
/** 0x575832..0x57583b: 0x5bce28 xor 1. [W] Refused without a main and while the main timer runs (Receive disables the main
 * Record button until the finish re-enables it, RC-REC-09). The prompts and the clear are the session's. */
export function toggleRecordByte(bank:RadioReceiverBank):RadioReceiverResult{
 return run(bank,d=>{main(d);if(d.timerEnabled)fail('receiver-unavailable','Record is disabled while receiving or finishing a sweep');d.recording.armed=!d.recording.armed;});
}
/** 0x5758ab / 0x5758fe: 0x5bce28 := 0 (Cancel of a prompt, or a refused arming). refresh: then the refresh 0x572f8c of the
 * main (0x575925; the unsaved prompt's Cancel jumps past it to 0x57592c). */
export function clearRecordByte(bank:RadioReceiverBank,refresh:boolean):RadioReceiverResult{
 return run(bank,(d,events)=>{d.recording.armed=false;if(refresh&&d.slots[0])displayRefresh(d,d.slots[0],events);});
}
/** 0x575905..0x575927 with the byte set: the three scratch Doubles := 0.0, then the refresh of the main ('On'). [W] The
 * capture starts empty with the header cells of the current dataset (seed) and +0x98 = 0. */
export function armRecordCapture(bank:RadioReceiverBank,seed:RadioRecordHeader):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const m=main(d);
  if(!d.recording.armed)fail('receiver-unavailable','the recording byte is not set');
  d.recording.scratch=[0,0,0];d.recording.header=Object.freeze({...seed});d.recording.rows=Object.freeze([]);d.recording.ownRows=null;d.recording.full=false;
  displayRefresh(d,m,events);
 });
}
/** 0x575925 → 0x572f8c on the main after a disarm (the byte is already 0). */
export function refreshRecordLabel(bank:RadioReceiverBank):RadioReceiverResult{
 return run(bank,(d,events)=>{displayRefresh(d,main(d),events);});
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
   // R-RX4 0x574b6d..0x574b82: append only while the byte is still set (a finish in this iteration cleared it).
   if(d.recording.armed)appendRecord(d,events);
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
 * 0x53a sent synchronously to Application+0x44 (recipient not modelled, WEB-RX-OWNER-01). Child: slot cleared and the
 * main's Add enabled. The buffer and random stream stay. The unguarded audio cleanup (waveOutClose(+0x59)) has no web
 * counterpart (WEB-RX-AUDIO-01). */
export function closeReceiver(bank:RadioReceiverBank,slot:number):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const r=slotOf(d,slot);
  if(!queryCloseReceiver(bank,slot).canClose)fail('close-refused',RADIO_RECEIVER_LITERALS.closeRefusalText);
  if(r.index===0){
   if(d.recording.armed)events.push({kind:'record-orphaned',receiving:r.receiving});
   d.timerEnabled=false;d.profile=null;
   for(const s of [2,1])if(d.slots[s]){d.slots[s]=null;events.push({kind:'closed',slot:s});}
   d.slots[0]=null;events.push({kind:'closed',slot:0},{kind:'send-0x53a'});
  }else{
   d.slots[r.index]=null;events.push({kind:'closed',slot:r.index});
   if(d.slots[0])d.slots[0].addEnabled=true;
  }
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
   events.push({kind:'step',slot:x.index,control:'horizontal',value:x.horizontal});displayRefresh(d,x,events);return true;
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
  events.push({kind:'step',slot:r.index,control:'vertical',value:r.verticalGain});displayRefresh(d,r,events);
 });
}
/** Freq MHz down/up (frequency-down.asm 2de976df…, frequency-up.asm b1faf22b…): candidate f ∓ step; down: unless it is
 * ≥ 400 it becomes 400; up: above 1400 it becomes 1400. An unchanged (or unordered) candidate only beeps (at-limit, no
 * refresh). Otherwise f is written, the parameters refresh and, while receiving, the annotation 0x572e24 is redrawn.
 * Allowed while receiving. The audio branch (flag5) is off this path under SILENT-01 (WEB-RX-AUDIO-01). */
export function stepFrequency(bank:RadioReceiverBank,slot:number,direction:'down'|'up'):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const k=RADIO_RECEIVER_CONSTANTS,r=slotOf(d,slot),f=r.frequencyMHz;
  let c=direction==='down'?f-r.stepMHz:f+r.stepMHz;
  if(direction==='down'){if(!(c>=k.frequencyMinMHz))c=400;}
  else if(c>k.frequencyMaxMHz)c=1400;
  if(c===f||Number.isNaN(c)){events.push({kind:'at-limit',slot:r.index,control:'frequency'});return;}
  r.frequencyMHz=c;
  events.push({kind:'step',slot:r.index,control:'frequency',value:c});
  displayRefresh(d,r,events);
  if(r.receiving)events.push({kind:'annotation',slot:r.index});
 });
}
/** Freq Incr. down/up (step-down/up-canonical.asm): index bounds 1..5 (a limit only beeps); step := 10^(index − 3)
 * (RADIO_RECEIVER_STEP_VALUES, WEB-RX-NUM-01), then the parameter refresh. */
export function stepFrequencyIncrement(bank:RadioReceiverBank,slot:number,direction:'down'|'up'):RadioReceiverResult{
 return run(bank,(d,events)=>{
  const k=RADIO_RECEIVER_CONSTANTS,r=slotOf(d,slot);
  const index=r.stepIndex+(direction==='down'?-1:1);
  if(index<k.stepIndexMin||index>k.stepIndexMax){events.push({kind:'at-limit',slot:r.index,control:'frequency-step'});return;}
  r.stepIndex=index;r.stepMHz=RADIO_RECEIVER_STEP_VALUES[index];
  events.push({kind:'step',slot:r.index,control:'frequency-step',value:r.stepMHz});
  displayRefresh(d,r,events);
 });
}
