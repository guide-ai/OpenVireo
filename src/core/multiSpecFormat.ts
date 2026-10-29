/** Front M: Multi-Spec texts and the headerless .SSP file, CLEA_VEO.exe 781bc970…c54c, static reading only (plan §2.1, §2.5,
 * §2.6; dossiers mspeclist-525800-526cf0.asm, mspecdsply-526cf0-5299a0.asm, mspecdsply-print-528454.asm). Pure.
 *  - List item (AddSpectrum 0x525a94): "(" + n + ")  ", left-padded with spaces to 7 characters (LStrCat3(' ', s) while
 *    Length < 7), or 7 spaces when n ≤ 0; + the name only with Show Object ID (env+0x2e81, default off). Saving appends "*"
 *    (0x526700).
 *  - Caption (0x526d3c): "(n) " when n > 0, + the name only with Show Object ID.
 *  - File name: dir + base + (Show Object ID ? name : IntToStr(n)) + ".SSP" (base "MSpec_", or empty with Show Object ID).
 *    Web [W]: no directory (a browser download).
 *  - Save body 0x529234: 400 lines FloatToStrF(λ, 2) + ' ' + FloatToStrF(c/max, 6) + CRLF; no header; λ starts at the Single
 *    minimum and is repeatedly incremented by the Extended dispersion; max starts at 0, so an all-zero spectrum is undefined
 *    natively and rejected here (typed 'zero-maximum'). The decimal writer is the .SSP writer's (legacySpectrumFile.ts:
 *    exact-ratio half-away for c/max, binary64 for λ) — the same documented policy, not the x87/BCD stage.
 *  - Information 0x527ee4 and Print 0x528454 lines, with the masks of the Object X rule (plan §4) as an input.
 *  - Save All [W] (decision D4): one STORE-only .zip of the byte-exact files (multiSpecZip). */
import {fixedNumber,fixedRatio,LegacySpectrumFileError} from './legacySpectrumFile';
import {delphiFixed} from './variableStars';
import {formatNativeSexagesimalDigits} from './nativeListFormat';
import {nativeSpectralText} from './catalogObject';
import {MULTISPEC_BINS,type MultiSpecSpectrum} from './multiSpecSpectrum';
import type {MultiSpecEntry} from './multiSpec';

/** The options the texts read, at their compiled defaults [W: no options dialog]. */
export type MultiSpecTextOptions=Readonly<{showObjectId?:boolean;showObjectMagnitude?:boolean;editMode?:boolean}>;
/** Object X rule (plan §4): before the reveal the caller supplies the masked name ('ObjX-<ID>' within 0.25° of the target, else
 * 'Name hidden during Object X'); V and the Edit Mode lines are then suppressed regardless of the options. */
export type MultiSpecMask=Readonly<{objectName:string}>;

export const MULTISPEC_MESSAGES=Object.freeze({
 caption:'Multi-Channel Spectrometer',
 selectHint:'Click on objects in Telescope Display to select.\r\n\r\nRight-click selected object to remove.',
 removeQuestion:(n:number)=>`Remove Selection #${n} ?\r\n\r\n(Remaining Selections Will Be Re-Numbered.)`,
 cannotRemove:Object.freeze({caption:'Spectrum Already Taken',text:'You Cannot Remove This Object!'}),
 invalidExposure:Object.freeze({caption:'Invalid Exposure Time!',text:'Exposure Time must be numeric, > 0!'}),
 terminate:Object.freeze({caption:'Exposure Stopped Prematurely',text:'Do You Want to Terminate the Current Exposure?'}),
 noSpectra:Object.freeze({caption:'No Data!',text:'No Spectra To Scan!'}),
 clearAll:Object.freeze({caption:'Are You Sure?',text:'By cleaing this list you will lose any spectra you have not saved!\r\n\r\nContinue?'}),
 noItem:Object.freeze({caption:'No Item Selected!',show:'Select (left-click) a spectrum to display!',close:'Select (left-click) a spectrum to close!'}),
 savedLegend:'("*" = Spectrum Saved)',
 overwrite:(file:string)=>`${file} Already Exists!\r\n\r\nPress "OK" to overwrite it.`,
 hint:'Enter decimal minutes for exposure.',
 snrLabel:'(for faintest object)',
 /** DFM captions (dfm-multispec-forms.txt; '&' accelerators dropped). */
 control:Object.freeze({caption:'CLEA Multi-Channel Spectrometer Control',objects:'Objects',select:'Select Objects...',clear:'Clear Objects...',viewSave:'View/Save Spectra...',
  printField:'Print Selection Field...',close:'Close Multi-Spec',help:'Help',objectsDisplay:'Objects',snr:'S/N Ratio (Estimate)',timer:'Exposure Timer',selectLed:'Select:',
  minutes:'Exposure Minutes',exposure:'Exposure:',init:'Init',go:'Go',stop:'Stop'}),
 list:Object.freeze({caption:'Spectra From Multi-channel Spectrometer',file:'File',saveAll:'Save All...',clearAll:'Clear All...',display:'Display',openAll:'Open All',closeAll:'Close All',
  exit:'Exit',help:'Help',show:'Show Spectrum',hide:'Close Spectrum',scan:'Scan',stop:'Stop',rate:'Scan Rate (Seconds)'}),
 display:Object.freeze({file:'File',information:'Information...',save:'Save...',print:'Print...',exit:'Exit',infoCaption:'Spectrum Information',axisX:'Angstroms',axisY:'Intensity',one:'1.0',zero:'0.0'}),
});

