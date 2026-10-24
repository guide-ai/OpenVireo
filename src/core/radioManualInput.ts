/** Browser input ownership for the manual N/S/E/W hold (WEB-MANUAL-01/02, WEB-KEY-03; OpenVireo web policy, not recovered behavior).
 *
 * Natively each button's MouseDown starts the hold and its MouseUp ends it when X < Width and Y < Height (RA-16/RA-17), so
 * a release beyond the right or bottom edge keeps the hold, any direction's MouseUp releases it, and window deactivation
 * leaves the latch set. The browser instead gives the hold one owner, a single pointer, a single Space/Enter key on the
 * focused button, or a single key of the RA-19 table, and ends it only through that owner or a cancellation. A
 * cancellation never resumes: a fresh press is needed.
 *
 * Pure TypeScript: no React, DOM or state. The panel feeds DOM events in and applies the effect to the antenna core. */
import {MANUAL_DIRECTION_CODE,type ManualDirection} from './radioAntenna';

/** Space and Enter on the focused direction button (WEB-MANUAL-02). The RA-19 letter/keypad table keys arrive as
 * table-key events, already decoded by radioKeyboard.ts. */
export const MANUAL_HOLD_KEYS:readonly string[]=Object.freeze([' ','Enter']);
export type ManualInputOwner=Readonly<
 |{kind:'pointer';pointerId:number;direction:ManualDirection}
 |{kind:'key';key:string;direction:ManualDirection}
 /** An RA-19 table key; `code` (KeyboardEvent.code) is the physical identity of the hold. */
 |{kind:'table';code:string;direction:ManualDirection}
>;
/** Causes outside the owner that end a hold. */
export type ManualExternalCancel='window-blur'|'page-hidden'|'route-inactive'|'host-busy'|'modal'|'panel-closed'|'unmount';
export type ManualCancelReason=ManualExternalCancel|'pointer-cancel'|'focus-lost'|'key-scope-left';
export const MANUAL_EXTERNAL_CANCELS:readonly ManualExternalCancel[]=Object.freeze(['window-blur','page-hidden','route-inactive','host-busy','modal','panel-closed','unmount']);
export type ManualInputEvent=Readonly<
 /** pointerdown on a direction button; `button` is PointerEvent.button (0 = primary). */
 |{type:'pointer-down';pointerId:number;button:number;direction:ManualDirection}
 /** pointerup anywhere (the button captures the pointer). */
 |{type:'pointer-up';pointerId:number}
 /** pointermove anywhere while latched. Pointer Events chorded buttons: releasing the left button while another stays
  * down fires pointermove (button 0, bit 0 of buttons clear), not pointerup. */
 |{type:'pointer-move';pointerId:number;button:number;buttons:number}
 /** pointercancel or lostpointercapture. */
 |{type:'pointer-cancel';pointerId:number}
 /** keydown on a focused direction button. */
 |{type:'key-down';key:string;repeat:boolean;direction:ManualDirection}
 |{type:'key-up';key:string}
 /** The direction button lost focus. */
 |{type:'focus-lost';direction:ManualDirection}
 /** keydown of an RA-19 table key inside the key scope, decoded to a press of `direction`. */
 |{type:'table-key-down';code:string;repeat:boolean;direction:ManualDirection}
 /** keyup inside the key scope: `direction` is the decoded RA-19 release, or null when the key is not one (unmapped,
  * refused, the ignored 0x65, outside the table). */
 |{type:'table-key-up';code:string;direction:ManualDirection|null}
 /** Focus left the key scope (Tracking and the direction buttons) inside the document. */
 |{type:'key-scope-left'}
 |{type:'cancel';reason:ManualExternalCancel}
>;
export type ManualInputEffect=Readonly<
 |{kind:'none'}
 |{kind:'press';direction:ManualDirection}
 /** `via`: a table release through that direction's MouseUp (RA-19 cross release); absent for every other release. */
 |{kind:'release';via?:ManualDirection}
 |{kind:'cancel';reason:ManualCancelReason}
>;
export type ManualInputStep=Readonly<{owner:ManualInputOwner|null;effect:ManualInputEffect}>;

const NONE:ManualInputEffect=Object.freeze({kind:'none'});
const keep=(owner:ManualInputOwner|null):ManualInputStep=>Object.freeze({owner,effect:NONE});
const end=(effect:ManualInputEffect):ManualInputStep=>Object.freeze({owner:null,effect:Object.freeze(effect)});
const isDirection=(d:unknown):d is ManualDirection=>typeof d==='string'&&Object.hasOwn(MANUAL_DIRECTION_CODE,d);
/** A non-empty, bounded KeyboardEvent.code. */
const isKeyIdentity=(code:unknown):code is string=>typeof code==='string'&&code.length>0&&code.length<=64;

