import {COMPILED_SESSION_OPTICAL_OPTIONS,type SessionOpticalOptions} from '../core/opticalOptions';
import {COMPILED_PHOTOMETER_TAB_OPTIONS,PHOTOMETER_TAB_OPTION_KEYS,type PhotometerTabOptions} from '../core/photometerTabOptions';
import {COMPILED_RESTRICT_SCOPE_ACCESS} from '../core/scopeAccess';
import {COMPILED_INSTRUMENT_PARAMETERS,INSTRUMENT_PARAMETER_FIELDS,INSTRUMENT_PARAMETER_KEYS,readInstrumentParameters,type InstrumentParameters} from '../core/instrumentParameters';
/** Front T2 (analysis/front-plans/front-teacher.md §T2; analysis/front-teacher/t2/RECOVERY.md): VIREO's options file
 * VEO_OPTS.INI and the web options file. CLEA_VEO.exe 781bc970…c54c, static reading only.
 * [D] TEnvironment1.FormCreate creates the options object with version '1.504' (0x587cf4) and file name 'VEO_OPTS.INI'
 * (0x587d04) through 0x5a1a08 (record = object+4; OptsRec typeinfo [0x5a094c] → 0x5a0950, size 0x27dd, one managed string at
 * +0x24fc). The reader 0x5a3534 and the writer 0x5a4644 move the same 107 fields in the same order with BlockRead/BlockWrite
 * (record size 1): 8506 bytes, no header beyond the version field. The reader checks the version first (0x5a183c: both strings
 * are cut two characters after the first '.', then compared, so '1.504' matches any '1.50…'); a mismatch shows "Version Error"
 * and deletes the file. After the last field Eof must hold ('EOF Not Reached!' 0x5a460c); any read error or that exception
 * shows "File Error" with "… is Invalid." and deletes the file. Either way VIREO goes on with the next file or the compiled
 * defaults 0x5a21d0. After any load "Administrator" (+0x27c7, not in the stream) is cleared (0x5a1fc7).
 * WEB-OF-01 [W]: the web writes a JSON options file, not VEO_OPTS.INI: 18 of the record's fields are install paths and
 * addresses built at run time from VIREO's own folder (0x5a2227.., DirectoryExists fallbacks), so a web-written native file
 * would have to invent them. It reads both its JSON file and a native VEO_OPTS.INI with VIREO's checks.
 * Password rule (front-teacher.md §1.6): the JSON file carries a zero-length password; the password field of an imported file
 * (+0x27b0, 16 bytes, length +0x27c0; or the JSON "password") is never read, decoded, shown, stored or re-exported.
 * Front T4: Set E(B-V) (+0x27dc) and Detect Sky (+0x27cf) are applied options (core/photometerTabOptions.ts); a web file written
 * before T4 lists them under "notApplied", and the reader takes them from there.
 * Front T5: Restrict Scope Access (+0x27d1) is applied too (core/scopeAccess.ts); a web file written before T5 lists it under
 * "notApplied", and the reader takes it from there in the same way.
 * Front T6: the Photometer and Spectrometer tabs' seven parameters (core/instrumentParameters.ts) are applied: the web file
 * carries them in "parameters" (a file written before T6 has none, so the compiled values), and a native file gives them from
 * their stream fields (Singles +0x250c/+0x2510/+0x2514, Integers +0x279f/+0x27a3/+0x27a7/+0x27ab, little-endian). The rest of
 * the parameter block stays under "notApplied".
 * Pure: no React, DOM, storage or network. */

export const OPTIONS_FILE_VERSION='1.504';
export const NATIVE_OPTIONS_FILE_NAME='VEO_OPTS.INI';
export const WEB_OPTIONS_FILE_NAME='VEO_OPTS.json';
export const WEB_OPTIONS_FORMAT='openvireo-options';
/** [D] The literals of the reader's boxes (0x5a457c, 0x5a4594, 0x5a45ac, 0x5a45b8, 0x5a45f4; 0x5a4628, 0x5a4638, 0x5a460c) and the
 * writer's warnings (0x5a54e8 / 0x5a55b8, caption 0x5a55a0; flags 0x14 and 0x41). */
