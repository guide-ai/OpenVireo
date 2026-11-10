// Front SC3 (plan analysis/front-plans/front-i18n-scripts.md § 4): the layout check that the Spanish specs copy-paste
// (tests/i18n/es-e0*.spec.ts, es-radio, es-observatory), extracted once, plus a vertical-ink check for tall scripts.
// Front SC9 switched the Spanish specs to this file. With no options, layoutProblems is the es-e03/es-e05 copy exactly;
// every difference the other copies carried is an option here (SC9 added crossingInScrollers for es-e01/e02/e04 and
// eachDialog for es-observatory), so each spec keeps at least the checks of its old copy.
import type {Page} from '@playwright/test';

export type LayoutOptions=Readonly<{
 /** Subtrees whose controls are not checked. Default: the header (es-shell checks it) and native English mirrors. */
 skip?:string;
 /** Further subtrees exempt from the "crosses its card or dialog" check (wide tables that scroll on their own). */
 crossingExempt?:string;
 /** Further subtrees whose SVG text is not checked. */
 svgSkip?:string;
 /** Elements checked as controls. Default: button,label,legend,h1,h2,h3,h4,select,input,summary,th (es-radio adds dt). */
 controls?:string;
 /** Dialog selector. Default: modal dialogs; es-radio adds [role=alertdialog][aria-modal=true]. */
 dialogs?:string;
 /** Check inside the last (topmost) open dialog instead of the first (es-radio). */
 topDialog?:boolean;
 /** Name the first three elements that stick out when the page overflows (es-e06). */
 explainOverflow?:boolean;
 /** Also report a control that crosses its card or dialog inside a container that scrolls sideways (es-e01, es-e02 and
  * es-e04 did; the default, from es-e03 on, leaves that to the scrolling container). */
 crossingInScrollers?:boolean;
 /** Every element matching `dialogs` (menus, sub-menus and boxes that open together, modal or not) is checked too: it must
  * stay inside the viewport and not scroll sideways, and each `controls` element in it with an offsetParent must not be
  * clipped, nor cross it while it clips its overflow (es-observatory). */
 eachDialog?:Readonly<{dialogs:string;controls:string}>;
}>;
const LAYOUT_DEFAULTS={skip:'.portal-header,[lang=en]:not(html)',crossingExempt:'',svgSkip:'',controls:'button,label,legend,h1,h2,h3,h4,select,input,summary,th',dialogs:'dialog[open],[role=dialog][aria-modal=true]',topDialog:false,explainOverflow:false,crossingInScrollers:false,eachDialog:null as LayoutOptions['eachDialog']|null};

/** Layout problems at this width: page overflow; dialogs that leave the viewport or scroll sideways; buttons, labels, selects,
 * inputs and headings that are clipped, cross their card or dialog, or leave the viewport; plot text outside its SVG. Purely
 * geometric (boxes from getBoundingClientRect, scroll sizes), so it depends on the fonts: the Spanish specs run it under the
 * DejaVu fontconfig, the script walk under the test fonts of scripts/test-fonts.mjs (docs/I18N.md). */
