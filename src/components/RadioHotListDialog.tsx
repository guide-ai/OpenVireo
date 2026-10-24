import {useEffect,useId,useRef,type KeyboardEvent,type RefObject} from 'react';
import {htlNumberDraft} from '../core/hotList';
import {RADIO_HOT_LIST_FORM_CAPTIONS as C} from '../core/radioAntenna';
import {menuCaptionText} from '../core/radioControl';
import type {RadioHotListRow} from '../core/radioHotList';
import type {RadioAntennaTranslate} from './RadioAntennaMessages';

export type RadioHotListDialogProps=Readonly<{
 /** Projection rows in native RA insertion order. */
 rows:readonly RadioHotListRow[];
 /** The remembered index (+0x588 analogue); out of range means no row is checked. */
 index:number;
 /** A message box is open above the list: the list is inert. */
 blocked:boolean;
 ta:RadioAntennaTranslate;
 onSelect:(index:number)=>void;
 onSlew:()=>void;
 onClose:()=>void;
 /** View/Select: focus goes back there when the list is removed (not when removed by a presentation suppression). */
 returnFocus:RefObject<HTMLButtonElement|null>;
 suppressed:RefObject<boolean>;
 /** The panel's held-key and Tab-trap policies. */
 ignoreHeld:(e:KeyboardEvent<HTMLElement>)=>boolean;
 trap:(e:KeyboardEvent<HTMLElement>,root:HTMLElement|null)=>void;
}>;

/** WEB presentation of the shared list window [0x5b5998] for View/Select (RA-HL-05). Rows are radio options so touch and
 * exact indices work; duplicates are separate options keyed by source index. The form caption and the Slew/Close menu
 * captions are recovered (RADIO_HOT_LIST_FORM_CAPTIONS) and shown as a heading and buttons (WEB-HL-06); the 0x590110 row
 * formatter is not ported, so rows show decimal coordinates. Presentation only: every change goes through the antenna
 * transitions. */
export default function RadioHotListDialog({rows,index,blocked,ta,onSelect,onSlew,onClose,returnFocus,suppressed,ignoreHeld,trap}:RadioHotListDialogProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),radios=useRef<(HTMLInputElement|null)[]>([]),closeButton=useRef<HTMLButtonElement>(null),wasBlocked=useRef(false),lastFocus=useRef<HTMLElement|null>(null);
 const focusRow=()=>{const target=radios.current[index>=0&&index<rows.length?index:0]??closeButton.current;target?.focus();};
 // Shown (or shown again after a coordinate-dialog Cancel): the checked row, or the first one when none is checked. Shown
 // under a pending box, it takes focus when that box closes.
 useEffect(()=>{if(blocked)wasBlocked.current=true;else focusRow();
  const back=returnFocus.current;return ()=>{if(!suppressed.current)back?.focus();};},[returnFocus,suppressed]);// mount-time only
 // A box over the list (no selection, a clock limit) makes it inert, which drops the focus of the control that chose
 // it; when the box closes that control (or the row) takes focus again.
 useEffect(()=>{
  if(blocked){wasBlocked.current=true;return;}
  if(!wasBlocked.current)return;wasBlocked.current=false;
  if(root.current?.contains(document.activeElement))return;
  const el=lastFocus.current;if(el?.isConnected&&root.current?.contains(el))el.focus();else focusRow();
 },[blocked]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(blocked||ignoreHeld(e))return;
  if(e.key==='Escape'){e.preventDefault();onClose();return;}
  trap(e,root.current);
 };
 const inRange=index>=0&&index<rows.length;
 return <div className="antenna-backdrop">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} className="antenna-dialog antenna-hotlist" data-testid="antenna-hotlist-dialog" onKeyDown={onKeyDown} onFocus={e=>{lastFocus.current=e.target;}} inert={blocked||undefined}>
   <h3 id={`${id}-title`} className="radio-control-native">{C.form}</h3>
   <p id={`${id}-help`} className="radio-control-note">{ta('antenna.hotList.dialog.help')}</p>
   <p className="radio-control-note" data-testid="antenna-hotlist-units">{ta('antenna.hotList.dialog.units')}</p>
   <span id={`${id}-rows`} className="antenna-label">{ta('antenna.hotList.dialog.rows')}</span>
   <div role="radiogroup" aria-labelledby={`${id}-rows`} className="antenna-hotlist-rows" data-testid="antenna-hotlist-rows">
    {rows.map((row,i)=><label key={row.sourceIndex} className="antenna-hotlist-row" data-testid={`antenna-hotlist-row-${i+1}`} data-source-index={row.sourceIndex} data-checked={index===i||undefined}
     onDoubleClick={()=>{onSelect(i);onSlew();}}>
     <input ref={el=>{radios.current[i]=el;}} type="radio" name={`${id}-row`} value={i} checked={index===i} onChange={()=>onSelect(i)}/>
     <span>{ta('antenna.hotList.row',{position:i+1,id:row.record.id||ta('antenna.hotList.unnamed'),remarks:row.record.remarks,ra:htlNumberDraft(row.record.ra),dec:htlNumberDraft(row.record.dec)})}</span>
    </label>)}
   </div>
   {rows.length===0&&<p className="radio-control-note" data-testid="antenna-hotlist-empty">{ta('antenna.hotList.dialog.empty')}</p>}
   {!inRange&&rows.length>0&&<p className="radio-control-note" data-testid="antenna-hotlist-no-selection">{ta('antenna.hotList.dialog.noSelection',{position:index+1})}</p>}
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="antenna-hotlist-select" onClick={onSlew}>{menuCaptionText(C.slew)}</button>
    <button ref={closeButton} type="button" className="secondary-button" data-testid="antenna-hotlist-close" onClick={onClose}>{menuCaptionText(C.close)}</button>
   </div>
  </div>
 </div>;
}