export const OPTIONS_FILE_LITERALS=Object.freeze({
 optionsFile:'Options File ',obsolete:' is obsolete.',invalid:' is Invalid.',crlf:'\r\n',
 goOn:'Program will continue with defaults or alternative file.',versionCaption:'Version Error',fileCaption:'File Error',
 eofNotReached:'EOF Not Reached!',
 /** [I] The RTL text that a BlockRead past the end raises (InOutRes 100 → SysConst SEndOfFile): the string is in CLEA_VEO.exe's
  * string table (UTF-16, file offset 1975340); the mapping is Delphi RTL behaviour, not read from CLEA's code. */
 readBeyondEof:'Read beyond end of file',
 saveCaption:'Are You Sure?',
 editModeSet:'Edit Mode is Set!\r\n\r\nStudents using this software in Edit Mode will be able to access/change data values and program options.\r\n\r\nAre you sure you want to save these option settings?',
 virtualObservatory:'Virtual Observatory mode is enabled.\r\n\r\nStudents using the Virtual Observatory are able to access some data values.\r\n\r\n(For access to all data, set "Virtual Observatory" AND "Edit Mode".)',
 saveMenu:'&Save Updates',
});

/** [D] The 107 fields of 0x5a4644 / 0x5a3534 in stream order: [record offset, bytes]. */
const STREAM:readonly (readonly [number,number])[]=Object.freeze([
 [0x224,72],[0x56c,72],[0x5b4,72],
 ...Array.from({length:8},(_,i)=>[0x5fc+72*i,72] as const),// loop 0x5a497f..0x5a49a9
 ...Array.from({length:25},(_,i)=>[0x83c+72*i,72] as const),
 ...Array.from({length:8},(_,i)=>[0xf8c+72*i,72] as const),// +0xf44 is not saved
 ...Array.from({length:13},(_,i)=>[0x11cc+256*i,256] as const),
 ...Array.from({length:5},(_,i)=>[0x1fcd+256*i,256] as const),
 [0x24cd,5],[0x1ecc,1],
 ...Array.from({length:8},(_,i)=>[0x2500+4*i,4] as const),
 [0x2528,4],[0x252c,441],[0x26e5,91],[0x2740,91],
 ...Array.from({length:5},(_,i)=>[0x279b+4*i,4] as const),
 [0x27af,1],[0x27b0,16],[0x27c0,1],[0x27c1,5],[0x27c6,1],
 ...Array.from({length:21},(_,i)=>[0x27c8+i,1] as const),// +0x27c7 "Administrator" is not saved
].map(f=>Object.freeze([f[0],f[1]] as const)));
export const NATIVE_OPTIONS_FIELDS=STREAM;
export const NATIVE_OPTIONS_FILE_BYTES=STREAM.reduce((n,f)=>n+f[1],0);
const streamAt=new Map<number,number>();{let p=0;for(const [o,n] of STREAM){streamAt.set(o,p);p+=n;}}
/** The stream offset of a record field (only fields of the table). */
export function nativeStreamOffset(recordOffset:number):number{
 const p=streamAt.get(recordOffset);if(p===undefined)throw new RangeError('Not a field of the options stream');return p;
}
/** Fields before Fast Slewing (+0x27af): file names, install paths, addresses and the instrument parameters (81 fields). */
export const NATIVE_PARAMETER_FIELDS=STREAM.findIndex(f=>f[0]===0x27af);

/** The options the web applies: the dialog's live controls and Demonstration Mode. Record offsets in OPTIONS_FILE_BYTES. */
export type OptionsFileValues=Readonly<{demonstrationMode:boolean;testMode:boolean;limitSlewing:boolean;editMode:boolean;virtualObservatory:boolean;restrictScopeAccess:boolean;/** Front T6. */parameters:InstrumentParameters}>&SessionOpticalOptions&PhotometerTabOptions;
export const OPTIONS_FILE_KEYS=Object.freeze(['demonstrationMode','testMode','limitSlewing','editMode','virtualObservatory',...Object.keys(COMPILED_SESSION_OPTICAL_OPTIONS),...PHOTOMETER_TAB_OPTION_KEYS,'restrictScopeAccess'] as BooleanKey[]);
type BooleanKey=Exclude<keyof OptionsFileValues,'parameters'>;
/** [D] The compiled values (0x5a21d0) of the applied options. */
export const COMPILED_OPTIONS_FILE_VALUES:OptionsFileValues=Object.freeze({demonstrationMode:false,testMode:false,limitSlewing:false,editMode:false,virtualObservatory:false,...COMPILED_SESSION_OPTICAL_OPTIONS,...COMPILED_PHOTOMETER_TAB_OPTIONS,restrictScopeAccess:COMPILED_RESTRICT_SCOPE_ACCESS,parameters:COMPILED_INSTRUMENT_PARAMETERS});
/** [D] Record bytes of the applied options (option-bytes.tsv). DemoBox is stored inverted (+0x27c6 = login required; FormCreate
 * 0x587c50 tests it against 0); Fast Slewing is the slew-rate index, checked when it is 4 (FormActivate 0x5a5b61). */
