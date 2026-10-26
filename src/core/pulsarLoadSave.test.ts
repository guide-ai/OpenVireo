import {describe,expect,it} from 'vitest';
import {admitPlrRecording,type PlrRecording} from './pulsarRecording';
import {
 INITIAL_PULSAR_CURRENT_DATA,acquirePulsarCaptureLease,claimPulsarOutput,commitPulsarCapture,importPulsarRecording,pulsarClaimBytes,pulsarCurrentSaved,pulsarMemoryRecording,
 pulsarWriteClaim,pulsarWrittenCopy,recordPulsarWrittenCopy,releasePulsarCaptureLease,setPulsarCapturePhase,
 type PulsarCaptureInput,type PulsarCurrentData,type PulsarMemoryRecording,
} from './pulsarCurrentData';
import {
 INITIAL_PULSAR_ANALYSIS,pulsarActivateData,pulsarAnnouncement,pulsarAnswerLoad,pulsarAnswerLoadSave,pulsarRequestLoad,type PulsarAnalysisState,
} from './pulsarAnalysis';
import {
 loadSaveAttempt,loadSaveChoiceCancelled,loadSaveChoose,loadSaveImport,loadSaveLive,loadSaveOpen,loadSaveReadLive,loadSaveReadOwned,loadSaveSelected,loadSaveVerified,
 type LoadSaveFlow,
} from './pulsarLoadSave';

// [W] synthetic vectors for the chosen R-RX18 web contract (docs/PULSAR-LOAD-SAVE.md). Memory captures are made-up model-shaped
// inputs, not CLEA observations; receipts are real ones issued by recordPulsarWrittenCopy from an owned claim and an equal
// read-back of a synthetic ASCII payload. Nothing here is a native oracle.
function plr(name='SYNTH'):PlrRecording{
 const a=admitPlrRecording(new TextEncoder().encode([`'${name}',25,1`,'400.00,1400.00,0','1.0,0,1.0','50000.5,0.01','0,10,0','1,10,0'].join('\r\n')+'\r\n'),'synthetic.plr');
 if(a.status!=='admitted')throw new Error(a.reason);return a.recording;
}
const capture=(o:Partial<PulsarCaptureInput>={}):PulsarMemoryRecording=>pulsarMemoryRecording({captureId:7,name:'B2358+38',aperture:100,highestIndex:1,
 frequencies:[600,700,null],gains:[1,2,null],start:58000.25,interval:0.01,rows:Array.from({length:30},(_,i)=>i%3===2?0:(i+1)/7),full:false,...o});
/** A committed and released capture (generation 1) presented by the analysis with the Load question open. */
function asking(o:Partial<PulsarCaptureInput>={}){
 const m=capture(o);
 const armed=acquirePulsarCaptureLease(INITIAL_PULSAR_CURRENT_DATA,7,0,false).doc;
 const committed=commitPulsarCapture(setPulsarCapturePhase(armed,7,'receiving').doc,7,m).doc;
 const doc=releasePulsarCaptureLease(committed,7).doc;
 const shown=pulsarActivateData(INITIAL_PULSAR_ANALYSIS,m).state;
 const s=pulsarRequestLoad(shown,doc.data,pulsarCurrentSaved(doc)).state;
 return {m,doc,s,committed};
}
/** A real receipt: owned claim, then an equal read-back of its bytes. */
function written(doc:PulsarCurrentData,fileName='copy.PLR'):PulsarCurrentData{
 const claim=pulsarWriteClaim(doc,'SYNTHETIC PAYLOAD\r\n');if(!claim)throw new Error('no claim');
 const step=recordPulsarWrittenCopy(doc,claim,pulsarClaimBytes(claim),fileName);if(!step.ok)throw new Error(step.reason);
 return step.doc;
}
function open(s:PulsarAnalysisState,doc:PulsarCurrentData,id=1):LoadSaveFlow{
 const r=loadSaveOpen(s,doc,doc.generation,'ok',id);if(!r.ok)throw new Error(r.reason);return r.flow;
}
/** Open, attempt 5, verified as copy.PLR: the ready flow and the document holding its receipt. */
function ready(o:Partial<PulsarCaptureInput>={}){
 const a=asking(o),f=open(a.s,a.doc),attempted=loadSaveAttempt(f,1,5)!,saved=written(a.doc);
 const r=loadSaveVerified(attempted,saved,1,5,'copy.PLR');if(!r)throw new Error('not ready');
 return {...a,saved,flow:r};
}

