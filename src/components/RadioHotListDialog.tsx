import {useEffect,useId,useMemo,useRef,type KeyboardEvent,type RefObject} from 'react';
import {htlNumberDraft} from '../core/hotList';
import {RADIO_HOT_LIST_FORM_CAPTIONS as C} from '../core/radioAntenna';
import {menuCaptionText} from '../core/radioControl';
import type {RadioHotListRow} from '../core/radioHotList';
import {formatRadioHotListRow} from '../core/radioHotListFormat';
import {radioHotListFoundIndex,type RadioHotListFound} from '../core/radioHotListSearch';
import type {RadioAntennaTranslate} from './RadioAntennaMessages';

export type RadioHotListDialogProps=Readonly<{
 /** Projection rows in native RA insertion order. */
 rows:readonly RadioHotListRow[];
 /** The remembered index (+0x588 analogue); out of range means no row is checked. */
 index:number;
 /** The Search highlight (WEB-HL-11); shown only while it still names the same row text at that index. */
 found:RadioHotListFound|null;
 /** A message box or the Find dialog is open above the list: the list is inert. */
 blocked:boolean;
 /** Search owns the block (the Find dialog or its not-found box): focus returns to Search when it ends without a prior focus. */
 searchBlock:boolean;
 ta:RadioAntennaTranslate;
 onSelect:(index:number)=>void;
 onSlew:()=>void;
 onClose:()=>void;
 onSearch:()=>void;
 /** The Search button, where focus returns after the Find dialog closes. */
 searchRef:RefObject<HTMLButtonElement|null>;
 /** View/Select: focus goes back there when the list is removed (not when removed by a presentation suppression). */
 returnFocus:RefObject<HTMLButtonElement|null>;
 suppressed:RefObject<boolean>;
 /** The panel's held-key and Tab-trap policies. */
 ignoreHeld:(e:KeyboardEvent<HTMLElement>)=>boolean;
 trap:(e:KeyboardEvent<HTMLElement>,root:HTMLElement|null)=>void;
}>;

/** WEB presentation of the shared list window [0x5b5998] for View/Select (RA-HL-05). Rows are radio options so touch and
 * exact indices work; duplicates are separate options keyed by source index. The form caption and the Slew/Close menu
 * captions are recovered (RADIO_HOT_LIST_FORM_CAPTIONS) and shown as a heading and buttons (WEB-HL-06). Each row shows
 * the recovered 0x590110 text (RA-HL-08, aria-hidden, React text) above the position and imported decimal values, which
 * stay the option's accessible name. Search (RA-HL-09, OpenVireo button label) opens the Find dialog; a hit is shown as a
 * highlight that is focused but not checked (WEB-HL-11): a click, tap, Space, arrow key or double-click selects. Presentation
 * only: every change goes through the antenna transitions. */
