import {describe,expect,it} from 'vitest';
import {addHtlRow,newHtlEditor,parseHtl,selectHtlRow,updateHtlRecord,type HtlList} from './hotList';
import {INITIAL_SHARED_HOT_LIST,beginHotListRead,cancelHotListRead,commitHotListRead,failHotListRead,keepHotList,setHotListEditor,setOpticalDraft,type SharedHotList} from './sharedHotList';

const row=(id:string,ra:number)=>updateHtlRecord(null,{id,remarks:'',ra,dec:0});
const list=(...ids:string[]):HtlList=>Object.freeze(ids.map((id,i)=>row(id,i)));
const begun=(doc:SharedHotList,owner:'optical'|'radio')=>{const s=beginHotListRead(doc,owner);expect(s.outcome).toBe('ok');return {doc:s.doc,token:s.token!};};

describe('shared HTL document ownership (WEB-HL-01)',()=>{
 it('refuses a second read and a radio read under an optical draft',()=>{
  const {doc}=begun(INITIAL_SHARED_HOT_LIST,'optical');
  expect(beginHotListRead(doc,'radio')).toMatchObject({outcome:'read-pending',doc});
  expect(beginHotListRead(doc,'optical').outcome).toBe('read-pending');
  const draft=setOpticalDraft(INITIAL_SHARED_HOT_LIST,true).doc;
  expect(beginHotListRead(draft,'radio')).toMatchObject({outcome:'optical-draft',doc:draft});
  expect(beginHotListRead(draft,'optical').outcome).toBe('ok');// the optical Open keeps its existing semantics
 });
 it('commits atomically like the optical Open: first row selected, Undo cleared, revision + 1',()=>{
  const old=setHotListEditor(INITIAL_SHARED_HOT_LIST,addHtlRow(newHtlEditor(list('A')),{id:'B',remarks:'',ra:2,dec:0}),'old.htl').doc;
  expect(old.editor!.previous).not.toBeNull();
  const {doc,token}=begun(old,'radio'),next=list('X','Y');
  const c=commitHotListRead(doc,'radio',token,next,'new.htl');
  expect(c.outcome).toBe('loaded');
  expect(c.doc).toMatchObject({name:'new.htl',revision:old.revision+1,read:null});
  expect(c.doc.editor).toEqual(newHtlEditor(next));expect(c.doc.editor!.list).toBe(next);
  expect(Object.isFrozen(c.doc)).toBe(true);
 });
 it('ignores a wrong token, a wrong owner or a list change during the read',()=>{
  const {doc,token}=begun(INITIAL_SHARED_HOT_LIST,'radio');
  expect(commitHotListRead(doc,'radio',token+1,list('A'),'a')).toMatchObject({outcome:'stale',doc});
  expect(commitHotListRead(doc,'optical',token,list('A'),'a')).toMatchObject({outcome:'stale',doc});
  const changed=setHotListEditor(doc,newHtlEditor(),'').doc;
  expect(changed.revision).toBe(doc.revision+1);
  const late=commitHotListRead(changed,'radio',token,list('A'),'a');
  expect(late.outcome).toBe('stale');expect(late.doc.editor).toBe(changed.editor);expect(late.doc.read).toBeNull();
  const cancelled=cancelHotListRead(doc,'radio',token).doc;
  expect(commitHotListRead(cancelled,'radio',token,list('A'),'a')).toMatchObject({outcome:'stale',doc:cancelled});
 });
 it('an optical draft opened during a radio read cancels it',()=>{
  const {doc,token}=begun(INITIAL_SHARED_HOT_LIST,'radio');
  const draft=setOpticalDraft(doc,true).doc;
  expect(draft.read).toBeNull();expect(draft.opticalDraft).toBe(true);
  expect(commitHotListRead(draft,'radio',token,list('A'),'a').outcome).toBe('stale');
  const optical=begun(INITIAL_SHARED_HOT_LIST,'optical');
  expect(setOpticalDraft(optical.doc,true).doc.read).toEqual(optical.doc.read);
 });
 it('cancel and failure clear only their own slot',()=>{
  const {doc,token}=begun(INITIAL_SHARED_HOT_LIST,'optical');
  expect(cancelHotListRead(doc,'radio',token)).toMatchObject({outcome:'unchanged',doc});
  expect(failHotListRead(doc,'optical',token+1)).toMatchObject({outcome:'unchanged',doc});
  const cleared=failHotListRead(doc,'optical',token);
  expect(cleared.outcome).toBe('ok');expect(cleared.doc.read).toBeNull();expect(cleared.doc.editor).toBe(doc.editor);
  expect(beginHotListRead(cleared.doc,'radio').token).toBe(token+1);
 });
 it('a selection-only change keeps the revision; list or name changes bump it',()=>{
  const base=setHotListEditor(INITIAL_SHARED_HOT_LIST,newHtlEditor(list('A','B')),'f.htl').doc;
  const selected=setHotListEditor(base,selectHtlRow(base.editor!,1));
  expect(selected.outcome).toBe('ok');expect(selected.doc.revision).toBe(base.revision);expect(selected.doc.editor!.selected).toBe(1);
  expect(setHotListEditor(base,base.editor!)).toMatchObject({outcome:'unchanged',doc:base});
  expect(setHotListEditor(base,base.editor!,'g.htl').doc.revision).toBe(base.revision+1);
  expect(keepHotList(base)).toMatchObject({outcome:'unchanged',doc:base});
  expect(setOpticalDraft(base,false)).toMatchObject({outcome:'unchanged',doc:base});
 });
 it('keeps the codec bytes of a confirmed list',()=>{
  const bytes=new Uint8Array(86*2);bytes.set([1,65],0);bytes.set([1,66],86);
  const parsed=parseHtl(bytes),{doc,token}=begun(INITIAL_SHARED_HOT_LIST,'radio');
  expect(commitHotListRead(doc,'radio',token,parsed,'b').doc.editor!.list).toBe(parsed);
 });
});