export function multiSpecListItem(idx:number,name:string,saved:boolean,options:MultiSpecTextOptions={}):string{
 let s=idx>0?`(${idx})  `:'       ';
 while(s.length<7)s=' '+s;
 return s+(options.showObjectId?name:'')+(saved?'*':'');
}
export function multiSpecCaption(idx:number,name:string,options:MultiSpecTextOptions={}):string{
 return (idx>0?`(${idx}) `:'')+(options.showObjectId?name:'');
}
export function multiSpecFileName(idx:number,name:string,options:MultiSpecTextOptions={}):string{
 return (options.showObjectId?'':'MSpec_')+(options.showObjectId?name:String(idx))+'.SSP';
}
export class MultiSpecFormatError extends Error{constructor(readonly code:'counts'|'zero-maximum'|'range'){super(`Multi-Spec format: ${code}`);this.name='MultiSpecFormatError';}}
/** The 400-line headerless body (ASCII, dot decimal, CRLF). */
export function multiSpecSspBytes(spectrum:Pick<MultiSpecSpectrum,'counts'|'minimum'|'dispersion'>):Uint8Array{
 const counts=spectrum.counts;
 if(!Array.isArray(counts)||counts.length!==MULTISPEC_BINS)throw new MultiSpecFormatError('counts');
 let maximum=0;
 for(const c of counts){if(!Number.isInteger(c)||c< -0x8000_0000||c>0x7fff_ffff)throw new MultiSpecFormatError('counts');if(c>maximum)maximum=c;}
 if(maximum===0)throw new MultiSpecFormatError('zero-maximum');
 let wavelength=Math.fround(spectrum.minimum);
 if(!Number.isFinite(wavelength)||wavelength<=0||!Number.isFinite(spectrum.dispersion)||spectrum.dispersion<=0)throw new MultiSpecFormatError('range');
 let text='';
 try{
  for(const c of counts){text+=fixedNumber(wavelength,2)+' '+fixedRatio(BigInt(c),BigInt(maximum),6)+'\r\n';wavelength+=spectrum.dispersion;}
 }catch(e){if(e instanceof LegacySpectrumFileError)throw new MultiSpecFormatError('range');throw e;}
 const bytes=new Uint8Array(text.length);for(let i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);
 return bytes;
}
const NOT_RECORDED='not recorded';
const ra=(x:number|null)=>x===null?NOT_RECORDED:formatNativeSexagesimalDigits(x,2,['h ','m ','s']);
const dec=(x:number|null)=>x===null?NOT_RECORDED:formatNativeSexagesimalDigits(x,1,['° ',"' ",'"']);
/** Information 0x527ee4 ("Spectrum Information"). `galaxyType`: 0x596820 text of the galaxy (Edit Mode only). Sky RA/Dec/V
 * (uninitialised natively, D8) read "not recorded". The name line is always shown natively (≤ 32 characters with "Object: "). */
/** `galaxyRedshiftMask` [W] (docs/OBJECT-INFO-FORMS.md review 1 M2): web Edit Mode has no instructor login, so the galaxy
 * catalogue z (the E01/E02 answer) is replaced by this text in the Edit Mode "Z:" line, as Catalog Object does. */
