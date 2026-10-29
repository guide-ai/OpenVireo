import {describe,it,expect} from 'vitest';
import {createMultiSpecState,multiSpecReducer as r,type MultiSpecState,type MultiSpecAction} from './multiSpec';
import {randomDraw} from './acquisition';
import type {MultiSpecSelection} from './multiSpecSpectrum';

const sel=(x:number,y:number,over:Partial<MultiSpecSelection>={}):MultiSpecSelection=>({type:0,name:`s${x}`,ra:13,dec:28,v:14,z:null,spectralIndex:40305000,x,y,source:{kind:'star',index:0},...over});
const run=(s:MultiSpecState,...actions:MultiSpecAction[])=>actions.reduce(r,s);
const opened=()=>run(createMultiSpecState(0,1234),{type:'show'},{type:'dismiss'});

describe('Front M: Multi-Spec control form (TMultSpCntrl) state machine',()=>{
 it('FormCreate/FormShow: ExpEd "1.00", the hint once, selection mode on; Init/Clear need a selection',()=>{
  const s=run(createMultiSpecState(0,1),{type:'show'});
  expect([s.expText,s.message,s.selecting,s.controls]).toEqual(['1.00','select-hint',true,{objects:true,select:true,clear:false,viewSave:false,init:false,go:false,stop:false}]);
  const again=run(s,{type:'dismiss'},{type:'close'},{type:'show'});expect(again.message).toBeNull();
 });
 it('adding: the 1 px duplicate rule; Init/Clear on, Go off; no count limit',()=>{
  let s=run(opened(),{type:'add',selection:sel(400,400)});
  expect([s.selections.length,s.controls.init,s.controls.clear,s.controls.go]).toEqual([1,true,true,false]);
  s=run(s,{type:'add',selection:sel(400.4,400.6)});expect(s.selections.length).toBe(2);// Round → (400, 401): 1.0 px is not < 1
  s=run(s,{type:'add',selection:sel(400.2,400.3)});expect(s.selections.length).toBe(2);// Round → (400, 400): 0 px from the first
  s=run(s,{type:'add',selection:sel(401.2,400)});expect(s.selections.length).toBe(2);// (401, 400): 0.85 px from the second
  for(let i=0;i<200;i++)s=run(s,{type:'add',selection:sel(320+i,350)});expect(s.selections.length).toBe(202);
 });
 it('Init: Round(x·60) nearest-even, the error box, Num := count, Go on; Go: running; ticks of 1 s; natural end builds spectra',()=>{
  let s=run(opened(),{type:'add',selection:sel(400,400)},{type:'add',selection:sel(450,450)},{type:'edit-exposure',text:'abc'},{type:'init'});
  expect(s.message).toBe('invalid-exposure');
  s=run(s,{type:'dismiss'},{type:'edit-exposure',text:'0'},{type:'init'});expect([s.message,s.seconds,s.controls.go]).toEqual(['invalid-exposure',0,false]);
  s=run(s,{type:'dismiss'},{type:'edit-exposure',text:'0.0125'},{type:'init'});// 0.75 s → Round = 1 (nearest even of 0.75 is 1)
  expect([s.seconds,s.minutes,s.displays.objects,s.displays.clock,s.controls]).toEqual([1,0.0125,2,{minutes:0,seconds:1},{objects:true,select:false,clear:true,viewSave:false,init:false,go:true,stop:false}]);
  s=run(s,{type:'edit-exposure',text:'0.05'},{type:'add',selection:sel(500,500)});expect(s.controls.go).toBe(false);// a later add disables Go
  s=run(s,{type:'init'},{type:'go'});
  expect([s.seconds,s.running,s.remaining,s.selecting,s.displays.clockColour,s.controls.objects,s.controls.stop,s.controls.go]).toEqual([3,true,3,false,'red',false,true,false]);
  s=run(s,{type:'add',selection:sel(300,300)});expect(s.selections.length).toBe(3);// selection mode is off while exposing
  s=run(s,{type:'tick'},{type:'tick'});expect([s.remaining,s.elapsed,s.entries.length]).toEqual([1,2,0]);
  s=run(s,{type:'tick'});
  expect([s.running,s.remaining,s.displays.clockColour,s.controls.go,s.controls.stop,s.controls.objects,s.listShown]).toEqual([false,0,'green',false,false,true,true]);
  expect(s.entries.map(e=>[e.idx,e.seconds,e.saved])).toEqual([[1,3,false],[2,3,false],[3,3,false]]);
  // Fibre seeds come from the page stream through the LCG 0x4035e4 [W].
  let seed=1234;seed=randomDraw(seed).seed;// Go (S/N stream)
  const fibre=[1,2,3].map(()=>(seed=randomDraw(seed).seed));expect(s.entries.map(e=>e.seed)).toEqual(fibre);
 });
 it('Stop asks only when 0 < remaining < seconds; No resumes; Yes builds with t = seconds − remaining and Go stays on',()=>{
  let s=run(opened(),{type:'add',selection:sel(400,400)},{type:'edit-exposure',text:'0.05'},{type:'init'},{type:'go'},{type:'tick'},{type:'stop'});
  expect([s.question,s.running]).toEqual([{kind:'terminate'},false]);
  s=run(s,{type:'tick'});expect(s.remaining).toBe(2);// modal box: timer off
  s=run(s,{type:'answer',yes:false});expect([s.question,s.running]).toEqual([null,true]);
  s=run(s,{type:'tick'},{type:'stop'},{type:'answer',yes:true});
  expect([s.entries.map(e=>[e.idx,e.seconds]),s.controls.go,s.remaining]).toEqual([[[1,2]],true,1]);
  // A second Go on the same selections restarts a full exposure and adds nothing (idx ≤ last + 1).
  s=run(s,{type:'go'});expect(s.remaining).toBe(3);s=run(s,{type:'tick'},{type:'tick'},{type:'tick'});
  expect(s.entries.length).toBe(1);
  // Stop before the first tick: no question, spectra with t = 0.
  let t=run(opened(),{type:'add',selection:sel(400,400)},{type:'init'},{type:'go'},{type:'stop'});
  expect([t.question,t.entries.map(e=>e.seconds),t.controls.go]).toEqual([null,[0],true]);
  t=run(t,{type:'close'});expect(t.open).toBe(false);
  const busy=run(opened(),{type:'add',selection:sel(400,400)},{type:'init'},{type:'go'},{type:'close'});expect([busy.open,busy.message]).toEqual([true,'cannot-close']);
 });
 it('right click: nearest within 350 px; “Spectrum Already Taken” for positions ≤ the last spectrum index (quirk after Clear)',()=>{
  let s=run(opened(),{type:'add',selection:sel(400,400)},{type:'add',selection:sel(500,500)},{type:'remove-at',x:498,y:498});
  expect(s.question).toEqual({kind:'remove',index:1});
  s=run(s,{type:'answer',yes:false});expect(s.selections.length).toBe(2);
  s=run(s,{type:'remove-at',x:401,y:401},{type:'answer',yes:true});expect(s.selections.map(x=>x.x)).toEqual([500]);
  s=run(s,{type:'remove-at',x:1300,y:1300});expect(s.question).toBeNull();// none within 350 px
  s=run(s,{type:'add',selection:sel(420,420)},{type:'init'},{type:'go'},{type:'stop'},{type:'select'},{type:'dismiss'});
  expect(s.entries.length).toBe(2);
  s=run(s,{type:'remove-at',x:420,y:420});expect([s.message,s.selections.length]).toEqual(['cannot-remove',2]);
  // Clear Objects: no confirmation, numbering base := count + 1; the new first selections cannot be removed (quirk).
  s=run(s,{type:'dismiss'},{type:'clear'});
  expect([s.selections.length,s.numberingBase,s.expText,s.controls.select,s.controls.clear,s.controls.go,s.displays.objects]).toEqual([0,3,'1.00',true,false,false,0]);
  s=run(s,{type:'select'},{type:'add',selection:sel(330,330)},{type:'remove-at',x:330,y:330});expect(s.message).toBe('cannot-remove');
  s=run(s,{type:'dismiss'},{type:'init'},{type:'go'},{type:'stop'});expect(s.entries.map(e=>e.idx)).toEqual([1,2,3]);
 });
 it('spectra list: View/Save, Clear All (confirmed) resets the numbering, saved marks; field regeneration clears the selection',()=>{
  let s=run(opened(),{type:'view-save'});expect(s.message).toBe('no-spectra');
  s=run(s,{type:'dismiss'},{type:'add',selection:sel(400,400)},{type:'init'},{type:'go'},{type:'stop'},{type:'saved',idx:[1]});
  expect(s.entries[0].saved).toBe(true);
  s=run(s,{type:'list-closed'});expect([s.listShown,s.controls.viewSave]).toEqual([false,true]);
  s=run(s,{type:'clear-all'});expect(s.question).toEqual({kind:'clear-all'});
  s=run(s,{type:'answer',yes:true});expect([s.entries.length,s.numberingBase]).toEqual([0,1]);
  s=run(s,{type:'go'},{type:'stop'});expect(s.entries.map(e=>e.idx)).toEqual([1]);// re-Go after Clear All records again
  s=run(s,{type:'field-regenerated'});expect([s.selections.length,s.numberingBase]).toEqual([0,2]);
 });
 it('S/N estimate: Σ += Poisson(0.7·A) + Poisson(B) per tick; a Sky selection makes it indeterminate (D8)',()=>{
  let s=run(opened(),{type:'add',selection:sel(400,400,{v:12})},{type:'add',selection:sel(500,500,{v:15})},{type:'edit-exposure',text:'0.05'},{type:'init'},{type:'go'});
  const sn=s.signalToNoise;if(sn.status!=='running')throw Error();
  const m0=4-2.5;expect(sn.a).toBe(50*0.7*Math.pow(10,(Math.fround(15)-m0)/-2.5)*1000);expect(sn.b).toBe(50*Math.pow(10,(19-m0)/-2.5)*1000);
  s=run(s,{type:'tick'});expect(s.displays.snr).toBe(Math.sqrt((s.signalToNoise as {sum:number}).sum));
  const sky=run(opened(),{type:'add',selection:{...sel(400,400),type:4,v:null,ra:null,dec:null}},{type:'init'},{type:'go'},{type:'tick'});
  expect([sky.signalToNoise,sky.displays.snr]).toEqual([{status:'indeterminate',reason:'sky-selection'},null]);
 });
});
