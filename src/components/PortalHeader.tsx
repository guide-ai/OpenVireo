import{useId,useRef,useState,type KeyboardEvent,type MouseEvent,type ReactNode}from'react';
import ThemeSwitch from'./ThemeSwitch';
import{APP_SHELL_MESSAGES as M}from'./AppShellMessages';

/** App header. On phones (<600px, CSS) the tool groups and theme switch fold behind a "Tools"
 * disclosure button; on wider screens they are always shown and the button is hidden.
 * Escape closes the open menu and returns focus to its button; choosing a route closes it. */
export default function PortalHeader({inert,brand,navLabel,children}:{inert:boolean;brand:ReactNode;navLabel:string;children:ReactNode}){
 const [open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null),panel=useId();
 function onKeyDown(e:KeyboardEvent){if(e.key==='Escape'&&open){e.stopPropagation();setOpen(false);toggle.current?.focus();}}
 function onNavClick(e:MouseEvent){if((e.target as Element).closest('button[data-route]'))setOpen(false);}
 return <header className={open?'portal-header tools-open':'portal-header'} inert={inert} onKeyDown={onKeyDown}>
  <div className="portal-top">{brand}<button ref={toggle} type="button" className="tools-toggle" aria-expanded={open} aria-controls={panel} onClick={()=>setOpen(o=>!o)}>
   <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d={open?'M5 5l10 10M15 5L5 15':'M3 5h14M3 10h14M3 15h14'}/></svg>{M.toolsMenu}</button></div>
  <div className="portal-panel" id={panel}>
   <nav aria-label={navLabel} onClick={onNavClick}>{children}</nav>
   <div className="portal-footer"><ThemeSwitch/></div>
  </div>
 </header>;
}
