/** Star spectrum templates for arbitrary GSC stars (Front F, Object X star branch), static reading of CLEA_VEO.exe 781bc970…c54c,
 * generalizing the verified single-star path (docs/STAR-EXPOSURE.md, starExposure.ts):
 *  - the compact reader 0x59b0b3–0x59b0b9 copies the packed Int32 at record offset 8 (the spectral index) to the expanded record;
 *  - JSPEC2.SPI (approved byte-exact, 3168 bytes, SHA-256 5abf48cb…a0aa): 132 rows `<index> '<file>'`, read by 0x50d460/0x50d754
 *    and inserted with the cursor insert 0x492728 under the signed-integer greater comparator 0x50d454 (an ascending list);
 *  - the matcher 0x50d660 (lookupStarTemplate): nil for an unloaded list or an index below 10 000 000; otherwise a forward walk
 *    returns an exact match; at the first larger entry it walks back (0x492668) to the nearest lower entry whose bucket
 *    Round(Frac(index/10000)·100) (0x40365c Frac, 0x403700 Round) equals the key's, else returns the entry just before the larger
 *    one (the first entry when the key is below all); a key above every entry is nil;
 *  - the headerless loader 0x55ef64–0x55f05d keeps the file's flux values on a uniform endpoint grid (first..last wavelength);
 *  - Go samples the 600 channels through 0x55dfe0 (acquisition.ts).
 * The file names in JSPEC2.SPI are lower-case ('A0000044.sp'); the original runs on a case-insensitive file system and the
 * bundled files are upper-case, so the lookup returns the upper-cased name (declared adaptation). */
import {nativeCursorInsert} from './fieldEngine';
import {uniformSpectrum,type UniformSpectrum} from './acquisition';
import {parseLibrarySpectrum} from './spectrum';

export class StarTemplateError extends Error{
 constructor(readonly code:'index-file'|'template'){super(`Star template: ${code}`);this.name='StarTemplateError';}
}
export const JSPEC2_SPI=Object.freeze({name:'JSPEC2.SPI',path:'/original/spectra/jspect2/JSPEC2.SPI',bytes:3168,rows:132,sha256:'5abf48cbd3e52a18278c9bd38ad939f6f019ee80f28743d5486dec59c677a0aa'});
export type StarIndexEntry=Readonly<{index:number;file:string;row:number}>;
/** Decoded and natively ordered index list (bytes already checked for size and SHA-256 by the caller). */
export function decodeStarIndexList(bytes:Uint8Array):readonly StarIndexEntry[]{
 let text='';for(const b of bytes)text+=String.fromCharCode(b);
 const rows=text.split('\r\n').filter(l=>l.trim()!=='');
 if(rows.length!==JSPEC2_SPI.rows)throw new StarTemplateError('index-file');
 const read=rows.map((l,row)=>{const m=/^\s*(-?\d{1,10})\s+'([A-Za-z0-9_]{1,8}\.[A-Za-z]{2,3})'\s*$/.exec(l);if(!m)throw new StarTemplateError('index-file');const index=Number(m[1]);if(!Number.isSafeInteger(index)||index< -0x8000_0000||index>0x7fff_ffff)throw new StarTemplateError('index-file');return Object.freeze({index,file:m[2],row});});
 return Object.freeze(nativeCursorInsert(read,(a,b)=>a.index>b.index));
}
/** 0x50d660 over the natively ordered list; returns the bundled (upper-case) file name or null. The bucket is computed exactly
 * on integers; indices that are not multiples of 100 (where the x87 Frac·100 could round differently) are not supported. */
export function lookupStarTemplate(list:readonly StarIndexEntry[],spectralIndex:number):string|null{
 if(!Number.isSafeInteger(spectralIndex)||spectralIndex< -0x8000_0000||spectralIndex>0x7fff_ffff)throw new StarTemplateError('template');
 if(!list.length||spectralIndex<10_000_000)return null;// 0x50d66c..0x50d67b
 const bucket=(i:number)=>{if(i%100!==0)throw new StarTemplateError('template');return ((i%10000)+10000)%10000/100;};
 const k=bucket(spectralIndex);
 for(let g=0;g<list.length;g++){
  if(list[g].index===spectralIndex)return list[g].file.toUpperCase();
  if(list[g].index>spectralIndex){
   for(let b=g-1;b>=0;b--)if(bucket(list[b].index)===k)return list[b].file.toUpperCase();
   return list[Math.max(0,g-1)].file.toUpperCase();
  }
 }
 return null;// 0x50d72e: tail reached without a larger entry
}
/** Spectral index of a compact GSC record (27-byte hex): packed Int32 at offset 8. */
export function compactSpectralIndex(rawHex:string):number{
 if(!/^[a-f0-9]{54}$/.test(rawHex))throw new StarTemplateError('template');
 const b=Uint8Array.from(rawHex.match(/../g)!,x=>parseInt(x,16));return new DataView(b.buffer).getInt32(8,true);
}
/** 0x55ef64–0x55f05d on a template's text: flux values on the uniform endpoint grid. */
export function starTemplateSpectrum(text:string):UniformSpectrum{
 let samples;try{samples=parseLibrarySpectrum(text);}catch{throw new StarTemplateError('template');}
 try{return uniformSpectrum(samples[0].wavelength,samples[samples.length-1].wavelength,samples.map(s=>s.intensity));}catch{throw new StarTemplateError('template');}
}