export default function RadioHotListDialog({rows,index,found,blocked,searchBlock,ta,onSelect,onSlew,onClose,onSearch,searchRef,returnFocus,suppressed,ignoreHeld,trap}:RadioHotListDialogProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),radios=useRef<(HTMLInputElement|null)[]>([]),closeButton=useRef<HTMLButtonElement>(null),wasBlocked=useRef(false),lastFocus=useRef<HTMLElement|null>(null);
 // Whether Search owned the current block at any point; remembered until the block ends.
 const searchOwned=useRef(false);
 const focusRow=()=>{const target=radios.current[index>=0&&index<rows.length?index:0]??closeButton.current;target?.focus();};
 // Shown (or shown again after a coordinate-dialog Cancel): the checked row, or the first one when none is checked. Shown
 // under a pending box, it takes focus when that box closes.
 useEffect(()=>{if(blocked)wasBlocked.current=true;else focusRow();
  const back=returnFocus.current;return ()=>{if(!suppressed.current)back?.focus();};},[returnFocus,suppressed]);// mount-time only
 // A box over the list (no selection, a clock limit) makes it inert, which drops the focus of the control that chose
 // it; when the box closes that control (or the row) takes focus again. A list remounted behind a Search block (browser
 // history re-presents the Find draft or the not-found box) has no prior focus, so Search takes it.
 useEffect(()=>{
  if(blocked){wasBlocked.current=true;if(searchBlock)searchOwned.current=true;return;}
  const owned=searchOwned.current;searchOwned.current=false;
  if(!wasBlocked.current)return;wasBlocked.current=false;
  if(root.current?.contains(document.activeElement))return;
  const el=lastFocus.current,search=searchRef.current;
  if(el?.isConnected&&root.current?.contains(el))el.focus();else if(owned&&search)search.focus();else focusRow();
 },[blocked,searchBlock]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(blocked||ignoreHeld(e))return;
  if(e.key==='Escape'){e.preventDefault();onClose();return;}
  trap(e,root.current);
 };
 const inRange=index>=0&&index<rows.length;
 const texts=useMemo(()=>rows.map(row=>formatRadioHotListRow(row.record)),[rows]);
 const foundIndex=radioHotListFoundIndex(found,texts);
 // A new hit takes focus on its row without checking it (the visible ItemIndex analogue); focus() scrolls it into view.
 // Declared after the [blocked] effect so it wins over the focus restored when the Find dialog closes. Identity is the
 // core's "new hit" signal: a frozen highlight keeps it across Cancel, an empty submit, a miss and unrelated transitions.
 // Mounted behind a block, the retained highlight was already shown before the remount, so it is not a new hit.
 const focusedFound=useRef<RadioHotListFound|null>(blocked?found:null);
 // Browsers fire no click or change for Space on an already checked radio, so its release confirms that row explicitly
 // (HS-15/WEB-HL-11; the KeyUp store analogue, no native event parity claimed); this also ends a highlight on another row.
 // Armed only by a fresh keydown on the same checked row, so a held key acts once and a release begun elsewhere does
 // nothing; blur disarms. Only onSelect: never a Slew.
 const spaceArmed=useRef<number|null>(null);
 useEffect(()=>{
  if(blocked||!found||foundIndex===null||focusedFound.current===found)return;
  focusedFound.current=found;radios.current[foundIndex]?.focus();
 },[found,foundIndex,blocked]);
 return <div className="antenna-backdrop">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} className="antenna-dialog antenna-hotlist" data-testid="antenna-hotlist-dialog" onKeyDown={onKeyDown} onFocus={e=>{lastFocus.current=e.target;}} inert={blocked||undefined}>
   <h3 id={`${id}-title`} className="radio-control-native">{C.form}</h3>
   <p id={`${id}-help`} className="radio-control-note">{ta('antenna.hotList.dialog.help')}</p>
   <p className="radio-control-note" data-testid="antenna-hotlist-units">{ta('antenna.hotList.dialog.units')}</p>
   <span id={`${id}-rows`} className="antenna-label">{ta('antenna.hotList.dialog.rows')}</span>
   <div role="radiogroup" aria-labelledby={`${id}-rows`} className="antenna-hotlist-rows" data-testid="antenna-hotlist-rows">
    {rows.map((row,i)=><label key={row.sourceIndex} className="antenna-hotlist-row" data-testid={`antenna-hotlist-row-${i+1}`} data-source-index={row.sourceIndex} data-checked={index===i||undefined}
     data-found={foundIndex===i||undefined} onDoubleClick={()=>{onSelect(i);onSlew();}}>
     <input ref={el=>{radios.current[i]=el;}} type="radio" name={`${id}-row`} value={i} checked={index===i} aria-describedby={foundIndex===i?`${id}-found`:undefined}
      onChange={()=>onSelect(i)} onClick={()=>onSelect(i)} onBlur={()=>{spaceArmed.current=null;}}
      onKeyDown={e=>{if(e.key===' '&&!e.repeat)spaceArmed.current=index===i?i:null;}}
      onKeyUp={e=>{if(e.key!==' ')return;const armed=spaceArmed.current===i&&index===i;spaceArmed.current=null;if(armed)onSelect(i);}}/>
     <span className="antenna-hotlist-row-text">
      <span className="antenna-hotlist-native" aria-hidden="true" data-testid={`antenna-hotlist-native-${i+1}`}>{texts[i]}</span>
      <span className="antenna-hotlist-decimal" data-testid={`antenna-hotlist-decimal-${i+1}`}>{ta('antenna.hotList.row',{position:i+1,id:row.record.id||ta('antenna.hotList.unnamed'),remarks:row.record.remarks,ra:htlNumberDraft(row.record.ra),dec:htlNumberDraft(row.record.dec)})}</span>
     </span>
     {foundIndex===i&&<span className="antenna-hotlist-found-mark" aria-hidden="true">{ta('antenna.hotList.foundMark')}</span>}
    </label>)}
   </div>
   {rows.length===0&&<p className="radio-control-note" data-testid="antenna-hotlist-empty">{ta('antenna.hotList.dialog.empty')}</p>}
   {!inRange&&rows.length>0&&<p className="radio-control-note" data-testid="antenna-hotlist-no-selection">{ta('antenna.hotList.dialog.noSelection',{position:index+1})}</p>}
   <p id={`${id}-found`} className="radio-control-status" role="status" aria-live="polite" data-testid="antenna-hotlist-found">
    {foundIndex===null?'':ta(foundIndex===index?'antenna.hotList.foundSelected':'antenna.hotList.found',{position:foundIndex+1})}
   </p>
   <div className="button-row">
    <button ref={searchRef} type="button" className="secondary-button" data-testid="antenna-hotlist-search-open" onClick={onSearch}>{ta('antenna.hotList.search.open')}</button>
    <button type="button" className="primary-button" data-testid="antenna-hotlist-select" onClick={onSlew}>{menuCaptionText(C.slew)}</button>
    <button ref={closeButton} type="button" className="secondary-button" data-testid="antenna-hotlist-close" onClick={onClose}>{menuCaptionText(C.close)}</button>
   </div>
  </div>
 </div>;
}
