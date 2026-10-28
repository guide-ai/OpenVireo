import {readFileSync} from 'node:fs';
import {describe,expect,test} from 'vitest';
import {decodeVariableStarCatalog,type VariableStarRecord} from './variableStars';
import {VARIABLE_FIELD_LITERALS as L,listSelection,variableFieldArea,variableFieldList,variableFieldMembers,variableFieldRow,variableHotListFields} from './variableFieldList';

const records=decodeVariableStarCatalog(new Uint8Array(readFileSync('public/original/variables/CLEA_VStrs.dat')));
const delCep={ra:22.486,dec:58.415};

describe('TVarFldLstForm1 area (0x53bc7b / 0x53becb)',()=>{
 test('instrument: H = 3 × 15′/120 = 0.375°, RA half-width H/(15 cos Dec), limit 20',()=>{
  const a=variableFieldArea(delCep,'instrument');if('reason' in a)throw new Error();
  expect(a.maximumDec-a.centerDec).toBeCloseTo(.375,12);expect(a.centerDec-a.minimumDec).toBeCloseTo(.375,12);
  expect(a.maximumRa-a.centerRa).toBeCloseTo(.375/(15*Math.cos(58.415*Math.PI/180)),12);expect(a.limitingMagnitude).toBe(20);
 });
 test('finder: H = 3 × 2.5°/2 = 3.75°, limit 14',()=>{
  const a=variableFieldArea(delCep,'finder');if('reason' in a)throw new Error();
  expect(a.maximumDec-a.centerDec).toBeCloseTo(3.75,12);expect(a.limitingMagnitude).toBe(14);
 });
 test('polar areas are typed',()=>{
  expect(variableFieldArea({ra:3,dec:89.9},'finder')).toEqual({reason:'polar-area'});
  expect(variableFieldList(records,{ra:3,dec:89.9},'finder','gcvs').reason).toBe('polar-area');
 });
 test('predicate 0x59848c: inclusive bounds, max magnitude ≤ limit, 0.0 passes',()=>{
  const a=variableFieldArea(delCep,'finder');if('reason' in a)throw new Error();
  const r=(over:Partial<VariableStarRecord>)=>({...records[0],raHours:a.minimumRa,decDegrees:a.maximumDec,max:0,...over}) as VariableStarRecord;
  const n=(x:VariableStarRecord)=>{const m=variableFieldMembers([x],a);return m.status==='ok'?m.records.length:-1;};
  expect(n(r({}))).toBe(1);expect(n(r({max:14}))).toBe(1);expect(n(r({max:Math.fround(14.01)}))).toBe(0);expect(n(r({decDegrees:a.maximumDec+1e-9}))).toBe(0);
 });
});
describe('lines (0x52f7fc, row 0x52feb4)',()=>{
 test('del Cep instrument field, mode 1',()=>{
  const l=variableFieldList(records,delCep,'instrument','gcvs');
  expect(l.caption).toBe('Variable Stars in Instrument Field');
  expect(l.lines.slice(0,12)).toEqual(['Field Center:','RA:   22h 29m 09.60s','Dec:  58° 24\' 54.0"','','Field Limits:',
   'RA:   22h 26m 17.77s to  22h 32m 01.43s ','Dec:  58° 02\' 24.0" to  58° 47\' 24.0" ',L.note,'','All variables from GCVS in region:',
   'Name          Rt. Ascension    Declination   Max   Min  Type','AK Cep       22h 28m 53.79s   58° 12\' 40.5" 10.86 11.52 DCEP']);
  expect(l.lines[12]).toBe('del Cep      22h 29m 10.08s   58° 24\' 55.0"  3.48  4.37 DCEP');
  expect([l.first,l.last,l.records.length,l.reason]).toEqual([11,12,2,null]);
  expect(L.columns).toHaveLength(60);
 });
 test('zero magnitudes print six spaces; flag characters are not shown',()=>{
  const r={...records[0],name:'X',max:0,min:Math.fround(.5),minFlag:'('} as VariableStarRecord;
  expect(variableFieldRow(r).slice(11+17+16)).toBe('       0.50 '+r.type);
 });
 test('empty field and modeled mode',()=>{
  const empty=variableFieldList([],delCep,'instrument','gcvs');
  expect(empty.lines.at(-1)).toBe('No variable stars found in field!');expect(empty.first>empty.last).toBe(true);
  const modeled=variableFieldList(records,delCep,'instrument','modeled');
  expect(modeled.lines.slice(-2)).toEqual(['Variables modeled in VIREO in region:',L.columns]);expect(modeled.reason).toBe('modeled-uninitialised');expect(modeled.records).toHaveLength(0);
 });
 test('selection rule and hot-list record 0x5300f0',()=>{
  expect([listSelection(10,11,12),listSelection(11,11,12),listSelection(12,11,12),listSelection(13,11,12)]).toEqual([-1,0,1,-1]);
  const r=records.find(x=>x.name==='del Cep')!;
  expect(variableHotListFields(r)).toEqual({id:'del Cep',remarks:'DCEP',ra:r.raHours,dec:r.decDegrees});
 });
});
