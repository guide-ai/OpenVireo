import {describe,it,expect} from 'vitest';
import {RA19_IGNORED_VK,RA19_KEY_DIRECTIONS,RA19_TABLE_FIRST_VK,RA19_TABLE_LAST_VK,browserTableKey,browserVirtualKey,ra19Dispatch,ra19TableDirection,
 type BrowserKeyInput,type Ra19Phase} from './radioKeyboard';
import type {ManualDirection} from './radioAntenna';
import provenance from '../../docs/RADIO-ANTENNA-PROVENANCE.json';

// RA-19 decoder. Expected values are an independent literal transcription, never imported from the module:
// - (virtual key, lookup index) pairs from radio-manual-slew-preparation/manual-static-values.json keyboardLookupTables
//   (both 51-byte tables share SHA-256 a4e0d61d…; every other cell of 69..119 is index 0);
// - lookup index → case block → handler from the jump-table target lists and the entry-aligned case listings;
// - handler address → direction from the TRadioLab method names (NBtnMouseDown 0x5662a0 …).
// The prologues compare Word [Key] with 0x65 first, then the latch +0x5d2, then `add eax,-69; cmp eax,0x32; ja`.
// Chosen implementation contract; not a native runtime oracle.
const TABLE_INDEX=new Map<number,number>([[69,2],[78,4],[83,1],[87,3],[98,1],[100,2],[101,2],[102,3],[104,4],[110,4],[115,1],[119,3]]);
const CASES:Record<Ra19Phase,Record<number,{caseAddress:string;handler:string}>>={
 down:{1:{caseAddress:'0x568148',handler:'0x5663c4'},2:{caseAddress:'0x56816c',handler:'0x5664e8'},3:{caseAddress:'0x568190',handler:'0x566634'},4:{caseAddress:'0x5681b4',handler:'0x5662a0'}},
 up:{1:{caseAddress:'0x56825a',handler:'0x56645c'},2:{caseAddress:'0x56826c',handler:'0x56658c'},3:{caseAddress:'0x56827e',handler:'0x5666dc'},4:{caseAddress:'0x568290',handler:'0x566338'}},
};
const HANDLER_DIRECTION:Record<string,ManualDirection>={
 '0x5662a0':'north','0x5663c4':'south','0x5664e8':'east','0x566634':'west',// MouseDown
 '0x566338':'north','0x56645c':'south','0x56658c':'east','0x5666dc':'west',// MouseUp
};
/** Native order, restated: Word compare with 0x65, latch, unsigned idx = Key − 69 against 50, lookup. */
function expected(vk:number,phase:Ra19Phase,latched:boolean):string{
 if(vk===0x65)return 'ignored-vk-0x65';
 if(phase==='down'?latched:!latched)return 'latch';
 if(((vk-69)>>>0)>0x32)return 'outside-table';
 const index=TABLE_INDEX.get(vk)??0;
 if(index===0)return 'table-default';
 const c=CASES[phase][index];
 return `${phase==='down'?'press':'release'} ${HANDLER_DIRECTION[c.handler]} ${c.caseAddress} ${c.handler} d4=${phase==='down'}`;
}
const actual=(vk:number,phase:Ra19Phase,latched:boolean)=>{
 const r=ra19Dispatch(vk,phase,latched);
 return r.kind==='press'||r.kind==='release'?`${r.kind} ${r.direction} ${r.caseAddress} ${r.handler} d4=${r.virtualD4}`:r.kind;
};

