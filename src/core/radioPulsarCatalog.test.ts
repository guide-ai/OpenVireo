import {describe,expect,it} from 'vitest';
import {PULSAR_CATALOG_COLUMNS,PULSAR_CATALOG_WEB_POLICY,parsePulsarCatalog,type PulsarCatalog,type PulsarRecord} from './radioPulsarCatalog';

// Synthetic rows only (no original catalog text). They test the chosen web contract for 0x562234/0x562490, not the
// native runtime.
type Cells=Partial<Record<keyof PulsarRecord,string>>;
const BASE:Record<keyof PulsarRecord,string>={
 primaryName:'J0000+0000',legacyName:'B0000+00',ra:'15.0',dec:'-20.5',x2a:'0.5',x34:'1.5E-15',x3e:'50000.25',
 s48:'28.2',s4c:'30.1',s50:'12.5',s54:'14.00',s58:'9.00',s5c:'3.00',
};
/** One line with every cell right-aligned in its column and 'Z' filler in the unused gaps (proves they are ignored). */
function line(cells:Cells={},length=510):string{
 const chars=Array.from({length},()=>'Z');
 for(const [field,c] of Object.entries(PULSAR_CATALOG_COLUMNS) as [keyof PulsarRecord,{start:number;width:number}][]){
  const text=cells[field]??BASE[field],padded=field==='primaryName'||field==='legacyName'?text.padEnd(c.width,' '):text.padStart(c.width,' ');
  if(padded.length!==c.width)throw new Error(`cell ${field} does not fit`);
  for(let i=0;i<c.width;i++)chars[c.start+i]=padded[i];
 }
 return chars.join('').slice(0,length);
}
const ascii=(text:string)=>Uint8Array.from(text,ch=>ch.charCodeAt(0));
const file=(lines:readonly string[],eol='\r\n',final=true)=>ascii(lines.join(eol)+(final?eol:''));
function catalog(bytes:Uint8Array):PulsarCatalog{const r=parsePulsarCatalog(bytes);if(!r.ok)throw new Error(JSON.stringify(r.error));return r.catalog;}
const errorOf=(bytes:Uint8Array)=>{const r=parsePulsarCatalog(bytes);if(r.ok)throw new Error('accepted');return r.error;};
// Type guard: the column descriptors are readonly, not only the table.
// @ts-expect-error a column offset cannot be reassigned
const reassign=()=>{PULSAR_CATALOG_COLUMNS.ra.start=0;};
void reassign;

describe('pulsar catalog row parser (0x562490..0x562822)',()=>{
 it('reads each cell at its listing offset and ignores the gaps',()=>{
  const [r]=catalog(file([line()]));
  expect(r).toEqual({primaryName:'J0000+0000',legacyName:'B0000+00',ra:15*24/360,dec:-20.5,x2a:0.5,x34:1.5e-15,x3e:50000.25+2400000,
   s48:Math.fround(28.2),s4c:Math.fround(30.1),s50:12.5,s54:14,s58:9,s5c:3});
  expect(PULSAR_CATALOG_WEB_POLICY.minLineBytes).toBe(454);
 });
 it('scales RA by ×24 then ÷360, adds 2400000 (not 2400000.5) and narrows the six Singles',()=>{
  const [r]=catalog(file([line({ra:'180',x3e:'46259.420000',s48:'28.2',s5c:'0.1'})]));
  expect(r.ra).toBe(12);
  expect(r.x3e).toBe(46259.42+2400000);expect(r.x3e-2400000).toBeCloseTo(46259.42,6);
  expect(r.s48).toBe(Math.fround(28.2));expect(r.s48).not.toBe(28.2);expect(r.s5c).toBe(Math.fround(0.1));
  const [s]=catalog(file([line({ra:'3.5739283599'})]));expect(s.ra).toBe(3.5739283599*24/360);
 });
 it('right-trims only ASCII spaces from the 12/8 identifiers and keeps leading spaces',()=>{
  const [r]=catalog(file([line({primaryName:'  J1+2 x',legacyName:' B1'})]));
  expect(r.primaryName).toBe('  J1+2 x');expect(r.legacyName).toBe(' B1');
  const [blank]=catalog(file([line({primaryName:'',legacyName:''})]));
  expect(blank.primaryName).toBe('');expect(blank.legacyName).toBe('');
 });
 it('accepts the decimal grammar with sign, exponent and surrounding spaces',()=>{
  const [r]=catalog(file([line({ra:'+.5',dec:'-1.',x2a:' 2e1 ',x34:'-3.25E-02',s50:'7'})]));
  expect([r.ra,r.dec,r.x2a,r.x34,r.s50]).toEqual([.5*24/360,-1,20,-0.0325,7]);
 });
});

