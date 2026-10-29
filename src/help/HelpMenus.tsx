import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import CleaHelp from '../clusters/CleaHelp';
import {fetchBundledClusterHelp} from '../io/bundledClusterHelp';
import {HELP_FILES} from './helpFiles';
import {ABOUT_BOX,HELP_WEBSITES,MAIN_HELP_MENU,RADIO_HELP_MENU,REMINDER_CAPTION,reminderBoxText} from './mainHelp';
import {HELP_MENU_EN as M} from './HelpMessages';
import '../observatory/field-info.css';
import './help.css';

/** TAboutBox, modal (About... 0x58982c / About This Exercise... 0x56543c). */
function AboutDialog({version,onClose}:{version:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="ob-dialog" aria-labelledby={`${id}-t`} data-testid="help-about" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`}>{ABOUT_BOX.caption}</h2>
  <div className="help-about-lines">{ABOUT_BOX.lines.slice(0,2).map((l,i)=><p key={i} className={i===0?'help-about-strong':undefined}>{l}</p>)}
   <p data-testid="help-about-version">{version}</p>{ABOUT_BOX.lines.slice(2).map(l=><p key={l}>{l}</p>)}</div>
  <div className="ob-actions"><button type="button" className="primary-button" autoFocus onClick={onClose}>{ABOUT_BOX.ok}</button></div>
 </dialog>;
}

type Menu='help'|'websites'|null;
/** The Help menu of the main window (TEnvironment1: Topics..., Websites, About...) or of the radio lab (TRadioLab: Topics...,
 * About This Exercise...). On Help and User are hidden by default in VIREO (empty option names) and are not shown. */
export function HelpMenu({kind,disabled=false}:{kind:'main'|'radio';disabled?:boolean}){
 const id=useId(),[menu,setMenu]=useState<Menu>(null),[topics,setTopics]=useState(0),[about,setAbout]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const C=kind==='main'?MAIN_HELP_MENU:RADIO_HELP_MENU;
 useEffect(()=>{if(disabled)setMenu(null);},[disabled]);
 const escape=(e:React.KeyboardEvent)=>{if(e.key==='Escape'&&menu){e.stopPropagation();setMenu(null);trigger.current?.focus();}};
 return <div className="fi-menu" onKeyDown={escape}>
  <button type="button" ref={trigger} disabled={disabled} aria-expanded={menu!==null} aria-controls={`${id}-help`} data-testid={`${kind}-help-menu`} onClick={()=>setMenu(m=>m?null:'help')}>{menuCaptionText(C.help)}</button>
  {menu&&<div id={`${id}-help`} role="group" aria-label={menuCaptionText(C.help)} className="fi-menu-list">
   <button type="button" data-testid={`${kind}-help-topics`} onClick={()=>{setMenu(null);setTopics(n=>n+1);}}>{menuCaptionText(C.topics)}</button>
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
 * Reminder.obs. A web page cannot close its own tab, so OK only says that the exercise can now be closed. */
export function ExitObservatoryDialog({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId();
 const [state,setState]=useState<'loading'|'error'|'done'|string>('loading');
 useEffect(()=>{dialog.current?.showModal();
  const abort=new AbortController();
  fetchBundledClusterHelp(fetch,abort.signal,HELP_FILES['REMINDER.OBS']).then(b=>setState(reminderBoxText(b)),e=>{if(!(e instanceof DOMException&&e.name==='AbortError'))setState('error');});
  return ()=>abort.abort();
 },[]);
 return <dialog ref={dialog} className="ob-dialog" role="alertdialog" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-testid="exit-reminder" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`}>{REMINDER_CAPTION}</h2>
  {state==='loading'&&<p id={`${id}-d`} role="status">{M.reminderLoading}</p>}
  {state==='error'&&<p id={`${id}-d`} role="alert">{M.reminderError}</p>}
  {state==='done'&&<p id={`${id}-d`} role="status" data-testid="exit-reminder-done">{M.exitDone}</p>}
  {state!=='loading'&&state!=='error'&&state!=='done'&&<p id={`${id}-d`} className="help-reminder-text" data-testid="exit-reminder-text">{state}</p>}
  <div className="ob-actions">
   {state==='done'||state==='error'?<button type="button" className="primary-button" autoFocus onClick={onClose}>{M.close}</button>
    :<><button type="button" className="primary-button" disabled={state==='loading'} data-testid="exit-reminder-ok" onClick={()=>setState('done')}>{M.ok}</button>
     <button type="button" className="secondary-button" autoFocus data-testid="exit-reminder-cancel" onClick={onClose}>{M.cancel}</button></>}
  </div>
  <p className="fi-note">{M.exitNote}</p>
 </dialog>;
}
