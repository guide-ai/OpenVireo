import {describe,expect,it} from 'vitest';
import {COMPILED_OPTIONS_FILE_VALUES,NATIVE_OPTIONS_FIELDS,NATIVE_OPTIONS_FILE_BYTES,NATIVE_PARAMETER_FIELDS,NOT_APPLIED,NOT_APPLIED_KEYS,OPTIONS_FILE_BYTES,OPTIONS_FILE_KEYS,OPTIONS_FILE_LITERALS,
 nativeStreamOffset,optionsFileErrorBox,readOptionsFile,vireoVersionKey,vireoVersionMatches,writeOptionsFile,type OptionsFileValues} from './optionsFile';
import {DEMONSTRATION_MODE_KEY,readDemonstrationMode,writeDemonstrationMode} from './demonstrationModeStorage';
import {INITIAL_INSTRUCTOR_GATE,leaveInstructorMode,preferencesGate,startupInstructorGate} from '../core/instructorMode';
import {INITIAL_RADIO_ACCESS,followPageGate} from '../core/radioAccessOptions';
import {TEACHER_DEFERRED} from '../core/teacherDeferred';
import {COMPILED_INSTRUMENT_PARAMETERS,INSTRUMENT_PARAMETER_FIELDS} from '../core/instrumentParameters';

// Front T2 contracts (analysis/front-teacher/t2/RECOVERY.md). CLEA_VEO.exe 781bc970…c54c, static only. The native files below are
// synthetic streams built from the recovered field table: evidence of the port, not an oracle for VIREO. No real password is
// used anywhere: the password field is filled with a synthetic byte pattern.
const enc=new TextEncoder();
const SYNTHETIC=Uint8Array.from({length:16},(_,i)=>0xa0+i);// a test pattern, not a password
/** A native stream with the compiled option bytes (0x5a21d0) and the given changes, by record offset. */
function nativeFile(changes:Readonly<Record<number,number>>={},version='1.504'){
 const b=new Uint8Array(NATIVE_OPTIONS_FILE_BYTES);
 b[0]=version.length;b.set(enc.encode(version),1);
 const compiled:Record<number,number>={0x27af:4,0x27c6:1,0x27cb:1,0x27ce:1,0x27d1:1,0x27d2:1,0x27d3:1,0x27d7:1,0x27db:1,0x27dc:1};
 for(const [o,v] of Object.entries({...compiled,...changes}))b[nativeStreamOffset(Number(o))]=v;
 // Front T6: the seven Photometer / Spectrometer parameters at their compiled values (float32 / int32, little-endian).
 const view=new DataView(b.buffer);
 for(const f of INSTRUMENT_PARAMETER_FIELDS){const p=nativeStreamOffset(parseInt(f.record,16));if(f.type==='single')view.setFloat32(p,f.compiled,true);else view.setInt32(p,f.compiled,true);}
 return b;
}
const all=(v:boolean):OptionsFileValues=>Object.freeze({...Object.fromEntries(OPTIONS_FILE_KEYS.map(k=>[k,v])),parameters:COMPILED_INSTRUMENT_PARAMETERS}) as unknown as OptionsFileValues;

