import type{KeyboardEvent}from'react';
/** Do not consume a held Enter as cancellation after focus moves here. A new
 * Enter press and Escape retain their normal cancellation behavior. */
export function blockRepeatedEnter(event:KeyboardEvent<HTMLButtonElement>){if(event.key==='Enter'&&event.repeat)event.preventDefault();}
/** Front SC11 (scripts plan §8 "Input"): the keydown belongs to an IME composition, so an Enter here confirms a conversion
 * (Japanese, Chinese, Hindi or any other input method) and must not also submit. Safari fires that confirming Enter after
 * compositionend with isComposing false and keyCode 229, so both are read. */
export function imeComposing(event:Readonly<{nativeEvent:globalThis.KeyboardEvent;keyCode:number}>):boolean{return event.nativeEvent.isComposing||event.keyCode===229;}
