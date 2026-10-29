import {describe,expect,it} from 'vitest';
import type {PulsarRecord} from './radioPulsarCatalog';
import {
 EMPTY_RADIO_RECORD_HEADER,RADIO_RECEIVER_CONSTANTS,armRecordCapture,receiverTimerTick,toggleReceive,toggleRecordByte,
 type RadioReceiverFrame,type RadioReceiverResult,
} from './radioReceiver';
import {
 addReceiverWindow,answerRecordIdentify,answerRecordPrompt,answerRecordSave,closeRecordProperties,completeRecordArming,createRadioReceiverSession,dismissRecordFull,
 editRecordIdentify,leaveFinishSave,leaveRecordSave,openFinishSave,openReceiverWindow,openRecordSave,pressRecord,reassociateReceivers,receiverBoxRefusal,receiverControlAvailability,
 recordDialogOpen,requestReceiverClose,stepFinishSave,stepReceiver,stepRecordSave,tickReceivers,toggleReceiverMode,
 type RadioReceiverSession,type ReceiverRecordHostRequest,type ReceiverSessionTransition,
} from './radioReceiverSession';
import {RADIO_IDENTIFY_POLICY,RADIO_RECORD_FLAGS,RADIO_RECORD_LITERALS,radioCaptureInput,radioIdentifyIssue} from './radioReceiverRecord';
import {
 INITIAL_PULSAR_CURRENT_DATA,acquirePulsarCaptureLease,claimPulsarOutput,commitPulsarCapture,importPulsarRecording,isMemoryData,pulsarClaimBytes,pulsarCurrentSaved,
 pulsarDataRows,pulsarDataSaved,pulsarHeaderCells,pulsarMemoryRecording,pulsarOutputClaim,pulsarWrittenCopy,recordPulsarFinishWrittenCopy,recordPulsarWrittenCopy,releasePulsarCaptureLease,
 releasePulsarOutput,
 setPulsarAnalysisActivity,setPulsarCapturePhase,type PulsarCurrentData,type PulsarMemoryRecording,
} from './pulsarCurrentData';
import {
 radioRecordEraseNote,radioRecordSaveAbandoned,radioRecordSaveBegin,radioRecordSaveNoticed,radioRecordSaveSettled,radioRecordSaveStarted,type RadioRecordSave,
} from './radioRecordSave';
import {radioFinishSaveBegin} from './radioFinishSave';
import {admitPlrRecording,type PlrRecording} from './pulsarRecording';

// [W] contract checks of the chosen R-RX4 implementation (docs/RADIO-RECEIVER-RECORD.md) with synthetic catalog records
// and seeds; the captures are model-generated, not CLEA observations, and nothing here is a native oracle.
const rec=(o:Partial<PulsarRecord>={}):PulsarRecord=>Object.freeze({primaryName:'J0000+00',legacyName:'B2358+38',ra:6,dec:10,x2a:0.5,x34:0,x3e:2451545,
 s48:Math.fround(30),s4c:Math.fround(10),s50:Math.fround(5),s54:Math.fround(8),s58:Math.fround(4),s5c:Math.fround(2),...o});
const A=rec(),POINT=Object.freeze({ra:6,dec:10}),JD=2451545.25;
let clock=1000;
const now=()=>(clock+=1e-6);
const take=(t:ReceiverSessionTransition)=>{if(t.outcome.kind!=='ok')throw new Error(JSON.stringify(t.outcome));return t.session;};
const okBank=(r:RadioReceiverResult)=>{if(!r.ok)throw new Error(r.error.detail);return r;};
/** Synthetic admitted .PLR: 3 rows, highest 2, gains with a stored 0 (replaced by 1 at read). */
function plr(name='SYNTH',rows=3):PlrRecording{
 const lines=[`'${name}',25,2`,'400.5,700.25,1300.75','2.0,0,4.0','50000.5,0.01'];
 for(let i=0;i<rows;i++)lines.push(`${i},1,2`);
 const a=admitPlrRecording(new TextEncoder().encode(lines.join('\r\n')+'\r\n'),'synthetic.plr');
 if(a.status!=='admitted')throw new Error(a.reason);
 return a.recording;
}

/** A test host: the session plus the shared dataset, applying every host request like the presentation does. */
type World={s:RadioReceiverSession;doc:PulsarCurrentData;opened:number;requests:ReceiverRecordHostRequest[]};
const world=(s=createRadioReceiverSession(),doc=INITIAL_PULSAR_CURRENT_DATA):World=>({s,doc,opened:0,requests:[]});
/** The presentation's snapshot: +0x97 is the document's (an imported file, or an R-RX15/R-RX16 verified copy). */
const snap=(w:World)=>({generation:w.doc.generation,rows:pulsarDataRows(w.doc.data),saved:pulsarCurrentSaved(w.doc),analysisBusy:w.doc.analysis.modal||w.doc.analysis.reading,leaseHeld:w.doc.lease!==null});
function drive(w:World,step:(s:RadioReceiverSession)=>ReceiverSessionTransition):ReceiverSessionTransition{
 let tr=step(w.s);w.s=tr.session;
 const queue=[...(tr.host??[])];
 while(queue.length){
  const h=queue.shift()!;w.requests.push(h);
  if(h.kind==='acquire'){
   const r=acquirePulsarCaptureLease(w.doc,h.id,h.generation,h.erase);w.doc=r.doc;
   tr=completeRecordArming(w.s,r.ok?{ok:true,seed:pulsarHeaderCells(r.doc.data)}:{ok:false,reason:r.reason});w.s=tr.session;queue.push(...(tr.host??[]));
  }else if(h.kind==='release')w.doc=releasePulsarCaptureLease(w.doc,h.id).doc;
  else if(h.kind==='phase')w.doc=setPulsarCapturePhase(w.doc,h.id,h.phase).doc;
  else if(h.kind==='commit')w.doc=commitPulsarCapture(w.doc,h.id,pulsarMemoryRecording(radioCaptureInput(h.capture,h.name)!)).doc;
  else w.opened++;
 }
 return tr;
}
const open=(w:World,catalog=[A])=>{take(drive(w,s=>openReceiverWindow(s,{catalog,pointing:POINT})));return w;};
const record=(w:World)=>drive(w,s=>pressRecord(s,snap(w)));
const mode=(w:World)=>drive(w,s=>toggleReceiverMode(s,{jd:JD,now:now()}));
const tick=(w:World)=>drive(w,s=>tickReceivers(s,{jd:JD,now:now()}));
const rows=(w:World)=>w.s.bank.recording.rows.length/3;
const main=(w:World)=>w.s.bank.slots[0]!;
function untilFinished(w:World){for(let i=0;i<2000&&w.s.bank.timerEnabled;i++)tick(w);expect(w.s.bank.timerEnabled).toBe(false);}

describe('literals and the Identify admission',()=>{
 it('keeps the recovered texts and flags verbatim, with the 1600/1601 discrepancy',()=>{
  expect(RADIO_RECORD_LITERALS.fullText).toBe('Data Recording Was Terminated at 1600 Points.');
  expect(RADIO_RECEIVER_CONSTANTS.recordLastIndexBound).toBe(1600);
  expect(RADIO_RECORD_LITERALS.saveText.endsWith('("No" -> Open Analysis Window)')).toBe(true);
  expect(RADIO_RECORD_FLAGS).toEqual({unsaved:0x13,erase:0x41,full:0x40,save:0x23});
 });
 it('admits 0..40 printable ASCII and refuses longer or other text (never cut)',()=>{
  expect(['','x'.repeat(40),'No Data','B2358+38 "q"'].map(radioIdentifyIssue)).toEqual([null,null,null,null]);
  expect(radioIdentifyIssue('x'.repeat(41))).toBe('length');
  expect(['é','tab\t','line\n'].map(radioIdentifyIssue)).toEqual(['text','text','text']);
  expect(RADIO_IDENTIFY_POLICY.maxLength).toBe(40);
 });
});