describe('T2 options file layout (0x5a4644 / 0x5a3534)',()=>{
 it('moves 107 fields, 8506 bytes, without overlap; "Administrator" and +0xf44 are not in the stream',()=>{
  expect(NATIVE_OPTIONS_FIELDS.length).toBe(107);expect(NATIVE_OPTIONS_FILE_BYTES).toBe(8506);
  const cover=new Uint8Array(0x27dd);for(const [o,n] of NATIVE_OPTIONS_FIELDS)for(let i=o;i<o+n;i++)cover[i]!++;
  expect(Math.max(...cover)).toBe(1);expect(cover[0x27c7]).toBe(0);expect(cover[0xf44]).toBe(0);expect(cover[0x24fc]).toBe(0);
  expect(NATIVE_OPTIONS_FIELDS[0]).toEqual([0x224,72]);expect(NATIVE_OPTIONS_FIELDS.at(-1)).toEqual([0x27dc,1]);
  expect(NATIVE_PARAMETER_FIELDS).toBe(81);
  expect(nativeStreamOffset(0x56c)).toBe(72);expect(nativeStreamOffset(0x27af)).toBe(8506-1-16-1-5-1-21);
  expect(nativeStreamOffset(0x27c6)).toBe(8506-22);expect(()=>nativeStreamOffset(0x27c7)).toThrow(RangeError);
  for(const r of Object.values(OPTIONS_FILE_BYTES))expect(()=>nativeStreamOffset(r)).not.toThrow();
 });
 it('checks the version as 0x5a183c does: two characters after the first dot',()=>{
  expect(vireoVersionKey('1.504')).toBe('1.50');expect(vireoVersionKey('12')).toBe('12');expect(vireoVersionKey('abc')).toBe('ab');
  expect(vireoVersionMatches('1.504')).toBe(true);expect(vireoVersionMatches('1.509x')).toBe(true);expect(vireoVersionMatches('1.50')).toBe(true);
  expect(vireoVersionMatches('1.51')).toBe(false);expect(vireoVersionMatches('1.4')).toBe(false);expect(vireoVersionMatches('')).toBe(false);
 });
});

describe('T2 web options file',()=>{
 it('round-trips every applied option',()=>{
  for(const values of [COMPILED_OPTIONS_FILE_VALUES,all(true),all(false),Object.freeze({...COMPILED_OPTIONS_FILE_VALUES,demonstrationMode:true,testMode:true,showObjectId:true,fastSlewing:false})]){
   const r=readOptionsFile(enc.encode(writeOptionsFile(values)));
   expect(r).toEqual({kind:'loaded',source:'web',values,notApplied:[],administratorCleared:false,fastSlewingRate:null});expect(Object.isFrozen(r)).toBe(true);
  }
 });
 it('writes a zero-length password and the not-applied options with their compiled values',()=>{
  const doc=JSON.parse(writeOptionsFile(all(true)));
  expect(doc.password).toBe('');expect(doc.version).toBe('1.504');
  expect(doc.notApplied).toEqual({administrator:false,computeMagnitudes:true,includeRIColors:true,soundEffects:true,writeLogFile:false,plotHRDiagram:true,labTableNumber:'',parameters:'compiled'});
  expect(Object.keys(doc.options)).toEqual(OPTIONS_FILE_KEYS);
  expect(()=>writeOptionsFile({...all(true),testMode:1} as never)).toThrow(TypeError);
 });
 it('ignores an imported password: it never reaches the result',()=>{
  const doc=JSON.parse(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES));doc.password='SYNTHETIC-PATTERN-7f';
  const r=readOptionsFile(enc.encode(JSON.stringify(doc)));
  expect(r.kind).toBe('loaded');expect(JSON.stringify(r)).not.toContain('SYNTHETIC');
  expect(r).toEqual(readOptionsFile(enc.encode(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES))));
  doc.password={nested:[1,2,3]};expect(readOptionsFile(enc.encode(JSON.stringify(doc))).kind).toBe('loaded');
 });
 it('clears "Administrator" at load (0x5a1fc7) and lists the not-applied values that differ',()=>{
  const doc=JSON.parse(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES));doc.notApplied.administrator=true;doc.notApplied.soundEffects=false;doc.notApplied.labTableNumber='12';
  const r=readOptionsFile(enc.encode(JSON.stringify(doc)));
  expect(r).toMatchObject({kind:'loaded',administratorCleared:true,notApplied:['soundEffects','labTableNumber']});
  if(r.kind==='loaded')expect(r.values).toEqual(COMPILED_OPTIONS_FILE_VALUES);
 });
 it('applies VIREO\'s version check and refuses other files',()=>{
  const doc=JSON.parse(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES));
  expect(readOptionsFile(enc.encode(JSON.stringify({...doc,version:'1.40'})))).toEqual({kind:'version-error'});
  expect(readOptionsFile(enc.encode(JSON.stringify({...doc,version:'1.5049'}))).kind).toBe('loaded');
  for(const bad of ['{',JSON.stringify({...doc,format:'other'}),JSON.stringify({...doc,options:{...doc.options,editMode:'yes'}}),JSON.stringify({...doc,notApplied:{restrictScopeAccess:'no'}}),JSON.stringify({...doc,options:{...doc.options,setEBmV:1}}),JSON.stringify({})])
   expect(readOptionsFile(enc.encode(bad))).toEqual({kind:'invalid',reason:'not-options-file'});
  expect(readOptionsFile(new Uint8Array(70000))).toEqual({kind:'invalid',reason:'too-large'});
  expect(()=>readOptionsFile('x' as never)).toThrow(TypeError);
 });
});

