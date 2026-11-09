import {useEffect,useId,useRef,type RefObject} from 'react';
import {OBSERVATORY_VIREO_CAPTIONS as OV} from './ObservatoryMessages';
import {vireo,vireoMenuItem} from '../i18n/vireo';
import {htlNumberDraft} from '../core/hotList';
import {OPTICAL_HOT_LIST_EMPTY,OPTICAL_HOT_LIST_SAVE_LITERALS as SL,opticalHotListMissText,type OpticalHotListWindow as WindowState} from '../core/opticalHotList';
import {RADIO_HOT_LIST_FORM_CAPTIONS as C} from '../core/radioAntenna';
import {menuCaptionText} from '../core/radioControl';
import type {RadioHotListRow} from '../core/radioHotList';
import {RADIO_HOT_LIST_SEARCH_LITERALS as L,RADIO_HOT_LIST_SEARCH_QUERY_MAX,radioHotListFoundIndex,type RadioHotListSearchMode} from '../core/radioHotListSearch';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';
import PopupMenu,{usePopupMenu} from '../polish/PopupMenu';
import {HOT_LIST_POPUP_LITERALS as P,POLISH_MESSAGES as PM} from '../polish/PolishMessages';
const M=OBSERVATORY_MESSAGES.hotList;

function useModal(ref:RefObject<HTMLDialogElement|null>,open:boolean,focus?:()=>void){
 useEffect(()=>{const el=ref.current;if(!el)return;if(open&&!el.open){el.showModal();focus?.();}else if(!open&&el.open)el.close();},[open]);
}
/** Web presentation of the shared list window [0x5b5998] for the optical View/Select (OB-HL). The List/Selection menu items
 * are shown as buttons; rows are radio options (touch and exact indices) showing the row text the caller formats (the recovered ordinal 0x590248 for the optical
 * observatory, OB-HL-03) above the
 * decimal values. Search highlights a row without selecting it. Native <dialog> modals; presentation only. */