describe('arming RC-REC-03 against the shared current dataset',()=>{
 it('empty data: Record arms at once (lease, scratch 0.0, label On); a second press disarms and releases',()=>{
  const w=open(world());
  const t=record(w);
  expect(t.outcome).toMatchObject({kind:'ok',action:'record-arming'});
  expect(w.s.bank.recording).toMatchObject({armed:true,scratch:[0,0,0],rows:[],full:false});
  expect(main(w).recordLabel).toBe('On');expect(w.doc.lease).toEqual({id:1,phase:'armed'});expect(w.doc.generation).toBe(0);
  record(w);
  expect(w.s.bank.recording.armed).toBe(false);expect(main(w).recordLabel).toBe('Off');expect(w.doc.lease).toBeNull();
  expect(w.requests.map(r=>r.kind)).toEqual(['acquire','release']);
 });
 it('unsaved memory data: Cancel disarms without the refresh; No → erase; erase Cancel disarms with the refresh; OK clears and keeps the header',()=>{
  const memory=pulsarMemoryRecording({captureId:9,name:'M',aperture:100,highestIndex:0,frequencies:[600,null,null],gains:[1,null,null],start:5,interval:0.01,rows:[1,0,0],full:false});
  const doc={...INITIAL_PULSAR_CURRENT_DATA,generation:3,data:memory};
  const w=open(world(createRadioReceiverSession(),doc));
  let t=record(w);
  expect(w.s.record.prompt).toEqual({kind:'unsaved',generation:3});expect(w.s.bank.recording.armed).toBe(true);
  t=drive(w,s=>answerRecordPrompt(s,'cancel',snap(w)));
  expect(w.s.bank.recording.armed).toBe(false);expect(w.s.record.prompt).toBeNull();
  expect(t.outcome.kind==='ok'&&t.outcome.events.some(e=>e.kind==='beam')).toBe(false);// 0x5758ab jumps past the refresh
  expect(w.doc.data).toBe(memory);
  record(w);drive(w,s=>answerRecordPrompt(s,'no',snap(w)));
  expect(w.s.record.prompt).toEqual({kind:'erase',generation:3});
  t=drive(w,s=>answerRecordPrompt(s,'cancel',snap(w)));
  expect(w.s.bank.recording.armed).toBe(false);expect(t.outcome.kind==='ok'&&t.outcome.events.some(e=>e.kind==='beam')).toBe(true);expect(w.doc.data).toBe(memory);
  record(w);drive(w,s=>answerRecordPrompt(s,'no',snap(w)));drive(w,s=>answerRecordPrompt(s,'ok',snap(w)));
  expect(w.doc.generation).toBe(4);expect(w.doc.data).toEqual({origin:'cleared',header:pulsarHeaderCells(memory)});
  expect(w.s.bank.recording.armed).toBe(true);expect(w.s.bank.recording.header).toEqual(pulsarHeaderCells(memory));expect(main(w).recordLabel).toBe('On');
  // The Save answer (6) is not a prompt answer here.
  expect(answerRecordPrompt(w.s,'ok',snap(w)).outcome).toMatchObject({kind:'web-refused',reason:'record-input'});
 });
 it('saved file data asks only the erase question; OK clears its rows and keeps its header cells (effective gains)',()=>{
  const file=plr(),doc=importPulsarRecording(INITIAL_PULSAR_CURRENT_DATA,file,0).doc;
  const w=open(world(createRadioReceiverSession(),doc));
  record(w);expect(w.s.record.prompt?.kind).toBe('erase');
  drive(w,s=>answerRecordPrompt(s,'ok',snap(w)));
  expect(w.doc.data).toMatchObject({origin:'cleared',header:{name:'SYNTH',aperture:25,highestIndex:2,frequencies:[400.5,700.25,1300.75],gains:[2,1,4],start:50000.5,interval:0.01}});
  expect(pulsarDataRows(w.doc.data)).toBe(0);
 });
 it('refuses a stale question (generation changed) and a busy analysis atomically: nothing erased, Record off',()=>{
  const file=plr(),doc=importPulsarRecording(INITIAL_PULSAR_CURRENT_DATA,file,0).doc;
  const w=open(world(createRadioReceiverSession(),doc));
  record(w);
  w.doc=importPulsarRecording(w.doc,plr('OTHER'),w.doc.generation).doc;// a later import changed the dataset
  const t=drive(w,s=>answerRecordPrompt(s,'ok',snap(w)));
  expect(t.outcome).toMatchObject({kind:'web-refused',reason:'record-superseded'});
  expect(w.s.bank.recording.armed).toBe(false);expect(main(w).recordLabel).toBe('Off');expect(pulsarDataRows(w.doc.data)).toBe(3);expect(w.doc.lease).toBeNull();
  w.doc=setPulsarAnalysisActivity(w.doc,{modal:true,reading:false}).doc;
  const before=w.s;
  expect(record(w).outcome).toMatchObject({kind:'web-refused',reason:'record-analysis-busy'});expect(w.s).toBe(before);
  w.doc=setPulsarAnalysisActivity(w.doc,{modal:false,reading:false}).doc;
  record(w);w.doc=setPulsarAnalysisActivity(w.doc,{modal:false,reading:true}).doc;
  expect(drive(w,s=>answerRecordPrompt(s,'ok',snap(w))).outcome).toMatchObject({kind:'web-refused',reason:'record-analysis-busy'});
  expect(pulsarDataRows(w.doc.data)).toBe(3);expect(w.s.bank.recording.armed).toBe(false);
 });
 it('blocks every other receiver action while a prompt is open',()=>{
  const doc=importPulsarRecording(INITIAL_PULSAR_CURRENT_DATA,plr(),0).doc;
  const w=open(world(createRadioReceiverSession(),doc));record(w);
  for(const t of [toggleReceiverMode(w.s,{jd:JD,now:now()}),addReceiverWindow(w.s),requestReceiverClose(w.s,0),stepReceiver(w.s,0,'vertical','up')])
   expect(t.outcome).toMatchObject({kind:'web-refused',reason:'record-dialog-open'});
 });
});

