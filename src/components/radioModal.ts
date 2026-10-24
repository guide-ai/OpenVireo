import type {KeyboardEvent} from 'react';

/** WEB presentation ownership: a native modal <dialog> of the page (About, Hubble lab guide, another tool's dialog) is in the
 * top layer and stays topmost. This panel renders no <dialog>, so any open one is foreign. Observed only while a dialog
 * or box can be presented on the active, non-busy route; showModal()/close() toggle the open attribute and conditional
 * rendering removes nodes. Reactivation reads the current snapshot before presenting anything. */
export const nativeModalOpen=()=>document.querySelector('dialog:modal')!==null;
export const noNativeModal=()=>false;
export function observeNativeModals(onChange:()=>void){
 const observer=new MutationObserver(onChange);
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('close',onChange,true);
 return ()=>{observer.disconnect();document.removeEventListener('close',onChange,true);};
}
export const observeNothing=()=>()=>{};

/** Browser policy (not recovered behavior): auto-repeated Enter/Escape do nothing inside the dialog, a message box or their return-focus triggers (Set Coordinates and the main Radio switch),
 * so a held key cannot choose OK, answer the box that opens next and keep going (reproduced before this guard). */
export const ignoreHeldKey=(e:KeyboardEvent<HTMLElement>)=>{if(e.repeat&&(e.key==='Enter'||e.key==='Escape')){e.preventDefault();return true;}return false;};

const FOCUSABLE='button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
/** Keeps Tab inside an application-modal surface. */
export function trapTab(e:KeyboardEvent<HTMLElement>,root:HTMLElement|null){
 if(e.key!=='Tab'||!root)return;
 const items=[...root.querySelectorAll<HTMLElement>(FOCUSABLE)];if(!items.length)return;
 const first=items[0],last=items[items.length-1],active=document.activeElement;
 if(e.shiftKey&&(active===first||!root.contains(active))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(active===last||!root.contains(active))){e.preventDefault();first.focus();}
}
