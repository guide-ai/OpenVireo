import {useEffect,useRef,useState,type MouseEvent as ReactMouseEvent,type ReactNode} from 'react';
import {menuCaptionText} from '../core/radioControl';
import './polish.css';

export type PopupMenuItem=Readonly<{key:string;label:string;onSelect:()=>void;disabled?:boolean;title?:string}>;
export type PopupAt=Readonly<{x:number;y:number}>;

/** A form's PopupMenu (DFM TPopupMenu) [D items]: opened by a right-click or the keyboard context-menu key (Shift+F10) on its
 * list [W]. As with a Delphi TListBox, the right-click does not move the selection; the items act on the current one. Escape,
 * Tab, a click outside or a choice closes it; focus returns to the list. Fixed position inside the window's top layer. */
export function usePopupMenu(){
 const [at,setAt]=useState<PopupAt|null>(null);
 const open=(e:ReactMouseEvent)=>{e.preventDefault();const r=(e.currentTarget as HTMLElement).getBoundingClientRect();
  // A keyboard-opened menu (no pointer position) opens at the list's top-left corner.
  setAt(e.clientX||e.clientY?{x:e.clientX,y:e.clientY}:{x:r.left+8,y:r.top+8});};
 return {at,open,close:()=>setAt(null)};
}
export default function PopupMenu({at,items,label,onClose,returnFocus,note}:{at:PopupAt|null;items:readonly PopupMenuItem[];label:string;onClose:()=>void;returnFocus?:()=>void;note?:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 const close=()=>{onClose();returnFocus?.();};
 useEffect(()=>{
  if(!at)return;
  ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  const outside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))onClose();};
  document.addEventListener('pointerdown',outside,true);return ()=>document.removeEventListener('pointerdown',outside,true);
 },[at]);// eslint-disable-line react-hooks/exhaustive-deps
 if(!at)return null;
 const left=Math.max(4,Math.min(at.x,window.innerWidth-224)),top=Math.max(4,Math.min(at.y,window.innerHeight-40*items.length-8));
 return <div ref={ref} role="menu" aria-label={label} className="popup-menu" data-testid="popup-menu" style={{left,top}}
  onKeyDown={e=>{
   const buttons=[...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[])],i=buttons.indexOf(document.activeElement as HTMLButtonElement);
   if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();e.stopPropagation();close();}
   else if(e.key==='ArrowDown'){e.preventDefault();buttons[(i+1)%buttons.length]?.focus();}
   else if(e.key==='ArrowUp'){e.preventDefault();buttons[(i-1+buttons.length)%buttons.length]?.focus();}
  }}>
  {items.map(item=><button key={item.key} type="button" role="menuitem" disabled={item.disabled} title={item.title} data-testid={`popup-${item.key}`}
   onClick={()=>{onClose();item.onSelect();}}>{menuCaptionText(item.label)}</button>)}
  {note&&<p className="popup-menu-note">{note}</p>}
 </div>;
}
