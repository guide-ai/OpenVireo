import {isLegacyPhotometerTarget} from '../core/photometerField';
import {MAX_PHOTOMETER_EVENTS,PhotometerError,replayPhotometer,type PhotometerState,type PhotometerEvent} from '../core/photometer';
import {photometerJournalVersion,photometerJournalHeader,photometerJournalText,photometerJournalFits,MAX_PHOTOMETER_SESSION_BYTES,PHOTOMETER_FIELD_SHA256,PHOTOMETER_UBV_SHA256,PHOTOMETER_TARGETS_SHA256} from '../core/photometerJournal';
export {MAX_PHOTOMETER_SESSION_BYTES,PHOTOMETER_FIELD_SHA256,PHOTOMETER_UBV_SHA256,PHOTOMETER_TARGETS_SHA256};
/** New bounded web journal; never presented as the native text report or v7. */
export function serializePhotometerSession(s:PhotometerState):string {
 if(s.armed||s.phase==='running')throw new PhotometerError('phase');
 const timed=s.events.some(e=>e.type==='timing'||e.type==='advance');if(timed!==!!s.timing)throw new PhotometerError('session');
 const text=photometerJournalText(s.seedAtStart,s.events);if(new TextEncoder().encode(text).length>MAX_PHOTOMETER_SESSION_BYTES)throw new PhotometerError('session');return text;
}

export function parsePhotometerSession(value:unknown):PhotometerState {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new PhotometerError('session');
 const r=value as Record<string,unknown>;
 if(typeof r.seedAtStart!=='number'||!Array.isArray(r.events)||r.events.length>MAX_PHOTOMETER_EVENTS)throw new PhotometerError('session');
 const events=r.events as PhotometerEvent[],version=photometerJournalVersion(events),header=photometerJournalHeader(version),keys=[...Object.keys(header),'seedAtStart','events'];
 if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||Object.entries(header).some(([k,v])=>r[k]!==v))throw new PhotometerError('session');
 const timed=events.some(e=>e?.type==='timing');
 if((events.some(e=>e?.type==='advance')&&!timed)||(version<5&&events.some(e=>e?.type==='target'&&!isLegacyPhotometerTarget(e.targetId))))throw new PhotometerError('session');
 if(!photometerJournalFits(r.seedAtStart,r.events as PhotometerEvent[]))throw new PhotometerError('session');
 // Owner8+ rejects dropped/coalesced events;Number/JSON token spelling is not a byte-canonical input requirement.
 let s:PhotometerState;try{s=replayPhotometer(r.seedAtStart,r.events as PhotometerEvent[]);}catch{throw new PhotometerError('session');}if(s.armed||s.phase==='running'||timed!==!!s.timing||(version>=8&&events.length!==s.events.length))throw new PhotometerError('session');return s;
}
export async function readPhotometerSession(file:File):Promise<PhotometerState>{
 if(file.size>MAX_PHOTOMETER_SESSION_BYTES)throw new PhotometerError('session');const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_PHOTOMETER_SESSION_BYTES)throw new PhotometerError('session');
 let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new PhotometerError('session');}return parsePhotometerSession(parsed);
}
