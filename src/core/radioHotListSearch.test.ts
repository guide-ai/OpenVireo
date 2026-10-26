import {describe,expect,it} from 'vitest';
import provenance from '../../docs/RADIO-ANTENNA-PROVENANCE.json';
import {
 INITIAL_RADIO_HOT_LIST_SEARCH,RADIO_HOT_LIST_SEARCH_LITERALS as L,RADIO_HOT_LIST_SEARCH_QUERY_MAX,foldAsciiCase,radioHotListFoundIndex,radioHotListMissText,
 radioHotListSearchStart,radioHotListVisibleIndex,searchRadioHotListRows,trimLeadingAsciiSpaces,
} from './radioHotListSearch';

// Chosen implementation contract for the list Search loop (RA-HL-09, WEB-HL-09). Every expected index below was derived by
// hand from the Search1Click listing (one-based Pos over current + ' ' + next, successor iff pos > len); no reference loop
// is run and the native unset-length path is not simulated. Not a native oracle.
const hit=(index:number)=>({kind:'hit',index});
const MISS={kind:'miss'};
const search=(rows:readonly string[],query:string,start=0,matchCase=false)=>searchRadioHotListRows(rows,query,matchCase,start);

describe('0x40bb04 fold and the leading-space skip',()=>{
 it('folds only A..Z; neighbours, Latin-1 letters and symbols are unchanged (HS-07/HS-08)',()=>{
  expect(foldAsciiCase('@AZ[`az{')).toBe('@az[`az{');
  expect(foldAsciiCase('CAFÉ µ ÀÖ°')).toBe('cafÉ µ ÀÖ°');
  expect(foldAsciiCase('')).toBe('');
 });
 it('skips only leading U+0020; tab, NBSP and trailing spaces stay (HS-09)',()=>{
  expect(trimLeadingAsciiSpaces('   a b  ')).toBe('a b  ');
  expect(trimLeadingAsciiSpaces('\tx')).toBe('\tx');
  expect(trimLeadingAsciiSpaces(' x')).toBe(' x');
  expect(trimLeadingAsciiSpaces(' '.repeat(24))).toBe('');
 });
});

describe('Search1Click loop with the per-step length (WEB-HL-09)',()=>{
 it('HS-01 empty list and HS-04 a start at or after Count: miss without reading a row, no wrap',()=>{
  expect(search([],'a')).toEqual(MISS);
  expect(search([],'a',1)).toEqual(MISS);
  expect(search(['abc','abd'],'ab',2)).toEqual(MISS);
  expect(search(['abc'],'abc',1)).toEqual(MISS);
 });
 it('HS-02 one row, Top: the first pass is on the last row and a hit selects row 0',()=>{
  expect(search(['Twin'],'twin')).toEqual(hit(0));
  // 'n' is at pos 4 = len: still row 0, never row 1.
  expect(search(['Twin'],'n')).toEqual(hit(0));
  expect(search(['Twin'],'twins')).toEqual(MISS);
 });
 it('HS-03 Next from the penultimate row: the first pass starts on the last row and selects it, never Count',()=>{
  const rows=['aaa','bbb','ccc'];
  expect(search(rows,'cc',2)).toEqual(hit(2));
  expect(search(rows,'c',2)).toEqual(hit(2));
  // From one row earlier the last row is reached only through the join: 'bbb ccc', pos 5 > len 3.
  expect(search(rows,'ccc',1)).toEqual(hit(2));
 });
 it('HS-05 a hit inside the current row selects it; rows are visited from start only',()=>{
  expect(search(['alpha beta','gamma'],'beta')).toEqual(hit(0));
  expect(search(['beta','alpha beta'],'beta',1)).toEqual(hit(1));
  // Step 0 joins 'aa bb' (pos 4 > 2 → row 1); step 1 joins 'bb cc' (pos 4 > 2 → row 2).
  expect(search(['aa','bb','cc'],'bb')).toEqual(hit(1));
  expect(search(['aa','bb','cc'],'cc')).toEqual(hit(2));
 });
 it('HS-06 one separating space: a match starting inside the current row selects it, at the separator or later the successor',()=>{
  const rows=['end','next'];// joined 'end next', len 3
  expect(search(rows,'end next')).toEqual(hit(0));// pos 1
  expect(search(rows,'d n')).toEqual(hit(0));// pos 3 = len
  expect(search(rows,' next')).toEqual(hit(1));// pos 4 = len + 1 (the separator)
  expect(search(rows,'ext')).toEqual(hit(1));// pos 6
  expect(search(rows,'end  next')).toEqual(MISS);// exactly one space
  // The earliest occurrence wins: 'xab ab' has 'ab' at pos 2.
  expect(search(['xab','ab'],'ab')).toEqual(hit(0));
  // The successor is folded and trimmed before the join: 'end' + ' ' + 'next'.
  expect(search(['end','   NEXT'],'end next')).toEqual(hit(0));
  // Three rows: step 0 'x y end' has no 'end next'; step 1 'y end next z' has it at pos 3 ≤ 5.
  expect(search(['x','y end','next z'],'end next')).toEqual(hit(1));
 });
 it('HS-07 case: without Match case query and rows fold A..Z; with it the comparison is exact',()=>{
  expect(search(['Twin'],'TWIN')).toEqual(hit(0));
  expect(search(['ABC'],'abc')).toEqual(hit(0));
  expect(search(['Twin'],'TWIN',0,true)).toEqual(MISS);
  expect(search(['Twin'],'Twin',0,true)).toEqual(hit(0));
 });
 it('HS-08 non-ASCII letters are not folded and compare exactly',()=>{
  expect(search(['Café'],'CAFÉ')).toEqual(MISS);// query folds to 'cafÉ'
  expect(search(['Café'],'CAFé')).toEqual(hit(0));
  expect(search(['Écho'],'écho')).toEqual(MISS);
  expect(search(['µ°'],'µ°',0,true)).toEqual(hit(0));
  expect(search(['Omega'],'Ω')).toEqual(MISS);// a non-Latin-1 query character never matches a Latin-1 row
 });
 it('HS-09 only leading U+0020 of each row is skipped; the query is not trimmed and spaces count',()=>{
  expect(search(['    x'],'x')).toEqual(hit(0));
  expect(search(['  x'],'  x')).toEqual(MISS);
  expect(search([' x'],' x')).toEqual(hit(0));
  // Trailing spaces stay: 'ab  ' + ' ' + 'cd', len 4.
  expect(search(['ab  ','cd'],'ab   cd')).toEqual(hit(0));
  expect(search(['ab  ','cd'],'  cd')).toEqual(hit(0));// pos 4 = len
  expect(search(['ab  ','cd'],' cd')).toEqual(hit(1));// pos 5 = len + 1
  // A blank query is not empty: ' ' first occurs at the separator of 'a b' (pos 2 > len 1).
  expect(search(['a','b'],' ')).toEqual(hit(1));
  // An empty-ID row (24 spaces) is searched from its first non-space character.
  const blank=`${' '.repeat(24)}   4h 00m 00.00s    0° 00' 00.0"  `;
  expect(search([blank],'4h 00m')).toEqual(hit(0));
  expect(search(['µ°',blank],'° 4h')).toEqual(hit(0));// 'µ° 4h…', pos 2 = len
  expect(search(['µ°',blank],'   4h')).toEqual(MISS);
 });
 it('accepts an 80-character query and refuses invalid inputs',()=>{
  expect(search(['a'.repeat(80)],'A'.repeat(RADIO_HOT_LIST_SEARCH_QUERY_MAX))).toEqual(hit(0));
  for(const q of ['','a'.repeat(81)])expect(()=>search(['a'],q)).toThrow(RangeError);
  for(const start of [-1,1.5,Number.NaN])expect(()=>search(['a'],'a',start)).toThrow(RangeError);
  expect(()=>searchRadioHotListRows(['a',1 as unknown as string],'a',false,0)).toThrow(TypeError);
  expect(()=>searchRadioHotListRows('a' as unknown as string[],'a',false,0)).toThrow(TypeError);
  expect(()=>searchRadioHotListRows(['a'],'a','no' as unknown as boolean,0)).toThrow(TypeError);
  expect(Object.isFrozen(search(['a'],'a'))).toBe(true);
 });
});