export function multiSpecInformationLines(entry:Pick<MultiSpecEntry,'selection'|'seconds'>,spectrum:Pick<MultiSpecSpectrum,'average'|'snr'>,options:MultiSpecTextOptions&Readonly<{mask?:MultiSpecMask;galaxyType?:string|null;galaxyRedshiftMask?:string}>={}):readonly string[]{
 const s=entry.selection,masked=!!options.mask,lines=[options.mask?'Object: '+options.mask.objectName:('Object: '+s.name).slice(0,32),'RA:  '+ra(s.ra),'Dec: '+dec(s.dec)];
 if(!masked&&(options.showObjectMagnitude||options.editMode))lines.push('V Magnitude: '+(s.v===null?NOT_RECORDED:delphiFixed(Math.fround(s.v),3)));
 const t=Math.fround(entry.seconds);
 lines.push('Exposure: '+(t<60?delphiFixed(t,1)+' Seconds':delphiFixed(t/60,2)+' Minutes'));
 lines.push('Avg. Photons per Channel: '+delphiFixed(spectrum.average,0));
 lines.push('Signal to Noise Ratio: '+delphiFixed(spectrum.snr,1));
 if(!masked&&options.editMode){
  if(s.type===0||s.type===2)lines.push('Spectral Type: '+(s.spectralIndex===null?NOT_RECORDED:nativeSpectralText(s.spectralIndex)??NOT_RECORDED));
  else if(s.type===1){lines.push('Galaxy Type: '+(options.galaxyType??NOT_RECORDED));lines.push('Z: '+(options.galaxyRedshiftMask??(s.z===null?NOT_RECORDED:delphiFixed(s.z,3))));}
  else if(s.type===3){lines.push('Spectrum: QSO');lines.push('Z: '+(s.z===null?NOT_RECORDED:delphiFixed(s.z,3)));}
  else lines.push('');
 }
 return Object.freeze(lines);
}
/** Print 0x528454 text lines (the plot itself is drawn by the page). */
export function multiSpecPrintLines(entry:Pick<MultiSpecEntry,'idx'|'selection'|'seconds'>,spectrum:Pick<MultiSpecSpectrum,'total'|'average'|'snr'>,options:MultiSpecTextOptions&Readonly<{mask?:MultiSpecMask}>={}):readonly string[]{
 const s=entry.selection,masked=!!options.mask,lines:string[]=[];
 if(s.type!==4){
  lines.push('Object: ('+entry.idx+') '+(options.showObjectId&&!masked?s.name:''));
  if(!masked&&(options.showObjectMagnitude||options.editMode))lines.push('Apparent Magnitude (V): '+(s.v===null?NOT_RECORDED:delphiFixed(Math.fround(s.v),2)));
 }else lines.push('Reading Sky');
 lines.push('Right Ascension: '+ra(s.ra),'Declination: '+dec(s.dec),'Integration (Seconds): '+delphiFixed(Math.fround(entry.seconds),1),
  'Photon Count: '+delphiFixed(spectrum.total,0),'Avg. per Channel: '+delphiFixed(spectrum.average,0),'Signal/Noise: '+delphiFixed(spectrum.snr,1));
 return Object.freeze(lines);
}

const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
export function crc32(bytes:Uint8Array):number{let c=0xffffffff;for(const b of bytes)c=CRC_TABLE[(c^b)&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}
/** Save All [W] (decision D4): one uncompressed (STORE) .zip holding the byte-exact files, in the given order. Fixed DOS time
 * 1980-01-01 00:00 so the archive is deterministic. Names are ASCII. */
export function multiSpecZip(files:readonly Readonly<{name:string;bytes:Uint8Array}>[]):Uint8Array{
 if(!files.length||files.length>0xffff)throw new MultiSpecFormatError('counts');
 const enc=(s:string)=>{if(!/^[\x20-\x7e]{1,255}$/.test(s)||/[\\/]/.test(s))throw new MultiSpecFormatError('range');return Uint8Array.from(s,c=>c.charCodeAt(0));};
 const parts:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
 const u16=(v:DataView,o:number,x:number)=>v.setUint16(o,x,true),u32=(v:DataView,o:number,x:number)=>v.setUint32(o,x>>>0,true);
 for(const f of files){
  const name=enc(f.name),crc=crc32(f.bytes),size=f.bytes.byteLength;if(size>0xfffffffe)throw new MultiSpecFormatError('range');
  const h=new Uint8Array(30+name.length),v=new DataView(h.buffer);
  u32(v,0,0x04034b50);u16(v,4,10);u16(v,6,0);u16(v,8,0);u16(v,10,0);u16(v,12,0x21);u32(v,14,crc);u32(v,18,size);u32(v,22,size);u16(v,26,name.length);u16(v,28,0);h.set(name,30);
  const c=new Uint8Array(46+name.length),w=new DataView(c.buffer);
  u32(w,0,0x02014b50);u16(w,4,10);u16(w,6,10);u16(w,8,0);u16(w,10,0);u16(w,12,0);u16(w,14,0x21);u32(w,16,crc);u32(w,20,size);u32(w,24,size);u16(w,28,name.length);u16(w,30,0);u16(w,32,0);u16(w,34,0);u16(w,36,0);u32(w,38,0);u32(w,42,offset);c.set(name,46);
  parts.push(h,f.bytes);central.push(c);offset+=h.length+size;
 }
 const cdSize=central.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
 u32(e,0,0x06054b50);u16(e,4,0);u16(e,6,0);u16(e,8,files.length);u16(e,10,files.length);u32(e,12,cdSize);u32(e,16,offset);u16(e,20,0);
 const out=new Uint8Array(offset+cdSize+22);let at=0;for(const p of [...parts,...central,end]){out.set(p,at);at+=p.length;}
 return out;
}
