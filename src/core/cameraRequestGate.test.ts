import {describe,it,expect} from 'vitest';
import {createCameraRequestGate,cameraRequestTransition,CameraRequestGateError,CAMERA_OBSERVE_INTERVAL_MS,type CameraRequestGate,type CameraGateEvent,type CameraRequestTicket,type CameraGateTransition} from './cameraRequestGate';
const names=(r:CameraGateTransition)=>r.effects.map(e=>e.type);
const start=(seconds=2)=>cameraRequestTransition(createCameraRequestGate(),{type:'start',seconds});
type WithoutTicket<T>=T extends {ticket:CameraRequestTicket}?Omit<T,'ticket'>:never;
const send=(s:CameraRequestGate,e:WithoutTicket<CameraGateEvent>)=>cameraRequestTransition(s,{...e,ticket:s.ticket!} as CameraGateEvent);
const tick=(s:CameraRequestGate,instant=false)=>send(s,{type:'exposure-tick',instant});
const usable=(s:CameraRequestGate)=>send(s,{type:'request-result',finished:true,transportSucceeded:true,catalog:'valid'});
const waiting=()=>tick(start(1).state).state;
describe('camera request ownership gate;no transport/catalog/image implementation',()=>{
 it('starts one explicit attempt and one-second pulse timer without a second Go or implicit ready path',()=>{
  const r=start();expect(r.state.phase).toBe('exposing');expect(r.state.remainingSeconds).toBe(2);expect(names(r)).toEqual(['observe-on','initialize-request']);expect(CAMERA_OBSERVE_INTERVAL_MS).toBe(1000);
  const twice=cameraRequestTransition(r.state,{type:'start',seconds:100});expect(twice.state).toBe(r.state);expect(twice.effects).toEqual([]);
  expect(Object.isFrozen(r.state)).toBe(true);expect(Object.isFrozen(r.state.ticket)).toBe(true);expect(Object.isFrozen(r.effects)).toBe(true);expect(r.effects.every(Object.isFrozen)).toBe(true);
 });
 it('counts delivered pulses,then enables polling without preparing on the last exposure pulse',()=>{
  const a=start(),ready=usable(a.state),one=tick(ready.state),zero=tick(one.state);
  expect(one.state.remainingSeconds).toBe(1);expect(one.state.phase).toBe('exposing');expect(one.effects).toEqual([]);
  expect(zero.state.remainingSeconds).toBe(0);expect(zero.state.phase).toBe('waiting');expect(names(zero)).toEqual(['observe-off','poll-on']);
  const poll=send(zero.state,{type:'request-tick'});expect(poll.state.phase).toBe('preparing');expect(names(poll)).toEqual(['poll-off','prepare']);
  expect(send(poll.state,{type:'request-tick'}).effects).toEqual([]);
 });
 it('applies instant configuration on a pulse and supports Int32 duration without hidden clock/seed',()=>{
  const a=start(0x7fffffff);expect(a.state.remainingSeconds).toBe(0x7fffffff);const first=tick(a.state);expect(first.state.remainingSeconds).toBe(0x7ffffffe);
  const instant=tick(first.state,true);expect(instant.state.phase).toBe('waiting');expect(instant.state.remainingSeconds).toBe(0);
  for(const key of['time','date','seed','catalog','image','intervalID'])expect(instant.state).not.toHaveProperty(key);
 });
 it.each([
  ['unfinished',false,false,'unchecked','pending'],
  ['finished is not success',true,false,'valid','transport-error'],
  ['returned but unvalidated',true,true,'unchecked','pending'],
  ['invalid catalog',true,true,'invalid','catalog-error'],
  ['usable',true,true,'valid','usable'],
 ] as const)('distinguishes explicit native flags and caller validation: %s',(_,finished,transportSucceeded,catalog,expected)=>{
  const s=waiting(),r=send(s,{type:'request-result',finished,transportSucceeded,catalog});expect(r.state.request).toBe(expected);expect(r.effects).toEqual([]);
 });
 it('shows wait once,does not treat repeated pulses as success,and prepares once only after usable data',()=>{
  const s=waiting(),wait=send(s,{type:'request-tick'});expect(names(wait)).toEqual(['show-wait']);expect(wait.state.waitShown).toBe(true);
  expect(send(wait.state,{type:'request-tick'}).state).toBe(wait.state);
  const valid=usable(wait.state),prepare=send(valid.state,{type:'request-tick'});expect(names(prepare)).toEqual(['poll-off','hide-wait','prepare']);expect(prepare.state.waitShown).toBe(false);
 });
 it('keeps unsupported distinct through readiness,transport precedence,latching and release acknowledgement',()=>{
  const s=waiting();expect(send(s,{type:'request-result',finished:false,transportSucceeded:true,catalog:'unsupported'}).state.request).toBe('pending');
  expect(send(s,{type:'request-result',finished:true,transportSucceeded:false,catalog:'unsupported'}).state.request).toBe('transport-error');
  const unsupported=send(s,{type:'request-result',finished:true,transportSucceeded:true,catalog:'unsupported'}).state;
  expect(usable(unsupported).state).toBe(unsupported);
  const release=send(unsupported,{type:'request-tick'});expect(release.state.terminal).toBe('unsupported');expect(names(release)).toEqual(['poll-off','release']);
  const ack=send(release.state,{type:'released',ok:true});expect(ack.state.phase).toBe('idle');expect(ack.state.terminal).toBe('unsupported');expect(ack.effects).toEqual([]);
 });
 it.each(['transport-error','catalog-error']as const)('releases %s without requesting or accepting an image',cause=>{
  const s=send(waiting(),{type:'request-tick'}).state,error=send(s,{type:'request-result',finished:true,transportSucceeded:cause==='catalog-error',catalog:'invalid'}).state,r=send(error,{type:'request-tick'});
  expect(r.state.phase).toBe('releasing');expect(r.state.terminal).toBe(cause);expect(names(r)).toEqual(['poll-off','hide-wait','release']);
  const done=send(r.state,{type:'released',ok:true});expect(done.state.phase).toBe('idle');expect(done.state.terminal).toBe(cause);expect(done.effects).toEqual([]);
 });
 it.each(['before-first-tick','partly-elapsed','waiting','preparing']as const)('cancels %s once,waits for owned release,and never commits late output',phase=>{
  let s=start(2).state;
  if(phase==='partly-elapsed')s=tick(s).state;
  if(phase==='waiting'||phase==='preparing')s=tick(s,true).state;
  if(phase==='waiting')s=send(s,{type:'request-tick'}).state;
  if(phase==='preparing')s=send(usable(s).state,{type:'request-tick'}).state;
  const ticket=s.ticket!,cancel=send(s,{type:'cancel'});expect(cancel.state.phase).toBe('releasing');expect(cancel.state.terminal).toBe('cancelled');expect(names(cancel).filter(x=>x==='release')).toHaveLength(1);
  expect(send(cancel.state,{type:'cancel'}).effects).toEqual([]);expect(cameraRequestTransition(cancel.state,{type:'start',seconds:1}).state).toBe(cancel.state);
  expect(cameraRequestTransition(cancel.state,{type:'prepared',ticket,ok:true}).effects).toEqual([]);expect(usable(cancel.state).effects).toEqual([]);
  const done=send(cancel.state,{type:'released',ok:true});expect(done.state.phase).toBe('idle');expect(done.effects).toEqual([]);
 });
 it('holds a failed release without automatic retries or acceptance until independently acknowledged',()=>{
  const s=send(start().state,{type:'cancel'}).state,failed=send(s,{type:'released',ok:false});expect(failed.state.phase).toBe('release-error');expect(failed.effects).toEqual([]);
  expect(cameraRequestTransition(failed.state,{type:'start',seconds:1}).state).toBe(failed.state);expect(send(failed.state,{type:'released',ok:false}).effects).toEqual([]);
  const verified=send(failed.state,{type:'released',ok:true});expect(verified.state.phase).toBe('idle');expect(verified.effects).toEqual([]);
 });
 it('releases a failed initializer and disables the already enabled timer without a replacement image',()=>{
  const s=start().state,r=send(s,{type:'initialization-failed'});expect(r.state.terminal).toBe('initialization-error');expect(names(r)).toEqual(['observe-off','release']);
  expect(usable(r.state).effects).toEqual([]);expect(send(r.state,{type:'released',ok:true}).effects).toEqual([]);
 });
 it('closes a delayed initializer failure after exposure has ended and waiting is visible',()=>{
  const s=send(waiting(),{type:'request-tick'}).state,r=send(s,{type:'initialization-failed'});expect(r.state.terminal).toBe('initialization-error');expect(names(r)).toEqual(['poll-off','hide-wait','release']);
  expect(send(r.state,{type:'released',ok:true}).effects).toEqual([]);
 });
 it.each([true,false])('accepts a prepared image only once after release;preparation ok=%s',ok=>{
  const s=send(usable(waiting()).state,{type:'request-tick'}).state,ticket=s.ticket!,r=send(s,{type:'prepared',ok});expect(names(r)).toEqual(['release']);expect(r.state.terminal).toBe(ok?'completed':'preparation-error');
  const blocked=send(r.state,{type:'released',ok:false});expect(blocked.state.phase).toBe('release-error');expect(blocked.effects).toEqual([]);
  const accepted=send(blocked.state,{type:'released',ok:true});expect(names(accepted)).toEqual(ok?['accept-prepared']:[]);expect(accepted.state.phase).toBe('idle');
  expect(cameraRequestTransition(accepted.state,{type:'released',ticket,ok:true}).effects).toEqual([]);
 });
 it('cancels an already prepared but unreleased result without another release or losing previous work',()=>{
  const old=Object.freeze({manualAnswer:'K2',imageSHA:'original-owned-frame',notes:'retain me'});let visible:Readonly<{manualAnswer:string;imageSHA:string;notes:string}>=old;
  const preparing=send(usable(waiting()).state,{type:'request-tick'}).state,r=send(preparing,{type:'prepared',ok:true}),cancel=send(r.state,{type:'cancel'});
  expect(cancel.effects).toEqual([]);const ack=send(cancel.state,{type:'released',ok:true});if(names(ack).includes('accept-prepared'))visible={...old,imageSHA:'new-frame'};
  expect(visible).toBe(old);expect(ack.state.terminal).toBe('cancelled');expect(ack.effects).toEqual([]);
 });
 it('discards every previous attempt callback after reentry even when its flags are malformed',()=>{
  const first=start(1).state,old=first.ticket!,closed=send(send(first,{type:'cancel'}).state,{type:'released',ok:true}).state,next=cameraRequestTransition(closed,{type:'start',seconds:5}).state;
  expect(next.ticket).not.toBe(old);
  for(const e of[{type:'request-result',finished:true,transportSucceeded:true,catalog:'valid'},{type:'request-result',finished:'bad',transportSucceeded:'bad',catalog:'bad'},{type:'prepared',ok:true},{type:'released',ok:true},{type:'cancel'},{type:'exposure-tick',instant:true},{type:'request-tick'}]){
   const r=cameraRequestTransition(next,{...e,ticket:old}as CameraGateEvent);expect(r.state).toBe(next);expect(r.effects).toEqual([]);
  }
 });
 it('rejects malformed admission atomically and refuses JSON restoration of a running lease',()=>{
  const initial=createCameraRequestGate();for(const seconds of[0,-1,1.5,0x80000000,NaN,Infinity])expect(()=>cameraRequestTransition(initial,{type:'start',seconds})).toThrow(CameraRequestGateError);
  const s=start().state;expect(()=>cameraRequestTransition(JSON.parse(JSON.stringify(s)),{type:'start',seconds:1})).toThrow(CameraRequestGateError);
  expect(()=>cameraRequestTransition(s,{type:'exposure-tick',ticket:s.ticket!,instant:1}as never)).toThrow(CameraRequestGateError);
  expect(()=>cameraRequestTransition(s,{type:'request-result',ticket:s.ticket!,finished:true,transportSucceeded:'yes',catalog:'valid'}as never)).toThrow(CameraRequestGateError);
  expect(s.remainingSeconds).toBe(2);expect(initial.phase).toBe('idle');
 });
});
