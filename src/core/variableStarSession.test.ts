import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {decodeVariableStarRecord} from './variableStars';
import {INITIAL_VARIABLE_STAR_SESSION,closeVariableStarList,displayLightCurve,exitLightCurve,openVariableStarList,toggleListTypeCodes,toggleVariableHelp} from './variableStarSession';
const FILE=new Uint8Array(readFileSync(new URL('../../public/original/variables/CLEA_VStrs.dat',import.meta.url)));
const rec=(i:number)=>decodeVariableStarRecord(FILE,i);
describe('Variable Star Data / Simulated Light Curve windows (RECOVERY §1, §2, §6)',()=>{
 it('shows 0.00, keeps it after Display Light Curve, and shows 0.50 when the list is shown again (0x51f2d8)',()=>{
  const ep=rec(2);expect(ep.riseWord).toBe(0);
  let s=openVariableStarList(INITIAL_VARIABLE_STAR_SESSION,ep);expect(s.list!.lines[9]).toBe('M-m/D(%):        0.00');
  s=displayLightCurve(s,ep);expect(s.curve).toBe(2);expect(s.list!.lines[9]).toBe('M-m/D(%):        0.00');
  s=openVariableStarList(s,ep);expect(s.curve).toBeNull();expect(s.list!.lines[9]).toBe('M-m/D(%):        0.50');
  // Another record is unaffected; the mutation persists for this page only.
  s=openVariableStarList(s,rec(30234));expect(s.list!.lines[9]).toBe('M-m/D(%):        0.25');expect(s.riseDefaulted.has(2)).toBe(true);
 });
 it('closes the light curve with the list, exits it alone, and ignores a curve for a record not shown',()=>{
  const r=rec(30234);let s=displayLightCurve(openVariableStarList(INITIAL_VARIABLE_STAR_SESSION,r),r);
  expect(exitLightCurve(s)).toMatchObject({curve:null,list:{index:30234}});
  s=toggleVariableHelp(s);expect(s.help).toBe(true);
  expect(closeVariableStarList(s)).toMatchObject({list:null,curve:null,help:false});
  expect(displayLightCurve(INITIAL_VARIABLE_STAR_SESSION,r)).toBe(INITIAL_VARIABLE_STAR_SESSION);
  expect(toggleVariableHelp(INITIAL_VARIABLE_STAR_SESSION)).toBe(INITIAL_VARIABLE_STAR_SESSION);
 });
 it('List Type Codes only toggles its own check mark (0x52d334)',()=>{
  const r=rec(30234),s=openVariableStarList(INITIAL_VARIABLE_STAR_SESSION,r),t=toggleListTypeCodes(s);
  expect([s.listTypeCodes,t.listTypeCodes]).toEqual([true,false]);expect(t.list).toBe(s.list);
 });
});
