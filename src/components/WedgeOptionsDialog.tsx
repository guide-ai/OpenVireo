import{useEffect,useRef,type KeyboardEvent}from'react';
import type{WedgeGridType,WedgeOptions,WedgePointSize,WedgePointStyle}from'../core/wedgePlot';
import type{WedgeNativeCaptions}from'./WedgeMessages';

/** TWdgPltOptsForm1 (FormShow 0x58060c, OKBtnClick 0x58078c): radio groups edit a
 * draft; OK commits and Cancel/Escape discard. Auto Plot stays disabled here.
 * Captions come from the presentation catalog (English defaults = DFM captions). */
export type WedgeOptionsDialogProps=Readonly<{draft:WedgeOptions;idPrefix:string;captions:WedgeNativeCaptions;autoPlotNote:string;onChange:(change:Partial<WedgeOptions>)=>void;onOk:()=>void;onCancel:()=>void}>;
const SIZES:readonly WedgePointSize[]=[1,2,3,4,5];
/** Sequential tab stops as the browser walks them: enabled inputs/buttons (a disabled
 * fieldset disables its contents too), with one stop per radio group — its checked radio,
 * or its first enabled radio when none is checked. */
function tabStops(box:HTMLElement):HTMLElement[]{
 const all=[...box.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button')].filter(el=>!el.matches(':disabled'));
 return all.filter(el=>{
  if(!(el instanceof HTMLInputElement)||el.type!=='radio'||!el.name)return true;
  const group=all.filter((r):r is HTMLInputElement=>r instanceof HTMLInputElement&&r.type==='radio'&&r.name===el.name);
  return el.checked||(!group.some(r=>r.checked)&&group[0]===el);
 });
}
export default function WedgeOptionsDialog({draft,idPrefix,captions:C,autoPlotNote,onChange,onOk,onCancel}:WedgeOptionsDialogProps){
 const first=useRef<HTMLInputElement>(null),box=useRef<HTMLDivElement>(null);
 useEffect(()=>{first.current?.focus();},[]);
 const key=(e:KeyboardEvent)=>{
  if(e.key==='Escape'){e.preventDefault();onCancel();return;}
  if(e.key!=='Tab'||!box.current)return;
  const stops=tabStops(box.current);
  if(stops.length===0)return;const a=stops[0],b=stops[stops.length-1];
  if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}
 };
 const id=(s:string)=>idPrefix+'opt-'+s;
 return <div className="wedge-modal-backdrop">
  <div ref={box} className="wedge-modal" role="dialog" aria-modal="true" aria-labelledby={id('title')} onKeyDown={key} data-testid="wedge-options">
   <h3 id={id('title')}>{C.optionsCaption}</h3>
   <div className="wedge-options-grid">
    <fieldset><legend>{C.gridType}</legend>
     {C.gridItems.map((label,i)=><label key={i} className="wedge-radio"><input ref={i===draft.grid?first:undefined} type="radio" name={id('grid')} checked={draft.grid===i} onChange={()=>onChange({grid:i as WedgeGridType})} data-testid={'wedge-grid-'+i}/>{label}</label>)}
    </fieldset>
    <fieldset><legend>{C.plottedPoints}</legend>
     <fieldset className="wedge-inner"><legend>{C.size}</legend>
      <div className="wedge-radio-row">{SIZES.map(s=><label key={s} className="wedge-radio"><input type="radio" name={id('size')} checked={draft.pointSize===s} onChange={()=>onChange({pointSize:s})} data-testid={'wedge-size-'+s}/>{s}</label>)}</div>
     </fieldset>
     <fieldset className="wedge-inner"><legend>{C.style}</legend>
      <div className="wedge-radio-row">{C.styleItems.map((label,i)=><label key={i} className="wedge-radio"><input type="radio" name={id('style')} checked={draft.pointStyle===i} onChange={()=>onChange({pointStyle:i as WedgePointStyle})} data-testid={'wedge-style-'+i}/>{label}</label>)}</div>
     </fieldset>
    </fieldset>
    <fieldset disabled aria-describedby={id('auto-note')}><legend>{C.autoPlotGroup}</legend>
     <label className="wedge-radio"><input type="checkbox" checked={false} readOnly/>{C.autoPlotOn}</label>
     <p id={id('auto-note')} className="wedge-note">{autoPlotNote}</p>
    </fieldset>
   </div>
   <div className="wedge-actions">
    <button type="button" className="primary-button" onClick={onOk} data-testid="wedge-options-ok">{C.ok}</button>
    <button type="button" onClick={onCancel} data-testid="wedge-options-cancel">{C.cancel}</button>
   </div>
  </div>
 </div>;
}
