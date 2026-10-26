import {describe,expect,it} from 'vitest';
import {admitPlrRecording,type PlrRecording} from './pulsarRecording';
import {
 EMPTY_PULSAR_HEADER,INITIAL_PULSAR_CURRENT_DATA,PULSAR_DATA_NOT_WRITTEN,PULSAR_SAVE_NAME_MAX,acquirePulsarCaptureLease,claimPulsarOutput,commitPulsarCapture,importPulsarRecording,isMemoryData,
 pulsarClaimBytes,pulsarClaimReadback,pulsarCurrentSaved,pulsarDataFileName,pulsarDataPresentation,pulsarDataProperties,pulsarDataRows,pulsarDataSaved,pulsarFrequencyText,
 pulsarHeaderCells,pulsarMemoryRecording,pulsarOutputClaim,pulsarSaveNameOk,pulsarWriteClaim,pulsarWrittenCopy,recordPulsarWrittenCopy,releasePulsarCaptureLease,releasePulsarOutput,setPulsarAnalysisActivity,
 setPulsarCapturePhase,type PulsarCaptureInput,type PulsarCurrentData,type PulsarMemoryRecording,type PulsarWriteClaim,type PulsarWriteRefusal,type PulsarWrittenCopy,
} from './pulsarCurrentData';
import {buildPulsarRawExport} from './pulsarRawExport';
import {
 INITIAL_PULSAR_ANALYSIS,PULSAR_BASES,pulsarActivateData,pulsarAnswerLoad,pulsarBeginRecord,pulsarConfirmRecord,pulsarFactor,pulsarLoad,pulsarModalOpen,pulsarPointer,
 pulsarRequestLoad,pulsarTrace,type PulsarAnalysisState,type PulsarPointer,type PulsarTransition,
} from './pulsarAnalysis';
import {pulsarReviewOpen} from './pulsarReview';
import {pulsarEditorParse,pulsarReviewEditConfirm,pulsarReviewEditDraft,pulsarReviewEditSupport,pulsarReviewRequestEdit} from './pulsarReviewEdit';

// [W] synthetic vectors for the chosen R-RX4 contracts (docs/RADIO-RECEIVER-RECORD.md); memory captures here are made-up
// model-shaped inputs, not CLEA observations or native oracles.
function plr(name='SYNTH'):PlrRecording{
 const a=admitPlrRecording(new TextEncoder().encode([`'${name}',25,1`,'400.00,1400.00,0','1.0,0,1.0','50000.5,0.01','0,10,0','1,10,0'].join('\r\n')+'\r\n'),'synthetic.plr');
 if(a.status!=='admitted')throw new Error(a.reason);return a.recording;
}
const capture=(o:Partial<PulsarCaptureInput>={}):PulsarMemoryRecording=>pulsarMemoryRecording({captureId:7,name:'B2358+38',aperture:100,highestIndex:1,
 frequencies:[600,700,null],gains:[1,2,null],start:58000.25,interval:0.01,rows:Array.from({length:30},(_,i)=>i%3===2?0:(i+1)/7),full:false,...o});
const st=(t:PulsarTransition)=>t.state;
const ptr=(phase:PulsarPointer['phase'],button:PulsarPointer['button'],x:number,y=100):PulsarPointer=>({phase,button,x,y,leftHeld:false,rightHeld:false});
const click=(s:PulsarAnalysisState,ch:0|1|2,x:number,y=100,button:'left'|'right'='left')=>st(pulsarPointer(st(pulsarPointer(s,ch,ptr('down',button,x,y))),ch,ptr('up',button,x,y)));