describe('RA-19 table decoder (FormKeyDown 0x5680c4 / FormKeyUp 0x5681dc)',()=>{
 it('the table constants equal the independent transcription',()=>{
  expect([RA19_TABLE_FIRST_VK,RA19_TABLE_LAST_VK,RA19_IGNORED_VK]).toEqual([69,119,101]);
  const fromTranscription=Object.fromEntries([...TABLE_INDEX].map(([vk,i])=>[vk,HANDLER_DIRECTION[CASES.down[i].handler]]));
  expect({...RA19_KEY_DIRECTIONS}).toEqual(fromTranscription);
  for(const i of TABLE_INDEX.values())expect(HANDLER_DIRECTION[CASES.up[i].handler]).toBe(HANDLER_DIRECTION[CASES.down[i].handler]);
  expect(Object.isFrozen(RA19_KEY_DIRECTIONS)).toBe(true);
  expect(ra19TableDirection(101)).toBeNull();expect(ra19TableDirection(78)).toBe('north');expect(ra19TableDirection(68)).toBeNull();expect(ra19TableDirection(1.5)).toBeNull();
 });
 it('every Word in both phases and latch states matches the native order (one bounded scan, one assertion)',()=>{
  const mismatches:string[]=[];let calls=0,pressCells=0,releaseCells=0,ignoredBeforeLatch=0;
  for(let vk=0;vk<=0xffff;vk++)for(const phase of ['down','up'] as const)for(const latched of [false,true]){
   const a=actual(vk,phase,latched),e=expected(vk,phase,latched);calls++;
   if(a!==e&&mismatches.length<20)mismatches.push(`${vk} ${phase} ${latched}: ${a} ≠ ${e}`);
   if(a.startsWith('press'))pressCells++;if(a.startsWith('release'))releaseCells++;if(vk===0x65&&a==='ignored-vk-0x65')ignoredBeforeLatch++;
  }
  expect({mismatches,calls,pressCells,releaseCells,ignoredBeforeLatch}).toEqual({mismatches:[],calls:262144,pressCells:11,releaseCells:11,ignoredBeforeLatch:4});
 });
 it('frozen results; KeyDown needs the latch clear and KeyUp set; only KeyDown calls +0xd4',()=>{
  const p=ra19Dispatch(78,'down',false),r=ra19Dispatch(87,'up',true);
  expect(Object.isFrozen(p)&&Object.isFrozen(r)).toBe(true);
  expect(p).toEqual({kind:'press',direction:'north',virtualD4:true,caseAddress:'0x5681b4',handler:'0x5662a0'});
  expect(r).toEqual({kind:'release',direction:'west',virtualD4:false,caseAddress:'0x56827e',handler:'0x5666dc'});
  expect(ra19Dispatch(78,'down',true)).toEqual({kind:'latch'});expect(ra19Dispatch(78,'up',false)).toEqual({kind:'latch'});
  // The latch is tested before the table bounds: an out-of-table key reports the latch first.
  expect(ra19Dispatch(0,'down',true)).toEqual({kind:'latch'});expect(ra19Dispatch(0xffff,'up',false)).toEqual({kind:'latch'});
  expect(ra19Dispatch(70,'down',false)).toEqual({kind:'table-default'});expect(ra19Dispatch(68,'up',true)).toEqual({kind:'outside-table'});
  // VK_F4 (0x73) and VK_F8 (0x77) are table keys natively (the browser does not use them).
  expect(ra19Dispatch(115,'down',false)).toMatchObject({kind:'press',direction:'south'});expect(ra19Dispatch(119,'down',false)).toMatchObject({kind:'press',direction:'west'});
 });
 it('rejects inputs that are not a Word, a phase and a boolean (no wrapping or coercion)',()=>{
  for(const vk of [Number.NaN,1.5,-1,0x10000,Number.POSITIVE_INFINITY,'78',null])
   expect(()=>ra19Dispatch(vk as number,'down',false),String(vk)).toThrow('Invalid RA-19 key input');
  expect(()=>ra19Dispatch(78,'press' as Ra19Phase,false)).toThrow('Invalid RA-19 key input');
  expect(()=>ra19Dispatch(78,'down',1 as unknown as boolean)).toThrow('Invalid RA-19 key input');
 });
});

const k=(key:string,code:string,over:Partial<BrowserKeyInput>={}):BrowserKeyInput=>({key,code,location:0,ctrlKey:false,altKey:false,metaKey:false,altGraph:false,isComposing:false,...over});
const pad=(key:string,code:string,over:Partial<BrowserKeyInput>={})=>k(key,code,{location:3,...over});