describe('pulsar catalog file admission (web policy)',()=>{
 it('accepts 454-, 506- and 510-byte lines and cuts longer lines at 510 bytes',()=>{
  expect(catalog(file([line({},454),line({},506),line({},510)]))).toHaveLength(3);
  const tail='9'.repeat(40),long=catalog(file([line()+tail]));
  expect(long).toEqual(catalog(file([line()])));
 });
 it('treats LF, CRLF, mixed endings and a missing final terminator alike',()=>{
  const rows=[line(),line({primaryName:'J2'})],expected=catalog(file(rows));
  expect(catalog(file(rows,'\n'))).toEqual(expected);
  expect(catalog(file(rows,'\n',false))).toEqual(expected);
  expect(catalog(ascii(rows[0]+'\n'+rows[1]+'\r\n'))).toEqual(expected);
  expect(expected.map(r=>r.primaryName)).toEqual(['J0000+0000','J2']);
 });
 it('keeps file order and duplicate rows, as appends after the cursor do',()=>{
  const c=catalog(file([line({primaryName:'B',ra:'30'}),line({primaryName:'A',ra:'15'}),line({primaryName:'B',ra:'30',dec:'1'})]));
  expect(c.map(r=>r.primaryName)).toEqual(['B','A','B']);expect(c[0].dec).toBe(-20.5);expect(c[2].dec).toBe(1);
 });
 it('rejects each refusal kind with its line, refusing the whole file',()=>{
  expect(errorOf(new Uint8Array(0))).toEqual({kind:'empty',line:null});
  expect(errorOf(new Uint8Array(PULSAR_CATALOG_WEB_POLICY.maxBytes+1).fill(0x20))).toEqual({kind:'too-large',line:null});
  expect(errorOf(ascii('\n'.repeat(PULSAR_CATALOG_WEB_POLICY.maxRows+1)))).toEqual({kind:'too-many-rows',line:null});
  expect(errorOf(ascii('\n'))).toEqual({kind:'blank-line',line:1});
  expect(errorOf(file([line(),'',line()]))).toEqual({kind:'blank-line',line:2});
  expect(errorOf(ascii(line()+'\n'+line()+'\n\n'))).toEqual({kind:'blank-line',line:3});// only one final terminator is free
  expect(errorOf(file([line(),line({},453)]))).toEqual({kind:'short-line',line:2});
  const accented=ascii(line());accented[3]=0xe9;expect(errorOf(accented)).toEqual({kind:'non-ascii',line:1});
  const beyondCut=ascii(line()+'ZZ\n');beyondCut[511]=0xe9;expect(errorOf(beyondCut)).toEqual({kind:'non-ascii',line:1});
  expect(errorOf(ascii(line()+'\x1a\r\n'))).toEqual({kind:'control-character',line:1});
  expect(errorOf(ascii(line()+'\r'+line()))).toEqual({kind:'control-character',line:1});
  expect(errorOf(ascii(line().replace('Z','\t')))).toEqual({kind:'control-character',line:1});
 });
 it('rejects numbers outside the decimal grammar or the finite range, naming the field',()=>{
  for(const bad of ['','0x10','Infinity','NaN','1,5','1e','--1','1 2','1_0','1e999'])
   expect(errorOf(file([line(),line({x2a:bad})])),bad).toEqual({kind:'bad-number',line:2,field:'x2a'});
  expect(errorOf(file([line({ra:'1e307'})]))).toEqual({kind:'bad-number',line:1,field:'ra'});// finite cell, infinite ×24
  expect(errorOf(file([line({s54:'1e39'})]))).toEqual({kind:'single-range',line:1,field:'s54'});
  expect(catalog(file([line({s54:'1e-50'})]))[0].s54).toBe(0);// narrowed underflow is finite
 });
 it('returns new frozen objects on each parse with no shared state',()=>{
  const bytes=file([line()]),a=catalog(bytes),b=catalog(bytes);
  expect(a).not.toBe(b);expect(a[0]).not.toBe(b[0]);expect(a).toEqual(b);
  expect(Object.isFrozen(a)).toBe(true);expect(Object.isFrozen(a[0])).toBe(true);
  expect(Object.isFrozen(parsePulsarCatalog(new Uint8Array(0)))).toBe(true);
 });
 it('cannot have any of the 13 column descriptors rewritten, so later parses keep their offsets',()=>{
  const bytes=file([line()]),before=parsePulsarCatalog(bytes),descriptors=Object.values(PULSAR_CATALOG_COLUMNS);
  const original=descriptors.map(d=>({start:d.start,width:d.width}));
  try{
   expect(descriptors).toHaveLength(13);
   // Fixed targets from the snapshot only: 20 replaces the single original 62 (dec.start), 62 replaces every other
   // value, so all 26 writes would change their descriptor even on mutable pre-fix code.
   const writes=descriptors.flatMap((d,i)=>(['start','width'] as const).map(key=>Reflect.set(d,key,original[i][key]===62?20:62)));
   const after=parsePulsarCatalog(bytes);
   expect(after).toEqual(before);
   if(!after.ok)throw new Error(JSON.stringify(after.error));
   expect(after.catalog[0].ra).toBe(15*24/360);
   expect(writes).toEqual(Array(26).fill(false));
   expect(Object.isFrozen(PULSAR_CATALOG_COLUMNS)).toBe(true);
   expect(descriptors.every(Object.isFrozen)).toBe(true);
   expect(PULSAR_CATALOG_WEB_POLICY.minLineBytes).toBe(454);
  }finally{
   // Restores the mutable pre-fix descriptors so a failing run cannot leak offsets into other tests.
   descriptors.forEach((d,i)=>{Reflect.set(d,'start',original[i].start);Reflect.set(d,'width',original[i].width);});
  }
 });
});
