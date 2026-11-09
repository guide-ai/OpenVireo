import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {vireo} from '../i18n/vireo';
import CleaHelp,{ViewSwitch} from '../clusters/CleaHelp';
import {fetchBundledClusterHelp} from '../io/bundledClusterHelp';
import {HELP_FILES} from './helpFiles';
import {ABOUT_BOX,HELP_WEBSITES,MAIN_HELP_MENU,QUIT_QUESTION,RADIO_HELP_MENU,REMINDER_CAPTION,REMINDER_SELECT,reminderBoxText} from './mainHelp';
import {HELP_MENU as M} from './HelpMessages';
import {helpTranslationOffered,loadHelpTranslation,type HelpView} from './helpTranslation';
import WebHelpDialog from './WebHelpDialog';
import {helpKeyBlocked} from './helpShortcut';
import {PROJECT_LINKS,PROJECT_REPO_URL,currentPage,newIssueUrl} from './projectLinks';
import '../observatory/field-info.css';
import './help.css';

/** The TAboutBox panel (DFM at file offset 0x1e3174) with the Version label its caller sets: 0x58982c "Version 1.504" (main)
 * or 0x56543c "Version 1.001-32" (radio). The DFM's design-time "Version 0.5" is always overwritten and never shown. */
export function AboutBoxPanel({version,testId='help-about'}:{version:string;
 /** Prefix of the panel's test ids: Help › About... and the site's About page each show one (review closure N2). */testId?:string}){
 return <div className="help-about-lines" data-testid={`${testId}-panel`}>{ABOUT_BOX.lines.slice(0,2).map((l,i)=><p key={i} className={i===0?'help-about-strong':undefined}>{l}</p>)}
  <p data-testid={`${testId}-version`}>{version}</p>{ABOUT_BOX.lines.slice(2).map(l=><p key={l}>{l}</p>)}</div>;
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
/** The Help menu of the main window or of the radio lab (TRadioLab: Topics..., About This Exercise...). On Help and User are
 * hidden by default in VIREO (empty option names) and are not shown. `disabledReason` disables the menu with a typed note (the
 * radio lab's panel is not open).
 * Main window [W] (Front WebHelp, Front Onboarding): VIREO's TEnvironment1 items (Topics..., Websites, About...) describe the
 * Windows program, so the menu holds OpenVireo's own help (Help topics…, WebHelpDialog; also opened by the "?" key anywhere
 * outside a text field or a modal window, unless the visitor turned it off: helpShortcut.ts), the first-visit tour (`onTour`), Websites and the site's About page (`onSiteAbout`, Front REL1, which
 * also shows VIREO's About box). VIREO's main-window help (VIRMnHlp) and About... are not offered (user decision, 2026-11-08). */
export function HelpMenu({kind,disabled=false,disabledReason,onSiteAbout,onTour}:{kind:'main'|'radio';disabled?:boolean;disabledReason?:string;onSiteAbout?:()=>void;onTour?:()=>void}){
 const id=useId(),[menu,setMenu]=useState<Menu>(null),[topics,setTopics]=useState(0),[about,setAbout]=useState(false),[webHelp,setWebHelp]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const C=kind==='main'?MAIN_HELP_MENU:RADIO_HELP_MENU,off=disabled||disabledReason!==undefined;
 useEffect(()=>{if(off)setMenu(null);},[off]);
 useEffect(()=>{
  if(kind!=='main')return;
  const key=(e:KeyboardEvent)=>{if(!helpKeyBlocked(e,trigger.current)){e.preventDefault();setMenu(null);setWebHelp(true);}};
  document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
 },[kind]);
 const escape=(e:React.KeyboardEvent)=>{
  if(e.key!=='Escape')return;
  // Escape in a dialog this menu opened closes only that dialog, never the header's phone Tools drawer around the menu.
  if((e.target as Element).closest('dialog')){e.stopPropagation();return;}
  if(menu){e.preventDefault();e.stopPropagation();setMenu(null);trigger.current?.focus();}
 };
 const caption=vireo(menuCaptionText(C.help));
 return <div className="fi-menu" onKeyDown={escape}>
  <button type="button" ref={trigger} disabled={off} className={kind==='main'?'help-trigger':undefined} aria-label={M.menuName[kind]} aria-describedby={disabledReason?`${id}-off`:undefined} aria-expanded={menu!==null} aria-controls={`${id}-help`} data-testid={`${kind}-help-menu`} onClick={()=>setMenu(m=>m?null:'help')}>
   {kind==='main'?<><span className="help-trigger-icon" aria-hidden="true">{M.shortcutKey}</span><span className="help-trigger-text">{caption}</span></>:caption}</button>
  {disabledReason&&<p id={`${id}-off`} className="fi-note fi-menu-note" data-testid={`${kind}-help-off`}>{disabledReason}</p>}
  {menu&&<div id={`${id}-help`} role="group" aria-label={caption} className="fi-menu-list">
   {kind==='main'&&<>
    <button type="button" data-testid="main-help-web" aria-keyshortcuts={M.shortcutKey} onClick={()=>{setMenu(null);setWebHelp(true);}}>{M.webTopics}<span className="help-menu-key" aria-hidden="true">{M.shortcutKey}</span></button>
    {onTour&&<button type="button" data-testid="main-help-tour" onClick={()=>{setMenu(null);onTour();}}>{M.tour}</button>}
    <button type="button" aria-expanded={menu==='websites'} data-testid="main-help-websites" onClick={()=>setMenu(m=>m==='websites'?'help':'websites')}>{vireo(menuCaptionText(MAIN_HELP_MENU.websites))} ›</button>
    {menu==='websites'&&<div role="group" aria-label={vireo(menuCaptionText(MAIN_HELP_MENU.websites))} className="fi-submenu">
     {HELP_WEBSITES.map(w=>w.web
      ?<a key={w.key} href={w.web} target="_blank" rel="noopener noreferrer" className="fi-menu-link" data-testid={`help-website-${w.key}`} onClick={()=>setMenu(null)}>
        {vireo(menuCaptionText(MAIN_HELP_MENU[w.key]))} <span aria-hidden="true">↗</span><span className="visually-hidden"> {M.newTab}</span></a>
      :<p key={w.key} className="fi-note fi-menu-note" data-testid={`help-website-${w.key}`}><span className="help-menu-off">{vireo(menuCaptionText(MAIN_HELP_MENU[w.key]))}</span> {M.noEquivalent(w.original)}</p>)}
     <p className="fi-note fi-menu-note" data-testid="help-websites-note">{M.websitesNote}</p>
    </div>}
    {onSiteAbout&&<button type="button" data-testid="main-help-site-about" onClick={()=>{setMenu(null);trigger.current?.focus();onSiteAbout();}}>{M.siteAbout}</button>}
    <a href={PROJECT_REPO_URL} target="_blank" rel="noopener noreferrer" className="fi-menu-link" data-testid="main-help-repo" onClick={()=>setMenu(null)}>
     {PROJECT_LINKS.repoMenu} <span aria-hidden="true">↗</span><span className="visually-hidden"> {PROJECT_LINKS.newTab}</span></a>
    <a href={newIssueUrl(currentPage())} target="_blank" rel="noopener noreferrer" className="fi-menu-link" data-testid="main-help-report" onClick={()=>setMenu(null)}>
     {PROJECT_LINKS.reportMenu} <span aria-hidden="true">↗</span><span className="visually-hidden"> {PROJECT_LINKS.newTab}</span></a>
   </>}
   {kind==='radio'&&<>
    <button type="button" data-testid="radio-help-menu-topics" onClick={()=>{setMenu(null);setTopics(n=>n+1);}}>{vireo(menuCaptionText(C.topics))}</button>
    <button type="button" data-testid="radio-help-about" onClick={()=>{setMenu(null);setAbout(true);}}>{vireo(menuCaptionText(C.about))}</button>
   </>}
  </div>}
  {kind==='radio'&&<CleaHelp list={HELP_FILES['PULSRHLP.LST']} openRequest={topics} onReturnFocus={()=>trigger.current?.focus()} testId="radio-help"/>}
  {webHelp&&<WebHelpDialog onClose={()=>{setWebHelp(false);requestAnimationFrame(()=>trigger.current?.focus());}}/>}
  {about&&<AboutDialog version={ABOUT_BOX.radioVersion} onClose={()=>{setAbout(false);requestAnimationFrame(()=>trigger.current?.focus());}}/>}
 </div>;
}

/** File › Exit Observatory (Exit1 → TEnvironment1.FormCloseQuery 0x588b9c → reminder 0x5a0418): VIREO's OK/Cancel box with
 * Reminder.obs. The web is always in the env+0x54c = 3 branch (no Log In / Run Exercise step, docs/CLEA-HELP.md [W]). If the
 * file cannot be read, VIREO falls back to the Yes/No "Are You Sure You Want to Quit This Exercise?" box, as here. A web page
 * cannot close its own tab, so OK or Yes only says that the exercise can now be closed. */
export function ExitObservatoryDialog({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId();
 const [state,setState]=useState<'loading'|'error'|'done'|string>('loading');
 // Front ES-HELP: a Spanish load shows the translation of Reminder.obs (a web adaptation) unless the student asks for the original.
 const offered=helpTranslationOffered(),[original,setOriginal]=useState(false),view:HelpView=offered&&!original?'translation':'original';
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{
  const abort=new AbortController();
  setState(s=>s==='done'?s:'loading');
  (view==='translation'?loadHelpTranslation(HELP_FILES['REMINDER.OBS']):fetchBundledClusterHelp(fetch,abort.signal,HELP_FILES['REMINDER.OBS']))
   .then(b=>{if(!abort.signal.aborted)setState(s=>s==='done'?s:reminderBoxText(b,view==='translation'?vireo(REMINDER_SELECT):REMINDER_SELECT));},e=>{if(!(e instanceof DOMException&&e.name==='AbortError'))setState('error');});
  return ()=>abort.abort();
 },[view]);
 const quit=()=>setState('done');
 return <dialog ref={dialog} className="ob-dialog" role="alertdialog" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-testid="exit-reminder" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`}>{vireo(REMINDER_CAPTION)}</h2>
  {state==='loading'&&<p id={`${id}-d`} role="status">{M.reminderLoading}</p>}
  {state==='error'&&<div id={`${id}-d`}><p role="alert">{M.reminderError} {M.reminderErrorQuestion}</p><p className="help-reminder-text" data-testid="exit-quit-question">{vireo(QUIT_QUESTION)}</p></div>}
  {state==='done'&&<p id={`${id}-d`} role="status" data-testid="exit-reminder-done">{M.exitDone}</p>}
  {state!=='loading'&&state!=='error'&&state!=='done'&&<p id={`${id}-d`} className="help-reminder-text" lang={offered&&view==='original'?'en':undefined} data-testid="exit-reminder-text">{state}</p>}
  <div className="ob-actions">
   {state==='done'?<button type="button" className="primary-button" autoFocus onClick={onClose}>{M.close}</button>
    :state==='error'?<><button type="button" className="primary-button" data-testid="exit-quit-yes" onClick={quit}>{M.yes}</button>
     <button type="button" className="secondary-button" autoFocus data-testid="exit-quit-no" onClick={onClose}>{M.no}</button></>
    :<><button type="button" className="primary-button" disabled={state==='loading'} data-testid="exit-reminder-ok" onClick={quit}>{M.ok}</button>
     <button type="button" className="secondary-button" autoFocus data-testid="exit-reminder-cancel" onClick={onClose}>{M.cancel}</button></>}
  </div>
  {offered&&state!=='done'&&state!=='error'&&<ViewSwitch view={view} onSwitch={()=>setOriginal(o=>!o)} testId="exit-reminder-view"/>}
  <p className="fi-note">{M.exitNote}</p>
 </dialog>;
}
