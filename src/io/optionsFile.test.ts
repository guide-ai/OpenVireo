import {describe,expect,it} from 'vitest';
import {COMPILED_OPTIONS_FILE_VALUES,NATIVE_OPTIONS_FIELDS,NATIVE_OPTIONS_FILE_BYTES,NATIVE_PARAMETER_FIELDS,NOT_APPLIED,NOT_APPLIED_KEYS,OPTIONS_FILE_BYTES,OPTIONS_FILE_KEYS,OPTIONS_FILE_LITERALS,
 nativeStreamOffset,optionsFileErrorBox,readOptionsFile,vireoVersionKey,vireoVersionMatches,writeOptionsFile,type OptionsFileValues} from './optionsFile';
import {DEMONSTRATION_MODE_KEY,readDemonstrationMode,writeDemonstrationMode} from './demonstrationModeStorage';
import {INITIAL_INSTRUCTOR_GATE,leaveInstructorMode,preferencesGate,startupInstructorGate} from '../core/instructorMode';
import {INITIAL_RADIO_ACCESS,followPageGate} from '../core/radioAccessOptions';
import {TEACHER_DEFERRED} from '../core/teacherDeferred';

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
 return b;
}
const all=(v:boolean):OptionsFileValues=>Object.freeze(Object.fromEntries(OPTIONS_FILE_KEYS.map(k=>[k,v]))) as OptionsFileValues;

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
  expect(doc.notApplied).toEqual({administrator:false,computeMagnitudes:true,includeRIColors:true,detectSky:false,restrictScopeAccess:true,soundEffects:true,writeLogFile:false,plotHRDiagram:true,setEBmV:true,labTableNumber:'',parameters:'compiled'});
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
  const doc=JSON.parse(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES));doc.notApplied.administrator=true;doc.notApplied.restrictScopeAccess=false;doc.notApplied.labTableNumber='12';
  const r=readOptionsFile(enc.encode(JSON.stringify(doc)));
  expect(r).toMatchObject({kind:'loaded',administratorCleared:true,notApplied:['restrictScopeAccess','labTableNumber']});
  if(r.kind==='loaded')expect(r.values).toEqual(COMPILED_OPTIONS_FILE_VALUES);
 });
 it('applies VIREO\'s version check and refuses other files',()=>{
  const doc=JSON.parse(writeOptionsFile(COMPILED_OPTIONS_FILE_VALUES));
  expect(readOptionsFile(enc.encode(JSON.stringify({...doc,version:'1.40'})))).toEqual({kind:'version-error'});
  expect(readOptionsFile(enc.encode(JSON.stringify({...doc,version:'1.5049'}))).kind).toBe('loaded');
  for(const bad of ['{',JSON.stringify({...doc,format:'other'}),JSON.stringify({...doc,options:{...doc.options,editMode:'yes'}}),JSON.stringify({...doc,notApplied:{detectSky:'no'}}),JSON.stringify({})])
   expect(readOptionsFile(enc.encode(bad))).toEqual({kind:'invalid',reason:'not-options-file'});
  expect(readOptionsFile(new Uint8Array(70000))).toEqual({kind:'invalid',reason:'too-large'});
  expect(()=>readOptionsFile('x' as never)).toThrow(TypeError);
 });
});

describe('T2 native VEO_OPTS.INI (read only)',()=>{
 it('reads the compiled stream as the compiled options; the parameter block is listed as not applied',()=>{
  expect(readOptionsFile(nativeFile())).toEqual({kind:'loaded',source:'native',values:COMPILED_OPTIONS_FILE_VALUES,notApplied:['parameters'],administratorCleared:false,fastSlewingRate:null});
 });
 it('decodes DemoBox inverted, Fast Slewing as rate 4 and the boolean bytes',()=>{
  const r=readOptionsFile(nativeFile({0x27c6:0,0x27af:3,0x27c8:1,0x27ca:2,0x27d5:1,0x27d3:0,0x27d1:0,0x27c1:2}));
  expect(r.kind).toBe('loaded');if(r.kind!=='loaded')return;
  expect(r.values).toMatchObject({demonstrationMode:true,fastSlewing:false,testMode:true,editMode:true,virtualObservatory:true,infraredCamera:false});
  expect(r.notApplied).toEqual(['restrictScopeAccess','labTableNumber','parameters']);
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
