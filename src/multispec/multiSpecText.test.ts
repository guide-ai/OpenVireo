import {describe,it,expect} from 'vitest';
import type {MultiSpecSelection} from '../core/multiSpecSpectrum';
import {multiSpecFibreMask,MULTISPEC_MASK_PENDING,MULTISPEC_UNMASKED} from './multiSpecText';

const sel=(source:MultiSpecSelection['source'],type:MultiSpecSelection['type']=0)=>({type,name:'N2230-01839',ra:1,dec:2,v:12,z:null,spectralIndex:null,x:400,y:400,source}) as MultiSpecSelection;
const policy={masked:true,target:{ra:1,dec:2,label:'ObjX-7'}} as const;

describe('Front M: Object X fibre mask (review M1)',()=>{
 it('only the fibre whose record is the target carries ObjX-<ID>; neighbours read the neutral text',()=>{
  expect(multiSpecFibreMask(policy,sel({kind:'star',index:3}),{kind:'star',index:3})).toEqual({objectName:'ObjX-7'});
  expect(multiSpecFibreMask(policy,sel({kind:'star',index:4}),{kind:'star',index:3})).toEqual({objectName:'Name hidden during Object X'});
  expect(multiSpecFibreMask(policy,sel({kind:'galaxy',index:3},1),{kind:'star',index:3})).toEqual({objectName:'Name hidden during Object X'});
  expect(multiSpecFibreMask(policy,sel({kind:'star',index:3}),null)).toEqual({objectName:'Name hidden during Object X'});
 });
 it('sky reads Sky; pending (no target) is neutral; unmasked returns nothing',()=>{
  expect(multiSpecFibreMask(policy,{...sel({kind:'sky'},4),name:'Sky'},null)).toEqual({objectName:'Sky'});
  expect(multiSpecFibreMask(MULTISPEC_MASK_PENDING,sel({kind:'star',index:3}),{kind:'star',index:3})).toEqual({objectName:'Name hidden during Object X'});
  expect(multiSpecFibreMask(MULTISPEC_UNMASKED,sel({kind:'star',index:3}),{kind:'star',index:3})).toBeUndefined();
 });
});