const APPLIED_BYTES:Readonly<Record<BooleanKey,number>>=Object.freeze({demonstrationMode:0x27c6,testMode:0x27c8,limitSlewing:0x27c9,editMode:0x27ca,
 showObjectMag:0x27cc,showObjectId:0x27cd,fastScopeChange:0x27d0,infraredCamera:0x27d3,computeRedshiftVelocity:0x27d4,virtualObservatory:0x27d5,
 allowUserChange:0x27d7,timeDependentData:0x27d8,printInColor:0x27d9,monochromeDisplays:0x27da,fastSlewing:0x27af,
 detectSky:0x27cf,setEBmV:0x27dc,// Front T4
 restrictScopeAccess:0x27d1});// Front T5
export const OPTIONS_FILE_BYTES=APPLIED_BYTES;

/** The record's other options: written with their compiled values and never applied (kept typed). */
export type NotAppliedKey='administrator'|'computeMagnitudes'|'includeRIColors'|'soundEffects'|'writeLogFile'|'plotHRDiagram'|'labTableNumber'|'parameters'|'instrumentParameters';
export type NotAppliedReason='cleared-at-load'|'fixed-in-web'|'teacher-front'|'web-sound-switch'|'out-of-scope'|'undecided'|'parameters-front'|'not-representable';
export const NOT_APPLIED:Readonly<Record<NotAppliedKey,Readonly<{caption:string;record:string;compiled:boolean|string;reason:NotAppliedReason}>>>=Object.freeze({
 administrator:Object.freeze({caption:'"Administrator"',record:'+0x27c7 (not in the stream)',compiled:false,reason:'cleared-at-load'}),
 computeMagnitudes:Object.freeze({caption:'Compute Magnitudes',record:'+0x27cb',compiled:true,reason:'fixed-in-web'}),
 includeRIColors:Object.freeze({caption:'Include R and I Colors',record:'+0x27ce',compiled:true,reason:'fixed-in-web'}),
 soundEffects:Object.freeze({caption:'Sound Effects',record:'+0x27d2',compiled:true,reason:'web-sound-switch'}),
 writeLogFile:Object.freeze({caption:'Write Log File',record:'+0x27d6',compiled:false,reason:'out-of-scope'}),
 plotHRDiagram:Object.freeze({caption:'Plot HR Diagram',record:'+0x27db',compiled:true,reason:'fixed-in-web'}),
 labTableNumber:Object.freeze({caption:'Lab Table Number',record:'+0x27c1',compiled:'',reason:'undecided'}),
 parameters:Object.freeze({caption:'Parameters (General, CCD and IR tabs, Scopes…), file names, paths and addresses',record:'+0x224..+0x27ab (74 of the 81 fields; Front T6 applies the other 7)',compiled:'compiled',reason:'parameters-front'}),
 /** Front T6: a native Photometer or Spectrometer Single that is not a finite number (NaN or ±Inf bytes): its compiled value is kept. */
 instrumentParameters:Object.freeze({caption:'Photometer / Spectrometer parameters',record:'+0x250c, +0x2510, +0x2514',compiled:'compiled',reason:'not-representable'}),
});
export const NOT_APPLIED_KEYS=Object.freeze(Object.keys(NOT_APPLIED) as NotAppliedKey[]);
/** The keys a web file lists under "notApplied" (instrumentParameters only reports a native read). */
const WRITTEN_NOT_APPLIED=NOT_APPLIED_KEYS.filter(k=>k!=='instrumentParameters');
const NOT_APPLIED_BYTES:Partial<Record<NotAppliedKey,number>>={computeMagnitudes:0x27cb,includeRIColors:0x27ce,soundEffects:0x27d2,writeLogFile:0x27d6,plotHRDiagram:0x27db};
/** Front T4 / T5: options a web file written before T4 (Front T2) or T5 keeps under "notApplied" instead of "options". */
const LATER_KEYS=new Set<BooleanKey>([...PHOTOMETER_TAB_OPTION_KEYS,'restrictScopeAccess']);

/** 0x5a183c: Pos('.') then Delete from two characters after it (ShortString[71] copies). */
export function vireoVersionKey(version:string):string{
 const s=version.slice(0,71),p=s.indexOf('.')+1;return s.slice(0,p+2);
}
export const vireoVersionMatches=(fileVersion:string,compiled=OPTIONS_FILE_VERSION)=>vireoVersionKey(fileVersion)===vireoVersionKey(compiled);

