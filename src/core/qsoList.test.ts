import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {QSO_LIST_INITIAL_OPTIONS,QSO_LIST_LITERALS as L,buildQsoList,decodeQsoCatalog,parseQsoMagnitudeLimit,qsoHotListFields,qsoListRow,qsoOptionsActivate,qsoRawName} from './qsoList';
import {parseHtl} from './hotList';
import {separationDegrees} from './ephemeris';
import {OBJECT_X_ON_TARGET_DEGREES} from './objectXLab';
import type {NativeQso} from './qsoMerge';

const records=decodeQsoCatalog(new Uint8Array(readFileSync('public/original/catalogs/CLEA_QSO.DAT')));
const htl=(name:string)=>parseHtl(new Uint8Array(readFileSync(`public/original/hotlists/${name}`)));
const objectX=htl('ObjectX.HTL');
const nearObjectX=(q:NativeQso)=>objectX.some(r=>separationDegrees(q.ra,q.dec,r.ra,r.dec)<=OBJECT_X_ON_TARGET_DEGREES);
const byName=(n:string)=>records.find(q=>q.name===n)!;
const twenty=Math.fround(20);

describe('QSO list options (TQSOListDlg)',()=>{
 it('FormActivate: zero limit becomes 20.00; without Edit Mode the sort resets to 0 and is disabled',()=>{
  expect(qsoOptionsActivate(QSO_LIST_INITIAL_OPTIONS,false)).toEqual({options:{limit:twenty,sort:0},limitText:'20.00',sortEnabled:false});
  expect(qsoOptionsActivate({limit:Math.fround(15.5),sort:2},false).options.sort).toBe(0);
  expect(qsoOptionsActivate({limit:Math.fround(15.5),sort:2},true)).toEqual({options:{limit:Math.fround(15.5),sort:2},limitText:'15.50',sortEnabled:true});
 });
 it('OK: Delphi StrToFloat stored as Single; anything else is the Invalid Magnitude Limit box (no range check)',()=>{
  expect(parseQsoMagnitudeLimit('15')).toBe(15);
  expect(parseQsoMagnitudeLimit(' 12.85 ')).toBe(Math.fround(12.85));
  expect(parseQsoMagnitudeLimit('1e1')).toBe(10);
  expect(parseQsoMagnitudeLimit('-3')).toBe(-3);
  expect(parseQsoMagnitudeLimit('99')).toBe(99);
  for(const bad of ['','abc','1,5','1.2.3','+','.','1e','1e40'])expect(parseQsoMagnitudeLimit(bad)).toBeNull();
  expect(L.dialog.errorCaption).toBe('Numeric Error!');
 });
});

