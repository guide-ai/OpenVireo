import {useEffect,useId,useRef} from 'react';
import type {ScopeBox} from '../core/scopeAccess';
import {t} from '../i18n';
import './observatory-dialogs.css';

/** Front T5: one of Request Time's or the allotment's Application.MessageBox calls (core/scopeAccess.ts), with VIREO's caption,
 * text and buttons: OK, or OK / Cancel for the award (0x31). Escape answers Cancel (IDCANCEL), as the Windows box does. */
export default function ScopeAccessBox({box,opener,onAnswer}:{box:ScopeBox;/** The control focused when the box was queued. */opener:HTMLElement|null;onAnswer:(ok:boolean)=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),ok=useRef<HTMLButtonElement>(null);
 // Review 1 L4: focus goes back to the control that was focused when the box was queued (the Request button, an instrument's Start),
 // or, when that control is gone or disabled by the answer (a granted request turns its item off), to the Optical telescope
 // heading. The passive cleanup runs after the answer's commit (so a disabled item is already disabled) and before the next box's
 // mount effect, which then takes focus itself; no timer, so a faked page clock cannot delay it.
 useEffect(()=>{const el=ref.current;
  if(el&&!el.open){el.showModal();ok.current?.focus();}
  return ()=>{if(el?.open)el.close();{const now=document.activeElement;if(now&&now!==document.body&&now.isConnected&&!el?.contains(now))return;
   const usable=(e:HTMLElement|null):e is HTMLElement=>!!e&&e.isConnected&&!e.matches(':disabled')&&!e.closest('dialog:not([open]),[hidden],[inert]');
   const target=usable(opener)?opener:document.getElementById('optical-heading');if(usable(target))target.focus();}};},[]);
 return <dialog ref={ref} className="ob-dialog ob-box ob-pre-line" role="alertdialog" aria-labelledby={`${id}-c`} aria-describedby={`${id}-t`} data-testid="scope-box" data-kind={box.kind} onCancel={e=>{e.preventDefault();onAnswer(false);}}>
  <h2 id={`${id}-c`} className="ob-native" data-testid="scope-box-caption">{box.caption}</h2>
  <p id={`${id}-t`} className="ob-native" data-testid="scope-box-text">{box.text.replace(/\r\n/g,'\n')}</p>
  {box.kind==='allotment-used'&&<p className="ob-note" data-testid="scope-box-note">{t('scopeAccess.allotmentNote')}</p>}
  <div className="ob-actions"><button type="button" ref={ok} className="primary-button" data-testid="scope-box-ok" onClick={()=>onAnswer(true)}>{t('scopeAccess.ok')}</button>
   {box.buttons==='ok-cancel'&&<button type="button" className="secondary-button" data-testid="scope-box-cancel" onClick={()=>onAnswer(false)}>{t('scopeAccess.cancel')}</button>}</div>
 </dialog>;
}