export type OptionsFileInvalidReason='read-beyond-eof'|'eof-not-reached'|'not-options-file'|'too-large';
export type OptionsFileLoad=Readonly<
 |{kind:'loaded';source:'web'|'native';values:OptionsFileValues;notApplied:readonly NotAppliedKey[];administratorCleared:boolean;
   /** Review 1 L1: a native Fast Slewing byte other than 3 or 4. ProgrammedSlew passes the raw byte to RateSlider.Position
    * (0x539cbf, movzx edx,[env+0x2e63]), so VIREO would slew at that rate index; the web shows the box as on only for 4. */
   fastSlewingRate:number|null}
 |{kind:'version-error'}
 |{kind:'invalid';reason:OptionsFileInvalidReason}>;
/** Larger inputs are refused before reading [W]; a native file is 8506 bytes and a web file about 1 kB. */
export const OPTIONS_FILE_MAX_BYTES=65536;

/** The JSON options file: every applied option, the others at their compiled values, a zero-length password. */
export function writeOptionsFile(values:OptionsFileValues):string{
 const options=Object.fromEntries(OPTIONS_FILE_KEYS.map(k=>{const v=values[k];if(typeof v!=='boolean')throw new TypeError('Invalid option value');return [k,v];}));
 const parameters=readInstrumentParameters(values.parameters);
 const notApplied=Object.fromEntries(WRITTEN_NOT_APPLIED.map(k=>[k,NOT_APPLIED[k].compiled]));
 return JSON.stringify({format:WEB_OPTIONS_FORMAT,formatVersion:1,version:OPTIONS_FILE_VERSION,
  adaptation:'OpenVireo web options file (not VEO_OPTS.INI). The options not applied by OpenVireo are written with VIREO\'s compiled values. No password is stored.',
  password:'',options,parameters,notApplied},null,1)+'\n';
}

const invalid=(reason:OptionsFileInvalidReason):OptionsFileLoad=>Object.freeze({kind:'invalid',reason});
const loaded=(source:'web'|'native',values:OptionsFileValues,notApplied:NotAppliedKey[],administratorCleared:boolean,fastSlewingRate:number|null=null):OptionsFileLoad=>
 Object.freeze({kind:'loaded',source,values:Object.freeze(values),notApplied:Object.freeze(notApplied),administratorCleared,fastSlewingRate});
const isRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);

/** Reads a web JSON file or a native VEO_OPTS.INI, in VIREO's order of checks. */
export function readOptionsFile(bytes:Uint8Array):OptionsFileLoad{
 if(!(bytes instanceof Uint8Array))throw new TypeError('Invalid options file bytes');
 if(bytes.length>OPTIONS_FILE_MAX_BYTES)return invalid('too-large');
 let i=0;if(bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)i=3;
 while(i<bytes.length&&(bytes[i]===0x20||bytes[i]===0x09||bytes[i]===0x0a||bytes[i]===0x0d))i++;
 return bytes[i]===0x7b?readWeb(bytes):readNative(bytes);
}

function readWeb(bytes:Uint8Array):OptionsFileLoad{
 let doc:unknown;
 try{doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return invalid('not-options-file');}
 if(!isRecord(doc)||doc.format!==WEB_OPTIONS_FORMAT||doc.formatVersion!==1||typeof doc.version!=='string')return invalid('not-options-file');
 if(!vireoVersionMatches(doc.version))return Object.freeze({kind:'version-error'});
 // The password is never read (§1.6): whatever "password" holds is ignored.
 const o=doc.options;if(!isRecord(o)||!OPTIONS_FILE_KEYS.every(k=>typeof o[k]==='boolean'||LATER_KEYS.has(k)&&o[k]===undefined))return invalid('not-options-file');
 const n=doc.notApplied===undefined?{}:doc.notApplied;if(!isRecord(n))return invalid('not-options-file');
 // Front T4 / T5: a Front T2 file lists Set E(B-V), Detect Sky and Restrict Scope Access under notApplied (VIREO's compiled
 // values unless edited); "options" wins when a file has both.
 for(const k of LATER_KEYS)if(n[k]!==undefined&&typeof n[k]!=='boolean')return invalid('not-options-file');
 // Front T6: a file written before T6 has no "parameters" (VIREO's compiled values).
 let parameters=COMPILED_INSTRUMENT_PARAMETERS;
 if(doc.parameters!==undefined){try{parameters=readInstrumentParameters(doc.parameters);}catch{return invalid('not-options-file');}}
 const values=Object.freeze({...Object.fromEntries(OPTIONS_FILE_KEYS.map(k=>[k,o[k]??n[k]??COMPILED_OPTIONS_FILE_VALUES[k]])),parameters}) as OptionsFileValues;
 const differs:NotAppliedKey[]=[];let administratorCleared=false;
 for(const k of WRITTEN_NOT_APPLIED){
  if(!(k in n))continue;
  const v=n[k],c=NOT_APPLIED[k].compiled;
  if(typeof v!==typeof c)return invalid('not-options-file');
  if(k==='administrator'){administratorCleared=v===true;continue;}// 0x5a1fc7
  if(v!==c)differs.push(k);
 }
 return loaded('web',values,differs,administratorCleared);
}