describe('Front T4: Set E(B-V) and Detect Sky in the options file',()=>{
 it('are applied options at record +0x27dc / +0x27cf with compiled values on / off (0x5a2a55, 0x5a2af6)',()=>{
  expect(OPTIONS_FILE_BYTES.setEBmV).toBe(0x27dc);expect(OPTIONS_FILE_BYTES.detectSky).toBe(0x27cf);
  expect(COMPILED_OPTIONS_FILE_VALUES).toMatchObject({setEBmV:true,detectSky:false});
  expect(NOT_APPLIED_KEYS).not.toContain('setEBmV' as never);expect(NOT_APPLIED_KEYS).not.toContain('detectSky' as never);
  for(const [setEBmV,detectSky] of [[false,true],[true,false],[false,false],[true,true]] as const){
   const values=Object.freeze({...COMPILED_OPTIONS_FILE_VALUES,setEBmV,detectSky});
   expect(readOptionsFile(enc.encode(writeOptionsFile(values)))).toEqual({kind:'loaded',source:'web',values,notApplied:[],administratorCleared:false,fastSlewingRate:null});
  }
 });
 it('reads a web file written before T4 (both under "notApplied") and one that lists neither',()=>{
  const doc=JSON.parse(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES));delete doc.options.setEBmV;delete doc.options.detectSky;
  const t2={...doc,notApplied:{...doc.notApplied,detectSky:true,setEBmV:false}};
  const r=readOptionsFile(enc.encode(JSON.stringify(t2)));
  expect(r).toMatchObject({kind:'loaded',notApplied:[]});if(r.kind==='loaded')expect(r.values).toMatchObject({setEBmV:false,detectSky:true});
  const bare=readOptionsFile(enc.encode(JSON.stringify(doc)));
  expect(bare.kind==='loaded'&&bare.values).toEqual(COMPILED_OPTIONS_FILE_VALUES);
  expect(readOptionsFile(enc.encode(JSON.stringify({...doc,notApplied:{...doc.notApplied,detectSky:'yes'}})))).toEqual({kind:'invalid',reason:'not-options-file'});
 });
 it('applies the native bytes (non-zero = checked) and no longer lists them as not applied',()=>{
  const r=readOptionsFile(nativeFile({0x27dc:0,0x27cf:1}));
  expect(r).toMatchObject({kind:'loaded',source:'native',notApplied:['parameters']});
  if(r.kind==='loaded')expect(r.values).toEqual({...COMPILED_OPTIONS_FILE_VALUES,setEBmV:false,detectSky:true});
  const two=readOptionsFile(nativeFile({0x27cf:2}));expect(two.kind==='loaded'&&two.values.detectSky).toBe(true);
 });
});

