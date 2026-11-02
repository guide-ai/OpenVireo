// Front F4: the approved galaxy photographs (core/approvedPhotographs.ts, 175 files) are fetched one at a time, only when a
// field's pack names them (photographsInPack), never the whole list up front. Each decoded bitmap is kept for the page's
// lifetime (6.7 MB at most if a student visited every photographed galaxy). The caller's reader checks size and SHA-256 before
// decoding; nothing is persisted or sent anywhere.
import {decodeBitmap8,type Bitmap8} from '../core/photographDraw';
import {photographsInPack,type ApprovedPhotograph} from '../core/approvedPhotographs';
import type {PhotographRow} from '../core/photographicList';
import type {FieldPack} from '../core/fieldPack';
import type {FieldPhotographs} from '../core/fieldEngine';

/** Reads one approved photograph's bytes, checked for its recorded size and SHA-256 (throws otherwise). */
export type PhotographReader=(p:ApprovedPhotograph)=>Promise<Uint8Array>;
/** The field engine's `photographs` option for a pack: the GLIMAGES.LST rows and the bitmaps of the photographs the pack names. */
export type PackPhotographs=(pack:FieldPack,rows:readonly PhotographRow[],signal?:AbortSignal)=>Promise<FieldPhotographs>;
/** failure 'omit': a photograph that cannot be loaded is left out, so only a field that draws it stays photographic-image (as
 * the sky view and the LSS inputs did before); 'throw': the load fails (the spectrometer routes' resource error). A failed load
 * is not cached, so the next field tries again. */
export function packPhotographLoader(read:PhotographReader,failure:'omit'|'throw'):PackPhotographs{
 const cache=new Map<string,Promise<Bitmap8>>();
 const one=(p:ApprovedPhotograph)=>{
  let q=cache.get(p.file);
  if(!q){q=read(p).then(decodeBitmap8);cache.set(p.file,q);q.catch(()=>{if(cache.get(p.file)===q)cache.delete(p.file);});}
  return q;
 };
 return async(pack,rows,signal)=>{
  const loaded=await Promise.all(photographsInPack(pack,rows).map(p=>one(p).then(b=>[p.file,b] as const,(e:unknown)=>{if(failure==='throw')throw e;return null;})));
  signal?.throwIfAborted();
  return Object.freeze({rows,bitmaps:new Map(loaded.filter(x=>x!==null))});
 };
}
