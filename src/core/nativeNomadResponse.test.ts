import {describe,it,expect} from 'vitest';
import {readNativeNomadResponse,NativeNomadResponseError,nativeNomadSourceLists} from './nativeNomadResponse';
import type {NomadRowContext} from './nativeNomadRows';
const keys=['id','RA','DEC','MuRA','MuDEC','B','V','R','J','H','K'];
const values=['SYNTHETIC-ONLY','12.25','-30.5','0','0','14','13.5','13','12','11','10'];
const header=keys.map(k=>(' '+k+'|').padStart(24,' ')).join(''),units='hh.hhh dd.ddd';
const row=(v='13.5',id='SYNTHETIC-ONLY')=>values.map((s,i)=>(i===0?id:i===6?v:s).padStart(23,' ')+' ').join('');
const context:NomadRowContext={band:'V',epochOffsetYears:0};
const bytes=(s:string)=>new TextEncoder().encode(s);
const source=(body:string[],marker='END')=>['# SYNTHETIC ONLY',marker,header,units,...body].join('\n');
function fails(s:Uint8Array,code:NativeNomadResponseError['code'],c=context){try{readNativeNomadResponse(s,c);expect.fail('Expected response rejection');}catch(e){expect(e).toBeInstanceOf(NativeNomadResponseError);expect((e as NativeNomadResponseError).code).toBe(code);}}
describe('bounded NOMAD response framing,not actual response authority',()=>{
 it.each(['END','#END','END extra','#END extra','ENDING'])('finds source prefix %s then immediately consumes header/units',marker=>{
  const s=source([row()],marker),r=readNativeNomadResponse(bytes(s),context);expect(r.originalText).toBe(s);expect(r.marker.text).toBe(marker);expect(r.preamble.map(l=>l.text)).toEqual(['# SYNTHETIC ONLY']);expect(r.header.text).toBe(header);expect(r.units.text).toBe(units);expect(r.entries[0].result.kind).toBe('candidate');
 });
 it('preserves physical order,duplicates and line spans,including final line without LF',()=>{
  const s=source([row('13.5','A'),row('14','B'),row('13.5','A')]),r=readNativeNomadResponse(bytes(s),context);
  expect(r.entries.map(e=>e.result.kind==='candidate'?e.result.row.nativeIdentifier.trim():null)).toEqual(['A','B','A']);
  expect(r.entries.map(e=>e.line.lineNumber)).toEqual([5,6,7]);
  for(const {line}of r.entries)expect(s.slice(line.startByte,line.endByte)).toBe(line.text);
  expect(r.entries.map(e=>e.line.terminated)).toEqual([true,true,false]);
 });
 it('does not create a phantom row after trailing LF but retains real blank rows',()=>{
  expect(readNativeNomadResponse(bytes(source([row()])+'\n'),context).entries).toHaveLength(1);
  const r=readNativeNomadResponse(bytes(source([row(),'',''])+'\n'),context);expect(r.entries.map(e=>e.result.kind)).toEqual(['candidate','invalid','invalid']);expect(r.entries[1].line.text).toBe('');
 });
 it('skips only comments starting in the first byte and continues after bad or rejected rows',()=>{
  const r=readNativeNomadResponse(bytes(source([row(),'# comment',' # not a comment','',row('0'),row('30'),row('bad'),row('12') ])),context);
  expect(r.entries.map(e=>e.result.kind)).toEqual(['candidate','comment','invalid','invalid','rejected','rejected','invalid','candidate']);expect(r.entries[6].result).toEqual({kind:'invalid',code:'number',field:'V'});
 });
 it('does not interpret a body END as an end-of-data terminator',()=>{
  const r=readNativeNomadResponse(bytes(source([row(),'END','#END',row('12')])),context);expect(r.entries.map(e=>e.result.kind)).toEqual(['candidate','invalid','comment','candidate']);
 });
 it('validates header before units and points diagnostics at the first failed stage',()=>{
  for(const h of[header.replace(' K|',' X|'),'no columns',''])for(const u of['hh mm ss dd mm ss','foo','']){
   try{readNativeNomadResponse(bytes(['# SYNTHETIC ONLY','END',h,u,row()].join('\n')),context);expect.fail('Expected header rejection');}
   catch(e){expect(e).toBeInstanceOf(NativeNomadResponseError);expect((e as NativeNomadResponseError).code).toBe('header');expect((e as NativeNomadResponseError).lineNumber).toBe(3);}
  }
  try{readNativeNomadResponse(bytes(source([row()]).replace(units,'')),context);expect.fail('Expected descriptor rejection');}
  catch(e){expect((e as NativeNomadResponseError).code).toBe('header');expect((e as NativeNomadResponseError).lineNumber).toBe(4);}
  for(const suffix of['','\n'])for(const h of[header,'no columns']){
   try{readNativeNomadResponse(bytes('END\n'+h+suffix),context);expect.fail('Expected missing-descriptor rejection');}
   catch(e){expect((e as NativeNomadResponseError).code).toBe('header');expect((e as NativeNomadResponseError).lineNumber).toBe(h===header?3:2);}
  }
 });
 it('admits zero rows without claiming a successful observing catalog',()=>{
  const r=readNativeNomadResponse(bytes(source([])),context);expect(r.entries).toEqual([]);expect(r).not.toHaveProperty('success');expect(r).not.toHaveProperty('request');expect(r).not.toHaveProperty('observation');
 });
 it('owns immutable text,context and ledger without mutating caller bytes',()=>{
  const s=source([row()]),b=bytes(s),c={...context},r=readNativeNomadResponse(b,c);expect(new TextDecoder().decode(b)).toBe(s);b.fill(88);c.epochOffsetYears=40;expect(r.originalText).toBe(s);expect(r.context.epochOffsetYears).toBe(0);
  for(const o of[r,r.context,r.preamble,r.marker,r.header,r.units,r.entries,r.entries[0],r.entries[0].line,r.entries[0].result])expect(Object.isFrozen(o)).toBe(true);
 });
 it.each(['end','#end',' END',' #END','XEND'])('rejects absent marker rather than matching %s',marker=>fails(bytes(source([row()],marker)),'marker'));
 it.each(['END','END\n','END\n'+header])('rejects truncated header/units %s',s=>fails(bytes(s),'header'));
 it('uses the first marker;does not search past a bad immediate header',()=>fails(bytes(['END','# not header','hh.hhh dd.ddd','END',header,units,row()].join('\n')),'header'));
 it('rejects unsupported units and missing columns atomically',()=>{
  fails(bytes(source([row()]).replace(units,'hh mm ss dd mm ss')),'unsupported-units');fails(bytes(source([row()]).replace(' K|',' X|')),'header');
 });
 it.each(['\r','\t','\0','é','\uFEFF'])('rejects unsupported encoding/control %s without normalization',s=>fails(bytes(source([row()])+s),'encoding'));
 it('bounds source size,line length and line count independently',()=>{
  fails(new Uint8Array(),'size');fails(new Uint8Array(2*1024*1024+1),'size');fails(bytes('x'.repeat(4097)+'\n'+source([])),'line-limit');fails(bytes('\n'.repeat(10000)+source([])),'line-limit');
  expect(readNativeNomadResponse(bytes('x'.repeat(4096)+'\n'+source([])),context).preamble[0].text).toHaveLength(4096);
 });
 it('requires explicit valid context even when the body is empty',()=>{for(const c of[{band:'I',epochOffsetYears:0},{band:'V',epochOffsetYears:NaN},{band:'V',epochOffsetYears:1001},null])fails(bytes(source([])),'context',c as NomadRowContext);});
});

