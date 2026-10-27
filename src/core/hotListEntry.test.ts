import {describe,expect,it} from 'vitest';
import {addCurrentPrefill,hotListEntryAddedText,hotListEntryDraft,parseHotListEntry,type HotListEntryDraft} from './hotListEntry';

// Chosen implementation contract (OB-AC-01..04); not a native runtime oracle.
const d=(raHours:string,raMinutes:string,raSeconds:string,decDegrees:string,decMinutes:string,decSeconds:string,id='X',remarks=''):HotListEntryDraft=>({id,remarks,raHours,raMinutes,raSeconds,decDegrees,decMinutes,decSeconds});
describe('OB-AC-01/02 prefill and display',()=>{
 it('prefills the object ID only when an object is identified, and splits RA/Dec',()=>{
  expect(addCurrentPrefill({ra:5.5,dec:-12.25},null,'Star')).toEqual({id:'',remarks:'',ra:5.5,dec:-12.25});
  const f=addCurrentPrefill({ra:5.5,dec:-12.25},'M82','Galaxy');expect(f.id).toBe('M82');expect(f.remarks).toBe('Galaxy');
  expect(hotListEntryDraft(f)).toEqual(d('5','30','0.00','-12','15','0.0','M82','Galaxy'));
  expect(hotListEntryDraft({id:'',remarks:'',ra:0,dec:-0.5}).decDegrees).toBe('0');// sign lost as natively
 });
});
describe('OB-AC-03 OK',()=>{
 it('parses h/m/s and d/m/s with the degree-value sign rule',()=>{
  const r=parseHotListEntry(d('12','30','0','-45','30','0'));expect(r).toEqual({status:'ok',fields:{id:'X',remarks:'',ra:12.5,dec:-45.5}});
  const z=parseHotListEntry(d('0','0','0','-0','30','0'));expect(z.status==='ok'&&z.fields.dec).toBe(0.5);// "-0" is positive
 });
 it('RA errors win; bounds are inclusive; RA 24 is refused by the HTL codec domain',()=>{
  expect(parseHotListEntry(d('x','0','0','99','0','0')).status).toBe('ra-invalid');
  expect(parseHotListEntry(d('24','0','1','0','0','0')).status).toBe('ra-invalid');
  expect(parseHotListEntry(d('24','0','0','0','0','0')).status).toBe('ra-unsupported');
  expect(parseHotListEntry(d('1','0','0','90','0','1')).status).toBe('dec-invalid');
  expect(parseHotListEntry(d('1','0','0','-90','0','0')).status).toBe('ok');
 });
 it('truncates ID to 24 and remarks to 40 characters',()=>{
  const r=parseHotListEntry(d('1','0','0','0','0','0','i'.repeat(30),'r'.repeat(50)));
  expect(r.status==='ok'&&[r.fields.id.length,r.fields.remarks.length]).toEqual([24,40]);
 });
});
describe('OB-AC-04 confirmation',()=>{
 it('names the object or the position',()=>{expect(hotListEntryAddedText('M82')).toBe('Object M82 added to Observation List.');expect(hotListEntryAddedText('')).toBe('Position added to Observation List.');});
});
