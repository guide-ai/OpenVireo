/** Front SC11 (scripts plan §3 "SVG and canvas at fixed widths"; the SC3 walk's KNOWN entries): an axis title at a fixed position
 * fits its plot only for the font it was placed with. A rotated title is as wide as the font's ascent plus descent (Noto Sans
 * CJK's ascent, 1.16 em, passes an 18-unit offset), and a bottom title reaches as low as the font's descent (Devanagari vowel
 * signs; the phone-size title crossed the bottom by about 1 px in Firefox). Wrapped in a `<g ref={keepInsideSvg}>`,
 * the title is measured as drawn, with the fonts it actually uses, and moved back inside its `<svg>` only by what crosses the
 * edge. A title that fits (or crosses by at most half a pixel, below what anyone sees) is left exactly where it was, so English
 * plots do not move. Measured again when the plot or the title changes size (layout, a web font arriving, a new text). */
const TOLERANCE_PX=0.5;
function fit(g:SVGGElement){
 const svg=g.ownerSVGElement,parent=(g.parentNode??svg) as SVGGraphicsElement|null;
 if(!svg||!parent||!g.isConnected||typeof parent.getScreenCTM!=='function')return;// (jsdom has no layout)
 g.removeAttribute('transform');
 const b=svg.getBoundingClientRect(),q=g.getBoundingClientRect();
 if(!b.width||!b.height||!q.width)return;
 const m=parent.getScreenCTM();if(!m||!m.a||!m.d)return;
 const dx=q.left<b.left-TOLERANCE_PX?b.left-q.left:q.right>b.right+TOLERANCE_PX?b.right-q.right:0;
 const dy=q.top<b.top-TOLERANCE_PX?b.top-q.top:q.bottom>b.bottom+TOLERANCE_PX?b.bottom-q.bottom:0;
 if(dx||dy)g.setAttribute('transform',`translate(${+(dx/m.a).toFixed(3)} ${+(dy/m.d).toFixed(3)})`);
}
/** A ref callback for the `<g>` that holds one plot title (React 19 runs the returned cleanup on unmount). */
export function keepInsideSvg(g:SVGGElement|null):(()=>void)|undefined{
 if(!g)return undefined;
 const run=()=>fit(g);
 run();
 const svg=g.ownerSVGElement,observer=typeof ResizeObserver==='function'?new ResizeObserver(run):null;
 if(svg)observer?.observe(svg);observer?.observe(g);
 const fonts=typeof document!=='undefined'?document.fonts:undefined;
 fonts?.addEventListener?.('loadingdone',run);
 return ()=>{observer?.disconnect();fonts?.removeEventListener?.('loadingdone',run);};
}
