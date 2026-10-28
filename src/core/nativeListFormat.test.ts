import {describe,expect,test} from 'vitest';
import {formatNativeSexagesimalDigits,splitNativeSexagesimal} from './nativeListFormat';
import {splitSexagesimal} from './radioAntenna';
import {formatNativeSexagesimal} from './variableStars';
import {COMPILED_EDIT_MODE,catalogObjectClickEnabled,fieldInformationVisible} from './editMode';
import {readOpticalOptions,COMPILED_OPTICAL_OPTIONS} from './opticalOptions';

describe('0x486bc0 / 0x486ca0 with 0, 1, 2 decimals',()=>{
 const values=[0,1.5,-0.2,22.486,58.415,-88.9999999,12.99999999,359.99999,7.5/60,-5.7075];
 test('d = 1, 2 equal the existing ports',()=>{
  for(const v of values)for(const d of [1,2] as const){
   expect(splitNativeSexagesimal(v,d)).toEqual({...splitSexagesimal(v,d)});
   expect(formatNativeSexagesimalDigits(v,d,['h ','m ','s'])).toBe(formatNativeSexagesimal(v,d,['h ','m ','s']));
  }
 });
 test('d = 0: carry and zero prefix',()=>{
  expect(formatNativeSexagesimalDigits(10+59/60+59.6/3600,0,['°',"'",'"'])).toBe('  11°00\'00"');
  expect(formatNativeSexagesimalDigits(-(5+1/60+9.4/3600),0,['°',"'",'"'])).toBe('  -5°01\'09"');
  expect(formatNativeSexagesimalDigits(27.5,0,['°',"'",'"'])).toBe('  27°30\'00"');
 });
});
describe('Edit Mode (FO-EM)',()=>{
 test('compiled default off; gates follow it; the persisted options keep their exact shape',()=>{
  expect(COMPILED_EDIT_MODE).toBe(false);
  expect([fieldInformationVisible(false),fieldInformationVisible(true),catalogObjectClickEnabled(false),catalogObjectClickEnabled(true)]).toEqual([false,true,false,true]);
  expect(()=>readOpticalOptions({limitSlewing:false,editMode:true})).toThrow();
  expect(readOpticalOptions(COMPILED_OPTICAL_OPTIONS)).toEqual({limitSlewing:false});
 });
});
