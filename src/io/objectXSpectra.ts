// E08: the spectra the student keeps in the Object X investigation, saved inside the v29 wrapper (analysisSession.ts; the v28
// Object X section is unchanged). A record holds what the exposure journal needs to rebuild the spectrum and nothing that names
// the object: the student's label, the opaque target code, the telescope, the seed at reset and the journal events. Restore
// never trusts stored counts: each record is re-evaluated through the spectrometer (io/objectXSpectrometer.ts) and replayed;
// a record whose field is not available or whose journal does not replay rejects the whole file. A loading failure is the
// retryable 'resources' error.
import type {JournalEvent} from '../core/exposureJournal';
import {MAX_JOURNAL_EVENTS} from '../core/exposureJournal';
import {parseHtl,type HtlList} from '../core/hotList';
import {objectXCode} from '../core/objectXLab';
import type {FieldTelescope} from '../core/fieldEngine';

export const OBJECT_X_SPECTRA_POLICY='openvireo-objectx-spectra-v29';
/** Own bounds: 8 kept spectra, 40-character labels, each journal within the exposure journal's own event limit. */
export const OBJECT_X_SPECTRA_LIMITS=Object.freeze({spectra:8,label:40});
export type ObjectXSpectrumRecord=Readonly<{label:string;code:string;telescope:FieldTelescope;seedAtReset:number;events:readonly JournalEvent[]}>;
export class ObjectXSpectraError extends Error{constructor(readonly code:'format'|'replay'|'resources'){super(`Object X spectra: ${code}`);this.name='ObjectXSpectraError';}}
const fail=(code:ObjectXSpectraError['code']):never=>{throw new ObjectXSpectraError(code);};
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const LABEL=/^[^\u0000-\u001f\u007f]{1,40}$/;
function readEvents(v:unknown):readonly JournalEvent[]{
 if(!Array.isArray(v)||v.length<1||v.length>MAX_JOURNAL_EVENTS)return fail('format');
 return Object.freeze(v.map(e=>{
  if(!isObject(e))return fail('format');
  if(e.kind==='tick'&&Object.keys(e).length===2&&Number.isInteger(e.deltaMs))return Object.freeze({kind:'tick' as const,deltaMs:e.deltaMs as number});
  if((e.kind==='start'||e.kind==='pause')&&Object.keys(e).length===1)return Object.freeze({kind:e.kind});
  return fail('format');
 }));
}
/** Shape check only (no replay). */
export function readObjectXSpectra(value:unknown):readonly ObjectXSpectrumRecord[]{
 if(!Array.isArray(value)||value.length<1||value.length>OBJECT_X_SPECTRA_LIMITS.spectra)return fail('format');
 return Object.freeze(value.map(r=>{
  if(!isObject(r)||Object.keys(r).length!==5)return fail('format');
  const {label,code,telescope,seedAtReset,events}=r;
  if(typeof label!=='string'||!LABEL.test(label)||typeof code!=='string'||!/^X-[0-9A-Z]{5}$/.test(code)||(telescope!==0&&telescope!==1&&telescope!==2)||!Number.isInteger(seedAtReset)||(seedAtReset as number)<0||(seedAtReset as number)>0xffff_ffff)return fail('format');
  return Object.freeze({label,code,telescope:telescope as FieldTelescope,seedAtReset:seedAtReset as number,events:readEvents(events)});
 }));
}
export function portableObjectXSpectra(list:readonly ObjectXSpectrumRecord[]):unknown{
 return list.map(r=>({label:r.label,code:r.code,telescope:r.telescope,seedAtReset:r.seedAtReset,events:r.events.map(e=>({...e}))}));
}
/** Where admission gets ObjectX.HTL and the spectrometer (browser: bundled file and the Worker; tests: a seam). */
export type ObjectXSpectraSources=Readonly<{hotList:()=>Promise<HtlList>;observe:typeof import('./objectXSpectrometer').observeObjectXSpectrum}>;
async function browserSources():Promise<ObjectXSpectraSources>{
 const [{fetchObjectXHotList},{observeObjectXSpectrum}]=await Promise.all([import('./bundledOrbitFile'),import('./objectXSpectrometer')]);
 return {hotList:async()=>parseHtl((await fetchObjectXHotList(fetch,new AbortController().signal)).bytes),observe:observeObjectXSpectrum};
}
let seam:ObjectXSpectraSources|null=null;
/** Test seam: ObjectX.HTL and the spectrometer from recorded local bytes; null restores the browser sources. */
export function setObjectXSpectraSources(s:ObjectXSpectraSources|null){seam=s;}
/** Shape check, then every record re-evaluated and replayed. */
export async function admitObjectXSpectra(value:unknown,sources?:ObjectXSpectraSources):Promise<readonly ObjectXSpectrumRecord[]>{
 const list=readObjectXSpectra(value);
 let s:ObjectXSpectraSources,rows:HtlList;
 try{s=sources??seam??await browserSources();rows=await s.hotList();}catch{return fail('resources');}
 for(const r of list){
  const row=rows.find(x=>objectXCode(x.id)===r.code);if(!row)fail('replay');
  let view;try{view=await s.observe({ra:row!.ra,dec:row!.dec},r.telescope);}catch{return fail('resources');}
  if(view.status!=='available')fail('replay');
  try{const replayed=view.status==='available'?view.engine.replay(r.seedAtReset,r.events):null;if(!replayed||replayed.exposure.elapsedMs<=0)fail('replay');}catch(e){if(e instanceof ObjectXSpectraError)throw e;fail('replay');}
 }
 return list;
}