describe('capture: header, raw rows, Stop boundary, bound, RNG',()=>{
 it('writes the header at Receive from the receivers and the seed; absent receivers keep the seeded cells',()=>{
  const doc=importPulsarRecording(INITIAL_PULSAR_CURRENT_DATA,plr(),0).doc;
  const w=open(world(createRadioReceiverSession(),doc));
  take(drive(w,addReceiverWindow));
  record(w);drive(w,s=>answerRecordPrompt(s,'ok',snap(w)));
  mode(w);
  const h=w.s.bank.recording.header!,m=main(w),child=w.s.bank.slots[1]!;
  expect(h.name).toBe('B2358+38');expect(h.aperture).toBe(100);expect(h.highestIndex).toBe(1);
  expect(h.frequencies).toEqual([m.frequencyMHz,child.frequencyMHz,1300.75]);// slot 2 absent: the file's cell stays
  expect(h.gains).toEqual([m.verticalGain*m.sensitivity,child.verticalGain*child.sensitivity,4]);
  expect(Object.is(h.start,w.s.bank.profile!.start)).toBe(true);expect(Object.is(h.interval,m.interval)).toBe(true);expect(h.interval).toBe(4/400);
  expect(w.doc.lease).toEqual({id:1,phase:'receiving'});expect(w.doc.data).toMatchObject({origin:'cleared'});// WEB buffered commit
 });
 it('a source miss writes the empty name; an empty seed leaves absent cells null',()=>{
  const w=open(world(),[rec({ra:18,dec:-40})]);
  record(w);mode(w);
  expect(w.s.bank.recording.header).toMatchObject({name:'',highestIndex:0,frequencies:[600,null,null],gains:[1,null,null]});
 });
 it('stores the raw signal before display gain: each row is the iteration’s frames, absent columns 0.0, bit for bit',()=>{
  let b=open(world()).s.bank;
  b=okBank(toggleRecordByte(b)).bank;b=okBank(armRecordCapture(b,EMPTY_RADIO_RECORD_HEADER)).bank;
  b=okBank(toggleReceive(b,{jd:JD,now:now(),allocateSeed:2})).bank;
  const frames:RadioReceiverFrame[]=[];
  for(let i=0;i<5;i++){const r=okBank(receiverTimerTick(b,{now:now(),jd:JD}));frames.push(...r.frames);b=r.bank;}
  const main0=frames.filter(f=>f.slot===0);
  expect(b.recording.rows.length).toBe(main0.length*3);
  main0.forEach((f,i)=>{expect(Object.is(b.recording.rows[i*3],f.signal)).toBe(true);expect(Object.is(b.recording.rows[i*3+1],0)).toBe(true);expect(Object.is(b.recording.rows[i*3+2],0)).toBe(true);});
  expect(b.slots[0]!.displayGain).toBe(1);
 });
 it('recording adds no random draws: armed and unarmed runs with the same seed have identical streams and signals',()=>{
  const runOnce=(armed:boolean)=>{
   const w=open(world());take(drive(w,addReceiverWindow));
   if(armed)record(w);
   mode(w);const signals:number[]=[];
   for(let i=0;i<20;i++){tick(w);signals.push(main(w).lastSignal!,w.s.bank.slots[1]!.lastSignal!);}
   return {random:w.s.bank.random,signals,rows:rows(w)};
  };
  const a=runOnce(true),u=runOnce(false);
  expect(a.random).toEqual(u.random);expect(a.signals).toEqual(u.signals);expect(a.rows).toBe(120);expect(u.rows).toBe(0);
 });
 it('Stop at position p appends frames p+1..399 and excludes the finishing frame 400; a non-stopping sweep appends 400',()=>{
  // H = 8 (batch 3) reaches a tick end at position 0, the controlled start of a sweep (no intervening source refresh).
  const w=open(world());take(drive(w,s=>stepReceiver(s,0,'horizontal','up')));
  record(w);mode(w);
  for(let i=0;i<1000&&main(w).position!==0;i++)tick(w);
  expect(main(w).position).toBe(0);
  // Every frame so far appended (801 = the wrap frame N + 1, then 1..400, then 1..400): below the 1601 bound.
  expect(rows(w)).toBe(801);
  const sweepStart=rows(w);
  mode(w);// Stop requested at position 0
  untilFinished(w);
  expect(rows(w)-sweepStart).toBe(399);
  expect(w.s.record.finish).toMatchObject({stage:'identify',capture:{full:false}});
  expect(w.s.record.finish!.capture.rows.length/3).toBe(rows(w));
 });
 it('one ordinary sweep after the first frame appends exactly 400 rows (counted between two sweep resets of the main)',()=>{
  const w=open(world());record(w);mode(w);
  const resets:number[]=[];
  for(let i=0;i<400&&resets.length<2;i++){
   const t=tick(w);
   // Each tick's rows up to the iteration of a reset: count rows at tick ends whose main position wrapped.
   if(t.outcome.kind==='ok'&&t.outcome.events.some(e=>e.kind==='sweep-reset'&&e.slot===0))resets.push(rows(w)-main(w).position!);
  }
  expect(resets[1]-resets[0]).toBe(400);
 });
 it('Stop before the first tick gives an empty capture (0 rows) and the Identify stage',()=>{
  const w=open(world());record(w);mode(w);mode(w);untilFinished(w);
  expect(w.s.record.finish).toMatchObject({stage:'identify',capture:{rows:[]}});
 });
 it('H = 0.5: 1601 rows at the bound, +0x98 then set once; one finish event; the full box comes first',()=>{
  const w=open(world());for(let i=0;i<3;i++)take(drive(w,s=>stepReceiver(s,0,'horizontal','down')));
  expect(main(w).horizontal).toBe(0.5);
  record(w);mode(w);
  let fullEvents=0;
  for(let i=0;i<60;i++){const t=tick(w);if(t.outcome.kind==='ok')fullEvents+=t.outcome.events.filter(e=>e.kind==='record-full').length;}
  expect(rows(w)).toBe(1601);expect(w.s.bank.recording.full).toBe(true);expect(fullEvents).toBe(1);
  mode(w);
  let finishes=0;
  for(let i=0;i<60&&w.s.bank.timerEnabled;i++){const t=tick(w);if(t.outcome.kind==='ok')finishes+=t.outcome.events.filter(e=>e.kind==='record-finished').length;}
  expect(finishes).toBe(1);expect(rows(w)).toBe(1601);
  expect(w.s.record.finish).toMatchObject({stage:'full',capture:{full:true}});
  take(drive(w,dismissRecordFull));expect(w.s.record.finish!.stage).toBe('identify');
 });
 it('a refused tick appends nothing; a child closed mid-capture repeats its stale scratch value',()=>{
  const w=open(world());take(drive(w,addReceiverWindow));record(w);mode(w);tick(w);
  const before=rows(w),scratch1=w.s.bank.recording.scratch[1];
  take(drive(w,s=>requestReceiverClose(s,1)));
  tick(w);
  const r=w.s.bank.recording.rows;
  for(let i=before;i<rows(w);i++)expect(Object.is(r[i*3+1],scratch1)).toBe(true);
  // Coupling refusal (a 1e8 400 MHz flux source by reassociation; mean above the 1e6 browser limit): the bank and its rows are unchanged.
  const B=rec({primaryName:'J0001+00',legacyName:'B0001+00',s54:Math.fround(1e8)});
  w.s=take(reassociateReceivers(w.s,{catalog:[B],pointing:POINT}));
  const held=w.s.bank;const t=tick(w);
  expect(t.outcome.kind).toBe('refused');expect(w.s.bank).toBe(held);
 });
});

