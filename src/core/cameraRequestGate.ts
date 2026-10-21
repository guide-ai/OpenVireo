/** Camera callback ordering plus explicit web ownership guards.
 * No transport, catalog, image, RNG, clock, locale parser or persisted state.
 * Source and adaptation boundaries: docs/CAMERA-REQUEST-GATE.md. */
export class CameraRequestGateError extends Error {
 constructor(readonly code:'state'|'event'|'seconds') {super(`Camera request gate: ${code}`);this.name='CameraRequestGateError';}
}
const stateBrand:unique symbol=Symbol('camera-request-gate');
const ticketBrand:unique symbol=Symbol('camera-request-ticket');
export type CameraRequestTicket=Readonly<{[ticketBrand]:true}>;
export type CameraRequestOutcome='pending'|'usable'|'transport-error'|'catalog-error'|'unsupported';
export type CameraGateOutcome='none'|'completed'|'cancelled'|'initialization-error'|'transport-error'|'catalog-error'|'unsupported'|'preparation-error';
export const CAMERA_OBSERVE_INTERVAL_MS=1000;
export type CameraRequestGate=Readonly<{
 [stateBrand]:true;
 phase:'idle'|'exposing'|'waiting'|'preparing'|'releasing'|'release-error';
 ticket:CameraRequestTicket|null;
 requestedSeconds:number;remainingSeconds:number;
 request:CameraRequestOutcome;waitShown:boolean;terminal:CameraGateOutcome;
}>;
export type CameraGateEffect=Readonly<{
 type:'initialize-request'|'observe-on'|'observe-off'|'poll-on'|'poll-off'|'show-wait'|'hide-wait'|'prepare'|'release'|'accept-prepared';
 ticket:CameraRequestTicket;
}>;
export type CameraGateEvent=
 |Readonly<{type:'start';seconds:number}>
 |Readonly<{type:'exposure-tick';ticket:CameraRequestTicket;instant:boolean}>
 |Readonly<{type:'request-result';ticket:CameraRequestTicket;finished:boolean;transportSucceeded:boolean;catalog:'unchecked'|'valid'|'invalid'|'unsupported'}>
 |Readonly<{type:'request-tick';ticket:CameraRequestTicket}>
 |Readonly<{type:'prepared';ticket:CameraRequestTicket;ok:boolean}>
 |Readonly<{type:'initialization-failed';ticket:CameraRequestTicket}>
 |Readonly<{type:'cancel';ticket:CameraRequestTicket}>
 |Readonly<{type:'released';ticket:CameraRequestTicket;ok:boolean}>;
export type CameraGateTransition=Readonly<{state:CameraRequestGate;effects:readonly CameraGateEffect[]}>;

function owned(p:Omit<CameraRequestGate,typeof stateBrand>):CameraRequestGate {
 return Object.freeze({[stateBrand]:true as const,...p});
}
export function createCameraRequestGate():CameraRequestGate {
 return owned({phase:'idle',ticket:null,requestedSeconds:0,remainingSeconds:0,request:'pending',waitShown:false,terminal:'none'});
}
const names=['start','exposure-tick','request-result','request-tick','prepared','initialization-failed','cancel','released'];
/** Effects are commands for a future adapter,not executed side effects. It must
 * own parsed catalog/prepared image/release acknowledgement under this ticket.
 * A 'valid' verdict is an explicit dependency,not produced by this module. */
