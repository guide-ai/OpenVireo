import {useEffect,useRef,type ReactNode} from 'react';
import {t} from '../i18n';
import {APP_SHELL_MESSAGES as SHELL} from './AppShellMessages';
import {ROUTE_PAGES,groupLabel,type Route} from './routePages';
import './page-bar.css';

/** Front HEADER [W] (user decision, 2026-11-10): the bar at the top of the content area, on every page. Left, the current page's
 * section and name (the sidebar's own labels, src/components/routePages.ts; from 600 px up); then the investigation backup
 * (InvestigationActions); right, the language selector and Help. It is pinned from 600 px up (below). Below it come
 * the cloud entry (absent from every deployed build) and the investigation's busy, notice and error lines, direct children as on
 * the old card. A named <section> (a region): the sidebar stays the page's one banner, and the bar holds no heading, so each
 * page's h1 is its first heading. The class `investigation-toolbar` is kept as the hook of the specs, the print rule and the
 * script rules (a rename is a separate cleanup). The bar is inert while a host-level modal is open, as the card was.
 * The place repeats the sidebar's own labels, so like them it is shell text (`data-i18n-shell`: checked by tests/i18n/shell.spec.ts,
 * skipped by the translation walks, which skip the sidebar). Pinned (user decision, 2026-11-10, after seeing the bar): from 600 px up it stays at the top of the viewport while the page
 * scrolls (page-bar.css). Its height, written to `--ov-page-bar-height` on <html> by a ResizeObserver (no React render), sets the
 * page's scroll padding, so focus, anchors and scrollIntoView never land under it (WCAG 2.4.11), and the classification cursor
 * read-out's own sticky offset. */
export default function PageBar({view,inert,busy,notice,error,actions,language,help,cloud}:{view:Route;inert:boolean;busy:boolean;notice:string;error:string;
 /** InvestigationActions. */actions:ReactNode;/** The language select, when shown. */language:ReactNode;/** The main Help menu. */help:ReactNode;cloud:ReactNode}){
 const page=ROUTE_PAGES[view],bar=useRef<HTMLElement>(null);
 useEffect(()=>{
  const el=bar.current,root=document.documentElement;
  if(!el||typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(()=>root.style.setProperty('--ov-page-bar-height',`${Math.ceil(el.getBoundingClientRect().height)}px`));
  observer.observe(el);
  return()=>{observer.disconnect();root.style.removeProperty('--ov-page-bar-height');};
 },[]);
 return <section ref={bar} className="page-bar investigation-toolbar" aria-label={SHELL.pageBar.label} inert={inert} data-testid="page-bar">
  <div className="page-bar-row">
   <p className="page-bar-place" data-testid="page-bar-place" data-i18n-shell=""><span className="page-bar-section">{groupLabel(page.group)}</span>{' '}
    <svg className="page-bar-separator" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4.5 3l3 3-3 3"/></svg>{' '}
    <strong className="page-bar-page">{page.label()}</strong></p>
   {actions}
   <div className="page-bar-tools">{language}<div className="page-bar-help" data-testid="page-bar-help">{help}</div></div>
  </div>
  {cloud}
  {busy&&<p role="status">{t('project.busy')}</p>}{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