function readNative(bytes:Uint8Array):OptionsFileLoad{
 if(bytes.length<72)return invalid('read-beyond-eof');
 const len=Math.min(bytes[0]!,71);let version='';for(let k=1;k<=len;k++)version+=String.fromCharCode(bytes[k]!);
 if(!vireoVersionMatches(version))return Object.freeze({kind:'version-error'});
 if(bytes.length<NATIVE_OPTIONS_FILE_BYTES)return invalid('read-beyond-eof');
 if(bytes.length>NATIVE_OPTIONS_FILE_BYTES)return invalid('eof-not-reached');
 const at=(record:number)=>bytes[nativeStreamOffset(record)]!;
 const {parameters,representable}=nativeParameters(bytes);
 const values=Object.freeze({...Object.fromEntries(OPTIONS_FILE_KEYS.map(k=>{const b=at(APPLIED_BYTES[k]);
  return [k,k==='demonstrationMode'?b===0:k==='fastSlewing'?b===4:b!==0];})),parameters}) as OptionsFileValues;
 const differs:NotAppliedKey[]=representable?[]:['instrumentParameters'];
 for(const k of NOT_APPLIED_KEYS){const r=NOT_APPLIED_BYTES[k];if(r!==undefined&&(at(r)!==0)!==NOT_APPLIED[k].compiled)differs.push(k);}
 if(at(0x27c1)!==0)differs.push('labTableNumber');// only the ShortString's length byte is read
 differs.push('parameters');// the native parameter block cannot be compared with compiled values that depend on VIREO's folder
 const rate=at(APPLIED_BYTES.fastSlewing);
 return loaded('native',values,NOT_APPLIED_KEYS.filter(k=>differs.includes(k)),false,rate===3||rate===4?null:rate);
}

/** Front T6: the seven parameter fields of a native file (Single: float32, Integer: int32, little-endian as BlockRead stores
 * them). A Single that is NaN or infinite keeps its compiled value (reported under notApplied); -0 reads as 0. */
function nativeParameters(bytes:Uint8Array):Readonly<{parameters:InstrumentParameters;representable:boolean}>{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let representable=true;
 const out=Object.fromEntries(INSTRUMENT_PARAMETER_FIELDS.map(f=>{
  const p=nativeStreamOffset(parseInt(f.record,16));
  if(f.type==='integer')return [f.key,view.getInt32(p,true)+0];
  const v=view.getFloat32(p,true);if(!Number.isFinite(v)){representable=false;return [f.key,f.compiled];}
  return [f.key,v+0];
 }));
 return Object.freeze({parameters:readInstrumentParameters(Object.fromEntries(INSTRUMENT_PARAMETER_KEYS.map(k=>[k,out[k]]))),representable});
}

/** The reader's boxes (0x5a3648..0x5a3698 and 0x5a449f..0x5a44fc, MessageBox flags 0x40): "Options File " + name + … The
 * exception text of an invalid file follows after a blank line: VIREO's own for the two native reasons, else `webMessage`. */
export function optionsFileErrorBox(load:Extract<OptionsFileLoad,{kind:'version-error'|'invalid'}>,name:string,webMessage=''):Readonly<{caption:string;text:string}>{
 const L=OPTIONS_FILE_LITERALS;
 if(load.kind==='version-error')return Object.freeze({caption:L.versionCaption,text:L.optionsFile+name+L.obsolete+L.crlf+L.goOn});
 const message=load.reason==='eof-not-reached'?L.eofNotReached:load.reason==='read-beyond-eof'?L.readBeyondEof:webMessage;
 return Object.freeze({caption:L.fileCaption,text:L.optionsFile+name+L.invalid+L.crlf+L.goOn+L.crlf+L.crlf+message});
}
