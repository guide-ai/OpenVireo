import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {encodeHtlExtended,parseHtl,type HtlList} from './hotList';
import {INITIAL_OPTICAL_HOT_LIST,closeOpticalHotList,editOpticalHotListSearch,openOpticalHotList,openOpticalHotListSearch,opticalHotListRowText,opticalHotListRows,reopenOpticalHotList,selectOpticalHotListIndex,slewToOpticalHotListSelection,submitOpticalHotListSearch,dismissOpticalHotListNotice,cancelOpticalHotListSearch,opticalHotListCaption} from './opticalHotList';

// Chosen implementation contract (OB-HL) over the recovered radio list contracts; the bundled lists are the approved originals.
const original=(name:string)=>parseHtl(new Uint8Array(readFileSync(new URL(`../../public/original/hotlists/${name}`,import.meta.url))));
function record(id:string,ra:number,dec:number,remarks=''){const b=new Uint8Array(86);b[0]=id.length;for(let i=0;i<id.length;i++)b[1+i]=id.charCodeAt(i);b[45]=remarks.length;for(let i=0;i<remarks.length;i++)b[46+i]=remarks.charCodeAt(i);b.set(encodeHtlExtended(ra),25);b.set(encodeHtlExtended(dec),35);return b;}
const htl=(...rows:[string,number,number,string?][]):HtlList=>{const bytes=new Uint8Array(rows.length*86);rows.forEach(([id,ra,dec,r],i)=>bytes.set(record(id,ra,dec,r),i*86));return parseHtl(bytes);};

describe('OB-HL order: native RA insertion over the bundled original lists',()=>{
 for(const name of ['Hubble.HTL','PLEIADES.HTL'])it(`${name} is shown in non-decreasing RA, every file row once`,()=>{
  const list=original(name),rows=opticalHotListRows(list);
  expect(rows).toHaveLength(list.length);
  expect(new Set(rows.map(r=>r.sourceIndex)).size).toBe(list.length);
  for(let i=1;i<rows.length;i++)expect(rows[i].record.ra).toBeGreaterThanOrEqual(rows[i-1].record.ra);
  rows.forEach((r,i)=>{expect(opticalHotListRowText(r.record,i+1)).toMatch(new RegExp(`^ {0,3}${i+1}  ?[ \\d]\\dh `));expect(opticalHotListRowText(r.record,i+1,'full').startsWith(r.record.id.padEnd(24,' '))).toBe(true);});
 });
 it('ties keep the native cursor insertion order and duplicates stay separate',()=>{
  const rows=opticalHotListRows(htl(['B',2,0],['A',1,0],['C',2,5],['A',1,0]));
  expect(rows.map(r=>r.sourceIndex)).toEqual([1,3,0,2]);
 });
});

describe('OB-HL window transitions',()=>{
 const list=htl(['Vega',18.6,38.8,'A0V'],['Sirius',6.75,-16.7,'A1V'],['Deneb',20.7,45.3,'A2Ia']),rows=opticalHotListRows(list),texts=rows.map(r=>opticalHotListRowText(r.record,1,'full'));
 it('an empty list gives the empty box only',()=>{
  const w=openOpticalHotList(INITIAL_OPTICAL_HOT_LIST,0);expect(w.shown).toBe(false);expect(w.notice).toEqual({kind:'empty'});
  expect(dismissOpticalHotListNotice(w).notice).toBeNull();
 });
 it('Slew to Selection without a row gives the no-selection box; with a row it closes and returns that row',()=>{
  let w=openOpticalHotList(INITIAL_OPTICAL_HOT_LIST,rows.length);
  const none=slewToOpticalHotListSelection(w,rows);expect(none.row).toBeNull();expect(none.window.notice).toEqual({kind:'no-selection'});expect(none.window.shown).toBe(true);
  w=selectOpticalHotListIndex(w,1,rows.length);
  const hit=slewToOpticalHotListSelection(w,rows);expect(hit.row?.id).toBe('Vega');expect(hit.window.shown).toBe(false);
  expect(reopenOpticalHotList(hit.window).shown).toBe(true);expect(reopenOpticalHotList(hit.window).index).toBe(1);
 });
 it('Search highlights without selecting; a miss raises the box; Next continues after the highlight',()=>{
  let w=selectOpticalHotListIndex(openOpticalHotList(INITIAL_OPTICAL_HOT_LIST,rows.length),0,rows.length);
  w=submitOpticalHotListSearch(editOpticalHotListSearch(openOpticalHotListSearch(w),'DENEB',false),'top',texts);
  expect(w.search.found?.index).toBe(2);expect(w.index).toBe(0);expect(w.search.query).toBe('deneb');
  w=submitOpticalHotListSearch(editOpticalHotListSearch(openOpticalHotListSearch(w),'zzz',false),'top',texts);
  expect(w.notice).toEqual({kind:'search-miss',query:'zzz'});expect(w.search.found?.index).toBe(2);
  expect(closeOpticalHotList(w)).toBe(w);// a box blocks the window
  w=dismissOpticalHotListNotice(w);
  w=cancelOpticalHotListSearch(openOpticalHotListSearch(w));expect(w.search.dialog).toBeNull();
  expect(closeOpticalHotList(w).shown).toBe(false);
 });
 it('refuses out-of-range selections and bad row counts',()=>{
  const w=openOpticalHotList(INITIAL_OPTICAL_HOT_LIST,rows.length);
  expect(selectOpticalHotListIndex(w,3,rows.length)).toBe(w);expect(selectOpticalHotListIndex(w,-1,rows.length)).toBe(w);
  expect(()=>openOpticalHotList(INITIAL_OPTICAL_HOT_LIST,-1)).toThrow(RangeError);
 });
});

describe('OB-HL-03 ordinal formatter 0x590248 and OB-HL-02 caption',()=>{
 it('pads the position to width 4 and drops ID and remarks',()=>{
  const r={id:'Vega',remarks:'A0V',ra:1.5,dec:-0.125};
  expect(opticalHotListRowText(r,7)).toBe(`   7   1h 30m 00.00s   -0° 07' 30.0"  `);
  expect(opticalHotListRowText(r,12345)).toBe(`12345   1h 30m 00.00s   -0° 07' 30.0"  `);
  expect(()=>opticalHotListRowText(r,0)).toThrow(RangeError);
 });
 it('names the file or a new list',()=>{expect(opticalHotListCaption('Hubble.HTL')).toBe('Hot List File: Hubble.HTL');expect(opticalHotListCaption('')).toBe('New Hot List File');});
});
