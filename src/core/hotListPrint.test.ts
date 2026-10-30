import {describe,expect,it} from 'vitest';
import {HTL_MAX_RECORDS,type HtlFields} from './hotList';
import {HOT_LIST_PRINT_HEADING_MAX,hotListPrintSnapshot} from './hotListPrint';
// Ported R-RX23 report snapshot (RA-HL-10, WEB-HL-12). Expected strings are hand-formatted RA-HL-08 row texts (the same vectors as
// tests/radio-hotlist-app.spec.ts FIXTURE/FORMAT); they test the chosen web contract, not a native printout.
const pad=(n:number)=>' '.repeat(n);
const HEADING='Select Object for Observation';
const rec=(id:string,ra:number,dec:number,remarks=''):HtlFields=>({id,remarks,ra,dec});
const row=(sourceIndex:number,record:HtlFields)=>({sourceIndex,record});
const ID24='ABCDEFGHIJKLMNOPQRSTUVWX',R40='r'.repeat(40);

describe('HP-01 normal report',()=>{
 it('gives the heading unchanged and the exact row texts in input order with their source indices',()=>{
  const s=hotListPrintSnapshot(HEADING,[row(2,rec('Twin',1,30,'pair')),row(4,rec('Mid',12,-5,'middle')),row(0,rec('Zeta',23.5,10,'last'))]);
  expect(s.heading).toBe(HEADING);
  expect(s.lines).toEqual([
   {sourceIndex:2,text:`Twin${pad(20)}   1h 00m 00.00s   30° 00' 00.0"  pair`},
   {sourceIndex:4,text:`Mid${pad(21)}  12h 00m 00.00s   -5° 00' 00.0"  middle`},
   {sourceIndex:0,text:`Zeta${pad(20)}  23h 30m 00.00s   10° 00' 00.0"  last`},
  ]);
 });
});

describe('HP-02 duplicates and blank IDs',()=>{
 it('keeps two identical records as two lines and pads an empty ID to 24 spaces',()=>{
  const twin=rec('Twin',1,30,'pair');
  const s=hotListPrintSnapshot(HEADING,[row(2,twin),row(3,twin),row(1,rec('',4,0,'blank id'))]);
  expect(s.lines.map(l=>l.sourceIndex)).toEqual([2,3,1]);
  expect(s.lines[0].text).toBe(s.lines[1].text);
  expect(s.lines[2].text).toBe(`${pad(24)}   4h 00m 00.00s    0° 00' 00.0"  blank id`);
 });
});

describe('HP-03 significant whitespace, markup and Latin-1',()=>{
 it('keeps leading/trailing spaces, markup text, Latin-1 and the 98-character row exactly',()=>{
  const s=hotListPrintSnapshot(HEADING,[
   row(0,rec(' A ',2,15,'  x  ')),
   row(1,rec('<b>x</b>',1/512,90-2**-20,'Café µ')),
   row(2,rec(ID24,0.0625,-0,R40)),
   row(3,rec('',24-2**-20,-0.125)),
  ]);
  expect(s.lines.map(l=>l.text)).toEqual([
   ` A ${pad(21)}   2h 00m 00.00s   15° 00' 00.0"    x  `,
   `<b>x</b>${pad(16)}   0h 00m 07.03s   90° 00' 00.0"  Café µ`,
   `${ID24}   0h 03m 45.00s    0° 00' 00.0"  ${R40}`,
   `${pad(24)}  24h 00m 00.00s   -0° 07' 30.0"  `,
  ]);
  expect(s.lines[2].text.length).toBe(98);
 });
});

describe('HP-04 empty report',()=>{
 it('gives frozen empty lines and keeps the heading',()=>{
  const s=hotListPrintSnapshot(HEADING,[]);
  expect(s).toEqual({heading:HEADING,lines:[]});expect(Object.isFrozen(s)).toBe(true);expect(Object.isFrozen(s.lines)).toBe(true);
 });
});

