import{useEffect,useId,useRef,useState,type KeyboardEvent,type MouseEvent,type ReactNode}from'react';
import ThemeSwitch from'./ThemeSwitch';
import{APP_SHELL_MESSAGES as M}from'./AppShellMessages';

const PHONE_QUERY='(max-width: 599.98px)';

/** App header: the site's sidebar (the page's one banner). On phones (<600px, CSS) the tool groups and theme switch fold behind a
 * "Menu" disclosure button; on wider screens they are always shown and the button is hidden.
 * Escape closes the open menu and returns focus to its button. The menu also closes whenever
 * the current view or the URL hash changes (header tools, guide steps, history) and when the
 * window widens past the phone breakpoint, so it never reopens unexpectedly. Front HEADER (user decision, 2026-11-10): Help and the
 * language selector moved to the page bar at the top of the content area (PageBar.tsx); the sidebar keeps the brand, the
 * navigation and its footer. `instructor` is Front T1's "Instructor mode…" item, reachable from every route as well. `links` are
 * the GitHub source code and Report a problem buttons (ProjectLinks.tsx). */
/** Front LAUNCH-2: Skip to content moves focus past the sidebar and the page bar to the shown page's content: its `<main>` (each
 * page keeps one mounted per visited route; the shown one is the one with a box), at the page's own focus target, the route heading
 * that takes programmatic focus, when there is one. Focus only: no hash, so the route never changes. */
function skipToContent(){
 const main=[...document.querySelectorAll<HTMLElement>('main')].find(m=>m.getClientRects().length>0);if(!main)return;
 const heading=[...main.querySelectorAll<HTMLElement>('h1[tabindex="-1"]')].find(h=>h.getClientRects().length>0);
 if(heading){heading.focus();return;}
 if(!main.hasAttribute('tabindex'))main.tabIndex=-1;
 main.focus();
}
export default function PortalHeader({inert,view,brand,navLabel,instructor,links,originals,children}:{inert:boolean;view:string;brand:ReactNode;navLabel:string;instructor?:ReactNode;links?:ReactNode;
 /** Front ES1/HEADER: the "View original (English)" option for VIREO's own texts (src/components/LanguageChoice.tsx), when shown. */originals?:ReactNode;children:ReactNode}){
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
  <button type="button" className="skip-link" data-testid="skip-to-content" onClick={skipToContent}>{M.skipToContent}</button>
  <div className="portal-top"><div className="portal-brand-block">{brand}</div><button ref={toggle} type="button" className="tools-toggle" aria-expanded={open} aria-controls={panel} onClick={()=>setOpen(o=>!o)}>
   <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d={open?'M5 5l10 10M15 5L5 15':'M3 5h14M3 10h14M3 15h14'}/></svg>{M.toolsMenu}</button></div>
  <div className="portal-panel" id={panel}>
   <nav aria-label={navLabel} onClick={onNavClick}>{children}</nav>
   <div className="portal-footer">{links}{instructor}<ThemeSwitch/>{originals}</div>
  </div>
 </header>;
}