describe('Front T5: Restrict Scope Access in the options file',()=>{
 it('is an applied option at record +0x27d1, compiled on (0x5a2b04), and no longer listed as not applied',()=>{
  expect(OPTIONS_FILE_BYTES.restrictScopeAccess).toBe(0x27d1);expect(COMPILED_OPTIONS_FILE_VALUES.restrictScopeAccess).toBe(true);
  expect(NOT_APPLIED_KEYS).not.toContain('restrictScopeAccess' as never);expect(OPTIONS_FILE_KEYS.at(-1)).toBe('restrictScopeAccess');
  for(const restrictScopeAccess of [false,true]){const values=Object.freeze({...COMPILED_OPTIONS_FILE_VALUES,restrictScopeAccess});
   expect(readOptionsFile(enc.encode(writeOptionsFile(values)))).toEqual({kind:'loaded',source:'web',values,notApplied:[],administratorCleared:false,fastSlewingRate:null});}
 });
 it('reads a web file written before T5 (under "notApplied"), one that lists it nowhere, and refuses a non-boolean',()=>{
  const doc=JSON.parse(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES));delete doc.options.restrictScopeAccess;
  const t4=readOptionsFile(enc.encode(JSON.stringify({...doc,notApplied:{...doc.notApplied,restrictScopeAccess:false}})));
  expect(t4).toMatchObject({kind:'loaded',notApplied:[]});if(t4.kind==='loaded')expect(t4.values).toEqual({...COMPILED_OPTIONS_FILE_VALUES,restrictScopeAccess:false});
  const bare=readOptionsFile(enc.encode(JSON.stringify(doc)));expect(bare.kind==='loaded'&&bare.values).toEqual(COMPILED_OPTIONS_FILE_VALUES);
  expect(readOptionsFile(enc.encode(JSON.stringify({...doc,notApplied:{...doc.notApplied,restrictScopeAccess:1}})))).toEqual({kind:'invalid',reason:'not-options-file'});
  const both=JSON.parse(writeOptionsFile({...COMPILED_OPTIONS_FILE_VALUES,restrictScopeAccess:false}));both.notApplied.restrictScopeAccess=true;
  const r=readOptionsFile(enc.encode(JSON.stringify(both)));expect(r.kind==='loaded'&&r.values.restrictScopeAccess).toBe(false);
 });
 it('applies the native byte (non-zero = checked)',()=>{
  for(const [b,v] of [[0,false],[1,true],[7,true]] as const){const r=readOptionsFile(nativeFile({0x27d1:b}));expect(r).toMatchObject({kind:'loaded',notApplied:['parameters']});expect(r.kind==='loaded'&&r.values.restrictScopeAccess).toBe(v);}
 });
});

