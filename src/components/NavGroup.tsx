import {useEffect,useState,type ReactNode} from 'react';

/** Remembered open/closed state of the header's sections, per browser (a per-viewer convenience; never part of saved work). */
export const NAV_SECTIONS_KEY='openvireo.nav-sections.v1';
/** Browsers driven by automation (navigator.webdriver: test runners, crawlers) get the site without its first-visit aids: every
 * section starts open and the tour never starts by itself. The onboarding tests turn this off to check what a visitor sees. */
export function automatedBrowser():boolean{return typeof navigator!=='undefined'&&navigator.webdriver===true;}
function readSections():Record<string,unknown>{
 try{const v:unknown=JSON.parse(localStorage.getItem(NAV_SECTIONS_KEY)??'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};}catch{return {};}
}
function writeSection(id:string,open:boolean){
 try{localStorage.setItem(NAV_SECTIONS_KEY,JSON.stringify({...readSections(),[id]:open}));}catch{/* storage unavailable: the choice lasts for this page only */}
}

/** One header section (Front Onboarding [W]): its name is a disclosure button that opens or closes its pages. A section starts
 * open when the visitor left it open, when it holds the current page, or when `defaultOpen` (Exercise guides); otherwise closed,
 * so the sidebar stays short. Moving to a page of a closed section opens it. */
export default function NavGroup({id,label,routes=[],view,defaultOpen=false,title,children}:{id:string;label:string;
 /** The routes whose pages this section holds (aliases such as Results Editors hold none). */routes?:readonly string[];view?:string;
 defaultOpen?:boolean;title?:string;children:ReactNode}){
 const current=view!==undefined&&routes.includes(view);
 const [open,setOpen]=useState(()=>{
  if(automatedBrowser())return true;
  const stored=readSections()[id];
  return current||(typeof stored==='boolean'?stored:defaultOpen);
 });
 useEffect(()=>{if(current)setOpen(true);},[current]);
 const toggle=()=>{const next=!open;setOpen(next);writeSection(id,next);};
 return <div className="nav-group" data-nav-group={id} role="group" aria-labelledby={`nav-group-${id}`} title={title}>
  <button type="button" className="nav-group-toggle" id={`nav-group-${id}`} aria-expanded={open} aria-controls={`nav-group-${id}-items`} onClick={toggle}>
   <span className="nav-group-label">{label}</span>
   <svg className="nav-group-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M3 4.5l3 3 3-3"/></svg>
  </button>
  <div className="nav-group-items" id={`nav-group-${id}-items`} hidden={!open}>{children}</div>
 </div>;
}
