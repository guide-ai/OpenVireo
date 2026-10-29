import {useEffect,useRef} from 'react';
import {TERMINATE_SLEW_LITERALS as L,POLISH_MESSAGES as PM} from './PolishMessages';

/** OB-SC-02 (0x5393f2..0x5394f8): MB_YESNO|MB_ICONQUESTION "Terminate Current Slew?" / "Slew Suspended". Yes (6) ends the
 * slew; No resumes it. The coordinates dialog is not opened in either case. */
export default function TerminateSlewBox({onYes,onNo}:{onYes:()=>void;onNo:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),yes=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();yes.current?.focus();}},[]);
 return <dialog ref={ref} className="ob-dialog ob-box" role="alertdialog" aria-label={L.caption} data-testid="terminate-slew-box" onCancel={e=>{e.preventDefault();onNo();}}>
  <h2 className="ob-native">{L.caption}</h2><p className="ob-native">{L.text}</p>
  <p className="observatory-note">{PM.terminateSlew.note}</p>
  <div className="ob-actions"><button type="button" ref={yes} className="primary-button" data-testid="terminate-slew-yes" onClick={onYes}>{L.yes}</button>
   <button type="button" className="secondary-button" data-testid="terminate-slew-no" onClick={onNo}>{L.no}</button></div>
 </dialog>;
}