export const layoutProblems=(page:Page,options:LayoutOptions={})=>page.evaluate(o=>{
 const out:string[]=[],width=document.documentElement.clientWidth;
 const visible=(el:Element)=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const name=(el:Element)=>`${el.tagName.toLowerCase()} “${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,40)}”`;
 if(document.documentElement.scrollWidth>width){
  const wide=o.explainOverflow?`: ${[...document.body.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>width+1&&visible(e)).slice(0,3).map(name).join(' | ')}`:'';
  out.push(`page overflows horizontally (${document.documentElement.scrollWidth} > ${width})${wide}`);
 }
 const dialogs=[...document.querySelectorAll<HTMLElement>(o.dialogs)];
 for(const d of dialogs){const r=d.getBoundingClientRect();if(!r.width)continue;
  const id=d.getAttribute('data-testid')??d.className;
  if(r.left<-.5||r.right>width+.5)out.push(`${id} leaves the viewport (${Math.round(r.left)}–${Math.round(r.right)})`);
  if(d.scrollWidth>d.clientWidth+1&&getComputedStyle(d).overflowX!=='visible')out.push(`${id} scrolls horizontally`);}
 const root=(o.topDialog?dialogs.at(-1):dialogs[0])??document.body;
 const skip=o.skip||null,exempt=['table,.table-scroll,[role=region]',o.crossingExempt].filter(Boolean).join(',');
 for(const c of root.querySelectorAll<HTMLElement>(o.controls)){
  if((skip&&c.closest(skip))||!visible(c))continue;
  const q=c.getBoundingClientRect(),cs=getComputedStyle(c);
  if(q.width<=2||(cs.clip!=='auto'&&cs.position==='absolute'))continue;// visually hidden (an accessible name only)
  let scroller=false;for(let e=c.parentElement;e&&e!==document.body;e=e.parentElement){const ox=getComputedStyle(e).overflowX;if((ox==='auto'||ox==='scroll')&&e.scrollWidth>e.clientWidth){scroller=true;break;}}
  if(!scroller&&(q.left<-.5||q.right>width+.5))out.push(`${name(c)} leaves the viewport`);
  if(c.scrollWidth>c.clientWidth+1&&['hidden','clip'].includes(getComputedStyle(c).overflowX)&&!['INPUT','SELECT'].includes(c.tagName))out.push(`${name(c)} clipped`);
  const box=c.parentElement?.closest('dialog,.card,details,fieldset,[role=dialog],[role=alertdialog]');
  if(box&&(o.crossingInScrollers||!scroller)&&!c.closest(exempt)){const b=box.getBoundingClientRect();if(q.right>b.right+1||q.left<b.left-1)out.push(`${name(c)} crosses its ${box.tagName.toLowerCase()}`);}
 }
 if(o.eachDialog)for(const d of document.querySelectorAll<HTMLElement>(o.eachDialog.dialogs)){const r=d.getBoundingClientRect();if(!r.width)continue;
  const id=d.getAttribute('data-testid')??d.className,clips=getComputedStyle(d).overflowX!=='visible';
  if(r.left<-.5||r.right>width+.5)out.push(`${id} leaves the viewport (${Math.round(r.left)}–${Math.round(r.right)})`);
  if(d.scrollWidth>d.clientWidth+1&&clips)out.push(`${id} scrolls horizontally`);
  for(const c of d.querySelectorAll<HTMLElement>(o.eachDialog.controls)){if(!c.offsetParent)continue;
   if(c.scrollWidth>c.clientWidth+1&&['hidden','clip'].includes(getComputedStyle(c).overflowX))out.push(`${id}: “${c.textContent?.trim().slice(0,40)}” clipped`);
   const q=c.getBoundingClientRect();if(q.width&&(q.right>r.right+1||q.left<r.left-1)&&clips)out.push(`${id}: “${c.textContent?.trim().slice(0,40)}” crosses its dialog`);}}
 const svgSkip=['[lang=en]:not(html)',o.svgSkip].filter(Boolean).join(',');
 for(const t of root.querySelectorAll<SVGTextElement>('svg text')){if(!visible(t)||t.closest(svgSkip))continue;
  const svg=t.ownerSVGElement!,b=svg.getBoundingClientRect(),q=t.getBoundingClientRect();
  if(q.left<b.left-1||q.right>b.right+1||q.top<b.top-1||q.bottom>b.bottom+1)out.push(`plot text “${t.textContent?.trim().slice(0,40)}” outside its plot ${svg.closest("figure,section")?.className??""} (${[q.left-b.left,b.right-q.right,q.top-b.top,b.bottom-q.bottom].map(Math.round).join(', ')})`);}
 return out;
},{...LAYOUT_DEFAULTS,...options});

export type InkOptions=Readonly<{
 /** Subtrees whose text is not checked. Default: native English mirrors. SVG text is never checked here (layoutProblems
  * checks plot text against its SVG). */
 skip?:string;
 /** Tolerance in CSS pixels. Default 1. */
 tolerance?:number;
}>;

