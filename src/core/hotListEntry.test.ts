import {describe,expect,it} from 'vitest';
import {addHtlRowRaOrdered,raOrderedInsertIndex,appendAddCurrentEntry,originalCatalogId,addCurrentPrefill,hotListEntryAddedText,hotListEntryDraft,parseHotListEntry,type HotListEntryDraft} from './hotListEntry';

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
describe('F6 original catalog IDs only',()=>{
 it('strips the web acquisition suffix and refuses file@offset keys',()=>{
  expect(originalCatalogId('36773-acquisition')).toBe('36773');expect(originalCatalogId('NGC3031')).toBe('NGC3031');
  expect(originalCatalogId('N0000.DAT@14428')).toBeNull();expect(originalCatalogId('')).toBeNull();expect(originalCatalogId('-acquisition')).toBeNull();
 });
});
describe('F7 blank ID for Add Current only',()=>{
 it('appends a blank-ID position that survives the codec, keeps Undo, and leaves the editor rule for named rows',async()=>{
  const {newHtlEditor,serializeHtl,parseHtl,undoHtl,addHtlRow}=await import('./hotList');
  const e=appendAddCurrentEntry(newHtlEditor(),{id:'',remarks:'',ra:3.25,dec:-20.5});
  expect(e.list[0]).toMatchObject({id:'',remarks:'',ra:3.25,dec:-20.5});expect(e.selected).toBe(0);
  expect(parseHtl(serializeHtl(e.list))[0]).toMatchObject({id:'',ra:3.25,dec:-20.5});
  expect(undoHtl(e).list).toHaveLength(0);
  // Front P: 0x590588 inserts in RA order, so M82 (1 h) goes before the 3.25 h position.
  expect(appendAddCurrentEntry(e,{id:'M82',remarks:'',ra:1,dec:2}).list.map(r=>r.id)).toEqual(['M82','']);
  expect(()=>addHtlRow(newHtlEditor(),{id:'',remarks:'',ra:1,dec:2})).toThrow();// editor rule unchanged
 });
});
describe('review note 3: ID whitespace is kept exactly as typed (no Trim in OKBtnClick 0x4f8898 → @LStrToString 0x4060cc)',()=>{
 it('parse and append keep leading/trailing and whitespace-only IDs; the message follows the non-empty ID',async()=>{
  const {newHtlEditor,serializeHtl,parseHtl}=await import('./hotList');
  const r=parseHotListEntry({id:' M82 ',remarks:' x ',raHours:'1',raMinutes:'0',raSeconds:'0',decDegrees:'2',decMinutes:'0',decSeconds:'0'});
  expect(r.status==='ok'&&[r.fields.id,r.fields.remarks]).toEqual([' M82 ',' x ']);
  let e=appendAddCurrentEntry(newHtlEditor(),{id:' M82 ',remarks:'',ra:1,dec:2});
  e=appendAddCurrentEntry(e,{id:'   ',remarks:'',ra:3,dec:4});
  e=appendAddCurrentEntry(e,{id:'',remarks:'',ra:5,dec:6});
  expect(e.list.map(x=>x.id)).toEqual([' M82 ','   ','']);
  expect(parseHtl(serializeHtl(e.list)).map(x=>x.id)).toEqual([' M82 ','   ','']);
  expect(hotListEntryAddedText('   ')).toBe('Object     added to Observation List.');expect(hotListEntryAddedText('')).toBe('Position added to Observation List.');
  expect(()=>appendAddCurrentEntry(newHtlEditor(),{id:'\t',remarks:'',ra:1,dec:2})).toThrow();
 });
});

