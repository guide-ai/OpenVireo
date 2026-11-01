/** Optical Slew ▸ Hot List ▸ View/Select (OB-HL, docs/OPTICAL-OBSERVATORY-PROVENANCE.json). CLEA_VEO.exe 781bc970…c54c,
 * static listings only. TObsrvtry.ViewSelectfromList1Click 0x53f360 shows the same list window [0x5b5998] that the radio
 * panel uses (THotListForm1, caption 'Select Object for Observation'), so the row order (RA-HL-03/04 native RA insertion,
 * radioHotListProjection), the empty-list box (RA-HL-06), the 0x590110 row text (RA-HL-08) and Search (RA-HL-09) are the
 * recovered radio contracts, imported unchanged. Slew to Selection copies the row, clears the B1950 flag, disables the epoch
 * group and opens Set Coordinates (opticalSkyCoords.openOpticalSkyCoordsFromHotList); Cancel there returns to this list.
 * Pure state: no React, timers or I/O. Edit/Delete/Undo/Save List of the native window stay with the observatory HTL editor. */
import type {HtlFields,HtlList} from './hotList';
import {RADIO_HOT_LIST_LITERALS} from './radioAntenna';
import {radioHotListProjection,type RadioHotListRow} from './radioHotList';
import {formatHotListDec,formatHotListRa,formatRadioHotListRow} from './radioHotListFormat';
import {INITIAL_RADIO_HOT_LIST_SEARCH,RADIO_HOT_LIST_SEARCH_QUERY_MAX,foldAsciiCase,radioHotListMissText,radioHotListSearchStart,radioHotListVisibleIndex,searchRadioHotListRows,type RadioHotListSearchMode,type RadioHotListSearchState} from './radioHotListSearch';

export type OpticalHotListNotice=Readonly<{kind:'empty'}|{kind:'no-selection'}|{kind:'search-miss';query:string}>;
export type OpticalHotListWindow=Readonly<{shown:boolean;index:number;search:RadioHotListSearchState;notice:OpticalHotListNotice|null}>;
export const INITIAL_OPTICAL_HOT_LIST:OpticalHotListWindow=Object.freeze({shown:false,index:-1,search:INITIAL_RADIO_HOT_LIST_SEARCH,notice:null});
export const OPTICAL_HOT_LIST_EMPTY=RADIO_HOT_LIST_LITERALS;

const next=(w:OpticalHotListWindow,patch:Partial<OpticalHotListWindow>):OpticalHotListWindow=>Object.freeze({...w,...patch});
const blocked=(w:OpticalHotListWindow)=>w.notice!==null||w.search.dialog!==null;

/** Rows of the list window in native order (the shared projection; file order and the editor are untouched). */
export function opticalHotListRows(list:HtlList|null|undefined):readonly RadioHotListRow[]{return list?radioHotListProjection(list).rows:[];}

/** OB-HL-03 row text. The list fill 0x5905e8 uses the full row 0x590110 (ID padded to 24, RA, Dec, remarks) only when the
 * exercise byte env+0x383f is 5 (LSS) or 6 (Pulsar) or Edit Mode (env+0x2e7e) is on; otherwise (no exercise, Hubble,
 * Pleiades…) the ordinal formatter 0x590248: IntToStr(position) left-padded with ' ' to width 4, then the same RA and Dec
 * fields, no ID and no remarks. `position` is 1-based in the shown order. */
export type OpticalHotListRowFormat='ordinal'|'full';
export function opticalHotListRowText(record:HtlFields,position:number,format:OpticalHotListRowFormat='ordinal'):string{
 if(format==='full')return formatRadioHotListRow(record);
 if(!Number.isInteger(position)||position<1)throw new RangeError('Invalid hot list position');
 return String(position).padStart(4,' ')+formatHotListRa(record.ra)+formatHotListDec(record.dec);
}
/** Front R5 [D] (review 1 M2): the row format follows Edit Mode and the exercise byte env+0x383f (the web's `exerciseCode`).
 * - The fill 0x5905e8 (FormShow): the full row for exercise 6 (0x59065b) or 5 (0x59066b) or in Edit Mode (0x59067b).
 * - A row replaced by EditSelectedLine1Click 0x591488: the full row for exercise 6 or in Edit Mode only (0x5915d1..0x5915e8);
 *   it keeps that text until the next show refills the list.
 * Search and Print read the same ListBox1 items. */
