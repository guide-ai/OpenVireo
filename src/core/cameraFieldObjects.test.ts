import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {decodeVariableStarCatalog,VSTRS_RECORD_BYTES} from './variableStars';
import {variableClass} from './variableDispatch';
import {cameraColourTerm} from './cameraColourTerm';
import {cameraFieldObjects} from './cameraFieldObjects';
import type {FieldPopulation} from './fieldEngine';

const file=new Uint8Array(readFileSync(new URL('../../public/original/variables/CLEA_VStrs.dat',import.meta.url)));
const catalog=decodeVariableStarCatalog(file);
const index=(c:number)=>catalog.findIndex(r=>variableClass(r.type)===c&&r.period.value!==0&&r.riseWord!==0);
const hex=(i:number)=>Array.from(file.subarray(i*VSTRS_RECORD_BYTES,(i+1)*VSTRS_RECORD_BYTES),b=>b.toString(16).padStart(2,'0')).join('');
const computed=(v:number,bMinusV:number)=>({status:'computed' as const,jd:2451545,v,bMinusV,uMinusB:0,spectralCode:0,spectralText:'',flags:{} as never});
function population(entries:readonly [starId:string,recordIndex:number,values:unknown][],extraStars:readonly string[]=[]):FieldPopulation{
 const stars=[...extraStars.map(id=>({id,type:0,ra:1,dec:2})),...entries.map(([id],k)=>({id,type:0,ra:3+k,dec:4}))];
 return {variables:entries.map(([,i])=>({recordIndex:i,rawHex:hex(i)})),variableStars:entries.map(([starId,recordIndex,values])=>({starId,recordIndex,values})),stars} as unknown as FieldPopulation;
}
describe('camera field objects (0x5228dc input, Front R2)',()=>{
 test('only TRUE-kept variables, in field-star order, with m = Single(V − colour term) for the CCD form filter',()=>{
  const c0=index(0),c1=index(1);
  const p=population([['v1',c0,computed(Math.fround(9.25),0.5)],['v2',c1,computed(Math.fround(8),1.2)]],['plain']);
  const r=cameraFieldObjects(p,3);
  if(r.status!=='ready')throw new Error(r.status);
  expect(r.objects.map(o=>o.starId)).toEqual(['v1','v2']);
  expect(r.objects[0].magnitude).toBe(Math.fround(Math.fround(9.25)-cameraColourTerm(catalog[c0],3,0.5)));
  expect(r.objects[1].magnitude).toBe(Math.fround(8-30));// class 1 uses the base object: R gives V − 30 (the original bug)
  expect(r.objects[0]).toMatchObject({raHours:3,decDegrees:4});
 });
 test('no field variables: the pass does not run; a typed value blocks it',()=>{
  expect(cameraFieldObjects(population([]),0)).toEqual({status:'none'});
  expect(cameraFieldObjects(population([['v',index(0),{status:'unavailable',reason:'variable-time-unavailable'}]]),0)).toEqual({status:'unavailable',reason:'variable-values'});
 });
});
