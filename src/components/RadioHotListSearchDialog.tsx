import {useEffect,useId,useRef,type KeyboardEvent,type RefObject} from 'react';
import {RADIO_HOT_LIST_SEARCH_LITERALS as L,RADIO_HOT_LIST_SEARCH_QUERY_MAX,type RadioHotListSearchDraft,type RadioHotListSearchMode} from '../core/radioHotListSearch';
import type {RadioAntennaTranslate} from './RadioAntennaMessages';

export type RadioHotListSearchDialogProps=Readonly<{
 draft:RadioHotListSearchDraft;
 /** A message box is open above the dialog: the dialog is inert. */
 blocked:boolean;
 ta:RadioAntennaTranslate;
 onQuery:(query:string)=>void;
 onMatchCase:(matchCase:boolean)=>void;
 onSubmit:(mode:RadioHotListSearchMode)=>void;
 onCancel:()=>void;
 /** The list's Search button: focus goes back there when the dialog is removed (not when removed by a suppression). */
 returnFocus:RefObject<HTMLButtonElement|null>;
 suppressed:RefObject<boolean>;
 /** The panel's held-key and Tab-trap policies. */
 ignoreHeld:(e:KeyboardEvent<HTMLElement>)=>boolean;
 trap:(e:KeyboardEvent<HTMLElement>,root:HTMLElement|null)=>void;
}>;

/** WEB presentation of the shared Find dialog TGetSrchStrDlg (RA-HL-09) for the hot-list Search, above the list window.
 * The title is the caption Search1Click sets (0x590fe4); the field, check box and button labels are OpenVireo wording
 * (the TGetSrchStrDlg DFM labels are not in this increment's evidence). Activate 0x492aa4 selects the edit text: the field
 * takes focus with its text selected, also when presented again after a suppression or once a box over it closes.
 * WEB-HL-10: Enter in the field chooses Search from top and Escape Cancel; repeated keys are ignored. Presentation only:
 * every change goes through the antenna transitions. */
export default function RadioHotListSearchDialog({draft,blocked,ta,onQuery,onMatchCase,onSubmit,onCancel,returnFocus,suppressed,ignoreHeld,trap}:RadioHotListSearchDialogProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),field=useRef<HTMLInputElement>(null),pendingFocus=useRef(false);
 const focusField=()=>{field.current?.focus();field.current?.select();};
 useEffect(()=>{if(blocked)pendingFocus.current=true;else focusField();
  const back=returnFocus.current;return ()=>{if(!suppressed.current)back?.focus();};},[returnFocus,suppressed]);// mount-time `blocked` only
 // A box over the dialog (a clock horizon-limit box) makes it inert; when it closes the field (or the control that had
 // focus) takes focus again.
 const lastFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(blocked)return;
  if(pendingFocus.current){pendingFocus.current=false;focusField();return;}
  const el=lastFocus.current;
  if(el?.isConnected&&root.current?.contains(el)&&!root.current.contains(document.activeElement))el.focus();
 },[blocked]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(blocked||ignoreHeld(e))return;
  if(e.key==='Escape'){e.preventDefault();onCancel();return;}
  if(e.key==='Enter'&&e.target===field.current&&!e.nativeEvent.isComposing){e.preventDefault();onSubmit('top');return;}
  trap(e,root.current);
 };
 return <div className="antenna-backdrop">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} className="antenna-dialog antenna-hotlist-search" data-testid="antenna-hotlist-search"
   onKeyDown={onKeyDown} onFocus={e=>{lastFocus.current=e.target;}} inert={blocked||undefined}>
   <h3 id={`${id}-title`} className="radio-control-native">{L.caption}</h3>
   <p id={`${id}-help`} className="radio-control-note">{ta('antenna.hotList.search.help')}</p>
   <label className="antenna-field">
    <span>{ta('antenna.hotList.search.query')}</span>
    <input ref={field} type="text" autoComplete="off" spellCheck={false} maxLength={RADIO_HOT_LIST_SEARCH_QUERY_MAX} data-testid="antenna-hotlist-search-query"
     value={draft.query} onChange={e=>onQuery(e.target.value)}/>
   </label>
   <label className="radio-control-check antenna-hotlist-search-case">
    <input type="checkbox" data-testid="antenna-hotlist-search-case" checked={draft.matchCase} onChange={e=>onMatchCase(e.target.checked)}/>
    {ta('antenna.hotList.search.matchCase')}
   </label>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="antenna-hotlist-search-top" onClick={()=>onSubmit('top')}>{ta('antenna.hotList.search.top')}</button>
    <button type="button" className="secondary-button" data-testid="antenna-hotlist-search-next" onClick={()=>onSubmit('next')}>{ta('antenna.hotList.search.next')}</button>
    <button type="button" className="secondary-button" data-testid="antenna-hotlist-search-cancel" onClick={onCancel}>{ta('antenna.hotList.search.cancel')}</button>
   </div>
  </div>
 </div>;
}