describe('visible index, start and the highlight (WEB-HL-11)',()=>{
 const rows=['r0','r1','r2'];
 it('a highlight is valid only while the same text stays at that index',()=>{
  expect(radioHotListFoundIndex({index:1,text:'r1'},rows)).toBe(1);
  expect(radioHotListFoundIndex({index:1,text:'r2'},rows)).toBeNull();
  expect(radioHotListFoundIndex({index:3,text:'r3'},rows)).toBeNull();
  expect(radioHotListFoundIndex(null,rows)).toBeNull();
 });
 it('Next reads a valid highlight, else the remembered index in range, else −1; Top always starts at 0',()=>{
  expect(radioHotListVisibleIndex(0,{index:2,text:'r2'},rows)).toBe(2);
  expect(radioHotListVisibleIndex(0,{index:2,text:'stale'},rows)).toBe(0);
  expect(radioHotListVisibleIndex(5,null,rows)).toBe(-1);
  expect(radioHotListSearchStart('next',-1)).toBe(0);
  expect(radioHotListSearchStart('next',2)).toBe(3);
  expect(radioHotListSearchStart('top',2)).toBe(0);
  expect(()=>radioHotListSearchStart('wrap' as 'top',0)).toThrow(RangeError);
  expect(()=>radioHotListSearchStart('next',-2)).toThrow(RangeError);
 });
});

describe('recovered literals and initial state',()=>{
 const sha256=async(text:string)=>{
  const bytes=Uint8Array.from(text,c=>{const b=c.charCodeAt(0);if(b>0xff)throw new Error('not Latin-1');return b;});
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 };
 it('the shown literals hash to the typed payloads recorded in RA-HL-09',async()=>{
  const record=provenance.hotList.contracts.find(c=>c.id==='RA-HL-09') as unknown as {typedLiterals:{address:string;text:string;payloadSHA256:string}[]};
  const byAddress=Object.fromEntries(record.typedLiterals.map(l=>[l.address,l]));
  const shown={'0x590fe4':L.caption,'0x591000':L.separator,'0x59100c':L.missPrefix,'0x591018':L.missSuffix,'0x591028':L.missCaption};
  for(const [address,text] of Object.entries(shown)){
   expect(byAddress[address].text).toBe(text);
   expect(await sha256(text)).toBe(byAddress[address].payloadSHA256);
  }
  expect(radioHotListMissText('twin')).toBe('"twin" Not Found.');
 });
 it('starts with an empty query, case flag false, no dialog and no highlight',()=>{
  expect(INITIAL_RADIO_HOT_LIST_SEARCH).toEqual({query:'',matchCase:false,dialog:null,found:null});
  expect(Object.isFrozen(INITIAL_RADIO_HOT_LIST_SEARCH)).toBe(true);
 });
});
