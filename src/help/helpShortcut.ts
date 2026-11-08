/** The ? key that opens Help topics (Front Onboarding [W]). WCAG 2.1.4: a single-character shortcut must be possible to turn
 * off, so the visitor can switch it off in Help topics › Menus, keyboard and phones; the browser remembers the choice. */
export const HELP_KEY_STORAGE='openvireo.help-key.v1';
export const HELP_KEY='?';

export function helpKeyEnabled():boolean{try{return localStorage.getItem(HELP_KEY_STORAGE)!=='off';}catch{return true;}}
export function setHelpKeyEnabled(on:boolean){try{if(on)localStorage.removeItem(HELP_KEY_STORAGE);else localStorage.setItem(HELP_KEY_STORAGE,'off');}catch{/* storage unavailable: the choice lasts for this page only */}}

/** True when a key press must not open Help: the shortcut is off, a modifier other than AltGr is held, the press is typing
 * (a form field or editable text), any modal window is open (a <dialog> or an aria-modal panel), or the Help button itself is
 * inert behind one. */
export function helpKeyBlocked(e:KeyboardEvent,trigger:Element|null):boolean{
 if(e.key!==HELP_KEY||e.defaultPrevented||!helpKeyEnabled())return true;
 const altGraph=typeof e.getModifierState==='function'&&e.getModifierState('AltGraph');
 if(e.metaKey||((e.ctrlKey||e.altKey)&&!altGraph))return true;
 const t=e.target instanceof Element?e.target:null;
 if(t&&(t.closest('input,textarea,select')||(t instanceof HTMLElement&&t.isContentEditable)))return true;
 if(document.querySelector('dialog:modal,[aria-modal="true"]'))return true;
 return !!trigger?.closest('[inert]');
}
