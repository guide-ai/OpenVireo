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
 * The bucket (G4a closure N1): fild of the Int32 index, fdiv by the float32 10000 (0x50d74c), Frac 0x40365c (frndint with the
 * rounding control forced to chop, then a subtraction: exact), fmul by the float32 100 (0x50d750), Round 0x403700 (fistp under
 * the current rounding). The control word is Delphi's Default8087CW 0x1332 at 0x5ae024 (64-bit extended precision, round to
 * nearest-even), loaded by 0x404dcc/0x403618; the only other writers restore it (0x408e74 after a library load; 0x403648,
 * 0x40371e, 0x40cdd9, 0x411170, 0x44c800 save and restore their own word). So every index has one determinate bucket, computed
 * here exactly on integers [D for the code, I that no loaded DLL leaves another control word in force].
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
/** The x87 bucket Round(Frac(index / 10000) · 100) of 0x50d660 for an index ≥ 10 000 000 (the matcher returns nil below), exactly:
 * the quotient rounded to a 64-bit significand (nearest-even), its exact fraction F/2^s, then 100·F/2^s (exact: below 2^53) rounded
 * half to even. */
export function nativeTemplateBucket(index:number):number{
 if(!Number.isSafeInteger(index)||index<10_000_000||index>0x7fff_ffff)throw new StarTemplateError('template');
 const n=BigInt(index),d=10000n;
 // Scale so that 2^63 ≤ n·2^s/d < 2^64.
 let s=0n;while((n<<s)/d<(1n<<63n))s++;
 const roundEven=(num:bigint,den:bigint)=>{const q=num/den,r=num%den;return 2n*r>den||(2n*r===den&&(q&1n)===1n)?q+1n:q;};
 let m=roundEven(n<<s,d);if(m===(1n<<64n)){m>>=1n;s--;}
 const f=m&((1n<<s)-1n);
 return Number(roundEven(100n*f,1n<<s));
}
/** 0x50d660 over the natively ordered list; returns the bundled (upper-case) file name or null. */
export function lookupStarTemplate(list:readonly StarIndexEntry[],spectralIndex:number):string|null{
 if(!Number.isSafeInteger(spectralIndex)||spectralIndex< -0x8000_0000||spectralIndex>0x7fff_ffff)throw new StarTemplateError('template');
 if(!list.length||spectralIndex<10_000_000)return null;// 0x50d66c..0x50d67b
 const bucket=nativeTemplateBucket;
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
