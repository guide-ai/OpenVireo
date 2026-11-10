import {useEffect,type RefObject} from 'react';

/** Front HEADER [W]: the page bar holds two disclosure menus side by side (More and Help), so an open one closes when the pointer is
 * pressed outside it or when the keyboard focus moves to an element outside it (Tab, or another control). A focus that leaves for
 * nowhere (the window losing focus, a native file picker) keeps it open. `close` must be stable or cheap to re-subscribe. */
export function useMenuDismiss(container:RefObject<HTMLElement|null>,open:boolean,close:()=>void,enabled=true){
 useEffect(()=>{
  const root=container.current;
  if(!open||!enabled||!root)return;
  const outside=(target:EventTarget|null)=>target instanceof Node&&!root.contains(target);
  const press=(e:PointerEvent)=>{if(outside(e.target))close();};
  const leave=(e:FocusEvent)=>{if(outside(e.relatedTarget))close();};
  document.addEventListener('pointerdown',press,true);root.addEventListener('focusout',leave);
  return()=>{document.removeEventListener('pointerdown',press,true);root.removeEventListener('focusout',leave);};
 },[container,open,close,enabled]);
}
