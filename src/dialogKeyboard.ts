import type{KeyboardEvent}from'react';
/** Do not consume a held Enter as cancellation after focus moves here. A new
 * Enter press and Escape retain their normal cancellation behavior. */
export function blockRepeatedEnter(event:KeyboardEvent<HTMLButtonElement>){if(event.key==='Enter'&&event.repeat)event.preventDefault();}