describe('E9 Yes transition (pulsarAnalysis)',()=>{
 it('Yes closes the question with load-save, never load-allowed; it is announced; No and Cancel are unchanged',()=>{
  const {s}=asking();
  expect(s.loadPrompt).toBe(true);
  const yes=pulsarAnswerLoadSave(s);
  expect(yes.outcome).toBe('load-save');expect(yes.state.loadPrompt).toBe(false);expect(yes.changed).toBe(true);
  expect(pulsarAnnouncement(null,yes)).toBe('load-save');
  expect(pulsarAnswerLoadSave(yes.state)).toMatchObject({outcome:'invalid-input',changed:false});
  expect(pulsarAnswerLoad(s,'no').outcome).toBe('load-allowed');expect(pulsarAnswerLoad(s,'cancel').outcome).toBe('load-cancelled');
  // Nothing else of the analysis state changes (same list, recording and view).
  expect({...yes.state,loadPrompt:true}).toEqual(s);
 });
});

describe('opening the flow (RX18-01, 02, 04)',()=>{
 it('opens only for the question on the current unsaved memory capture the panel presents, and grants nothing',()=>{
  const {s,doc,m}=asking();
  const r=loadSaveOpen(s,doc,1,'ok',3);
  expect(r.ok).toBe(true);
  if(!r.ok)return;
  expect(r.flow).toMatchObject({phase:'save',attempt:null,receipt:null,invocation:null});
  expect(r.flow.ctx).toEqual({flowId:3,generation:1,data:m});expect(r.flow.ctx.data).toBe(m);
  expect(Object.isFrozen(r.flow)).toBe(true);expect(Object.isFrozen(r.flow.ctx)).toBe(true);
  // No load selection is possible from a freshly opened flow.
  expect(loadSaveSelected(r.flow,doc,3,null,true)).toEqual({kind:'foreign'});
  expect(loadSaveChoose(r.flow,doc,3,1)).toMatchObject({ok:false,reason:'phase',end:false});
 });
 it('refuses, in order: bad id, unsupported, no question, stale data or generation, saved or non-memory data, lease or output claim',()=>{
  const {s,doc,committed}=asking();
  expect(loadSaveOpen(s,doc,1,'ok',0)).toEqual({ok:false,reason:'input'});
  expect(loadSaveOpen(s,doc,1,'ok',1.5)).toEqual({ok:false,reason:'input'});
  expect(loadSaveOpen(s,doc,1,'no-api',1)).toEqual({ok:false,reason:'unsupported'});
  expect(loadSaveOpen(s,doc,1,'insecure-context',1)).toEqual({ok:false,reason:'unsupported'});
  expect(loadSaveOpen({...s,loadPrompt:false},doc,1,'ok',1)).toEqual({ok:false,reason:'not-asking'});
  expect(loadSaveOpen({...s,recording:null},doc,1,'ok',1)).toEqual({ok:false,reason:'not-presented'});// e.g. a refused 'No Data' capture
  expect(loadSaveOpen(s,doc,0,'ok',1)).toEqual({ok:false,reason:'stale'});// the panel presents an older generation
  expect(loadSaveOpen(s,{...doc,data:capture()},1,'ok',1)).toEqual({ok:false,reason:'stale'});// same generation, another object
  expect(loadSaveOpen(s,written(doc),1,'ok',1)).toEqual({ok:false,reason:'not-memory'});// already saved: the question no longer applies
  const file=plr(),fileDoc=importPulsarRecording(doc,file,1).doc;
  expect(loadSaveOpen({...s,recording:file},fileDoc,2,'ok',1)).toEqual({ok:false,reason:'not-memory'});
  expect(loadSaveOpen(s,committed,1,'ok',1)).toEqual({ok:false,reason:'busy'});// committed lease of the same capture
  const claimed=claimPulsarOutput(doc,'radio',4).doc;
  expect(loadSaveOpen(s,claimed,1,'ok',1)).toEqual({ok:false,reason:'busy'});
 });
});