describe('one current dataset: generation, lease and refusals (WEB-REC-OWNER/TXN)',()=>{
 it('an import commits only at its read-start generation and never under a capture lease',()=>{
  const file=plr();
  const a=importPulsarRecording(INITIAL_PULSAR_CURRENT_DATA,file,0);
  expect(a.ok).toBe(true);expect(a.doc.generation).toBe(1);expect(a.doc.data).toBe(file);
  expect(importPulsarRecording(a.doc,plr('LATE'),0)).toMatchObject({ok:false,reason:'superseded'});
  const leased=acquirePulsarCaptureLease(a.doc,1,1,false);
  expect(leased.doc.lease).toEqual({id:1,phase:'armed'});expect(leased.doc.data).toBe(file);
  const late=importPulsarRecording(leased.doc,plr('LATE'),1);
  expect(late).toMatchObject({ok:false,reason:'capture-lease'});expect(late.doc).toBe(leased.doc);
 });
 it('acquire refuses a held lease, a busy analysis and a stale generation; erase clears rows, flags and keeps the header cells',()=>{
  const file=plr(),d=importPulsarRecording(INITIAL_PULSAR_CURRENT_DATA,file,0).doc;
  expect(acquirePulsarCaptureLease(setPulsarAnalysisActivity(d,{modal:true,reading:false}).doc,1,1,true)).toMatchObject({ok:false,reason:'analysis-busy'});
  expect(acquirePulsarCaptureLease(setPulsarAnalysisActivity(d,{modal:false,reading:true}).doc,1,1,true)).toMatchObject({ok:false,reason:'analysis-busy'});
  expect(acquirePulsarCaptureLease(d,1,0,true)).toMatchObject({ok:false,reason:'superseded'});
  const e=acquirePulsarCaptureLease(d,1,1,true);
  expect(e.doc.generation).toBe(2);expect(pulsarDataRows(e.doc.data)).toBe(0);expect(pulsarDataSaved(e.doc.data)).toBe(false);
  expect(pulsarHeaderCells(e.doc.data)).toEqual({name:'SYNTH',aperture:25,highestIndex:1,frequencies:[400,1400,0],gains:[1,1,1],start:50000.5,interval:0.01});// gain 0 → 1 at read
  expect(acquirePulsarCaptureLease(e.doc,2,2,false)).toMatchObject({ok:false,reason:'capture-lease'});
 });
 it('phase, commit and release need the lease id; a commit happens once, bumps the generation and keeps the lease committed',()=>{
  const l=acquirePulsarCaptureLease(INITIAL_PULSAR_CURRENT_DATA,4,0,false).doc;
  expect(setPulsarCapturePhase(l,5,'receiving')).toMatchObject({ok:false,reason:'lease-mismatch'});
  const m=capture();
  // A commit needs a receiving or finishing lease with the same id.
  expect(commitPulsarCapture(l,4,m)).toMatchObject({ok:false,reason:'lease-mismatch',doc:l});
  const r=setPulsarCapturePhase(l,4,'receiving').doc;expect(r.lease).toEqual({id:4,phase:'receiving'});
  expect(commitPulsarCapture(r,5,m)).toMatchObject({ok:false,reason:'lease-mismatch',doc:r});
  const c=commitPulsarCapture(r,4,m);
  expect(c.doc).toMatchObject({generation:1,lease:{id:4,phase:'committed'}});expect(c.doc.data).toBe(m);
  // Committed: no second commit, no phase change, no import and no new lease until the release.
  expect(commitPulsarCapture(c.doc,4,capture({name:'AGAIN'}))).toMatchObject({ok:false,reason:'lease-mismatch',doc:c.doc});
  expect(setPulsarCapturePhase(c.doc,4,'finishing')).toMatchObject({ok:false,reason:'lease-mismatch',doc:c.doc});
  const late=importPulsarRecording(c.doc,plr('LATE'),1);
  expect(late).toMatchObject({ok:false,reason:'capture-lease'});expect(late.doc).toBe(c.doc);
  expect(acquirePulsarCaptureLease(c.doc,5,1,false)).toMatchObject({ok:false,reason:'capture-lease'});
  expect(releasePulsarCaptureLease(c.doc,5)).toMatchObject({ok:false,reason:'lease-mismatch',doc:c.doc});
  // Exactly one release: it keeps the data and the generation; a second release changes nothing.
  const done=releasePulsarCaptureLease(c.doc,4);
  expect(done.ok).toBe(true);expect(done.doc).toMatchObject({generation:1,lease:null});expect(done.doc.data).toBe(m);
  const again=releasePulsarCaptureLease(done.doc,4);
  expect(again).toMatchObject({ok:false,reason:'lease-mismatch'});expect(again.doc).toBe(done.doc);
  expect(importPulsarRecording(done.doc,plr('NEXT'),1).ok).toBe(true);
  // A finishing lease commits too.
  const f=setPulsarCapturePhase(r,4,'finishing').doc;expect(commitPulsarCapture(f,4,m).doc.lease).toEqual({id:4,phase:'committed'});
  expect(releasePulsarCaptureLease(l,4).doc.lease).toBeNull();
  expect(setPulsarAnalysisActivity(l,{modal:false,reading:false}).doc).toBe(l);
 });
 it('memory properties: the 0x5719a4 literal, points, msec and only recorded receivers; presentation domain',()=>{
  const m=capture();
  expect(pulsarDataProperties(m)).toEqual({fields:{object:'B2358+38',start:'58000.25000000',aperture:'100',interval:'10.00',points:'10',file:PULSAR_DATA_NOT_WRITTEN},
   receivers:[{receiver:0,recorded:true,frequency:'600.00',gain:'1.000',gainZeroReplaced:false},{receiver:1,recorded:true,frequency:'700.00',gain:'2.000',gainZeroReplaced:false},
    {receiver:2,recorded:false,frequency:'',gain:'',gainZeroReplaced:false}]});
  expect(PULSAR_DATA_NOT_WRITTEN).toBe('Data Not Written to File');
  expect([pulsarDataPresentation(null),pulsarDataPresentation(capture({rows:[]})),pulsarDataPresentation(capture({name:'No Data'})),pulsarDataPresentation(m)])
   .toEqual(['empty','empty','reserved-name','ok']);
  expect([pulsarFrequencyText(m,0),pulsarFrequencyText(m,2),pulsarFrequencyText(plr(),1)]).toEqual(['600.00',null,'1400.00']);
  expect(pulsarHeaderCells(null)).toBe(EMPTY_PULSAR_HEADER);
 });
});

