import {nativeNomadLayout,readNativeNomadRow,NativeNomadError,type NomadLayout,type NomadRowContext,type NomadRowResult,nativeNomadCandidateInSelection,type NomadSelection} from './nativeNomadRows';
import {orderNativeNomadEntries} from './nativeNomadOrder';

export class NativeNomadResponseError extends Error {
 constructor(readonly code:'size'|'encoding'|'line-limit'|'marker'|'header'|'context'|'ownership'|'selection',readonly lineNumber?:number){super(`NOMAD response contract: ${code}${lineNumber===undefined?'':` (line ${lineNumber})`}`);this.name='NativeNomadResponseError';}
}
export type NomadResponseLine=Readonly<{lineNumber:number;startByte:number;endByte:number;terminated:boolean;text:string}>;
export type NomadResponseEntry=Readonly<{
 line:NomadResponseLine;
 result:NomadRowResult|Readonly<{kind:'comment'}>|Readonly<{kind:'invalid';code:NativeNomadError['code'];field?:string}>;
}>;
export type NomadResponse=Readonly<{
 originalText:string;layout:NomadLayout;context:NomadRowContext;
 preamble:readonly NomadResponseLine[];marker:NomadResponseLine;header:NomadResponseLine;units:NomadResponseLine;
 entries:readonly NomadResponseEntry[];
}>;
const ownedResponses=new WeakSet<object>();
/** Static framing0x59c620/0x59ced4 and LF helper0x48672c.
 * LF/printable ASCII only is an explicit web subset,not encoding repair.
 * A parsed response is not a request/cache/catalog/observing certificate. */
export function readNativeNomadResponse(bytes:Uint8Array,context:NomadRowContext):NomadResponse {
 if(!(bytes instanceof Uint8Array)||bytes.length===0||bytes.length>2*1024*1024)throw new NativeNomadResponseError('size');
 if(!context||!['B','V','R','J','H','K'].includes(context.band)||!Number.isFinite(context.epochOffsetYears)||Math.abs(context.epochOffsetYears)>1000)throw new NativeNomadResponseError('context');
 // Snapshot before parsing;caller buffer changes cannot alter retained text/cells.
 const owned=bytes.slice(),parts:string[]=[],lines:NomadResponseLine[]=[];let start=0;
 const append=(end:number,terminated:boolean)=>{
  if(end-start>4096||lines.length>=10000)throw new NativeNomadResponseError('line-limit',lines.length+1);
  const text=String.fromCharCode(...owned.subarray(start,end));
  lines.push(Object.freeze({lineNumber:lines.length+1,startByte:start,endByte:end,terminated,text}));
  parts.push(text,terminated?'\n':'');start=end+1;
 };
 for(let i=0;i<owned.length;i++){
  const b=owned[i];if(b===10)append(i,true);else if(b<32||b>126)throw new NativeNomadResponseError('encoding',lines.length+1);
 }
 // A trailing LF consumes its delimiter;it does not invent an empty final row.
 if(start<owned.length)append(owned.length,false);
 const markerIndex=lines.findIndex(l=>l.text.startsWith('END')||l.text.startsWith('#END'));
 if(markerIndex<0)throw new NativeNomadResponseError('marker');
 const marker=lines[markerIndex],header=lines[markerIndex+1],units=lines[markerIndex+2];
 if(!header||!units)throw new NativeNomadResponseError('header',marker.lineNumber+1);
 let layout:NomadLayout;
 try{layout=nativeNomadLayout(header.text,units.text);}catch(e){if(e instanceof NativeNomadError)throw new NativeNomadResponseError('header',e.code==='format'?units.lineNumber:header.lineNumber);throw e;}
 const ownedContext=Object.freeze({band:context.band,epochOffsetYears:context.epochOffsetYears});
 const entries=lines.slice(markerIndex+3).map(line=>{
  if(line.text.startsWith('#'))return Object.freeze({line,result:Object.freeze({kind:'comment' as const})});
  try{return Object.freeze({line,result:readNativeNomadRow(layout,line.text,ownedContext)});}
  catch(e){
   // Source numeric-row failures return false and the body loop continues.
   // Stricter web admission failures remain visible,not erased or repaired.
   if(!(e instanceof NativeNomadError))throw e;
   return Object.freeze({line,result:Object.freeze({kind:'invalid' as const,code:e.code,...(e.field===undefined?{}:{field:e.field})})});
  }
 });
 const response=Object.freeze({originalText:parts.join(''),layout,context:ownedContext,preamble:Object.freeze(lines.slice(0,markerIndex)),marker,header,units,entries:Object.freeze(entries)});
 ownedResponses.add(response);return response;
}

export type NomadCandidateEntry=Readonly<{line:NomadResponseLine;result:Extract<NomadRowResult,{kind:'candidate'}>}>;
export type NomadSourceLists=Readonly<{response:NomadResponse;bounds:NomadSelection;catalogEntries:readonly NomadCandidateEntry[];selectedEntries:readonly NomadCandidateEntry[];nativeMinimumMagnitude:number;nativeMaximumMagnitude:number;hasSources:boolean}>;
/** Native catalog insertion then0x59cc88 selection/insertion and extrema.
 * Exact parsed-object ownership is a web guard,not real catalog authority. */
export function nativeNomadSourceLists(response:NomadResponse,bounds:NomadSelection):NomadSourceLists {
 if(!response||!ownedResponses.has(response))throw new NativeNomadResponseError('ownership');
 if(!bounds||![bounds.minRAHours,bounds.maxRAHours,bounds.minDecDegrees,bounds.maxDecDegrees,bounds.magnitudeLimit].every(Number.isFinite)||!Object.is(bounds.magnitudeLimit,Math.fround(bounds.magnitudeLimit)))throw new NativeNomadResponseError('selection');
 const ownedBounds=Object.freeze({minRAHours:bounds.minRAHours,maxRAHours:bounds.maxRAHours,minDecDegrees:bounds.minDecDegrees,maxDecDegrees:bounds.maxDecDegrees,magnitudeLimit:bounds.magnitudeLimit});
 const catalogEntries=orderNativeNomadEntries(response.entries.filter((e):e is NomadCandidateEntry=>e.result.kind==='candidate'));
 const selectedEntries=orderNativeNomadEntries(catalogEntries.filter(e=>nativeNomadCandidateInSelection(e.result.row,ownedBounds)));
 let nativeMinimumMagnitude=25,nativeMaximumMagnitude=-2;
 for(const e of selectedEntries){const m=e.result.row.selectedMagnitude;if(m<nativeMinimumMagnitude)nativeMinimumMagnitude=m;if(m>nativeMaximumMagnitude)nativeMaximumMagnitude=m;}
 return Object.freeze({response,bounds:ownedBounds,catalogEntries,selectedEntries,nativeMinimumMagnitude,nativeMaximumMagnitude,hasSources:selectedEntries.length!==0});
}