describe('WEB-KEY-02 DOM key → Windows virtual key (browser assumption)',()=>{
 it('ASCII letters follow the interpreted key in either case; the physical code is identity only',()=>{
  for(let i=0;i<26;i++){
   const upper=String.fromCharCode(65+i),lower=upper.toLowerCase();
   expect(browserVirtualKey(k(lower,`Key${upper}`),'down')).toEqual({vk:65+i});expect(browserVirtualKey(k(upper,`Key${upper}`),'down')).toEqual({vk:65+i});// Shift or CapsLock
  }
  expect(browserVirtualKey(k('w','KeyZ'),'down')).toEqual({vk:87});// e.g. AZERTY: the layout's letter, not the US position
  expect(browserVirtualKey(k('n','KeyN',{location:3}),'down')).toEqual({refused:'unmapped',vk:null});
  // Only the 52 ASCII letters map among single characters in the first 0x300 code points.
  let mapped=0;for(let c=0;c<0x300;c++)if(!('refused' in browserVirtualKey(k(String.fromCharCode(c),'KeyA'),'down')))mapped++;
  expect(mapped).toBe(52);
 });
 it('modifiers refuse a new press only; releases ignore them',()=>{
  for(const m of [{ctrlKey:true},{altKey:true},{metaKey:true},{altGraph:true}]){
   expect(browserVirtualKey(k('n','KeyN',m),'down')).toEqual({refused:'modifier',vk:null});
   expect(browserVirtualKey(k('n','KeyN',m),'up')).toEqual({vk:78});
  }
 });
 it('keypad needs location 3, the NumpadN code and the matching digit; decimal only . or ,',()=>{
  for(let n=0;n<10;n++)expect(browserVirtualKey(pad(String(n),`Numpad${n}`),'down')).toEqual({vk:96+n});
  expect(browserVirtualKey(pad('.','NumpadDecimal'),'down')).toEqual({vk:110});expect(browserVirtualKey(pad(',','NumpadDecimal'),'down')).toEqual({vk:110});
  const unmapped={refused:'unmapped',vk:null};
  for(const e of [pad('ArrowUp','Numpad8'),pad('Delete','NumpadDecimal'),pad(':','NumpadDecimal'),pad('9','Numpad8'),k('8','Numpad8'),k('8','Digit8'),k('ArrowUp','ArrowUp'),
   k('у','KeyE'),k('Dead','Quote'),k('Unidentified',''),k('n',''),k(' ','Space'),k('Enter','Enter')])expect(browserVirtualKey(e,'down'),`${e.key} ${e.code}`).toEqual(unmapped);
  // keyCode/which are never read: a misleading legacy keyCode changes nothing.
  expect(browserVirtualKey({...pad('ArrowUp','Numpad8'),keyCode:104,which:104} as BrowserKeyInput,'down')).toEqual(unmapped);
 });
 it('composition, function keys and invalid shapes are refused',()=>{
  expect(browserVirtualKey(k('n','KeyN',{isComposing:true}),'down')).toEqual({refused:'composition',vk:null});
  expect(browserVirtualKey(k('Process','KeyN'),'up')).toEqual({refused:'composition',vk:null});
  for(let n=1;n<=12;n++)expect(browserVirtualKey(k(`F${n}`,`F${n}`),'down')).toEqual({refused:'reserved-function-key',vk:111+n});
  for(const bad of [null,{},{...k('n','KeyN'),location:4},{...k('n','KeyN'),location:1.5},{...k('n','KeyN'),ctrlKey:'no'},{...k('n','KeyN'),key:'x'.repeat(65)},{...k('n','KeyN'),isComposing:undefined}])
   expect(browserVirtualKey(bad as BrowserKeyInput,'down')).toEqual({refused:'invalid-shape',vk:null});
  expect(browserVirtualKey(k('n','KeyN'),'press' as Ra19Phase)).toEqual({refused:'invalid-shape',vk:null});
 });
 it('browserTableKey: one table for the browser; keypad 5 is the native no-op; F4/F8 stay core-only',()=>{
  expect(browserTableKey(k('n','KeyN'),'down',false)).toEqual({kind:'decoded',vk:78,admitted:true,dispatch:ra19Dispatch(78,'down',false)});
  expect(browserTableKey(k('S','KeyS'),'down',true)).toMatchObject({kind:'decoded',admitted:true,dispatch:{kind:'latch'}});
  expect(browserTableKey(k('e','KeyE',{ctrlKey:true}),'up',true)).toMatchObject({kind:'decoded',admitted:true,dispatch:{kind:'release',direction:'east'}});
  expect(browserTableKey(pad('4','Numpad4'),'down',false)).toMatchObject({vk:100,dispatch:{kind:'press',direction:'east'}});
  expect(browserTableKey(pad('2','Numpad2'),'down',false)).toMatchObject({dispatch:{kind:'press',direction:'south'}});
  expect(browserTableKey(pad('6','Numpad6'),'down',false)).toMatchObject({vk:102,dispatch:{kind:'press',direction:'west'}});
  expect(browserTableKey(pad('8','Numpad8'),'down',false)).toMatchObject({dispatch:{kind:'press',direction:'north'}});
  expect(browserTableKey(pad(',','NumpadDecimal'),'down',false)).toMatchObject({dispatch:{kind:'press',direction:'north'}});
  expect(browserTableKey(pad('5','Numpad5'),'down',false)).toEqual({kind:'decoded',vk:101,admitted:false,dispatch:{kind:'ignored-vk-0x65'}});
  expect(browserTableKey(k('a','KeyA'),'down',false)).toEqual({kind:'decoded',vk:65,admitted:false,dispatch:{kind:'outside-table'}});
  expect(browserTableKey(k('f','KeyF'),'down',false)).toEqual({kind:'decoded',vk:70,admitted:false,dispatch:{kind:'table-default'}});
  for(const [key,vk] of [['F4',115],['F8',119]] as const){
   expect(browserTableKey(k(key,key),'down',false)).toEqual({kind:'refused',reason:'reserved-function-key',vk});
   expect(browserTableKey(k(key,key),'up',true)).toEqual({kind:'refused',reason:'reserved-function-key',vk});
  }
  expect(Object.isFrozen(browserTableKey(k('n','KeyN'),'down',false))).toBe(true);
 });
});

describe('RA-19 provenance record',()=>{
 it('records the corrected KeyUp (no +0xd4), the web policies and the evidence it cites',()=>{
  const ra19=provenance.contracts.find(c=>c.id==='RA-19')!;
  expect(ra19.observed).toContain('do NOT call +0xd4');expect(ra19.title).not.toContain('not modelled');
  const evidence=new Set(provenance.derivedEvidence.map(e=>e.id));
  for(const e of ra19.evidence)expect(evidence.has(e),e).toBe(true);
  const web=new Set(provenance.webPolicies.map(p=>p.id));
  for(const policy of ['WEB-KEY-01','WEB-KEY-02','WEB-KEY-03','WEB-MANUAL-02'])expect(web.has(policy)).toBe(true);
 });
});