describe('analysis activation PLR-ACTIVATE-01 and Load prompt PLR-LOAD-PROMPT-01',()=>{
 it('new data keeps the measurement list, counts Review, resets the view and opens Properties',()=>{
  let s=st(pulsarLoad(INITIAL_PULSAR_ANALYSIS,plr()));
  s=click(s,0,40);s=st(pulsarConfirmRecord(st(pulsarBeginRecord(s))));
  expect(s.list).toHaveLength(1);
  s=click(s,0,60);
  const a=pulsarActivateData(s,capture());
  expect(a.outcome).toBe('activated');expect(a.evidence).toContain('PLR-ACTIVATE-01');
  expect(a.state.list).toBe(s.list);expect(a.state.reviewEnabled).toBe(true);expect(a.state.saveEnabled).toBe(true);
  expect(a.state).toMatchObject({propertiesOpen:true,zoom:1,windowStart:0,windowEnd:4,panRate:10,pending:[false,false,false],recordEnabled:false,dataNotice:null});
  expect(a.state.cursors[0].verticalTime).toBe(-1);expect(a.state.measurement.vertical).toEqual([0,0,0]);
  expect(st(pulsarReviewOpen(a.state)).reviewSession?.draft).toEqual(s.list);
 });
 it('empty and reserved-name data present nothing with a notice; Review stays available for an existing list; a modal session defers',()=>{
  const empty=pulsarActivateData(INITIAL_PULSAR_ANALYSIS,{origin:'cleared',header:EMPTY_PULSAR_HEADER});
  expect(empty.outcome).toBe('activated-empty');expect(empty.state).toMatchObject({recording:null,dataNotice:'empty',propertiesOpen:false,reviewEnabled:false});
  const reserved=pulsarActivateData(INITIAL_PULSAR_ANALYSIS,capture({name:'No Data'}));
  expect(reserved.outcome).toBe('activated-reserved');expect(reserved.state.recording).toBeNull();
  let s=st(pulsarLoad(INITIAL_PULSAR_ANALYSIS,plr()));s=st(pulsarConfirmRecord(st(pulsarBeginRecord(click(s,0,40)))));
  const kept=st(pulsarActivateData(s,capture({rows:[]})));
  expect(kept).toMatchObject({recording:null,dataNotice:'empty',reviewEnabled:true});expect(kept.list).toBe(s.list);
  const review=st(pulsarReviewOpen(s));
  expect(pulsarActivateData(review,capture())).toMatchObject({outcome:'blocked-modal',changed:false});
 });
 it('the Load prompt applies to unsaved memory data only; No allows the chooser, Cancel keeps everything',()=>{
  const s=INITIAL_PULSAR_ANALYSIS;
  expect(pulsarRequestLoad(s,plr()).outcome).toBe('load-allowed');
  expect(pulsarRequestLoad(s,capture({rows:[]})).outcome).toBe('load-allowed');
  const p=st(pulsarRequestLoad(s,capture()));
  expect(p.loadPrompt).toBe(true);expect(pulsarModalOpen(p)).toBe(true);
  expect(pulsarAnswerLoad(p,'no').outcome).toBe('load-allowed');
  expect(pulsarAnswerLoad(p,'cancel')).toMatchObject({outcome:'load-cancelled',state:{loadPrompt:false}});
 });
});

