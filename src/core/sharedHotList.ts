/** One confirmed HTL document shared by the observatory Hot List editor and the radio panel's Slew ▸ Hot List.
 * CLEA_VEO.exe 781bc970…c54c keeps a single list form [0x5b5998] whose list lives at +0x58d (FormCreate 0x5903a8);
 * the optical Load 0x53f498 and the radio LoadHotList1Click 0x568024 both call it (RA-HL-01/02 in
 * docs/RADIO-ANTENNA-PROVENANCE.json). The read ownership, tokens and the optical-draft lock are browser policy
 * (WEB-HL-01): a file read is asynchronous here, so a late completion must never overwrite a newer document.
 * Pure state only: no React, file access or timers. */
import {newHtlEditor,type HtlEditor,type HtlList} from './hotList';

export type HotListOwner='optical'|'radio';
export type HotListRead=Readonly<{owner:HotListOwner;token:number;revision:number}>;
export type SharedHotList=Readonly<{
 /** The confirmed list with the optical editor's selection and one-step Undo (null before any Open/New/Load). */
 editor:HtlEditor|null;
 /** Source file name shown by the editor ('' for a new list). */
 name:string;
 /** Incremented when the list identity or the name changes; selection-only changes keep it. */
 revision:number;
 /** The one pending file read, if any. */
 read:HotListRead|null;
 readSeq:number;
 /** The observatory editor has an Add/Edit draft open (radio Load is then refused). */
 opticalDraft:boolean;
}>;
export type SharedHotListOutcome='ok'|'loaded'|'stale'|'read-pending'|'optical-draft'|'unchanged';
export type SharedHotListStep=Readonly<{doc:SharedHotList;outcome:SharedHotListOutcome;token?:number}>;

export const INITIAL_SHARED_HOT_LIST:SharedHotList=Object.freeze({editor:null,name:'',revision:0,read:null,readSeq:0,opticalDraft:false});

const step=(doc:SharedHotList,outcome:SharedHotListOutcome,token?:number):SharedHotListStep=>Object.freeze(token===undefined?{doc,outcome}:{doc,outcome,token});
const next=(doc:SharedHotList,patch:Partial<SharedHotList>):SharedHotList=>Object.freeze({...doc,...patch});
const owns=(doc:SharedHotList,owner:HotListOwner,token:number)=>doc.read!==null&&doc.read.owner===owner&&doc.read.token===token;

/** Starts a read. Refused while another read is pending, and for the radio owner while an optical draft is open. */
export function beginHotListRead(doc:SharedHotList,owner:HotListOwner):SharedHotListStep{
 if(doc.read)return step(doc,'read-pending');
 if(owner==='radio'&&doc.opticalDraft)return step(doc,'optical-draft');
 const token=doc.readSeq+1;
 return step(next(doc,{read:Object.freeze({owner,token,revision:doc.revision}),readSeq:token}),'ok',token);
}
/** Confirmed replacement (the existing optical Open semantics: first row selected, Undo cleared), in one object.
 * 'stale' unless the read is still this owner's token and no list/name change happened meanwhile; a stale radio commit
 * that still owns the slot (an optical draft opened meanwhile) releases it. */
export function commitHotListRead(doc:SharedHotList,owner:HotListOwner,token:number,list:HtlList,name:string):SharedHotListStep{
 if(!owns(doc,owner,token))return step(doc,'stale');
 if(doc.revision!==doc.read!.revision||(owner==='radio'&&doc.opticalDraft))return step(next(doc,{read:null}),'stale');
 return step(next(doc,{editor:newHtlEditor(list),name,revision:doc.revision+1,read:null}),'loaded');
}
/** Cancel or failure: clears only the caller's own slot. */
export function cancelHotListRead(doc:SharedHotList,owner:HotListOwner,token:number):SharedHotListStep{
 return owns(doc,owner,token)?step(next(doc,{read:null}),'ok'):step(doc,'unchanged');
}
export const failHotListRead=cancelHotListRead;
/** Optical New/Add/Edit/Remove/Undo/selection. The revision changes only when the list or name identity changes. */
export function setHotListEditor(doc:SharedHotList,editor:HtlEditor,name:string=doc.name):SharedHotListStep{
 if(editor===doc.editor&&name===doc.name)return step(doc,'unchanged');
 const changed=editor.list!==doc.editor?.list||name!==doc.name;
 return step(next(doc,{editor,name,revision:changed?doc.revision+1:doc.revision}),'ok');
}
/** A step that changes nothing. */
export const keepHotList=(doc:SharedHotList):SharedHotListStep=>step(doc,'unchanged');
/** Opening an optical draft also cancels a pending radio read, so that read can never land under the draft. */
export function setOpticalDraft(doc:SharedHotList,open:boolean):SharedHotListStep{
 const read=open&&doc.read?.owner==='radio'?null:doc.read;
 if(doc.opticalDraft===open&&read===doc.read)return step(doc,'unchanged');
 return step(next(doc,{opticalDraft:open,read}),'ok');
}
