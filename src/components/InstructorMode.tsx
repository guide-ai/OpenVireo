import {useEffect,useId,useRef,type RefObject} from 'react';
import {t} from '../i18n';

/** Front T1 (docs/OPTICAL-OPTIONS.md, core/instructorMode.ts): the web instructor switch, the web form of VIREO's
 * Demonstration Mode gate (0x587c6a) with no password [W]. The header item opens a confirmation; while the mode is on, a banner
 * with Leave shows on every route. Nothing is sent; only Demonstration Mode (Front T2, set in the options) is kept in this
 * browser. */
export function InstructorModeMenuItem({on,onRequest,buttonRef}:{on:boolean;onRequest:()=>void;buttonRef?:RefObject<HTMLButtonElement|null>}){
 return <button ref={buttonRef} type="button" className="secondary-button instructor-mode-item" data-testid="instructor-mode-open" disabled={on} aria-haspopup="dialog"
  onClick={onRequest}>{t(on?'instructorMode.menuOn':'instructorMode.menu')}</button>;
}

/** The confirmation: what the mode is, that it is not a lock, that it shows no answers and that it lasts for the page only.
 * Escape or Cancel answers No. The native dialog is closed before it unmounts, so focus returns to the header item; after On
 * the page moves it to the banner's Leave (review 1 M1). */
export function InstructorModeConfirm({onAnswer}:{onAnswer:(on:boolean)=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();cancel.current?.focus();}},[]);
 const answer=(on:boolean)=>{ref.current?.close();onAnswer(on);};
 return <dialog ref={ref} className="ob-dialog instructor-mode-confirm" aria-labelledby={`${id}-title`} aria-describedby={`${id}-what ${id}-lock`} data-testid="instructor-mode-confirm"
  onCancel={e=>{e.preventDefault();answer(false);}}>
  <h2 id={`${id}-title`}>{t('instructorMode.confirm.title')}</h2>
  <p id={`${id}-what`}>{t('instructorMode.confirm.what')}</p>
  <p id={`${id}-lock`} data-testid="instructor-mode-not-a-lock"><strong>{t('instructorMode.confirm.lock')}</strong></p>
  <p>{t('instructorMode.confirm.answers')}</p>
  <p>{t('instructorMode.confirm.session')}</p>
  <div className="ob-actions">
   <button type="button" className="primary-button" data-testid="instructor-mode-confirm-on" onClick={()=>answer(true)}>{t('instructorMode.confirm.on')}</button>
   <button ref={cancel} type="button" className="secondary-button" data-testid="instructor-mode-confirm-cancel" onClick={()=>answer(false)}>{t('instructorMode.confirm.cancel')}</button>
  </div>
 </dialog>;
}

/** Shown while instructor mode is on, on every route. Front T2: with Demonstration Mode on in this browser, one more line says
 * that every page load opens it for anyone using the browser. */
export function InstructorModeBanner({onLeave,inert,leaveRef,demonstrationMode=false}:{onLeave:()=>void;inert:boolean;leaveRef?:RefObject<HTMLButtonElement|null>;demonstrationMode?:boolean}){
 const id=useId();
 return <section className="instructor-mode-banner" aria-labelledby={`${id}-label`} data-testid="instructor-mode-banner" inert={inert||undefined}>
  <p role="status"><strong id={`${id}-label`}>{t('instructorMode.banner.label')}</strong><span>{t('instructorMode.banner.text')}</span></p>
  <button ref={leaveRef} type="button" className="secondary-button" data-testid="instructor-mode-leave" aria-describedby={`${id}-note`} onClick={onLeave}>{t('instructorMode.banner.leave')}</button>
  <small id={`${id}-note`}>{t('instructorMode.banner.leaveNote')}</small>
  {demonstrationMode&&<small data-testid="instructor-mode-demonstration">{t('demonstrationMode.banner')}</small>}
 </section>;
}