export function cameraRequestTransition(s:CameraRequestGate,e:CameraGateEvent):CameraGateTransition {
 if(!s||s[stateBrand]!==true)throw new CameraRequestGateError('state');
 if(!e||typeof e!=='object'||!names.includes(e.type))throw new CameraRequestGateError('event');
 const unchanged=()=>Object.freeze({state:s,effects:Object.freeze([])});
 const transition=(state:CameraRequestGate,types:CameraGateEffect['type'][]):CameraGateTransition=>Object.freeze({state,effects:Object.freeze(types.map(type=>Object.freeze({type,ticket:state.ticket??s.ticket!})))});
 if(e.type==='start') {
  // Native disabled Go cannot create a second attempt. No implicit restart.
  if(s.phase!=='idle')return unchanged();
  if(!Number.isInteger(e.seconds)||e.seconds<1||e.seconds>0x7fffffff)throw new CameraRequestGateError('seconds');
  const ticket=Object.freeze({[ticketBrand]:true as const});
  return transition(owned({phase:'exposing',ticket,requestedSeconds:e.seconds,remainingSeconds:e.seconds,request:'pending',waitShown:false,terminal:'none'}),['observe-on','initialize-request']);
 }
 // Browser guard: foreign/late callbacks cannot affect a later attempt.
 if(!s.ticket||e.ticket!==s.ticket)return unchanged();
 const release=(terminal:CameraGateOutcome)=>{
  const stop:CameraGateEffect['type'][]=s.phase==='exposing'?['observe-off']:s.phase==='waiting'?['poll-off']:[];
  if(s.waitShown)stop.push('hide-wait');stop.push('release');
  return transition(owned({...s,phase:'releasing',waitShown:false,terminal}),stop);
 };
 switch(e.type) {
  case 'initialization-failed': {
   if(s.phase!=='exposing'&&s.phase!=='waiting')return unchanged();
   return release('initialization-error');
  }
  case 'exposure-tick': {
   if(s.phase!=='exposing')return unchanged();
   if(typeof e.instant!=='boolean')throw new CameraRequestGateError('event');
   const remainingSeconds=e.instant?0:s.remainingSeconds-1;
   return transition(owned({...s,remainingSeconds,phase:remainingSeconds===0?'waiting':'exposing'}),remainingSeconds===0?['observe-off','poll-on']:[]);
  }
  case 'request-result': {
   if(!['exposing','waiting'].includes(s.phase)||s.request!=='pending')return unchanged();
   if(typeof e.finished!=='boolean'||typeof e.transportSucceeded!=='boolean'||!['unchecked','valid','invalid','unsupported'].includes(e.catalog))throw new CameraRequestGateError('event');
   const request:CameraRequestOutcome=!e.finished?'pending':!e.transportSucceeded?'transport-error':e.catalog==='unsupported'?'unsupported':e.catalog==='invalid'?'catalog-error':e.catalog==='valid'?'usable':'pending';
   if(request===s.request)return unchanged();
   return transition(owned({...s,request}),[]);
  }
  case 'request-tick': {
   if(s.phase!=='waiting')return unchanged();
   if(s.request==='pending')return s.waitShown?unchanged():transition(owned({...s,waitShown:true}),['show-wait']);
   if(s.request!=='usable')return release(s.request);
   const effects:CameraGateEffect['type'][]=['poll-off'];if(s.waitShown)effects.push('hide-wait');effects.push('prepare');
   return transition(owned({...s,phase:'preparing',waitShown:false}),effects);
  }
  case 'prepared': {
   if(s.phase!=='preparing')return unchanged();
   if(typeof e.ok!=='boolean')throw new CameraRequestGateError('event');
   return release(e.ok?'completed':'preparation-error');
  }
  case 'cancel': {
   // Uniform cancellation,including before the first pulse,is an explicit web
   // safeguard. The original strict partially-elapsed Stop branch is different.
   if(s.phase==='releasing'||s.phase==='release-error')return s.terminal==='cancelled'?unchanged():transition(owned({...s,terminal:'cancelled'}),[]);
   return release('cancelled');
  }
  case 'released': {
   if(s.phase!=='releasing'&&s.phase!=='release-error')return unchanged();
   if(typeof e.ok!=='boolean')throw new CameraRequestGateError('event');
   if(!e.ok)return s.phase==='release-error'?unchanged():transition(owned({...s,phase:'release-error'}),[]);
   // No automatic cleanup retry. Only an adapter's verified acknowledgement
   // unlocks Go;acceptance is emitted exactly once after successful release.
   return transition(owned({...createCameraRequestGate(),terminal:s.terminal}),s.terminal==='completed'?['accept-prepared']:[]);
  }
 }
}