describe('QSO list builder (0x5776f0) on CLEA_QSO.DAT',()=>{
 it('student view: title, J2000 line, blank, 4-column header, ° units, rows sorted by V',()=>{
  const l=buildQsoList(records,{limit:twenty,sort:0},false);
  expect(l.caption).toBe('CLEA QSO Data');
  expect(l.lines.slice(0,5)).toEqual(['2269 QSOs to magnitude 17.50, sorted by magnitude.','Positions are J2000.0','','Name/ID           Right Ascn. Declination    V   ','                  Hr Mn Sec     °  \'  "']);
  expect(l.first).toBe(5);expect(l.last).toBe(5+2268);
  expect(l.lines[5]).toBe('1WGA J0820.1+3728 08 20 07.7   +37 28 39   11.80  ');
  expect(l.lines.some(s=>/0\.158|\(\+0\.27\)/.test(s))).toBe(false);// no z or colours without Edit Mode
 });
 it('Edit Mode: assigned-colour note, Z/B-V/U-B columns with (…) for assigned colours',()=>{
  const l=buildQsoList(records,{limit:Math.fround(12.85),sort:0},true);
  expect(l.lines.slice(0,6)).toEqual(['10 QSOs to magnitude 12.85, sorted by magnitude.','Positions are J2000.0','"(...)" indicates an assigned mean color.','','Name/ID           Right Ascn. Declination    Z       V      B-V      U-B   ','                  Hr Mn Sec     °  \'  "']);
  expect(l.lines[6]).toBe('1WGA J0820.1+3728 08 20 07.7   +37 28 39   0.082   11.80  (+0.27)  (-0.69)  ');
  expect(l.lines[8]).toBe('4U 0241+61        02 44 57.6   +62 28 06   0.045   12.19   -0.04    -0.82   ');
  expect(l.lines.at(-1)).toBe('3C 273.0          12 29 06.7   +02 03 08   0.158   12.85   +0.20    -0.87   ');// V = limit passes
 });
 it('sort suffixes; RA appends nothing',()=>{
  expect(buildQsoList(records,{limit:twenty,sort:1},true).lines[0]).toBe('2269 QSOs to magnitude 17.50, sorted by Z(ascending).');
  expect(buildQsoList(records,{limit:twenty,sort:2},true).lines[0]).toBe('2269 QSOs to magnitude 17.50, sorted by Z(descending).');
  expect(buildQsoList(records,{limit:twenty,sort:3},false).lines[0]).toBe('2269 QSOs to magnitude 17.50, sorted by ');
 });
 it('orders: z ascending/descending and RA then Dec are monotone',()=>{
  const z1=buildQsoList(records,{limit:twenty,sort:1},true).rows,z2=buildQsoList(records,{limit:twenty,sort:2},true).rows,ra=buildQsoList(records,{limit:twenty,sort:3},false).rows;
  for(let i=1;i<z1.length;i++){expect(z1[i].redshift).toBeGreaterThanOrEqual(z1[i-1].redshift);expect(z2[i].redshift).toBeLessThanOrEqual(z2[i-1].redshift);
   expect(ra[i].ra>ra[i-1].ra||(ra[i].ra===ra[i-1].ra&&ra[i].dec>=ra[i-1].dec)).toBe(true);}
 });
 it('ties follow the native cursor rule, not a stable sort (equal V: after equal keys walking forward, before them walking back)',()=>{
  const mk=(name:string,magnitude:number)=>({...records[0],name,magnitude}) as NativeQso;
  const rows=buildQsoList([mk('A',15),mk('B',16),mk('C',15),mk('D',15)],{limit:twenty,sort:0},false).rows.map(r=>r.name);
  expect(rows).toEqual(['A','D','C','B']);
 });
 it('an empty result keeps the −2.0 start of the maximum',()=>{
  const l=buildQsoList(records,{limit:5,sort:0},false);
  expect(l.lines[0]).toBe('0 QSOs to magnitude -2.00, sorted by magnitude.');expect(l.first).toBe(l.last+1);
 });
});

describe('Object X and exercise answers (web rules W2/W3)',()=>{
 it('withholding within 0.25° of an ObjectX.HTL position removes exactly the three Object X QSOs, and the title counts what is listed',()=>{
  expect(records.filter(nearObjectX).map(q=>q.name).sort()).toEqual(['3C 273.0','HE 0353-3919','HS 1603+3820']);
  const l=buildQsoList(records,{limit:twenty,sort:0},true,nearObjectX);
  expect(l.lines[0]).toBe('2266 QSOs to magnitude 17.50, sorted by magnitude.');
  expect(l.lines.join('\n')).not.toMatch(/3C 273\.0|HE 0353-3919|HS 1603\+3820/);
 });
 it('no Hubble or LSS answer is a QSO z: the nearest QSO to any of the 232 targets is 3.78′ away (KUV 13060+2839 to NGC 4983)',()=>{
  // Every E01/E02 answer is a galaxy redshift and E02 rows with a QSO in the field are typed unavailable; the distance only
  // documents that no QSO coincides with a target (review 1 I4).
  const targets=['Hubble.HTL',...[1,2,3,4,5,6,7,8,9].map(i=>`LSS_Field0${i}.HTL`)].flatMap(htl);
  expect(targets.length).toBe(232);
  let best={d:Infinity,q:'',t:''};
  for(const q of records)for(const t of targets){const d=separationDegrees(q.ra,q.dec,t.ra,t.dec)*60;if(d<best.d)best={d,q:q.name,t:t.id.trim()};}
  expect(best.q).toBe('KUV 13060+2839');expect(best.t).toMatch(/4983/);expect(best.d).toBeCloseTo(3.78,2);
 });
});

describe('row and hot list details',()=>{
 it('raw ShortString name (padded to 17 in the file) and the 18-column name field',()=>{
  const q=byName('3C 273.0');expect(qsoRawName(q)).toBe('3C 273.0         ');
  expect(qsoListRow(q,false).slice(0,18)).toBe('3C 273.0          ');
 });
 it('FormatforHotList: ID cut to 24, RA/Dec, empty remarks',()=>{
  const q=byName('PHL 2525');expect(qsoHotListFields(q)).toEqual({id:qsoRawName(q),remarks:'',ra:q.ra,dec:q.dec});
 });
});
