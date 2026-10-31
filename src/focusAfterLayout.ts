/** Front WebKit QA (2026-10-31; analysis/front-plans/front-webkit.md, cause 1). WebKit (Safari) silently ignores focus() on an
 * element whose style and layout are not yet up to date after it became visible in the same task. Examples are the first field of
 * a <dialog> just opened with showModal(), or the default button of a box just mounted in a route being shown again. Chromium and
 * Firefox update style and layout inside focus(). Reading the element's layout first makes WebKit focus it too.
 *
 * The app has about 190 focus() calls over 64 files (every modal and dialog open path, React autoFocus included), so the fix is
 * installed once: focus() on HTML and SVG elements reads the element's layout first. Importing this module installs it
 * (idempotent); main.tsx and the components that mount their own roots for the test harnesses import it. `focusNow` is the
 * explicit form. A connected element only; the extra layout read costs a forced reflow per focus call, which only happens on
 * user-driven focus moves. */
const ORIGINAL=Symbol.for('openvireo.focusAfterLayout.original');
type Focusable=Readonly<{focus:(options?:FocusOptions)=>void;getBoundingClientRect:()=>DOMRect;isConnected:boolean}>;

/** Focus `el` after bringing its layout up to date (no-op for null). */
export function focusNow(el:Focusable|null|undefined,options?:FocusOptions){
 if(!el)return;
 if(el.isConnected)void el.getBoundingClientRect();
 el.focus(options);
}

function patch(proto:object|undefined){
 if(!proto)return;
 const p=proto as {focus:(this:Element,options?:FocusOptions)=>void;[ORIGINAL]?:(this:Element,options?:FocusOptions)=>void};
 if(p[ORIGINAL]||typeof p.focus!=='function')return;
 const original=p.focus;
 Object.defineProperty(p,ORIGINAL,{value:original});
 p.focus=function(this:Element,options?:FocusOptions){if(this.isConnected)void this.getBoundingClientRect();return original.call(this,options);};
}
/** Installs the layout read in front of focus() on HTML and SVG elements (once). */
export function installFocusAfterLayout(){
 if(typeof HTMLElement!=='undefined')patch(HTMLElement.prototype);
 if(typeof SVGElement!=='undefined')patch(SVGElement.prototype);
}
installFocusAfterLayout();
