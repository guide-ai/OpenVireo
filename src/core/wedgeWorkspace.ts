import{WEDGE_LIMITS,wedgeHasTxtExtension,wedgeParseLssText,type WedgeParseFailure,type WedgeParsedFile,type WedgeRecord,type WedgeSeparator}from'./wedgeLssText';
import{WEDGE_DEFAULT_OPTIONS,validWedgeOptions,type WedgeOptions}from'./wedgePlot';
/** Pure LSS wedge workspace. Ordering mirrors loader 0x57bfb4 and the LSS branch
 * 0x5891ef: extension gate, header gate, then (only when the results ListBox of
 * LSSRsltsForm1, VMT 0x57a77c, already holds a load) "Retain Current Data?" Yes=add / No→"Confirm Deletion!" / Cancel.
 * The web validates the whole file before asking and applies changes atomically;
 * the original asks before reading rows and can be left partially loaded or with
 * an open file on later faults. Loaded LSS records are the student's saved
 * measurements; nothing here creates, edits or replaces measurements elsewhere.
 * The workspace is in-memory only: no persistence format exists for it. */
export type WedgeReceipt=Readonly<{name:string;sha256:string;bytes:number;rows:number;hasZ:boolean;separator:WedgeSeparator;action:'first'|'add'|'replace'}>;
export type WedgeNotice=
 |Readonly<{kind:'loaded';name:string;rows:number;action:WedgeReceipt['action']}>
 |Readonly<{kind:'not-loaded';cause:'extension'|'header'|'cancel'|'declined'|'read'|'unsupported'|'capacity'|'suspended';name:string;failure?:WedgeParseFailure}>
 |Readonly<{kind:'no-data'}>;
export type WedgePending=Readonly<{name:string;sha256:string;bytes:number;file:WedgeParsedFile;stage:'retain'|'confirm-delete'}>;
export type WedgeWorkspace=Readonly<{
 records:readonly WedgeRecord[];
 /** LSSRsltsForm1.ListBox1 (empty in the TInfoListForm1 DFM; FormShow 0x57ad7c adds
  * nothing) holds header+rows after any successful load, so the second load prompts. */
 listLoaded:boolean;
 receipts:readonly WedgeReceipt[];
 reading:Readonly<{token:number;name:string}>|null;
 pending:WedgePending|null;
 options:WedgeOptions;
 optionsDraft:WedgeOptions|null;
 separator:WedgeSeparator;
 selected:number|null;
 notice:WedgeNotice|null;
}>;
export const EMPTY_WEDGE_WORKSPACE:WedgeWorkspace=Object.freeze({records:Object.freeze([]),listLoaded:false,receipts:Object.freeze([]),reading:null,pending:null,options:WEDGE_DEFAULT_OPTIONS,optionsDraft:null,separator:'.',selected:null,notice:null});
export class WedgeStateError extends Error{constructor(readonly code:'busy'|'pending'|'options'|'selection'|'separator'){super('LSS wedge state '+code);this.name='WedgeStateError';}}
const next=(w:WedgeWorkspace,change:Partial<WedgeWorkspace>):WedgeWorkspace=>Object.freeze({...w,...change});
const busy=(w:WedgeWorkspace)=>w.reading!==null||w.pending!==null;

/** Returns null when the request may proceed to reading; otherwise the workspace with the native refusal. */
export function requestWedgeLoad(w:WedgeWorkspace,name:string):WedgeWorkspace|null{
 if(busy(w))throw new WedgeStateError('busy');
 return wedgeHasTxtExtension(name)?null:next(w,{notice:{kind:'not-loaded',cause:'extension',name:name.slice(0,160)}});
}
export function beginWedgeRead(w:WedgeWorkspace,token:number,name:string):WedgeWorkspace{
 if(busy(w))throw new WedgeStateError('busy');
 if(!wedgeHasTxtExtension(name))throw new RangeError('extension');
 return next(w,{reading:Object.freeze({token,name:name.slice(0,160)}),notice:null});
}
export function cancelWedgeRead(w:WedgeWorkspace):WedgeWorkspace{return w.reading?next(w,{reading:null}):w;}
/** Host inactivity (hidden route, project save/restore; not an original behaviour).
 * Drops everything that could still commit later: the in-flight read (its token no
 * longer matches), the validated-but-unconfirmed import and the options draft.
 * Confirmed records, receipts, committed options, separator and selection are kept. */
