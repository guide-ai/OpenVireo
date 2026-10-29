import {useId,useState,type KeyboardEvent} from 'react';
import CleaHelp from '../clusters/CleaHelp';
import {HELP_FILES} from '../help/helpFiles';
import {MULTISPEC_MESSAGES as N} from '../core/multiSpecFormat';
import {t} from '../i18n';

const L=N.list;
/** TMSpecListForm1 ("Spectra From Multi-channel Spectrometer", plan §2.5): the list box (items "(n)" padded to 7 characters, the
 * name only with Show Object ID, "*" once saved), File ▸ Save All / Clear All / Display ▸ Open All / Close All / Exit, the popup
 * Show Spectrum / Close Spectrum (here buttons), Scan / Stop and the Scan Rate spin (1–5 s). Double click shows a spectrum. */
export default function MultiSpecList({items,selected,onSelected,onShow,onHide,onOpenAll,onCloseAll,scanning,rate,onRate,onScan,onStopScan,canSaveAll,onSaveAll,onClearAll,onExit,busy}:Readonly<{
 items:readonly string[];selected:number|null;onSelected:(i:number)=>void;onShow:()=>void;onHide:()=>void;onOpenAll:()=>void;onCloseAll:()=>void;
 scanning:boolean;rate:number;onRate:(r:number)=>void;onScan:()=>void;onStopScan:()=>void;canSaveAll:boolean;onSaveAll:()=>void;onClearAll:()=>void;onExit:()=>void;busy:boolean}>){
 const id=useId(),[rateText,setRateText]=useState(String(rate)),any=items.length>0,file=!scanning&&!busy;
 function key(e:KeyboardEvent<HTMLUListElement>){
  if(!any)return;const i=selected??-1;
  if(e.key==='ArrowDown'){e.preventDefault();onSelected(Math.min(items.length-1,i+1));}
  else if(e.key==='ArrowUp'){e.preventDefault();onSelected(Math.max(0,i-1));}
  else if(e.key==='Enter'){e.preventDefault();if(selected!==null)onShow();}
 }
 return <section className="ms-list" aria-labelledby={`${id}-t`} data-testid="ms-list">
  <h3 id={`${id}-t`} className="ob-native">{L.caption}</h3>
  <div className="ms-menu" role="group" aria-label={L.file}>
   <button type="button" className="secondary-button" disabled={!file||!canSaveAll} onClick={onSaveAll} data-testid="ms-save-all">{L.saveAll}</button>
   <button type="button" className="secondary-button" disabled={!file||!any} onClick={onClearAll} data-testid="ms-clear-all">{L.clearAll}</button>
   <button type="button" className="secondary-button" disabled={!file||!any} onClick={onOpenAll} data-testid="ms-open-all">{L.openAll}</button>
   <button type="button" className="secondary-button" disabled={!file||!any} onClick={onCloseAll} data-testid="ms-close-all">{L.closeAll}</button>
   <button type="button" className="secondary-button" disabled={!file} onClick={onExit} data-testid="ms-list-exit">{L.exit}</button>
  </div>
  {/* TMSpecListForm1 Help1: Help1.Enabled := Length(+0xb0c) > 0, empty by default (0x525a56; docs/CLEA-HELP.md). */}<CleaHelp list={HELP_FILES['SPLSTHLP.LST']} label={L.help} disabledReason={t('multispec.helpEmpty')} testId="ms-list-help"/>
  <div className="ms-list-body">
   <ul className="ms-items" role="listbox" tabIndex={0} aria-label={L.caption} aria-activedescendant={selected!==null?`${id}-i${selected}`:undefined} onKeyDown={key} data-testid="ms-items">
    {items.map((text,i)=><li key={i} id={`${id}-i${i}`} role="option" aria-selected={selected===i} data-testid={`ms-item-${i}`} onClick={()=>onSelected(i)} onDoubleClick={()=>{onSelected(i);onShow();}}>{text}</li>)}
   </ul>
   <div className="ms-list-side">
    <div className="ms-menu" role="group" aria-label={t('multispec.itemActions')}>
     <button type="button" className="secondary-button" disabled={scanning||!any} onClick={onShow} data-testid="ms-show">{L.show}</button>
     <button type="button" className="secondary-button" disabled={scanning||!any} onClick={onHide} data-testid="ms-hide">{L.hide}</button>
    </div>
    <div className="ms-menu">
     <button type="button" className="secondary-button" disabled={scanning||!any||busy} onClick={onScan} data-testid="ms-scan">{L.scan}</button>
     <button type="button" className="secondary-button" disabled={!scanning} onClick={onStopScan} data-testid="ms-scan-stop">{L.stop}</button>
    </div>
    <label className="ms-rate">{L.rate}<input type="number" min={1} max={5} step={1} value={rateText} disabled={scanning} data-testid="ms-rate"
     onChange={e=>{setRateText(e.target.value);const v=Number(e.target.value);if(Number.isInteger(v)&&v>=1&&v<=5)onRate(v);}} onBlur={()=>setRateText(String(rate))}/></label>
    <p className="observatory-note">{N.savedLegend}</p>
   </div>
  </div>
 </section>;
}