describe('T2 native VEO_OPTS.INI (read only)',()=>{
 it('reads the compiled stream as the compiled options; the parameter block is listed as not applied',()=>{
  expect(readOptionsFile(nativeFile())).toEqual({kind:'loaded',source:'native',values:COMPILED_OPTIONS_FILE_VALUES,notApplied:['parameters'],administratorCleared:false,fastSlewingRate:null});
 });
 it('decodes DemoBox inverted, Fast Slewing as rate 4 and the boolean bytes',()=>{
  const r=readOptionsFile(nativeFile({0x27c6:0,0x27af:3,0x27c8:1,0x27ca:2,0x27d5:1,0x27d3:0,0x27d1:0,0x27c1:2}));
  expect(r.kind).toBe('loaded');if(r.kind!=='loaded')return;
  expect(r.values).toMatchObject({demonstrationMode:true,fastSlewing:false,testMode:true,editMode:true,virtualObservatory:true,infraredCamera:false,restrictScopeAccess:false});
  expect(r.notApplied).toEqual(['labTableNumber','parameters']);
 });
 it('notes a Fast Slewing rate index other than 3 or 4 (review 1 L1: RateSlider takes the raw byte, 0x539cbf)',()=>{
  expect(readOptionsFile(nativeFile({0x27af:3}))).toMatchObject({values:{fastSlewing:false},fastSlewingRate:null});
  expect(readOptionsFile(nativeFile({0x27af:5}))).toMatchObject({values:{fastSlewing:false},fastSlewingRate:5});
  expect(readOptionsFile(nativeFile({0x27af:0}))).toMatchObject({values:{fastSlewing:false},fastSlewingRate:0});
  expect(readOptionsFile(enc.encode(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES)))).toMatchObject({fastSlewingRate:null});
 });
 it('never reads the password field: a synthetic pattern there changes nothing',()=>{
  const plain=nativeFile(),patterned=nativeFile();patterned.set(SYNTHETIC,nativeStreamOffset(0x27b0));patterned[nativeStreamOffset(0x27c0)]=16;
  const a=readOptionsFile(plain),b=readOptionsFile(patterned);expect(b).toEqual(a);
  expect(JSON.stringify(b)).not.toMatch(/password|\\u00a[0-9a-f]/i);
 });
 it('checks the version first, then the length: Version Error, read past the end, EOF Not Reached!',()=>{
  expect(readOptionsFile(nativeFile({},'1.40'))).toEqual({kind:'version-error'});
  expect(readOptionsFile(nativeFile({},'1.40').slice(0,100))).toEqual({kind:'version-error'});
  expect(readOptionsFile(nativeFile().slice(0,71))).toEqual({kind:'invalid',reason:'read-beyond-eof'});
  expect(readOptionsFile(nativeFile().slice(0,8505))).toEqual({kind:'invalid',reason:'read-beyond-eof'});
  const long=new Uint8Array(8507);long.set(nativeFile());expect(readOptionsFile(long)).toEqual({kind:'invalid',reason:'eof-not-reached'});
 });
 it('builds the reader\'s boxes from the recovered literals',()=>{
  expect(optionsFileErrorBox({kind:'version-error'},'VEO_OPTS.INI')).toEqual({caption:'Version Error',text:'Options File VEO_OPTS.INI is obsolete.\r\nProgram will continue with defaults or alternative file.'});
  expect(optionsFileErrorBox({kind:'invalid',reason:'eof-not-reached'},'a.ini')).toEqual({caption:'File Error',text:'Options File a.ini is Invalid.\r\nProgram will continue with defaults or alternative file.\r\n\r\nEOF Not Reached!'});
  expect(optionsFileErrorBox({kind:'invalid',reason:'not-options-file'},'b.json','web text').text.endsWith('\r\n\r\nweb text')).toBe(true);
  expect(OPTIONS_FILE_LITERALS.editModeSet.startsWith('Edit Mode is Set!\r\n\r\n')).toBe(true);
  expect(NOT_APPLIED_KEYS.every(k=>Object.isFrozen(NOT_APPLIED[k]))).toBe(true);
 });
});

describe('T2 Demonstration Mode (per browser) and the start-up gate (FormCreate 0x587c50)',()=>{
 const fake=()=>{const m=new Map<string,string>();const s={getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);}};return {m,s};};
 it('is off by default, kept as one key while on and removed when off',()=>{
  const {m,s}=fake();
  expect(readDemonstrationMode(()=>s)).toBe(false);expect(m.size).toBe(0);
  expect(writeDemonstrationMode(true,()=>s)).toBe(true);expect([...m]).toEqual([[DEMONSTRATION_MODE_KEY,'1']]);expect(readDemonstrationMode(()=>s)).toBe(true);
  expect(writeDemonstrationMode(false,()=>s)).toBe(true);expect(m.size).toBe(0);expect(readDemonstrationMode(()=>s)).toBe(false);
  m.set(DEMONSTRATION_MODE_KEY,'true');expect(readDemonstrationMode(()=>s)).toBe(false);
  expect(()=>writeDemonstrationMode('1' as never,()=>s)).toThrow(TypeError);
 });
 it('reads as off and reports a failed write when storage is unavailable or throws',()=>{
  const throwing={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');},removeItem:()=>{throw new Error('blocked');}};
  expect(readDemonstrationMode(()=>null)).toBe(false);expect(readDemonstrationMode(()=>throwing)).toBe(false);
  expect(readDemonstrationMode(()=>{throw new Error('denied');})).toBe(false);
  expect(writeDemonstrationMode(true,()=>null)).toBe(false);expect(writeDemonstrationMode(true,()=>throwing)).toBe(false);
  const dropping={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};expect(writeDemonstrationMode(true,()=>dropping)).toBe(false);
 });
 it('opens the gate at page load when on; Leave closes it for the page',()=>{
  expect(startupInstructorGate(false)).toBe(INITIAL_INSTRUCTOR_GATE);
  const g=startupInstructorGate(true);expect(g).toEqual({open:true,source:'demonstration-mode'});expect(Object.isFrozen(g)).toBe(true);
  expect(preferencesGate(g)).toBe('options');expect(leaveInstructorMode(g).state).toEqual(INITIAL_INSTRUCTOR_GATE);
  expect(followPageGate(INITIAL_RADIO_ACCESS,g).state.gate).toEqual({open:true,source:'instructor'});
  expect(()=>startupInstructorGate(1 as never)).toThrow(TypeError);
 });
 it('removes Demonstration Mode from the deferred list; FilesBtn stays typed',()=>{
  const keys=TEACHER_DEFERRED.map(d=>d.key);expect(keys).not.toContain('demonstration-mode');expect(keys).toContain('files');
 });
});

