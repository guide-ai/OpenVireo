import {describe,expect,it} from 'vitest';
// Phase 1 item 1.5 contracts of the chosen web implementation (not oracles for the original). Every catalog record, capture
// and PLR below is SYNTHETIC test data, not a CLEA observation.
import {
 RADIO_INVESTIGATION_LIMITS,RadioInvestigationError,pendingWindowsAfterClose,pulsarAnalysisSnapshot,pulsarDataSnapshot,radioInvestigationJson,radioInvestigationText,radioWorkspaceSnapshot,
 readRadioInvestigation,rebuildRadioInvestigation,type RadioInvestigation,type RadioWorkspaceInput,type RadioWorkspaceSnapshot,
} from './radioInvestigation';
import {
 INITIAL_RADIO_CONTROL,clickRadioSwitch,closeRadioPanel,enterRadioPulsarsExercise,reopenRadioPanel,scopeTimerTick,selectRadioAccess,
 type RadioControlState,type RadioEnvironment,
} from './radioControl';
import {INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS,isRadioLabOptions,slewRateFor} from './radioAntenna';
import {INITIAL_RADIO_CLOCK_SCENARIO,radioClockSnapshot,startRadioClock} from './radioClock';
import {INITIAL_RADIO_DATE} from './radioDateDialog';
import {
 INITIAL_RADIO_ACCESS,applyCompiledOptionsBranch,applyDemonstrationGate,closePreferences,createRadioAccessState,editRadioOptionsFlag,isRadioOptionsFullRecord,okRadioSimulationOptions,
 openPreferences,openRadioOptions,radioOptionsCompiledRecord,
} from './radioAccessOptions';
import {INITIAL_PULSAR_REFERENCE,RECORDED_VIREO_PULSARS_DAT,type PulsarReferenceState} from './radioPulsarReferenceCatalog';
import type {PulsarRecord} from './radioPulsarCatalog';
import {createRadioReceiverSession,configureReceiverWindow,openReceiverWindow,restoredRadioReceiverSession,stepReceiver,type RadioReceiverSession} from './radioReceiverSession';
import {RADIO_RECEIVER_COMPILED_OPTIONS,receiverWindowConfiguration,type ReceiverWindowConfiguration} from './radioReceiver';
import {UNSUPPLIED_RADIO_ENVIRONMENT,startPulsarExercise} from './pulsarExerciseStart';
import {INITIAL_PULSAR_CURRENT_DATA,commitPulsarCapture,acquirePulsarCaptureLease,setPulsarCapturePhase,pulsarMemoryRecording,isMemoryData,type PulsarMemoryRecording} from './pulsarCurrentData';
import {
 INITIAL_PULSAR_ANALYSIS,pulsarActivateData,pulsarBeginRecord,pulsarConfirmRecord,pulsarEntryLine,pulsarPointer,pulsarRecordDraft,pulsarZoom,
 type PulsarAnalysisState,type PulsarEntryFields,type PulsarTransition,
} from './pulsarAnalysis';
import {PLR_MAX_ROWS,formatExponent,formatFixed} from './pulsarRecording';
import {encodeSessionNumber} from './sessionNumber';

const RECORD:PulsarRecord=Object.freeze({primaryName:'J9999+0000',legacyName:'SYN+00',ra:1.5,dec:-0,x2a:0.7,x34:1e-15,x3e:2450000,s48:Math.fround(20),s4c:Math.fround(26.7),
 s50:Math.fround(6.6),s54:Math.fround(1500),s58:Math.fround(800),s5c:Math.fround(200)});
const SUPPLIED:PulsarReferenceState=Object.freeze({...INITIAL_PULSAR_REFERENCE,catalog:Object.freeze([RECORD]),
 source:Object.freeze({name:'synthetic.dat',bytes:600,sha256:'1'.repeat(64),rows:1,recorded:false})});
const st=(t:PulsarTransition)=>t.state;
const ptr=(phase:'down'|'up',button:'left'|'right',x:number)=>({phase,button,x,y:60,leftHeld:false,rightHeld:false});
const click=(s:PulsarAnalysisState,ch:0|1|2,x:number,button:'left'|'right'='left')=>st(pulsarPointer(st(pulsarPointer(s,ch,ptr('down',button,x))),ch,ptr('up',button,x)));
/** Text of the radio part as the file holds it (pretty-printed JSON with the session number codec), parsed back. */
const asFile=(s:RadioInvestigation)=>JSON.parse(JSON.stringify(radioInvestigationJson(s),(_k,v)=>encodeSessionNumber(v),2));

