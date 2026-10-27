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
/** OB-HL-02 FormShow caption for exercise 0 (the web observatory has no exercise mode): "Hot List File: " + file name, or
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