describe('T6 Photometer and Spectrometer parameters in the options file',()=>{
 const changed={...COMPILED_INSTRUMENT_PARAMETERS,baseMagnitude:Math.fround(6.5),skyMagnitude:17,baseCount:2000,photometerTimerMs:50,spectrometerSkyMagnitude:Math.fround(19.25),spectrometerBaseCount:80,spectrometerTimerMs:5};
 it('the web file carries them and reads them back; a T5 file without them gives the compiled values',()=>{
  const values={...COMPILED_OPTIONS_FILE_VALUES,parameters:changed},text=writeOptionsFile(values),doc=JSON.parse(text);
  expect(doc.parameters).toEqual(changed);expect(doc.notApplied.instrumentParameters).toBeUndefined();
  const r=readOptionsFile(enc.encode(text));expect(r).toMatchObject({kind:'loaded',source:'web',notApplied:[]});
  if(r.kind==='loaded')expect(r.values.parameters).toEqual(changed);
  delete doc.parameters;const old=readOptionsFile(enc.encode(JSON.stringify(doc)));
  if(old.kind!=='loaded')throw new Error('not loaded');expect(old.values.parameters).toEqual(COMPILED_INSTRUMENT_PARAMETERS);
  expect(readOptionsFile(enc.encode(JSON.stringify({...doc,parameters:{...changed,baseMagnitude:6.1}})))).toEqual({kind:'invalid',reason:'not-options-file'});
  expect(readOptionsFile(enc.encode(JSON.stringify({...doc,parameters:{...changed,baseCount:'2000'}})))).toEqual({kind:'invalid',reason:'not-options-file'});
 });
 it('a native file gives them from their stream fields (float32 / int32 LE)',()=>{
  const b=nativeFile(),view=new DataView(b.buffer);
  for(const f of INSTRUMENT_PARAMETER_FIELDS){const p=nativeStreamOffset(parseInt(f.record,16)),v=changed[f.key];if(f.type==='single')view.setFloat32(p,v,true);else view.setInt32(p,v,true);}
  const r=readOptionsFile(b);if(r.kind!=='loaded')throw new Error('not loaded');
  expect(r.values.parameters).toEqual(changed);expect(r.notApplied).toEqual(['parameters']);
  expect(nativeStreamOffset(0x250c)).toBe(7794);expect(nativeStreamOffset(0x2510)).toBe(7798);expect(nativeStreamOffset(0x2514)).toBe(7802);
  expect(nativeStreamOffset(0x279f)).toBe(8445);expect(nativeStreamOffset(0x27a3)).toBe(8449);expect(nativeStreamOffset(0x27a7)).toBe(8453);expect(nativeStreamOffset(0x27ab)).toBe(8457);
  const compiled=readOptionsFile(nativeFile());if(compiled.kind!=='loaded')throw new Error('not loaded');expect(compiled.values.parameters).toEqual(COMPILED_INSTRUMENT_PARAMETERS);
 });
 it('a non-finite native Single keeps its compiled value and is reported',()=>{
  const b=nativeFile();new DataView(b.buffer).setFloat32(nativeStreamOffset(0x2510),NaN,true);
  const r=readOptionsFile(b);if(r.kind!=='loaded')throw new Error('not loaded');
  expect(r.values.parameters.skyMagnitude).toBe(16);expect(r.notApplied).toEqual(['parameters','instrumentParameters']);
 });
});