export const opticalHotListRowFormat=(editMode:boolean,exerciseCode=0):OpticalHotListRowFormat=>editMode||exerciseCode===5||exerciseCode===6?'full':'ordinal';
export const opticalHotListEditedRowFormat=(editMode:boolean,exerciseCode=0):OpticalHotListRowFormat=>editMode||exerciseCode===6?'full':'ordinal';
/** Front R5 [D] (review 1 M2): FormShow 0x5908d1..0x590917 enables Edit1/Edit2/Delete1 from Edit Mode; only the exercise-0 case
 * of the jump table 0x59093a (0x590956 → 0x5909be..0x5909e0) forces them on. */
export const opticalHotListEditEnabled=(editMode:boolean,exerciseCode=0)=>editMode||exerciseCode===0;
/** Front R5 [D] (review 1 M1): SaveList1Click writes the in-memory list +0x58d head to tail (0x591b7f..0x591bb8), the list the
 * reader built by RA cursor insertion (0x5904bf → 0x492728) and the window shows; so the file follows the shown order. Tied rows
 * therefore swap as in the window (Hubble.HTL rows 7 and 8, LSS_Field08 and LSS_Field09). [I] Native Edit replaces a node in
 * place without re-sorting; the web's shown order re-sorts after an RA edit. */
export const opticalHotListSaveRecords=(rows:readonly RadioHotListRow[]):HtlList=>Object.freeze(rows.map(r=>r.record));

/** Front R5 [D], THotListForm1 List › Save (SaveList1, +0x3ac). Enabled := Edit Mode at FormShow (0x590a54..0x590a68); := 1
 * after Edit (0x591652) or Delete (0x59181b); Undo leaves it (0x591993..0x5919a8 touch only the Undo items); after a save :=
 * Edit Mode (0x591bd8). SaveList1Click 0x5919b4 saves only in Edit Mode (0x5919f7); otherwise it shows the Edit Mode Required
 * box (0x591ad2, flag 0x40). A save writes every record (86 bytes each, Rewrite 0x56 at 0x591b12) and then shows the saved box
 * (0x591c30..0x591c5b, flag 0x40). */
export const OPTICAL_HOT_LIST_SAVE_LITERALS=Object.freeze({
 item:'&Save List',dialogTitle:'Save Hot List File',filter:'*.HTL',
 editModeRequiredCaption:'Edit Mode Required!',
 editModeRequiredText:'You must be in Edit Mode to save a new or modified Hot List.\r\nFor information on setting Edit Mode, see the VIREO manual.',
 savedCaption:'Observation List File Saved',savedText:'Observation list saved in ',
 failedText:'Unable to save Observation List to file!\r\n\r\nFile Name: ',
});
export type OpticalHotListSaveEvent='show'|'edit'|'delete'|'undo'|'saved';
export function opticalHotListSaveEnabled(event:OpticalHotListSaveEvent,editMode:boolean,enabled:boolean):boolean{
 switch(event){
  case 'show':case 'saved':return editMode;
  case 'edit':case 'delete':return true;
  case 'undo':return enabled;
 }
}
export const opticalHotListSaveOutcome=(editMode:boolean):'save'|'edit-mode-required'=>editMode?'save':'edit-mode-required';
export const opticalHotListSavedText=(fileName:string)=>OPTICAL_HOT_LIST_SAVE_LITERALS.savedText+fileName;

/** OB-HL-02 FormShow caption for exercise 0 (the exercise cases 1–6 only change the caption, 0x5909e7..0x590a4f; not ported): "Hot List File: " + file name, or
 * "New Hot List File" without a file. The " (Modified)" suffix (+0x587) is not tracked by the shared list (adaptation). */
export const OPTICAL_HOT_LIST_CAPTIONS=Object.freeze({file:'Hot List File: ',modified:' (Modified)',none:'New Hot List File'});
export function opticalHotListCaption(fileName:string):string{return fileName?OPTICAL_HOT_LIST_CAPTIONS.file+fileName:OPTICAL_HOT_LIST_CAPTIONS.none;}

/** View/Select: an empty list gives the 'Observation List Empty' box and nothing else; otherwise the list is shown with its
 * remembered index kept and the Find state reset (FormActivate 0x590c28). */