/** Vertical ink problems (plan § 4 item 3): text whose glyphs are cut at the top or bottom by a box that clips (overflow
 * other than visible, or a fixed height with overflow hidden), and whole lines a non-scrolling box cuts off.
 *
 * How it measures. For each text node inside a clipping box, the line fragments come from Range.getClientRects(). Each
 * fragment's box is the primary font's content area (ascent + descent), so the baseline is placed in it in the ratio of
 * the canvas `fontBoundingBoxAscent` : `fontBoundingBoxDescent` of the element's computed font. The ink above and below
 * that baseline is the canvas `actualBoundingBoxAscent` / `actualBoundingBoxDescent` of the fragment's text in the same
 * font (canvas text falls back through the same family list as the page). The clip rectangle is the intersection of the
 * padding boxes of every ancestor whose overflow is not visible. A fragment whose ink leaves that rectangle by more than the
 * tolerance is reported, and a fragment whose middle is outside it is reported as cut off, except beyond an edge whose box
 * can still scroll that way (scrolling reveals it; at the end of the scroll range a cut is real). The whole node's ink is
 * tried first; only a node that fails is measured line by line (grapheme clusters grouped by line). tests/scripts/
 * routes.scripts.ts checks the detector itself on controlled boxes before the walk relies on it. */
