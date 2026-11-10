import {useEffect,useLayoutEffect,useRef,useState,type MouseEvent as ReactMouseEvent,type ReactNode} from 'react';
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
 // Front WebKit QA (cause 2): WebKit treats a right-button auxclick on a <label> like a click and activates its control (for
 // example a list row's radio), which takes focus out of the menu just opened. Hosts cancel it.
 const auxClick=(e:ReactMouseEvent)=>{if(e.button===2)e.preventDefault();};
 return {at,open,close:()=>setAt(null),auxClick};
}
const FIRST_PLACEMENT=Object.freeze({dx:0,dy:0});
export default function PopupMenu({at,items,label,onClose,returnFocus,note}:{at:PopupAt|null;items:readonly PopupMenuItem[];label:string;onClose:()=>void;returnFocus?:()=>void;note?:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 const close=()=>{onClose();returnFocus?.();};
 useEffect(()=>{
  if(!at)return;
  ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  const outside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))onClose();};
  document.addEventListener('pointerdown',outside,true);return ()=>document.removeEventListener('pointerdown',outside,true);
 },[at]);// eslint-disable-line react-hooks/exhaustive-deps
 // Front SC3: the first placement assumes a 224 px menu and 40 px per item; longer labels (Russian) wrap and taller lines
 // (Japanese, Hindi) grow it, so the rendered box is measured before paint and moved back inside the viewport (4 px from the
 // edge) only when it leaves it. A menu that fits keeps the first placement, even one that touches an edge, so English does
 // not move (tests/scripts/routes.scripts.ts checks it at 320 and 1440 px). A menu taller than the viewport is capped to it and
 // scrolls (focus scrolls the item into view). Closing resets the placement, so the next menu is measured at its own first one.
 const [place,setPlace]=useState<Readonly<{dx:number;dy:number;maxHeight?:number}>>(FIRST_PLACEMENT);
 useLayoutEffect(()=>{
  const el=ref.current;
  if(!el){if(place!==FIRST_PLACEMENT)setPlace(FIRST_PLACEMENT);return;}
  // The box at the first placement (a menu moved while open may still carry the previous position's shift and cap), with its
  // full height: the border box minus the visible part plus the whole scrolled content.
  const r=el.getBoundingClientRect(),room=window.innerHeight-8,full=r.height-el.clientHeight+el.scrollHeight;
  const maxHeight=full>room+.5?room:undefined,top=r.top-place.dy;
  const fit=(lo:number,hi:number,size:number)=>lo<0||hi>size?Math.max(Math.min(0,size-4-hi),4-lo):0;
  const dx=fit(r.left-place.dx,r.right-place.dx,window.innerWidth),dy=fit(top,top+Math.min(full,room),window.innerHeight);
  if(dx!==place.dx||dy!==place.dy||maxHeight!==place.maxHeight)setPlace({dx,dy,maxHeight});
 },[at,items.length]);// eslint-disable-line react-hooks/exhaustive-deps
 if(!at)return null;
 const left=Math.max(4,Math.min(at.x,window.innerWidth-224))+place.dx,top=Math.max(4,Math.min(at.y,window.innerHeight-40*items.length-8))+place.dy;
 return <div ref={ref} role="menu" aria-label={label} className="popup-menu" data-testid="popup-menu" style={place.maxHeight===undefined?{left,top}:{left,top,maxHeight:place.maxHeight,overflowY:'auto'}}
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
