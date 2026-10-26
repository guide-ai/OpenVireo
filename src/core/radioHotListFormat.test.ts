import {describe,expect,it} from 'vitest';
import {encodeHtlExtended,parseHtl,serializeHtl,type HtlList} from './hotList';
import {htlRaKeys,radioHotListProjection} from './radioHotList';
import {formatHotListDec,formatHotListRa,formatRadioHotListRow} from './radioHotListFormat';

// Synthetic records only (no original HTL data). Every expected string was traced by hand through 0x590110/0x486ca0/
// 0x486bc0 with exact dyadic inputs; they test the chosen web contract (binary64, toFixed), not the native runtime.
const ext=(significand:bigint,signExponent:number)=>{const b=new Uint8Array(10),v=new DataView(b.buffer);v.setBigUint64(0,significand,true);v.setUint16(8,signExponent,true);return b;};
const text=(b:Uint8Array,at:number,s:string)=>{b[at]=s.length;for(let i=0;i<s.length;i++)b[at+1+i]=s.charCodeAt(i);};
function record(id:string,ra:number|Uint8Array,dec:number,remarks=''){
 const b=new Uint8Array(86);text(b,0,id);text(b,45,remarks);
 b.set(typeof ra==='number'?encodeHtlExtended(ra):ra,25);b.set(encodeHtlExtended(dec),35);return b;
}
const htl=(...rows:readonly (readonly [string,number|Uint8Array,number,string?])[]):HtlList=>{
 const bytes=new Uint8Array(rows.length*86);rows.forEach(([id,ra,dec,remarks],i)=>bytes.set(record(id,ra,dec,remarks),i*86));return parseHtl(bytes);
};
const e20=2**-20;

describe('radio hot list coordinate fields (0x486ca0 via 0x590110)',()=>{
 it('matches the contract goldens',()=>{
  expect(formatHotListRa(1.5)).toBe('   1h 30m 00.00s ');
  expect(formatHotListDec(-0.125)).toBe('  -0° 07\' 30.0"  ');
  expect(formatHotListRa(0.0625)).toBe('   0h 03m 45.00s ');
  expect(formatHotListDec(-0.0625)).toBe('  -0° 03\' 45.0"  ');
  expect(formatHotListRa(1/512)).toBe('   0h 00m 07.03s ');
 });
 it('prints −0 without a sign but keeps the sign of a negative subdegree value',()=>{
  expect(formatHotListRa(0)).toBe('   0h 00m 00.00s ');expect(formatHotListRa(-0)).toBe('   0h 00m 00.00s ');
  expect(formatHotListDec(0)).toBe('   0° 00\' 00.0"  ');expect(formatHotListDec(-0)).toBe('   0° 00\' 00.0"  ');
  expect(formatHotListDec(-1/512)).toBe('  -0° 00\' 07.0"  ');
  expect(formatHotListDec(-30.5)).toBe(' -30° 30\' 00.0"  ');
  expect(formatHotListDec(90)).toBe('  90° 00\' 00.0"  ');expect(formatHotListDec(-90)).toBe(' -90° 00\' 00.0"  ');
 });
 it('adds the leading seconds zero from the rounded value, not from the string length',()=>{
  // 347/2048 h or °: 10 min 9.9609375 s.
  expect(formatHotListDec(347/2048)).toBe('   0° 10\' 10.0"  ');// Round(99.6) = 100 → no '0'
  expect(formatHotListRa(347/2048)).toBe('   0h 10m 09.96s ');
  expect(formatHotListDec(1/512)).toBe('   0° 00\' 07.0"  ');
 });
 it('carries rounded seconds into minutes and minutes into the whole part per digit count',()=>{
  expect(formatHotListDec(1.5-e20)).toBe('   1° 30\' 00.0"  ');expect(formatHotListRa(1.5-e20)).toBe('   1h 30m 00.00s ');
  // 273/8192: 1 min 59.970703125 s → Dec (0.1″) carries, RA (0.01 s) does not.
  expect(formatHotListDec(273/8192)).toBe('   0° 02\' 00.0"  ');expect(formatHotListRa(273/8192)).toBe('   0h 01m 59.97s ');
  expect(formatHotListDec(90-e20)).toBe('  90° 00\' 00.0"  ');expect(formatHotListDec(-(90-e20))).toBe(' -90° 00\' 00.0"  ');
 });
 it('can display 24h while the record, its bytes and the order keep the imported RA',()=>{
  const list=htl(['Late',24-e20,0],['Early',23.5,0]),before=serializeHtl(list);
  expect(list[0].ra).toBe(24-e20);expect(list[0].ra).toBeLessThan(24);
  expect(formatRadioHotListRow(list[0]).slice(24,41)).toBe('  24h 00m 00.00s ');
  expect(radioHotListProjection(list).rows.map(r=>r.sourceIndex)).toEqual([1,0]);
  expect(serializeHtl(list)).toEqual(before);
 });
 it('refuses values outside the codec domain',()=>{
  for(const ra of [24,-1,NaN,Infinity,-Infinity])expect(()=>formatHotListRa(ra)).toThrow(RangeError);
  for(const dec of [90.5,-91,NaN,Infinity,-Infinity])expect(()=>formatHotListDec(dec)).toThrow(RangeError);
 });
});

