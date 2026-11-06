import {useEffect,useId,useRef} from 'react';
import type {ScopeBox} from '../core/scopeAccess';
import {t} from '../i18n';
import './observatory-dialogs.css';

/** Front T5: one of Request Time's or the allotment's Application.MessageBox calls (core/scopeAccess.ts), with VIREO's caption,
 * text and buttons: OK, or OK / Cancel for the award (0x31). Escape answers Cancel (IDCANCEL), as the Windows box does. */
export default function ScopeAccessBox({box,onAnswer}:{box:ScopeBox;onAnswer:(ok:boolean)=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),ok=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();ok.current?.focus();}return ()=>{if(el?.open)el.close();};},[]);
 return <dialog ref={ref} className="ob-dialog ob-box ob-pre-line" role="alertdialog" aria-labelledby={`${id}-c`} aria-describedby={`${id}-t`} data-testid="scope-box" data-kind={box.kind} onCancel={e=>{e.preventDefault();onAnswer(false);}}>
  <h2 id={`${id}-c`} className="ob-native" data-testid="scope-box-caption">{box.caption}</h2>
  <p id={`${id}-t`} className="ob-native" data-testid="scope-box-text">{box.text.replace(/\r\n/g,'\n')}</p>
  {box.kind==='allotment-used'&&<p className="ob-note" data-testid="scope-box-note">{t('scopeAccess.allotmentNote')}</p>}
  <div className="ob-actions"><button type="button" ref={ok} className="primary-button" data-testid="scope-box-ok" onClick={()=>onAnswer(true)}>{t('scopeAccess.ok')}</button>
   {box.buttons==='ok-cancel'&&<button type="button" className="secondary-button" data-testid="scope-box-cancel" onClick={()=>onAnswer(false)}>{t('scopeAccess.cancel')}</button>}</div>
 </dialog>;
}
