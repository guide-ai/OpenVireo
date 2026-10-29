import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {decodeVariableStarCatalog,type VariableStarRecord} from './variableStars';
import {variableClass,variableColours} from './variableDispatch';
import {cameraColourTerm,cameraVariableMagnitude} from './cameraColourTerm';

const catalog=decodeVariableStarCatalog(new Uint8Array(readFileSync(new URL('../../public/original/variables/CLEA_VStrs.dat',import.meta.url))));
const pick=(c:number)=>catalog.find(r=>variableClass(r.type)===c&&r.period.value!==0&&r.riseWord!==0)!;
const f=Math.fround;

describe('camera colour term 0x51ef38',()=>{
 it('class 0 (Cepheid model): NF and R give V−R, B −(B−V) of the field star, V 0, I (V−R)+(R−I)',()=>{
  const r=pick(0),k=variableColours(r);
  expect([0,1,2,3,4].map(x=>cameraColourTerm(r,x as 0|1|2|3|4,0.625))).toEqual([f(k.vMinusR),f(-0.625),0,f(k.vMinusR),f(k.vMinusR+k.rMinusI)]);
  expect(k.vMinusR).toBeLessThan(30);
  // Review I3: 0x51f044 stores V−R as Single, then adds R−I in ST0; both colours are Singles already, so their exact sum
  // rounded once to Single is the native value.
  expect([k.vMinusR,k.rMinusI].every(x=>Object.is(x,f(x)))).toBe(true);
 });
 it('classes 1 and 2 use the base object: 30 for V−R and R−I (original bug kept)',()=>{
  for(const c of [1,2]){const r=pick(c);expect([0,2,3,4].map(x=>cameraColourTerm(r,x as 0|2|3|4,0.5))).toEqual([30,0,30,60]);expect(cameraColourTerm(r,1,0.5)).toBe(-0.5);}
  expect(cameraVariableMagnitude(f(9.5),30)).toBe(f(-20.5));
 });
 it('0 for a zero period, a zero rise word (even for class 1) or class 3',()=>{
  const r=pick(1);
  expect(cameraColourTerm({...r,period:{...r.period,value:0}} as VariableStarRecord,3,0.5)).toBe(0);
  expect(cameraColourTerm({...r,riseWord:0},3,0.5)).toBe(0);
  expect(cameraColourTerm({...r,type:'XYZ'},3,0.5)).toBe(0);
 });
});
