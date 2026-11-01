/** Front WebKit QA (2026-10-31; analysis/front-plans/front-webkit.md, cause 1). WebKit (Safari) silently ignores focus() on an
 * element whose style and layout are not yet up to date after it became visible in the same task. Examples are the first field of
 * a <dialog> just opened with showModal(), or the default button of a box just mounted in a route being shown again. Chromium and
 * Firefox update style and layout inside focus(). Reading the element's layout first makes WebKit focus it too.
 *
 * The app has about 190 focus() calls over 64 files (every modal and dialog open path, React autoFocus included), so the fix is
 * installed once: focus() on HTML and SVG elements reads the element's layout first. Importing this module installs it
 * (idempotent); the entry points import it (src/main.tsx, the test harnesses under tests/harness and the test hosts under
 * tests/fixtures). It applies to every focus() call, scripted ones included, and costs one forced layout per call.
 *
 * Only WebKit needs it, and only WebKit gets it (navigator.vendor 'Apple…': Safari and every WebKit browser). A synthetic
 * same-task show-and-focus does not reproduce the bug (only the app's React render paths do), so a startup self-test cannot
 * detect it. Chromium and Firefox never needed it, so they keep their native focus(). Documented in docs/FOCUS-AFTER-LAYOUT.md. */
const ORIGINAL=Symbol.for('openvireo.focusAfterLayout.original');

function patch(proto:object|undefined){
 if(!proto)return;
 const p=proto as {focus:(this:Element,options?:FocusOptions)=>void;[ORIGINAL]?:(this:Element,options?:FocusOptions)=>void};
 if(p[ORIGINAL]||typeof p.focus!=='function')return;
 const original=p.focus;
 Object.defineProperty(p,ORIGINAL,{value:original});
 p.focus=function(this:Element,options?:FocusOptions){if(this.isConnected)void this.getBoundingClientRect();return original.call(this,options);};
}
/** Installs the layout read in front of focus() on HTML and SVG elements (once), in WebKit only. */
export function installFocusAfterLayout(){
 if(typeof navigator==='undefined'||!/^Apple/.test(navigator.vendor??''))return;
 if(typeof HTMLElement!=='undefined')patch(HTMLElement.prototype);
 if(typeof SVGElement!=='undefined')patch(SVGElement.prototype);
}
/** Front WebKit review L3: the root's data-input-modality is 'keyboard' after a key press and 'pointer' after a pointer press.
 * WebKit does not match :focus-visible after arrow keys move focus within a radio group, so radio rings use :focus only in keyboard
 * modality (base.css, ThemeSwitch.css, RadioControlPanel.css); a mouse click shows no ring in any engine. */
export function installInputModality(){
 if(typeof document==='undefined'||document.documentElement.dataset.inputModality!==undefined)return;
 const root=document.documentElement;root.dataset.inputModality='pointer';
 document.addEventListener('keydown',e=>{if(!['Shift','Control','Alt','Meta'].includes(e.key))root.dataset.inputModality='keyboard';},true);
 document.addEventListener('pointerdown',()=>{root.dataset.inputModality='pointer';},true);
}
installFocusAfterLayout();
installInputModality();