describe('controls, FormCreate disarm and the main close',()=>{
 it('RC-REC-09: Vert/Freq/Incr disabled on all windows while receiving armed; Record disabled while the timer runs',()=>{
  const w=open(world());take(drive(w,addReceiverWindow));record(w);mode(w);
  for(const slot of [0,1])expect(receiverControlAvailability(w.s,slot)).toMatchObject({frequency:'disabled','frequency-step':'disabled',vertical:'disabled'});
  expect(receiverControlAvailability(w.s,0).record).toBe('disabled');
  expect(stepReceiver(w.s,1,'vertical','up').outcome).toMatchObject({kind:'web-refused',reason:'record-locked'});
  mode(w);untilFinished(w);
  expect(receiverControlAvailability(w.s,0)).toMatchObject({frequency:'enabled',vertical:'enabled',record:'enabled'});
 });
 it('Add disarms (FormCreate 0x572622) and releases the lease; RcrdDisp stays On until the main refresh',()=>{
  const w=open(world());record(w);
  const t=drive(w,addReceiverWindow);
  expect(t.outcome.kind==='ok'&&t.outcome.events.some(e=>e.kind==='record-disarmed')).toBe(true);
  expect(w.s.bank.recording.armed).toBe(false);expect(w.doc.lease).toBeNull();expect(main(w).recordLabel).toBe('On');
  take(drive(w,s=>stepReceiver(s,0,'vertical','up')));
  expect(main(w).recordLabel).toBe('Off');
 });
 it('closing the main after Receive commits the partial capture (no dialogs); before Receive it releases the lease and the next Open disarms',()=>{
  const w=open(world());record(w);mode(w);tick(w);tick(w);
  const n=rows(w),signals=w.s.bank.recording.rows.slice(),before=w.requests.length,generation=w.doc.generation;
  take(drive(w,s=>requestReceiverClose(s,0)));
  expect(w.s.record.finish).toBeNull();expect(w.doc.lease).toBeNull();expect(w.s.record.leaseId).toBeNull();
  // WEB partial commit then exactly one release; one publication.
  expect(w.requests.slice(before).map(r=>r.kind)).toEqual(['commit','release']);expect(w.doc.generation).toBe(generation+1);
  expect(isMemoryData(w.doc.data)&&w.doc.data.rowCount).toBe(n);
  expect(isMemoryData(w.doc.data)&&[...w.doc.data.samples]).toEqual(signals);
  const v=world();open(v);record(v);const vBefore=v.requests.length;take(drive(v,s=>requestReceiverClose(s,0)));
  expect(v.requests.slice(vBefore).map(r=>r.kind)).toEqual(['release']);
  expect(v.doc.lease).toBeNull();expect(v.s.bank.recording.armed).toBe(true);// stays set until a FormCreate
  const t=drive(v,s=>openReceiverWindow(s,{catalog:[A],pointing:POINT}));
  expect(t.outcome.kind==='ok'&&t.outcome.events.some(e=>e.kind==='record-disarmed')).toBe(true);expect(v.s.bank.recording.armed).toBe(false);
 });
});

describe('finish dialogs RC-REC-08 and the commit',()=>{
 const finished=()=>{const w=open(world());record(w);mode(w);for(let i=0;i<10;i++)tick(w);mode(w);untilFinished(w);return w;};
 it('Identify: seeded with the header name; over-long and non-ASCII OK refused in place; OK commits once with the typed name',()=>{
  const w=finished();
  expect(w.s.record.finish).toMatchObject({stage:'identify',draft:'B2358+38',committed:false});expect(w.doc.lease?.phase).toBe('finishing');
  take(drive(w,s=>editRecordIdentify(s,'x'.repeat(41))));
  expect(drive(w,s=>answerRecordIdentify(s,'ok')).outcome).toMatchObject({kind:'web-refused',reason:'identify-length'});
  take(drive(w,s=>editRecordIdentify(s,'Crab é')));
  expect(drive(w,s=>answerRecordIdentify(s,'ok')).outcome).toMatchObject({kind:'web-refused',reason:'identify-text'});
  expect(w.doc.data).toBeNull();expect(w.s.record.finish!.stage).toBe('identify');
  take(drive(w,s=>editRecordIdentify(s,'PSR 1')));take(drive(w,s=>answerRecordIdentify(s,'ok')));
  expect(w.requests.filter(r=>r.kind==='commit')).toHaveLength(1);
  // WEB-REC-TXN: the capture is current and the lease stays held (committed) through Properties and the Save question.
  expect(w.doc).toMatchObject({lease:{id:1,phase:'committed'},data:{origin:'memory',name:'PSR 1',captureId:1}});
  expect(w.requests.filter(r=>r.kind==='release')).toHaveLength(0);expect(w.s.record.leaseId).toBe(1);
  expect(w.s.record.finish).toMatchObject({stage:'properties',committed:true});
  expect(answerRecordIdentify(w.s,'ok').outcome).toMatchObject({kind:'web-refused'});// no second commit
  const captured=w.doc.data,generation=w.doc.generation;
  expect(importPulsarRecording(w.doc,plr('DURING-PROPERTIES'),generation)).toMatchObject({ok:false,reason:'capture-lease'});
  take(drive(w,closeRecordProperties));expect(w.s.record.finish!.stage).toBe('save');expect(w.doc.lease).toEqual({id:1,phase:'committed'});
  expect(importPulsarRecording(w.doc,plr('DURING-SAVE'),generation)).toMatchObject({ok:false,reason:'capture-lease'});
  expect(w.doc.data).toBe(captured);
  const before=w.requests.length;
  take(drive(w,s=>answerRecordSave(s,'no')));
  // Release first, then the analysis opens with Load enabled; the data and generation are unchanged by the release.
  expect(w.requests.slice(before).map(r=>r.kind)).toEqual(['release','open-analysis']);
  expect(w.requests.map(r=>r.kind).filter(k=>k==='commit'||k==='release'||k==='open-analysis')).toEqual(['commit','release','open-analysis']);
  expect(w.doc.lease).toBeNull();expect(w.doc.data).toBe(captured);expect(w.doc.generation).toBe(generation);expect(w.s.record.leaseId).toBeNull();
  expect(w.opened).toBe(1);expect(w.s.record.finish).toBeNull();
  // A repeated answer is refused without host requests.
  const repeated=answerRecordSave(w.s,'no');expect(repeated.outcome).toMatchObject({kind:'web-refused',reason:'record-input'});expect(repeated.host).toBeUndefined();
  expect(importPulsarRecording(w.doc,plr('AFTER'),generation).ok).toBe(true);
 });
 it('Save Cancel releases exactly once without opening; an empty capture follows the same lease order',()=>{
  const w=finished();take(drive(w,s=>answerRecordIdentify(s,'ok')));take(drive(w,closeRecordProperties));
  const before=w.requests.length;take(drive(w,s=>answerRecordSave(s,'cancel')));
  expect(w.requests.slice(before).map(r=>r.kind)).toEqual(['release']);expect(w.opened).toBe(0);expect(w.doc.lease).toBeNull();
  expect(answerRecordSave(w.s,'cancel').host).toBeUndefined();
  // Stop before the first tick: 0 rows; committed at Identify, held through Save, then one release.
  const e=open(world());record(e);mode(e);mode(e);untilFinished(e);
  take(drive(e,s=>answerRecordIdentify(s,'cancel')));
  expect(e.doc).toMatchObject({lease:{phase:'committed'},data:{origin:'memory',rowCount:0}});
  take(drive(e,closeRecordProperties));take(drive(e,s=>answerRecordSave(s,'no')));
  expect(e.requests.filter(r=>r.kind==='commit'||r.kind==='release'||r.kind==='open-analysis').map(r=>r.kind)).toEqual(['commit','release','open-analysis']);
  expect(e.doc.lease).toBeNull();
 });
 it('Cancel keeps the header name; "No Data" is accepted; Save Cancel stays without opening the analysis',()=>{
  const w=finished();take(drive(w,s=>editRecordIdentify(s,'changed')));take(drive(w,s=>answerRecordIdentify(s,'cancel')));
  expect(w.doc.data).toMatchObject({name:'B2358+38'});
  take(drive(w,closeRecordProperties));take(drive(w,s=>answerRecordSave(s,'cancel')));expect(w.opened).toBe(0);
  const v=finished();take(drive(v,s=>editRecordIdentify(s,'No Data')));take(drive(v,s=>answerRecordIdentify(s,'ok')));
  expect(v.doc.data).toMatchObject({name:'No Data'});
 });
 it('the memory recording has exactly the honest fields: no bytes, file name, lexemes or line ending; samples equal the rows',()=>{
  const w=finished();const capture=w.s.record.finish!.capture;take(drive(w,s=>answerRecordIdentify(s,'ok')));
  const m=w.doc.data;if(!isMemoryData(m))throw new Error('not memory');
  expect(Object.keys(m).sort()).toEqual(['aperture','captureId','frequencies','full','gains','highestIndex','interval','name','origin','rowCount','samples','source','start']);
  expect(m.source).toBe('radio-receiver-model');expect(m.samples).toBeInstanceOf(Float64Array);
  [...m.samples].forEach((v,i)=>expect(Object.is(v,capture.rows[i])).toBe(true));
  expect(pulsarDataSaved(m)).toBe(false);
 });
});