function workspaceInput(over:Partial<RadioWorkspaceInput>={}):RadioWorkspaceInput{
 const started=startPulsarExercise({control:INITIAL_RADIO_CONTROL,environment:UNSUPPLIED_RADIO_ENVIRONMENT,antenna:INITIAL_RADIO_LAB,options:RADIO_COMPILED_OPTIONS,
  clock:INITIAL_RADIO_CLOCK_SCENARIO,managedDiameter:false});
 if(!started.ok)throw new Error(started.outcome);
 const antenna=started.antennaSteps.at(-1)!.state;
 let receivers:RadioReceiverSession=createRadioReceiverSession();
 receivers=openReceiverWindow(receivers,{catalog:SUPPLIED.catalog,pointing:antenna.pointing}).session;
 receivers=stepReceiver(receivers,0,'frequency','down').session;// 600 → 500 MHz
 const clock=startRadioClock(started.clock,1000).scenario;
 return {control:started.control,environment:started.environment,antenna:Object.freeze({...antenna,pointing:Object.freeze({ra:3.5,dec:54.5})}),options:RADIO_COMPILED_OPTIONS,
  clock:radioClockSnapshot(clock,61_500),date:Object.freeze({...INITIAL_RADIO_DATE,activationReached:true}),access:INITIAL_RADIO_ACCESS,receivers,
  pendingWindows:[null,null,null],reference:SUPPLIED,...over};
}
/** Save with these inputs, write the file, read it back strictly and rebuild it (throws on any refusal). */
function saveAndRestore(over:Partial<RadioWorkspaceInput>={}){
 const ws=radioWorkspaceSnapshot(workspaceInput(over));if(!ws.ok)throw new Error(ws.reason);
 const read=readRadioInvestigation(asFile({...investigation(),workspace:ws.snapshot}));
 return {saved:ws.snapshot,read,rebuilt:rebuildRadioInvestigation(read,{plr:null,recordedCatalog:null}).workspace!};
}
/** A valid file whose control state is replaced (the rest of the workspace is the Start workspace). */
const withControl=(control:RadioControlState)=>{const base=investigation();return asFile({...base,workspace:{...base.workspace!,control}});};
const rebuildFile=(v:unknown)=>rebuildRadioInvestigation(readRadioInvestigation(v),{plr:null,recordedCatalog:null});
/** Test-owned breadth-first closure of the exported control transitions under the 16 scenario environments (every dome byte,
 * access option byte and other-Window-items flag; diameter 100, the only dish the closure's radio captions use). */
const SCENARIO_ENVIRONMENTS:readonly RadioEnvironment[]=[0,1,2,3].flatMap(domeByte=>[false,true].flatMap(accessOptionByte=>[false,true].map(otherWindowItemsVisible=>
 Object.freeze({domeByte:domeByte as RadioEnvironment['domeByte'],accessOptionByte,dishDiameterMeters:100,otherWindowItemsVisible}))));
const controlKey=(c:RadioControlState)=>JSON.stringify(Object.entries(c).sort(([a],[b])=>a<b?-1:a>b?1:0));
function controlClosure():Map<string,RadioControlState>{
 const seen=new Map([[controlKey(INITIAL_RADIO_CONTROL),INITIAL_RADIO_CONTROL]]),queue=[INITIAL_RADIO_CONTROL];
 while(queue.length>0&&seen.size<1024){
  const s=queue.shift()!;
  const next=[enterRadioPulsarsExercise(s),reopenRadioPanel(s),...SCENARIO_ENVIRONMENTS.flatMap(e=>[selectRadioAccess(s,e),scopeTimerTick(s,e),clickRadioSwitch(s,e),closeRadioPanel(s,e)])];
  for(const tr of next){const k=controlKey(tr.state);if(!seen.has(k)){seen.set(k,tr.state);queue.push(tr.state);}}
 }
 return seen;
}
const IMMEDIATE:RadioEnvironment=Object.freeze({domeByte:1,accessOptionByte:true,dishDiameterMeters:100,otherWindowItemsVisible:false});
function capture(samples:readonly number[]):PulsarMemoryRecording{
 return pulsarMemoryRecording({captureId:4,name:'SYN+00',aperture:100,highestIndex:1,frequencies:[400,500,null],gains:[1,2,null],start:51544.5,interval:0.01,rows:samples,full:false});
}
function investigation(samples=[0.1,-0,5e-324,1.7976931348623157e308,-1.7976931348623157e308,2.5].concat(Array.from({length:600},(_,i)=>i%7))):RadioInvestigation{
 const ws=radioWorkspaceSnapshot(workspaceInput());if(!ws.ok)throw new Error(ws.reason);
 const data=capture(samples);
 let a=st(pulsarActivateData(INITIAL_PULSAR_ANALYSIS,data));
 a=click(click(a,0,40,'right'),0,120);
 a=st(pulsarConfirmRecord(st(pulsarRecordDraft(st(pulsarBeginRecord(a)),'P x3'))));
 a=st(pulsarZoom(a,'in'));
 const an=pulsarAnalysisSnapshot(a,true);if(!an.ok)throw new Error(an.reason);
 return Object.freeze({workspace:ws.snapshot,data:pulsarDataSnapshot(data),analysis:an.snapshot});
}

