import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from './core/radioControl';
import {canPanLeft,canPanRight,moveZoomMaximum,moveZoomMinimum,resetZoomDraft,zoomDraft,zoomDraftWavelengths,type EngineWindow,type ZoomDraft} from './core/spectrumEngineView';
import {fixed,t} from './i18n';
import {ENGINE_VIEW as M,ENGINE_VIEW_LITERALS as V} from './SpectrumEngineMessages';
import {vireo} from './i18n/vireo';
import './spectrum-engine.css';

/** TSpecDsplyRngDlg "Set Wavelength Range" (ZoomBtnClick 0x58451c, modal): two sliders in 100 Å steps from lo, Reset,
 * OK / Cancel. Edits show one decimal (FloatToStrF ffFixed 18,1). */
function ZoomDialog({window:w,onApply,onClose}:{window:EngineWindow;onApply:(d:ZoomDraft)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId(),[draft,setDraft]=useState(()=>zoomDraft(w));
 useEffect(()=>{dialog.current?.showModal();},[]);
 const r=zoomDraftWavelengths(w,draft);
 return <dialog ref={dialog} className="ob-dialog engine-zoom" aria-labelledby={`${id}-t`} data-testid="engine-zoom-dialog" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`}>{vireo(V.dialogCaption)}</h2>
  <label className="engine-zoom-row"><span>{vireo(V.minimum)}</span>
   <input type="range" min={0} max={draft.minLimit} step={1} value={draft.minPosition} data-testid="engine-zoom-min" onChange={e=>setDraft(d=>moveZoomMinimum(d,Number(e.target.value)))}/>
   <output data-testid="engine-zoom-min-value">{fixed(r.minimum,1)}</output></label>
  <label className="engine-zoom-row"><span>{vireo(V.maximum)}</span>
   <input type="range" min={1} max={draft.maxLimit} step={1} value={draft.maxPosition} data-testid="engine-zoom-max" onChange={e=>setDraft(d=>moveZoomMaximum(d,Number(e.target.value)))}/>
   <output data-testid="engine-zoom-max-value">{fixed(r.maximum,1)}</output></label>
  <div className="ob-actions">
   <button type="button" className="secondary-button" title={vireo(V.resetHint)} data-testid="engine-zoom-reset" onClick={()=>setDraft(resetZoomDraft)}>{menuCaptionText(vireo(V.reset))}</button>
   <button type="button" className="primary-button" data-testid="engine-zoom-ok" onClick={()=>onApply(draft)}>{menuCaptionText(vireo(V.ok))}</button>
   <button type="button" className="secondary-button" autoFocus onClick={onClose}>{menuCaptionText(vireo(V.cancel))}</button>
  </div>
 </dialog>;
}

export type EngineReadoutView=Readonly<{wavelength:number;relativeIntensity:number}>|null;
/** TSpectrumEngine Zoom, ◀ / ▶ and the Wavelength / Rel. Intensity displays (docs/SPECTRUM-ENGINE-VIEW.md). */
export default function SpectrumEngineControls({window:w,wide,readout,nearest,onZoom,onPan,onNearest}:{window:EngineWindow;wide:boolean;readout:EngineReadoutView;
 nearest:string|null;onZoom:(d:ZoomDraft)=>void;onPan:(direction:'left'|'right')=>void;onNearest:()=>void}){
 const [zooming,setZooming]=useState(false),zoomButton=useRef<HTMLButtonElement>(null);
 const close=()=>{setZooming(false);requestAnimationFrame(()=>zoomButton.current?.focus());};
 return <div className="engine-controls" data-testid="engine-controls">
  <div className="engine-buttons">
   <button type="button" className="plot-button" disabled={wide||!canPanLeft(w)} aria-label={M.panLeft} data-testid="engine-pan-left" onClick={()=>onPan('left')}>◀</button>
   <button type="button" ref={zoomButton} className="plot-button" disabled={wide} data-testid="engine-zoom" onClick={()=>setZooming(true)}>{menuCaptionText(vireo(V.zoom))}</button>
   <button type="button" className="plot-button" disabled={wide||!canPanRight(w)} aria-label={M.panRight} data-testid="engine-pan-right" onClick={()=>onPan('right')}>▶</button>
   <span className="engine-window" data-testid="engine-window">{M.window(fixed(w.min,1),fixed(w.max,1))}</span>
  </div>
  <div className="engine-readout" role="group" aria-label={vireo(V.readoutTitle)} aria-live="polite">
   {readout?<><span>{vireo(V.wavelength)} <strong data-testid="engine-readout-wavelength">{fixed(readout.wavelength,1)}</strong></span>
    <span>{vireo(V.intensity)} <strong data-testid="engine-readout-intensity">{fixed(readout.relativeIntensity,3)}</strong></span>
    <button type="button" className="plot-button" data-testid="engine-nearest" onClick={onNearest}>{M.nearest}</button></>
    :<span className="engine-readout-empty">{M.readoutEmpty}</span>}
  </div>
  {nearest&&<p role="status" className="engine-nearest" data-testid="engine-nearest-result">{nearest}</p>}
  <details className="research-notes"><summary>{t('notes.summary')}</summary><p className="observatory-note">{wide?M.fullViewNote:M.note}</p></details>
  {zooming&&<ZoomDialog window={w} onClose={close} onApply={d=>{onZoom(d);close();}}/>}
 </div>;
}
