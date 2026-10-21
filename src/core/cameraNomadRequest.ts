import {cameraNomadReferenceContext,readCameraNomadReferenceResponse,type CameraQueryReference} from './cameraQueryReference';
import {NativeNomadResponseError,type NomadResponse,type NomadCandidateEntry} from './nativeNomadResponse';
import {orderNativeNomadEntries} from './nativeNomadOrder';

export class CameraNomadRequestError extends Error {
 constructor(readonly code:'state'|'event'){super(`Camera NOMAD request owner: ${code}`);this.name='CameraNomadRequestError';}
}
const stateBrand:unique symbol=Symbol('camera-nomad-owner');
const ticketBrand:unique symbol=Symbol('camera-nomad-ticket');
export type CameraNomadTicket=Readonly<{[ticketBrand]:true}>;
export type CameraNomadCatalog=Readonly<{
 reference:CameraQueryReference;response:NomadResponse;entries:readonly NomadCandidateEntry[];
}>;
export type CameraNomadRequest=Readonly<{
 [stateBrand]:true;
 status:'idle'|'pending'|'valid-empty'|'valid-data'|'transport-error'|'catalog-error'|'unsupported'|'cancelled';
 ticket:CameraNomadTicket|null;reference:CameraQueryReference|null;
 activeCatalog:CameraNomadCatalog|null;previousCatalog:CameraNomadCatalog|null;
 acceptedRowCount:number;invalidRowCount:number;catalogError:NativeNomadResponseError['code']|null;
 catalogErrorLineNumber:number|null;
}>;
const owned=new WeakSet<object>();
function state(fields:Omit<CameraNomadRequest,typeof stateBrand>):CameraNomadRequest {
 const result=Object.freeze({[stateBrand]:true as const,...fields});owned.add(result);return result;
}
function requireState(value:CameraNomadRequest):void {
 if(!value||!owned.has(value))throw new CameraNomadRequestError('state');
}
export function createCameraNomadRequest():CameraNomadRequest {
 return state({status:'idle',ticket:null,reference:null,activeCatalog:null,previousCatalog:null,acceptedRowCount:0,invalidRowCount:0,catalogError:null,catalogErrorLineNumber:null});
}
/** New-request catalog clearing59c485 and compiled query/date reference.
 * Previous response retention and immutable tickets are explicit web guards.
 * No transport/exposure/cleanup is performed;the camera lifecycle still owns it. */
export function beginCameraNomadRequest(current:CameraNomadRequest,reference:CameraQueryReference):CameraNomadRequest {
 requireState(current);
 // Reentry is deliberately ignored,including its unused inputs. The returned
 // object's reference is authoritative;this is not a queue or a switch to B.
 if(current.status==='pending')return current;
 cameraNomadReferenceContext(reference);
 const previousCatalog=current.activeCatalog??current.previousCatalog;
 return state({status:'pending',ticket:Object.freeze({[ticketBrand]:true as const}),reference,activeCatalog:null,previousCatalog,acceptedRowCount:0,invalidRowCount:0,catalogError:null,catalogErrorLineNumber:null});
}
export type CameraNomadReply=Readonly<{ticket:CameraNomadTicket;finished:boolean;transportSucceeded:boolean;bytes?:Uint8Array}>;
/** The fresh DL0 path only. Finished and transport success remain distinct;
 * a valid header/body with zero accepted rows is not a transport/catalog error.
 * Caller flags describe a supplied reply,not authenticated original transport. */
export function receiveCameraNomadReply(current:CameraNomadRequest,reply:CameraNomadReply):CameraNomadRequest {
 requireState(current);
 if(!reply||typeof reply!=='object')throw new CameraNomadRequestError('event');
 if(current.status!=='pending'||reply.ticket!==current.ticket)return current;
 if(typeof reply.finished!=='boolean'||typeof reply.transportSucceeded!=='boolean')throw new CameraNomadRequestError('event');
 if(!reply.finished)return current;
 if(!reply.transportSucceeded)return state({...current,status:'transport-error'});
 const bytes=reply.bytes;
 if(!(bytes instanceof Uint8Array))throw new CameraNomadRequestError('event');
 let response:NomadResponse;
 try{response=readCameraNomadReferenceResponse(bytes,current.reference!);}
 catch(error){
  if(!(error instanceof NativeNomadResponseError))throw error;
  return state({...current,status:error.code==='unsupported-units'?'unsupported':'catalog-error',catalogError:error.code,catalogErrorLineNumber:error.lineNumber??null});
 }
 const entries=orderNativeNomadEntries(response.entries.filter((entry):entry is NomadCandidateEntry=>entry.result.kind==='candidate'));
 const invalidRowCount=response.entries.filter(entry=>entry.result.kind==='invalid').length,acceptedRowCount=entries.length;
 const activeCatalog=Object.freeze({reference:current.reference!,response,entries});
 return state({...current,status:acceptedRowCount===0?'valid-empty':'valid-data',activeCatalog,acceptedRowCount,invalidRowCount});
}
/** Stops this parser owner only;does not terminate or acknowledge any worker.
 * A real adapter must also use the separate camera lifecycle's release gate. */
export function cancelCameraNomadRequest(current:CameraNomadRequest,ticket:CameraNomadTicket):CameraNomadRequest {
 requireState(current);
 if(current.status!=='pending'||ticket!==current.ticket)return current;
 return state({...current,status:'cancelled'});
}