describe('Phase 1 item 1.5 radio investigation codec (strict, canonical, binary64-exact)',()=>{
 it('round-trips the workspace, the capture samples bit for bit (−0, subnormal, ±max, 0.1) and the analysis view',()=>{
  const s=investigation(),read=readRadioInvestigation(asFile(s));
  expect(radioInvestigationText(read)).toBe(radioInvestigationText(s));
  const original=s.data.kind==='memory'?s.data.samples:[],back=read.data.kind==='memory'?read.data.samples:[];
  expect(back).toHaveLength(original.length);
  for(let i=0;i<original.length;i++)expect(Object.is(back[i],original[i])).toBe(true);
  const rebuilt=rebuildRadioInvestigation(read,{plr:null,recordedCatalog:null});
  expect(isMemoryData(rebuilt.data)).toBe(true);
  const f=Float64Array.from(original);
  for(let i=0;i<f.length;i++)expect(Object.is((rebuilt.data as PulsarMemoryRecording).samples[i],f[i])).toBe(true);
  expect((rebuilt.data as PulsarMemoryRecording).frequencies).toEqual([400,500,null]);
  // Analysis: rows with a rebuilt candidate, the view of the presented capture, flags derived by the existing rules.
  const a=rebuilt.analysis.state;
  expect(rebuilt.analysis.presented).toBe(true);expect(a.recording).toBe(rebuilt.data);expect(a.list).toHaveLength(1);
  expect(a.list[0].fields.comment).toBe('P x3');expect(a.zoom).toBe(2);expect(a.reviewEnabled).toBe(true);expect(a.saveEnabled).toBe(true);
  expect(a.recordSession).toBeNull();expect(a.propertiesOpen).toBe(false);expect(a.leftDrag).toBe(false);
 });
 it('rebuilds a paused, idle Radio workspace by replaying the existing transitions',()=>{
  const s=investigation(),w=rebuildRadioInvestigation(readRadioInvestigation(asFile(s)),{plr:null,recordedCatalog:null}).workspace!;
  const input=workspaceInput();
  expect(w.control).toEqual(input.control);
  expect(w.antenna.activated).toBe(true);expect(w.antenna.tracking).toBe(true);expect(w.antenna.pointing).toEqual({ra:3.5,dec:54.5});expect(w.antenna.clock).toBeNull();
  expect(w.clock.running).toBe(false);expect(w.clock.anchorPerfMS).toBeNull();expect(w.clock.elapsedMS).toBe(60_500);expect(w.clock.utc).toBe('2000-01-01T12:00:00');
  // A supplied catalog is restored as its values only, never as the recorded original.
  expect(w.reference?.source).toMatchObject({recorded:false,valuesOnly:true,name:'synthetic.dat'});expect(w.reference?.catalog).toEqual([RECORD]);
  // Receivers start closed; the saved window settings wait for the learner's own Open.
  expect(w.receiverSession.bank.slots).toEqual([null,null,null]);expect(w.receiverSession.bank.timerEnabled).toBe(false);
  expect(w.receiverWindows[0]).toMatchObject({frequencyMHz:500,stepIndex:5});
 });
 it('applies restored window settings only after an explicit Open, without Randomize, Receive or Record',()=>{
  const restored=restoredRadioReceiverSession({seedText:'7',options:RADIO_RECEIVER_COMPILED_OPTIONS,sourceBuffer:{record:RECORD,primaryNameCleared:false}});
  expect(restored.bank.sourceBuffer.record).toEqual(RECORD);expect(restored.seed).toEqual({text:'7',base:7,used:0});
  const opened=openReceiverWindow(restored,{catalog:[RECORD],pointing:{ra:23,dec:-80}}).session;
  const before=opened.bank.random;
  const c=configureReceiverWindow(opened,0,{frequencyMHz:400,stepIndex:4,verticalGain:0.5,horizontal:8});
  expect(c.outcome.kind).toBe('ok');
  const r=c.session.bank.slots[0]!;
  expect([r.frequencyMHz,r.stepIndex,r.stepMHz,r.verticalGain,r.horizontal]).toEqual([400,4,10,0.5,8]);
  expect(c.session.bank.random).toBe(before);expect(c.session.bank.timerEnabled).toBe(false);expect(c.session.bank.recording.armed).toBe(false);
  expect(configureReceiverWindow(opened,0,{frequencyMHz:399,stepIndex:4,verticalGain:0.5,horizontal:8}).outcome.kind).toBe('refused');
  expect(configureReceiverWindow(opened,0,{frequencyMHz:400,stepIndex:4,verticalGain:0.3,horizontal:8}).outcome.kind).toBe('refused');
 });
 it('keeps a compiled-branch numeric authority (the applied 19-key record) and refuses a test-supplied profile',()=>{
  const branch=applyCompiledOptionsBranch(applyDemonstrationGate(INITIAL_RADIO_ACCESS).state,true,true).state;
  const ws=radioWorkspaceSnapshot(workspaceInput({access:branch}));
  expect(ws.ok).toBe(true);
  if(!ws.ok)return;
  const s={...investigation(),workspace:ws.snapshot},w=rebuildRadioInvestigation(readRadioInvestigation(asFile(s)),{plr:null,recordedCatalog:null}).workspace!;
  expect(w.access.authority).toEqual({kind:'compiled-branch',hostPredicate:true});expect(w.access.root).toEqual(radioOptionsCompiledRecord(true));
  expect(w.access.parent).toBeNull();expect(w.access.gate).toEqual({open:true,source:'demonstration'});
  const supplied=createRadioAccessState(radioOptionsCompiledRecord(false),{numericAuthority:'supplied'});
  expect(radioWorkspaceSnapshot(workspaceInput({access:supplied}))).toEqual({ok:false,reason:'radio-profile'});
 });
 it('refuses Save while Radio or analysis activity is unsafe, naming the activity',()=>{
  const i=workspaceInput();
  expect(radioWorkspaceSnapshot({...i,antenna:{...i.antenna,slewing:true}})).toEqual({ok:false,reason:'slewing'});
  expect(radioWorkspaceSnapshot({...i,antenna:{...i.antenna,notice:{kind:'slew-complete'}}})).toEqual({ok:false,reason:'radio-dialog'});
  expect(radioWorkspaceSnapshot({...i,reference:{...SUPPLIED,read:{token:3,name:'x'}}})).toEqual({ok:false,reason:'catalog-reading'});
  expect(radioWorkspaceSnapshot({...i,receivers:{...i.receivers,bank:{...i.receivers.bank,recording:{...i.receivers.bank.recording,armed:true}}}})).toEqual({ok:false,reason:'capture'});
  expect(radioWorkspaceSnapshot({...i,receivers:{...i.receivers,bank:{...i.receivers.bank,timerEnabled:true}}})).toEqual({ok:false,reason:'receiving'});
  const a=st(pulsarBeginRecord(click(st(pulsarActivateData(INITIAL_PULSAR_ANALYSIS,capture([1,2,3]))),0,10)));
  expect(pulsarAnalysisSnapshot(a,true)).toEqual({ok:false,reason:'analysis-dialog'});
  const tooMany={...INITIAL_PULSAR_ANALYSIS,list:Array(RADIO_INVESTIGATION_LIMITS.rows+1).fill(null)} as unknown as PulsarAnalysisState;
  expect(pulsarAnalysisSnapshot(tooMany,false)).toEqual({ok:false,reason:'size'});
 });
 it('rejects malformed, out-of-range, inconsistent or unreachable content as a whole',()=>{
  const good=asFile(investigation());
  const mutate:((v:any)=>void)[]=[
   v=>{v.extra=1;},v=>{delete v.analysis;},v=>{v.workspace.extra=1;},
   v=>{v.data.samples.push(1);},v=>{v.data.samples[0]='Infinity';},v=>{v.data.samples[0]=null;},v=>{v.data.interval=0;},v=>{v.data.frequencies[1]=null;},
   v=>{v.data.samples=Array(RADIO_INVESTIGATION_LIMITS.captureRows*3+3).fill(0);},
   v=>{v.analysis.list[0].sequence=0;},v=>{v.analysis.nextSequence=1;},v=>{v.analysis.list[0].panel=3;},v=>{v.analysis.list[0].fields.comment='a"b';},
   v=>{v.analysis.list=Array(RADIO_INVESTIGATION_LIMITS.rows+1).fill(v.analysis.list[0]);},
   v=>{v.analysis.view.zoom=3;},v=>{v.analysis.view.factors[1]=16;},v=>{v.analysis.view.panRate=5;},
   v=>{v.analysis.view.cursors[0].verticalText='9.999999';},v=>{v.analysis.view.referenceText='1.000000';},v=>{v.analysis.view.measurement.vertical[0]=0.5;},
   v=>{v.workspace.antenna.pointing.dec=91;},v=>{v.workspace.antenna.pointing.ra=24;},v=>{v.workspace.antenna.rateIndex=0;},
   v=>{v.workspace.clock.utc='2000-13-01T00:00:00';},v=>{v.workspace.clock.longitudeRadians=4;},v=>{v.workspace.clock.elapsedMS=-1;},
   v=>{v.workspace.date.activationReached=false;},v=>{v.workspace.date.storedId='x'.repeat(19);},
   v=>{v.workspace.options.rateBase=51;},
   v=>{v.workspace.access.root.extra=1;},v=>{v.workspace.access.gate.open=true;},
   v=>{v.workspace.receivers.windows[0].verticalGain=3;},v=>{v.workspace.receivers.windows=[null,v.workspace.receivers.windows[0],null];},
   v=>{v.workspace.catalog.records[0].s48=0.1;},v=>{v.workspace.catalog.rows=2;},
   v=>{v.workspace.catalog={kind:'recorded',name:'Pulsars.dat',bytes:RECORDED_VIREO_PULSARS_DAT.bytes,sha256:'f'.repeat(64),rows:RECORDED_VIREO_PULSARS_DAT.rows};},
  ];
  for(const change of mutate){const v=structuredClone(good);change(v);expect(()=>rebuildRadioInvestigation(readRadioInvestigation(v),{plr:null,recordedCatalog:null}),String(change)).toThrow();}
  // A control state the transitions cannot reach from the saved inputs is refused at rebuild (no unrecovered state).
  const v=structuredClone(good);v.workspace.control.radioPanelShown=false;
  expect(()=>rebuildRadioInvestigation(readRadioInvestigation(v),{plr:null,recordedCatalog:null})).toThrow();
  expect(()=>rebuildRadioInvestigation(readRadioInvestigation(good),{plr:null,recordedCatalog:null})).not.toThrow();
 });
 it('a supplied catalog that claims the recorded SHA-256 is still restored as supplied values, never as the recorded original',()=>{
  const claim:PulsarReferenceState={...SUPPLIED,source:{name:'Pulsars.dat',bytes:RECORDED_VIREO_PULSARS_DAT.bytes,sha256:RECORDED_VIREO_PULSARS_DAT.sha256,rows:1,recorded:false}};
  const ws=radioWorkspaceSnapshot(workspaceInput({reference:claim}));if(!ws.ok)throw new Error(ws.reason);
  expect(ws.snapshot.catalog?.kind).toBe('supplied');
  const s={...investigation(),workspace:ws.snapshot},w=rebuildRadioInvestigation(readRadioInvestigation(asFile(s)),{plr:null,recordedCatalog:null}).workspace!;
  expect(w.reference?.source).toMatchObject({recorded:false,valuesOnly:true,sha256:RECORDED_VIREO_PULSARS_DAT.sha256});
 });
 it('a recorded catalog keeps its identity only; the rebuild needs the re-fetched catalog with the recorded row count',()=>{
  const recorded:PulsarReferenceState={...SUPPLIED,source:{name:'Pulsars.dat',bytes:RECORDED_VIREO_PULSARS_DAT.bytes,sha256:RECORDED_VIREO_PULSARS_DAT.sha256,rows:RECORDED_VIREO_PULSARS_DAT.rows,recorded:true}};
  const ws=radioWorkspaceSnapshot(workspaceInput({reference:recorded}));if(!ws.ok)throw new Error(ws.reason);
  expect(ws.snapshot.catalog).toEqual({kind:'recorded',name:'Pulsars.dat',bytes:285692,sha256:RECORDED_VIREO_PULSARS_DAT.sha256,rows:558});
  const s=readRadioInvestigation(asFile({...investigation(),workspace:ws.snapshot}));
  expect(rebuildRadioInvestigation(s,{plr:null,recordedCatalog:null}).workspace?.reference).toBeNull();
  expect(()=>rebuildRadioInvestigation(s,{plr:null,recordedCatalog:[RECORD]})).toThrow();
  const full=Array(558).fill(RECORD);
  expect(rebuildRadioInvestigation(s,{plr:null,recordedCatalog:full}).workspace?.reference?.source).toMatchObject({recorded:true,rows:558});
 });
 it('keeps absent header cells null and cleared or empty data without a view',()=>{
  const lease=acquirePulsarCaptureLease(INITIAL_PULSAR_CURRENT_DATA,1,0,false).doc;
  const committed=commitPulsarCapture(setPulsarCapturePhase(lease,1,'receiving').doc,1,capture([1,2,3])).doc;
  const cleared=acquirePulsarCaptureLease({...committed,lease:null},2,committed.generation,true).doc.data;
  const s:RadioInvestigation={workspace:null,data:pulsarDataSnapshot(cleared),analysis:{list:[],nextSequence:1,listSaved:false,view:null}};
  const back=readRadioInvestigation(asFile(s));
  expect(back.data).toEqual({kind:'cleared',header:{name:'SYN+00',aperture:100,highestIndex:1,frequencies:[400,500,null],gains:[1,2,null],start:51544.5,interval:0.01}});
  expect(rebuildRadioInvestigation(back,{plr:null,recordedCatalog:null}).data).toMatchObject({origin:'cleared'});
  const withView=investigation(),v=asFile(withView);v.data={kind:'none'};
  expect(()=>readRadioInvestigation(v)).toThrow();
 });
 it('admits every number text the existing row formatters write, in rows of any recording, and keeps it exactly',()=>{
  const good=asFile(investigation()),row=good.analysis.list[0],MAX=Number.MAX_VALUE;
  // The shapes are the formatters' own outputs: a rounded zero without '-', toFixed's exponent form at ≥ 1e21, ±max, the
  // subnormal minimum and the one exponent text Number overflows ('1.7977E+308').
  expect([formatFixed(-0.004,2),formatFixed(1e21,6),formatExponent(MAX,5,2),formatExponent(5e-324,5,2)]).toEqual(['0.00','1e+21','1.7977E+308','4.9407E-324']);
  const legit:readonly Partial<PulsarEntryFields>[]=[
   {frequency:formatFixed(-0.004,2),gain:formatFixed(5e-324,3),reference:null,vertical:null,horizontal:null,points:'1',aperture:'0',file:null},
   {frequency:formatFixed(MAX,2),gain:formatFixed(-1e6,3),reference:formatFixed(1e-9,6),vertical:formatFixed(-MAX,6),horizontal:formatExponent(MAX,5,2),
    start:formatFixed(-1e7,8),intervalMs:formatFixed(1e-9*1000,2),points:String(PLR_MAX_ROWS),aperture:'65535',file:'run "2", 400 MHz.PLR'},
   {reference:formatFixed(1e21,6),vertical:formatFixed(-123.4567891,6),horizontal:formatExponent(-MAX,5,2),points:String(RADIO_INVESTIGATION_LIMITS.captureRows)},
   {horizontal:formatExponent(5e-324,5,2)},{horizontal:formatExponent(-0.00123,5,2)},{horizontal:formatExponent(999.995,5,2),start:formatFixed(51544.123456789,8)},
  ];
  for(const l of legit){
   // A row of an EARLIER recording (other object, panel above the current capture's receivers) next to the current one.
   const fields={...row.fields,object:'EARLIER',...l},v=structuredClone(good);
   v.analysis.list.push({sequence:row.sequence+1,panel:2,fields});v.analysis.nextSequence=row.sequence+2;
   const read=readRadioInvestigation(v);
   expect(read.analysis?.list[1].fields,JSON.stringify(l)).toEqual(fields);
   expect(read.analysis?.list[0].fields).toEqual(row.fields);
   expect(radioInvestigationText(readRadioInvestigation(asFile(read)))).toBe(radioInvestigationText(read));
   const restored=rebuildRadioInvestigation(read,{plr:null,recordedCatalog:null}).analysis.state.list;
   expect(restored).toHaveLength(2);expect(restored[1].nativeLineCandidate).toBe(pulsarEntryLine(fields));
  }
 });
 it('refuses malformed, nonfinite or noncanonical number text and out-of-bounds counts in a confirmed row',()=>{
  const good=asFile(investigation());
  expect(()=>readRadioInvestigation(good)).not.toThrow();
  const pointsMax=Math.max(PLR_MAX_ROWS,RADIO_INVESTIGATION_LIMITS.captureRows);
  const malformed:Readonly<Record<keyof PulsarEntryFields,readonly unknown[]>>={
   frequency:['not-a-number','','400','400.0','400.000',' 400.00','400.00 ','+400.00','-0.00','4e2','0x190','Infinity','-Infinity','NaN','1e+400',400,null],
   gain:['1.00','1.0000','not-a-number','Infinity',null],
   reference:['not-a-number','','1.5','-0.000000','Infinity',0.5],
   vertical:['0.5','NaN','1e+400',0.5],
   horizontal:['not-a-number','','1.2346e+02','1.2346E+2','1.23460E+02','12.346E+01','+1.2346E+02','0.0000E+00','-0.0000E+00','1.7978E+308','Infinity','NaN',123.46],
   start:['51544.5','not-a-number','Infinity',null],
   intervalMs:['10','10.000','-Infinity',null],
   points:['not-a-number','','0','01','+1','-1','1.0','1e3',' 1',String(pointsMax+1),'Infinity',1,null],
   aperture:['not-a-number','','-0','-1','007','1.5','65536','Infinity',100,null],
   object:[],comment:[],file:[],
  };
  for(const [key,values] of Object.entries(malformed))for(const bad of values){
   const v=structuredClone(good);v.analysis.list[0].fields[key]=bad;
   expect(()=>readRadioInvestigation(v),`${key}=${JSON.stringify(bad)}`).toThrow(RadioInvestigationError);
  }
 });
});

