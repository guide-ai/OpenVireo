import {describe,expect,it} from 'vitest';
import {admitPlrRecording,type PlrRecording} from './pulsarRecording';
import {
 EMPTY_PULSAR_HEADER,INITIAL_PULSAR_CURRENT_DATA,PULSAR_DATA_NOT_WRITTEN,acquirePulsarCaptureLease,commitPulsarCapture,importPulsarRecording,pulsarDataPresentation,
 pulsarDataProperties,pulsarDataRows,pulsarDataSaved,pulsarFrequencyText,pulsarHeaderCells,pulsarMemoryRecording,releasePulsarCaptureLease,setPulsarAnalysisActivity,
 setPulsarCapturePhase,type PulsarCaptureInput,type PulsarMemoryRecording,
} from './pulsarCurrentData';
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
