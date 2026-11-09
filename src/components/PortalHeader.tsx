import{useEffect,useId,useRef,useState,type KeyboardEvent,type MouseEvent,type ReactNode}from'react';
import ThemeSwitch from'./ThemeSwitch';
import{APP_SHELL_MESSAGES as M}from'./AppShellMessages';

const PHONE_QUERY='(max-width: 599.98px)';

/** App header. On phones (<600px, CSS) the tool groups and theme switch fold behind a "Tools"
 * disclosure button; on wider screens they are always shown and the button is hidden.
 * Escape closes the open menu and returns focus to its button. The menu also closes whenever
 * the current view or the URL hash changes (header tools, guide steps, history) and when the
 * window widens past the phone breakpoint, so it never reopens unexpectedly. `help` is the main window's Help menu (VIREO's
 * TEnvironment1 menu bar, reachable from every route; docs/CLEA-HELP.md). Front Onboarding [W]: it sits in the top row beside the
 * brand on every layout (also on phones, outside the Tools panel, and pinned at the top of the wide sidebar), so it is always
 * visible. `instructor` is Front T1's "Instructor mode…" item,
 * reachable from every route as well. `links` are the GitHub source code and Report a problem buttons (ProjectLinks.tsx). */
export default function PortalHeader({inert,view,brand,navLabel,help,instructor,links,language,children}:{inert:boolean;view:string;brand:ReactNode;navLabel:string;help?:ReactNode;instructor?:ReactNode;links?:ReactNode;
 /** Front ES1: the language selector (src/components/LanguageChoice.tsx), when it is shown. */language?:ReactNode;children:ReactNode}){
 const [open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null),panel=useId();
 useEffect(()=>{setOpen(false);},[view]);
 useEffect(()=>{
  const close=()=>setOpen(false);
  const phone=window.matchMedia(PHONE_QUERY),onWidth=(e:MediaQueryListEvent)=>{if(!e.matches)close();};
  window.addEventListener('hashchange',close);phone.addEventListener('change',onWidth);
  return()=>{window.removeEventListener('hashchange',close);phone.removeEventListener('change',onWidth);};
 },[]);
 function onKeyDown(e:KeyboardEvent){if(e.key==='Escape'&&open){e.stopPropagation();setOpen(false);toggle.current?.focus();}}
 function onNavClick(e:MouseEvent){if((e.target as Element).closest('button[data-route]'))setOpen(false);}
 return <header className={open?'portal-header tools-open':'portal-header'} inert={inert} onKeyDown={onKeyDown}>
  <div className="portal-top"><div className="portal-brand-block">{brand}</div>{help&&<div className="portal-help" data-testid="portal-help">{help}</div>}<button ref={toggle} type="button" className="tools-toggle" aria-expanded={open} aria-controls={panel} onClick={()=>setOpen(o=>!o)}>
   <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d={open?'M5 5l10 10M15 5L5 15':'M3 5h14M3 10h14M3 15h14'}/></svg>{M.toolsMenu}</button></div>
  <div className="portal-panel" id={panel}>
   <nav aria-label={navLabel} onClick={onNavClick}>{children}</nav>
   <div className="portal-footer">{links}{instructor}<ThemeSwitch/>{language}</div>
  </div>
 </header>;
}