export function suspendWedgeWorkspace(w:WedgeWorkspace):WedgeWorkspace{
 if(!w.reading&&!w.pending&&!w.optionsDraft)return w;
 const name=w.pending?.name??w.reading?.name;
 return next(w,{reading:null,pending:null,optionsDraft:null,notice:name===undefined?w.notice:{kind:'not-loaded',cause:'suspended',name}});
}
export function failWedgeRead(w:WedgeWorkspace,token:number,code:'read'|'size'='read'):WedgeWorkspace{
 if(w.reading?.token!==token)return w;
 const name=w.reading.name;
 return next(w,{reading:null,notice:code==='size'?{kind:'not-loaded',cause:'unsupported',name,failure:{kind:'unsupported',code:'size'}}:{kind:'not-loaded',cause:'read',name}});
}
function apply(w:WedgeWorkspace,p:Omit<WedgePending,'stage'>,action:WedgeReceipt['action']):WedgeWorkspace{
 const base=action==='replace'?[]:w.records,source=w.receipts.length;
 if(base.length+p.file.rows.length>WEDGE_LIMITS.workspaceRecords)return next(w,{reading:null,pending:null,notice:{kind:'not-loaded',cause:'capacity',name:p.name}});
 const added=p.file.rows.map(r=>Object.freeze({...r,source}));
 const receipt:WedgeReceipt=Object.freeze({name:p.name,sha256:p.sha256,bytes:p.bytes,rows:p.file.rows.length,hasZ:p.file.hasZ,separator:p.file.separator,action});
 return next(w,{records:Object.freeze([...base,...added]),listLoaded:true,receipts:Object.freeze([...w.receipts,receipt]),reading:null,pending:null,selected:action==='replace'?null:w.selected,notice:{kind:'loaded',name:p.name,rows:added.length,action}});
}
/** Late or superseded reads (token mismatch) never change the workspace. */
export function completeWedgeRead(w:WedgeWorkspace,token:number,file:Readonly<{name:string;sha256:string;bytes:Uint8Array}>):WedgeWorkspace{
 if(w.reading?.token!==token)return w;
 if(!/^[0-9a-f]{64}$/.test(file.sha256))throw new RangeError('sha256');
 const name=w.reading.name,parsed=wedgeParseLssText(file.bytes,w.separator);
 if(!parsed.ok)return next(w,{reading:null,notice:{kind:'not-loaded',cause:parsed.failure.kind==='header'?'header':'unsupported',name,failure:parsed.failure}});
 const p={name,sha256:file.sha256,bytes:file.bytes.byteLength,file:parsed.file};
 if(!w.listLoaded)return apply(w,p,'first');
 return next(w,{reading:null,pending:Object.freeze({...p,stage:'retain'})});
}
/** "Yes" = Add to current data. */
export function addWedgePending(w:WedgeWorkspace):WedgeWorkspace{if(w.pending?.stage!=='retain')throw new WedgeStateError('pending');return apply(w,w.pending,'add');}
/** "No" = Clear current data → second confirmation. */
export function clearWedgePending(w:WedgeWorkspace):WedgeWorkspace{if(w.pending?.stage!=='retain')throw new WedgeStateError('pending');return next(w,{pending:Object.freeze({...w.pending,stage:'confirm-delete'})});}
export function confirmWedgeDelete(w:WedgeWorkspace,yes:boolean):WedgeWorkspace{
 if(w.pending?.stage!=='confirm-delete')throw new WedgeStateError('pending');
 return yes?apply(w,w.pending,'replace'):next(w,{pending:null,notice:{kind:'not-loaded',cause:'declined',name:w.pending.name}});
}
export function cancelWedgePending(w:WedgeWorkspace):WedgeWorkspace{
 if(!w.pending)return w;return next(w,{pending:null,notice:{kind:'not-loaded',cause:'cancel',name:w.pending.name}});
}
/** PlotData1Click 0x58100c: empty lists → "No data to plot"; otherwise repaint. */
export function plotWedgeData(w:WedgeWorkspace):WedgeWorkspace{return w.records.length===0?next(w,{notice:{kind:'no-data'}}):w.notice?.kind==='no-data'?next(w,{notice:null}):w;}
export function dismissWedgeNotice(w:WedgeWorkspace):WedgeWorkspace{return w.notice?next(w,{notice:null}):w;}
export function setWedgeSeparator(w:WedgeWorkspace,separator:WedgeSeparator):WedgeWorkspace{
 if(busy(w))throw new WedgeStateError('busy');if(separator!=='.'&&separator!==',')throw new WedgeStateError('separator');
 return separator===w.separator?w:next(w,{separator});
}
// Options dialog (TWdgPltOptsForm1): edits a copy, OK commits, Cancel discards.
export function openWedgeOptions(w:WedgeWorkspace):WedgeWorkspace{return w.optionsDraft?w:next(w,{optionsDraft:w.options});}
export function editWedgeOptions(w:WedgeWorkspace,change:Partial<WedgeOptions>):WedgeWorkspace{
 if(!w.optionsDraft)throw new WedgeStateError('options');const draft=Object.freeze({...w.optionsDraft,...change});
 if(!validWedgeOptions(draft))throw new WedgeStateError('options');return next(w,{optionsDraft:draft});
}
export function commitWedgeOptions(w:WedgeWorkspace):WedgeWorkspace{if(!w.optionsDraft)throw new WedgeStateError('options');return next(w,{options:w.optionsDraft,optionsDraft:null});}
export function cancelWedgeOptions(w:WedgeWorkspace):WedgeWorkspace{return w.optionsDraft?next(w,{optionsDraft:null}):w;}
export function selectWedgeRecord(w:WedgeWorkspace,index:number|null):WedgeWorkspace{
 if(index!==null&&(!Number.isInteger(index)||index<0||index>=w.records.length))throw new WedgeStateError('selection');
 return index===w.selected?w:next(w,{selected:index});
}