describe('HP-05 admission and immutability',()=>{
 const ok=row(0,rec('Twin',1,30,'pair'));
 it('refuses malformed rows, indices, records and headings',()=>{
  const bad:unknown[][]=[
   [HEADING,'rows'],[HEADING,null],[HEADING,{length:0}],
   [HEADING,Array.from({length:HTL_MAX_RECORDS+1},(_,i)=>row(i,rec('',0,0)))],
   [HEADING,[null]],[HEADING,[undefined]],[HEADING,new Array(1)],[HEADING,['x']],
   [HEADING,[row(1.5,ok.record)]],[HEADING,[row(-1,ok.record)]],[HEADING,[row(Number.NaN,ok.record)]],[HEADING,[row(HTL_MAX_RECORDS,ok.record)]],
   [HEADING,[{sourceIndex:'1',record:ok.record}]],[HEADING,[ok,row(0,ok.record)]],[HEADING,[{sourceIndex:0,record:null}]],
   [HEADING,[row(0,rec('x'.repeat(25),1,0))]],[HEADING,[row(0,rec('x',1,0,'r'.repeat(41)))]],[HEADING,[row(0,rec('Σ',1,0))]],
   [HEADING,[row(0,rec('x',24,0))]],[HEADING,[row(0,rec('x',1,90.5))]],[HEADING,[row(0,rec('x',Number.NaN,0))]],
   [5,[ok]],[null,[ok]],['',[ok]],['a'.repeat(HOT_LIST_PRINT_HEADING_MAX+1),[ok]],['a\u0007b',[ok]],['line\nbreak',[ok]],['Σ',[ok]],
  ];
  for(const [heading,rows] of bad)expect(()=>hotListPrintSnapshot(heading as string,rows as never),JSON.stringify([heading,rows])?.slice(0,80)).toThrow(RangeError);
 });
 it('admits the limits: a 255-character Latin-1 heading and 1000 rows',()=>{
  const heading='é'.repeat(HOT_LIST_PRINT_HEADING_MAX);
  const s=hotListPrintSnapshot(heading,Array.from({length:HTL_MAX_RECORDS},(_,i)=>row(HTL_MAX_RECORDS-1-i,rec('',0,0))));
  expect(s.heading).toBe(heading);expect(s.lines).toHaveLength(HTL_MAX_RECORDS);expect(s.lines[0].sourceIndex).toBe(HTL_MAX_RECORDS-1);
 });
 it('is deeply frozen, keeps only index and text, and later input mutation changes nothing',()=>{
  const record={id:'Twin',remarks:'pair',ra:1,dec:30},input=[{sourceIndex:2,record}];
  const s=hotListPrintSnapshot(HEADING,input);
  expect(Object.isFrozen(s)&&Object.isFrozen(s.lines)&&s.lines.every(Object.isFrozen)).toBe(true);
  expect(Object.keys(s.lines[0]).sort()).toEqual(['sourceIndex','text']);expect(s.lines).not.toBe(input);
  record.remarks='edited';input[0].sourceIndex=9;input.push({sourceIndex:3,record});
  expect(s.lines).toEqual([{sourceIndex:2,text:`Twin${pad(20)}   1h 00m 00.00s   30° 00' 00.0"  pair`}]);
 });
});

describe('HP-14 (unit) recomputation',()=>{
 it('gives a deep-equal snapshot with a new identity for the same input, and follows a changed source on the next call',()=>{
  const rows=[row(0,rec('Twin',1,30,'pair'))],a=hotListPrintSnapshot(HEADING,rows),b=hotListPrintSnapshot(HEADING,rows);
  expect(b).toEqual(a);expect(b).not.toBe(a);expect(b.lines).not.toBe(a.lines);
  const c=hotListPrintSnapshot(HEADING,[row(1,rec('Mid',12,-5,'middle'))]);
  expect(a.lines.map(l=>l.sourceIndex)).toEqual([0]);expect(c.lines.map(l=>l.sourceIndex)).toEqual([1]);
 });
});

describe('HP-15 generic formatter',()=>{
 it('uses the supplied row formatter with the shown position and refuses non-Latin-1 output',()=>{
  const s=hotListPrintSnapshot(HEADING,[row(5,rec('A',1,2)),row(3,rec('B',3,4))],(r,i)=>`${i+1}. ${r.id}`);
  expect(s.lines).toEqual([{sourceIndex:5,text:'1. A'},{sourceIndex:3,text:'2. B'}]);
  expect(()=>hotListPrintSnapshot(HEADING,[row(0,rec('A',1,2))],()=>'Σ')).toThrow(RangeError);
 });
});

describe('K2.3 header lines (0x591098)',()=>{
 it('prints the date with (Not Recorded) and the blank name1 line when Edit Mode is off; the bare date in Edit Mode',async()=>{
  const {hotListPrintHeader,HOT_LIST_PRINT_LITERALS:L}=await import('./hotListPrint');
  expect(hotListPrintHeader('10-30-2026 3:07:42 PM',false)).toEqual(['10-30-2026 3:07:42 PM     Laboratory Table Number (Not Recorded)','','','']);
  expect(hotListPrintHeader('D',false,['Jane Doe','John Roe','',''],'12')).toEqual(['D     Laboratory Table Number 12','','Jane Doe','John Roe','']);
  expect(hotListPrintHeader('D',true,['Jane Doe'],'12')).toEqual(['D','']);
  expect(L.spoolTitle).toBe('CLEA "Object X" Exercise - ');
 });
});
