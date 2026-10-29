import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from './core/radioControl';
import './spectrum-engine.css';
import {defaultRangeDraft,formatRangeWavelength,moveRangeMaximum,moveRangeMinimum,rangeDraft,rangeFromDraft,RANGE_MAX_POSITIONS,RANGE_MIN_POSITIONS,SPECTRAL_RANGE_LITERALS as L,type SpectralRange} from './core/spectralRange';

/** VIREO's OK/Cancel box before changing the range of an unsaved spectrum (0x510fc8). */
function ClearWarning({onOk,onCancel}:{onOk:()=>void;onCancel:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="ob-dialog" role="alertdialog" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-testid="spectral-range-warning" onCancel={e=>{e.preventDefault();onCancel();}}>
  <h2 id={`${id}-t`}>{L.warningCaption}</h2><p id={`${id}-d`}>{L.warning}</p>
  <div className="ob-actions"><button type="button" className="primary-button" data-testid="spectral-range-warning-ok" onClick={onOk}>{menuCaptionText(L.ok)}</button><button type="button" className="secondary-button" autoFocus onClick={onCancel}>{menuCaptionText(L.cancel)}</button></div>
 </dialog>;
}

/** TSpecRangeDlg "Spectrometer Wavelength Range" (Front S, S1): two sliders in 100 Å steps from 3500 Å, Default, OK / Cancel.
 * `unsaved`: the current exposure has counts, so VIREO's warning comes first. Applies on OK only [W]. */
export default function SpectralRangeDialog({range,unsaved,onApply,onClose}:{range:SpectralRange;unsaved:boolean;onApply:(r:SpectralRange)=>void;onClose:()=>void}){
 const [warned,setWarned]=useState(!unsaved);
 const dialog=useRef<HTMLDialogElement>(null),id=useId(),[draft,setDraft]=useState(()=>rangeDraft(range));
 useEffect(()=>{if(warned)dialog.current?.showModal();},[warned]);
 if(!warned)return <ClearWarning onOk={()=>setWarned(true)} onCancel={onClose}/>;
 const r=rangeFromDraft(draft);
 return <dialog ref={dialog} className="ob-dialog spectral-range-dialog" aria-labelledby={`${id}-t`} data-testid="spectral-range-dialog" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`}>{L.caption}</h2>
  <label className="engine-zoom-row"><span>{L.minimum}</span>
   <input type="range" min={RANGE_MIN_POSITIONS.lowest} max={RANGE_MIN_POSITIONS.highest} step={1} value={draft.minPosition} data-testid="spectral-range-min" onChange={e=>setDraft(d=>moveRangeMinimum(d,Number(e.target.value)))}/>
   <output data-testid="spectral-range-min-value">{formatRangeWavelength(r.minimum)}</output></label>
  <label className="engine-zoom-row"><span>{L.maximum}</span>
   <input type="range" min={RANGE_MAX_POSITIONS.lowest} max={RANGE_MAX_POSITIONS.highest} step={1} value={draft.maxPosition} data-testid="spectral-range-max" onChange={e=>setDraft(d=>moveRangeMaximum(d,Number(e.target.value)))}/>
   <output data-testid="spectral-range-max-value">{formatRangeWavelength(r.maximum)}</output></label>
  <div className="ob-actions">
   <button type="button" className="secondary-button" title={L.defaultHint} data-testid="spectral-range-default" onClick={()=>setDraft(defaultRangeDraft())}>{menuCaptionText(L.default)}</button>
   <button type="button" className="primary-button" data-testid="spectral-range-ok" onClick={()=>onApply(r)}>{menuCaptionText(L.ok)}</button>
   <button type="button" className="secondary-button" autoFocus onClick={onClose}>{menuCaptionText(L.cancel)}</button>
  </div>
 </dialog>;
}