describe('Save → ready gate (RX18-07..12, 37)',()=>{
 it('only the flow\'s own attempt with a genuine current receipt of its data, generation and file name makes it ready',()=>{
  const {s,doc}=asking(),f=open(s,doc,2);
  expect(loadSaveAttempt(f,1,5)).toBeNull();expect(loadSaveAttempt(f,2,0)).toBeNull();
  const a=loadSaveAttempt(f,2,5)!;expect(a.attempt).toBe(5);expect(a.phase).toBe('save');
  // No receipt (a refused, cancelled or failed Save): never ready.
  expect(loadSaveVerified(a,doc,2,5,'copy.PLR')).toBeNull();
  const saved=written(doc);
  // A verified Save alone has no load grant: a flow without the attempt, another token, flow or name is refused.
  expect(loadSaveVerified(f,saved,2,5,'copy.PLR')).toBeNull();
  expect(loadSaveVerified(a,saved,2,6,'copy.PLR')).toBeNull();
  expect(loadSaveVerified(a,saved,1,5,'copy.PLR')).toBeNull();
  expect(loadSaveVerified(a,saved,2,5,'other.PLR')).toBeNull();
  // A spread copy of the receipt is not a receipt.
  expect(loadSaveVerified(a,{...saved,written:{...saved.written!} as typeof saved.written},2,5,'copy.PLR')).toBeNull();
  const r=loadSaveVerified(a,saved,2,5,'copy.PLR')!;
  expect(r.phase).toBe('ready');expect(r.receipt).toBe(pulsarWrittenCopy(saved));expect(Object.isFrozen(r)).toBe(true);
  // Once ready, a second verification is refused (phase).
  expect(loadSaveVerified(r,saved,2,5,'copy.PLR')).toBeNull();
 });
 it('a same-generation object swap, a newer generation and a lease are not live',()=>{
  const {s,doc}=asking(),a=loadSaveAttempt(open(s,doc),1,5)!,saved=written(doc);
  const swapped={...saved,data:capture()};
  expect(loadSaveLive(a,swapped)).toBe(false);expect(loadSaveVerified(a,swapped,1,5,'copy.PLR')).toBeNull();
  const newer=written({...doc,generation:doc.generation+1});
  expect(loadSaveVerified(a,newer,1,5,'copy.PLR')).toBeNull();
  const leased=acquirePulsarCaptureLease(saved,9,saved.generation,false).doc;
  expect(loadSaveLive(a,leased)).toBe(false);expect(loadSaveVerified(a,leased,1,5,'copy.PLR')).toBeNull();
 });
 it('a mutated sample or +0 → −0 revokes the receipt, so the flow cannot become ready',()=>{
  for(const [k,v] of [[0,99],[2,-0]] as const){
   const {s,doc,m}=asking(),a=loadSaveAttempt(open(s,doc),1,5)!,saved=written(doc);
   m.samples[k]=v;
   expect(pulsarWrittenCopy(saved)).toBeNull();expect(loadSaveVerified(a,saved,1,5,'copy.PLR')).toBeNull();
  }
 });
 it('a receipt from before the flow (revived by restoring the samples) never makes it ready',()=>{
  const {s,doc,m}=asking(),old=written(doc,'old.PLR'),before=m.samples[0];
  m.samples[0]=42;// the old receipt is no longer valid, so the question asks and the flow opens
  expect(pulsarCurrentSaved(old)).toBe(false);
  const a=loadSaveAttempt(open(s,old),1,5)!;
  m.samples[0]=before;// the same receipt object becomes valid again; it is not this attempt's
  expect(pulsarWrittenCopy(old)).toBe(old.written);
  expect(loadSaveVerified(a,old,1,5,'old.PLR')).toBeNull();
 });
});