export default function OpticalHotListWindow({caption,texts,state,rows,onSelect,onSlew,onClose,onSearch,onSearchEdit,onSearchSubmit,onSearchCancel,onDismiss,onPrint,onEdit,onDelete,onUndo,undoEnabled=false,editBlocked=false,editEnabled=true,onSave,saveEnabled=false}:{caption:string;texts:readonly string[];state:WindowState;rows:readonly RadioHotListRow[];onSelect:(i:number)=>void;onSlew:()=>void;onClose:()=>void;onSearch:()=>void;onSearchEdit:(q:string,c:boolean)=>void;onSearchSubmit:(m:RadioHotListSearchMode)=>void;onSearchCancel:()=>void;onDismiss:()=>void;onPrint:()=>void;
 /** Front P: THotListForm1 Edit Selection.../Delete Selection/Undo Edit/Delete (one level). */
 onEdit?:()=>void;onDelete?:()=>void;onUndo?:()=>void;undoEnabled?:boolean;editBlocked?:boolean;
 /** Front R5 review 1 M2: Edit1/Edit2/Delete1 Enabled (Edit Mode, or exercise 0). */editEnabled?:boolean;
 /** Front R5: List › Save (SaveList1); absent, no Save item. */
 onSave?:()=>void;saveEnabled?:boolean}){
 const id=useId(),win=useRef<HTMLDialogElement>(null),find=useRef<HTMLDialogElement>(null),box=useRef<HTMLDialogElement>(null),query=useRef<HTMLInputElement>(null),radios=useRef<(HTMLInputElement|null)[]>([]);
 const found=radioHotListFoundIndex(state.search.found,texts),popup=usePopupMenu();
 useEffect(()=>{if(!state.shown)popup.close();},[state.shown]);// eslint-disable-line react-hooks/exhaustive-deps
 useModal(win,state.shown,()=>radios.current[state.index>=0&&state.index<rows.length?state.index:0]?.focus());
 useModal(find,state.shown&&state.search.dialog!==null,()=>{query.current?.focus();query.current?.select();});
 useModal(box,state.notice!==null);
 useEffect(()=>{if(found!==null&&!state.search.dialog)radios.current[found]?.focus();},[state.search.found]);
 const n=state.notice,boxTitle=n?.kind==='empty'?vireo(OPTICAL_HOT_LIST_EMPTY.emptyCaption):n?.kind==='search-miss'?vireo(L.missCaption):M.noSelectionTitle;
 const boxText=n?.kind==='empty'?vireo(OPTICAL_HOT_LIST_EMPTY.emptyText):n?.kind==='search-miss'?opticalHotListMissText(n.query,vireo):M.noSelection;
 return <>
  <dialog ref={win} className="ob-dialog ob-wide" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} data-testid="ob-hotlist" onCancel={e=>{e.preventDefault();onClose();}}>
   <h2 id={`${id}-title`} className="ob-native">{caption}</h2>
   <p id={`${id}-help`} className="ob-note">{M.help}</p>
   <div className="ob-menu" role="group" aria-label={M.menu}>
    <button type="button" className="secondary-button" data-testid="ob-hotlist-search" onClick={onSearch}>{vireoMenuItem(OV.search)}</button>
    <button type="button" className="secondary-button" data-testid="ob-hotlist-print" onClick={onPrint}>{vireoMenuItem(OV.print)}</button>
    {onSave&&<button type="button" className="secondary-button" data-testid="ob-hotlist-save" disabled={!saveEnabled||editBlocked} onClick={onSave}>{vireo(menuCaptionText(SL.item))}</button>}
    <button type="button" className="primary-button" data-testid="ob-hotlist-slew" onClick={onSlew}>{vireo(menuCaptionText(C.slew))}</button>
    {onEdit&&<><button type="button" className="secondary-button" data-testid="ob-hotlist-edit" disabled={editBlocked||!editEnabled} onClick={onEdit}>{vireo(menuCaptionText(P.edit))}</button>
     <button type="button" className="secondary-button" data-testid="ob-hotlist-delete" disabled={editBlocked||!editEnabled} onClick={onDelete}>{vireo(menuCaptionText(P.delete))}</button>
     <button type="button" className="secondary-button" data-testid="ob-hotlist-undo" disabled={!undoEnabled||editBlocked} onClick={onUndo}>{vireo(menuCaptionText(P.undo))}</button></>}
    <button type="button" className="secondary-button" data-testid="ob-hotlist-close" onClick={onClose}>{vireo(menuCaptionText(C.close))}</button>
   </div>
   {/* THotListForm1 PopupMenu (Front P): right-click or the context-menu key on the list; acts on the current selection. */}
   <div className="ob-list" role="radiogroup" aria-label={M.rows} data-testid="ob-hotlist-rows" onContextMenu={popup.open} onAuxClick={popup.auxClick}>
    {rows.map((row,i)=><label key={row.sourceIndex} className="ob-row" data-testid={`ob-hotlist-row-${i+1}`} data-checked={state.index===i||undefined} data-found={found===i||undefined} onDoubleClick={()=>{onSelect(i);onSlew();}}>
     <input ref={el=>{radios.current[i]=el;}} type="radio" name={`${id}-row`} checked={state.index===i} onChange={()=>onSelect(i)} onClick={()=>onSelect(i)}/>
     <span className="ob-row-text"><span className="ob-row-native" aria-hidden="true" data-testid={`ob-hotlist-native-${i+1}`}>{texts[i]}</span>
      <span className="ob-row-decimal">{M.row(i+1,row.record.id||M.unnamed,row.record.remarks,htlNumberDraft(row.record.ra),htlNumberDraft(row.record.dec))}</span></span>
     {found===i&&<span aria-hidden="true">{M.foundMark}</span>}
    </label>)}
   </div>
   <PopupMenu at={popup.at} label={vireo(P.label)} onClose={popup.close} returnFocus={()=>radios.current[state.index>=0?state.index:0]?.focus()} note={onEdit?PM.hotListEdit.note:PM.hotListPopup.note}
    items={[{key:'slew',label:vireo(C.slew),onSelect:onSlew},{key:'edit',label:vireo(P.editPopup),onSelect:()=>onEdit?.(),disabled:!onEdit||editBlocked||!editEnabled},{key:'delete',label:vireo(P.delete),onSelect:()=>onDelete?.(),disabled:!onDelete||editBlocked||!editEnabled},{key:'undo',label:vireo(P.undo),onSelect:()=>onUndo?.(),disabled:!undoEnabled||editBlocked}]}/>
   <p className="ob-note" role="status" aria-live="polite" data-testid="ob-hotlist-found">{found===null?'':M.found(found+1)}</p>
   <p className="ob-note">{M.adaptation}</p>
   <dialog ref={find} className="ob-dialog" aria-labelledby={`${id}-find`} data-testid="ob-hotlist-find" onCancel={e=>{e.preventDefault();onSearchCancel();}}>
    <h2 id={`${id}-find`} className="ob-native">{vireo(L.caption)}</h2>
    <label className="ob-field"><span>{M.query}</span><input ref={query} type="text" autoComplete="off" spellCheck={false} maxLength={RADIO_HOT_LIST_SEARCH_QUERY_MAX} data-testid="ob-hotlist-query" value={state.search.dialog?.query??''} onChange={e=>onSearchEdit(e.target.value,state.search.dialog?.matchCase??false)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();onSearchSubmit('top');}}}/></label>
    <label className="ob-check"><input type="checkbox" checked={state.search.dialog?.matchCase??false} onChange={e=>onSearchEdit(state.search.dialog?.query??'',e.target.checked)}/>{M.matchCase}</label>
    <div className="ob-actions"><button type="button" className="primary-button" onClick={()=>onSearchSubmit('top')}>{M.top}</button><button type="button" className="secondary-button" onClick={()=>onSearchSubmit('next')}>{M.next}</button><button type="button" className="secondary-button" onClick={onSearchCancel}>{M.cancel}</button></div>
   </dialog>
  </dialog>
  <dialog ref={box} className="ob-dialog ob-box" role="alertdialog" aria-labelledby={`${id}-box-title`} aria-describedby={`${id}-box-text`} data-testid="ob-hotlist-box" onCancel={e=>{e.preventDefault();onDismiss();}}>
   <h2 id={`${id}-box-title`} className="ob-native">{boxTitle}</h2><p id={`${id}-box-text`} className="ob-native">{boxText}</p>
   <div className="ob-actions"><button type="button" className="primary-button" autoFocus onClick={onDismiss}>{vireo(OV.ok)}</button></div>
  </dialog>
 </>;
}