// R-RX16 (docs/RADIO-RECORD-SAVE.md): [S] E1 0x5758bb Yes calls the Save wrapper, whose normal return reaches the separate erase
// prompt 0x5758d5; [W] the Radio Save dialog, its continuation rules and the verified-receipt gate are web policy. The read-back
// bytes are synthetic stand-ins for a browser read-back (the claim's own bytes, or one flipped byte), not native writer output.
describe('R-RX16 arming Save Yes: Radio-owned dialog, verified receipt gate, explicit erase',()=>{
 /** Unsaved memory data (a committed, released capture that the R-RX14 builder accepts) and an open main receiver. */
 const memory=():PulsarMemoryRecording=>pulsarMemoryRecording({captureId:9,name:'PSR TEST',aperture:100,highestIndex:0,frequencies:[400.125,null,null],gains:[1.125,null,null],
  start:50000.125,interval:0.015625,rows:[1.125,-2.625,0,0,2.5,3.75],full:false});
 const unsaved=()=>{
  const m=memory(),w=open(world(createRadioReceiverSession(),{...INITIAL_PULSAR_CURRENT_DATA,generation:3,data:m}));
  record(w);expect(w.s.record.prompt).toEqual({kind:'unsaved',generation:3});
  return {w,m};
 };
 const savePrompt=(w:World):RadioRecordSave=>{const p=w.s.record.prompt;if(p?.kind!=='save')throw new Error('no save prompt');return p.save;};
 const step=(w:World,f:(x:RadioRecordSave)=>RadioRecordSave)=>take(drive(w,s=>stepRecordSave(s,f)));
 /** The component's path for one attempt: begin and claims, picker started, a read-back committed (or not), cleanup, settled. */
 function attempt(w:World,token:number,readback:'equal'|'flipped'|'none'){
  const begun=radioRecordSaveBegin(savePrompt(w),w.doc);if(begun.kind!=='claim')throw new Error('refused');
  w.doc=claimPulsarOutput(w.doc,'radio',token).doc;
  step(w,x=>radioRecordSaveStarted(x,token));
  let committed=false;
  if(readback!=='none'){
   const bytes=pulsarClaimBytes(begun.claim);if(readback==='flipped')bytes[0]^=1;
   const r=recordPulsarWrittenCopy(w.doc,begun.claim,bytes,'copy.PLR');w.doc=r.doc;committed=r.ok;
   step(w,x=>radioRecordSaveNoticed(x,token,r.ok?{code:'verified',fileName:'copy.PLR'}:{code:'mismatch',fileName:'copy.PLR',reason:r.reason}));
  }else step(w,x=>radioRecordSaveNoticed(x,token,{code:'picker-cancelled',fileName:null}));
  w.doc=releasePulsarOutput(w.doc,'radio',token).doc;
  step(w,x=>radioRecordSaveSettled(x,token));
  return {committed,byteLength:begun.claim.text.length};
 }

 it('Yes opens the Save dialog with the byte armed and no host request; every receiver action and every prompt answer is refused',()=>{
  const {w,m}=unsaved(),before=w.requests.length;
  const t=drive(w,s=>openRecordSave(s,w.doc));
  expect(t.outcome).toMatchObject({kind:'ok',action:'record-save-open'});
  const save=savePrompt(w);
  expect(w.s.record.prompt).toMatchObject({kind:'save',generation:3});expect(save).toMatchObject({attempt:null,abandoned:false,session:{purpose:'save',generation:3}});
  expect(save.session.data).toBe(m);
  expect(w.s.bank.recording.armed).toBe(true);expect(recordDialogOpen(w.s)).toBe(true);expect(receiverBoxRefusal(w.s)).toBe('record-dialog-open');
  expect(w.requests.length).toBe(before);expect(w.doc.data).toBe(m);expect(w.doc.generation).toBe(3);expect(w.doc.lease).toBeNull();
  for(const r of [toggleReceiverMode(w.s,{jd:JD,now:now()}),addReceiverWindow(w.s),requestReceiverClose(w.s,0),stepReceiver(w.s,0,'vertical','up'),pressRecord(w.s,snap(w))])
   expect(r.outcome).toMatchObject({kind:'web-refused',reason:'record-dialog-open'});
  for(const a of ['no','ok','cancel'] as const){
   const r=answerRecordPrompt(w.s,a,snap(w));
   expect(r.outcome).toMatchObject({kind:'web-refused',action:'record-prompt',reason:'record-input'});expect(r.session).toBe(w.s);expect(r.host).toBeUndefined();
  }
  // A second Yes and a completeRecordArming are refused unchanged.
  expect(openRecordSave(w.s,w.doc).outcome).toMatchObject({kind:'web-refused',reason:'record-input'});
  expect(completeRecordArming(w.s,{ok:false,reason:'superseded'}).outcome).toMatchObject({kind:'web-refused',reason:'record-input'});
 });

 it('a stale Yes (the dataset changed after the press) ends Record with the refresh: nothing erased, no host request, no dialog',()=>{
  const {w}=unsaved(),before=w.requests.length;
  w.doc=importPulsarRecording(w.doc,plr('LATER'),w.doc.generation).doc;
  const t=drive(w,s=>openRecordSave(s,w.doc));
  expect(t.outcome).toMatchObject({kind:'web-refused',action:'record-save-open',reason:'record-superseded'});
  expect(t.outcome.kind==='web-refused'&&t.changed).toBe(true);
  expect(w.s.record.prompt).toBeNull();expect(w.s.bank.recording.armed).toBe(false);expect(main(w).recordLabel).toBe('Off');
  expect(pulsarDataRows(w.doc.data)).toBe(3);expect(w.doc.lease).toBeNull();expect(w.requests.length).toBe(before);
  // Without an unsaved prompt Yes is not an action.
  expect(openRecordSave(w.s,w.doc).outcome).toMatchObject({kind:'web-refused',reason:'record-input'});
 });

 it('Back is refused while an attempt is pending (also abandoned) and returns to the unsaved prompt with the same generation afterwards',()=>{
  const {w,m}=unsaved();drive(w,s=>openRecordSave(s,w.doc));
  const begun=radioRecordSaveBegin(savePrompt(w),w.doc);if(begun.kind!=='claim')throw new Error('refused');
  w.doc=claimPulsarOutput(w.doc,'radio',5).doc;step(w,x=>radioRecordSaveStarted(x,5));
  const held=w.s;
  expect(leaveRecordSave(w.s,{kind:'back'},snap(w)).outcome).toMatchObject({kind:'web-refused',action:'record-save-exit',reason:'record-input'});
  step(w,radioRecordSaveAbandoned);expect(savePrompt(w)).toMatchObject({attempt:5,abandoned:true,session:{save:{code:'abandoned'}}});
  expect(leaveRecordSave(w.s,{kind:'back'},snap(w)).outcome).toMatchObject({kind:'web-refused',reason:'record-input'});
  expect(held.record.prompt?.kind).toBe('save');
  // The dead attempt's later notice is ignored; its cleanup settles and releases only its own claim.
  expect(stepRecordSave(w.s,x=>radioRecordSaveNoticed(x,5,{code:'verified',fileName:'late.PLR'})).changed).toBe(false);
  w.doc=releasePulsarOutput(w.doc,'radio',5).doc;step(w,x=>radioRecordSaveSettled(x,5));expect(pulsarOutputClaim(w.doc)).toBeNull();
  const back=drive(w,s=>leaveRecordSave(s,{kind:'back'},snap(w)));
  expect(back.outcome).toMatchObject({kind:'ok',action:'record-save-exit'});expect(back.host).toBeUndefined();
  expect(w.s.record.prompt).toEqual({kind:'unsaved',generation:3});expect(w.s.bank.recording.armed).toBe(true);
  // From the unsaved prompt again: No → erase, Cancel keeps everything.
  drive(w,s=>answerRecordPrompt(s,'no',snap(w)));expect(w.s.record.prompt).toEqual({kind:'erase',generation:3});
  drive(w,s=>answerRecordPrompt(s,'cancel',snap(w)));
  expect(w.s.bank.recording.armed).toBe(false);expect(w.doc.data).toBe(m);expect(w.doc.written).toBeNull();expect(w.doc.generation).toBe(3);
 });

 it("'verified' without a receipt (or for another generation) is refused and changes nothing",()=>{
  const {w}=unsaved();drive(w,s=>openRecordSave(s,w.doc));
  const before=w.s;
  for(const sn of [snap(w),{...snap(w),saved:true,generation:4}]){
   const r=leaveRecordSave(w.s,{kind:'verified',fileName:'x.PLR',byteLength:10},sn);
   expect(r.outcome).toMatchObject({kind:'web-refused',reason:'record-input'});expect(r.session).toBe(before);expect(r.host).toBeUndefined();
  }
 });

 it('claim → write → equal read-back → receipt → the erase prompt with the verified note and no acquire; OK then clears and drops the receipt',()=>{
  const {w,m}=unsaved();drive(w,s=>openRecordSave(s,w.doc));
  const before=w.requests.length;
  const a=attempt(w,1,'equal');
  expect(a.committed).toBe(true);expect(pulsarWrittenCopy(w.doc)?.fileName).toBe('copy.PLR');expect(pulsarOutputClaim(w.doc)).toBeNull();
  expect(w.doc.data).toBe(m);expect(w.doc.generation).toBe(3);expect(w.doc.lease).toBeNull();
  const t=drive(w,s=>leaveRecordSave(s,{kind:'verified',fileName:'copy.PLR',byteLength:a.byteLength},snap(w)));
  expect(t.outcome).toMatchObject({kind:'ok',action:'record-save-exit'});expect(t.host).toBeUndefined();
  expect(w.s.record.prompt).toEqual({kind:'erase',generation:3,verified:{fileName:'copy.PLR',byteLength:a.byteLength}});
  expect(w.requests.length).toBe(before);expect(w.s.bank.recording.armed).toBe(true);
  // The erase still needs its own OK, which re-checks generation, activity and lease.
  drive(w,s=>answerRecordPrompt(s,'ok',snap(w)));
  expect(w.requests.slice(before).map(r=>r.kind)).toEqual(['acquire']);
  expect(w.doc.generation).toBe(4);expect(w.doc.data).toEqual({origin:'cleared',header:pulsarHeaderCells(m)});
  expect(w.doc.written).toBeNull();expect(pulsarCurrentSaved(w.doc)).toBe(false);expect(w.doc.lease).toEqual({id:1,phase:'armed'});
  expect(w.s.bank.recording.armed).toBe(true);expect(main(w).recordLabel).toBe('On');
 });

 it('after a verified Save, erase Cancel keeps the data and the receipt (Record off); the next press asks only the erase question',()=>{
  const {w,m}=unsaved();drive(w,s=>openRecordSave(s,w.doc));
  const a=attempt(w,1,'equal');drive(w,s=>leaveRecordSave(s,{kind:'verified',fileName:'copy.PLR',byteLength:a.byteLength},snap(w)));
  const t=drive(w,s=>answerRecordPrompt(s,'cancel',snap(w)));
  expect(t.outcome.kind==='ok'&&t.outcome.events.some(e=>e.kind==='beam')).toBe(true);
  expect(w.s.bank.recording.armed).toBe(false);expect(main(w).recordLabel).toBe('Off');
  expect(w.doc.data).toBe(m);expect(pulsarWrittenCopy(w.doc)?.fileName).toBe('copy.PLR');expect(w.doc.lease).toBeNull();
  record(w);expect(w.s.record.prompt).toEqual({kind:'erase',generation:3});
  drive(w,s=>answerRecordPrompt(s,'cancel',snap(w)));expect(pulsarWrittenCopy(w.doc)?.fileName).toBe('copy.PLR');
 });

 it('a Load while the verified erase question waits: the note gate hides the note (origin kept); OK is refused superseded and nothing is erased',()=>{
  const {w}=unsaved();drive(w,s=>openRecordSave(s,w.doc));
  const a=attempt(w,1,'equal');drive(w,s=>leaveRecordSave(s,{kind:'verified',fileName:'copy.PLR',byteLength:a.byteLength},snap(w)));
  const erasePrompt=()=>{const p=w.s.record.prompt;if(p?.kind!=='erase')throw new Error('no erase prompt');return p;};
  expect(radioRecordEraseNote(erasePrompt().verified,erasePrompt().generation,w.doc)).toEqual({fileName:'copy.PLR',byteLength:a.byteLength});
  w.doc=importPulsarRecording(w.doc,plr('LATER'),w.doc.generation).doc;
  const later=w.doc.data,generation=w.doc.generation,before=w.requests.length;
  expect(radioRecordEraseNote(erasePrompt().verified,erasePrompt().generation,w.doc)).toBeNull();
  // The prompt still records how it was reached (the presentation keeps Cancel as the web default).
  expect(erasePrompt()).toEqual({kind:'erase',generation:3,verified:{fileName:'copy.PLR',byteLength:a.byteLength}});
  const t=drive(w,s=>answerRecordPrompt(s,'ok',snap(w)));
  expect(t.outcome).toMatchObject({kind:'web-refused',action:'record-arming',reason:'record-superseded'});
  expect(w.requests.slice(before).map(r=>r.kind)).toEqual(['acquire']);
  expect(w.s.bank.recording.armed).toBe(false);expect(main(w).recordLabel).toBe('Off');expect(w.s.record.prompt).toBeNull();
  expect(w.doc.data).toBe(later);expect(w.doc.generation).toBe(generation);expect(w.doc.lease).toBeNull();expect(pulsarDataRows(w.doc.data)).toBe(3);
 });

 it('no deadlock: an open analysis dialog does not block the Save, but the erase OK is refused analysis-busy with the receipt kept',()=>{
  const {w,m}=unsaved();drive(w,s=>openRecordSave(s,w.doc));
  w.doc=setPulsarAnalysisActivity(w.doc,{modal:true,reading:false}).doc;
  const a=attempt(w,1,'equal');expect(a.committed).toBe(true);
  drive(w,s=>leaveRecordSave(s,{kind:'verified',fileName:'copy.PLR',byteLength:a.byteLength},snap(w)));
  expect(w.s.record.prompt?.kind).toBe('erase');
  const t=drive(w,s=>answerRecordPrompt(s,'ok',snap(w)));
  expect(t.outcome).toMatchObject({kind:'web-refused',reason:'record-analysis-busy'});
  expect(w.s.bank.recording.armed).toBe(false);expect(w.doc.data).toBe(m);expect(w.doc.generation).toBe(3);expect(w.doc.lease).toBeNull();
  expect(pulsarWrittenCopy(w.doc)?.fileName).toBe('copy.PLR');
  w.doc=setPulsarAnalysisActivity(w.doc,{modal:false,reading:false}).doc;
  record(w);expect(w.s.record.prompt).toEqual({kind:'erase',generation:3});
  drive(w,s=>answerRecordPrompt(s,'ok',snap(w)));expect(w.doc.generation).toBe(4);expect(w.doc.written).toBeNull();
 });

 it('cancelled and mismatched attempts stay in the dialog: no host request, no receipt, generation and data unchanged',()=>{
  const {w,m}=unsaved();drive(w,s=>openRecordSave(s,w.doc));
  const before=w.requests.length;
  attempt(w,1,'none');
  expect(savePrompt(w)).toMatchObject({attempt:null,session:{save:{code:'picker-cancelled'}}});
  const b=attempt(w,2,'flipped');
  expect(b.committed).toBe(false);expect(savePrompt(w)).toMatchObject({attempt:null,session:{save:{code:'mismatch',reason:'readback-bytes'}}});
  expect(w.s.record.prompt?.kind).toBe('save');expect(w.requests.length).toBe(before);
  expect(w.doc.data).toBe(m);expect(w.doc.generation).toBe(3);expect(w.doc.written).toBeNull();expect(pulsarOutputClaim(w.doc)).toBeNull();
  expect(leaveRecordSave(w.s,{kind:'verified',fileName:'copy.PLR',byteLength:b.byteLength},snap(w)).outcome).toMatchObject({kind:'web-refused'});
  expect(w.s.bank.recording.armed).toBe(true);
 });

 it('the arming Save is not the finish Save: at the finish question openRecordSave and a yes answer are refused without host requests',()=>{
  const w=open(world());record(w);mode(w);for(let i=0;i<10;i++)tick(w);mode(w);untilFinished(w);
  take(drive(w,s=>answerRecordIdentify(s,'ok')));take(drive(w,closeRecordProperties));
  const before=w.requests.length;
  const r=answerRecordSave(w.s,'yes' as 'no');
  expect(r.outcome).toMatchObject({kind:'web-refused',reason:'record-input'});expect(r.host).toBeUndefined();
  expect(openRecordSave(w.s,w.doc).outcome).toMatchObject({kind:'web-refused',reason:'record-input'});
  expect(w.doc.lease).toEqual({id:1,phase:'committed'});expect(w.requests.length).toBe(before);
 });
});

