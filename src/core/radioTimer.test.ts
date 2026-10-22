import {afterEach,describe,expect,it,vi} from 'vitest';
import {startRadioTimer,type RadioTimerHost} from './radioTimer';
import {INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS as O,RADIO_LAB_CONSTANTS,activateRadioLab,answerNotice,confirmSkyCoords,editSkyCoordsField,openSetCoordinates,
 slewTimerTick,toggleTracking,type RadioLabState,type SkyCoordsField} from './radioAntenna';

/** Hand-driven host: callbacks run only when a test fires them, including after cancel (a task already queued). */
function manualHost(){
 const timers=new Map<number,{callback:()=>void;ms:number;cleared:boolean}>();let next=1;
 const host:RadioTimerHost={setInterval:(callback,ms)=>{const h=next++;timers.set(h,{callback,ms,cleared:false});return h;},clearInterval:h=>{const t=timers.get(h as number);if(t)t.cleared=true;}};
 return {host,timers,fire:(h:number)=>timers.get(h)!.callback()};
}
const realHost:RadioTimerHost={setInterval:(callback,ms)=>setInterval(callback,ms),clearInterval:h=>clearInterval(h as ReturnType<typeof setInterval>)};
afterEach(()=>{vi.useRealTimers();});

describe('WEB-TIMER-01 registration (browser policy, not Windows TTimer timing)',()=>{
 it('reads the latest input at each callback and delivers at most once per input',()=>{
  const {host,timers,fire}=manualHost(),seen:string[]=[];let input={v:'a'};
  const r=startRadioTimer(host,100,()=>input,i=>seen.push(i.v));
  expect([...timers.values()].map(t=>t.ms)).toEqual([100]);
  fire(1);fire(1);// the second callback finds the same input: the first delivery is not committed yet
  input={v:'b'};fire(1);input={v:'c'};input={v:'d'};fire(1);
  expect(seen).toEqual(['a','b','d']);expect(r.active()).toBe(true);
 });
 it('cancel is final and idempotent; a callback that runs after it changes nothing',()=>{
  const {host,timers,fire}=manualHost(),seen:number[]=[];let n=0;
  const r=startRadioTimer(host,100,()=>++n,i=>seen.push(i));
  fire(1);r.cancel();r.cancel();
  expect(timers.get(1)!.cleared).toBe(true);expect(r.active()).toBe(false);
  fire(1);fire(1);expect(seen).toEqual([1]);
 });
 it('separate registrations do not share delivery state',()=>{
  const {host,fire}=manualHost(),seen:string[]=[];const input={v:'x'};
  const a=startRadioTimer(host,100,()=>input,()=>seen.push('a'));fire(1);a.cancel();
  startRadioTimer(host,100,()=>input,()=>seen.push('b'));fire(2);fire(2);
  expect(seen).toEqual(['a','b']);// a new registration (resume, new run) delivers the same committed input once
 });
 it('rejects intervals that cannot be scheduled',()=>{
  const {host}=manualHost();for(const ms of [0,-1,Number.NaN,Infinity])expect(()=>startRadioTimer(host,ms,()=>0,()=>{})).toThrow('Invalid radio timer interval');
 });
 it('fixed nominal cadence: input changes every 40 ms do not postpone the 100 ms callbacks',()=>{
  vi.useFakeTimers();const at:number[]=[];let input={t:0};const t0=Date.now();
  const r=startRadioTimer(realHost,RADIO_LAB_CONSTANTS.slewTimerIntervalMs,()=>input,()=>at.push(Date.now()-t0));
  for(let i=0;i<10;i++){vi.advanceTimersByTime(40);input={t:i};}// an unrelated change after every step
  vi.advanceTimersByTime(50);r.cancel();vi.advanceTimersByTime(1000);
  expect(at).toEqual([100,200,300,400]);
 });
 it('drives a programmed slew to completion with the latest state and exactly one tick per committed state',()=>{
  vi.useFakeTimers();
  let s:RadioLabState=toggleTracking(activateRadioLab(INITIAL_RADIO_LAB,O).state,O).state;
  s=openSetCoordinates(s,O).state;
  for(const [f,v] of [['raHours','1'],['raMinutes','0'],['raSeconds','0'],['decDegrees','30'],['decMinutes','0'],['decSeconds','0']] as [SkyCoordsField,string][])s=editSkyCoordsField(s,f,v).state;
  s=answerNotice(confirmSkyCoords(s,O).state,O,'confirm-slew','yes').state;
  let committed=s,commits=0;const run=s.slewRun;
  const r=startRadioTimer(realHost,100,()=>committed,lab=>{const t=slewTimerTick(lab,O,run);if(t.changed){committed=t.state;commits++;}});
  // Tracking toggled between callbacks: the next tick starts from the toggled state and keeps it.
  vi.advanceTimersByTime(140);committed=toggleTracking(committed,O).state;vi.advanceTimersByTime(60);
  expect(committed).toMatchObject({tracking:false,slewTicks:2});
  vi.advanceTimersByTime(10_000);r.cancel();
  expect(committed).toMatchObject({slewing:false,slewTimerEnabled:false,notice:{kind:'slew-complete'},pointing:{ra:1,dec:30}});
  expect(commits).toBe(committed.slewTicks);// every tick advanced the committed state once; no extra ticks
 });
});