export function openOpticalHotList(w:OpticalHotListWindow,rowCount:number):OpticalHotListWindow{
 if(!Number.isInteger(rowCount)||rowCount<0)throw new RangeError('Invalid hot list row count');
 if(w.shown||w.notice)return w;
 if(rowCount===0)return next(w,{notice:Object.freeze({kind:'empty'})});
 return next(w,{shown:true,search:INITIAL_RADIO_HOT_LIST_SEARCH});
}
export function selectOpticalHotListIndex(w:OpticalHotListWindow,index:number,rowCount:number):OpticalHotListWindow{
 if(!w.shown||blocked(w)||!Number.isInteger(index)||index<0||index>=rowCount)return w;
 if(w.index===index&&w.search.found===null)return w;
 return next(w,{index,search:Object.freeze({...w.search,found:null})});
}
export function closeOpticalHotList(w:OpticalHotListWindow):OpticalHotListWindow{
 if(!w.shown||blocked(w))return w;
 return next(w,{shown:false});
}
export function dismissOpticalHotListNotice(w:OpticalHotListWindow):OpticalHotListWindow{return w.notice?next(w,{notice:null}):w;}
/** Slew1Click: the remembered index (never a Search highlight) picks the row; the list closes and the caller opens Set
 * Coordinates with it. No valid selection gives the no-selection box and the list stays. */
export function slewToOpticalHotListSelection(w:OpticalHotListWindow,rows:readonly RadioHotListRow[]):Readonly<{window:OpticalHotListWindow;row:HtlFields|null}>{
 if(!w.shown||blocked(w))return Object.freeze({window:w,row:null});
 const row=w.index>=0&&w.index<rows.length?rows[w.index].record:null;
 if(!row)return Object.freeze({window:next(w,{notice:Object.freeze({kind:'no-selection'})}),row:null});
 return Object.freeze({window:next(w,{shown:false}),row});
}
/** Set Coordinates Cancel from a hot-list open: the list is shown again with Find reset. */
export function reopenOpticalHotList(w:OpticalHotListWindow):OpticalHotListWindow{return next(w,{shown:true,notice:null,search:INITIAL_RADIO_HOT_LIST_SEARCH});}

// Search (RA-HL-09), same semantics as the radio transitions.
export function openOpticalHotListSearch(w:OpticalHotListWindow):OpticalHotListWindow{
 if(!w.shown||blocked(w))return w;
 return next(w,{search:Object.freeze({...w.search,dialog:Object.freeze({query:w.search.query,matchCase:w.search.matchCase})})});
}
export function editOpticalHotListSearch(w:OpticalHotListWindow,query:string,matchCase:boolean):OpticalHotListWindow{
 const d=w.search.dialog;
 if(!w.shown||!d||w.notice||typeof query!=='string'||typeof matchCase!=='boolean'||query.length>RADIO_HOT_LIST_SEARCH_QUERY_MAX)return w;
 if(d.query===query&&d.matchCase===matchCase)return w;
 return next(w,{search:Object.freeze({...w.search,dialog:Object.freeze({query,matchCase})})});
}
export function cancelOpticalHotListSearch(w:OpticalHotListWindow):OpticalHotListWindow{
 if(!w.search.dialog||w.notice)return w;
 return next(w,{search:Object.freeze({...w.search,dialog:null})});
}
export function submitOpticalHotListSearch(w:OpticalHotListWindow,mode:RadioHotListSearchMode,rowTexts:readonly string[]):OpticalHotListWindow{
 const s=w.search,d=s.dialog;
 if(!w.shown||!d||w.notice)return w;
 if(d.query==='')return next(w,{search:Object.freeze({...s,query:'',matchCase:d.matchCase,dialog:null})});
 const query=d.matchCase?d.query:foldAsciiCase(d.query);
 const result=searchRadioHotListRows(rowTexts,query,d.matchCase,radioHotListSearchStart(mode,radioHotListVisibleIndex(w.index,s.found,rowTexts)));
 if(result.kind==='hit')return next(w,{search:Object.freeze({query,matchCase:d.matchCase,dialog:null,found:Object.freeze({index:result.index,text:rowTexts[result.index]})})});
 return next(w,{search:Object.freeze({query,matchCase:d.matchCase,dialog:null,found:s.found}),notice:Object.freeze({kind:'search-miss',query})});
}
export {radioHotListMissText as opticalHotListMissText};