export const verticalInkProblems=(page:Page,options:InkOptions={})=>page.evaluate(o=>{
 const out:string[]=[],tol=o.tolerance;
 const ctx=document.createElement('canvas').getContext('2d')!;
 const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
 // checkVisibility also sees content a closed <details> skips (content-visibility), which display and visibility do not show.
 const hiddenUp=(el:Element)=>!el.checkVisibility({contentVisibilityAuto:true,visibilityProperty:true});
 /** The vertical clip of an element's content: the intersection of the padding boxes of its clipping ancestors, and for each
  * edge the box that sets it and whether that box can still scroll past it (then what lies beyond can be scrolled to). */
 type Edge={at:number;by:Element;scrolls:boolean};
 type Clip={top:Edge;bottom:Edge};
 const clipCache=new Map<Element,Clip|null>();
 const clipOf=(el:Element|null):Clip|null=>{
  if(!el||el===document.documentElement)return null;
  if(clipCache.has(el))return clipCache.get(el)!;
  const s=getComputedStyle(el);
  // A modal dialog or open popover is in the top layer, and a fixed box is placed on the viewport: no ancestor clips them.
  const outer=el.matches(':modal,:popover-open')||s.position==='fixed'?null:clipOf(el.parentElement);
  let c=outer;
  if(s.overflowY!=='visible'&&el!==document.body){
   const r=el.getBoundingClientRect(),top=r.top+el.clientTop,bottom=top+el.clientHeight;
   const scroller=s.overflowY==='auto'||s.overflowY==='scroll';
   const own:Clip={top:{at:top,by:el,scrolls:scroller&&el.scrollTop>0},bottom:{at:bottom,by:el,scrolls:scroller&&el.scrollTop+el.clientHeight<el.scrollHeight-1}};
   c=outer?{top:own.top.at>=outer.top.at?own.top:outer.top,bottom:own.bottom.at<=outer.bottom.at?own.bottom:outer.bottom}:own;
  }
  clipCache.set(el,c);return c;
 };
 const label=(el:Element)=>{const cls=typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'';const id=el.getAttribute('data-testid');return `${el.tagName.toLowerCase()}${cls}${id?`[${id}]`:''}`;};
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 const seen=new Set<string>();
 for(let n=walker.nextNode() as Text|null;n;n=walker.nextNode() as Text|null){
  const text=n.data;if(!text.trim())continue;
  const el=n.parentElement;if(!el||el.closest('svg,select,option,textarea,script,style,noscript,template')||(o.skip&&el.closest(o.skip))||hiddenUp(el))continue;
  const clip=clipOf(el);if(!clip||clip.bottom.at-clip.top.at<2)continue;// nothing clips it, or a deliberately collapsed box
  const s=getComputedStyle(el);if(s.position==='absolute'&&s.clip!=='auto')continue;// visually hidden
  // A font string the canvas rejects would leave the previous one in place and measure the wrong ink: say so instead.
  ctx.font='1px __unset__';ctx.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  if(ctx.font.includes('__unset__')){const key=`font|${s.fontFamily}`;if(!seen.has(key)){seen.add(key);out.push(`${label(el)}: font not measurable by the canvas (${s.fontWeight} ${s.fontSize} ${s.fontFamily})`);}continue;}
  if('lang' in ctx)(ctx as unknown as {lang:string}).lang=(el.closest('[lang]')?.getAttribute('lang'))??'';
  const whole=ctx.measureText(text),fa=whole.fontBoundingBoxAscent,fd=whole.fontBoundingBoxDescent;
  const range=document.createRange();range.selectNodeContents(n);
  const lines=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
  /** The problem with one line fragment and its ink (ascent and descent from the baseline), or null. A fragment's box is the
   * font's content area, which may be taller than its line (line-height below the font's own), so a line belongs to the
   * view when its middle is inside the clip. Beyond an edge that can still scroll, nothing is cut: scrolling reveals it. */
  const problem=(r:DOMRect,ascent:number,descent:number):string|null=>{
   const mid=(r.top+r.bottom)/2;
   for(const [edge,out] of [[clip.top,mid<clip.top.at],[clip.bottom,mid>clip.bottom.at]] as const)
    if(out)return edge.scrolls?null:`line cut off by ${label(edge.by)} (line ${Math.round(r.top-clip.top.at)}…${Math.round(r.bottom-clip.top.at)} px, box ${Math.round(clip.bottom.at-clip.top.at)} px)|${label(edge.by)}`;
   const base=r.top+r.height*fa/(fa+fd);
   const above=clip.top.scrolls?0:clip.top.at-(base-ascent),below=clip.bottom.scrolls?0:base+descent-clip.bottom.at;
   if(above<=tol&&below<=tol)return null;
   const by=above>tol?clip.top.by:clip.bottom.by;
   return `ink cut by ${label(by)} (${above>tol?`${above.toFixed(1)} px above`:''}${above>tol&&below>tol?', ':''}${below>tol?`${below.toFixed(1)} px below`:''})|${label(by)}`;
  };
  const check=(r:DOMRect,ascent:number,descent:number,what:string)=>{
   const p=problem(r,ascent,descent);if(!p)return;
   const [message,by]=p.split('|'),key=`${by}|${message.slice(0,4)}|${what}`;
   if(!seen.has(key)){seen.add(key);out.push(`${label(el)} “${what}”: ${message}`);}
  };
  const short=text.trim().slice(0,40);
  // Conservative pass: the whole node's ink on every line.
  if(lines.every(r=>problem(r,whole.actualBoundingBoxAscent,whole.actualBoundingBoxDescent)===null))continue;
  if(lines.length<=1){if(lines[0])check(lines[0],whole.actualBoundingBoxAscent,whole.actualBoundingBoxDescent,short);continue;}
  // Line by line: grapheme clusters grouped by the line box they sit in.
  const groups:{rect:DOMRect;text:string}[]=[];let offset=0;
  for(const {segment} of graphemes.segment(text)){
   const g=document.createRange();g.setStart(n,offset);g.setEnd(n,offset+segment.length);offset+=segment.length;
   const q=g.getBoundingClientRect();if(!q.height)continue;
   const line=lines.find(r=>q.top>=r.top-1&&q.bottom<=r.bottom+1&&q.left>=r.left-1&&q.right<=r.right+1)??lines.find(r=>Math.abs(r.top-q.top)<1);
   if(!line)continue;let grp=groups.find(x=>x.rect===line);if(!grp){grp={rect:line,text:''};groups.push(grp);}grp.text+=segment;
  }
  for(const {rect,text:t} of groups){if(!t.trim())continue;const m=ctx.measureText(t);check(rect,m.actualBoundingBoxAscent,m.actualBoundingBoxDescent,t.trim().slice(0,40));}
 }
 return out;
},{skip:options.skip??'[lang=en]:not(html)',tolerance:options.tolerance??1});
