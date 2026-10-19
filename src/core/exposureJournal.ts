import {advanceExposure,createExposure,pauseExposure,resetExposure,startExposure,type Exposure} from './exposure';
export const MAX_JOURNAL_EVENTS=12000,MAX_JOURNAL_TICK_MS=1000;
export class JournalError extends Error {
 constructor(readonly code:'proof'|'phase'|'seed'|'time-gap'|'journal-limit'|'session'|'no-data'){super(`Bounded exposure: ${code}`);this.name='JournalError';}
}
export type JournalEvent=Readonly<{kind:'start'|'pause'}|{kind:'tick';deltaMs:number}>;
const brand:unique symbol=Symbol('bounded-exposure-journal');
export type JournalState=Readonly<{[brand]:true;policy:string;armed:boolean;seedAtReset:number;exposure:Exposure;events:readonly JournalEvent[]}>;
function checked(s:JournalState):void {if(!s||s[brand]!==true)throw new JournalError('phase');}
function freeze(s:JournalState):JournalState {return Object.freeze(s);}
function append(s:JournalState,event:JournalEvent,exposure:Exposure):JournalState {
  if(s.events.length>=MAX_JOURNAL_EVENTS)throw new JournalError('journal-limit');
  return freeze({...s,exposure,events:Object.freeze([...s.events,Object.freeze(event)])});
}
export function parseJournalSeed(value:string):number {
  if(!/^\d{1,10}$/.test(value.trim()))throw new JournalError('seed');
  const n=Number(value);if(n>0xffff_ffff)throw new JournalError('seed');return n;
}
export function createJournalExposure(policy:string,sourceMeans:readonly number[]|null,skyMean:number,multiplier:number,seed:number):JournalState {
  if(!Number.isInteger(seed)||seed<0||seed>0xffff_ffff)throw new JournalError('seed');
  return freeze({[brand]:true,policy,armed:false,seedAtReset:seed,exposure:createExposure(sourceMeans,skyMean,multiplier,seed),events:Object.freeze([])});
}
export function activateJournal(s:JournalState):JournalState {checked(s);return s.armed?s:freeze({...s,armed:true});}
export function startJournal(s:JournalState):JournalState {
  checked(s);if(!s.armed)throw new JournalError('phase');
  if(s.events.length>=MAX_JOURNAL_EVENTS-2)throw new JournalError('journal-limit');
  return append(s,{kind:'start'},startExposure(s.exposure));
}
export function tickJournal(s:JournalState,deltaMs:number):JournalState {
  checked(s);if(!s.armed||s.exposure.phase!=='running')throw new JournalError('phase');
  if(!Number.isInteger(deltaMs)||deltaMs<0||deltaMs>MAX_JOURNAL_TICK_MS)throw new JournalError('time-gap');
  if(s.events.length>=MAX_JOURNAL_EVENTS-1)throw new JournalError('journal-limit');
  return append(s,{kind:'tick',deltaMs},advanceExposure(s.exposure,deltaMs));
}
/** Stop does not integrate an uncommitted timer tail. */
export function pauseJournal(s:JournalState):JournalState {checked(s);return s.exposure.phase==='running'?append(s,{kind:'pause'},pauseExposure(s.exposure)):s;}
export function deactivateJournal(s:JournalState):JournalState {checked(s);const paused=pauseJournal(s);return paused.armed?freeze({...paused,armed:false}):paused;}
/** New browser compound Stop→Reset, not a reset while the native timer runs.
 * The current RNG survives; journal rebases to the new cleared segment. */
export function resetJournal(s:JournalState):JournalState {
  checked(s);const stopped=s.exposure.phase==='running'?pauseExposure(s.exposure):s.exposure;
  return freeze({...s,seedAtReset:stopped.seed,exposure:resetExposure(stopped),events:Object.freeze([])});
}
export function cancelJournal(s:JournalState):JournalState {return deactivateJournal(resetJournal(s));}
export function replayJournal(factory:(seed:number)=>JournalState,seedAtReset:number,events:readonly JournalEvent[]):JournalState {
  if(!Array.isArray(events)||events.length>MAX_JOURNAL_EVENTS)throw new JournalError('session');
  let s=activateJournal(factory(seedAtReset));
  for(const event of events){
    if(!event||typeof event!=='object'||Array.isArray(event))throw new JournalError('session');
    if(event.kind==='tick'&&Object.keys(event).length===2&&Object.hasOwn(event,'deltaMs'))s=tickJournal(s,event.deltaMs);
    else if(event.kind==='start'&&Object.keys(event).length===1)s=startJournal(s);
    else if(event.kind==='pause'&&Object.keys(event).length===1&&s.exposure.phase==='running')s=pauseJournal(s);
    else throw new JournalError('session');
  }
  // Portable v1 is deliberately a stopped snapshot; restoring never starts a timer.
  if(s.exposure.phase==='running')throw new JournalError('session');
  return deactivateJournal(s);
}