describe('memory data in the manual analysis (PLR-MEMORY-01)',()=>{
 const active=(m=capture())=>st(pulsarActivateData(INITIAL_PULSAR_ANALYSIS,m));
 it('records an 11-column row without a file field; Edit admits it through the literal parse/rebuild and keeps 11 columns',()=>{
  let s=active();
  s=click(s,1,40);s=click(s,1,80,60,'right');
  s=st(pulsarConfirmRecord(st(pulsarBeginRecord(s))));
  const e=s.list[0];
  expect(e.fields).toMatchObject({object:'B2358+38',frequency:'700.00',gain:'2.000',file:null,points:'10',intervalMs:'10.00',aperture:'100'});
  // No invented empty quoted file name after the aperture (the '""' inside are the blank horizontal and the empty comment).
  expect(e.nativeLineCandidate.endsWith(',10,10.00,100')).toBe(true);expect(e.nativeLineCandidate).not.toMatch(/,""$/);
  expect(e.nativeLineCandidate.split(',')).toHaveLength(11);
  expect(pulsarEditorParse(e.nativeLineCandidate).tail).toBe('10,10.00,100');
  expect(pulsarReviewEditSupport(e).supported).toBe(true);
  let r=st(pulsarReviewRequestEdit(st(pulsarReviewOpen(s))));
  r=st(pulsarReviewEditDraft(r,'pulse, edge'));r=st(pulsarReviewEditConfirm(r));
  const edited=r.reviewSession!.draft[0];
  expect(edited.fields.comment).toBe('pulse, edge');expect(edited.nativeLineCandidate.endsWith('"pulse, edge",10,10.00,100')).toBe(true);
  // A file row keeps its 12th quoted field.
  let f=st(pulsarLoad(INITIAL_PULSAR_ANALYSIS,plr()));f=st(pulsarConfirmRecord(st(pulsarBeginRecord(click(f,0,40)))));
  expect(f.list[0].nativeLineCandidate.endsWith(',"synthetic.plr"')).toBe(true);expect(f.list[0].fields.file).toBe('synthetic.plr');
 });
 it('an object name with a double quote stays refused by Edit (no blanket support)',()=>{
  let s=active(capture({name:'A"B'}));s=st(pulsarConfirmRecord(st(pulsarBeginRecord(click(s,0,40)))));
  expect(pulsarReviewEditSupport(s.list[0])).toMatchObject({supported:false,reason:'object-quote'});
 });
 it('a never-written gain draws the baseline and refuses a horizontal reading; vertical cursors still work',()=>{
  let s=active();
  expect(pulsarTrace(s,2).every(p=>p.y===PULSAR_BASES[2])).toBe(true);
  s=click(s,2,30);expect(s.cursors[2].verticalTime).toBeCloseTo(0.3,12);
  s={...s,modes:[s.modes[0],s.modes[1],'horizontal']};
  const h=pulsarPointer(s,2,ptr('down','left',10,50));
  expect(h.outcome).toBe('channel-unrecorded');expect(h.state.cursors[2].horizontalVisible).toBe(false);
 });
 it('uses the raw binary64 samples: 0.0078 at gain 8 and factor 8 is on the baseline, where a fixed3 0.008 would be one pixel up',()=>{
  const m=capture({gains:[8,null,null],highestIndex:0,frequencies:[600,null,null],rows:[0.0078,0,0,0.0078,0,0]});
  let s=active(m);
  for(let i=0;i<3;i++)s=st(pulsarFactor(s,0,'up'));
  expect(s.factors[0]).toBe(8);
  expect(Object.is(m.samples[0],0.0078)).toBe(true);
  expect(pulsarTrace(s,0)[0].y).toBe(PULSAR_BASES[0]);
  expect(PULSAR_BASES[0]-Math.round(0.008*8*8)).toBe(PULSAR_BASES[0]-1);
 });
});