describe('radio hot list row (0x590110)',()=>{
 const raOne='   1h 00m 00.00s ',decThirty='  30° 00\' 00.0"  ';
 it('pads the ID to 24 and appends RA, Dec and remarks without ordinal or separator',()=>{
  const [twin]=htl(['Twin',1,30,'pair']);
  expect(formatRadioHotListRow(twin)).toBe('Twin'+' '.repeat(20)+raOne+decThirty+'pair');
  const id24='ABCDEFGHIJKLMNOPQRSTUVWX';
  expect(formatRadioHotListRow({id:id24,remarks:'',ra:1,dec:30})).toBe(id24+raOne+decThirty);
  expect(formatRadioHotListRow({id:'',remarks:'',ra:1,dec:30})).toBe(' '.repeat(24)+raOne+decThirty);
 });
 it('keeps Latin-1 text, trailing remark spaces and markup literally',()=>{
  const remarks='r'.repeat(36)+'    ';
  const list=htl(['Café ñ',1,30,'µ'],['<b>x</b>',1,30,remarks]);
  expect(formatRadioHotListRow(list[0])).toBe('Café ñ'+' '.repeat(18)+raOne+decThirty+'µ');
  expect(formatRadioHotListRow(list[1])).toBe('<b>x</b>'+' '.repeat(16)+raOne+decThirty+remarks);
  for(const row of list)expect(formatRadioHotListRow(row)).toHaveLength(58+row.remarks.length);
  expect(formatRadioHotListRow(list[1])).toHaveLength(98);
 });
 it('formats a raw 1 + 2^-63 like an exact 1 while the projection still orders them apart; duplicates stay separate rows',()=>{
  const list=htl(['High',ext(0x8000000000000001n,0x3fff),30],['Low',1,30],['Dup',1,30],['Dup',1,30]);
  expect(formatRadioHotListRow(list[0]).slice(24)).toBe(formatRadioHotListRow(list[1]).slice(24));
  expect(htlRaKeys(list)[0]).toBeGreaterThan(htlRaKeys(list)[1]);
  const rows=radioHotListProjection(list).rows;
  expect(rows.map(r=>r.sourceIndex)).toEqual([1,3,2,0]);
  expect(formatRadioHotListRow(rows[1].record)).toBe(formatRadioHotListRow(rows[2].record));
  expect(rows[1].record).not.toBe(rows[2].record);
 });
 it('refuses text outside the codec domain',()=>{
  const row={id:'A',remarks:'',ra:1,dec:30};
  for(const [id,remarks] of [['x'.repeat(25),''],['A','x'.repeat(41)],['a\nb',''],['A','Ā'],['\u007f','']])expect(()=>formatRadioHotListRow({...row,id,remarks})).toThrow(RangeError);
  expect(()=>formatRadioHotListRow({...row,ra:24})).toThrow(RangeError);
 });
 it('is deterministic and changes neither the list, its bytes nor the projection',()=>{
  const list=htl(['Zeta',23.5,10,'last'],['Mid',12,-5,'middle'],['',0,-0]),bytes=serializeHtl(list),projection=radioHotListProjection(list);
  const first=projection.rows.map(r=>formatRadioHotListRow(r.record)),second=projection.rows.map(r=>formatRadioHotListRow(r.record));
  expect(second).toEqual(first);
  expect(first).toEqual([' '.repeat(24)+'   0h 00m 00.00s '+'   0° 00\' 00.0"  ','Mid'+' '.repeat(21)+'  12h 00m 00.00s '+'  -5° 00\' 00.0"  middle','Zeta'+' '.repeat(20)+'  23h 30m 00.00s '+'  10° 00\' 00.0"  last']);
  expect(serializeHtl(list)).toEqual(bytes);expect(radioHotListProjection(list)).toBe(projection);
  expect(Object.is(list[2].dec,-0)).toBe(true);
 });
});