describe('Phase 1 item 1.5 corrective contracts: control admission, unopened window settings, applied slew rate',()=>{
 it('admits ordinary environment edits made after access and rebuilds the saved control and environment exactly (F1)',()=>{
  const start=workspaceInput(),env=start.environment;
  // Diameter 64 or cleared after Start: the caption keeps the diameter it was written with (100).
  for(const dishDiameterMeters of [64,null]){
   const {rebuilt}=saveAndRestore({environment:{...env,dishDiameterMeters}});
   expect(rebuilt.control).toEqual(start.control);expect(rebuilt.control.idCaption).toEqual({kind:'radio',diameterMeters:100});
   expect(rebuilt.environment).toEqual({...env,dishDiameterMeters});
  }
  // The other-Window-items flag toggled after a close: the menu flag keeps the value of the close.
  const closed=closeRadioPanel(start.control,{...env,otherWindowItemsVisible:true}).state;
  expect(closed.windowMenuEnabled).toBe(true);
  const c=saveAndRestore({control:closed,environment:{...env,otherWindowItemsVisible:false}}).rebuilt;
  expect(c.control).toEqual(closed);expect(c.environment.otherWindowItemsVisible).toBe(false);
  // Immediate access (option on, dome 1), switch on, then dome 0.
  let ctl=enterRadioPulsarsExercise(INITIAL_RADIO_CONTROL).state;
  ctl=selectRadioAccess(ctl,IMMEDIATE).state;expect(ctl.radioScopeByte).toBe(3);expect(ctl.scopeTimerIntervalMs).toBeNull();
  ctl=clickRadioSwitch(ctl,IMMEDIATE).state;expect(ctl.radioPanelShown).toBe(true);
  const d=saveAndRestore({control:ctl,environment:{...IMMEDIATE,domeByte:0}}).rebuilt;
  expect(d.control).toEqual(ctl);expect(d.environment).toEqual({...IMMEDIATE,domeByte:0});
  // Under a numeric authority the environment diameter is the record's aperture: 200 after access.
  const branch=applyCompiledOptionsBranch(applyDemonstrationGate(INITIAL_RADIO_ACCESS).state,true,true).state;
  const e=saveAndRestore({access:branch,environment:{...env,dishDiameterMeters:200}}).rebuilt;
  expect(e.control).toEqual(start.control);expect(e.environment.dishDiameterMeters).toBe(200);
 });
 it('admits every state of the bounded transition closure and rebuilds it exactly (F1 search bound)',()=>{
  const closure=controlClosure();
  expect(closure.size).toBeLessThan(1024);
  expect(closure.has(controlKey(workspaceInput().control))).toBe(true);
  for(const state of closure.values())expect(rebuildFile(withControl(state)).workspace!.control,controlKey(state)).toEqual(state);
 });
 it('still refuses control combinations the transitions cannot reach, atomically at rebuild (F1)',()=>{
  const closure=controlClosure(),start=workspaceInput().control;
  const entered=enterRadioPulsarsExercise(INITIAL_RADIO_CONTROL).state;
  const unreachable:readonly RadioControlState[]=[
   {...start,radioScopeByte:4},// a radio caption with scope byte 4
   {...entered,scopeTimerIntervalMs:1},// interval 1 without any request
   {...start,radioWinVisible:false},// panel shown with the window item hidden
   {...start,idCaption:{kind:'radio-request',literalAddress:'0x58c440'}},// a request caption after access
   {...start,radioPanelShown:false},
  ];
  for(const state of unreachable){
   expect(closure.has(controlKey(state)),controlKey(state)).toBe(false);
   const v=withControl(state);
   expect(()=>readRadioInvestigation(v)).not.toThrow();// the shape is valid; only the replay refuses it
   expect(()=>rebuildFile(v),controlKey(state)).toThrow(RadioInvestigationError);
  }
  expect(()=>rebuildFile(withControl(entered))).not.toThrow();
  // Shape refusals are unchanged: unknown keys and wrong types.
  for(const change of [(c:any)=>{c.extra=true;},(c:any)=>{c.radioPanelShown='yes';},(c:any)=>{c.idCaption={kind:'radio',diameterMeters:1.5};}]){
   const v=withControl(start);change(v.workspace.control);expect(()=>readRadioInvestigation(v)).toThrow();
  }
 });
 it('stores unopened restored window settings next to open ones and discards them only by the close policy (F2)',()=>{
  const i=workspaceInput(),live=receiverWindowConfiguration(i.receivers.bank.slots[0]!);
  expect(live.frequencyMHz).toBe(500);
  const c600:ReceiverWindowConfiguration={...live,frequencyMHz:600},c400:ReceiverWindowConfiguration={...live,frequencyMHz:400};
  // Live 500 in window 1 plus the pending restored 600 of window 2.
  const merged=radioWorkspaceSnapshot({...i,pendingWindows:[null,c600,null]});
  expect(merged.ok&&merged.snapshot.receivers.windows).toEqual([live,c600,null]);
  // Pending only (straight from a restore, nothing opened): kept unchanged.
  const fresh=radioWorkspaceSnapshot({...i,receivers:createRadioReceiverSession(),pendingWindows:[c400,c600,null]});
  expect(fresh.ok&&fresh.snapshot.receivers.windows).toEqual([c400,c600,null]);
  // A gap or an overlap is refused (defensive: the host never produces either).
  expect(radioWorkspaceSnapshot({...i,receivers:createRadioReceiverSession(),pendingWindows:[null,null,c600]})).toEqual({ok:false,reason:'radio-profile'});
  expect(radioWorkspaceSnapshot({...i,pendingWindows:[c400,null,null]})).toEqual({ok:false,reason:'radio-profile'});
  // The merged settings survive the file and are offered again by the rebuild.
  const {rebuilt}=saveAndRestore({pendingWindows:[null,c600,null]});
  expect(rebuilt.receiverWindows).toEqual([live,c600,null]);expect(rebuilt.receiverSession.bank.slots).toEqual([null,null,null]);
  // Close policy: the closed window's pending settings and every later one are dropped.
  const p=[c400,c600,live] as const;
  expect(pendingWindowsAfterClose(p,0)).toEqual([null,null,null]);
  expect(pendingWindowsAfterClose(p,1)).toEqual([c400,null,null]);
  expect(pendingWindowsAfterClose(p,2)).toEqual([c400,c600,null]);
  const unchanged=[c400,null,null] as const;expect(pendingWindowsAfterClose(unchanged,1)).toBe(unchanged);
  expect(()=>pendingWindowsAfterClose(p,3)).toThrow();
 });
 it('builds the merged snapshot purely: the same session object, random state and seed use, no timer (F2)',()=>{
  const i=workspaceInput(),c600:ReceiverWindowConfiguration={...receiverWindowConfiguration(i.receivers.bank.slots[0]!),frequencyMHz:600};
  const session=i.receivers,random=session.bank.random,used=session.seed.used,slots=session.bank.slots;
  const a=radioWorkspaceSnapshot({...i,pendingWindows:[null,c600,null]}),b=radioWorkspaceSnapshot({...i,pendingWindows:[null,c600,null]});
  expect(a.ok&&b.ok).toBe(true);
  if(!a.ok||!b.ok)return;
  expect(radioInvestigationText({workspace:a.snapshot,data:{kind:'none'},analysis:null})).toBe(radioInvestigationText({workspace:b.snapshot,data:{kind:'none'},analysis:null}));
  expect(i.receivers).toBe(session);expect(session.bank.random).toBe(random);expect(session.seed.used).toBe(used);expect(session.bank.slots).toBe(slots);
  expect(session.bank.timerEnabled).toBe(false);expect(session.bank.recording.armed).toBe(false);
 });
 it('keeps the actual applied slew rate under a numeric authority and refuses a rate no Int32 base gives (F3)',()=>{
  const branch=applyCompiledOptionsBranch(applyDemonstrationGate(INITIAL_RADIO_ACCESS).state,true,true).state;
  const base60={...RADIO_COMPILED_OPTIONS,rateBase:60};
  // Activated under base 50 (rate 500 at index 4); the base then changed to 60 without touching the rate.
  const {saved,read,rebuilt}=saveAndRestore({access:branch,options:base60});
  expect(saved.antenna.rate).toBe(500);expect(read.workspace!.antenna.rate).toBe(500);
  expect(rebuilt.antenna.rate).toBe(500);expect(rebuilt.antenna.rateIndex).toBe(4);expect(rebuilt.options.rateBase).toBe(60);
  expect(slewRateFor(rebuilt.antenna.rateIndex-1,rebuilt.options)).toBe(60);// the next press computes from the restored options
  const branchFile=asFile({...investigation(),workspace:saved}),plainFile=asFile(investigation());
  const refused:readonly [unknown,(v:any)=>void][]=[
   [plainFile,v=>{v.workspace.antenna.rate=600;}],// no numeric authority: must be the current options' rate
   [branchFile,v=>{v.workspace.antenna.rate=505;}],// base 50.5 is not an Int32
   [branchFile,v=>{v.workspace.antenna.rate='NaN';}],[branchFile,v=>{v.workspace.antenna.rate='Infinity';}],
   [plainFile,v=>{delete v.workspace.antenna.rate;}],// a file without the rate key (earlier unpublished v23 candidate)
   [plainFile,v=>{v.workspace.antenna.rate=null;}],
  ];
  for(const [file,change] of refused){const v=structuredClone(file);change(v);expect(()=>readRadioInvestigation(v),String(change)).toThrow();}
  // An inactive antenna keeps the DFM +0 rate exactly: −0 or any other value is refused.
  const inactive=radioWorkspaceSnapshot(workspaceInput({antenna:INITIAL_RADIO_LAB}));if(!inactive.ok)throw new Error(inactive.reason);
  const inactiveFile=(rate:number)=>asFile({...investigation(),workspace:{...inactive.snapshot,antenna:{...inactive.snapshot.antenna,rate}} as RadioWorkspaceSnapshot});
  expect(Object.is(readRadioInvestigation(inactiveFile(0)).workspace!.antenna.rate,0)).toBe(true);
  for(const rate of [-0,1,500])expect(()=>readRadioInvestigation(inactiveFile(rate)),String(rate)).toThrow(RadioInvestigationError);
 });
 it('admits only producible rate indices, positive applied rates and saved maxima 4 or 5, refusing the file as a whole (N1)',()=>{
  const branch=applyCompiledOptionsBranch(applyDemonstrationGate(INITIAL_RADIO_ACCESS).state,true,true).state;
  // Preferences ▸ Radio... with Fast Slewing off, OK, then Preferences OK: the applied record maximum becomes 4.
  const ok=okRadioSimulationOptions(editRadioOptionsFlag(openRadioOptions(openPreferences(branch,null).state).state,'fastSlewing',false).state);
  expect(ok.outcome).toBe('radio-ok');
  const max4=closePreferences(ok.state,'ok').state;
  expect(max4.root.maxRateIndex93b).toBe(4);expect(max4.env.maxRateIndex93b).toBe(4);
  // Index 5 (rate 5000) set under the compiled maximum 5 is kept after the maximum is lowered to 4.
  const start=workspaceInput(),rate5=slewRateFor(5,RADIO_COMPILED_OPTIONS);
  expect(rate5).toBe(5000);
  const kept=saveAndRestore({access:max4,options:{...RADIO_COMPILED_OPTIONS,maxRateIndex:4},antenna:{...start.antenna,rateIndex:5,rate:rate5}});
  expect(kept.read.workspace!.antenna).toMatchObject({rateIndex:5,rate:5000});
  expect(kept.rebuilt.antenna.rateIndex).toBe(5);expect(kept.rebuilt.antenna.rate).toBe(5000);
  expect(kept.rebuilt.options.maxRateIndex).toBe(4);expect(kept.rebuilt.access.root.maxRateIndex93b).toBe(4);
  // The actual rate 500 at index 4 is kept after Base Slew Rate 50 → 60.
  const base60=saveAndRestore({access:branch,options:{...RADIO_COMPILED_OPTIONS,rateBase:60}}).rebuilt;
  expect(base60.antenna.rate).toBe(500);expect(base60.antenna.rateIndex).toBe(4);expect(base60.options.rateBase).toBe(60);
  // The refused values below are shape-valid natively; only the saved-session domain excludes them.
  expect(isRadioLabOptions({...RADIO_COMPILED_OPTIONS,maxRateIndex:6})).toBe(true);
  expect(isRadioOptionsFullRecord({...radioOptionsCompiledRecord(true),maxRateIndex93b:6})).toBe(true);
  expect(slewRateFor(6,RADIO_COMPILED_OPTIONS)).toBe(50000);
  const branchFile=asFile({...investigation(),workspace:saveAndRestore({access:branch}).saved}),plainFile=asFile(investigation());
  expect(()=>rebuildFile(branchFile)).not.toThrow();expect(()=>rebuildFile(plainFile)).not.toThrow();
  const refused:readonly [string,unknown,(v:any)=>void][]=[
   ['branch rate 0',branchFile,v=>{v.workspace.antenna.rate=0;}],
   ['branch rate −0',branchFile,v=>{v.workspace.antenna.rate=encodeSessionNumber(-0);}],
   ['branch rate −500',branchFile,v=>{v.workspace.antenna.rate=-500;}],
   ['no authority index 6 / rate 50000',plainFile,v=>{v.workspace.antenna.rateIndex=6;v.workspace.antenna.rate=50000;}],
   ['branch index 6 / rate 50000',branchFile,v=>{v.workspace.antenna.rateIndex=6;v.workspace.antenna.rate=50000;}],
   ['branch options maximum 6',branchFile,v=>{v.workspace.options.maxRateIndex=6;}],
   ['branch options maximum 3',branchFile,v=>{v.workspace.options.maxRateIndex=3;}],
   ['branch root maximum 6',branchFile,v=>{v.workspace.access.root.maxRateIndex93b=6;}],
   ['branch env maximum 6',branchFile,v=>{v.workspace.access.env.maxRateIndex93b=6;}],
   ['branch root and env maximum 6',branchFile,v=>{v.workspace.access.root.maxRateIndex93b=6;v.workspace.access.env.maxRateIndex93b=6;}],
  ];
  for(const [name,file,change] of refused){
   const v=structuredClone(file),before=JSON.stringify(file);change(v);
   expect(()=>readRadioInvestigation(v),name).toThrow(RadioInvestigationError);
   expect(()=>rebuildFile(v),name).toThrow(RadioInvestigationError);
   expect(JSON.stringify(file),name).toBe(before);
  }
 });
});