const bounds={minRAHours:0,maxRAHours:24,minDecDegrees:-90,maxDecDegrees:90,magnitudeLimit:30};
describe('owned parsed response to original ordered catalog/selection',()=>{
 it('keeps physical ledger separate from both native insertions and preserves duplicates',()=>{
  const r=readNativeNomadResponse(bytes(source([row('13','A'),row('14','B'),row('15','C')])),context),s=nativeNomadSourceLists(r,bounds);
  expect(r.entries.map(e=>e.result.kind==='candidate'?e.result.row.nativeIdentifier.trim():null)).toEqual(['A','B','C']);
  expect(s.catalogEntries.map(e=>e.result.row.nativeIdentifier.trim())).toEqual(['A','C','B']);expect(s.selectedEntries.map(e=>e.result.row.nativeIdentifier.trim())).toEqual(['A','B','C']);
  expect(s.selectedEntries).toHaveLength(3);expect(s.hasSources).toBe(true);expect(s.nativeMinimumMagnitude).toBe(13);expect(s.nativeMaximumMagnitude).toBe(15);expect(s.response).toBe(r);
 });
 it('filters only valid candidates,retains source entries and applies the selected magnitude limit',()=>{
  const r=readNativeNomadResponse(bytes(source(['# comment',row('0'),row('bad'),row('12','A'),row('16','B')])),context),s=nativeNomadSourceLists(r,{...bounds,magnitudeLimit:14});
  expect(s.catalogEntries).toHaveLength(2);expect(s.selectedEntries).toHaveLength(1);expect(s.selectedEntries[0]).toBe(r.entries[3]);expect(s.nativeMinimumMagnitude).toBe(12);expect(s.nativeMaximumMagnitude).toBe(12);expect(r.entries).toHaveLength(5);
 });
 it('preserves native25/-2 sentinels rather than replacing them with mathematical infinities/extrema',()=>{
  const high=nativeNomadSourceLists(readNativeNomadResponse(bytes(source([row('27')])),context),bounds);expect(high.nativeMinimumMagnitude).toBe(25);expect(high.nativeMaximumMagnitude).toBe(27);
  const low=nativeNomadSourceLists(readNativeNomadResponse(bytes(source([row('-5')])),context),bounds);expect(low.nativeMinimumMagnitude).toBe(-5);expect(low.nativeMaximumMagnitude).toBe(-2);
  const none=nativeNomadSourceLists(readNativeNomadResponse(bytes(source([])),context),bounds);expect(none.hasSources).toBe(false);expect(none.nativeMinimumMagnitude).toBe(25);expect(none.nativeMaximumMagnitude).toBe(-2);
 });
 it('owns selection bounds and rejects reconstructed/relabelled response objects',()=>{
  const r=readNativeNomadResponse(bytes(source([row()])),context),b={...bounds},s=nativeNomadSourceLists(r,b);b.magnitudeLimit=0;expect(s.bounds.magnitudeLimit).toBe(30);
  for(const o of[s,s.bounds,s.catalogEntries,s.selectedEntries])expect(Object.isFrozen(o)).toBe(true);
  for(const forged of[JSON.parse(JSON.stringify(r)),{...r},{...r,entries:[]}])expect(()=>nativeNomadSourceLists(forged,bounds)).toThrow('ownership');
  expect(()=>nativeNomadSourceLists(r,{...bounds,magnitudeLimit:13.1})).toThrow('selection');expect(()=>nativeNomadSourceLists(r,{...bounds,minRAHours:NaN})).toThrow('selection');
 });
});