// R-RX17 (docs/RADIO-FINISH-SAVE.md): [S] E4-YES 0x573d47..0x573d59, Yes of the finish question calls the Save wrapper and its
// normal return has no success test; [W] the finish Save dialog, its lease-object binding, its continuation and the verified
// gate are web policy (stricter than the native normal return). The read-back bytes are the claim's own bytes or one flipped
// byte, synthetic stand-ins for a browser read-back, not native writer output.
describe('R-RX17 finish Save Yes: Radio-owned dialog under the committed lease; only a verified receipt ends the finish',()=>{
 /** A receiver capture committed through Identify OK and Properties: the finish Save question, lease 1 committed. */
 const question=()=>{
  const w=open(world());record(w);mode(w);for(let i=0;i<10;i++)tick(w);mode(w);untilFinished(w);
  take(drive(w,s=>answerRecordIdentify(s,'ok')));take(drive(w,closeRecordProperties));
  expect(w.s.record.finish?.stage).toBe('save');expect(w.doc.lease).toEqual({id:1,phase:'committed'});
  return w;
 };
 const fileSave=(w:World)=>{const f=w.s.record.finish;if(f?.stage!=='save-file'||!f.save||!f.lease)throw new Error('no finish save dialog');return {save:f.save,lease:f.lease};};
 const opened=()=>{
  const w=question();take(drive(w,s=>openFinishSave(s,w.doc)));
  // The simulated capture must pass the R-RX14 build, or every Choose below would be a build refusal.
  expect(fileSave(w).save.session.preview.ok).toBe(true);
  return w;
 };
 const step=(w:World,f:(x:RadioRecordSave)=>RadioRecordSave)=>take(drive(w,s=>stepFinishSave(s,f)));
 /** The component's path for one attempt: begin and claims, picker started, a read-back committed (or not), cleanup, settled. */
 function attempt(w:World,token:number,readback:'equal'|'flipped'|'none'){
  const {save,lease}=fileSave(w),begun=radioFinishSaveBegin(save,lease,w.doc);if(begun.kind!=='claim')throw new Error('refused');
  w.doc=claimPulsarOutput(w.doc,'radio',token).doc;
  step(w,x=>radioRecordSaveStarted(x,token));
  let committed=false;
  if(readback!=='none'){
   const bytes=pulsarClaimBytes(begun.claim);if(readback==='flipped')bytes[0]^=1;
   const r=recordPulsarFinishWrittenCopy(w.doc,begun.claim,{lease,outputToken:token},bytes,'finish.PLR');w.doc=r.doc;committed=r.ok;
   step(w,x=>radioRecordSaveNoticed(x,token,r.ok?{code:'verified',fileName:'finish.PLR'}:{code:'mismatch',fileName:'finish.PLR',reason:r.reason}));
  }else step(w,x=>radioRecordSaveNoticed(x,token,{code:'picker-cancelled',fileName:null}));
  w.doc=releasePulsarOutput(w.doc,'radio',token).doc;
  step(w,x=>radioRecordSaveSettled(x,token));
  return {committed,claim:begun.claim,lease,byteLength:begun.claim.text.length};
 }

 it('Yes opens the dialog with no host request and the lease object kept; the answers, receiver actions and imports are refused',()=>{
  const w=question(),lease=w.doc.lease,data=w.doc.data,before=w.requests.length;
  const t=drive(w,s=>openFinishSave(s,w.doc));
  expect(t.outcome).toMatchObject({kind:'ok',action:'record-finish-save-open'});expect(t.host).toBeUndefined();
  const {save,lease:kept}=fileSave(w);
  expect(kept).toBe(lease);expect(save).toMatchObject({attempt:null,abandoned:false,session:{purpose:'save',generation:w.doc.generation}});expect(save.session.data).toBe(data);
  expect(w.requests.length).toBe(before);expect(w.doc.lease).toBe(lease);expect(w.s.record.leaseId).toBe(1);expect(recordDialogOpen(w.s)).toBe(true);
  for(const a of ['no','cancel'] as const){const r=answerRecordSave(w.s,a);expect(r.outcome).toMatchObject({kind:'web-refused',reason:'record-input'});expect(r.host).toBeUndefined();}
  expect(openFinishSave(w.s,w.doc).outcome).toMatchObject({kind:'web-refused',action:'record-finish-save-open',reason:'record-input'});
  expect(answerRecordSave(w.s,'yes' as 'no').outcome).toMatchObject({kind:'web-refused',reason:'record-input'});
  for(const r of [toggleReceiverMode(w.s,{jd:JD,now:now()}),addReceiverWindow(w.s),requestReceiverClose(w.s,0),pressRecord(w.s,snap(w))])
   expect(r.outcome).toMatchObject({kind:'web-refused',reason:'record-dialog-open'});
  expect(importPulsarRecording(w.doc,plr('DURING-FINISH-SAVE'),w.doc.generation)).toMatchObject({ok:false,reason:'capture-lease'});
 });

 it('Yes is refused, changing nothing, when the document no longer holds this committed capture',()=>{
  const w=question(),s=w.s;
  for(const doc of [releasePulsarCaptureLease(w.doc,1).doc,{...w.doc,data:plr()},INITIAL_PULSAR_CURRENT_DATA]){
   const r=openFinishSave(s,doc);expect(r.outcome).toMatchObject({kind:'web-refused',reason:'record-input'});expect(r.session).toBe(s);expect(r.host).toBeUndefined();
  }
 });

 it('Back is refused while an attempt is pending (also abandoned); afterwards the question returns with the lease, then No or Cancel release once',()=>{
  for(const answer of ['no','cancel'] as const){
   const w=opened(),{save,lease}=fileSave(w);
   const begun=radioFinishSaveBegin(save,lease,w.doc);if(begun.kind!=='claim')throw new Error('refused');
   w.doc=claimPulsarOutput(w.doc,'radio',5).doc;step(w,x=>radioRecordSaveStarted(x,5));
   expect(leaveFinishSave(w.s,{kind:'back'}).outcome).toMatchObject({kind:'web-refused',action:'record-finish-save-exit',reason:'record-input'});
   step(w,radioRecordSaveAbandoned);expect(fileSave(w).save).toMatchObject({attempt:5,abandoned:true,session:{save:{code:'abandoned'}}});
   expect(fileSave(w).lease).toBe(lease);
   expect(leaveFinishSave(w.s,{kind:'back'}).outcome).toMatchObject({kind:'web-refused'});
   // The dead attempt's late notice and another token's settlement change nothing; its own cleanup settles it.
   expect(stepFinishSave(w.s,x=>radioRecordSaveNoticed(x,5,{code:'verified',fileName:'late.PLR'})).changed).toBe(false);
   expect(stepFinishSave(w.s,x=>radioRecordSaveSettled(x,4)).changed).toBe(false);
   w.doc=releasePulsarOutput(w.doc,'radio',5).doc;step(w,x=>radioRecordSaveSettled(x,5));
   const before=w.requests.length,back=drive(w,s=>leaveFinishSave(s,{kind:'back'}));
   expect(back.outcome).toMatchObject({kind:'ok',action:'record-finish-save-exit'});expect(back.host).toBeUndefined();
   const f=w.s.record.finish!;
   expect(f.stage).toBe('save');expect(f.save).toBeUndefined();expect(f.lease).toBeUndefined();expect(f.committed).toBe(true);
   expect(w.doc.lease).toBe(lease);expect(w.doc.written).toBeNull();expect(w.s.record.leaseId).toBe(1);
   take(drive(w,s=>answerRecordSave(s,answer)));
   expect(w.requests.slice(before).map(r=>r.kind)).toEqual(answer==='no'?['release','open-analysis']:['release']);
   expect(w.doc.lease).toBeNull();expect(w.opened).toBe(answer==='no'?1:0);expect(pulsarCurrentSaved(w.doc)).toBe(false);
  }
 });

 it('claim → write → equal read-back → receipt → the verified exit: one release only, no analysis, the same data object, saved',()=>{
  const w=opened(),data=w.doc.data,generation=w.doc.generation,bank=w.s.bank,before=w.requests.length;
  const a=attempt(w,1,'equal');
  expect(a.committed).toBe(true);expect(pulsarWrittenCopy(w.doc)?.fileName).toBe('finish.PLR');expect(pulsarOutputClaim(w.doc)).toBeNull();
  // The receipt alone releases nothing: the lease is still held until the session's exit asks for its release.
  expect(w.doc.lease).toBe(a.lease);expect(w.requests.length).toBe(before);
  const t=drive(w,s=>leaveFinishSave(s,{kind:'verified',fileName:'finish.PLR',byteLength:a.byteLength},w.doc));
  expect(t.outcome).toMatchObject({kind:'ok',action:'record-finish-save-exit'});
  expect(w.requests.slice(before)).toEqual([{kind:'release',id:1}]);expect(w.opened).toBe(0);
  expect(w.s.record.finish).toBeNull();expect(w.s.record.leaseId).toBeNull();expect(w.s.bank).toBe(bank);
  expect(w.doc.lease).toBeNull();expect(w.doc.data).toBe(data);expect(w.doc.generation).toBe(generation);expect(isMemoryData(w.doc.data)).toBe(true);
  expect(pulsarCurrentSaved(w.doc)).toBe(true);expect(pulsarWrittenCopy(w.doc)?.byteLength).toBe(a.byteLength);
  // A repeated exit makes no host request; the next Record asks only the erase question, and Load would be admitted.
  const again=leaveFinishSave(w.s,{kind:'verified',fileName:'finish.PLR',byteLength:a.byteLength},w.doc);
  expect(again.outcome).toMatchObject({kind:'web-refused',reason:'record-input'});expect(again.host).toBeUndefined();
  expect(importPulsarRecording(w.doc,plr('AFTER'),generation).ok).toBe(true);
  record(w);expect(w.s.record.prompt).toEqual({kind:'erase',generation});
  expect(w.requests.slice(before).map(r=>r.kind)).toEqual(['release']);
 });

 it('cancelled and mismatched attempts stay in the dialog with the lease; a verified exit without a receipt is refused',()=>{
  const w=opened(),lease=fileSave(w).lease,before=w.requests.length;
  attempt(w,1,'none');expect(fileSave(w).save).toMatchObject({attempt:null,session:{save:{code:'picker-cancelled'}}});
  const b=attempt(w,2,'flipped');
  expect(b.committed).toBe(false);expect(fileSave(w).save).toMatchObject({attempt:null,session:{save:{code:'mismatch',reason:'readback-bytes'}}});
  expect(w.doc.written).toBeNull();expect(w.doc.lease).toBe(lease);expect(w.requests.length).toBe(before);
  const r=leaveFinishSave(w.s,{kind:'verified',fileName:'finish.PLR',byteLength:b.byteLength},w.doc);
  expect(r.outcome).toMatchObject({kind:'web-refused',reason:'record-input'});expect(r.host).toBeUndefined();
  expect(leaveFinishSave(w.s,{kind:'verified',fileName:'finish.PLR',byteLength:b.byteLength}).outcome).toMatchObject({kind:'web-refused'});
  // A later equal attempt still verifies in the same dialog.
  const c=attempt(w,3,'equal');expect(c.committed).toBe(true);
  take(drive(w,s=>leaveFinishSave(s,{kind:'verified',fileName:'finish.PLR',byteLength:c.byteLength},w.doc)));
  expect(w.requests.slice(before).map(r=>r.kind)).toEqual(['release']);
 });

 it('hostile RECEIPT → EXIT: an equal-valued lease substituted after the receipt opens no exit and nothing is released',()=>{
  const w=opened(),before=w.requests.length;
  const a=attempt(w,1,'equal');expect(a.committed).toBe(true);
  const substitute=Object.freeze({id:1,phase:'committed' as const});
  const forged={...w.doc,lease:substitute};
  expect(pulsarWrittenCopy(forged)?.fileName).toBe('finish.PLR');// the receipt itself is still current
  const r=leaveFinishSave(w.s,{kind:'verified',fileName:'finish.PLR',byteLength:a.byteLength},forged);
  expect(r.outcome).toMatchObject({kind:'web-refused',reason:'record-input'});expect(r.host).toBeUndefined();expect(r.session).toBe(w.s);
  expect(w.requests.length).toBe(before);
 });

 it('a late callback after the lease is gone (the unmount disposal path, pure): the old claim records nothing',()=>{
  // Pure witness of the ownership rule only: the presentation's unmount teardown itself has no App or browser witness.
  const w=opened(),{save,lease}=fileSave(w);
  const begun=radioFinishSaveBegin(save,lease,w.doc);if(begun.kind!=='claim')throw new Error('refused');
  w.doc=claimPulsarOutput(w.doc,'radio',7).doc;
  w.doc=releasePulsarCaptureLease(w.doc,1).doc;// what the disposal requests for the session's own lease id
  const late=recordPulsarFinishWrittenCopy(w.doc,begun.claim,{lease,outputToken:7},pulsarClaimBytes(begun.claim),'late.PLR');
  expect(late).toMatchObject({ok:false,reason:'capture-lease'});expect(late.doc.written).toBeNull();
  expect(pulsarOutputClaim(w.doc)).toEqual({owner:'radio',token:7});// held until that attempt's own cleanup releases it
 });
});
