import {useState} from 'react';
import SpectralRangeDialog from './SpectralRangeDialog';
import {SPECTRAL_RANGE_EN as SR} from './SpectralRangeMessages';
import {SPECTRAL_RANGE_LITERALS,type SpectralRange} from './core/spectralRange';
import {menuCaptionText} from './core/radioControl';

/** Front S2: the spectrometer's File › Preferences › Spectral Range… on a route (TSpectrometer.SpectralRange1Click 0x510fc8):
 * the current range, the opener and VIREO's dialog. `unsaved`: the route's exposure has counts (the recovered warning first). */
export default function SpectralRangeRow({range,disabled,unsaved,testId,note,onApply}:{range:SpectralRange;disabled:boolean;unsaved:boolean;testId:string;note:string;onApply:(r:SpectralRange)=>void}){
 const [open,setOpen]=useState(false);
 return <div className="spectral-range-row"><p data-testid={testId}>{SR.current(range.minimum.toFixed(1),range.maximum.toFixed(1))}</p>
  <button type="button" className="secondary-button" disabled={disabled} data-testid={`${testId}-open`} onClick={()=>setOpen(true)}>{menuCaptionText(SPECTRAL_RANGE_LITERALS.menu)}</button>
  <p className="observatory-note">{note}</p>
  {open&&<SpectralRangeDialog range={range} unsaved={unsaved} onApply={r=>{setOpen(false);onApply(r);}} onClose={()=>setOpen(false)}/>}
 </div>;
}