describe('Front P: RA-ordered placement of 0x590588 (web rule on the file-order list)',()=>{
 it('keeps an RA-ordered list in RA order, puts equal RAs after the existing ones, selects the new row and keeps Undo',async()=>{
  const {newHtlEditor,addHtlRow,undoHtl}=await import('./hotList');
  let e=newHtlEditor();for(const [id,ra] of [['A',1],['B',5],['C',5],['D',20]] as const)e=addHtlRow(e,{id,remarks:'',ra,dec:0});
  const at=(ra:number,id='N')=>appendAddCurrentEntry(e,{id,remarks:'',ra,dec:10});
  expect(at(0.5).list.map(r=>r.id)).toEqual(['N','A','B','C','D']);
  expect(at(3).list.map(r=>r.id)).toEqual(['A','N','B','C','D']);
  expect(at(5).list.map(r=>r.id)).toEqual(['A','B','C','N','D']);
  expect(at(23.9).list.map(r=>r.id)).toEqual(['A','B','C','D','N']);
  const n=at(3);expect(n.selected).toBe(1);expect(undoHtl(n).list.map(r=>r.id)).toEqual(['A','B','C','D']);
  expect(at(3,'').list.map(r=>r.id)).toEqual(['A','','B','C','D']);// blank-ID path too
  expect(addHtlRowRaOrdered(e,{id:'Q',remarks:'',ra:12,dec:0}).list.map(r=>r.id)).toEqual(['A','B','C','Q','D']);
 });
 it('in an unsorted file the new row goes after the last file row with a smaller or equal RA',async()=>{
  const {newHtlEditor,addHtlRow}=await import('./hotList');
  let e=newHtlEditor();for(const [id,ra] of [['X',10],['Y',2],['Z',6]] as const)e=addHtlRow(e,{id,remarks:'',ra,dec:0});
  // File X(10) Y(2) Z(6): RA 7 → after Z (index 3); RA 1 → top (index 0); RA 3 → after Y (index 2); RA 11 → end.
  expect(raOrderedInsertIndex(e.list,addHtlRow(e,{id:'N',remarks:'',ra:7,dec:0}).list[3])).toBe(3);
  expect(raOrderedInsertIndex(e.list,addHtlRow(e,{id:'N',remarks:'',ra:1,dec:0}).list[3])).toBe(0);
  expect(raOrderedInsertIndex(e.list,addHtlRow(e,{id:'N',remarks:'',ra:3,dec:0}).list[3])).toBe(2);
  expect(raOrderedInsertIndex(e.list,addHtlRow(e,{id:'N',remarks:'',ra:11,dec:0}).list[3])).toBe(3);
  expect(raOrderedInsertIndex([],addHtlRow(e,{id:'N',remarks:'',ra:11,dec:0}).list[3])).toBe(0);
 });
});

describe('Front R2 (R1 review L5): an Edit opened before another window appends or removes rows',()=>{
 it('the row under Edit is found by identity after an RA-ordered insert above it, and a removed row gives the index error',async()=>{
  const {newHtlEditor,addHtlRow,editHtlRow,removeHtlRow,htlRowIndexOf,HtlError}=await import('./hotList');
  let e=newHtlEditor();for(const [id,ra] of [['A',1],['B',5],['C',9]] as const)e=addHtlRow(e,{id,remarks:'',ra,dec:0});
  const editing=e.list[1];// Edit opened on B (index 1)
  const after=addHtlRowRaOrdered(e,{id:'X',remarks:'',ra:2,dec:0});// another window inserts X before B
  expect(after.list.map(r=>r.id)).toEqual(['A','X','B','C']);
  const at=htlRowIndexOf(after,editing);expect(at).toBe(2);
  const applied=editHtlRow(after,at,{id:'B2',remarks:'',ra:5,dec:0});
  expect(applied.list.map(r=>r.id)).toEqual(['A','X','B2','C']);// X, not B, would have been overwritten at the stale index 1
  const gone=removeHtlRow(after,2);expect(htlRowIndexOf(gone,editing)).toBe(-1);
  expect(()=>editHtlRow(gone,-1,{id:'B2',remarks:'',ra:5,dec:0})).toThrow(HtlError);
 });
});