describe('the dedicated choice: one-shot grant bound to (flowId, invocation) (RX18-15..20)',()=>{
 it('Choose → selection reads once with the flow generation; the same invocation cannot read twice',()=>{
  const {flow,saved}=ready();
  const c=loadSaveChoose(flow,saved,1,1);expect(c.ok).toBe(true);if(!c.ok)return;
  expect(c.flow).toMatchObject({phase:'choosing',invocation:1});
  const sel=loadSaveSelected(c.flow,saved,1,1,true);
  expect(sel.kind).toBe('read');if(sel.kind!=='read')return;
  expect(sel.generation).toBe(1);expect(sel.flow.phase).toBe('reading');
  expect(loadSaveSelected(sel.flow,saved,1,1,true)).toEqual({kind:'foreign'});
  expect(loadSaveReadLive(sel.flow,saved,1,1)).toBe(true);expect(loadSaveReadOwned(sel.flow,1,1)).toBe(true);
  expect(loadSaveReadLive(sel.flow,saved,1,2)).toBe(false);expect(loadSaveReadOwned(sel.flow,2,1)).toBe(false);expect(loadSaveReadOwned(null,1,1)).toBe(false);
 });
 it('an empty selection or the standard cancel consumes the grant; a late change of that invocation is then foreign',()=>{
  const {flow,saved}=ready();
  const c=loadSaveChoose(flow,saved,1,1);if(!c.ok)throw new Error();
  const empty=loadSaveSelected(c.flow,saved,1,1,false);
  expect(empty.kind).toBe('empty');if(empty.kind!=='empty')return;
  expect(empty.flow.phase).toBe('ready');expect(loadSaveSelected(empty.flow,saved,1,1,true)).toEqual({kind:'foreign'});
  const again=loadSaveChoose(empty.flow,saved,1,2);if(!again.ok)throw new Error();
  const cancelled=loadSaveChoiceCancelled(again.flow,1,2);
  expect(cancelled.phase).toBe('ready');
  // Written=true and the saved flag is set, yet the cancelled invocation cannot load.
  expect(pulsarCurrentSaved(saved)).toBe(true);
  expect(loadSaveSelected(cancelled,saved,1,2,true)).toEqual({kind:'foreign'});
  // A cancel of another invocation or flow changes nothing.
  expect(loadSaveChoiceCancelled(again.flow,1,1)).toBe(again.flow);expect(loadSaveChoiceCancelled(again.flow,2,2)).toBe(again.flow);
  expect(loadSaveChoiceCancelled(again.flow,1,null)).toBe(again.flow);
 });
 it('a newer invocation supersedes the older one; older invocations, flows and non-increasing invocations are refused',()=>{
  const {flow,saved}=ready();
  const one=loadSaveChoose(flow,saved,1,1);if(!one.ok)throw new Error();
  const two=loadSaveChoose(one.flow,saved,1,2);if(!two.ok)throw new Error();
  expect(loadSaveSelected(two.flow,saved,1,1,true)).toEqual({kind:'foreign'});// the old node's change
  expect(loadSaveSelected(two.flow,saved,1,1,false)).toEqual({kind:'foreign'});// and its empty change
  expect(loadSaveChoiceCancelled(two.flow,1,1)).toBe(two.flow);// and its cancel
  expect(loadSaveSelected(two.flow,saved,2,2,true)).toEqual({kind:'foreign'});// another flow id
  expect(loadSaveChoose(two.flow,saved,1,2)).toMatchObject({ok:false,reason:'input',end:false});
  expect(loadSaveChoose(two.flow,saved,1,1)).toMatchObject({ok:false,reason:'input',end:false});
  expect(loadSaveChoose(two.flow,saved,2,3)).toMatchObject({ok:false,reason:'phase',end:false});
  expect(loadSaveSelected(two.flow,saved,1,2,true).kind).toBe('read');
 });
 it('an import, a lease, a sample change or a held output claim stops Choose; a changed context ends a pending selection',()=>{
  const {flow,saved,m}=ready();
  const imported=importPulsarRecording(saved,plr(),saved.generation).doc;
  expect(loadSaveChoose(flow,imported,1,1)).toMatchObject({ok:false,reason:'stale',end:true});
  const leased=acquirePulsarCaptureLease(saved,9,saved.generation,false).doc;
  expect(loadSaveChoose(flow,leased,1,1)).toMatchObject({ok:false,reason:'stale',end:true});
  const claimed=claimPulsarOutput(saved,'analysis',8).doc;
  expect(loadSaveChoose(flow,claimed,1,1)).toMatchObject({ok:false,reason:'busy',end:false});
  // The receipt must be the identical object: another genuine receipt of the same data is not the flow's.
  expect(loadSaveChoose(flow,written(saved,'copy.PLR'),1,1)).toMatchObject({ok:false,reason:'stale',end:true});
  const c=loadSaveChoose(flow,saved,1,1);if(!c.ok)throw new Error();
  expect(loadSaveSelected(c.flow,imported,1,1,true)).toEqual({kind:'ended'});
  m.samples[0]=-1;
  expect(loadSaveSelected(c.flow,saved,1,1,true)).toEqual({kind:'ended'});
  expect(loadSaveChoose(flow,saved,1,1)).toMatchObject({ok:false,reason:'stale',end:true});
 });
});

describe('the flow import (RX18-22..29)',()=>{
 it('imports with the flow generation: file data, a new generation, no receipt; a dead read changes nothing',()=>{
  const {flow,saved}=ready();
  const c=loadSaveChoose(flow,saved,1,1);if(!c.ok)throw new Error();
  const sel=loadSaveSelected(c.flow,saved,1,1,true);if(sel.kind!=='read')throw new Error();
  const file=plr('LOADED');
  const ok=loadSaveImport(saved,sel.flow,1,1,file);
  expect(ok.ok).toBe(true);expect(ok.doc.data).toBe(file);expect(ok.doc.generation).toBe(saved.generation+1);
  expect(ok.doc.written).toBeNull();expect(pulsarWrittenCopy(ok.doc)).toBeNull();
  // Another invocation, a changed generation or a lease: refused, the document is returned unchanged.
  expect(loadSaveImport(saved,sel.flow,1,2,file)).toMatchObject({ok:false,reason:'superseded',doc:saved});
  const newer=importPulsarRecording(saved,plr('OTHER'),saved.generation).doc;
  expect(loadSaveImport(newer,sel.flow,1,1,file)).toMatchObject({ok:false,reason:'superseded',doc:newer});
  const leased=acquirePulsarCaptureLease(saved,9,saved.generation,false).doc;
  expect(loadSaveImport(leased,sel.flow,1,1,file)).toMatchObject({ok:false,reason:'capture-lease',doc:leased});
  // A ready (not reading) flow cannot import.
  expect(loadSaveImport(saved,flow,1,1,file)).toMatchObject({ok:false,doc:saved});
 });
});
