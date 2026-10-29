import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import CleaHelp from '../clusters/CleaHelp';
import {fetchBundledClusterHelp} from '../io/bundledClusterHelp';
import {HELP_FILES} from './helpFiles';
import {ABOUT_BOX,HELP_WEBSITES,MAIN_HELP_MENU,QUIT_QUESTION,RADIO_HELP_MENU,REMINDER_CAPTION,reminderBoxText} from './mainHelp';
import {HELP_MENU_EN as M} from './HelpMessages';
import '../observatory/field-info.css';
import './help.css';

/** The TAboutBox panel (DFM at file offset 0x1e3174) with the Version label its caller sets: 0x58982c "Version 1.504" (main)
 * or 0x56543c "Version 1.001-32" (radio). The DFM's design-time "Version 0.5" is always overwritten and never shown. */
export function AboutBoxPanel({version}:{version:string}){
 return <div className="help-about-lines" data-testid="help-about-panel">{ABOUT_BOX.lines.slice(0,2).map((l,i)=><p key={i} className={i===0?'help-about-strong':undefined}>{l}</p>)}
  <p data-testid="help-about-version">{version}</p>{ABOUT_BOX.lines.slice(2).map(l=><p key={l}>{l}</p>)}</div>;
}

/** TAboutBox, modal (About... 0x58982c / About This Exercise... 0x56543c). */
function AboutDialog({version,onClose}:{version:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="ob-dialog" aria-labelledby={`${id}-t`} data-testid="help-about" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`}>{ABOUT_BOX.caption}</h2>
  <AboutBoxPanel version={version}/>
  <div className="ob-actions"><button type="button" className="primary-button" autoFocus onClick={onClose}>{ABOUT_BOX.ok}</button></div>
 </dialog>;
}

type Menu='help'|'websites'|null;
/** The Help menu of the main window (TEnvironment1: Topics..., Websites, About...) or of the radio lab (TRadioLab: Topics...,
 * About This Exercise...). On Help and User are hidden by default in VIREO (empty option names) and are not shown.
 * `disabledReason` disables the menu with a typed note (the radio lab's panel is not open). */
export function HelpMenu({kind,disabled=false,disabledReason}:{kind:'main'|'radio';disabled?:boolean;disabledReason?:string}){
 const id=useId(),[menu,setMenu]=useState<Menu>(null),[topics,setTopics]=useState(0),[about,setAbout]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const C=kind==='main'?MAIN_HELP_MENU:RADIO_HELP_MENU,off=disabled||disabledReason!==undefined;
 useEffect(()=>{if(off)setMenu(null);},[off]);
 const escape=(e:React.KeyboardEvent)=>{if(e.key==='Escape'&&menu){e.preventDefault();e.stopPropagation();setMenu(null);trigger.current?.focus();}};
 return <div className="fi-menu" onKeyDown={escape}>
  <button type="button" ref={trigger} disabled={off} aria-label={M.menuName[kind]} aria-describedby={disabledReason?`${id}-off`:undefined} aria-expanded={menu!==null} aria-controls={`${id}-help`} data-testid={`${kind}-help-menu`} onClick={()=>setMenu(m=>m?null:'help')}>{menuCaptionText(C.help)}</button>
  {disabledReason&&<p id={`${id}-off`} className="fi-note fi-menu-note" data-testid={`${kind}-help-off`}>{disabledReason}</p>}
  {menu&&<div id={`${id}-help`} role="group" aria-label={menuCaptionText(C.help)} className="fi-menu-list">
   <button type="button" data-testid={`${kind}-help-menu-topics`} onClick={()=>{setMenu(null);setTopics(n=>n+1);}}>{menuCaptionText(C.topics)}</button>
   {kind==='main'&&<>
    <button type="button" aria-expanded={menu==='websites'} data-testid="main-help-websites" onClick={()=>setMenu(m=>m==='websites'?'help':'websites')}>{menuCaptionText(MAIN_HELP_MENU.websites)} ›</button>
    {menu==='websites'&&<div role="group" aria-label={menuCaptionText(MAIN_HELP_MENU.websites)} className="fi-submenu">
     {HELP_WEBSITES.map(w=>w.web
      ?<a key={w.key} href={w.web} target="_blank" rel="noopener noreferrer" className="fi-menu-link" data-testid={`help-website-${w.key}`} onClick={()=>setMenu(null)}>
        {menuCaptionText(MAIN_HELP_MENU[w.key])} <span aria-hidden="true">↗</span><span className="visually-hidden"> {M.newTab}</span></a>
      :<p key={w.key} className="fi-note fi-menu-note" data-testid={`help-website-${w.key}`}><span className="help-menu-off">{menuCaptionText(MAIN_HELP_MENU[w.key])}</span> {M.noEquivalent(w.original)}</p>)}
     <p className="fi-note fi-menu-note" data-testid="help-websites-note">{M.websitesNote}</p>
    </div>}
   </>}
   <button type="button" data-testid={`${kind}-help-about`} onClick={()=>{setMenu(null);setAbout(true);}}>{menuCaptionText(C.about)}</button>
  </div>}
  <CleaHelp list={HELP_FILES[kind==='main'?'VIRMNHLP.LST':'PULSRHLP.LST']} openRequest={topics} onReturnFocus={()=>trigger.current?.focus()} testId={`${kind}-help`}/>
  {about&&<AboutDialog version={kind==='main'?ABOUT_BOX.mainVersion:ABOUT_BOX.radioVersion} onClose={()=>{setAbout(false);requestAnimationFrame(()=>trigger.current?.focus());}}/>}
 </div>;
}

/** File › Exit Observatory (Exit1 → TEnvironment1.FormCloseQuery 0x588b9c → reminder 0x5a0418): VIREO's OK/Cancel box with
 * Reminder.obs. The web is always in the env+0x54c = 3 branch (no Log In / Run Exercise step, docs/CLEA-HELP.md [W]). If the
 * file cannot be read, VIREO falls back to the Yes/No "Are You Sure You Want to Quit This Exercise?" box, as here. A web page
 * cannot close its own tab, so OK or Yes only says that the exercise can now be closed. */
export function ExitObservatoryDialog({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId();
 const [state,setState]=useState<'loading'|'error'|'done'|string>('loading');
 useEffect(()=>{dialog.current?.showModal();
  const abort=new AbortController();
  fetchBundledClusterHelp(fetch,abort.signal,HELP_FILES['REMINDER.OBS']).then(b=>setState(reminderBoxText(b)),e=>{if(!(e instanceof DOMException&&e.name==='AbortError'))setState('error');});
  return ()=>abort.abort();
 },[]);
 const quit=()=>setState('done');
 return <dialog ref={dialog} className="ob-dialog" role="alertdialog" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-testid="exit-reminder" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`}>{REMINDER_CAPTION}</h2>
  {state==='loading'&&<p id={`${id}-d`} role="status">{M.reminderLoading}</p>}
  {state==='error'&&<div id={`${id}-d`}><p role="alert">{M.reminderError} {M.reminderErrorQuestion}</p><p className="help-reminder-text" data-testid="exit-quit-question">{QUIT_QUESTION}</p></div>}
  {state==='done'&&<p id={`${id}-d`} role="status" data-testid="exit-reminder-done">{M.exitDone}</p>}
  {state!=='loading'&&state!=='error'&&state!=='done'&&<p id={`${id}-d`} className="help-reminder-text" data-testid="exit-reminder-text">{state}</p>}
  <div className="ob-actions">
   {state==='done'?<button type="button" className="primary-button" autoFocus onClick={onClose}>{M.close}</button>
    :state==='error'?<><button type="button" className="primary-button" data-testid="exit-quit-yes" onClick={quit}>{M.yes}</button>
     <button type="button" className="secondary-button" autoFocus data-testid="exit-quit-no" onClick={onClose}>{M.no}</button></>
    :<><button type="button" className="primary-button" disabled={state==='loading'} data-testid="exit-reminder-ok" onClick={quit}>{M.ok}</button>
     <button type="button" className="secondary-button" autoFocus data-testid="exit-reminder-cancel" onClick={onClose}>{M.cancel}</button></>}
  </div>
  <p className="fi-note">{M.exitNote}</p>
 </dialog>;
}