// R-RX15 (docs/PULSAR-SAVE-VERIFIED.md, WEB-SAVE-05/06). [S] SAVE-WRITTEN / SAVE-ORIGIN-INDEPENDENT are the recovered facts; the
// receipt, its checks and its invalidation are the chosen web contract. The read-back bytes here are synthetic stand-ins for
// a browser read-back, not native writer output.
describe('R-RX15 verified written copy: receipt, refusals, invalidation and ownership',()=>{
 /** A committed and released memory capture: the state after Save No. */
 const committed=(m=capture()):PulsarCurrentData=>{
  const r=setPulsarCapturePhase(acquirePulsarCaptureLease(INITIAL_PULSAR_CURRENT_DATA,1,0,false).doc,1,'receiving').doc;
  return releasePulsarCaptureLease(commitPulsarCapture(r,1,m).doc,1).doc;
 };
 const textOf=(m:PulsarMemoryRecording)=>{const b=buildPulsarRawExport(m);if(!b.ok)throw new Error(b.problem.code);return b.text;};
 const bytes=(text:string)=>Uint8Array.from(text,c=>c.charCodeAt(0));
 const saved=(m=capture(),name='copy.PLR')=>{
  const d=committed(m),text=textOf(m),claim=pulsarWriteClaim(d,text);
  if(!claim)throw new Error('no claim');
  const step=recordPulsarWrittenCopy(d,claim,bytes(text),name);
  if(!step.ok)throw new Error(step.reason);
  return {m,d,text,claim,doc:step.doc};
 };

 it('defaults: an imported file is saved, a memory capture is not; INITIAL carries no receipt and a file cannot be claimed',()=>{
  expect(INITIAL_PULSAR_CURRENT_DATA.written).toBeNull();expect(pulsarWrittenCopy(INITIAL_PULSAR_CURRENT_DATA)).toBeNull();
  const f=importPulsarRecording(INITIAL_PULSAR_CURRENT_DATA,plr(),0).doc;
  expect(pulsarCurrentSaved(f)).toBe(true);expect(pulsarWrittenCopy(f)).toBeNull();expect(pulsarWriteClaim(f,'x')).toBeNull();
  const d=committed();
  expect(pulsarCurrentSaved(d)).toBe(false);expect(d.written).toBeNull();
  // A document without the optional field (pre-R-RX15 fixtures) has no receipt.
  const {written:_omit,...legacy}=d;void _omit;
  expect(pulsarWrittenCopy(legacy)).toBeNull();expect(pulsarCurrentSaved(legacy)).toBe(false);
 });

 it('a receipt keeps the data object, generation, lease, activity and samples; origin stays memory; only Properties shows the basename',()=>{
  const {m,d,text,doc}=saved();
  const w=pulsarWrittenCopy(doc) as PulsarWrittenCopy;
  expect(w.fileName).toBe('copy.PLR');expect(w.byteLength).toBe(text.length);
  expect(doc.data).toBe(m);expect(doc.generation).toBe(d.generation);expect(doc.lease).toBeNull();expect(doc.analysis).toBe(d.analysis);
  expect(isMemoryData(doc.data)).toBe(true);expect(pulsarCurrentSaved(doc)).toBe(true);
  expect(Array.from(m.samples)).toEqual(Array.from({length:30},(_,i)=>i%3===2?0:(i+1)/7));
  // +0x96 untouched: the measurement-row file field stays absent.
  expect(pulsarDataFileName(m)).toBeNull();
  expect(pulsarDataProperties(m,w).fields.file).toBe('copy.PLR');
  expect(pulsarDataProperties(m).fields.file).toBe(PULSAR_DATA_NOT_WRITTEN);
  expect(pulsarDataProperties(m,null).fields.file).toBe('Data Not Written to File');
  // Another data object (older held or newer) never shows this receipt.
  expect(pulsarDataProperties(capture(),w).fields.file).toBe(PULSAR_DATA_NOT_WRITTEN);
  let s=st(pulsarActivateData(INITIAL_PULSAR_ANALYSIS,doc.data));s=st(pulsarConfirmRecord(st(pulsarBeginRecord(click(s,0,40)))));
  expect(s.list[0].fields.file).toBeNull();expect(s.list[0].nativeLineCandidate.split(',')).toHaveLength(11);
  // Load prompt: the document-aware flag skips it; the value-only default (existing callers) still asks.
  expect(pulsarRequestLoad(INITIAL_PULSAR_ANALYSIS,m,pulsarCurrentSaved(doc)).outcome).toBe('load-allowed');
  expect(pulsarRequestLoad(INITIAL_PULSAR_ANALYSIS,m,pulsarCurrentSaved(d)).outcome).toBe('load-prompt');
  expect(pulsarRequestLoad(INITIAL_PULSAR_ANALYSIS,m).outcome).toBe('load-prompt');
  expect(pulsarDataSaved(m)).toBe(false);// deprecated value-only accessor unchanged
 });

 it('refusals in order change nothing and keep a prior receipt: claim, lease, superseded, source-mutated, size, bytes, file name',()=>{
  const {m,text,claim,doc:prior}=saved(capture(),'prior.PLR');
  const good=bytes(text);
  const refused=(doc:PulsarCurrentData,c:PulsarWriteClaim,b:Uint8Array,name:string,reason:PulsarWriteRefusal)=>{
   const r=recordPulsarWrittenCopy(doc,c,b,name);
   expect(r).toMatchObject({ok:false,reason});expect(r.doc).toBe(doc);
  };
  // Not an issued claim: a spread copy (symbol keys copied) or a hand-made object.
  refused(prior,{...claim} as PulsarWriteClaim,good,'x.PLR','claim');
  refused(prior,Object.freeze({data:m,generation:prior.generation,metadata:claim.metadata,samples:claim.samples,text}) as PulsarWriteClaim,good,'x.PLR','claim');
  // A held capture lease (Record armed without erase keeps the receipt itself).
  const leased=acquirePulsarCaptureLease(prior,2,prior.generation,false).doc;
  refused(leased,claim,good,'x.PLR','capture-lease');expect(pulsarWrittenCopy(leased)?.fileName).toBe('prior.PLR');
  // Another object or generation.
  refused({...prior,data:capture()},claim,good,'x.PLR','superseded');
  refused({...prior,generation:prior.generation+1},claim,good,'x.PLR','superseded');
  // The same object mutated in place: a value, and +0 → −0 (Object.is).
  const v=m.samples[0];m.samples[0]=v+1;
  refused(prior,claim,good,'x.PLR','source-mutated');expect(pulsarWrittenCopy(prior)).toBeNull();expect(pulsarCurrentSaved(prior)).toBe(false);
  m.samples[0]=v;m.samples[2]=-0;
  refused(prior,claim,good,'x.PLR','source-mutated');expect(pulsarWrittenCopy(prior)).toBeNull();
  m.samples[2]=0;expect(pulsarWrittenCopy(prior)?.fileName).toBe('prior.PLR');
  // Read-back: one byte short, one byte longer, one byte changed.
  refused(prior,claim,good.slice(0,-1),'x.PLR','readback-size');
  refused(prior,claim,Uint8Array.from([...good,0x0a]),'x.PLR','readback-size');
  const flipped=good.slice();flipped[5]^=1;refused(prior,claim,flipped,'x.PLR','readback-bytes');
  // File name policy (WEB): 1..255 UTF-16 units, no C0/DEL, no separator.
  for(const name of ['','x'.repeat(PULSAR_SAVE_NAME_MAX+1),'a\u0001.PLR','a\u007f.PLR','a\n.PLR','dir/a.PLR','dir\\a.PLR'])refused(prior,claim,good,name,'file-name');
  expect(pulsarSaveNameOk('x'.repeat(PULSAR_SAVE_NAME_MAX-4)+'.PLR')).toBe(true);expect(pulsarSaveNameOk('é ü.PLR')).toBe(true);
  expect(pulsarWrittenCopy(prior)?.fileName).toBe('prior.PLR');
  // A later verified save of the same data replaces the receipt; the earlier one is gone.
  const next=recordPulsarWrittenCopy(prior,claim,good,'second.PLR');
  expect(next.ok).toBe(true);expect(pulsarWrittenCopy(next.doc)?.fileName).toBe('second.PLR');
 });

 it('import, arming erase and a new capture commit drop the receipt; activity, lease phases and release keep it; nothing revives it',()=>{
  const {m,doc:w}=saved(capture(),'a.PLR');
  const busy=setPulsarAnalysisActivity(w,{modal:true,reading:true}).doc;expect(pulsarWrittenCopy(busy)?.fileName).toBe('a.PLR');
  const idle=setPulsarAnalysisActivity(busy,{modal:false,reading:false}).doc;
  const armed=acquirePulsarCaptureLease(idle,9,idle.generation,false).doc;expect(pulsarCurrentSaved(armed)).toBe(true);
  const receiving=setPulsarCapturePhase(armed,9,'receiving').doc;expect(pulsarWrittenCopy(receiving)).not.toBeNull();
  const released=releasePulsarCaptureLease(receiving,9).doc;expect(pulsarWrittenCopy(released)?.fileName).toBe('a.PLR');
  const erased=acquirePulsarCaptureLease(released,10,released.generation,true).doc;
  expect(erased.written).toBeNull();expect(pulsarCurrentSaved(erased)).toBe(false);expect(pulsarDataRows(erased.data)).toBe(0);
  // The old data and the old receipt under the later generation are not a receipt.
  expect(pulsarWrittenCopy({...erased,data:m,written:released.written})).toBeNull();
  const imported=importPulsarRecording(released,plr(),released.generation).doc;expect(imported.written).toBeNull();
  const r=setPulsarCapturePhase(acquirePulsarCaptureLease(released,11,released.generation,false).doc,11,'receiving').doc;
  expect(pulsarWrittenCopy(r)).not.toBeNull();
  const recommitted=commitPulsarCapture(r,11,capture({name:'NEXT'})).doc;
  expect(recommitted.written).toBeNull();expect(pulsarCurrentSaved(recommitted)).toBe(false);
 });

 it('owned claims: frozen ordinary copies and an immutable text; caller buffers cannot change a comparison; receipts cannot be forged',()=>{
  const m=capture(),d=committed(m),text=textOf(m),claim=pulsarWriteClaim(d,text) as PulsarWriteClaim;
  expect(Object.isFrozen(claim)).toBe(true);expect(Object.isFrozen(claim.samples)).toBe(true);expect(Object.isFrozen(claim.metadata)).toBe(true);
  expect(Array.isArray(claim.samples)).toBe(true);expect(claim.samples).not.toBe(m.samples);expect(claim.text).toBe(text);
  expect(()=>{(claim.samples as number[])[0]=99;}).toThrow(TypeError);
  // Fresh bytes per call; mutating one copy changes neither the claim nor a later comparison.
  const a=pulsarClaimBytes(claim),b=pulsarClaimBytes(claim);
  expect(a).not.toBe(b);expect(a.buffer).not.toBe(b.buffer);
  a[0]=0x41;
  expect(pulsarClaimReadback(claim,b)).toBe('ok');expect(pulsarClaimReadback(claim,a)).toBe('readback-bytes');
  // −0 is kept in the owned copy.
  const z=capture({rows:[-0,1,0,0,2,0]}),zc=pulsarWriteClaim(committed(z),textOf(z)) as PulsarWriteClaim;
  expect(Object.is(zc.samples[0],-0)).toBe(true);expect(Object.is(zc.samples[3],0)).toBe(true);
  // Refused claims: empty or non-ASCII text, a non-frozen value, non-finite samples, a wrong sample shape.
  expect(pulsarWriteClaim(d,'')).toBeNull();expect(pulsarWriteClaim(d,'café')).toBeNull();
  expect(pulsarWriteClaim({...d,data:{...m}},text)).toBeNull();
  expect(pulsarWriteClaim(committed(capture({rows:[Number.NaN,1,0]})),text)).toBeNull();
  expect(pulsarWriteClaim({...d,data:Object.freeze({...m,samples:new Float64Array(5)})},text)).toBeNull();
  // A spread or hand-made receipt is not a receipt.
  const w=recordPulsarWrittenCopy(d,claim,b,'a.PLR').doc,real=w.written as PulsarWrittenCopy;
  expect(pulsarWrittenCopy({...w,written:{...real}})).toBeNull();
  expect(pulsarWrittenCopy({...w,written:Object.freeze({...real,fileName:'forged.PLR'})})).toBeNull();
  expect(pulsarDataProperties(m,{...real}).fields.file).toBe(PULSAR_DATA_NOT_WRITTEN);
  expect(()=>{(real as {fileName:string}).fileName='changed.PLR';}).toThrow(TypeError);
  expect(pulsarWrittenCopy(w)?.fileName).toBe('a.PLR');
 });
});