/** One input event against the current owner:
 * - pointer-down with button 0 and no owner takes ownership (press): the first admitted button-0 pointer (left mouse
 *   button, a touch or a pen contact; PointerEvent.isPrimary is not checked). Other buttons, other pointers while an
 *   owner exists (a second finger) and any pointer while a key owns the hold are ignored;
 * - pointer-up of the owning pointer releases, wherever it happens; so does a pointer-move of the owner reporting button 0
 *   with bit 0 of buttons clear (left released while another mouse button stays down). Other moves (drags report
 *   button -1, a chorded press reports the pressed button) change nothing, and a left press while another button is already down
 *   arrives as such a move and starts no hold; pointer-cancel of the owner cancels;
 * - key-down of Space or Enter, not auto-repeated, with no owner takes ownership; key-up of that same key releases;
 *   focus loss of a key owner's button cancels (a pointer owner keeps its capture);
 * - table-key-down, not auto-repeated, with no owner takes ownership (natively the latch refuses a second KeyDown; a
 *   repeat with the latch clear would start a hold natively, the browser never does). table-key-up with a table owner:
 *   a decoded direction releases through that direction (RA-19 cross release, any table key); otherwise the owner's
 *   own physical code releases through the held direction (web fallback when NumLock, layout, modifiers or composition
 *   changed the key's meaning); any other key-up is kept. key-scope-left cancels a table owner. Pointer and Space/Enter
 *   owners ignore table events (declared deviation: natively a table KeyUp would release a mouse hold), and table owners
 *   ignore pointer and Space/Enter events;
 * - an external cancel ends any owner.
 * Events that do not concern the owner change nothing. The caller clears the owner itself when the press it reports is
 * refused by the antenna core. */
export function manualInputStep(owner:ManualInputOwner|null,event:ManualInputEvent):ManualInputStep{
 switch(event.type){
  case 'pointer-down':
   if(owner||event.button!==0||!isDirection(event.direction))return keep(owner);
   return Object.freeze({owner:Object.freeze({kind:'pointer',pointerId:event.pointerId,direction:event.direction}),effect:Object.freeze({kind:'press',direction:event.direction})});
  case 'pointer-move':
   return owner?.kind==='pointer'&&owner.pointerId===event.pointerId&&event.button===0&&Number.isInteger(event.buttons)&&(event.buttons&1)===0?end({kind:'release'}):keep(owner);
  case 'pointer-up':
   return owner?.kind==='pointer'&&owner.pointerId===event.pointerId?end({kind:'release'}):keep(owner);
  case 'pointer-cancel':
   return owner?.kind==='pointer'&&owner.pointerId===event.pointerId?end({kind:'cancel',reason:'pointer-cancel'}):keep(owner);
  case 'key-down':
   if(owner||event.repeat||!MANUAL_HOLD_KEYS.includes(event.key)||!isDirection(event.direction))return keep(owner);
   return Object.freeze({owner:Object.freeze({kind:'key',key:event.key,direction:event.direction}),effect:Object.freeze({kind:'press',direction:event.direction})});
  case 'key-up':
   return owner?.kind==='key'&&owner.key===event.key?end({kind:'release'}):keep(owner);
  case 'focus-lost':
   return owner?.kind==='key'&&owner.direction===event.direction?end({kind:'cancel',reason:'focus-lost'}):keep(owner);
  case 'table-key-down':
   if(owner||event.repeat!==false||!isKeyIdentity(event.code)||!isDirection(event.direction))return keep(owner);
   return Object.freeze({owner:Object.freeze({kind:'table',code:event.code,direction:event.direction}),effect:Object.freeze({kind:'press',direction:event.direction})});
  case 'table-key-up':
   if(owner?.kind!=='table'||!isKeyIdentity(event.code)||(event.direction!==null&&!isDirection(event.direction)))return keep(owner);
   if(event.direction!==null)return end({kind:'release',via:event.direction});
   return event.code===owner.code?end({kind:'release'}):keep(owner);
  case 'key-scope-left':
   return owner?.kind==='table'?end({kind:'cancel',reason:'key-scope-left'}):keep(owner);
  case 'cancel':
   return owner&&MANUAL_EXTERNAL_CANCELS.includes(event.reason)?end({kind:'cancel',reason:event.reason}):keep(owner);
  default:return keep(owner);
 }
}