// R-RX16 (docs/RADIO-RECORD-SAVE.md, WEB-RX16-05): the shared output claim is web policy (one browser output attempt across Pulsar
// Analysis and the Radio arming Save), not a recovered native flag. Synthetic fixtures.
describe('R-RX16 shared output claim: one owner and token, kept across dataset changes, never released by another attempt',()=>{
 const committed=(m=capture()):PulsarCurrentData=>{
  const r=setPulsarCapturePhase(acquirePulsarCaptureLease(INITIAL_PULSAR_CURRENT_DATA,1,0,false).doc,1,'receiving').doc;
  return releasePulsarCaptureLease(commitPulsarCapture(r,1,m).doc,1).doc;
 };
 it('starts empty; a claim refuses every second claim and is released only by its exact owner and token',()=>{
  expect(INITIAL_PULSAR_CURRENT_DATA.output).toBeNull();expect(pulsarOutputClaim(INITIAL_PULSAR_CURRENT_DATA)).toBeNull();
  const {output:_omit,...legacy}=INITIAL_PULSAR_CURRENT_DATA;void _omit;
  expect(pulsarOutputClaim(legacy)).toBeNull();
  const a=claimPulsarOutput(INITIAL_PULSAR_CURRENT_DATA,'radio',3);
  expect(a.ok).toBe(true);expect(pulsarOutputClaim(a.doc)).toEqual({owner:'radio',token:3});
  expect(Object.isFrozen(a.doc)).toBe(true);expect(Object.isFrozen(a.doc.output)).toBe(true);
  // Nothing else changes.
  expect({...a.doc,output:null}).toEqual(INITIAL_PULSAR_CURRENT_DATA);
  for(const [owner,token] of [['analysis',4],['radio',4],['radio',3]] as const){
   const busy=claimPulsarOutput(a.doc,owner,token);
   expect(busy).toMatchObject({ok:false,reason:'output-busy'});expect(busy.doc).toBe(a.doc);
  }
  for(const [owner,token] of [['analysis',3],['radio',2],['radio',4]] as const){
   const wrong=releasePulsarOutput(a.doc,owner,token);
   expect(wrong).toMatchObject({ok:false,reason:'output-mismatch'});expect(wrong.doc).toBe(a.doc);
  }
  const done=releasePulsarOutput(a.doc,'radio',3);
  expect(done.ok).toBe(true);expect(pulsarOutputClaim(done.doc)).toBeNull();
  expect(releasePulsarOutput(done.doc,'radio',3)).toMatchObject({ok:false,reason:'output-mismatch'});
  expect(releasePulsarOutput(INITIAL_PULSAR_CURRENT_DATA,'analysis',1)).toMatchObject({ok:false,reason:'output-mismatch'});
 });
 it('refuses a bad owner or token without changing anything',()=>{
  for(const token of [0,-1,1.5,Number.NaN,Number.POSITIVE_INFINITY,2**53])
   expect(claimPulsarOutput(INITIAL_PULSAR_CURRENT_DATA,'radio',token)).toMatchObject({ok:false,reason:'output-input',doc:INITIAL_PULSAR_CURRENT_DATA});
  expect(claimPulsarOutput(INITIAL_PULSAR_CURRENT_DATA,'other' as 'radio',1)).toMatchObject({ok:false,reason:'output-input'});
 });
 it('an older attempt never releases a newer one, also across owners',()=>{
  const first=claimPulsarOutput(INITIAL_PULSAR_CURRENT_DATA,'radio',1).doc;
  const second=claimPulsarOutput(releasePulsarOutput(first,'radio',1).doc,'analysis',2).doc;
  // The settled radio attempt's late cleanup must not drop the analysis claim.
  expect(releasePulsarOutput(second,'radio',1)).toMatchObject({ok:false,reason:'output-mismatch',doc:second});
  expect(pulsarOutputClaim(second)).toEqual({owner:'analysis',token:2});
  const third=claimPulsarOutput(releasePulsarOutput(second,'analysis',2).doc,'radio',3).doc;
  expect(releasePulsarOutput(third,'analysis',2)).toMatchObject({ok:false,reason:'output-mismatch'});
 });
 it('survives every dataset change (import, erase, commit) and a receipt; a receipt can be recorded while it is held',()=>{
  const m=capture(),d=committed(m),held=claimPulsarOutput(d,'radio',7).doc;
  const text=(()=>{const b=buildPulsarRawExport(m);if(!b.ok)throw new Error(b.problem.code);return b.text;})();
  const claim=pulsarWriteClaim(held,text) as PulsarWriteClaim;
  const written=recordPulsarWrittenCopy(held,claim,pulsarClaimBytes(claim),'held.PLR');
  expect(written.ok).toBe(true);expect(pulsarOutputClaim(written.doc)).toEqual({owner:'radio',token:7});
  expect(pulsarWrittenCopy(written.doc)?.fileName).toBe('held.PLR');
  // Releasing the claim keeps the receipt (only `output` changes).
  const released=releasePulsarOutput(written.doc,'radio',7).doc;
  expect(pulsarWrittenCopy(released)?.fileName).toBe('held.PLR');expect(released.generation).toBe(written.doc.generation);
  const imported=importPulsarRecording(held,plr(),held.generation).doc;
  expect(imported.generation).toBe(held.generation+1);expect(pulsarOutputClaim(imported)).toEqual({owner:'radio',token:7});
  const erased=acquirePulsarCaptureLease(held,2,held.generation,true).doc;
  expect(pulsarDataRows(erased.data)).toBe(0);expect(pulsarOutputClaim(erased)).toEqual({owner:'radio',token:7});
  const r=setPulsarCapturePhase(erased,2,'receiving').doc,recommitted=commitPulsarCapture(r,2,capture({name:'NEXT'})).doc;
  expect(pulsarOutputClaim(recommitted)).toEqual({owner:'radio',token:7});
  // The claim stays the owner's to release after the bump.
  expect(pulsarOutputClaim(releasePulsarOutput(recommitted,'radio',7).doc)).toBeNull();
 });
});
